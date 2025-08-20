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