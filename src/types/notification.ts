// 通知タイプ
export type NotificationType = 
  | 'task_deadline'      // タスク期限
  | 'task_assigned'      // タスク割り当て
  | 'task_completed'     // タスク完了
  | 'mention'           // メンション
  | 'project_update'    // プロジェクト更新
  | 'system';           // システム通知

// 通知の優先度
export type NotificationPriority = 'HIGH' | 'MEDIUM' | 'LOW';

// 各通知タイプ固有のメタデータ型
export interface TaskDeadlineMetadata {
  taskId: string;
  projectId: string;
  overdue?: boolean;
}

export interface TaskAssignedMetadata {
  taskId: string;
  projectId: string;
  userId: string;
}

export interface TaskCompletedMetadata {
  taskId: string;
  projectId: string;
  userId?: string;
  subtaskId?: string;
}

export interface MentionMetadata {
  taskId?: string;
  projectId: string;
  userId: string;
  discussionId?: string;
}

export interface ProjectUpdateMetadata {
  projectId: string;
  newMemberId?: string;
  updatedField?: string;
}

export interface SystemMetadata {
  version?: string;
  maintenanceDate?: string;
  [key: string]: any; // システム通知は柔軟性を保持
}

// ユニオン型でメタデータを型安全に
export type NotificationMetadata =
  | TaskDeadlineMetadata
  | TaskAssignedMetadata
  | TaskCompletedMetadata
  | MentionMetadata
  | ProjectUpdateMetadata
  | SystemMetadata;

// 通知のインターフェース
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: NotificationMetadata;
}