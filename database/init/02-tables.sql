-- ==================================================================================
-- 02-tables.sql: AI-TODO データベーステーブル設計
-- ==================================================================================
-- 設計書グループ2: スキーマ設計（改良版）準拠
-- PostgreSQL 15の最新機能を活用したパフォーマンス最適化テーブル設計
-- パーティショニング、制約、インデックス戦略を含む包括的実装
-- ==================================================================================

-- ==================================================================================
-- 1. プロジェクトテーブル（パーティション対応）
-- ==================================================================================

-- メインプロジェクトテーブル（月次パーティション）
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    status project_status NOT NULL DEFAULT 'planning',
    priority project_priority NOT NULL DEFAULT 'medium',
    color VARCHAR(7) DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    icon VARCHAR(10) DEFAULT '📋',
    owner_id UUID NOT NULL,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    deadline TIMESTAMPTZ,
    budget DECIMAL(12,2) CHECK (budget >= 0),
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    search_vector tsvector,
    
    -- 監査フィールド
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    -- ビジネスルール制約
    CONSTRAINT valid_dates CHECK (
        (start_date IS NULL OR end_date IS NULL) OR 
        (start_date <= end_date)
    ),
    CONSTRAINT valid_deadline CHECK (
        (deadline IS NULL) OR 
        (start_date IS NULL OR deadline >= start_date)
    )
) PARTITION BY RANGE (created_at);

-- プロジェクトパーティション作成（2025年対応）
CREATE TABLE projects_2025_01 PARTITION OF projects
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE projects_2025_02 PARTITION OF projects
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE projects_2025_03 PARTITION OF projects
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE projects_2025_04 PARTITION OF projects
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE projects_2025_05 PARTITION OF projects
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE projects_2025_06 PARTITION OF projects
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE projects_2025_07 PARTITION OF projects
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE projects_2025_08 PARTITION OF projects
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE projects_2025_09 PARTITION OF projects
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE projects_2025_10 PARTITION OF projects
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE projects_2025_11 PARTITION OF projects
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE projects_2025_12 PARTITION OF projects
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- ==================================================================================
-- 2. タスクテーブル（高頻度アクセス対応）
-- ==================================================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    priority priority_level NOT NULL DEFAULT 'medium',
    
    -- リレーション
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id UUID,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- 日時管理
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- 工数管理
    estimated_hours SMALLINT DEFAULT 0 CHECK (estimated_hours >= 0 AND estimated_hours <= 1000),
    actual_hours SMALLINT DEFAULT 0 CHECK (actual_hours >= 0 AND actual_hours <= 1000),
    completion_percentage SMALLINT DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    
    -- 拡張データ
    metadata JSONB DEFAULT '{}',
    search_vector tsvector,
    
    -- アーカイブ管理
    archived_at TIMESTAMPTZ,
    
    -- 監査フィールド
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    -- ビジネスルール制約
    CONSTRAINT valid_hours CHECK (actual_hours >= 0 AND estimated_hours >= 0),
    CONSTRAINT valid_completion CHECK (
        (status != 'done') OR 
        (status = 'done' AND completion_percentage = 100)
    ),
    CONSTRAINT valid_dates CHECK (
        (start_date IS NULL OR due_date IS NULL) OR 
        (start_date <= due_date)
    ),
    CONSTRAINT valid_archived_status CHECK (
        (archived_at IS NULL AND status != 'archived') OR
        (archived_at IS NOT NULL AND status = 'archived')
    )
);

-- タスクテーブルのフィルファクター設定（更新頻度が高いため）
ALTER TABLE tasks SET (fillfactor = 85);

-- ==================================================================================
-- 3. タグテーブル（使用頻度統計付き）
-- ==================================================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    description TEXT,
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    is_system BOOLEAN DEFAULT FALSE, -- システムタグフラグ
    
    -- 監査フィールド
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID
);

-- ==================================================================================
-- 4. スケジュールテーブル（日付最適化）
-- ==================================================================================

CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- 統計データ
    total_estimated INTEGER DEFAULT 0 CHECK (total_estimated >= 0),
    total_actual INTEGER DEFAULT 0 CHECK (total_actual >= 0),
    utilization INTEGER DEFAULT 0 CHECK (utilization BETWEEN 0 AND 100),
    
    -- 拡張データ
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    -- 監査フィールド
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- ユニーク制約
    UNIQUE(user_id, date)
);

-- ==================================================================================
-- 5. スケジュールアイテムテーブル
-- ==================================================================================

CREATE TABLE schedule_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- 基本情報
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    type schedule_item_type NOT NULL DEFAULT 'task',
    
    -- 時間管理
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time))/60
    ) STORED,
    
    -- 見た目・状態
    color VARCHAR(7) DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    status schedule_item_status NOT NULL DEFAULT 'planned',
    priority priority_level NOT NULL DEFAULT 'medium',
    is_locked BOOLEAN DEFAULT FALSE,
    
    -- 実績管理
    estimated_time INTEGER DEFAULT 0 CHECK (estimated_time >= 0),
    actual_time INTEGER DEFAULT 0 CHECK (actual_time >= 0),
    completion_rate SMALLINT DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 100),
    
    -- 拡張データ
    metadata JSONB DEFAULT '{}',
    
    -- 監査フィールド
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    
    -- 時間制約
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT valid_duration CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time))/60 >= 5 -- 最低5分
    )
);

-- フィルファクター設定（頻繁に更新される）
ALTER TABLE schedule_items SET (fillfactor = 85);

-- ==================================================================================
-- 6. 通知テーブル（時系列パーティション）
-- ==================================================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'medium',
    
    -- 通知内容
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    
    -- 状態管理
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    -- 関連データ
    related_id UUID, -- 関連するオブジェクトのID
    related_type VARCHAR(50), -- 関連するオブジェクトタイプ
    
    -- 拡張データ
    metadata JSONB DEFAULT '{}',
    
    -- 監査フィールド
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
) PARTITION BY RANGE (created_at);

-- 通知パーティション作成（週次パーティション）
CREATE TABLE notifications_2025_w01 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-01') TO ('2025-01-08');
CREATE TABLE notifications_2025_w02 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-08') TO ('2025-01-15');
CREATE TABLE notifications_2025_w03 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-15') TO ('2025-01-22');
CREATE TABLE notifications_2025_w04 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-22') TO ('2025-01-29');
CREATE TABLE notifications_2025_w05 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-29') TO ('2025-02-05');

-- ==================================================================================
-- 7. 中間テーブル（多対多リレーション）
-- ==================================================================================

-- タスク・タグ関連テーブル
CREATE TABLE task_tags (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID,
    PRIMARY KEY (task_id, tag_id)
);

-- プロジェクトメンバーテーブル
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role project_role NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}', -- 詳細権限設定
    
    -- 監査フィールド
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    invited_by UUID,
    last_activity_at TIMESTAMPTZ,
    
    UNIQUE(project_id, user_id)
);

-- サブタスクテーブル
CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    order_index SMALLINT DEFAULT 0 CHECK (order_index >= 0),
    
    -- 監査フィールド
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_completion_date CHECK (
        (completed = FALSE AND completed_at IS NULL) OR
        (completed = TRUE AND completed_at IS NOT NULL)
    )
);

-- ==================================================================================
-- 8. 活動ログテーブル（監査・履歴管理）
-- ==================================================================================

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'project', 'schedule' etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'archived'
    
    -- 変更内容
    changes JSONB DEFAULT '{}', -- 変更前後のデータ
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
) PARTITION BY RANGE (created_at);

-- ログパーティション作成（月次）
CREATE TABLE activity_logs_2025_08 PARTITION OF activity_logs
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE activity_logs_2025_09 PARTITION OF activity_logs
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE activity_logs_2025_10 PARTITION OF activity_logs
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- ==================================================================================
-- 9. テーブルコメント（ドキュメント化）
-- ==================================================================================

-- テーブルコメント
COMMENT ON TABLE projects IS 'プロジェクト管理テーブル（月次パーティション対応）';
COMMENT ON TABLE tasks IS 'タスク管理テーブル（高頻度アクセス対応、フィルファクター85%）';
COMMENT ON TABLE tags IS 'タグ管理テーブル（使用頻度統計機能付き）';
COMMENT ON TABLE schedules IS 'スケジュール管理テーブル（日付最適化、統計データ含む）';
COMMENT ON TABLE schedule_items IS 'スケジュールアイテムテーブル（時間管理、実績記録）';
COMMENT ON TABLE notifications IS '通知管理テーブル（週次パーティション、自動期限切れ）';
COMMENT ON TABLE task_tags IS 'タスク・タグ関連テーブル（多対多リレーション）';
COMMENT ON TABLE project_members IS 'プロジェクトメンバーテーブル（権限管理）';
COMMENT ON TABLE subtasks IS 'サブタスクテーブル（順序管理、完了状態追跡）';
COMMENT ON TABLE activity_logs IS '活動ログテーブル（監査証跡、月次パーティション）';

-- 重要カラムコメント
COMMENT ON COLUMN tasks.completion_percentage IS '完了率（0-100%）、status=doneの場合は100%必須';
COMMENT ON COLUMN tasks.search_vector IS '全文検索用ベクター（自動更新）';
COMMENT ON COLUMN tags.usage_count IS 'タグ使用回数（トリガーで自動更新）';
COMMENT ON COLUMN schedule_items.duration IS '所要時間（分、自動計算）';
COMMENT ON COLUMN notifications.expires_at IS '通知期限（30日後、自動削除対象）';
COMMENT ON COLUMN activity_logs.changes IS '変更内容JSON（変更前後のデータ）';

-- ==================================================================================
-- 10. 統計情報・パフォーマンス設定
-- ==================================================================================

-- 統計情報収集の最適化
ALTER TABLE tasks SET (
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_analyze_threshold = 50,
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_threshold = 50
);

ALTER TABLE schedule_items SET (
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_scale_factor = 0.1
);

-- パーティション統計
ALTER TABLE notifications SET (
    autovacuum_analyze_scale_factor = 0.02,
    autovacuum_vacuum_scale_factor = 0.05
);

-- ==================================================================================
-- テーブル作成完了の確認
-- ==================================================================================

-- 作成されたテーブルの確認
SELECT 
    tablename,
    schemaname,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- パーティション状況の確認
SELECT 
    schemaname,
    tablename,
    partitionname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||partitionname)) as size
FROM (
    SELECT DISTINCT
        n.nspname as schemaname,
        c.relname as tablename,
        c2.relname as partitionname
    FROM pg_inherits i
    JOIN pg_class c ON i.inhparent = c.oid
    JOIN pg_class c2 ON i.inhrelid = c2.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
) partitions
ORDER BY tablename, partitionname;

-- ==================================================================================
-- 初期データ挿入の準備完了
-- ==================================================================================