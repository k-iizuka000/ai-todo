/**
 * Task Store Adapter
 * 既存コンポーネントと新しいDB統合の互換性レイヤー
 */

import { useTaskStore } from '../stores/taskStoreHybrid';
import { useOptimisticTasks } from '../hooks/useOptimisticTasks';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';

/**
 * レガシー互換性フック
 * 既存のコンポーネントが使用するインターface に合わせる
 */
export function useLegacyTaskStore() {
  const {
    selectedTaskId,
    filter,
    sort,
    selectTask,
    setFilter,
    clearFilter,
    setSort,
    error,
    clearError
  } = useTaskStore();

  const filterParams = {
    ...filter,
    page: 1,
    limit: 100
  };

  const {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    refetch
  } = useOptimisticTasks(filterParams);

  const { handleTaskCreateError, handleTaskUpdateError, handleTaskDeleteError } = useErrorHandler();

  // 既存のTaskStore形式に合わせたアダプター
  return {
    // State
    tasks: tasks || [],
    selectedTaskId,
    filter,
    sort,
    isLoading,
    error,

    // Basic CRUD operations with error handling
    addTask: async (taskInput: CreateTaskInput) => {
      try {
        await createTask(taskInput);
        await refetch(); // データ最新化
      } catch (error) {
        handleTaskCreateError(error);
        throw error;
      }
    },

    updateTask: async (id: string, taskInput: UpdateTaskInput) => {
      try {
        await updateTask(id, taskInput);
        await refetch(); // データ最新化
      } catch (error) {
        handleTaskUpdateError(error);
        throw error;
      }
    },

    deleteTask: async (id: string) => {
      try {
        await deleteTask(id);
        await refetch(); // データ最新化
      } catch (error) {
        handleTaskDeleteError(error);
        throw error;
      }
    },

    // Selection
    selectTask,

    // Filtering & Sorting
    setFilter,
    clearFilter,
    setSort,

    // Utilities
    getFilteredTasks: () => {
      // フィルタリングはサーバーサイドで実行されるため、そのまま返す
      return tasks || [];
    },

    getTaskById: (id: string): Task | undefined => {
      return (tasks || []).find(task => task.id === id);
    },

    getTasksByProject: (projectId: string): Task[] => {
      return (tasks || []).filter(task => task.projectId === projectId);
    },

    getTasksByAssignee: (assigneeId: string): Task[] => {
      return (tasks || []).filter(task => task.assigneeId === assigneeId);
    },

    // Archive functions
    getArchivedTasks: (): Task[] => {
      return (tasks || []).filter(task => task.status === 'archived');
    },

    getNonArchivedTasks: (): Task[] => {
      return (tasks || []).filter(task => task.status !== 'archived');
    },

    getFilteredTasksWithArchived: (includeArchived: boolean): Task[] => {
      if (includeArchived) {
        return tasks || [];
      }
      return (tasks || []).filter(task => task.status !== 'archived');
    },

    // Bulk operations
    bulkUpdateTasks: async (ids: string[], updates: UpdateTaskInput) => {
      try {
        await Promise.all(ids.map(id => updateTask(id, updates)));
        await refetch();
      } catch (error) {
        handleTaskUpdateError(error);
        throw error;
      }
    },

    bulkDeleteTasks: async (ids: string[]) => {
      try {
        await Promise.all(ids.map(id => deleteTask(id)));
        await refetch();
      } catch (error) {
        handleTaskDeleteError(error);
        throw error;
      }
    },

    // State management
    setLoading: () => {}, // DB統合では内部管理
    setError: () => {}, // エラーハンドリングは統合済み
    clearError,

    // Data initialization (legacy support)
    loadMockData: () => {
      // DB統合では不要、互換性のみ
      console.warn('loadMockData is deprecated in DB-integrated version');
    },

    resetStore: () => {
      clearFilter();
      selectTask(null);
      clearError();
    },

    // Schedule-related methods (compatibility)
    getUnscheduledTasks: () => {
      return (tasks || [])
        .filter(task => !task.scheduleInfo?.scheduleItemId)
        .map(task => ({
          id: task.id,
          title: task.title,
          description: task.description,
          type: 'task' as const,
          priority: task.priority,
          estimatedTime: task.estimatedHours ? task.estimatedHours * 60 : 60,
          tags: task.tags.map(tag => tag.id),
          projectId: task.projectId,
          dueDate: task.dueDate
        }));
    },

    getUnscheduledSubtasks: (parentId: string) => {
      const parentTask = (tasks || []).find(task => task.id === parentId);
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
          estimatedTime: 30,
          tags: parentTask.tags.map(tag => tag.id),
          projectId: parentTask.projectId
        }));
    },

    updateTaskSchedule: async (taskId: string, scheduleInfo: any) => {
      try {
        await updateTask(taskId, { scheduleInfo } as any);
      } catch (error) {
        handleTaskUpdateError(error);
        throw error;
      }
    },

    clearTaskSchedule: async (taskId: string) => {
      try {
        await updateTask(taskId, { scheduleInfo: undefined } as any);
      } catch (error) {
        handleTaskUpdateError(error);
        throw error;
      }
    }
  };
}

/**
 * 統計情報フック（レガシー互換）
 */
export function useLegacyTaskStats() {
  const { tasks } = useOptimisticTasks();

  const stats = {
    total: tasks?.length || 0,
    completed: tasks?.filter(task => task.status === 'done').length || 0,
    inProgress: tasks?.filter(task => task.status === 'in_progress').length || 0,
    todo: tasks?.filter(task => task.status === 'todo').length || 0,
    completionRate: 0
  };

  stats.completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return stats;
}

/**
 * 選択されたタスクフック（レガシー互換）
 */
export function useLegacySelectedTask() {
  const { selectedTaskId } = useTaskStore();
  const { tasks } = useOptimisticTasks();

  return selectedTaskId ? tasks?.find(task => task.id === selectedTaskId) : null;
}

/**
 * フィルタリングされたタスクフック（レガシー互換）
 */
export function useLegacyFilteredTasks() {
  const { tasks } = useOptimisticTasks();
  return tasks || [];
}

/**
 * アナリティクス統計フック（レガシー互換）
 */
export function useLegacyAnalyticsStats(includeArchived: boolean = false) {
  const { tasks } = useOptimisticTasks({ includeArchived });

  const allTasks = tasks || [];
  const activeTasks = includeArchived ? allTasks : allTasks.filter(task => task.status !== 'archived');
  const archivedTasks = allTasks.filter(task => task.status === 'archived');

  const total = activeTasks.length;
  const completed = activeTasks.filter(task => task.status === 'done').length;
  const inProgress = activeTasks.filter(task => task.status === 'in_progress').length;
  const todo = activeTasks.filter(task => task.status === 'todo').length;
  const archived = archivedTasks.length;

  // 優先度別統計
  const priorityStats = {
    critical: activeTasks.filter(task => task.priority === 'critical').length,
    urgent: activeTasks.filter(task => task.priority === 'urgent').length,
    high: activeTasks.filter(task => task.priority === 'high').length,
    medium: activeTasks.filter(task => task.priority === 'medium').length,
    low: activeTasks.filter(task => task.priority === 'low').length
  };

  // 期限関連統計
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const overdueTasks = activeTasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < now && task.status !== 'done'
  ).length;

  const dueSoonTasks = activeTasks.filter(task => 
    task.dueDate && 
    new Date(task.dueDate) >= now && 
    new Date(task.dueDate) <= sevenDaysFromNow &&
    task.status !== 'done'
  ).length;

  // 時間統計
  const timeStats = activeTasks.reduce((acc, task) => {
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
    archivedTasksData: archivedTasks
  };
}