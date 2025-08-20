/**
 * プロジェクト管理システムの型定義
 */

// プロジェクトの状態を表すenum
export type ProjectStatus = 
  | 'planning'    // 計画中
  | 'active'      // アクティブ
  | 'on_hold'     // 保留中
  | 'completed'   // 完了
  | 'cancelled';  // キャンセル

// プロジェクトの優先度
export type ProjectPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

// プロジェクトメンバーの役割
export type ProjectRole = 
  | 'owner'       // オーナー
  | 'admin'       // 管理者
  | 'member'      // メンバー
  | 'viewer';     // 閲覧者

// プロジェクトメンバーの型定義
export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  joinedAt: Date;
}

// プロジェクトの進捗統計
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  progressPercentage: number;
  estimatedHours: number;
  actualHours: number;
}

// メインのProject型定義
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  color: string;
  icon?: string;
  ownerId: string;
  members: ProjectMember[];
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  budget?: number;
  tags: string[];
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// プロジェクト作成用のInput型
export interface CreateProjectInput {
  name: string;
  description?: string;
  priority?: ProjectPriority;
  color?: string;
  icon?: string;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  budget?: number;
  tags?: string[];
}

// プロジェクト更新用のInput型
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  color?: string;
  icon?: string;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  budget?: number;
  tags?: string[];
  isArchived?: boolean;
}

// プロジェクトフィルター用の型
export interface ProjectFilter {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  ownerId?: string;
  memberId?: string;
  tags?: string[];
  isArchived?: boolean;
  search?: string;
}

// プロジェクトソート用の型
export type ProjectSortField = 
  | 'name'
  | 'status'
  | 'priority'
  | 'createdAt'
  | 'updatedAt'
  | 'deadline';

export interface ProjectSort {
  field: ProjectSortField;
  order: 'asc' | 'desc';
}

// プロジェクトリスト表示用の設定
export interface ProjectListOptions {
  filter?: ProjectFilter;
  sort?: ProjectSort;
  page?: number;
  limit?: number;
  includeStats?: boolean;
}

// プロジェクト詳細表示用（統計情報込み）
export interface ProjectWithStats extends Project {
  stats: ProjectStats;
}