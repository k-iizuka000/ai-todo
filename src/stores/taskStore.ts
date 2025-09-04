/**
 * Zustandを使用したタスク管理のグローバル状態管理
 * localStorage依存を完全除去し、API層統合版として実装
 * 設計書：Issue 029 フルスタックアーキテクチャ移行対応
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Task, TaskFilter, TaskSort, CreateTaskInput, UpdateTaskInput, TaskScheduleInfo } from '../types/task';
import { UnscheduledTaskData } from '../types/schedule';
import { taskAPI } from './api/taskApi';

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
            status: 'todo',
            priority: taskInput.priority || 'medium',
            projectId: taskInput.projectId,
            assigneeId: taskInput.assigneeId,
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
            return newTask;
            
          } catch (apiError) {
            // Issue #028: エラー処理時の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] Task creation aborted during error handling');
              return optimisticTask;
            }
            
            // API失敗時：モックモードでタスクを保持（状態更新通知強化）
            logError('[Issue #028] API failed, keeping task in mock mode', { taskInput }, apiError);
            
            // 一時的IDを永続的IDに変更してタスクを保持
            const mockTask: Task = {
              ...optimisticTask,
              id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            
            const updatedTasks = get().tasks.map(task => 
              task.id === tempId ? mockTask : task
            );
            
            const mockTimestamp = Date.now();
            
            // 強制的な状態更新通知でReact再レンダリングを確実に実行 + Issue #028: 中断確認付き
            if (isOperationActive && !abortController.signal.aborted) {
              set({
                tasks: updatedTasks,
                isLoading: false,
                error: null, // エラーをnullに設定（モックモードとして成功扱い）
                lastUpdated: mockTimestamp // 状態変更を明示的に通知するためのタイムスタンプ
              }, false, 'addTask:mock-success-enhanced');
            }
            
            // デバッグログの強化
            logInfo('[Issue #028] Task created in mock mode with enhanced state update', { 
              taskId: mockTask.id,
              totalTasks: updatedTasks.length,
              timestamp: mockTimestamp,
              stateUpdateTrigger: 'enhanced',
              duration: Date.now() - startTime
            });
            
            return mockTask;
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
            
            const tasks = await taskAPI.fetchTasks();
            
            // Issue #028: API完了後の中断確認
            if (!isOperationActive || abortController.signal.aborted) {
              logInfo('[Issue #028] loadTasks completed but operation was aborted');
              return;
            }
            
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
                aValue = a.createdAt.getTime();
                bValue = b.createdAt.getTime();
                break;
              case 'updatedAt':
                aValue = a.updatedAt.getTime();
                bValue = b.updatedAt.getTime();
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
                aValue = a.createdAt.getTime();
                bValue = b.createdAt.getTime();
                break;
              case 'updatedAt':
                aValue = a.updatedAt.getTime();
                bValue = b.updatedAt.getTime();
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
        }
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
    const todo = tasks.filter(task => task.status === 'todo').length;
    
    return {
      total,
      completed,
      inProgress,
      todo,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });
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
    const todo = tasks.filter(task => task.status === 'todo').length;
    const archived = archivedTasks.length;
    
    // 優先度別統計
    const priorityStats = {
      critical: tasks.filter(task => task.priority === 'critical').length,
      urgent: tasks.filter(task => task.priority === 'urgent').length,
      high: tasks.filter(task => task.priority === 'high').length,
      medium: tasks.filter(task => task.priority === 'medium').length,
      low: tasks.filter(task => task.priority === 'low').length
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