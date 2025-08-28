-- AI TODO Application Materialized Views (改良版)
-- 設計書グループ4: パフォーマンス最適化設計
-- Version: 2.0 (改良版)
-- Date: 2025-08-28

-- ==================================================
-- プロジェクト統計マテリアライズドビュー（改良版）
-- ==================================================

-- 改良版: プロジェクト統計ビュー（リアルタイム集計最適化）
CREATE MATERIALIZED VIEW project_statistics AS
SELECT 
    p.id,
    p.name,
    p.status,
    p.priority,
    p.color,
    p.owner_id,
    -- タスク数統計
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'done') as completed_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'todo') as todo_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'archived') as archived_tasks,
    -- 時間統計
    COALESCE(SUM(t.estimated_hours), 0) as total_estimated_hours,
    COALESCE(SUM(t.actual_hours), 0) as total_actual_hours,
    -- 完了率計算（改良版：より正確な計算）
    CASE 
        WHEN COUNT(t.id) > 0 
        THEN ROUND(
            COUNT(t.id) FILTER (WHERE t.status = 'done')::NUMERIC / 
            NULLIF(COUNT(t.id) FILTER (WHERE t.status != 'archived'), 0) * 100, 2
        )
        ELSE 0 
    END as completion_rate,
    -- 改良版追加: 優先度別統計
    COUNT(DISTINCT t.id) FILTER (WHERE t.priority = 'critical') as critical_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.priority = 'high') as high_priority_tasks,
    -- 改良版追加: 期限管理統計
    COUNT(DISTINCT t.id) FILTER (
        WHERE t.due_date IS NOT NULL AND t.due_date < NOW() AND t.status IN ('todo', 'in_progress')
    ) as overdue_tasks,
    COUNT(DISTINCT t.id) FILTER (
        WHERE t.due_date IS NOT NULL AND t.due_date BETWEEN NOW() AND NOW() + interval '7 days'
    ) as due_soon_tasks,
    -- 改良版追加: アクティビティ統計
    MAX(t.updated_at) as last_task_activity,
    COUNT(DISTINCT t.assignee_id) FILTER (WHERE t.assignee_id IS NOT NULL) as active_members,
    -- 改良版追加: 効率性指標
    CASE 
        WHEN SUM(t.estimated_hours) > 0 
        THEN ROUND(SUM(t.actual_hours)::NUMERIC / SUM(t.estimated_hours), 2)
        ELSE 0
    END as time_accuracy_ratio,
    -- メタデータ
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id AND t.status != 'archived'
WHERE p.is_archived = false
GROUP BY p.id, p.name, p.status, p.priority, p.color, p.owner_id, p.created_at, p.updated_at
WITH DATA;

-- プロジェクト統計ビュー用インデックス
CREATE UNIQUE INDEX idx_project_statistics_id ON project_statistics(id);
CREATE INDEX idx_project_statistics_status ON project_statistics(status, completion_rate DESC);
CREATE INDEX idx_project_statistics_owner ON project_statistics(owner_id, last_task_activity DESC);

COMMENT ON MATERIALIZED VIEW project_statistics IS '改良版: プロジェクト統計情報（高速集計）';

-- ==================================================
-- ユーザー生産性マテリアライズドビュー（改良版）
-- ==================================================

-- 改良版: ユーザー生産性分析ビュー（週次集計）
CREATE MATERIALIZED VIEW user_productivity AS
SELECT 
    assignee_id,
    DATE_TRUNC('week', updated_at) as week_start,
    -- 基本統計
    COUNT(*) FILTER (WHERE status = 'done') as tasks_completed,
    COUNT(*) FILTER (WHERE status IN ('todo', 'in_progress')) as tasks_active,
    SUM(actual_hours) as hours_worked,
    SUM(estimated_hours) as hours_estimated,
    -- 改良版追加: 生産性指標
    AVG(actual_hours::NUMERIC / NULLIF(estimated_hours, 0)) as time_accuracy_ratio,
    COUNT(*) FILTER (WHERE due_date IS NOT NULL AND updated_at <= due_date) as on_time_completions,
    COUNT(*) FILTER (WHERE due_date IS NOT NULL AND updated_at > due_date) as late_completions,
    -- 改良版追加: 優先度別対応
    COUNT(*) FILTER (WHERE priority IN ('critical', 'urgent') AND status = 'done') as high_priority_completed,
    -- 改良版追加: 品質指標
    AVG(completion_percentage) FILTER (WHERE status = 'done') as avg_completion_quality,
    -- 改良版追加: ワークロード指標
    SUM(estimated_hours) FILTER (WHERE status IN ('todo', 'in_progress')) as current_workload
FROM tasks
WHERE assignee_id IS NOT NULL
GROUP BY assignee_id, DATE_TRUNC('week', updated_at)
WITH DATA;

-- ユーザー生産性ビュー用インデックス
CREATE INDEX idx_user_productivity_user ON user_productivity(assignee_id, week_start DESC);
CREATE INDEX idx_user_productivity_performance ON user_productivity(time_accuracy_ratio DESC, tasks_completed DESC);

COMMENT ON MATERIALIZED VIEW user_productivity IS '改良版: ユーザー生産性分析（週次集計）';

-- ==================================================
-- システム監視マテリアライズドビュー（改良版）
-- ==================================================

-- 改良版: データベースパフォーマンス監視ビュー
CREATE MATERIALIZED VIEW database_performance AS
SELECT
    schemaname,
    tablename,
    -- テーブルサイズ情報
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_total_relation_size(schemaname||'.'||tablename) AS total_size_bytes,
    -- アクティビティ統計
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    -- 改良版追加: パフォーマンス指標
    CASE 
        WHEN n_live_tup > 0 
        THEN ROUND(n_dead_tup::NUMERIC / n_live_tup * 100, 2)
        ELSE 0 
    END as dead_tuple_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    -- 改良版追加: ヘルススコア計算
    CASE
        WHEN n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0) > 0.2 THEN 'Poor'
        WHEN n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0) > 0.1 THEN 'Fair'
        ELSE 'Good'
    END as health_score
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
WITH DATA;

-- データベースパフォーマンスビュー用インデックス
CREATE INDEX idx_database_performance_size ON database_performance(total_size_bytes DESC);
CREATE INDEX idx_database_performance_health ON database_performance(health_score, dead_tuple_ratio DESC);

COMMENT ON MATERIALIZED VIEW database_performance IS '改良版: データベースパフォーマンス監視';

-- ==================================================
-- スケジュール分析マテリアライズドビュー（改良版）
-- ==================================================

-- 改良版: 日別スケジュール効率性分析
CREATE MATERIALIZED VIEW schedule_efficiency AS
SELECT
    s.user_id,
    s.date,
    s.total_estimated,
    s.total_actual,
    s.utilization,
    -- 改良版追加: 効率性指標
    COUNT(si.id) as total_items,
    COUNT(si.id) FILTER (WHERE si.status = 'completed') as completed_items,
    COUNT(si.id) FILTER (WHERE si.status = 'cancelled') as cancelled_items,
    -- 改良版追加: 時間配分分析
    SUM(si.duration) FILTER (WHERE si.type = 'task') as task_time,
    SUM(si.duration) FILTER (WHERE si.type = 'meeting') as meeting_time,
    SUM(si.duration) FILTER (WHERE si.type = 'break') as break_time,
    -- 改良版追加: パフォーマンス指標
    CASE 
        WHEN s.total_estimated > 0 
        THEN ROUND(s.total_actual::NUMERIC / s.total_estimated * 100, 1)
        ELSE 0 
    END as time_accuracy_percentage,
    CASE 
        WHEN COUNT(si.id) > 0 
        THEN ROUND(COUNT(si.id) FILTER (WHERE si.status = 'completed')::NUMERIC / COUNT(si.id) * 100, 1)
        ELSE 0 
    END as completion_rate
FROM schedules s
LEFT JOIN schedule_items si ON s.id = si.schedule_id
GROUP BY s.user_id, s.date, s.total_estimated, s.total_actual, s.utilization
WITH DATA;

-- スケジュール効率性ビュー用インデックス
CREATE INDEX idx_schedule_efficiency_user ON schedule_efficiency(user_id, date DESC);
CREATE INDEX idx_schedule_efficiency_performance ON schedule_efficiency(completion_rate DESC, time_accuracy_percentage DESC);

COMMENT ON MATERIALIZED VIEW schedule_efficiency IS '改良版: スケジュール効率性分析';

-- ==================================================
-- タグ使用統計マテリアライズドビュー（改良版）
-- ==================================================

-- 改良版: タグ使用傾向分析ビュー
CREATE MATERIALIZED VIEW tag_usage_analytics AS
SELECT
    t.id,
    t.name,
    t.color,
    t.usage_count,
    -- 改良版追加: 使用傾向分析
    COUNT(DISTINCT tt.task_id) as task_usage_count,
    COUNT(DISTINCT pt.project_id) as project_usage_count,
    -- 改良版追加: 最近の使用傾向
    COUNT(DISTINCT tt.task_id) FILTER (
        WHERE tt.created_at >= NOW() - interval '30 days'
    ) as recent_task_usage,
    COUNT(DISTINCT pt.project_id) FILTER (
        WHERE pt.created_at >= NOW() - interval '30 days'
    ) as recent_project_usage,
    -- 改良版追加: アクティブ度指標
    CASE 
        WHEN t.usage_count > 0 
        THEN COUNT(DISTINCT tt.task_id) FILTER (WHERE tt.created_at >= NOW() - interval '30 days')::NUMERIC / t.usage_count
        ELSE 0 
    END as activity_ratio,
    -- 改良版追加: タグカテゴリ推定（色ベース）
    CASE 
        WHEN t.color IN ('#EF4444', '#DC2626') THEN 'Urgent'
        WHEN t.color IN ('#F59E0B', '#D97706') THEN 'Important'
        WHEN t.color IN ('#10B981', '#059669') THEN 'Progress'
        WHEN t.color IN ('#3B82F6', '#2563EB') THEN 'Standard'
        WHEN t.color IN ('#8B5CF6', '#7C3AED') THEN 'Special'
        ELSE 'Other'
    END as category,
    t.created_at,
    MAX(GREATEST(tt.created_at, pt.created_at)) as last_used
FROM tags t
LEFT JOIN task_tags tt ON t.id = tt.tag_id
LEFT JOIN project_tags pt ON t.id = pt.tag_id
GROUP BY t.id, t.name, t.color, t.usage_count, t.created_at
WITH DATA;

-- タグ使用統計ビュー用インデックス
CREATE UNIQUE INDEX idx_tag_usage_analytics_id ON tag_usage_analytics(id);
CREATE INDEX idx_tag_usage_analytics_activity ON tag_usage_analytics(activity_ratio DESC, usage_count DESC);
CREATE INDEX idx_tag_usage_analytics_category ON tag_usage_analytics(category, last_used DESC);

COMMENT ON MATERIALIZED VIEW tag_usage_analytics IS '改良版: タグ使用傾向分析';

-- ==================================================
-- マテリアライズドビュー更新管理（改良版）
-- ==================================================

-- 改良版: 全マテリアライズドビュー一括更新関数
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
DECLARE
    view_name TEXT;
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
BEGIN
    start_time := clock_timestamp();
    
    -- 依存関係を考慮した順序で更新
    FOR view_name IN VALUES 
        ('project_statistics'),
        ('user_productivity'), 
        ('database_performance'),
        ('schedule_efficiency'),
        ('tag_usage_analytics')
    LOOP
        EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || view_name;
        RAISE NOTICE 'Refreshed materialized view: %', view_name;
    END LOOP;
    
    end_time := clock_timestamp();
    RAISE NOTICE 'All materialized views refreshed in %', (end_time - start_time);
END;
$$ LANGUAGE plpgsql;

-- 改良版: 条件付きマテリアライズドビュー更新関数
CREATE OR REPLACE FUNCTION refresh_materialized_view_if_stale(view_name TEXT, max_age INTERVAL DEFAULT '1 hour')
RETURNS BOOLEAN AS $$
DECLARE
    last_refresh TIMESTAMPTZ;
    is_refreshed BOOLEAN := FALSE;
BEGIN
    -- 最後の更新時刻を取得（メタデータテーブルから）
    -- 簡易実装として、統計情報を使用
    SELECT stats_reset INTO last_refresh 
    FROM pg_stat_user_tables 
    WHERE relname = view_name;
    
    -- 指定時間以上古い場合のみ更新
    IF last_refresh IS NULL OR (NOW() - last_refresh) > max_age THEN
        EXECUTE 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || view_name;
        is_refreshed := TRUE;
        RAISE NOTICE 'Refreshed stale materialized view: %', view_name;
    END IF;
    
    RETURN is_refreshed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_materialized_views() IS '改良版: 全マテリアライズドビュー一括更新';
COMMENT ON FUNCTION refresh_materialized_view_if_stale(TEXT, INTERVAL) IS '改良版: 条件付きマテリアライズドビュー更新';

-- ==================================================
-- ダッシュボード用統合ビュー（改良版）
-- ==================================================

-- 改良版: ダッシュボード統合ビュー（複数ビューの結合）
CREATE VIEW dashboard_summary AS
SELECT
    'overview' as section,
    json_build_object(
        'total_projects', (SELECT COUNT(*) FROM projects WHERE is_archived = false),
        'active_projects', (SELECT COUNT(*) FROM projects WHERE status = 'active'),
        'total_tasks', (SELECT COUNT(*) FROM tasks WHERE archived_at IS NULL),
        'completed_tasks', (SELECT COUNT(*) FROM tasks WHERE status = 'done'),
        'overdue_tasks', (
            SELECT COUNT(*) FROM tasks 
            WHERE due_date < NOW() AND status IN ('todo', 'in_progress')
        )
    ) as data
UNION ALL
SELECT
    'top_projects' as section,
    json_agg(
        json_build_object(
            'id', id,
            'name', name,
            'completion_rate', completion_rate,
            'total_tasks', total_tasks,
            'overdue_tasks', overdue_tasks
        ) ORDER BY completion_rate DESC
    ) as data
FROM project_statistics
WHERE total_tasks > 0
LIMIT 10;

COMMENT ON VIEW dashboard_summary IS '改良版: ダッシュボード統合サマリービュー';

-- ==================================================
-- ビューコメント
-- ==================================================

COMMENT ON MATERIALIZED VIEW project_statistics IS '改良版: プロジェクト統計（完了率、期限管理、効率性指標付き）';
COMMENT ON MATERIALIZED VIEW user_productivity IS '改良版: ユーザー生産性分析（時間精度、品質指標付き）';
COMMENT ON MATERIALIZED VIEW database_performance IS '改良版: データベースパフォーマンス監視（ヘルススコア付き）';
COMMENT ON MATERIALIZED VIEW schedule_efficiency IS '改良版: スケジュール効率性分析（時間配分、完了率付き）';
COMMENT ON MATERIALIZED VIEW tag_usage_analytics IS '改良版: タグ使用分析（トレンド、カテゴリ分類付き）';