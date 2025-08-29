/**
 * Task Data Hooks - Hybrid State Management Pattern
 * Server State (React Query) + Client State (Zustand) の完全統合
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskApi, subtaskApi, tagApi, TaskQueryParams } from '../api/tasks';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';
import toast from 'react-hot-toast';

// React Query Keys
export const taskQueryKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskQueryKeys.all, 'list'] as const,
  list: (filters: TaskQueryParams) => [...taskQueryKeys.lists(), { filters }] as const,
  details: () => [...taskQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskQueryKeys.details(), id] as const,
  stats: () => [...taskQueryKeys.all, 'stats'] as const,
};

// Custom hooks for task management

/**
 * タスク一覧取得フック（React Query統合）
 */
export function useTasks(params: TaskQueryParams = {}) {
  return useQuery({
    queryKey: taskQueryKeys.list(params),
    queryFn: async () => {
      const response = await taskApi.getTasks(params);
      return { tasks: response.data, pagination: response.pagination };
    },
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分 (React Query v5では cacheTime は gcTime に変更)
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status === 401 || status === 403 || status === 404) {
          return false;
        }
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}

/**
 * タスク詳細取得フック（React Query統合）
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskQueryKeys.detail(id),
    queryFn: async () => {
      const response = await taskApi.getTask(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5分
    retry: (failureCount, error) => {
      if (error instanceof Error && 'status' in error) {
        const status = (error as any).status;
        if (status === 404) return false;
      }
      return failureCount < 3;
    }
  });
}

/**
 * タスク作成ミューテーション（Optimistic Updates対応）
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const response = await taskApi.createTask(input);
      return response.data;
    },
    onMutate: async (newTask) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.lists() });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueriesData({ queryKey: taskQueryKeys.lists() });

      // Optimistically update to the new value
      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        title: newTask.title,
        description: newTask.description || '',
        status: (newTask as any).status || 'todo',
        priority: (newTask as any).priority || 'medium',
        projectId: newTask.projectId || null,
        assigneeId: newTask.assigneeId || null,
        dueDate: newTask.dueDate || null,
        tags: [],
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      queryClient.setQueriesData(
        { queryKey: taskQueryKeys.lists() },
        (old: any) => {
          if (!old) return { tasks: [tempTask], pagination: null };
          return { ...old, tasks: [tempTask, ...old.tasks] };
        }
      );

      // Return a context object with the snapshotted value
      return { previousTasks };
    },
    onError: (error, newTask, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('タスクの作成に失敗しました');
    },
    onSuccess: (data, variables, context) => {
      toast.success('タスクを作成しました');
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.stats() });
    },
    onSettled: () => {
      // Always refetch after error or success to make sure server state is correct
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
    },
  });
}

/**
 * タスク更新ミューテーション（Optimistic Updates対応）
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskInput }): Promise<Task> => {
      const response = await taskApi.updateTask(id, input);
      return response.data;
    },
    onMutate: async ({ id, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.lists() });

      // Snapshot the previous values
      const previousTask = queryClient.getQueryData(taskQueryKeys.detail(id));
      const previousTasks = queryClient.getQueriesData({ queryKey: taskQueryKeys.lists() });

      // Optimistically update task detail
      queryClient.setQueryData(taskQueryKeys.detail(id), (old: Task | undefined) => {
        if (!old) return old;
        return { ...old, ...input, updatedAt: new Date() };
      });

      // Optimistically update task in lists
      queryClient.setQueriesData(
        { queryKey: taskQueryKeys.lists() },
        (old: any) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.map((task: Task) =>
              task.id === id ? { ...task, ...input, updatedAt: new Date() } : task
            )
          };
        }
      );

      return { previousTask, previousTasks };
    },
    onError: (error, { id }, context) => {
      // Roll back the optimistic update
      if (context?.previousTask) {
        queryClient.setQueryData(taskQueryKeys.detail(id), context.previousTask);
      }
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error('タスクの更新に失敗しました');
    },
    onSuccess: (data, { id }) => {
      toast.success('タスクを更新しました');
      // Update the cache with the actual server response
      queryClient.setQueryData(taskQueryKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.stats() });
    },
    onSettled: (data, error, { id }) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
    },
  });
}

/**
 * タスク削除ミューテーション（Optimistic Updates対応）
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await taskApi.deleteTask(id);
    },
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: taskQueryKeys.detail(id) });

      // Snapshot the previous values
      const previousTasks = queryClient.getQueriesData({ queryKey: taskQueryKeys.lists() });
      const previousTask = queryClient.getQueryData(taskQueryKeys.detail(id));

      // Optimistically remove from lists
      queryClient.setQueriesData(
        { queryKey: taskQueryKeys.lists() },
        (old: any) => {
          if (!old?.tasks) return old;
          return {
            ...old,
            tasks: old.tasks.filter((task: Task) => task.id !== id)
          };
        }
      );

      // Remove from individual query
      queryClient.removeQueries({ queryKey: taskQueryKeys.detail(id) });

      return { previousTasks, previousTask };
    },
    onError: (error, id, context) => {
      // Roll back the optimistic update
      if (context?.previousTasks) {
        context.previousTasks.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousTask) {
        queryClient.setQueryData(taskQueryKeys.detail(id), context.previousTask);
      }
      toast.error('タスクの削除に失敗しました');
    },
    onSuccess: () => {
      toast.success('タスクを削除しました');
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.stats() });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
    },
  });
}

/**
 * タスク統計取得フック（React Query統合）
 */
export function useTaskStats() {
  return useQuery({
    queryKey: taskQueryKeys.stats(),
    queryFn: async () => {
      const response = await taskApi.getTaskStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2分（統計は頻繁に変わるため短め）
    refetchOnWindowFocus: true, // 統計は最新データが重要
    retry: 2
  });
}

// Subtask hooks

/**
 * サブタスク作成ミューテーション（React Query統合）
 */
export function useCreateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, title }: { taskId: string; title: string }) => {
      const response = await subtaskApi.createSubtask(taskId, title);
      return response.data;
    },
    onSuccess: (data, { taskId }) => {
      toast.success('サブタスクを作成しました');
      // Invalidate the parent task to refetch with new subtask
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.lists() });
    },
    onError: () => {
      toast.error('サブタスクの作成に失敗しました');
    }
  });
}

/**
 * サブタスク更新ミューテーション（React Query統合）
 */
export function useUpdateSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: { title?: string; completed?: boolean } }) => {
      const response = await subtaskApi.updateSubtask(id, input);
      return response.data;
    },
    onSuccess: (data, { input }) => {
      const actionText = input.completed !== undefined ? '完了状態を更新' : '編集';
      toast.success(`サブタスクを${actionText}しました`);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.stats() });
    },
    onError: () => {
      toast.error('サブタスクの更新に失敗しました');
    }
  });
}

/**
 * サブタスク削除ミューテーション（React Query統合）
 */
export function useDeleteSubtask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await subtaskApi.deleteSubtask(id);
    },
    onSuccess: () => {
      toast.success('サブタスクを削除しました');
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: taskQueryKeys.all });
    },
    onError: () => {
      toast.error('サブタスクの削除に失敗しました');
    }
  });
}