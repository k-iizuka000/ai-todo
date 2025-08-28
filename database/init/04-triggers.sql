-- ==================================================================================
-- 04-triggers.sql: AI-TODO データベーストリガー設計
-- ==================================================================================
-- 設計書グループ3: トリガー戦略実装
-- 自動化機能、データ整合性確保、パフォーマンス最適化を実現
-- ==================================================================================

-- ==================================================================================
-- 1. 基本ユーティリティ関数
-- ==================================================================================

-- 更新日時自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 監査用現在ユーザーID取得関数（セッション変数から取得）
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- セッション変数からユーザーIDを取得
    -- アプリケーション側で SET LOCAL application.current_user_id = 'user-uuid'; で設定
    BEGIN
        current_user_id := current_setting('application.current_user_id')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            -- セッション変数が設定されていない場合はNULLを返す
            current_user_id := NULL;
    END;
    
    RETURN current_user_id;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- 2. updated_at自動更新トリガー
-- ==================================================================================

-- プロジェクトテーブル
CREATE TRIGGER trigger_projects_updated_at 
    BEFORE UPDATE ON projects
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- タスクテーブル
CREATE TRIGGER trigger_tasks_updated_at 
    BEFORE UPDATE ON tasks
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- タグテーブル
CREATE TRIGGER trigger_tags_updated_at 
    BEFORE UPDATE ON tags
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- スケジュールテーブル
CREATE TRIGGER trigger_schedules_updated_at 
    BEFORE UPDATE ON schedules
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- スケジュールアイテムテーブル
CREATE TRIGGER trigger_schedule_items_updated_at 
    BEFORE UPDATE ON schedule_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- サブタスクテーブル
CREATE TRIGGER trigger_subtasks_updated_at 
    BEFORE UPDATE ON subtasks
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at();

-- ==================================================================================
-- 3. 全文検索ベクター自動更新
-- ==================================================================================

-- 全文検索ベクター更新関数（日本語・英語対応）
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- タイトルと説明を結合して全文検索ベクターを生成
    -- 日本語はシンプルに文字分割、英語は標準辞書を使用
    NEW.search_vector = 
        to_tsvector('simple', COALESCE(NEW.title, '')) ||
        to_tsvector('english', COALESCE(NEW.title, '')) ||
        to_tsvector('simple', COALESCE(NEW.description, '')) ||
        to_tsvector('english', COALESCE(NEW.description, ''));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- タスク検索ベクター更新トリガー
CREATE TRIGGER trigger_tasks_search_vector 
    BEFORE INSERT OR UPDATE OF title, description ON tasks
    FOR EACH ROW 
    EXECUTE FUNCTION update_search_vector();

-- プロジェクト検索ベクター更新トリガー
CREATE TRIGGER trigger_projects_search_vector 
    BEFORE INSERT OR UPDATE OF name, description ON projects
    FOR EACH ROW 
    EXECUTE FUNCTION update_search_vector();

-- ==================================================================================
-- 4. タグ使用カウント自動更新
-- ==================================================================================

-- タグ使用カウント更新関数
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- タグ使用時にカウントを増加
        UPDATE tags 
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tag_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- タグ削除時にカウントを減少（負の値にならないよう制御）
        UPDATE tags 
        SET usage_count = GREATEST(usage_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.tag_id;
        RETURN OLD;
        
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- タスクタグ関連でのタグ使用カウント更新
CREATE TRIGGER trigger_task_tags_usage_insert
    AFTER INSERT ON task_tags
    FOR EACH ROW 
    EXECUTE FUNCTION update_tag_usage_count();

CREATE TRIGGER trigger_task_tags_usage_delete
    AFTER DELETE ON task_tags
    FOR EACH ROW 
    EXECUTE FUNCTION update_tag_usage_count();

-- ==================================================================================
-- 5. タスクステータス変更時の自動処理
-- ==================================================================================

-- タスクステータス変更処理関数
CREATE OR REPLACE FUNCTION handle_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- ステータスが'done'に変更された場合
    IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
        -- 完了率を100%に設定
        NEW.completion_percentage = 100;
        -- 完了日時を設定
        NEW.completed_at = NOW();
        
        -- 関連するサブタスクも完了にする（オプション）
        UPDATE subtasks 
        SET completed = true,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE task_id = NEW.id 
        AND completed = false;
    END IF;
    
    -- ステータスが'archived'に変更された場合
    IF NEW.status = 'archived' AND (OLD.status IS NULL OR OLD.status != 'archived') THEN
        NEW.archived_at = NOW();
    END IF;
    
    -- ステータスが'archived'から他に変更された場合
    IF OLD.status = 'archived' AND NEW.status != 'archived' THEN
        NEW.archived_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- タスクステータス変更トリガー
CREATE TRIGGER trigger_tasks_status_change 
    BEFORE UPDATE OF status ON tasks
    FOR EACH ROW 
    EXECUTE FUNCTION handle_task_status_change();

-- ==================================================================================
-- 6. 通知読み取り時の自動日時設定
-- ==================================================================================

-- 通知読み取り処理関数
CREATE OR REPLACE FUNCTION handle_notification_read()
RETURNS TRIGGER AS $$
BEGIN
    -- is_readがfalseからtrueに変更された場合
    IF NEW.is_read = true AND OLD.is_read = false THEN
        NEW.read_at = NOW();
    END IF;
    
    -- is_readがtrueからfalseに変更された場合（未読に戻す）
    IF NEW.is_read = false AND OLD.is_read = true THEN
        NEW.read_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 通知読み取りトリガー
CREATE TRIGGER trigger_notifications_read 
    BEFORE UPDATE OF is_read ON notifications
    FOR EACH ROW 
    EXECUTE FUNCTION handle_notification_read();

-- ==================================================================================
-- 7. サブタスク完了状態管理
-- ==================================================================================

-- サブタスク完了状態処理関数
CREATE OR REPLACE FUNCTION handle_subtask_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- 完了状態がfalseからtrueに変更された場合
    IF NEW.completed = true AND OLD.completed = false THEN
        NEW.completed_at = NOW();
    END IF;
    
    -- 完了状態がtrueからfalseに変更された場合
    IF NEW.completed = false AND OLD.completed = true THEN
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- サブタスク完了トリガー
CREATE TRIGGER trigger_subtasks_completion 
    BEFORE UPDATE OF completed ON subtasks
    FOR EACH ROW 
    EXECUTE FUNCTION handle_subtask_completion();

-- ==================================================================================
-- 8. スケジュール統計自動計算
-- ==================================================================================

-- スケジュール統計更新関数
CREATE OR REPLACE FUNCTION update_schedule_statistics()
RETURNS TRIGGER AS $$
DECLARE
    schedule_rec RECORD;
    total_est INTEGER := 0;
    total_act INTEGER := 0;
    utilization_rate INTEGER := 0;
BEGIN
    -- 対象のスケジュールIDを取得
    IF TG_OP = 'DELETE' THEN
        schedule_rec.schedule_id := OLD.schedule_id;
    ELSE
        schedule_rec.schedule_id := NEW.schedule_id;
    END IF;
    
    -- 該当スケジュールの統計を再計算
    SELECT 
        COALESCE(SUM(estimated_time), 0),
        COALESCE(SUM(actual_time), 0)
    INTO total_est, total_act
    FROM schedule_items 
    WHERE schedule_id = schedule_rec.schedule_id;
    
    -- 利用率を計算（8時間 = 480分を100%として）
    IF total_est > 0 THEN
        utilization_rate := LEAST(ROUND(total_act::NUMERIC / 480 * 100), 100);
    ELSE
        utilization_rate := 0;
    END IF;
    
    -- スケジュールテーブルを更新
    UPDATE schedules 
    SET 
        total_estimated = total_est,
        total_actual = total_act,
        utilization = utilization_rate,
        updated_at = NOW()
    WHERE id = schedule_rec.schedule_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- スケジュールアイテム変更時の統計更新トリガー
CREATE TRIGGER trigger_schedule_items_statistics_update
    AFTER INSERT OR UPDATE OF estimated_time, actual_time OR DELETE ON schedule_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_schedule_statistics();

-- ==================================================================================
-- 9. 活動ログ自動記録
-- ==================================================================================

-- 活動ログ記録関数
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    changes_json JSONB := '{}';
    current_user_id UUID;
BEGIN
    -- 現在のユーザーIDを取得
    current_user_id := get_current_user_id();
    
    -- 操作タイプを判定
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'updated';
        -- 変更内容をJSONで記録
        changes_json := jsonb_build_object(
            'before', to_jsonb(OLD),
            'after', to_jsonb(NEW)
        );
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'deleted';
        changes_json := to_jsonb(OLD);
    END IF;
    
    -- ログレコードを挿入
    INSERT INTO activity_logs (
        user_id,
        entity_type,
        entity_id,
        action,
        changes,
        created_at
    ) VALUES (
        COALESCE(current_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN (OLD.id)::UUID
            ELSE (NEW.id)::UUID
        END,
        action_type,
        changes_json,
        NOW()
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 主要テーブルの活動ログトリガー
CREATE TRIGGER trigger_projects_activity_log 
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW 
    EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_tasks_activity_log 
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW 
    EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_schedule_items_activity_log 
    AFTER INSERT OR UPDATE OR DELETE ON schedule_items
    FOR EACH ROW 
    EXECUTE FUNCTION log_activity();

-- ==================================================================================
-- 10. データ整合性チェック関数
-- ==================================================================================

-- プロジェクト削除前チェック関数
CREATE OR REPLACE FUNCTION check_project_deletion()
RETURNS TRIGGER AS $$
DECLARE
    active_tasks_count INTEGER;
BEGIN
    -- アクティブなタスクがある場合は削除を防ぐ
    SELECT COUNT(*) INTO active_tasks_count
    FROM tasks 
    WHERE project_id = OLD.id 
    AND status IN ('todo', 'in_progress');
    
    IF active_tasks_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete project with active tasks. Archive the project instead.';
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- プロジェクト削除前チェックトリガー
CREATE TRIGGER trigger_projects_deletion_check 
    BEFORE DELETE ON projects
    FOR EACH ROW 
    EXECUTE FUNCTION check_project_deletion();

-- ==================================================================================
-- 11. パーティション自動作成関数
-- ==================================================================================

-- 月次パーティション自動作成関数（プロジェクト用）
CREATE OR REPLACE FUNCTION create_monthly_partitions(table_prefix TEXT, months_ahead INTEGER DEFAULT 3)
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    sql_command TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..months_ahead LOOP
        start_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::INTERVAL;
        end_date := start_date + INTERVAL '1 month';
        partition_name := table_prefix || '_' || to_char(start_date, 'YYYY_MM');
        
        -- パーティションが存在しない場合のみ作成
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            sql_command := format('
                CREATE TABLE %I PARTITION OF %I
                FOR VALUES FROM (%L) TO (%L)',
                partition_name, 
                REPLACE(table_prefix, '_', ''),
                start_date, 
                end_date
            );
            EXECUTE sql_command;
            
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 週次パーティション自動作成関数（通知用）
CREATE OR REPLACE FUNCTION create_weekly_partitions(table_prefix TEXT, weeks_ahead INTEGER DEFAULT 12)
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
    sql_command TEXT;
    week_num INTEGER;
    i INTEGER;
BEGIN
    FOR i IN 0..weeks_ahead LOOP
        start_date := date_trunc('week', CURRENT_DATE) + (i || ' weeks')::INTERVAL;
        end_date := start_date + INTERVAL '1 week';
        week_num := EXTRACT(week FROM start_date);
        partition_name := table_prefix || '_' || to_char(start_date, 'YYYY') || '_w' || 
                        lpad(week_num::TEXT, 2, '0');
        
        -- パーティションが存在しない場合のみ作成
        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            sql_command := format('
                CREATE TABLE %I PARTITION OF %I
                FOR VALUES FROM (%L) TO (%L)',
                partition_name, 
                REPLACE(table_prefix, '_', ''),
                start_date, 
                end_date
            );
            EXECUTE sql_command;
            
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- 12. メンテナンス・クリーンアップ関数
-- ==================================================================================

-- 期限切れ通知削除関数
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 古い活動ログアーカイブ関数
CREATE OR REPLACE FUNCTION archive_old_activity_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := CURRENT_DATE - (days_to_keep || ' days')::INTERVAL;
    
    -- 古いログを別テーブルに移動（必要に応じて実装）
    -- この例では単純に削除
    DELETE FROM activity_logs 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- トリガー作成状況確認
-- ==================================================================================

-- 作成されたトリガーの確認
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY event_object_table, trigger_name;

-- 作成された関数の確認
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%update%' OR routine_name LIKE '%handle%'
ORDER BY routine_name;

-- ==================================================================================
-- トリガー実装完了
-- ==================================================================================