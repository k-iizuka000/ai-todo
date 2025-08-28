/**
 * Optimistic Updates Hook - React Query統合版
 * React QueryのビルトインOptimistic Updatesを活用
 * このフックはReact Queryとの統合により簡素化
 */

import { useCallback } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput } from '../types/task';
import { useTaskStore } from '../stores/taskStoreHybrid';
import { 
  useCreateTask, 
  useUpdateTask, 
  useDeleteTask,
  useTasks 
} from './useTasks';

/**
 * React Query統合によるOptimistic Updates
 * React Queryのビルトイン機能を最大活用
 */
export function useOptimisticTasks(queryParams: any = {}) {
  // React QueryのuseTasks hook（すでにOptimistic Updates内蔵）
  const queryResult = useTasks(queryParams);
  const { setError, optimisticUpdate, rollbackOptimistic } = useTaskStore();
  
  // React Queryのmutationsをそのまま使用（Optimistic Updates内蔵）
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // React Queryの内蔵Optimistic Updatesを使用
  const createTaskOptimistic = useCallback(async (input: CreateTaskInput) => {
    try {
      // React QueryのmutateAsyncが内部でOptimistic Updatesを処理
      const result = await createTaskMutation.mutateAsync(input);
      optimisticUpdate('create-success', {});
      return result;
    } catch (error) {
      rollbackOptimistic('create-failed');
      setError(`Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [createTaskMutation, optimisticUpdate, rollbackOptimistic, setError]);

  // React Queryの内蔵Optimistic Updatesを使用
  const updateTaskOptimistic = useCallback(async (id: string, input: UpdateTaskInput) => {
    try {
      // React QueryのmutateAsyncが内部でOptimistic Updatesを処理
      const result = await updateTaskMutation.mutateAsync({ id, input });
      optimisticUpdate(id, input);
      return result;
    } catch (error) {
      rollbackOptimistic(id);
      setError(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [updateTaskMutation, optimisticUpdate, rollbackOptimistic, setError]);

  // React Queryの内蔵Optimistic Updatesを使用
  const deleteTaskOptimistic = useCallback(async (id: string) => {
    try {
      // React QueryのmutateAsyncが内部でOptimistic Updatesを処理
      await deleteTaskMutation.mutateAsync(id);
      optimisticUpdate('delete-success', {});
    } catch (error) {
      rollbackOptimistic(id);
      setError(`Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [deleteTaskMutation, optimisticUpdate, rollbackOptimistic, setError]);

  return {
    // React QueryからのServerState（すでにOptimistic Updates適用済み）
    tasks: (queryResult.data as any)?.tasks || [],
    pagination: (queryResult.data as any)?.pagination,
    
    // Loading states（React Query統合）
    isLoading: queryResult.isLoading || createTaskMutation.isPending || updateTaskMutation.isPending || deleteTaskMutation.isPending,
    
    // Error states（React Query統合）
    error: queryResult.error || createTaskMutation.error || updateTaskMutation.error || deleteTaskMutation.error,
    
    // Optimistic mutations（React Query内蔵機能使用）
    createTask: createTaskOptimistic,
    updateTask: updateTaskOptimistic,
    deleteTask: deleteTaskOptimistic,
    
    // Utility
    refetch: queryResult.refetch,
    // React Queryが内部でOptimistic Updatesを管理
    hasOptimisticUpdates: createTaskMutation.isPending || updateTaskMutation.isPending || deleteTaskMutation.isPending
  };
}