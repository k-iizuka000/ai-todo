/**
 * Zustandを使用したタスク管理のグローバル状態管理
 * localStorage依存を完全除去し、API層統合版として実装
 * 設計書：Issue 029 フルスタックアーキテクチャ移行対応
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { Task, TaskFilter, TaskSort, CreateTaskInput, UpdateTaskInput, TaskScheduleInfo, TaskWithCategories, CreateTaskWithCategoriesInput, UpdateTaskWithCategoriesInput } from '../types/task';
import { Tag } from '../types/tag';
import { UnscheduledTaskData } from '../types/schedule';
import { taskAPI } from './api/taskApi';
import { useProjectStore } from './projectStore';
import { useTagStore } from './tagStore';

// タスクストアの状態型定義 - API統合版（Issue #038対応）
interface TaskState {
  // 状態
  tasks: Task[];
  selectedTaskId: string | null;
  filter: TaskFilter;
  sort: TaskSort;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  lastUpdated?: number; // Issue #038: 最終更新時刻の追跡（タイムスタンプ）
  
  // アクション（非同期API統合版）
  setTasks: (tasks: Task[]) => void;
  addTask: (taskInput: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, taskInput: UpdateTaskInput) => Promise<Task>;
  updateTaskStatus: (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  loadTasks: () => Promise<void>;
  selectTask: (id: string | null) => void;
  
  // フィルター・ソート関連
  setFilter: (filter: Partial<TaskFilter>) => void;
  clearFilter: () => void;
  setSort: (sort: TaskSort) => void;
  
  // ユーティリティ
  getFilteredTasks: () => Task[];
  getTaskById: (id: string) => Task | undefined;
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
  
  // プロジェクト・タグ連携機能
  getTasksWithCategories: () => TaskWithCategories[];
  getFilteredTasksWithCategories: () => TaskWithCategories[];
  getTaskWithCategoriesById: (id: string) => TaskWithCategories | undefined;
  getTasksByTag: (tagId: string) => Task[];
  addTaskWithCategories: (taskInput: CreateTaskWithCategoriesInput) => Promise<Task>;
  updateTaskWithCategories: (id: string, taskInput: UpdateTaskWithCategoriesInput) => Promise<Task>;
  
  // アーカイブ関連（新規追加）
  getArchivedTasks: () => Task[];
  getNonArchivedTasks: () => Task[];
  getFilteredTasksWithArchived: (includeArchived: boolean) => Task[];
  
  // 一括操作
  bulkUpdateTasks: (ids: string[], updates: UpdateTaskInput) => void;
  bulkDeleteTasks: (ids: string[]) => void;
  
  // 状態管理
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // データ初期化（API版）
  initializeStore: () => Promise<void>;
  resetStore: () => void;
  syncWithServer: () => Promise<void>;
  
  // データ同期機能（ProjectStore連携）
  notifyProjectStore: (taskId: string, task: Task | null, operation: 'create' | 'update' | 'delete') => Promise<void>;
  handleProjectUpdate: (projectId: string, updatedProject: any) => Promise<void>;
  
  // TagStore連携機能
  notifyTagStore: (taskId: string, task: Task | null, operation: 'create' | 'update' | 'delete') => Promise<void>;
  handleTagUpdate: (tagId: string, updatedTag: Tag) => Promise<void>;
  handleTagDeletion: (tagId: string) => Promise<void>;
  
  // スケジュール関連メソッド
  getUnscheduledTasks: () => UnscheduledTaskData[];
  getUnscheduledSubtasks: (parentId: string) => UnscheduledTaskData[];
  updateTaskSchedule: (taskId: string, scheduleInfo: TaskScheduleInfo) => void;
  clearTaskSchedule: (taskId: string) => void;
  
  // Issue #061: 状態同期強化用メソッド
  getLastUpdated: () => number | undefined;
}

// デフォルトのフィルター設定
const defaultFilter: TaskFilter = {
  status: undefined,
  priority: undefined,
  projectId: undefined,
  assigneeId: undefined,
  tags: undefined,
  dueDateFrom: undefined,
  dueDateTo: undefined,
  search: undefined
};

// デフォルトのソート設定
const defaultSort: TaskSort = {
  field: 'createdAt',
  order: 'desc'
};

// API 定数設定
const API_ENDPOINTS = {
  TASKS: '/api/tasks',
  TASK_BY_ID: (id: string) => `/api/tasks/${id}`,
} as const;

// ログ用のシンプルな関数（loggerに依存しないように）
const logInfo = (message: string, data?: any) => {
  console.log(`[TaskStore] ${message}`, data || '');
};

const logError = (message: string, data?: any, error?: any) => {
  console.error(`[TaskStore] ${message}`, data || '', error || '');
};

// Zustandストアの作成（localStorage除去、API統合版）
export const useTaskStore = create<TaskState>()(
  devtools(
    (set, get) => ({
      // 初期状態
      tasks: [],
      selectedTaskId: null,
      filter: defaultFilter,
      sort: defaultSort,
      isLoading: false,
      error: null,
      isInitialized: false,
      lastUpdated: undefined, // Issue #038: 最終更新時刻の初期化

        // 基本的なCRUD操作（API統合版）
        setTasks: (tasks) => {
          set({ tasks }, false, 'setTasks');
        },

        addTask: async (taskInput) => {
          const startTime = Date.now();
          const abortController = new AbortController();
          let isOperationActive = true;
          
          logInfo('[Issue #028] addTask started with unmount protection', { taskInput, startTime });
          
          set({ isLoading: true, error: null }, false, 'addTask:start');
          
          // スコープ外で定義（catchブロックからアクセスするため）
          const { tasks } = get();
          const tempId = `temp-${Date.now()}`;
          const currentTime = new Date();
          
          const optimisticTask: Task = {
            id: tempId,
            title: taskInput.title,
            description: taskInput.description,
            status: 'TODO',
            priority: taskInput.priority || 'MEDIUM',
            projectId: taskInput.projectId || null, // undefinedをnullに正規化
            assigneeId: taskInput.assigneeId || null, // undefinedをnullに正規化
            tags: taskInput.tags || [],
            subtasks: [],
            dueDate: taskInput.dueDate,
            estimatedHours: taskInput.estimatedHours,
            actualHours: 0,
            createdAt: currentTime,
            updatedAt: currentTime,
            createdBy: 'current-user',
            updatedBy: 'current-user'
          };
          
          try {
            // Issue #028: 中断確認 - 処理実行前チェック
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] addTask aborted before optimistic update');
              return optimisticTask;
            }
            
            logInfo('[Issue #028] Optimistic update applied', { tempId, optimisticTask: { id: optimisticTask.id, title: optimisticTask.title } });

            // Issue #038: UI即座表示のための状態更新通知強化 + Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              set(
                { 
                  tasks: [...tasks, optimisticTask],
                  lastUpdated: Date.now() // Issue #038: 最終更新時刻の記録（タイムスタンプ）
                },
                false,
                'addTask:optimistic'
              );
            }

            // API コール - Issue #028: 中断可能な非同期処理
            logInfo('[Issue #028] API call starting with abort signal', { taskInput });
            
            // AbortController対応のAPI呼び出し
            const apiCallPromise = taskAPI.createTask(taskInput);
            
            // 中断監視
            abortController.signal.addEventListener('abort', () => {
              logInfo('[Issue #028] API call aborted by signal');
              isOperationActive = false;
            });
            
            const newTask = await apiCallPromise;
            
            // Issue #028: API完了後の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] addTask completed but operation was aborted, discarding result');
              return optimisticTask; // 一時的なタスクを返す
            }
            
            // 実際のタスクで置換
            const updatedTasks = get().tasks.map(task => 
              task.id === tempId ? newTask : task
            );
            
            const successTimestamp = Date.now();
            logInfo('[Issue #028] API call successful, replacing optimistic task', { 
              tempId, 
              realTaskId: newTask.id, 
              duration: Date.now() - startTime 
            });
            
            // Issue #038: API成功時の状態更新通知強化 + Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              set({
                tasks: updatedTasks,
                isLoading: false,
                error: null,
                lastUpdated: successTimestamp // Issue #038: 成功時の最終更新時刻（タイムスタンプ）
              }, false, 'addTask:success');
            }
            
            logInfo('[Issue #028] Task creation completed successfully', { 
              taskId: newTask.id, 
              totalDuration: Date.now() - startTime,
              lastUpdated: successTimestamp
            });

            // ProjectStoreにタスク作成を通知
            get().notifyProjectStore(newTask.id, newTask, 'create').catch(error => 
              logError('Async ProjectStore notification failed', { taskId: newTask.id }, error)
            );
            
            // TagStoreにタスク作成を通知（タグ使用統計更新）
            get().notifyTagStore(newTask.id, newTask, 'create').catch(error => 
              logError('Async TagStore notification failed', { taskId: newTask.id }, error)
            );

            return newTask;
            
          } catch (apiError) {
            // Issue #028: エラー処理時の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] Task creation aborted during error handling');
              return optimisticTask;
            }
            
            // オプティミスティック更新をロールバック
            const currentTasks = get().tasks.filter(task => task.id !== tempId);
            
            // API失敗時はエラー状態のみ設定（モック保持なし）
            if (isOperationActive && !abortController.signal.aborted) {
              set({
                tasks: currentTasks,
                isLoading: false,
                error: 'タスクの作成に失敗しました'
              }, false, 'addTask:error');
              
              // エラートーストでユーザー再試行を促す
              toast.error('タスクの作成に失敗しました', {
                duration: 5000,
                action: {
                  label: '再試行',
                  onClick: () => get().addTask(taskInput)
                }
              });
            }
            
            logError('[Issue #028] Failed to create task', { taskInput }, apiError);
            throw apiError;
          } finally {
            // Issue #028: 必須クリーンアップ処理
            isOperationActive = false;
          }
        },

        updateTask: async (id, taskInput) => {
          const abortController = new AbortController();
          let isOperationActive = true;
          
          set({ isLoading: true, error: null }, false, 'updateTask:start');
          
          try {
            // Issue #028: 中断確認 - 処理実行前チェック
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] updateTask aborted before processing');
              return get().getTaskById(id)!; // 元のタスクを返す
            }
            
            // 元のタスクを保存（ロールバック用）
            const { tasks } = get();
            const originalTask = tasks.find(task => task.id === id);
            
            if (!originalTask) {
              throw new Error(`Task with id ${id} not found`);
            }

            // Optimistic Update - Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              const optimisticUpdatedTasks = tasks.map(task =>
                task.id === id
                  ? {
                      ...task,
                      ...taskInput,
                      updatedAt: new Date(),
                      updatedBy: 'current-user'
                    }
                  : task
              );
              
              set(
                { tasks: optimisticUpdatedTasks },
                false,
                'updateTask:optimistic'
              );
            }

            // API コール - Issue #028: 中断可能な非同期処理
            logInfo('[Issue #028] updateTask API call starting with abort signal', { taskId: id });
            
            // 中断監視
            abortController.signal.addEventListener('abort', () => {
              logInfo('[Issue #028] updateTask API call aborted by signal');
              isOperationActive = false;
            });
            
            const updatedTask = await taskAPI.updateTask(id, taskInput);
            
            // Issue #028: API完了後の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] updateTask completed but operation was aborted');
              return originalTask; // 元のタスクを返す
            }
            
            // 実際のレスポンスでタスクを更新 - Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              const finalTasks = get().tasks.map(task =>
                task.id === id ? updatedTask : task
              );
              
              set({
                tasks: finalTasks,
                isLoading: false,
                error: null
              }, false, 'updateTask:success');
            }
            
            logInfo('[Issue #028] Task updated successfully', { taskId: id });

            // ProjectStoreにタスク更新を通知
            get().notifyProjectStore(id, updatedTask, 'update').catch(error => 
              logError('Async ProjectStore notification failed', { taskId: id }, error)
            );
            
            // TagStoreにタスク更新を通知（タグ使用統計更新）
            get().notifyTagStore(id, updatedTask, 'update').catch(error => 
              logError('Async TagStore notification failed', { taskId: id }, error)
            );

            return updatedTask;
            
          } catch (error) {
            // Issue #028: エラー処理時の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] updateTask aborted during error handling');
              return get().getTaskById(id)!; // 元のタスクを返す
            }
            
            // Optimistic Update のロールバック - Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              const { tasks } = get();
              const originalTask = tasks.find(task => task.id === id);
              
              if (originalTask) {
                const rolledBackTasks = tasks.map(task =>
                  task.id === id ? originalTask : task
                );
                
                const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
                
                set({
                  tasks: rolledBackTasks,
                  isLoading: false,
                  error: errorMessage
                }, false, 'updateTask:error');
              }
            }
            
            logError('[Issue #028] Failed to update task', { taskId: id, taskInput }, error);
            throw error;
          } finally {
            // Issue #028: 必須クリーンアップ処理
            isOperationActive = false;
          }
        },

        // タスクステータス更新（楽観的UI更新とロールバック）
        updateTaskStatus: async (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
          const abortController = new AbortController();
          let isOperationActive = true;
          
          set({ isLoading: true, error: null }, false, 'updateTaskStatus:start');
          
          try {
            // 中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] updateTaskStatus aborted before processing');
              return get().getTaskById(id)!;
            }
            
            // 元のタスクを保存（ロールバック用）
            const { tasks } = get();
            const originalTask = tasks.find(task => task.id === id);
            
            if (!originalTask) {
              throw new Error(`Task with id ${id} not found`);
            }

            // 楽観的UI更新 - 即座にステータスを変更
            if (isOperationActive && !abortController.signal.aborted) {
              const optimisticUpdatedTasks = tasks.map(task =>
                task.id === id
                  ? {
                      ...task,
                      status,
                      updatedAt: new Date(),
                      updatedBy: 'current-user'
                    }
                  : task
              );
              
              set(
                { tasks: optimisticUpdatedTasks, isLoading: false },
                false,
                'updateTaskStatus:optimistic'
              );
            }

            // API コール
            logInfo('[Issue #028] updateTaskStatus API call starting', { taskId: id, status });
            
            abortController.signal.addEventListener('abort', () => {
              logInfo('[Issue #028] updateTaskStatus API call aborted by signal');
              isOperationActive = false;
            });
            
            const updatedTask = await taskAPI.updateTaskStatus(id, status);
            
            // API完了後の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] updateTaskStatus completed but operation was aborted');
              return originalTask;
            }
            
            // 応答は少なくとも id, status, updatedAt を含む前提でストア更新
            if (isOperationActive && !abortController.signal.aborted) {
              const finalTasks = get().tasks.map(task => {
                if (task.id === id) {
                  // APIレスポンスをマージ
                  const mergedTask = { ...task, ...updatedTask };
                  
                  // APIレスポンスのタグに空のnameが含まれる場合、既存のタグを保持
                  if (mergedTask.tags && task.tags && 
                      mergedTask.tags.some(tag => !tag.name || tag.name.trim() === '')) {
                    mergedTask.tags = task.tags; // 既存のタグを保持
                    console.log('[taskStore] Preserved existing tags during status update to prevent #Unknown Tag');
                  }
                  
                  return mergedTask;
                }
                return task;
              });
              
              set(
                { tasks: finalTasks, isLoading: false, error: null },
                false,
                'updateTaskStatus:success'
              );
            }
            
            logInfo('[Issue #028] Task status updated successfully', { taskId: id, status });
            return updatedTask;
            
          } catch (error) {
            // エラー処理時の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] updateTaskStatus aborted during error handling');
              return get().getTaskById(id)!;
            }
            
            // ロールバック - 元の状態に戻す
            if (isOperationActive && !abortController.signal.aborted) {
              const { tasks } = get();
              const originalTask = tasks.find(task => task.id === id);
              
              if (originalTask) {
                // 元のタスクの状態に戻す
                const rolledBackTasks = tasks.map(task =>
                  task.id === id ? originalTask : task
                );
                
                set({
                  tasks: rolledBackTasks,
                  isLoading: false,
                  error: error instanceof Error ? error.message : 'Failed to update task status'
                }, false, 'updateTaskStatus:rollback');
                
                // エラートーストとリトライオプション
                toast.error('タスクステータスの更新に失敗しました', {
                  duration: 5000,
                  action: {
                    label: '再試行',
                    onClick: () => get().updateTaskStatus(id, status)
                  }
                });
              }
            }
            
            logError('[Issue #028] Failed to update task status', { taskId: id, status }, error);
            throw error;
          } finally {
            isOperationActive = false;
          }
        },

        deleteTask: async (id) => {
          const abortController = new AbortController();
          let isOperationActive = true;
          
          set({ isLoading: true, error: null }, false, 'deleteTask:start');
          
          try {
            // Issue #028: 中断確認 - 処理実行前チェック
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] deleteTask aborted before processing');
              return; // 何もしないで終了
            }
            
            // 削除対象タスクを保存（ロールバック用）
            const { tasks } = get();
            const taskToDelete = tasks.find(task => task.id === id);
            
            if (!taskToDelete) {
              throw new Error(`Task with id ${id} not found`);
            }

            // Optimistic Update - Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              const optimisticTasks = tasks.filter(task => task.id !== id);
              
              set(
                {
                  tasks: optimisticTasks,
                  selectedTaskId: get().selectedTaskId === id ? null : get().selectedTaskId
                },
                false,
                'deleteTask:optimistic'
              );
            }

            // API コール - Issue #028: 中断可能な非同期処理
            logInfo('[Issue #028] deleteTask API call starting with abort signal', { taskId: id });
            
            // 中断監視
            abortController.signal.addEventListener('abort', () => {
              logInfo('[Issue #028] deleteTask API call aborted by signal');
              isOperationActive = false;
            });
            
            await taskAPI.deleteTask(id);
            
            // Issue #028: API完了後の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] deleteTask completed but operation was aborted');
              return;
            }
            
            // Issue #028: 成功時の状態更新（中断確認付き）
            if (isOperationActive && !abortController.signal.aborted) {
              set({
                isLoading: false,
                error: null
              }, false, 'deleteTask:success');
            }
            
            logInfo('[Issue #028] Task deleted successfully', { taskId: id });

            // ProjectStoreにタスク削除を通知（削除前のタスク情報を送信）
            // taskToDeleteはすでに459行目で取得済み
            if (taskToDelete) {
              get().notifyProjectStore(id, taskToDelete, 'delete').catch(error => 
                logError('Async ProjectStore notification failed', { taskId: id }, error)
              );
              // TagStoreにタスク削除を通知（タグ使用統計更新）
              get().notifyTagStore(id, taskToDelete, 'delete').catch(error => 
                logError('Async TagStore notification failed', { taskId: id }, error)
              );
            }
            
          } catch (error) {
            // Issue #028: エラー処理時の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] deleteTask aborted during error handling');
              return;
            }
            
            // Optimistic Update のロールバック - Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              const { tasks } = get();
              const taskToDelete = tasks.find(task => task.id === id);
              
              if (!taskToDelete) {
                // 削除したタスクを復元
                set({
                  tasks: [...get().tasks, taskToDelete],
                  isLoading: false,
                  error: error instanceof Error ? error.message : 'Failed to delete task'
                }, false, 'deleteTask:error');
              } else {
                set({
                  isLoading: false,
                  error: error instanceof Error ? error.message : 'Failed to delete task'
                }, false, 'deleteTask:error');
              }
            }
            
            logError('[Issue #028] Failed to delete task', { taskId: id }, error);
            throw error;
          } finally {
            // Issue #028: 必須クリーンアップ処理
            isOperationActive = false;
          }
        },

        loadTasks: async () => {
          const abortController = new AbortController();
          let isOperationActive = true;
          
          set({ isLoading: true, error: null }, false, 'loadTasks:start');
          
          try {
            // Issue #028: 中断確認 - 処理実行前チェック
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] loadTasks aborted before processing');
              return;
            }
            
            // API コール - Issue #028: 中断可能な非同期処理
            logInfo('[Issue #028] loadTasks API call starting with abort signal');
            
            // 中断監視
            abortController.signal.addEventListener('abort', () => {
              logInfo('[Issue #028] loadTasks API call aborted by signal');
              isOperationActive = false;
            });
            
            const rawTasks = await taskAPI.fetchTasks();
            
            // Issue #028: API完了後の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] loadTasks completed but operation was aborted');
              return;
            }
            
            // APIレスポンスのタグ構造に合わせて変換
            // API構造: task.tags = [{ tag: { id, name, color, ... } }, ...]
            const tasks = rawTasks.map(task => {
              if (!task.tags || task.tags.length === 0) {
                return { ...task, tags: [] };
              }
              
              // タグリレーションオブジェクトからタグオブジェクトを抽出
              const resolvedTags = task.tags.map((tagRelation: any) => {
                // APIレスポンスでは { tag: { id, name, color, ... } } 形式
                if (tagRelation?.tag && typeof tagRelation.tag === 'object') {
                  return tagRelation.tag;
                }
                
                // 既にタグオブジェクトの場合（フォールバック）
                if (typeof tagRelation === 'object' && tagRelation.name) {
                  return tagRelation;
                }
                
                return null;
              }).filter(Boolean);
              
              return { ...task, tags: resolvedTags };
            });
            
            // Issue #028: 成功時の状態更新（中断確認付き）
            if (isOperationActive && !abortController.signal.aborted) {
              set({
                tasks,
                isLoading: false,
                error: null,
                isInitialized: true
              }, false, 'loadTasks:success');
            }
            
            logInfo('[Issue #028] Tasks loaded successfully', { count: tasks.length });
            
          } catch (error) {
            // Issue #028: エラー処理時の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] loadTasks aborted during error handling');
              return;
            }
            
            // Issue #028: エラー時の状態更新（中断確認付き）
            if (isOperationActive && !abortController.signal.aborted) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to load tasks';
              
              set({
                tasks: [],
                isLoading: false,
                error: errorMessage,
                isInitialized: false
              }, false, 'loadTasks:error');
              
              // ユーザー操作の再試行のみ（自動リトライなし）
              toast.error('タスクの読み込みに失敗しました', {
                duration: 5000,
                action: {
                  label: '再試行',
                  onClick: () => get().loadTasks()
                }
              });
            }
            
            logError('[Issue #028] Failed to load tasks', {}, error);
            throw error;
          } finally {
            // Issue #028: 必須クリーンアップ処理
            isOperationActive = false;
          }
        },

        selectTask: (id) => {
          set({ selectedTaskId: id }, false, 'selectTask');
        },

        // フィルター・ソート関連
        setFilter: (newFilter) => {
          const { filter } = get();
          set(
            { filter: { ...filter, ...newFilter } },
            false,
            'setFilter'
          );
        },

        clearFilter: () => {
          set({ filter: defaultFilter }, false, 'clearFilter');
        },

        setSort: (sort) => {
          set({ sort }, false, 'setSort');
        },

        // ユーティリティ関数
        getFilteredTasks: () => {
          const { tasks, filter, sort } = get();
          
          let filteredTasks = tasks.filter(task => {
            // ステータスフィルター
            if (filter.status && filter.status.length > 0) {
              if (!filter.status.includes(task.status)) return false;
            }
            
            // 優先度フィルター
            if (filter.priority && filter.priority.length > 0) {
              if (!filter.priority.includes(task.priority)) return false;
            }
            
            // プロジェクトフィルター
            if (filter.projectId) {
              if (task.projectId !== filter.projectId) return false;
            }
            
            // 担当者フィルター
            if (filter.assigneeId) {
              if (task.assigneeId !== filter.assigneeId) return false;
            }
            
            // タグフィルター
            if (filter.tags && filter.tags.length > 0) {
              const taskTagIds = task.tags.map(tag => tag.id);
              if (!filter.tags.some(tagId => taskTagIds.includes(tagId))) return false;
            }
            
            // 期日フィルター
            if (filter.dueDateFrom && task.dueDate) {
              if (task.dueDate < filter.dueDateFrom) return false;
            }
            if (filter.dueDateTo && task.dueDate) {
              if (task.dueDate > filter.dueDateTo) return false;
            }
            
            // 検索フィルター
            if (filter.search) {
              const searchLower = filter.search.toLowerCase();
              const titleMatch = task.title.toLowerCase().includes(searchLower);
              const descriptionMatch = task.description?.toLowerCase().includes(searchLower);
              if (!titleMatch && !descriptionMatch) return false;
            }
            
            return true;
          });
          
          // ソート処理
          filteredTasks.sort((a, b) => {
            const { field, order } = sort;
            let aValue: any;
            let bValue: any;
            
            switch (field) {
              case 'title':
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
              case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
              case 'priority':
                const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4, critical: 5 };
                aValue = priorityOrder[a.priority];
                bValue = priorityOrder[b.priority];
                break;
              case 'dueDate':
                aValue = a.dueDate ? a.dueDate.getTime() : 0;
                bValue = b.dueDate ? b.dueDate.getTime() : 0;
                break;
              case 'createdAt':
                aValue = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                bValue = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                break;
              case 'updatedAt':
                aValue = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
                bValue = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
                break;
              default:
                aValue = 0;
                bValue = 0;
            }
            
            if (order === 'asc') {
              return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
              return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
          });
          
          return filteredTasks;
        },

        getTaskById: (id) => {
          return get().tasks.find(task => task.id === id);
        },

        getTasksByProject: (projectId) => {
          return get().tasks.filter(task => task.projectId === projectId);
        },

        getTasksByAssignee: (assigneeId) => {
          return get().tasks.filter(task => task.assigneeId === assigneeId);
        },

        // プロジェクト・タグ連携機能の実装
        getTasksWithCategories: () => {
          const { tasks } = get();
          const projectStore = useProjectStore.getState();
          const tagStore = useTagStore.getState();
          
          return tasks.map(task => {
            const project = task.projectId ? projectStore.getProjectById(task.projectId) : undefined;
            const tags = task.tags || [];
            
            return {
              ...task,
              project,
              tags
            } as TaskWithCategories;
          });
        },

        getFilteredTasksWithCategories: () => {
          const filteredTasks = get().getFilteredTasks();
          const projectStore = useProjectStore.getState();
          
          return filteredTasks.map(task => {
            const project = task.projectId ? projectStore.getProjectById(task.projectId) : undefined;
            const tags = task.tags || [];
            
            return {
              ...task,
              project,
              tags
            } as TaskWithCategories;
          });
        },

        getTaskWithCategoriesById: (id) => {
          const task = get().getTaskById(id);
          if (!task) return undefined;
          
          const projectStore = useProjectStore.getState();
          const project = task.projectId ? projectStore.getProjectById(task.projectId) : undefined;
          const tags = task.tags || [];
          
          return {
            ...task,
            project,
            tags
          } as TaskWithCategories;
        },

        getTasksByTag: (tagId) => {
          return get().tasks.filter(task => 
            task.tags && task.tags.some(tag => tag.id === tagId)
          );
        },

        addTaskWithCategories: async (taskInput) => {
          // tagIdsをTag[]に変換
          const tagStore = useTagStore.getState();
          const tags = taskInput.tagIds ? 
            taskInput.tagIds.map(tagId => tagStore.tags.find(tag => tag.id === tagId)).filter(Boolean) as Tag[] : 
            [];

          const createInput: CreateTaskInput = {
            title: taskInput.title,
            description: taskInput.description,
            priority: taskInput.priority,
            projectId: taskInput.projectId,
            assigneeId: taskInput.assigneeId,
            tags: tags,
            dueDate: taskInput.dueDate,
            estimatedHours: taskInput.estimatedHours
          };

          return get().addTask(createInput);
        },

        updateTaskWithCategories: async (id, taskInput) => {
          // tagIdsをTag[]に変換
          const tagStore = useTagStore.getState();
          const tags = taskInput.tagIds ? 
            taskInput.tagIds.map(tagId => tagStore.tags.find(tag => tag.id === tagId)).filter(Boolean) as Tag[] : 
            undefined;

          const updateInput: UpdateTaskInput = {
            title: taskInput.title,
            description: taskInput.description,
            status: taskInput.status,
            priority: taskInput.priority,
            projectId: taskInput.projectId,
            assigneeId: taskInput.assigneeId,
            tags: tags,
            dueDate: taskInput.dueDate,
            estimatedHours: taskInput.estimatedHours,
            actualHours: taskInput.actualHours
          };

          return get().updateTask(id, updateInput);
        },

        // アーカイブ関連メソッド（新規追加）
        getArchivedTasks: () => {
          const { tasks } = get();
          return tasks.filter(task => task.status === 'archived');
        },

        getNonArchivedTasks: () => {
          const { tasks } = get();
          return tasks.filter(task => task.status !== 'archived');
        },

        getFilteredTasksWithArchived: (includeArchived: boolean) => {
          const { tasks, filter, sort } = get();
          
          let filteredTasks = tasks.filter(task => {
            // アーカイブフィルター（新機能）
            if (!includeArchived && task.status === 'archived') {
              return false;
            }
            
            // 既存のフィルター処理
            // ステータスフィルター
            if (filter.status && filter.status.length > 0) {
              if (!filter.status.includes(task.status)) return false;
            }
            
            // 優先度フィルター
            if (filter.priority && filter.priority.length > 0) {
              if (!filter.priority.includes(task.priority)) return false;
            }
            
            // プロジェクトフィルター
            if (filter.projectId) {
              if (task.projectId !== filter.projectId) return false;
            }
            
            // 担当者フィルター
            if (filter.assigneeId) {
              if (task.assigneeId !== filter.assigneeId) return false;
            }
            
            // タグフィルター
            if (filter.tags && filter.tags.length > 0) {
              const taskTagIds = task.tags.map(tag => tag.id);
              if (!filter.tags.some(tagId => taskTagIds.includes(tagId))) return false;
            }
            
            // 期日フィルター
            if (filter.dueDateFrom && task.dueDate) {
              if (task.dueDate < filter.dueDateFrom) return false;
            }
            if (filter.dueDateTo && task.dueDate) {
              if (task.dueDate > filter.dueDateTo) return false;
            }
            
            // 検索フィルター
            if (filter.search) {
              const searchLower = filter.search.toLowerCase();
              const titleMatch = task.title.toLowerCase().includes(searchLower);
              const descriptionMatch = task.description?.toLowerCase().includes(searchLower);
              if (!titleMatch && !descriptionMatch) return false;
            }
            
            return true;
          });
          
          // ソート処理（既存のロジックを再利用）
          filteredTasks.sort((a, b) => {
            const { field, order } = sort;
            let aValue: any;
            let bValue: any;
            
            switch (field) {
              case 'title':
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
              case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
              case 'priority':
                const priorityOrder = { low: 1, medium: 2, high: 3, urgent: 4, critical: 5 };
                aValue = priorityOrder[a.priority];
                bValue = priorityOrder[b.priority];
                break;
              case 'dueDate':
                aValue = a.dueDate ? a.dueDate.getTime() : 0;
                bValue = b.dueDate ? b.dueDate.getTime() : 0;
                break;
              case 'createdAt':
                aValue = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
                bValue = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
                break;
              case 'updatedAt':
                aValue = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
                bValue = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
                break;
              default:
                aValue = 0;
                bValue = 0;
            }
            
            if (order === 'asc') {
              return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
              return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
          });
          
          return filteredTasks;
        },

        // 一括操作（API統合版）
        bulkUpdateTasks: async (ids, updates) => {
          set({ isLoading: true, error: null }, false, 'bulkUpdateTasks:start');
          
          try {
            // 元のタスクを保存（ロールバック用）
            const { tasks } = get();
            const originalTasks = tasks.filter(task => ids.includes(task.id));
            
            // Optimistic Update
            const optimisticTasks = tasks.map(task =>
              ids.includes(task.id)
                ? {
                    ...task,
                    ...updates,
                    updatedAt: new Date(),
                    updatedBy: 'current-user'
                  }
                : task
            );
            
            set({ tasks: optimisticTasks }, false, 'bulkUpdateTasks:optimistic');

            // 各タスクを並行で更新
            const updatePromises = ids.map(id => taskAPI.updateTask(id, updates));
            const updatedTasks = await Promise.all(updatePromises);
            
            // 実際のレスポンスでタスクを更新
            const finalTasks = get().tasks.map(task => {
              const updated = updatedTasks.find(ut => ut.id === task.id);
              return updated || task;
            });
            
            set({
              tasks: finalTasks,
              isLoading: false,
              error: null
            }, false, 'bulkUpdateTasks:success');
            
            logInfo('Bulk task update successful', { taskIds: ids });
            
          } catch (error) {
            // Optimistic Update のロールバック
            const { tasks } = get();
            const originalTasks = tasks.filter(task => ids.includes(task.id));
            
            const rolledBackTasks = tasks.map(task => {
              const original = originalTasks.find(ot => ot.id === task.id);
              return original || task;
            });
            
            const errorMessage = error instanceof Error ? error.message : 'Failed to update tasks';
            
            set({
              tasks: rolledBackTasks,
              isLoading: false,
              error: errorMessage
            }, false, 'bulkUpdateTasks:error');
            
            logError('Failed to bulk update tasks', { taskIds: ids }, error);
            throw error;
          }
        },

        bulkDeleteTasks: async (ids) => {
          set({ isLoading: true, error: null }, false, 'bulkDeleteTasks:start');
          
          try {
            // 削除対象タスクを保存（ロールバック用）
            const { tasks } = get();
            const tasksToDelete = tasks.filter(task => ids.includes(task.id));
            
            // Optimistic Update
            const optimisticTasks = tasks.filter(task => !ids.includes(task.id));
            
            set(
              {
                tasks: optimisticTasks,
                selectedTaskId: ids.includes(get().selectedTaskId || '') ? null : get().selectedTaskId
              },
              false,
              'bulkDeleteTasks:optimistic'
            );

            // 各タスクを並行で削除
            const deletePromises = ids.map(id => taskAPI.deleteTask(id));
            await Promise.all(deletePromises);
            
            set({
              isLoading: false,
              error: null
            }, false, 'bulkDeleteTasks:success');
            
            logInfo('Bulk task deletion successful', { taskIds: ids });
            
          } catch (error) {
            // Optimistic Update のロールバック
            const { tasks } = get();
            const tasksToDelete = tasks.filter(task => ids.includes(task.id));
            
            if (tasksToDelete.length > 0) {
              const restoredTasks = [...get().tasks, ...tasksToDelete];
              
              set({
                tasks: restoredTasks,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to delete tasks'
              }, false, 'bulkDeleteTasks:error');
            } else {
              set({
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to delete tasks'
              }, false, 'bulkDeleteTasks:error');
            }
            
            logError('Failed to bulk delete tasks', { taskIds: ids }, error);
            throw error;
          }
        },

        // 状態管理
        setLoading: (isLoading) => {
          set({ isLoading }, false, 'setLoading');
        },

        setError: (error) => {
          set({ error }, false, 'setError');
        },

        clearError: () => {
          set({ error: null }, false, 'clearError');
        },

        // データ初期化（API版）
        initializeStore: async () => {
          try {
            await get().loadTasks();
            logInfo('Task store initialized successfully');
          } catch (error) {
            logError('Failed to initialize task store', {}, error);
            throw error;
          }
        },

        syncWithServer: async () => {
          try {
            await get().loadTasks();
            logInfo('Task store synced with server');
          } catch (error) {
            logError('Failed to sync with server', {}, error);
            throw error;
          }
        },

        resetStore: () => {
          set({
            tasks: [],
            selectedTaskId: null,
            filter: defaultFilter,
            sort: defaultSort,
            isLoading: false,
            error: null,
            isInitialized: false,
            lastUpdated: undefined // Issue #038: リセット時のlastUpdated初期化
          }, false, 'resetStore');
        },

        // ==============================
        // データ同期機能（ProjectStore連携）
        // ==============================

        // ProjectStoreへの通知機能（ES Module対応版）
        notifyProjectStore: async (taskId: string, task: Task | null, operation: 'create' | 'update' | 'delete') => {
          try {
            // 循環参照回避のためES Module動的import
            const { useProjectStore } = await import('./projectStore');
            const projectStore = useProjectStore?.getState?.();
            
            // ProjectStoreやgetStateメソッドが存在するかチェック
            if (!projectStore) {
              console.warn('ProjectStore not available - skipping notification', { 
                taskId, 
                operation,
                reason: 'store_not_available'
              });
              return;
            }
            
            // handleTaskStoreUpdateメソッドが存在するかチェック
            if (typeof projectStore.handleTaskStoreUpdate !== 'function') {
              console.warn('ProjectStore.handleTaskStoreUpdate method not available - skipping notification', { 
                taskId, 
                operation,
                reason: 'method_not_available',
                availableMethods: Object.keys(projectStore).filter(key => typeof projectStore[key] === 'function')
              });
              return;
            }
            
            // ProjectStoreにTaskStoreの変更を通知
            projectStore.handleTaskStoreUpdate(taskId, task, operation);

            logInfo('Successfully notified project store of task change', {
              taskId,
              operation,
              projectId: task?.projectId,
              hasProjectId: !!task?.projectId
            });
          } catch (error) {
            // エラー詳細を記録するが、タスク操作は継続
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            console.warn('Failed to notify project store, but task operation will continue', { 
              taskId, 
              operation,
              projectId: task?.projectId,
              error: errorMessage,
              errorType: error instanceof Error ? error.constructor.name : typeof error,
              timestamp: new Date().toISOString()
            });
            
            // デバッグ情報として詳細ログ
            if (process.env.NODE_ENV === 'development') {
              console.debug('ProjectStore notification error details:', {
                error: errorMessage,
                stack: errorStack,
                taskData: task,
                operation
              });
            }
            
            // 従来のlogError呼び出しも保持
            logError('Failed to notify project store', { taskId, operation }, error);
            
            // エラーが発生してもタスク処理は継続
            // この通知はベストエフォートであり、失敗してもタスク作成・更新・削除の主要機能に影響しない
          }
        },

        // ProjectStoreからのプロジェクト更新通知を処理
        handleProjectUpdate: async (projectId: string, updatedProject: any) => {
          try {
            const { tasks } = get();
            const relatedTasks = tasks.filter(task => task.projectId === projectId);
            
            if (relatedTasks.length === 0) {
              logInfo('No related tasks found for project update', { projectId });
              return;
            }

            let updatesNeeded = false;
            const updatedTasks = tasks.map(task => {
              if (task.projectId !== projectId) {
                return task;
              }

              // プロジェクトがアーカイブされた場合の処理
              if (updatedProject.isArchived && task.status !== 'archived') {
                updatesNeeded = true;
                return {
                  ...task,
                  status: 'archived' as const,
                  updatedAt: new Date(),
                  updatedBy: 'system-project-sync'
                };
              }

              return task;
            });

            // 必要な更新があれば状態を更新
            if (updatesNeeded) {
              set({
                tasks: updatedTasks,
                lastUpdated: Date.now()
              }, false, 'handleProjectUpdate:sync');

              logInfo('Tasks updated due to project changes', {
                projectId,
                relatedTaskCount: relatedTasks.length,
                updatedTaskCount: updatedTasks.filter((task, index) => 
                  task !== tasks[index]
                ).length
              });
            }
          } catch (error) {
            logError('Failed to handle project update', { projectId }, error);
          }
        },
        
        // ==============================
        // TagStore連携機能
        // ==============================
        
        // TagStoreへの通知機能（タグ使用統計更新用）
        notifyTagStore: async (taskId: string, task: Task | null, operation: 'create' | 'update' | 'delete') => {
          try {
            // 循環参照回避のためES Module動的import
            const { useTagStore } = await import('./tagStore');
            const tagStore = useTagStore?.getState?.();
            
            // TagStoreやgetStateメソッドが存在するかチェック
            if (!tagStore) {
              console.warn('TagStore not available - skipping notification', { 
                taskId, 
                operation,
                reason: 'store_not_available'
              });
              return;
            }
            
            // handleTaskStoreUpdateメソッドが存在するかチェック
            if (typeof tagStore.handleTaskStoreUpdate !== 'function') {
              console.warn('TagStore.handleTaskStoreUpdate method not available - skipping notification', { 
                taskId, 
                operation,
                reason: 'method_not_available',
                availableMethods: Object.keys(tagStore).filter(key => typeof tagStore[key] === 'function')
              });
              return;
            }
            
            // TagStoreにTaskStoreの変更を通知
            tagStore.handleTaskStoreUpdate(taskId, task, operation);

            logInfo('Successfully notified tag store of task change', {
              taskId,
              operation,
              tagCount: task?.tags?.length || 0,
              hasTagData: !!(task?.tags && task.tags.length > 0)
            });
          } catch (error) {
            // エラー詳細を記録するが、タスク操作は継続
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            
            console.warn('Failed to notify tag store, but task operation will continue', { 
              taskId, 
              operation,
              tagCount: task?.tags?.length || 0,
              error: errorMessage,
              errorType: error instanceof Error ? error.constructor.name : typeof error,
              timestamp: new Date().toISOString()
            });
            
            // デバッグ情報として詳細ログ
            if (process.env.NODE_ENV === 'development') {
              console.debug('TagStore notification error details:', {
                error: errorMessage,
                stack: errorStack,
                taskData: task,
                operation
              });
            }
            
            // 従来のlogError呼び出しも保持
            logError('Failed to notify tag store', { taskId, operation }, error);
            
            // エラーが発生してもタスク処理は継続
            // この通知はベストエフォートであり、失敗してもタスク作成・更新・削除の主要機能に影響しない
          }
        },
        
        // TagStoreからのタグ更新通知を処理
        handleTagUpdate: async (tagId: string, updatedTag: Tag) => {
          try {
            const { tasks } = get();
            let updatesNeeded = false;
            
            // 該当するタグを含むタスクを更新
            const updatedTasks = tasks.map(task => {
              const hasTag = task.tags.some(tag => tag.id === tagId);
              if (hasTag) {
                updatesNeeded = true;
                return {
                  ...task,
                  tags: task.tags.map(tag => 
                    tag.id === tagId ? updatedTag : tag
                  ),
                  updatedAt: new Date(),
                  updatedBy: 'system-tag-sync'
                };
              }
              return task;
            });
            
            // 必要な更新があれば状態を更新
            if (updatesNeeded) {
              set({
                tasks: updatedTasks,
                lastUpdated: Date.now()
              }, false, 'handleTagUpdate:sync');
              
              logInfo('Tasks updated due to tag changes', {
                tagId,
                tagName: updatedTag.name,
                affectedTasks: updatedTasks.filter((task, index) => 
                  task !== tasks[index]
                ).length
              });
            }
          } catch (error) {
            logError('Failed to handle tag update', { tagId }, error);
          }
        },
        
        // TagStoreからのタグ削除通知を処理
        handleTagDeletion: async (tagId: string) => {
          try {
            const { tasks } = get();
            let updatesNeeded = false;
            
            // 該当するタグを含むタスクからタグを削除
            const updatedTasks = tasks.map(task => {
              const hasTag = task.tags.some(tag => tag.id === tagId);
              if (hasTag) {
                updatesNeeded = true;
                return {
                  ...task,
                  tags: task.tags.filter(tag => tag.id !== tagId),
                  updatedAt: new Date(),
                  updatedBy: 'system-tag-sync'
                };
              }
              return task;
            });
            
            // 必要な更新があれば状態を更新
            if (updatesNeeded) {
              set({
                tasks: updatedTasks,
                lastUpdated: Date.now()
              }, false, 'handleTagDeletion:sync');
              
              logInfo('Tasks updated due to tag deletion', {
                tagId,
                affectedTasks: updatedTasks.filter((task, index) => 
                  task !== tasks[index]
                ).length
              });
            }
          } catch (error) {
            logError('Failed to handle tag deletion', { tagId }, error);
          }
        },

        // スケジュール関連メソッド
        getUnscheduledTasks: () => {
          const { tasks } = get();
          return tasks
            .filter(task => !task.scheduleInfo?.scheduleItemId)
            .map(task => ({
              id: task.id,
              title: task.title,
              description: task.description,
              type: 'task' as const,
              priority: task.priority,
              estimatedTime: task.estimatedHours ? task.estimatedHours * 60 : 60, // デフォルト1時間
              tags: task.tags.map(tag => tag.id),
              projectId: task.projectId,
              dueDate: task.dueDate
            }));
        },

        getUnscheduledSubtasks: (parentId: string) => {
          const { tasks } = get();
          const parentTask = tasks.find(task => task.id === parentId);
          if (!parentTask) return [];
          
          return parentTask.subtasks
            .filter(subtask => !subtask.completed)
            .map(subtask => ({
              id: subtask.id,
              title: subtask.title,
              description: undefined,
              type: 'subtask' as const,
              parentTaskId: parentId,
              priority: parentTask.priority,
              estimatedTime: 30, // サブタスクはデフォルト30分
              tags: parentTask.tags.map(tag => tag.id),
              projectId: parentTask.projectId
            }));
        },

        updateTaskSchedule: (taskId: string, scheduleInfo: TaskScheduleInfo) => {
          const { tasks } = get();
          const updatedTasks = tasks.map(task =>
            task.id === taskId
              ? {
                  ...task,
                  scheduleInfo,
                  updatedAt: new Date(),
                  updatedBy: 'current-user'
                }
              : task
          );
          
          set({ tasks: updatedTasks }, false, 'updateTaskSchedule');
        },

        clearTaskSchedule: (taskId: string) => {
          const { tasks } = get();
          const updatedTasks = tasks.map(task =>
            task.id === taskId
              ? {
                  ...task,
                  scheduleInfo: undefined,
                  updatedAt: new Date(),
                  updatedBy: 'current-user'
                }
              : task
          );
          
          set({ tasks: updatedTasks }, false, 'clearTaskSchedule');
        },

        // Issue #061: 状態同期強化用メソッド実装
        getLastUpdated: () => {
          return get().lastUpdated;
        },

      }),
    {
      name: 'task-store',
      // API統合版では、devtools でのデバッグのみでローカルストレージは除去
      enabled: process.env.NODE_ENV === 'development',
      trace: true
    }
  )
);

// カスタムフック：フィルタリングされたタスクを取得
export const useFilteredTasks = () => {
  return useTaskStore(state => state.getFilteredTasks());
};

// カスタムフック：選択されたタスクを取得
export const useSelectedTask = () => {
  return useTaskStore(state => 
    state.selectedTaskId ? state.getTaskById(state.selectedTaskId) : null
  );
};

// カスタムフック：タスク統計を取得
export const useTaskStats = () => {
  return useTaskStore(state => {
    const tasks = state.tasks;
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'done').length;
    const inProgress = tasks.filter(task => task.status === 'in_progress').length;
    const todo = tasks.filter(task => task.status === 'TODO').length;
    
    return {
      total,
      completed,
      inProgress,
      todo,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });
};

// カスタムフック：TaskWithCategoriesを取得
export const useTasksWithCategories = () => {
  return useTaskStore(state => state.getTasksWithCategories());
};

// カスタムフック：フィルタリングされたTaskWithCategoriesを取得
export const useFilteredTasksWithCategories = () => {
  return useTaskStore(state => state.getFilteredTasksWithCategories());
};

// カスタムフック：特定のTaskWithCategoriesを取得
export const useTaskWithCategoriesById = (id: string) => {
  return useTaskStore(state => 
    id ? state.getTaskWithCategoriesById(id) : null
  );
};

// カスタムフック：プロジェクト・タグ関連の操作を取得
export const useTaskCategoryOperations = () => {
  return useTaskStore(state => ({
    addTaskWithCategories: state.addTaskWithCategories,
    updateTaskWithCategories: state.updateTaskWithCategories,
    getTasksByProject: state.getTasksByProject,
    getTasksByTag: state.getTasksByTag
  }));
};

// カスタムフック：Analytics画面用の統計情報を取得
export const useAnalyticsStats = (includeArchived: boolean = false) => {
  return useTaskStore(state => {
    const allTasks = state.tasks;
    
    // アーカイブの扱いによってタスクをフィルタリング
    const tasks = includeArchived ? allTasks : allTasks.filter(task => task.status !== 'archived');
    const archivedTasks = allTasks.filter(task => task.status === 'archived');
    
    // 基本統計
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'done').length;
    const inProgress = tasks.filter(task => task.status === 'in_progress').length;
    const todo = tasks.filter(task => task.status === 'TODO').length;
    const archived = archivedTasks.length;
    
    // 優先度別統計
    const priorityStats = {
      critical: tasks.filter(task => task.priority === 'CRITICAL').length,
      urgent: tasks.filter(task => task.priority === 'URGENT').length,
      high: tasks.filter(task => task.priority === 'HIGH').length,
      medium: tasks.filter(task => task.priority === 'MEDIUM').length,
      low: tasks.filter(task => task.priority === 'LOW').length
    };
    
    // 期限関連統計
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const overdueTasks = tasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
    ).length;
    
    const dueSoonTasks = tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) >= now && 
      new Date(task.dueDate) <= sevenDaysFromNow &&
      task.status !== 'done'
    ).length;
    
    // 時間統計
    const timeStats = tasks.reduce((acc, task) => {
      return {
        totalEstimated: acc.totalEstimated + (task.estimatedHours || 0),
        totalActual: acc.totalActual + (task.actualHours || 0)
      };
    }, { totalEstimated: 0, totalActual: 0 });
    
    // 効率性計算
    const efficiency = timeStats.totalActual > 0 
      ? Math.round((timeStats.totalEstimated / timeStats.totalActual) * 100)
      : 100;
    
    // 完了率
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      inProgress,
      todo,
      archived,
      completionRate,
      priorityStats,
      overdueTasks,
      dueSoonTasks,
      timeStats,
      efficiency,
      // ArchivedTasksSection用のデータ
      archivedTasksData: archivedTasks
    };
  });
};

// 開発環境でのデバッグ用: TaskStoreをwindowオブジェクトに設定
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).useTaskStore = useTaskStore;
  console.log('[TaskStore] Debug: Store exposed to window.useTaskStore');
}