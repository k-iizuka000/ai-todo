/**
 * Zustandを使用したタスク管理のグローバル状態管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Task, TaskFilter, TaskSort, CreateTaskInput, UpdateTaskInput, TaskListOptions, ExtendedSubtask, HierarchicalTaskV2, TaskStatus } from '../types/task';
import { mockTasks } from '../mock/tasks';

// タスクストアの状態型定義 - グループ1で拡張
interface TaskState {
  // 状態
  tasks: Task[];
  selectedTaskId: string | null;
  filter: TaskFilter;
  sort: TaskSort;
  isLoading: boolean;
  error: string | null;
  
  // === グループ1: サブタスク管理機能追加 ===
  viewMode: 'tasks' | 'subtasks' | 'hierarchy';
  
  // アクション
  setTasks: (tasks: Task[]) => void;
  addTask: (taskInput: CreateTaskInput) => void;
  updateTask: (id: string, taskInput: UpdateTaskInput) => void;
  deleteTask: (id: string) => void;
  selectTask: (id: string | null) => void;
  
  // サブタスク管理
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<ExtendedSubtask>) => void;
  addSubtask: (taskId: string, subtask: CreateSubtaskInput) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  reorderSubtasks: (taskId: string, subtaskIds: string[]) => void;
  
  // 親タスク自動更新
  updateParentTaskStatus: (taskId: string) => void;
  
  // ビュー管理
  setViewMode: (mode: 'tasks' | 'subtasks' | 'hierarchy') => void;
  
  // フィルタリング
  getSubtasksForCalendar: (date?: Date) => ExtendedSubtask[];
  getSubtasksByStatus: (status: TaskStatus) => ExtendedSubtask[];
  
  // フィルター・ソート関連
  setFilter: (filter: Partial<TaskFilter>) => void;
  clearFilter: () => void;
  setSort: (sort: TaskSort) => void;
  
  // ユーティリティ
  getFilteredTasks: () => Task[];
  getTaskById: (id: string) => Task | undefined;
  getTasksByProject: (projectId: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
  
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
}

// サブタスク作成用Input型（グループ1で追加）
interface CreateSubtaskInput {
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
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

// サブタスク用IDジェネレーター（グループ1で追加）
const generateSubtaskId = (): string => {
  return `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        
        // === グループ1: 追加された初期状態 ===
        viewMode: 'tasks',

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
            error: null,
            viewMode: 'tasks'
          }, false, 'resetStore');
        },

        // === グループ1: サブタスク管理機能の実装 ===
        
        // サブタスク更新
        updateSubtask: (taskId, subtaskId, updates) => {
          const { tasks } = get();
          const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
              const currentSubtasks = task.subtasks as unknown as ExtendedSubtask[];
              const updatedSubtasks = currentSubtasks.map(subtask => {
                if (subtask.id === subtaskId) {
                  const updatedSubtask = { 
                    ...subtask, 
                    ...updates, 
                    updatedAt: new Date(), 
                    updatedBy: 'current-user' 
                  };
                  // statusに基づいてcompletedを自動更新
                  if (updates.status) {
                    updatedSubtask.completed = updates.status === 'done';
                  }
                  return updatedSubtask;
                }
                return subtask;
              });
              return { ...task, subtasks: updatedSubtasks as unknown as Task['subtasks'] };
            }
            return task;
          });
          
          set({ tasks: updatedTasks }, false, 'updateSubtask');
          
          // 親タスクのステータスを自動更新
          get().updateParentTaskStatus(taskId);
        },

        // サブタスク追加
        addSubtask: (taskId, subtaskInput) => {
          const { tasks } = get();
          const task = tasks.find(t => t.id === taskId);
          if (!task) return;

          const currentSubtasks = task.subtasks as unknown as ExtendedSubtask[];
          const newSubtask: ExtendedSubtask = {
            id: generateSubtaskId(),
            parentTaskId: taskId,
            title: subtaskInput.title,
            description: subtaskInput.description,
            status: 'todo',
            priority: (subtaskInput.priority as any) || 'medium',
            assigneeId: subtaskInput.assigneeId,
            tags: [],
            dueDate: subtaskInput.dueDate,
            estimatedHours: subtaskInput.estimatedHours,
            actualHours: 0,
            order: currentSubtasks.length,
            completed: false,  // 既存のSubtask型との互換性のため
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'current-user',
            updatedBy: 'current-user'
          };

          const updatedTasks = tasks.map(t =>
            t.id === taskId
              ? { ...t, subtasks: [...currentSubtasks, newSubtask] as unknown as Task['subtasks'] }
              : t
          );

          set({ tasks: updatedTasks }, false, 'addSubtask');
          
          // 親タスクのステータスを自動更新
          get().updateParentTaskStatus(taskId);
        },

        // サブタスク削除
        deleteSubtask: (taskId, subtaskId) => {
          const { tasks } = get();
          const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
              const currentSubtasks = task.subtasks as unknown as ExtendedSubtask[];
              const filteredSubtasks = currentSubtasks.filter(
                subtask => subtask.id !== subtaskId
              );
              return { ...task, subtasks: filteredSubtasks as unknown as Task['subtasks'] };
            }
            return task;
          });

          set({ tasks: updatedTasks }, false, 'deleteSubtask');
          
          // 親タスクのステータスを自動更新
          get().updateParentTaskStatus(taskId);
        },

        // サブタスク並び替え
        reorderSubtasks: (taskId, subtaskIds) => {
          const { tasks } = get();
          const updatedTasks = tasks.map(task => {
            if (task.id === taskId) {
              // 既存のsubtasksがExtendedSubtask型であることを確認
              const currentSubtasks = task.subtasks as unknown as ExtendedSubtask[];
              const subtasksMap = new Map(currentSubtasks.map(st => [st.id, st]));
              const reorderedSubtasks = subtaskIds.map((id, index) => {
                const subtask = subtasksMap.get(id);
                return subtask ? { ...subtask, order: index } : null;
              }).filter(Boolean) as ExtendedSubtask[];
              
              return { ...task, subtasks: reorderedSubtasks as unknown as Task['subtasks'] };
            }
            return task;
          });

          set({ tasks: updatedTasks }, false, 'reorderSubtasks');
        },

        // 親タスク自動更新ロジック
        updateParentTaskStatus: (taskId) => {
          const { tasks } = get();
          const task = tasks.find(t => t.id === taskId);
          if (!task || !task.subtasks.length) return;
          
          const subtasks = task.subtasks as unknown as ExtendedSubtask[];
          const allCompleted = subtasks.every(s => s.status === 'done');
          const anyInProgress = subtasks.some(s => s.status === 'in_progress');
          
          let newStatus: TaskStatus;
          if (allCompleted) {
            newStatus = 'done';
          } else if (anyInProgress) {
            newStatus = 'in_progress';
          } else {
            newStatus = 'todo';
          }
          
          // HierarchicalTaskV2として扱い、derivedStatusを更新
          const updatedTasks = tasks.map(t => {
            if (t.id === taskId) {
              const completedCount = subtasks.filter(s => s.status === 'done').length;
              const inProgressCount = subtasks.filter(s => s.status === 'in_progress').length;
              const todoCount = subtasks.filter(s => s.status === 'todo').length;
              
              // 元のTaskプロパティを保持しつつ、HierarchicalTaskV2の追加プロパティを設定
              const hierarchicalTask: HierarchicalTaskV2 = {
                ...t,
                subtasks: subtasks,
                derivedStatus: newStatus,
                hasSubtasks: true,
                subtaskStats: {
                  total: subtasks.length,
                  completed: completedCount,
                  inProgress: inProgressCount,
                  todo: todoCount,
                  completionRate: subtasks.length > 0 ? Math.round((completedCount / subtasks.length) * 100) : 0
                }
              };
              
              // 通常のTask型として返すため、キャスト
              return hierarchicalTask as unknown as Task;
            }
            return t;
          });
          
          set({ tasks: updatedTasks }, false, 'updateParentTaskStatus');
        },

        // ビュー管理
        setViewMode: (mode) => {
          set({ viewMode: mode }, false, 'setViewMode');
        },

        // フィルタリング機能
        getSubtasksForCalendar: (date) => {
          const { tasks } = get();
          const allSubtasks: ExtendedSubtask[] = [];
          
          tasks.forEach(task => {
            const subtasks = task.subtasks as unknown as ExtendedSubtask[];
            subtasks.forEach(subtask => {
              if (!date || (subtask.dueDate && subtask.dueDate.toDateString() === date.toDateString())) {
                allSubtasks.push(subtask);
              }
            });
          });
          
          return allSubtasks;
        },

        getSubtasksByStatus: (status) => {
          const { tasks } = get();
          const allSubtasks: ExtendedSubtask[] = [];
          
          tasks.forEach(task => {
            const subtasks = task.subtasks as unknown as ExtendedSubtask[];
            subtasks.forEach(subtask => {
              if (subtask.status === status) {
                allSubtasks.push(subtask);
              }
            });
          });
          
          return allSubtasks;
        }
      }),
      {
        name: 'task-store',
        partialize: (state) => ({
          tasks: state.tasks,
          filter: state.filter,
          sort: state.sort
        })
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