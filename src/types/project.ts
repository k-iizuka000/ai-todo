/**
 * プロジェクト管理システムの型定義
 */

// プロジェクトの状態を表すenum (Prismaスキーマと一致)
export type ProjectStatus = 
  | 'PLANNING'    // 計画中
  | 'ACTIVE'      // アクティブ
  | 'ON_HOLD'     // 保留中
  | 'COMPLETED'   // 完了
  | 'CANCELLED';  // キャンセル

// プロジェクトの優先度 (Prismaスキーマと一致)
export type ProjectPriority = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

// プロジェクトメンバーの役割 (Prismaスキーマと一致)
export type ProjectRole = 
  | 'OWNER'       // オーナー
  | 'ADMIN'       // 管理者
  | 'MEMBER'      // メンバー
  | 'VIEWER';     // 閲覧者

// プロジェクトメンバーの型定義（DBテーブル構造に対応）
export interface ProjectMember {
  id: string;
  userId: string;
  role: ProjectRole;
  joinedAt: Date;
}

// JOINして取得する場合のプロジェクトメンバー型
export interface ProjectMemberWithUser extends ProjectMember {
  user: {
    id: string;
    email: string;
    profile?: {
      displayName: string;
      firstName: string;
      lastName: string;
      avatar?: string | null;
    } | null;
  };
}

// プロジェクトの進捗統計 (サーバーサイドのレスポンス型と一致)
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completionRate: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  overdueTasks: number;
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    critical: number;
  };
  tasksByStatus: {
    todo: number;
    inProgress: number;
    done: number;
    archived: number;
  };
}

// メインのProject型定義（DBテーブル構造に対応）
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  color: string;
  icon?: string;
  ownerId: string;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  budget?: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// JOINでタグやメンバーを取得する場合のプロジェクト型 (サーバーサイドレスポンス型と一致)
export interface ProjectWithDetails extends Project {
  owner: {
    id: string;
    email: string;
    profile?: {
      displayName: string;
      firstName: string;
      lastName: string;
      avatar?: string | null;
    } | null;
  };
  members: {
    id: string;
    role: ProjectRole;
    joinedAt: Date;
    user: {
      id: string;
      email: string;
      profile?: {
        displayName: string;
        firstName: string;
        lastName: string;
        avatar?: string | null;
      } | null;
    };
  }[];
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
  _count: {
    tasks: number;
    members: number;
  };
}

// プロジェクト作成用のInput型 (Zodスキーマと一致)
export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  color?: string;
  icon?: string;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  budget?: number;
  tagIds?: string[]; // タグIDの配列
  memberIds?: string[]; // メンバーIDの配列
}

// プロジェクト更新用のInput型 (Zodスキーマと一致)
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  color?: string;
  icon?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  deadline?: Date | null;
  budget?: number | null;
  isArchived?: boolean;
  tagIds?: string[]; // タグIDの配列
  memberIds?: string[]; // メンバーIDの配列
}

// プロジェクトフィルター用の型 (Zodスキーマと一致)
export interface ProjectFilterInput {
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  ownerId?: string;
  memberIds?: string[];
  dateRange?: {
    field: 'startDate' | 'endDate' | 'deadline' | 'createdAt';
    from?: Date;
    to?: Date;
  };
  tags?: string[];
  search?: string;
  isArchived?: boolean;
}

// 互換性のためのレガシー型
export interface ProjectFilter extends Omit<ProjectFilterInput, 'memberIds'> {
  memberId?: string;
}

// プロジェクトソート用の型 (Zodスキーマと一致)
export type ProjectSortField = 
  | 'name'
  | 'status'
  | 'priority'
  | 'createdAt'
  | 'updatedAt'
  | 'startDate'
  | 'endDate'
  | 'deadline'
  | 'budget';

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

// プロジェクト詳細表示用（統計情報込み）(サーバーサイドレスポンス型と一致)
export interface ProjectWithStats extends ProjectWithDetails {
  stats: ProjectStats;
}

// === 拡張型定義（プロジェクト詳細機能用） ===

// プロジェクトビュー設定
export interface ProjectView {
  id: string;
  name: string;
  viewType: 'kanban' | 'list' | 'timeline' | 'grid';
  filters: any; // TaskFilter型を参照する場合は import が必要
  sortBy: any; // TaskSort型を参照する場合は import が必要
  savedAt: Date;
}

// 拡張されたプロジェクト型（統計・メンバー・最近のタスクを含む）
export interface ProjectWithFullDetails extends Project {
  stats: ProjectStats;
  members: ProjectMember[];
  recentTasks: any[]; // Task[]型を参照する場合は import が必要
  views: ProjectView[];
}

// === API関連の追加型定義 ===

// プロジェクトメンバー追加用のInput型
export interface AddProjectMemberInput {
  userId: string;
  role?: ProjectRole;
}

// プロジェクトメンバー更新用のInput型
export interface UpdateProjectMemberInput {
  role: ProjectRole;
}

// プロジェクト一括更新用のInput型
export interface BulkUpdateProjectsInput {
  projectIds: string[];
  updates: {
    status?: ProjectStatus;
    priority?: ProjectPriority;
    isArchived?: boolean;
  };
}

// 旧型との互換性を保つためのマッピング関数
export const mapToLegacyStatus = (status: ProjectStatus): string => {
  switch (status) {
    case 'PLANNING': return 'planning';
    case 'ACTIVE': return 'active';
    case 'ON_HOLD': return 'on_hold';
    case 'COMPLETED': return 'completed';
    case 'CANCELLED': return 'cancelled';
    default: return status;
  }
};

export const mapFromLegacyStatus = (status: string): ProjectStatus => {
  switch (status) {
    case 'planning': return 'PLANNING';
    case 'active': return 'ACTIVE';
    case 'on_hold': return 'ON_HOLD';
    case 'completed': return 'COMPLETED';
    case 'cancelled': return 'CANCELLED';
    default: return status as ProjectStatus;
  }
};

export const mapToLegacyPriority = (priority: ProjectPriority): string => {
  switch (priority) {
    case 'LOW': return 'low';
    case 'MEDIUM': return 'medium';
    case 'HIGH': return 'high';
    case 'CRITICAL': return 'critical';
    default: return priority;
  }
};

export const mapFromLegacyPriority = (priority: string): ProjectPriority => {
  switch (priority) {
    case 'low': return 'LOW';
    case 'medium': return 'MEDIUM';
    case 'high': return 'HIGH';
    case 'critical': return 'CRITICAL';
    default: return priority as ProjectPriority;
  }
};

export const mapToLegacyRole = (role: ProjectRole): string => {
  switch (role) {
    case 'OWNER': return 'owner';
    case 'ADMIN': return 'admin';
    case 'MEMBER': return 'member';
    case 'VIEWER': return 'viewer';
    default: return role;
  }
};

export const mapFromLegacyRole = (role: string): ProjectRole => {
  switch (role) {
    case 'owner': return 'OWNER';
    case 'admin': return 'ADMIN';
    case 'member': return 'MEMBER';
    case 'viewer': return 'VIEWER';
    default: return role as ProjectRole;
  }
};