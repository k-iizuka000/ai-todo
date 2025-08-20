/**
 * タスク管理システムの型定義
 */

// タスクの状態を表すenum
export type TaskStatus = 
  | 'todo'       // 未着手
  | 'in_progress' // 進行中
  | 'done'       // 完了
  | 'archived';  // アーカイブ済み

// タスクの優先度を表すenum
export type Priority = 
  | 'low'        // 低
  | 'medium'     // 中
  | 'high'       // 高
  | 'urgent'     // 緊急
  | 'critical';  // 最重要

// サブタスクの型定義
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// タグの型定義
export interface Tag {
  id: string;
  name: string;
  color: string;
}

// メインのTask型定義
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  projectId?: string;
  assigneeId?: string;
  tags: Tag[];
  subtasks: Subtask[];
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

// タスク作成用のInput型（必須フィールドのみ）
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: Priority;
  projectId?: string;
  assigneeId?: string;
  tags?: Tag[];
  dueDate?: Date;
  estimatedHours?: number;
}

// タスク更新用のInput型
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  projectId?: string;
  assigneeId?: string;
  tags?: Tag[];
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
}

// タスクフィルター用の型
export interface TaskFilter {
  status?: TaskStatus[];
  priority?: Priority[];
  projectId?: string;
  assigneeId?: string;
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
}

// タスクソート用の型
export type TaskSortField = 
  | 'title'
  | 'status'
  | 'priority'
  | 'dueDate'
  | 'createdAt'
  | 'updatedAt';

export interface TaskSort {
  field: TaskSortField;
  order: 'asc' | 'desc';
}

// タスクリスト表示用の設定
export interface TaskListOptions {
  filter?: TaskFilter;
  sort?: TaskSort;
  page?: number;
  limit?: number;
}

// === 拡張型定義（タスク詳細機能用） ===

// 階層タスク用の拡張型
export interface HierarchicalTask extends Task {
  parentId?: string;          // 親タスクID
  children?: HierarchicalTask[]; // 子タスク配列
  level: number;              // 階層レベル (0=ルート)
  isExpanded?: boolean;       // 展開状態
  completionRate?: number;    // 完了率 (サブタスクの集計)
}

// コメント型
export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  mentions?: string[];
}

// 添付ファイル型
export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// 履歴型
export interface TaskHistory {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: TaskAction;
  changes: Record<string, any>;
  timestamp: Date;
}

export type TaskAction = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'comment_added'
  | 'subtask_added'
  | 'subtask_completed';

// タスク詳細用の拡張型
export interface TaskDetail extends Task {
  comments: TaskComment[];
  attachments: TaskAttachment[];
  history: TaskHistory[];
  parentTask?: Task;
  childTasks: Task[];
}

// サブタスク作成用Input
export interface CreateSubtaskInput {
  parentId: string;
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
}