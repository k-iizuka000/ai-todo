-- AI TODO Application Advanced Indexing Strategy (改良版)
-- 設計書グループ3: インデックス戦略
-- Version: 2.0 (改良版)
-- Date: 2025-08-28

-- ==================================================
-- 基本インデックス（外部キー + 頻繁検索項目）
-- ==================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_last_login ON users(last_login_at DESC) 
    WHERE last_login_at IS NOT NULL;

-- User profiles indexes
CREATE INDEX idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX idx_user_profiles_department ON user_profiles(department) 
    WHERE department IS NOT NULL;

-- ==================================================
-- プロジェクト関連インデックス（改良版）
-- ==================================================

-- Projects table - 基本検索インデックス
CREATE INDEX idx_projects_owner_id ON projects(owner_id) 
    WHERE owner_id IS NOT NULL;
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_priority ON projects(priority);

-- 改良版追加: アクティブプロジェクト専用インデックス（部分インデックス）
CREATE INDEX idx_projects_active ON projects(status, priority, deadline) 
    WHERE status IN ('active', 'planning') AND is_archived = false;

-- 改良版追加: 期限切れプロジェクト検索用
CREATE INDEX idx_projects_overdue ON projects(deadline, status) 
    WHERE deadline < NOW() AND status IN ('active', 'planning');

-- 改良版追加: 全文検索用GINインデックス
CREATE INDEX idx_projects_search ON projects USING GIN(search_vector);

-- 改良版追加: JSONBメタデータ検索用
CREATE INDEX idx_projects_metadata ON projects USING GIN(metadata);

-- Project members indexes
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_project_members_role ON project_members(role);

-- ==================================================
-- タスク関連インデックス（改良版：パフォーマンス特化）
-- ==================================================

-- Tasks table - 基本外部キーインデックス
CREATE INDEX idx_tasks_project_id ON tasks(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- 改良版追加: アクティブタスク専用インデックス（部分インデックス）
CREATE INDEX idx_tasks_active ON tasks(status, priority, due_date) 
    WHERE status IN ('todo', 'in_progress');

-- 改良版追加: アーカイブタスク専用インデックス
CREATE INDEX idx_tasks_archived ON tasks(archived_at) 
    WHERE status = 'archived' AND archived_at IS NOT NULL;

-- 改良版追加: 期限ベース検索最適化
CREATE INDEX idx_tasks_due_date ON tasks(due_date) 
    WHERE due_date IS NOT NULL;

-- 改良版追加: 担当者別アクティブタスク（複合インデックス）
CREATE INDEX idx_tasks_assignee_active ON tasks(assignee_id, status, priority) 
    WHERE assignee_id IS NOT NULL AND status IN ('todo', 'in_progress');

-- 改良版追加: 全文検索用GINインデックス
CREATE INDEX idx_tasks_search ON tasks USING GIN(search_vector);

-- 改良版追加: JSONBメタデータ検索用
CREATE INDEX idx_tasks_metadata ON tasks USING GIN(metadata);

-- 改良版追加: タスクリスト表示用カバリングインデックス
CREATE INDEX idx_tasks_list_view ON tasks(project_id, status, priority, due_date) 
    INCLUDE (title, assignee_id, estimated_hours)
    WHERE project_id IS NOT NULL;

-- Subtasks indexes
CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX idx_subtasks_order ON subtasks(task_id, order_index);
CREATE INDEX idx_subtasks_completed ON subtasks(completed, task_id);

-- ==================================================
-- タグ関連インデックス（改良版：使用統計最適化）
-- ==================================================

-- Tags table - 改良版: 使用頻度順インデックス
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC, name);
CREATE INDEX idx_tags_color ON tags(color);

-- Task tags - 改良版: 高速JOIN最適化
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);
CREATE INDEX idx_task_tags_task ON task_tags(task_id);

-- Project tags indexes
CREATE INDEX idx_project_tags_project ON project_tags(project_id);
CREATE INDEX idx_project_tags_tag ON project_tags(tag_id);

-- ==================================================
-- スケジュール関連インデックス（改良版：日付最適化）
-- ==================================================

-- Schedules table - 改良版: 日付検索最適化
CREATE INDEX idx_schedules_user_date ON schedules(user_id, date DESC);
CREATE INDEX idx_schedules_date_user ON schedules(date, user_id);
CREATE INDEX idx_schedules_project ON schedules(project_id) 
    WHERE project_id IS NOT NULL;

-- Schedule items - 改良版: 時間軸検索最適化
CREATE INDEX idx_schedule_items_schedule ON schedule_items(schedule_id, start_time);
CREATE INDEX idx_schedule_items_task ON schedule_items(task_id) 
    WHERE task_id IS NOT NULL;
CREATE INDEX idx_schedule_items_type ON schedule_items(type, status);

-- 改良版追加: 日付+時間範囲検索用
CREATE INDEX idx_schedule_items_datetime ON schedule_items(schedule_id, start_time, end_time);

-- 改良版追加: ユーザー別当日スケジュール高速取得
CREATE INDEX idx_schedule_items_user_today ON schedule_items(schedule_id, start_time) 
    INCLUDE (title, type, status, color);

-- ==================================================
-- 通知関連インデックス（改良版：未読最適化）
-- ==================================================

-- Notifications - 改良版: 未読通知高速取得
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC) 
    WHERE is_read = FALSE;

-- 改良版追加: 通知タイプ別検索
CREATE INDEX idx_notifications_type ON notifications(type, priority, created_at DESC);

-- 改良版追加: JSONBメタデータ検索用
CREATE INDEX idx_notifications_metadata ON notifications USING GIN(metadata);

-- ==================================================
-- その他テーブルのインデックス（既存維持 + 改良）
-- ==================================================

-- Task comments indexes
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);
-- 改良版追加: アクティブコメント専用（削除済み除外）
CREATE INDEX idx_task_comments_active ON task_comments(task_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- Task attachments indexes
CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_uploaded_by ON task_attachments(uploaded_by);
CREATE INDEX idx_task_attachments_created_at ON task_attachments(created_at DESC);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
-- 改良版追加: エンティティ別アクション検索
CREATE INDEX idx_activity_logs_entity_action ON activity_logs(entity_type, entity_id, action, created_at DESC);

-- ==================================================
-- 高度なインデックス戦略（改良版特別機能）
-- ==================================================

-- 改良版追加: プロジェクトダッシュボード用複合インデックス
CREATE INDEX idx_project_dashboard ON tasks(project_id, status) 
    INCLUDE (priority, assignee_id, due_date, estimated_hours, actual_hours)
    WHERE project_id IS NOT NULL;

-- 改良版追加: ユーザーワークロード分析用
CREATE INDEX idx_user_workload ON tasks(assignee_id, status, estimated_hours) 
    WHERE assignee_id IS NOT NULL AND status IN ('todo', 'in_progress');

-- 改良版追加: 期限管理用複合インデックス
CREATE INDEX idx_deadline_management ON tasks(due_date, status, priority) 
    INCLUDE (title, assignee_id, project_id)
    WHERE due_date IS NOT NULL AND status IN ('todo', 'in_progress');

-- 改良版追加: タグ使用統計更新用
CREATE INDEX idx_tag_usage_update ON task_tags(tag_id, created_at DESC);

-- ==================================================
-- BRINインデックス（時系列データ用）
-- ==================================================
-- 設計書要求: 時系列データ用BRINインデックスで範囲検索最適化

-- Activity logs - 時系列順序データ用BRIN
CREATE INDEX idx_activity_logs_created_at_brin ON activity_logs USING BRIN(created_at)
    WITH (pages_per_range = 128);
COMMENT ON INDEX idx_activity_logs_created_at_brin IS 'BRINインデックス: 時系列データの範囲検索最適化（128ページ/範囲）';

-- Notifications - 時系列順序データ用BRIN
CREATE INDEX idx_notifications_created_at_brin ON notifications USING BRIN(created_at)
    WITH (pages_per_range = 128);
COMMENT ON INDEX idx_notifications_created_at_brin IS 'BRINインデックス: 通知履歴の時系列検索最適化';

-- Task comments - 時系列順序データ用BRIN
CREATE INDEX idx_task_comments_created_at_brin ON task_comments USING BRIN(created_at)
    WITH (pages_per_range = 64);
COMMENT ON INDEX idx_task_comments_created_at_brin IS 'BRINインデックス: コメント履歴の時系列検索最適化';

-- Schedules - 日付順序データ用BRIN
CREATE INDEX idx_schedules_date_brin ON schedules USING BRIN(date)
    WITH (pages_per_range = 32);
COMMENT ON INDEX idx_schedules_date_brin IS 'BRINインデックス: スケジュール日付範囲検索最適化';

-- Task attachments - アップロード日時順序用BRIN
CREATE INDEX idx_task_attachments_created_at_brin ON task_attachments USING BRIN(created_at)
    WITH (pages_per_range = 64);
COMMENT ON INDEX idx_task_attachments_created_at_brin IS 'BRINインデックス: 添付ファイル時系列検索最適化';

-- ==================================================
-- パーティションテーブル用インデックス
-- ==================================================

-- パーティション戦略: ローカルインデックス（各パーティションに自動作成）
-- 注: パーティション化テーブルではグローバルインデックスは親テーブルに作成

-- プロジェクトパーティション用インデックス戦略
-- 親テーブル（projects）にグローバルインデックスを定義
-- 各パーティションには自動的にローカルインデックスが継承される

-- 通知パーティション用インデックス戦略（週次パーティション）
-- グローバルインデックス（親テーブルnotificationsに既に定義済み）
-- パーティション用BRINインデックス（時系列最適化）
CREATE INDEX IF NOT EXISTS idx_notifications_part_brin ON notifications USING BRIN(created_at)
    WITH (pages_per_range = 16);
COMMENT ON INDEX idx_notifications_part_brin IS 'パーティション用BRINインデックス: 週次パーティション時系列最適化';

-- アクティビティログパーティション用インデックス戦略（月次パーティション想定）
-- パーティション用BRINインデックス
CREATE INDEX IF NOT EXISTS idx_activity_logs_part_brin ON activity_logs USING BRIN(created_at)
    WITH (pages_per_range = 32);
COMMENT ON INDEX idx_activity_logs_part_brin IS 'パーティション用BRINインデックス: 月次パーティション時系列最適化';

-- ==================================================
-- インデックス使用統計確認用ビュー
-- ==================================================

-- 改良版追加: インデックス効率性監視ビュー
CREATE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan > 0 THEN idx_tup_read::NUMERIC / idx_scan 
        ELSE 0 
    END AS avg_tuples_per_scan
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC, avg_tuples_per_scan DESC;

COMMENT ON VIEW index_usage_stats IS '改良版: インデックス使用統計監視';

-- ==================================================
-- インデックス設定コメント
-- ==================================================

COMMENT ON INDEX idx_tasks_active IS '改良版: アクティブタスク専用部分インデックス';
COMMENT ON INDEX idx_projects_search IS '改良版: プロジェクト全文検索GINインデックス';
COMMENT ON INDEX idx_tasks_list_view IS '改良版: タスクリスト表示用カバリングインデックス';
COMMENT ON INDEX idx_notifications_unread IS '改良版: 未読通知高速取得専用インデックス';