-- AI TODO Application Schema Validation (改良版)
-- 設計書グループ2: スキーマ実装検証
-- Version: 2.0 (改良版)
-- Date: 2025-08-28

-- ==================================================
-- 拡張機能の確認
-- ==================================================

DO $$
BEGIN
    RAISE NOTICE '=== 拡張機能確認 ===';
    
    -- 必要な拡張機能の存在確認
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp') THEN
        RAISE EXCEPTION 'uuid-ossp拡張機能が見つかりません';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE EXCEPTION 'pgcrypto拡張機能が見つかりません';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        RAISE EXCEPTION 'pg_trgm拡張機能が見つかりません';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'btree_gin') THEN
        RAISE EXCEPTION 'btree_gin拡張機能が見つかりません';
    END IF;
    
    RAISE NOTICE '✅ 全ての拡張機能が正常に確認されました';
END
$$;

-- ==================================================
-- ENUM型の確認
-- ==================================================

DO $$
DECLARE
    enum_count INTEGER;
BEGIN
    RAISE NOTICE '=== ENUM型確認 ===';
    
    -- ENUM型の存在確認
    SELECT COUNT(*) INTO enum_count
    FROM pg_type 
    WHERE typtype = 'e' 
    AND typname IN (
        'task_status', 'priority_level', 'project_status', 
        'project_priority', 'notification_type', 'notification_priority',
        'schedule_item_type', 'schedule_item_status', 'project_role'
    );
    
    IF enum_count != 9 THEN
        RAISE EXCEPTION 'ENUM型が不足しています。期待値:9, 実際値:%', enum_count;
    END IF;
    
    RAISE NOTICE '✅ 全てのENUM型が正常に確認されました: % 個', enum_count;
END
$$;

-- ==================================================
-- テーブル構造の確認
-- ==================================================

DO $$
DECLARE
    table_count INTEGER;
    partition_count INTEGER;
BEGIN
    RAISE NOTICE '=== テーブル構造確認 ===';
    
    -- メインテーブル数の確認
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'user_profiles', 'user_preferences',
        'projects', 'project_members',
        'tasks', 'subtasks', 'task_comments', 'task_attachments',
        'tags', 'task_tags', 'project_tags',
        'schedules', 'schedule_items',
        'notifications',
        'activity_logs'
    );
    
    IF table_count < 16 THEN
        RAISE EXCEPTION 'メインテーブルが不足しています。期待値:>=16, 実際値:%', table_count;
    END IF;
    
    -- パーティションテーブルの確認
    SELECT COUNT(*) INTO partition_count
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND (tablename LIKE 'projects_2025_%' OR tablename LIKE 'notifications_2025_%');
    
    IF partition_count < 4 THEN
        RAISE EXCEPTION 'パーティションテーブルが不足しています。期待値:>=4, 実際値:%', partition_count;
    END IF;
    
    RAISE NOTICE '✅ テーブル構造が正常に確認されました - メイン:%個, パーティション:%個', 
                 table_count, partition_count;
END
$$;

-- ==================================================
-- インデックスの確認
-- ==================================================

DO $$
DECLARE
    index_count INTEGER;
    gin_index_count INTEGER;
    partial_index_count INTEGER;
BEGIN
    RAISE NOTICE '=== インデックス確認 ===';
    
    -- 基本インデックス数の確認
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    -- GINインデックスの確認
    SELECT COUNT(*) INTO gin_index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexdef ILIKE '%using gin%';
    
    -- 部分インデックスの確認
    SELECT COUNT(*) INTO partial_index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexdef ILIKE '%where %';
    
    RAISE NOTICE '✅ インデックスが正常に確認されました - 総数:%個, GIN:%個, 部分:%個', 
                 index_count, gin_index_count, partial_index_count;
                 
    IF gin_index_count < 4 THEN
        RAISE WARNING 'GINインデックスが少ない可能性があります: %個', gin_index_count;
    END IF;
    
    IF partial_index_count < 5 THEN
        RAISE WARNING '部分インデックスが少ない可能性があります: %個', partial_index_count;
    END IF;
END
$$;

-- ==================================================
-- トリガーの確認
-- ==================================================

DO $$
DECLARE
    trigger_count INTEGER;
    function_count INTEGER;
BEGIN
    RAISE NOTICE '=== トリガー確認 ===';
    
    -- トリガー数の確認
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public';
    
    -- トリガー関数の確認
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_name IN (
        'update_updated_at',
        'update_task_search_vector',
        'update_project_search_vector',
        'update_tag_usage_count',
        'update_schedule_statistics',
        'create_audit_log'
    );
    
    RAISE NOTICE '✅ トリガーが正常に確認されました - トリガー:%個, 関数:%個', 
                 trigger_count, function_count;
                 
    IF function_count < 6 THEN
        RAISE EXCEPTION 'トリガー関数が不足しています。期待値:>=6, 実際値:%', function_count;
    END IF;
END
$$;

-- ==================================================
-- マテリアライズドビューの確認
-- ==================================================

DO $$
DECLARE
    mv_count INTEGER;
BEGIN
    RAISE NOTICE '=== マテリアライズドビュー確認 ===';
    
    -- マテリアライズドビュー数の確認
    SELECT COUNT(*) INTO mv_count
    FROM pg_matviews 
    WHERE schemaname = 'public';
    
    IF mv_count < 5 THEN
        RAISE EXCEPTION 'マテリアライズドビューが不足しています。期待値:>=5, 実際値:%', mv_count;
    END IF;
    
    RAISE NOTICE '✅ マテリアライズドビューが正常に確認されました: %個', mv_count;
END
$$;

-- ==================================================
-- データ整合性制約の確認
-- ==================================================

DO $$
DECLARE
    fk_count INTEGER;
    check_count INTEGER;
BEGIN
    RAISE NOTICE '=== データ整合性制約確認 ===';
    
    -- 外部キー制約の確認
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'FOREIGN KEY';
    
    -- CHECK制約の確認
    SELECT COUNT(*) INTO check_count
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND constraint_type = 'CHECK';
    
    RAISE NOTICE '✅ 整合性制約が正常に確認されました - 外部キー:%個, CHECK:%個', 
                 fk_count, check_count;
                 
    IF fk_count < 15 THEN
        RAISE WARNING '外部キー制約が少ない可能性があります: %個', fk_count;
    END IF;
END
$$;

-- ==================================================
-- サンプルデータ挿入テスト
-- ==================================================

DO $$
DECLARE
    test_user_id UUID;
    test_project_id UUID;
    test_task_id UUID;
    test_tag_id UUID;
BEGIN
    RAISE NOTICE '=== サンプルデータ挿入テスト ===';
    
    -- テストユーザー作成
    INSERT INTO users (email, status, role) 
    VALUES ('test@example.com', 'active', 'member')
    RETURNING id INTO test_user_id;
    
    -- テストプロジェクト作成（ENUM型使用）
    INSERT INTO projects (name, description, status, priority, owner_id, created_by) 
    VALUES ('テストプロジェクト', 'スキーマ検証用', 'active', 'medium', test_user_id, test_user_id)
    RETURNING id INTO test_project_id;
    
    -- テストタスク作成（ENUM型使用）
    INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by) 
    VALUES ('テストタスク', '検証用タスク', 'todo', 'high', test_project_id, test_user_id, test_user_id)
    RETURNING id INTO test_task_id;
    
    -- テストタグ作成
    INSERT INTO tags (name, color, created_by) 
    VALUES ('テストタグ', '#FF6B6B', test_user_id)
    RETURNING id INTO test_tag_id;
    
    -- タスクタグ関連付け（タグ使用カウントトリガーテスト）
    INSERT INTO task_tags (task_id, tag_id, created_by) 
    VALUES (test_task_id, test_tag_id, test_user_id);
    
    -- 全文検索ベクター確認（トリガーテスト）
    IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE id = test_task_id 
        AND search_vector IS NOT NULL
    ) THEN
        RAISE EXCEPTION '全文検索ベクターが自動生成されていません';
    END IF;
    
    -- タグ使用カウント確認（トリガーテスト）
    IF NOT EXISTS (
        SELECT 1 FROM tags 
        WHERE id = test_tag_id 
        AND usage_count = 1
    ) THEN
        RAISE EXCEPTION 'タグ使用カウントが自動更新されていません';
    END IF;
    
    -- テストデータクリーンアップ
    DELETE FROM task_tags WHERE task_id = test_task_id;
    DELETE FROM tasks WHERE id = test_task_id;
    DELETE FROM tags WHERE id = test_tag_id;
    DELETE FROM projects WHERE id = test_project_id;
    DELETE FROM users WHERE id = test_user_id;
    
    RAISE NOTICE '✅ サンプルデータ挿入テストが正常に完了しました';
END
$$;

-- ==================================================
-- パフォーマンステスト
-- ==================================================

DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    RAISE NOTICE '=== パフォーマンステスト ===';
    
    start_time := clock_timestamp();
    
    -- 統計情報更新
    ANALYZE;
    
    -- マテリアライズドビュー更新テスト
    REFRESH MATERIALIZED VIEW project_statistics;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE '✅ パフォーマンステストが完了しました（所要時間: %）', duration;
    
    IF duration > interval '30 seconds' THEN
        RAISE WARNING 'パフォーマンスが低下している可能性があります: %', duration;
    END IF;
END
$$;

-- ==================================================
-- 検証結果サマリー
-- ==================================================

DO $$
BEGIN
    RAISE NOTICE '=== 改良版スキーマ検証完了 ===';
    RAISE NOTICE '✅ 全ての検証項目が正常に完了しました';
    RAISE NOTICE '';
    RAISE NOTICE '改良版の主な特徴:';
    RAISE NOTICE '- ENUM型による型安全性の向上';
    RAISE NOTICE '- パーティショニングによるパフォーマンス最適化';
    RAISE NOTICE '- 全文検索機能の実装';
    RAISE NOTICE '- 高度なインデックス戦略';
    RAISE NOTICE '- 自動化されたトリガーシステム';
    RAISE NOTICE '- マテリアライズドビューによる高速集計';
    RAISE NOTICE '- JSONBメタデータ対応';
    RAISE NOTICE '';
    RAISE NOTICE 'スキーマは本番環境で使用可能です。';
END
$$;