/**
 * タスク管理システムの型定義
 */

import { Tag, TagWithTaskCount } from './tag';
import { Project, ProjectWithTaskCount } from './project';

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

// タスクのスケジュール情報
export interface TaskScheduleInfo {
  scheduledDate?: Date;
  scheduledStartTime?: string;  // HH:mm形式
  scheduledEndTime?: string;    // HH:mm形式
  scheduleItemId?: string;      // 関連するScheduleItemのID
}

// タグの型定義は tag.ts から import する

// === 日付処理とバリデーション関連の型定義 ===

// 日付処理結果の型定義
export interface DateProcessingResult {
  isValid: boolean;
  date?: Date;
  error?: string;
  originalInput: string | Date | undefined;
}

// バリデーション結果の型定義
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// フォームバリデーションエラーの型定義
export interface ValidationErrors {
  title?: string[];
  description?: string[];
  priority?: string[];
  dueDate?: string[];
  estimatedHours?: string[];
  tags?: string[];
  projectId?: string[];
  general?: string[]; // クロスフィールドバリデーションエラー用
  [key: string]: string[] | undefined;
}

// フォームデータの型定義（TaskFormコンポーネント用）
export interface TaskFormData {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string; // フォーム入力では文字列として管理
  estimatedHours: string; // フォーム入力では文字列として管理
  tags: Tag[];
  projectId?: string;
}

// プロジェクト・タグ連携対応のフォームデータ型
export interface TaskFormWithCategoriesData extends TaskFormData {
  projectId?: string | null;   // プロジェクト選択（null許可）
  selectedTags: Tag[];        // 選択済みタグの配列
  tagIds: string[];           // タグIDの配列（フォーム管理用）
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
  // アーカイブ日時（アーカイブタスクの時系列管理用）
  archivedAt?: Date;
  // スケジュール情報の追加
  scheduleInfo?: TaskScheduleInfo;
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

// === プロジェクト・タグ連携の拡張型定義 ===

// プロジェクト・タグ情報を含むTask型（populated）
export interface TaskWithCategories extends Task {
  project?: Project;           // プロジェクト情報（populated）
  tags: Tag[];                // タグ情報の配列（populated）
  
  // 統計情報（オプション）
  relatedTaskCount?: number;   // 同じプロジェクト・タグの関連タスク数
  completionRate?: number;     // 同カテゴリのタスクの完了率
}

// プロジェクト・タグ選択用のフォームデータ型
export interface TaskCategoryFormData {
  projectId?: string | null;   // 選択されたプロジェクトID
  tagIds: string[];           // 選択されたタグIDの配列
}

// プロジェクト・タグ連携用の作成Input
export interface CreateTaskWithCategoriesInput extends CreateTaskInput {
  projectId?: string | null;   // プロジェクトID
  tagIds?: string[];          // タグIDの配列
}

// プロジェクト・タグ連携用の更新Input
export interface UpdateTaskWithCategoriesInput extends UpdateTaskInput {
  projectId?: string | null;   // プロジェクトID（null許可で削除可能）
  tagIds?: string[];          // タグIDの配列
}

// タスク一覧でのプロジェクト・タグフィルター
export interface TaskCategoryFilter extends TaskFilter {
  projectIds?: string[];      // 複数プロジェクトでのフィルタリング
  tagIds?: string[];         // 複数タグでのフィルタリング
  hasProject?: boolean;      // プロジェクト有無でのフィルタリング
  hasTags?: boolean;         // タグ有無でのフィルタリング
}

// プロジェクト・タグ統計情報付きTaskリスト
export interface TaskListWithCategories {
  tasks: TaskWithCategories[];
  projectStats: ProjectWithTaskCount[];
  tagStats: TagWithTaskCount[];
  totalCount: number;
  filteredCount: number;
}