-- ==================================================================================
-- 02-tables-fixed.sql: AI-TODO データベーステーブル設計（修正版）
-- ==================================================================================
-- パーティション制約の問題を修正した版
-- ==================================================================================

-- ==================================================================================
-- 1. プロジェクトテーブル（パーティション制約修正）
-- ==================================================================================

CREATE TABLE projects (
    id UUID DEFAULT uuid_generate_v4(),
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
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
    CONSTRAINT valid_dates CHECK (
        (start_date IS NULL OR end_date IS NULL) OR 
        (start_date <= end_date)
    ),
    CONSTRAINT valid_deadline CHECK (
        (deadline IS NULL) OR 
        (start_date IS NULL OR deadline >= start_date)
    ),
    UNIQUE(id, created_at)
) PARTITION BY RANGE (created_at);

-- プロジェクトパーティション作成（現在の月から3ヶ月分）
CREATE TABLE projects_2025_08 PARTITION OF projects
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE projects_2025_09 PARTITION OF projects
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE projects_2025_10 PARTITION OF projects
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- ==================================================================================
-- 2. タスクテーブル（非パーティション版）
-- ==================================================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    status task_status NOT NULL DEFAULT 'todo',
    priority priority_level NOT NULL DEFAULT 'medium',
    
    project_id UUID,
    assignee_id UUID,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    estimated_hours SMALLINT DEFAULT 0 CHECK (estimated_hours >= 0 AND estimated_hours <= 1000),
    actual_hours SMALLINT DEFAULT 0 CHECK (actual_hours >= 0 AND actual_hours <= 1000),
    completion_percentage SMALLINT DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    
    metadata JSONB DEFAULT '{}',
    search_vector tsvector,
    archived_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    updated_by UUID NOT NULL,
    
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

ALTER TABLE tasks SET (fillfactor = 85);

-- ==================================================================================
-- 3. その他のテーブル（シンプル版）
-- ==================================================================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    color VARCHAR(7) NOT NULL DEFAULT '#6B7280' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    description TEXT,
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    is_system BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID
);

CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    project_id UUID,
    date DATE NOT NULL,
    
    total_estimated INTEGER DEFAULT 0 CHECK (total_estimated >= 0),
    total_actual INTEGER DEFAULT 0 CHECK (total_actual >= 0),
    utilization INTEGER DEFAULT 0 CHECK (utilization BETWEEN 0 AND 100),
    
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, date)
);

CREATE TABLE schedule_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    type schedule_item_type NOT NULL DEFAULT 'task',
    
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time))/60
    ) STORED,
    
    color VARCHAR(7) DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    status schedule_item_status NOT NULL DEFAULT 'planned',
    priority priority_level NOT NULL DEFAULT 'medium',
    is_locked BOOLEAN DEFAULT FALSE,
    
    estimated_time INTEGER DEFAULT 0 CHECK (estimated_time >= 0),
    actual_time INTEGER DEFAULT 0 CHECK (actual_time >= 0),
    completion_rate SMALLINT DEFAULT 0 CHECK (completion_rate BETWEEN 0 AND 100),
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT valid_duration CHECK (
        EXTRACT(EPOCH FROM (end_time - start_time))/60 >= 5
    )
);

ALTER TABLE schedule_items SET (fillfactor = 85);

-- 通知テーブル（非パーティション版）
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type notification_type NOT NULL,
    priority notification_priority NOT NULL DEFAULT 'medium',
    
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    related_id UUID,
    related_type VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- 中間テーブル
CREATE TABLE task_tags (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID,
    user_id UUID NOT NULL,
    role project_role NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    invited_by UUID,
    last_activity_at TIMESTAMPTZ,
    
    UNIQUE(project_id, user_id)
);

CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    order_index SMALLINT DEFAULT 0 CHECK (order_index >= 0),
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID NOT NULL,
    completed_at TIMESTAMPTZ,
    
    CONSTRAINT valid_completion_date CHECK (
        (completed = FALSE AND completed_at IS NULL) OR
        (completed = TRUE AND completed_at IS NOT NULL)
    )
);

-- 活動ログ（シンプル版）
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    
    changes JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 外部キー制約の後付け
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project_id 
    FOREIGN KEY (project_id) REFERENCES projects(id, created_at) ON DELETE CASCADE;
    
ALTER TABLE schedules ADD CONSTRAINT fk_schedules_project_id 
    FOREIGN KEY (project_id, created_at) REFERENCES projects(id, created_at) ON DELETE CASCADE;
    
ALTER TABLE project_members ADD CONSTRAINT fk_project_members_project_id 
    FOREIGN KEY (project_id, created_at) REFERENCES projects(id, created_at) ON DELETE CASCADE;

-- テーブル作成確認
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;