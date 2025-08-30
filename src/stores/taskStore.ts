/**
 * Zustandを使用したタスク管理のグローバル状態管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Task, TaskFilter, TaskSort, CreateTaskInput, UpdateTaskInput, TaskScheduleInfo } from '../types/task';
import { UnscheduledTaskData } from '../types/schedule';
import { mockTasks } from '../mock/tasks';

// タスクストアの状態型定義
interface TaskState {
  // 状態
  tasks: Task[];
  selectedTaskId: string | null;
  filter: TaskFilter;
  sort: TaskSort;
  isLoading: boolean;
  error: string | null;
  
  // アクション
  setTasks: (tasks: Task[]) => void;
  addTask: (taskInput: CreateTaskInput) => void;
  updateTask: (id: string, taskInput: UpdateTaskInput) => void;
  deleteTask: (id: string) => void;
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
  
  // データ初期化
  loadMockData: () => void;
  resetStore: () => void;
  
  // スケジュール関連メソッド
  getUnscheduledTasks: () => UnscheduledTaskData[];
  getUnscheduledSubtasks: (parentId: string) => UnscheduledTaskData[];
  updateTaskSchedule: (taskId: string, scheduleInfo: TaskScheduleInfo) => void;
  clearTaskSchedule: (taskId: string) => void;
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

// IDジェネレーター（実際のプロジェクトではUUIDライブラリを使用することを推奨）
const generateId = (): string => {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Zustandストアの作成
export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        tasks: [],
        selectedTaskId: null,
        filter: defaultFilter,
        sort: defaultSort,
        isLoading: false,
        error: null,

        // 基本的なCRUD操作
        setTasks: (tasks) => {
          set({ tasks }, false, 'setTasks');
        },

        addTask: (taskInput) => {
          const { tasks } = get();
          const newTask: Task = {
            id: generateId(),
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
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'current-user', // 実際の実装では認証されたユーザーIDを使用
            updatedBy: 'current-user'
          };
          
          set(
            { tasks: [...tasks, newTask] },
            false,
            'addTask'
          );
        },

        updateTask: (id, taskInput) => {
          const { tasks } = get();
          const updatedTasks = tasks.map(task =>
            task.id === id
              ? {
                  ...task,
                  ...taskInput,
                  updatedAt: new Date(),
                  updatedBy: 'current-user'
                }
              : task
          );
          
          set({ tasks: updatedTasks }, false, 'updateTask');
        },

        deleteTask: (id) => {
          const { tasks } = get();
          const filteredTasks = tasks.filter(task => task.id !== id);
          
          set(
            {
              tasks: filteredTasks,
              selectedTaskId: get().selectedTaskId === id ? null : get().selectedTaskId
            },
            false,
            'deleteTask'
          );
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

        // 一括操作
        bulkUpdateTasks: (ids, updates) => {
          const { tasks } = get();
          const updatedTasks = tasks.map(task =>
            ids.includes(task.id)
              ? {
                  ...task,
                  ...updates,
                  updatedAt: new Date(),
                  updatedBy: 'current-user'
                }
              : task
          );
          
          set({ tasks: updatedTasks }, false, 'bulkUpdateTasks');
        },

        bulkDeleteTasks: (ids) => {
          const { tasks } = get();
          const filteredTasks = tasks.filter(task => !ids.includes(task.id));
          
          set(
            {
              tasks: filteredTasks,
              selectedTaskId: ids.includes(get().selectedTaskId || '') ? null : get().selectedTaskId
            },
            false,
            'bulkDeleteTasks'
          );
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

        // データ初期化
        loadMockData: () => {
          set({ tasks: mockTasks }, false, 'loadMockData');
        },

        resetStore: () => {
          set({
            tasks: [],
            selectedTaskId: null,
            filter: defaultFilter,
            sort: defaultSort,
            isLoading: false,
            error: null
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
        }
      }),
      {
        name: 'task-store',
        // 設計書要件: persistミドルウェア最適化
        partialize: (state) => ({
          tasks: state.tasks,
          filter: state.filter,
          sort: state.sort,
          // 重要でない一時的な状態は除外
          // isLoading, error, selectedTaskIdは永続化しない
        }),
        // ストレージの最適化設定
        storage: {
          getItem: (name) => {
            try {
              const item = localStorage.getItem(name);
              return item ? JSON.parse(item) : null;
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            try {
              // デバウンス機能付きの保存
              // 頻繁な更新を抑制して性能向上
              const throttledSave = () => {
                localStorage.setItem(name, JSON.stringify(value));
              };
              
              // 既存のタイムアウトをクリア
              if ((window as any)._taskStoreThrottle) {
                clearTimeout((window as any)._taskStoreThrottle);
              }
              
              // 250ms後に保存（デバウンス）
              (window as any)._taskStoreThrottle = setTimeout(throttledSave, 250);
            } catch (error) {
              console.error('Failed to save to localStorage:', error);
            }
          },
          removeItem: (name) => {
            try {
              localStorage.removeItem(name);
            } catch (error) {
              console.error('Failed to remove from localStorage:', error);
            }
          }
        },
        // バージョン管理とマイグレーション
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version < 1) {
            // 将来のマイグレーション処理をここに実装
            return persistedState;
          }
          return persistedState;
        },
        // エラー時の回復処理
        onRehydrateStorage: (state) => {
          return (state, error) => {
            if (error) {
              console.error('Failed to rehydrate task store:', error);
              // エラー時はデフォルト状態にリセット
              state?.resetStore();
            }
          };
        }
      }
    ),
    {
      name: 'task-store'
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