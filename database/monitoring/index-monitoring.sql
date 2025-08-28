-- ==================================================================================
-- index-monitoring.sql: インデックス監視・メンテナンス自動化システム
-- ==================================================================================
-- 目的: インデックスの健全性監視、自動メンテナンス、パフォーマンス最適化
-- 機能: リアルタイム監視、異常検知、自動修復、統計レポート生成
-- ==================================================================================

-- ==================================================================================
-- 1. インデックス監視用テーブル・ビューの作成
-- ==================================================================================

-- インデックス統計履歴テーブル
CREATE TABLE IF NOT EXISTS index_statistics_history (
    id SERIAL PRIMARY KEY,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    index_name TEXT NOT NULL,
    index_size_bytes BIGINT NOT NULL,
    index_scans BIGINT NOT NULL,
    tuples_read BIGINT NOT NULL,
    tuples_fetched BIGINT NOT NULL,
    bloat_ratio NUMERIC(5,2),
    fragmentation_ratio NUMERIC(5,2),
    last_vacuum TIMESTAMPTZ,
    last_analyze TIMESTAMPTZ,
    recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- インデックス統計履歴のパーティション（月単位）
CREATE TABLE IF NOT EXISTS index_statistics_history_2025_01 
PARTITION OF index_statistics_history
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- インデックス健全性アラートテーブル
CREATE TABLE IF NOT EXISTS index_health_alerts (
    id SERIAL PRIMARY KEY,
    index_name TEXT NOT NULL,
    alert_type TEXT NOT NULL, -- 'UNUSED', 'BLOATED', 'FRAGMENTED', 'SLOW'
    severity TEXT NOT NULL,   -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    description TEXT NOT NULL,
    recommendation TEXT NOT NULL,
    auto_fix_applied BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==================================================================================
-- 2. リアルタイム監視ビュー
-- ==================================================================================

-- 包括的インデックス健全性ビュー
CREATE OR REPLACE VIEW index_health_dashboard AS
WITH index_stats AS (
    SELECT 
        psi.schemaname,
        psi.relname as table_name,
        psi.indexrelname as index_name,
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        pg_relation_size(psi.indexrelid) as index_size_bytes,
        pg_relation_size(psi.relid) as table_size_bytes,
        CASE 
            WHEN psi.idx_tup_read > 0 
            THEN ROUND((psi.idx_tup_fetch::NUMERIC / psi.idx_tup_read) * 100, 2)
            ELSE 0 
        END as fetch_ratio,
        pst.n_tup_ins + pst.n_tup_upd + pst.n_tup_del as total_modifications,
        pst.last_vacuum,
        pst.last_autovacuum,
        pst.last_analyze,
        pst.last_autoanalyze
    FROM pg_stat_user_indexes psi
    JOIN pg_stat_user_tables pst ON psi.relid = pst.relid
    WHERE psi.schemaname = 'public'
),
index_bloat AS (
    SELECT 
        schemaname,
        tablename,
        indexname,
        COALESCE(
            ROUND(
                100 * (pg_relation_size(indexrelid) - 
                       (CASE WHEN pg_relation_size(indexrelid) = 0 THEN 0 
                             ELSE pg_relation_size(indexrelid) * 0.1 END)
                ) / GREATEST(pg_relation_size(indexrelid), 1), 2
            ), 0
        ) as bloat_percentage
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
)
SELECT 
    is.schemaname,
    is.table_name,
    is.index_name,
    pg_size_pretty(is.index_size_bytes) as index_size,
    is.idx_scan as scans,
    is.idx_tup_read as tuples_read,
    is.idx_tup_fetch as tuples_fetched,
    is.fetch_ratio as efficiency_percent,
    ib.bloat_percentage,
    CASE 
        WHEN is.idx_scan = 0 THEN 'UNUSED'
        WHEN ib.bloat_percentage > 30 THEN 'BLOATED'
        WHEN is.fetch_ratio < 50 AND is.idx_scan > 1000 THEN 'INEFFICIENT'
        WHEN is.index_size_bytes > is.table_size_bytes THEN 'OVERSIZED'
        ELSE 'HEALTHY'
    END as health_status,
    CASE 
        WHEN is.idx_scan = 0 THEN 'Consider dropping unused index'
        WHEN ib.bloat_percentage > 30 THEN 'REINDEX recommended'
        WHEN is.fetch_ratio < 50 AND is.idx_scan > 1000 THEN 'Review index design'
        WHEN is.index_size_bytes > is.table_size_bytes THEN 'Index larger than table'
        ELSE 'No action needed'
    END as recommendation,
    GREATEST(is.last_vacuum, is.last_autovacuum) as last_vacuum,
    GREATEST(is.last_analyze, is.last_autoanalyze) as last_analyze
FROM index_stats is
LEFT JOIN index_bloat ib ON is.schemaname = ib.schemaname 
    AND is.table_name = ib.tablename 
    AND is.index_name = ib.indexname
ORDER BY 
    CASE 
        WHEN is.idx_scan = 0 THEN 1
        WHEN ib.bloat_percentage > 30 THEN 2
        WHEN is.fetch_ratio < 50 AND is.idx_scan > 1000 THEN 3
        ELSE 4
    END,
    is.index_size_bytes DESC;

-- インデックス使用頻度トレンドビュー
CREATE OR REPLACE VIEW index_usage_trends AS
SELECT 
    table_name,
    index_name,
    AVG(index_scans) as avg_scans_per_period,
    MAX(index_scans) - MIN(index_scans) as scan_growth,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY index_scans) as median_scans,
    COUNT(*) as data_points,
    MIN(recorded_at) as first_recorded,
    MAX(recorded_at) as last_recorded
FROM index_statistics_history
WHERE recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY table_name, index_name
ORDER BY avg_scans_per_period DESC;

-- ==================================================================================
-- 3. 自動監視・アラート機能
-- ==================================================================================

-- インデックス健全性チェック関数（拡張版）
CREATE OR REPLACE FUNCTION perform_index_health_check()
RETURNS TABLE(
    index_name TEXT,
    issue_type TEXT,
    severity TEXT,
    description TEXT,
    recommendation TEXT,
    auto_fixable BOOLEAN
) AS $$
DECLARE
    rec RECORD;
    unused_threshold INTEGER := 0;        -- 未使用インデックスの閾値
    bloat_threshold INTEGER := 25;        -- ブロート率の閾値(%)
    large_index_threshold BIGINT := 100 * 1024 * 1024; -- 100MB
BEGIN
    -- 1. 未使用インデックスの検出
    FOR rec IN 
        SELECT idh.* FROM index_health_dashboard idh
        WHERE idh.health_status = 'UNUSED'
        AND idh.index_name NOT LIKE '%_pkey'
        AND idh.index_name NOT LIKE '%_unique'
    LOOP
        RETURN QUERY SELECT
            rec.index_name,
            'UNUSED_INDEX'::TEXT,
            'MEDIUM'::TEXT,
            format('Index has never been used: %s.%s', rec.table_name, rec.index_name),
            'Consider dropping this index to save storage and improve write performance'::TEXT,
            FALSE;
    END LOOP;
    
    -- 2. ブロートしたインデックスの検出
    FOR rec IN 
        SELECT idh.* FROM index_health_dashboard idh
        WHERE idh.health_status = 'BLOATED'
        AND idh.bloat_percentage > bloat_threshold
    LOOP
        RETURN QUERY SELECT
            rec.index_name,
            'INDEX_BLOAT'::TEXT,
            CASE WHEN rec.bloat_percentage > 50 THEN 'HIGH' ELSE 'MEDIUM' END,
            format('Index bloat detected: %.1f%% bloat', rec.bloat_percentage),
            'REINDEX operation recommended to reduce bloat'::TEXT,
            TRUE;
    END LOOP;
    
    -- 3. 非効率なインデックスの検出
    FOR rec IN 
        SELECT idh.* FROM index_health_dashboard idh
        WHERE idh.health_status = 'INEFFICIENT'
        AND idh.efficiency_percent < 50
        AND idh.scans > 1000
    LOOP
        RETURN QUERY SELECT
            rec.index_name,
            'INEFFICIENT_INDEX'::TEXT,
            'MEDIUM'::TEXT,
            format('Low efficiency: %.1f%% with %s scans', rec.efficiency_percent, rec.scans),
            'Review index design - may need column reordering or partial index'::TEXT,
            FALSE;
    END LOOP;
    
    -- 4. 過大サイズインデックスの検出
    FOR rec IN 
        SELECT idh.* FROM index_health_dashboard idh
        WHERE idh.health_status = 'OVERSIZED'
    LOOP
        RETURN QUERY SELECT
            rec.index_name,
            'OVERSIZED_INDEX'::TEXT,
            'LOW'::TEXT,
            format('Index size (%s) larger than table size', rec.index_size),
            'Investigate if covering index is over-inclusive'::TEXT,
            FALSE;
    END LOOP;
    
    -- 5. 統計情報の古さチェック
    FOR rec IN 
        SELECT idh.* FROM index_health_dashboard idh
        WHERE idh.last_analyze < NOW() - INTERVAL '7 days'
        AND idh.scans > 100
    LOOP
        RETURN QUERY SELECT
            rec.index_name,
            'STALE_STATISTICS'::TEXT,
            'LOW'::TEXT,
            format('Statistics not updated for %s days', EXTRACT(DAYS FROM NOW() - rec.last_analyze)),
            'Run ANALYZE to update table statistics'::TEXT,
            TRUE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- アラート生成・通知関数
CREATE OR REPLACE FUNCTION generate_index_alerts()
RETURNS INTEGER AS $$
DECLARE
    check_result RECORD;
    alert_count INTEGER := 0;
BEGIN
    -- 既存のアクティブなアラートをクリア
    UPDATE index_health_alerts 
    SET resolved_at = NOW() 
    WHERE resolved_at IS NULL;
    
    -- 新しいアラートを生成
    FOR check_result IN SELECT * FROM perform_index_health_check() LOOP
        INSERT INTO index_health_alerts (
            index_name,
            alert_type,
            severity,
            description,
            recommendation,
            auto_fix_applied
        ) VALUES (
            check_result.index_name,
            check_result.issue_type,
            check_result.severity,
            check_result.description,
            check_result.recommendation,
            FALSE
        );
        alert_count := alert_count + 1;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- 4. 自動修復機能
-- ==================================================================================

-- 自動REINDEX関数
CREATE OR REPLACE FUNCTION auto_reindex_bloated_indexes(
    dry_run BOOLEAN DEFAULT TRUE,
    max_size_mb INTEGER DEFAULT 1000
) RETURNS TABLE(
    index_name TEXT,
    action_taken TEXT,
    old_size_mb NUMERIC,
    new_size_mb NUMERIC,
    space_saved_mb NUMERIC
) AS $$
DECLARE
    rec RECORD;
    old_size BIGINT;
    new_size BIGINT;
    reindex_cmd TEXT;
BEGIN
    FOR rec IN 
        SELECT idh.* FROM index_health_dashboard idh
        WHERE idh.health_status = 'BLOATED'
        AND idh.bloat_percentage > 30
        AND pg_relation_size(idh.index_name::regclass) / (1024*1024) <= max_size_mb
    LOOP
        old_size := pg_relation_size(rec.index_name::regclass);
        
        IF NOT dry_run THEN
            reindex_cmd := format('REINDEX INDEX CONCURRENTLY %I', rec.index_name);
            
            BEGIN
                EXECUTE reindex_cmd;
                
                -- 自動修復済みフラグを設定
                UPDATE index_health_alerts 
                SET auto_fix_applied = TRUE, resolved_at = NOW()
                WHERE index_name = rec.index_name 
                AND alert_type = 'INDEX_BLOAT'
                AND resolved_at IS NULL;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to reindex %: %', rec.index_name, SQLERRM;
                CONTINUE;
            END;
        END IF;
        
        new_size := pg_relation_size(rec.index_name::regclass);
        
        RETURN QUERY SELECT
            rec.index_name,
            CASE WHEN dry_run THEN 'DRY_RUN' ELSE 'REINDEXED' END,
            ROUND(old_size / (1024.0*1024.0), 2),
            ROUND(new_size / (1024.0*1024.0), 2),
            ROUND((old_size - new_size) / (1024.0*1024.0), 2);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 統計情報自動更新関数
CREATE OR REPLACE FUNCTION auto_analyze_stale_tables(
    dry_run BOOLEAN DEFAULT TRUE
) RETURNS TABLE(
    table_name TEXT,
    action_taken TEXT,
    last_analyze TIMESTAMPTZ
) AS $$
DECLARE
    rec RECORD;
    analyze_cmd TEXT;
BEGIN
    FOR rec IN 
        SELECT DISTINCT idh.table_name, idh.last_analyze
        FROM index_health_dashboard idh
        WHERE idh.last_analyze < NOW() - INTERVAL '7 days'
        OR idh.last_analyze IS NULL
    LOOP
        IF NOT dry_run THEN
            analyze_cmd := format('ANALYZE %I', rec.table_name);
            
            BEGIN
                EXECUTE analyze_cmd;
                
                -- 関連アラートを解決済みにマーク
                UPDATE index_health_alerts 
                SET auto_fix_applied = TRUE, resolved_at = NOW()
                WHERE alert_type = 'STALE_STATISTICS'
                AND resolved_at IS NULL;
                
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'Failed to analyze %: %', rec.table_name, SQLERRM;
                CONTINUE;
            END;
        END IF;
        
        RETURN QUERY SELECT
            rec.table_name,
            CASE WHEN dry_run THEN 'DRY_RUN' ELSE 'ANALYZED' END,
            rec.last_analyze;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- 5. 統計レポート生成
-- ==================================================================================

-- 週次インデックスレポート生成
CREATE OR REPLACE FUNCTION generate_weekly_index_report()
RETURNS TABLE(
    report_section TEXT,
    metric_name TEXT,
    metric_value TEXT,
    trend TEXT,
    recommendation TEXT
) AS $$
BEGIN
    -- サマリー統計
    RETURN QUERY
    SELECT 
        'SUMMARY'::TEXT,
        'Total Indexes'::TEXT,
        COUNT(*)::TEXT,
        'N/A'::TEXT,
        'Monitor unused indexes regularly'::TEXT
    FROM index_health_dashboard;
    
    RETURN QUERY
    SELECT 
        'SUMMARY'::TEXT,
        'Healthy Indexes'::TEXT,
        COUNT(*) FILTER (WHERE health_status = 'HEALTHY')::TEXT,
        'N/A'::TEXT,
        'Maintain current performance'::TEXT
    FROM index_health_dashboard;
    
    RETURN QUERY
    SELECT 
        'SUMMARY'::TEXT,
        'Problem Indexes'::TEXT,
        COUNT(*) FILTER (WHERE health_status != 'HEALTHY')::TEXT,
        'N/A'::TEXT,
        'Address issues promptly'::TEXT
    FROM index_health_dashboard;
    
    -- 使用頻度TOP 5
    RETURN QUERY
    SELECT 
        'TOP_USED'::TEXT,
        index_name::TEXT,
        scans::TEXT,
        'N/A'::TEXT,
        'High-value indexes'::TEXT
    FROM index_health_dashboard
    WHERE scans > 0
    ORDER BY scans DESC
    LIMIT 5;
    
    -- 問題のあるインデックス
    RETURN QUERY
    SELECT 
        'ISSUES'::TEXT,
        index_name::TEXT,
        health_status::TEXT,
        'N/A'::TEXT,
        recommendation::TEXT
    FROM index_health_dashboard
    WHERE health_status != 'HEALTHY'
    ORDER BY 
        CASE health_status
            WHEN 'UNUSED' THEN 1
            WHEN 'BLOATED' THEN 2
            WHEN 'INEFFICIENT' THEN 3
            ELSE 4
        END;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- 6. 定期実行用のメンテナンスジョブ設定
-- ==================================================================================

-- 統計情報収集ジョブ（毎時実行）
CREATE OR REPLACE FUNCTION collect_index_statistics()
RETURNS VOID AS $$
BEGIN
    INSERT INTO index_statistics_history (
        schema_name,
        table_name,
        index_name,
        index_size_bytes,
        index_scans,
        tuples_read,
        tuples_fetched,
        last_vacuum,
        last_analyze
    )
    SELECT 
        psi.schemaname,
        psi.relname,
        psi.indexrelname,
        pg_relation_size(psi.indexrelid),
        psi.idx_scan,
        psi.idx_tup_read,
        psi.idx_tup_fetch,
        GREATEST(pst.last_vacuum, pst.last_autovacuum),
        GREATEST(pst.last_analyze, pst.last_autoanalyze)
    FROM pg_stat_user_indexes psi
    JOIN pg_stat_user_tables pst ON psi.relid = pst.relid
    WHERE psi.schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- 7. 使用方法とサンプルクエリ
-- ==================================================================================

/*
-- 基本的な使用方法:

-- 1. 現在の健全性状況確認
SELECT * FROM index_health_dashboard;

-- 2. アラート生成
SELECT generate_index_alerts();

-- 3. 健全性チェック実行
SELECT * FROM perform_index_health_check();

-- 4. 自動修復（ドライラン）
SELECT * FROM auto_reindex_bloated_indexes(true);

-- 5. 実際の修復実行
SELECT * FROM auto_reindex_bloated_indexes(false);

-- 6. 週次レポート生成
SELECT * FROM generate_weekly_index_report();

-- 7. 統計情報収集
SELECT collect_index_statistics();
*/