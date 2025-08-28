-- AI TODO Application Custom Types
-- 設計書グループ2: カスタムENUM型定義
-- Version: 2.0 (改良版)
-- Date: 2025-08-28

-- ==================================================
-- Custom ENUM Types for Type Safety & Performance
-- ==================================================

-- タスクステータス（基本4状態 + archived）
CREATE TYPE task_status AS ENUM (
    'todo',         -- 未着手
    'in_progress',  -- 進行中  
    'done',         -- 完了
    'archived'      -- アーカイブ済み
);

-- 優先度レベル（5段階）
CREATE TYPE priority_level AS ENUM (
    'low',          -- 低
    'medium',       -- 中
    'high',         -- 高
    'urgent',       -- 緊急
    'critical'      -- 最重要
);

-- プロジェクトステータス（ライフサイクル管理）
CREATE TYPE project_status AS ENUM (
    'active',       -- アクティブ（進行中）
    'completed',    -- 完了
    'planning',     -- 計画中
    'on_hold',      -- 保留中
    'cancelled'     -- キャンセル
);

-- プロジェクト優先度（4段階、criticalを最上位に）
CREATE TYPE project_priority AS ENUM (
    'critical',     -- 最重要
    'high',         -- 高
    'medium',       -- 中
    'low'           -- 低
);

-- 通知タイプ（システム通知種別）
CREATE TYPE notification_type AS ENUM (
    'task_deadline',    -- タスク期限
    'task_assigned',    -- タスク割り当て
    'task_completed',   -- タスク完了
    'mention',          -- メンション
    'project_update',   -- プロジェクト更新
    'system'            -- システム通知
);

-- 通知優先度（3段階）
CREATE TYPE notification_priority AS ENUM (
    'high',         -- 高（即座に表示）
    'medium',       -- 中（通常通知）
    'low'           -- 低（バッチ処理）
);

-- スケジュールアイテムタイプ（時間管理項目）
CREATE TYPE schedule_item_type AS ENUM (
    'task',         -- タスク作業
    'meeting',      -- 会議
    'break',        -- 休憩
    'personal',     -- 個人用務
    'subtask'       -- サブタスク
);

-- スケジュールアイテムステータス
CREATE TYPE schedule_item_status AS ENUM (
    'planned',      -- 計画済み
    'in_progress',  -- 実行中
    'completed',    -- 完了
    'cancelled'     -- キャンセル
);

-- プロジェクトメンバーロール（権限管理）
CREATE TYPE project_role AS ENUM (
    'owner',        -- オーナー（全権限）
    'admin',        -- 管理者（設定変更可）
    'member',       -- メンバー（通常権限）
    'viewer'        -- 閲覧者（読み取りのみ）
);

-- ==================================================
-- Type Comments for Documentation
-- ==================================================

COMMENT ON TYPE task_status IS '改良版: タスクの状態管理（型安全性確保）';
COMMENT ON TYPE priority_level IS '改良版: 5段階優先度システム';
COMMENT ON TYPE project_status IS '改良版: プロジェクトライフサイクル管理';
COMMENT ON TYPE project_priority IS '改良版: プロジェクト優先度（critical最優先）';
COMMENT ON TYPE notification_type IS '改良版: 通知システム種別管理';
COMMENT ON TYPE notification_priority IS '改良版: 通知優先度制御';
COMMENT ON TYPE schedule_item_type IS '改良版: スケジュール項目種別';
COMMENT ON TYPE schedule_item_status IS '改良版: スケジュール実行状態';
COMMENT ON TYPE project_role IS '改良版: プロジェクト権限管理';

-- ==================================================
-- Type Utility Functions
-- ==================================================

-- 優先度レベルを数値に変換（ソート用）
CREATE OR REPLACE FUNCTION priority_level_to_order(p priority_level)
RETURNS INTEGER AS $$
BEGIN
    CASE p
        WHEN 'critical' THEN RETURN 5;
        WHEN 'urgent' THEN RETURN 4;
        WHEN 'high' THEN RETURN 3;
        WHEN 'medium' THEN RETURN 2;
        WHEN 'low' THEN RETURN 1;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- プロジェクト優先度を数値に変換
CREATE OR REPLACE FUNCTION project_priority_to_order(p project_priority)
RETURNS INTEGER AS $$
BEGIN
    CASE p
        WHEN 'critical' THEN RETURN 4;
        WHEN 'high' THEN RETURN 3;
        WHEN 'medium' THEN RETURN 2;
        WHEN 'low' THEN RETURN 1;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;