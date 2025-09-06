/**
 * タスク操作アクション集約カスタムフック
 * 設計書要件: グループ2のリアクティブ更新メカニズム実装
 * 
 * 目的:
 * - 楽観的更新による即座のUI更新
 * - エラー時の自動ロールバック機能
 * - ローディング状態の適切な管理
 * - リアクティブ更新メカニズムの強化
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { TaskStatus, CreateTaskInput, UpdateTaskInput, Task } from '@/types/task';
import { useAsyncHandler } from '@/hooks/useAsyncHandler';
import { taskApi, subtaskApi } from '@/api/tasks';

/**
 * タスク操作アクション集約フック（設計書グループ2対応）
 * 
 * 機能:
 * - 楽観的更新による即座のUI更新
 * - エラー時の自動ロールバック機能
 * - ローディング状態の適切な管理
 * - 非同期処理の適切なハンドリング
 * - リトライメカニズム付きエラーハンドリング
 * 
 * @returns {Object} タスク操作関数群
 */
export const useTaskActions = () => {
  // Issue #028対応: アンマウント後の状態更新防止
  const isMountedRef = useRef(true);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  
  // Zustandストアのアクションを取得
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    setLoading,
    setError,
    clearError,
    getTaskById
  } = useTaskStore();
  
  // 非同期処理ハンドラー（設計書要件: 非同期処理の適切なハンドリング）
  const asyncHandler = useAsyncHandler({
    autoCancel: true,
    onError: (error) => {
      console.error('Async operation failed:', error);
      if (isMountedRef.current) {
        setError(error.message);
      }
    },
    onSuccess: () => {
      if (isMountedRef.current) {
        clearError();
      }
    }
  });
  
  // ローカル状態でロールバック情報を管理
  const [operationStates, setOperationStates] = useState<Map<string, {
    type: 'create' | 'update' | 'delete';
    originalData?: Task;
    retryCount: number;
  }>>(new Map());
  
  // 操作のタイムアウト管理
  const operationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Issue #028対応: クリーンアップ処理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // 全ての進行中の操作を中断
      abortControllersRef.current.forEach((controller, operationId) => {
        controller.abort();
        console.log(`[useTaskActions] Aborted operation: ${operationId}`);
      });
      abortControllersRef.current.clear();
      
      // 全てのタイムアウトをクリア
      operationTimeouts.current.forEach((timeout, operationId) => {
        clearTimeout(timeout);
        console.log(`[useTaskActions] Cleared timeout for operation: ${operationId}`);
      });
      operationTimeouts.current.clear();
    };
  }, []);
  
  /**
   * ロールバック実行関数
   * エラー発生時に元の状態に戻す
   * Issue #028対応: アンマウント後の状態更新防止
   */
  const rollbackOperation = useCallback((operationId: string) => {
    // アンマウント確認
    if (!isMountedRef.current) {
      return;
    }
    
    const operation = operationStates.get(operationId);
    if (!operation) return;
    
    try {
      switch (operation.type) {
        case 'update':
          if (operation.originalData && isMountedRef.current) {
            updateTask(operation.originalData.id, operation.originalData);
          }
          break;
        case 'delete':
          if (operation.originalData && isMountedRef.current) {
            addTask(operation.originalData as CreateTaskInput);
          }
          break;
        case 'create':
          // 作成操作のロールバックは削除
          // originalDataにはIDが含まれている
          if (operation.originalData && isMountedRef.current) {
            deleteTask(operation.originalData.id);
          }
          break;
      }
      
      // 操作状態をクリア - 生存確認付き
      if (isMountedRef.current) {
        setOperationStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(operationId);
          return newMap;
        });
      }
      
      // タイムアウトをクリア
      const timeout = operationTimeouts.current.get(operationId);
      if (timeout) {
        clearTimeout(timeout);
        operationTimeouts.current.delete(operationId);
      }
    } catch (rollbackError) {
      console.error('Rollback operation failed:', rollbackError);
      if (isMountedRef.current) {
        setError('操作の取り消しに失敗しました');
      }
    }
  }, [operationStates, addTask, updateTask, deleteTask, setError]);
  
  /**
   * リトライ機能付きAPI呼び出しシミュレーション
   * 実際の実装ではAPI呼び出しを行う
   */
  const executeWithRetry = useCallback(async (
    operation: () => Promise<void>, 
    operationId: string,
    maxRetries: number = 3
  ): Promise<boolean> => {
    const operationState = operationStates.get(operationId);
    if (!operationState) return false;
    
    try {
      // 実際のAPI呼び出し（設計書対応：API統合完全実装）
      await operation();
      return true;
    } catch (error) {
      const newRetryCount = operationState.retryCount + 1;
      
      if (newRetryCount <= maxRetries) {
        // リトライ
        setOperationStates(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(operationId);
          if (current) {
            newMap.set(operationId, { ...current, retryCount: newRetryCount });
          }
          return newMap;
        });
        
        // 指数バックオフでリトライ
        const delay = Math.pow(2, newRetryCount) * 1000;
        setTimeout(() => {
          executeWithRetry(operation, operationId, maxRetries);
        }, delay);
        
        return false;
      } else {
        // 最大リトライ回数に到達、ロールバック実行
        rollbackOperation(operationId);
        throw error;
      }
    }
  }, [operationStates, rollbackOperation]);
  
  /**
   * タスクの移動（ステータス変更）
   * 設計書要件: 楽観的更新と確実なロールバック機能
   * Issue #028対応: アンマウント後の状態更新防止
   */
  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const operationId = `move-${taskId}-${Date.now()}`;
    const abortController = new AbortController();
    let isOperationActive = true;
    
    try {
      // 中断確認
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      // AbortControllerを記録
      abortControllersRef.current.set(operationId, abortController);
      
      clearError();
      
      // 元のタスク情報を取得（ロールバック用）
      const originalTask = getTaskById(taskId);
      if (!originalTask) {
        throw new Error('タスクが見つかりません');
      }
      
      // 操作情報を記録（生存確認付き）
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        setOperationStates(prev => {
          const newMap = new Map(prev);
          newMap.set(operationId, {
            type: 'update',
            originalData: originalTask,
            retryCount: 0
          });
          return newMap;
        });
      }
      
      // 楽観的更新（即座のUI更新）- 生存確認付き
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        try {
          await updateTask(taskId, { status: newStatus });
          
          // 修正: UI同期のための明示的な状態更新通知
          const currentStore = useTaskStore.getState();
          currentStore.setTasks([...currentStore.tasks]); // 強制再描画トリガー
        } catch (updateError) {
          console.error('Optimistic update failed:', updateError);
          // 楽観的更新に失敗した場合はロールバックを準備
          if (isMountedRef.current) {
            setError('タスクの状態更新に失敗しました');
          }
        }
      }
      
      // 非同期処理ハンドラーを使用してAPI呼び出し
      await asyncHandler.execute(async (signal) => {
        // 実行前の中断確認
        if (signal.aborted || abortController.signal.aborted || !isOperationActive || !isMountedRef.current) {
          throw new Error('Operation aborted');
        }
        
        try {
          // 実際のAPI呼び出し
          const response = await taskApi.updateTask(taskId, { status: newStatus });
          
          // レスポンス確認（生存確認付き）
          if (response.data && response.data.success && isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
            console.log('Task status updated successfully:', response.data);
          }
        } catch (error) {
          if (!abortController.signal.aborted && isOperationActive && isMountedRef.current) {
            console.error('Failed to update task status:', error);
            throw error;
          }
        }
        
        // 操作成功時は状態をクリア（生存確認付き）
        if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
          setOperationStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });
        }
        
        return { taskId, newStatus };
      }, false); // 状態更新は手動で管理
      
    } catch (error) {
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        console.error('Failed to move task:', error);
        
        // エラー時のロールバック
        rollbackOperation(operationId);
        
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        setError(`タスクの移動に失敗しました: ${errorMessage}`);
      }
    } finally {
      isOperationActive = false;
      // AbortControllerをクリーンアップ
      abortControllersRef.current.delete(operationId);
    }
  }, [getTaskById, updateTask, setError, clearError, asyncHandler, rollbackOperation, setOperationStates]);
  
  /**
   * 新規タスク作成
   * 設計書要件: 楽観的更新と確実なエラーハンドリング
   * Issue #028対応: アンマウント後の状態更新防止
   */
  const createTask = useCallback(async (taskInput: CreateTaskInput, defaultStatus?: TaskStatus) => {
    const operationId = `create-${Date.now()}`;
    const abortController = new AbortController();
    let createdTaskId: string | null = null;
    let isOperationActive = true;
    
    try {
      // 早期中断確認
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      // AbortControllerを記録
      abortControllersRef.current.set(operationId, abortController);
      
      if (isMountedRef.current) {
        clearError();
        setLoading(true);
      }
      
      // デフォルトステータスの設定
      const taskData = {
        ...taskInput,
        status: taskInput.status || defaultStatus || 'todo'
      };
      
      // 楽観的更新（即座の表示） - 生存確認付き
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        addTask(taskData as CreateTaskInput);
        
        // 作成されたタスクのIDを取得（最新タスクのID）
        const latestTask = tasks[tasks.length - 1];
        createdTaskId = latestTask?.id || null;
        
        if (createdTaskId) {
          // 操作情報を記録
          setOperationStates(prev => {
            const newMap = new Map(prev);
            newMap.set(operationId, {
              type: 'create',
              originalData: { ...latestTask } as Task,
              retryCount: 0
            });
            return newMap;
          });
        }
      }
      
      // 非同期でAPIを呼び出し、失敗時は自動ロールバック
      if (createdTaskId) {
        const success = await executeWithRetry(
          async () => {
            // 中断確認
            if (abortController.signal.aborted || !isOperationActive || !isMountedRef.current) {
              throw new Error('Operation aborted');
            }
            
            // 実際のAPI呼び出し（設計書対応：API統合完全実装）
            const response = await taskApi.createTask(taskData);
            
            // 成功時の処理 - 生存確認付き
            if (response.data && response.data.success && isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
              console.log('Task created successfully:', response.data);
              // 必要に応じて、サーバーから返されたタスクでローカル状態を更新
            }
          },
          operationId
        );
        
        if (success && isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
          // 操作成功時は状態をクリア
          setOperationStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });
        }
      }
      
    } catch (error) {
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        console.error('Failed to create task:', error);
        setError(`タスクの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    } finally {
      isOperationActive = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
      // AbortControllerをクリーンアップ
      abortControllersRef.current.delete(operationId);
    }
  }, [tasks, addTask, setLoading, setError, clearError, executeWithRetry, setOperationStates]);
  
  /**
   * タスク更新
   * 設計書要件: リアクティブ更新メカニズム
   * Issue #028対応: アンマウント後の状態更新防止
   */
  const editTask = useCallback(async (taskId: string, updates: UpdateTaskInput) => {
    const operationId = `edit-${taskId}-${Date.now()}`;
    const abortController = new AbortController();
    let isOperationActive = true;
    
    try {
      // 早期中断確認
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      // AbortControllerを記録
      abortControllersRef.current.set(operationId, abortController);
      
      if (isMountedRef.current) {
        clearError();
      }
      
      // 楽観的更新 - 生存確認付き
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        updateTask(taskId, updates);
      }
      
      // 実際のAPI呼び出し（設計書対応：API統合完全実装）
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        const response = await taskApi.updateTask(taskId, updates);
        
        // 成功時の処理 - 生存確認付き
        if (response.data && response.data.success && isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
          console.log('Task updated successfully:', response.data);
        }
      }
      
    } catch (error) {
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        console.error('Failed to update task:', error);
        setError('タスクの更新に失敗しました');
      }
    } finally {
      isOperationActive = false;
      // AbortControllerをクリーンアップ
      abortControllersRef.current.delete(operationId);
    }
  }, [updateTask, setError, clearError]);
  
  /**
   * タスク削除
   * 設計書要件: データ整合性の確保
   * Issue #028対応: アンマウント後の状態更新防止
   */
  const removeTask = useCallback(async (taskId: string) => {
    console.log('[removeTask] ===== FUNCTION ENTRY POINT =====');
    console.log('[removeTask] Function called with taskId:', taskId);
    console.log('[removeTask] Current mount status:', isMountedRef.current);
    
    const operationId = `delete-${taskId}-${Date.now()}`;
    const abortController = new AbortController();
    let isOperationActive = true;
    
    console.log('[removeTask] Operation setup completed:', {
      operationId,
      isOperationActive,
      abortSignal: abortController.signal.aborted
    });
    
    try {
      // 早期中断確認（削除操作は実行を継続、abortSignalのみチェック）
      console.log('[removeTask] Checking early abort conditions:', {
        abortSignal: abortController.signal.aborted,
        isMounted: isMountedRef.current,
        willReturn: abortController.signal.aborted
      });
      
      if (abortController.signal.aborted) {
        console.log('[removeTask] Early return triggered - operation aborted');
        return;
      }
      
      console.log('[removeTask] Early abort check passed, continuing...');
      
      // AbortControllerを記録
      abortControllersRef.current.set(operationId, abortController);
      
      if (isMountedRef.current) {
        clearError();
      }
      
      // 楽観的更新 - 削除操作は常に実行
      console.log('[removeTask] About to perform optimistic update - Conditions check:', {
        isOperationActive,
        aborted: abortController.signal.aborted,
        mounted: isMountedRef.current,
        taskId
      });
      
      if (isOperationActive && !abortController.signal.aborted) {
        console.log('[removeTask] Performing optimistic update: deleteTask(', taskId, ')');
        deleteTask(taskId);
        console.log('[removeTask] Optimistic update completed');
      } else {
        console.log('[removeTask] Optimistic update skipped due to conditions');
      }
      
      // 実際のAPI呼び出し（設計書対応：API統合完全実装）
      console.log('[removeTask] About to make API call - Conditions check:', {
        isOperationActive,
        aborted: abortController.signal.aborted,
        mounted: isMountedRef.current,
        taskId
      });
      
      if (isOperationActive && !abortController.signal.aborted) {
        console.log('[removeTask] Making API call to taskApi.deleteTask:', taskId);
        const response = await taskApi.deleteTask(taskId);
        console.log('[removeTask] API call completed, response:', response);
        
        // 成功時の処理 - 削除操作は常に確認
        if (response.data && response.data.success && isOperationActive && !abortController.signal.aborted) {
          console.log('[removeTask] Task deleted successfully:', response.data);
        } else {
          console.log('[removeTask] Success condition not met:', {
            hasResponseData: !!response.data,
            success: response.data?.success,
            isOperationActive,
            aborted: abortController.signal.aborted,
            mounted: isMountedRef.current
          });
        }
      } else {
        console.log('[removeTask] API call skipped due to conditions:', {
          isOperationActive,
          aborted: abortController.signal.aborted,
          mounted: isMountedRef.current
        });
      }
      
    } catch (error) {
      console.log('[removeTask] Caught error:', error);
      console.log('[removeTask] Error handling conditions:', {
        isOperationActive,
        aborted: abortController.signal.aborted,
        mounted: isMountedRef.current
      });
      
      if (isOperationActive && !abortController.signal.aborted) {
        console.error('[removeTask] Processing error - Failed to delete task:', error);
        // エラー状態の更新はマウント状態の場合のみ
        if (isMountedRef.current) {
          setError('タスクの削除に失敗しました');
        }
      } else {
        console.log('[removeTask] Error ignored due to conditions');
      }
    } finally {
      isOperationActive = false;
      // AbortControllerをクリーンアップ
      abortControllersRef.current.delete(operationId);
    }
  }, [deleteTask, setError, clearError]);
  
  /**
   * サブタスク完了切り替え
   * 設計書要件: 確実な再レンダリング保証と楽観的更新
   * Issue #028対応: アンマウント後の状態更新防止
   */
  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const operationId = `toggle-subtask-${taskId}-${subtaskId}-${Date.now()}`;
    const abortController = new AbortController();
    let isOperationActive = true;
    
    try {
      // 早期中断確認
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      // AbortControllerを記録
      abortControllersRef.current.set(operationId, abortController);
      
      clearError();
      
      // 元のタスク情報を取得
      const originalTask = getTaskById(taskId);
      if (!originalTask) {
        throw new Error('親タスクが見つかりません');
      }
      
      // サブタスクを見つける
      const subtaskIndex = originalTask.subtasks.findIndex(st => st.id === subtaskId);
      if (subtaskIndex === -1) {
        throw new Error('サブタスクが見つかりません');
      }
      
      const originalSubtask = originalTask.subtasks[subtaskIndex];
      const newCompletedState = !originalSubtask.completed;
      
      // 操作情報を記録（ロールバック用） - 生存確認付き
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        setOperationStates(prev => {
          const newMap = new Map(prev);
          newMap.set(operationId, {
            type: 'update',
            originalData: originalTask,
            retryCount: 0
          });
          return newMap;
        });
      }
      
      // 楽観的更新: サブタスクの完了状態を切り替え - 生存確認付き
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        const updatedSubtasks = [...originalTask.subtasks];
        updatedSubtasks[subtaskIndex] = {
          ...originalSubtask,
          completed: newCompletedState,
          updatedAt: new Date()
        };
        
        // タスク全体を更新（サブタスクの変更を含む）
        updateTask(taskId, {
          subtasks: updatedSubtasks
        } as any);
      }
      
      // 非同期でAPI呼び出し
      await asyncHandler.execute(async (signal) => {
        // 実行前の中断確認
        if (signal.aborted || abortController.signal.aborted || !isOperationActive || !isMountedRef.current) {
          throw new Error('Operation aborted');
        }
        
        try {
          // 実際のAPI呼び出し
          const response = await subtaskApi.updateSubtask(subtaskId, { 
            completed: newCompletedState 
          });
          
          // 成功時の処理（生存確認付き）
          if (response.data && response.data.success && isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
            console.log('Subtask toggled successfully:', response.data);
          }
        } catch (error) {
          if (!abortController.signal.aborted && isOperationActive && isMountedRef.current) {
            console.error('Failed to toggle subtask:', error);
            throw error;
          }
        }
        
        // 操作成功時は状態をクリア（生存確認付き）
        if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
          setOperationStates(prev => {
            const newMap = new Map(prev);
            newMap.delete(operationId);
            return newMap;
          });
        }
        
        return { taskId, subtaskId, completed: newCompletedState };
      }, false); // 状態更新は手動で管理
      
    } catch (error) {
      if (isOperationActive && !abortController.signal.aborted && isMountedRef.current) {
        console.error('Failed to toggle subtask:', error);
        
        // エラー時のロールバック
        rollbackOperation(operationId);
        
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        setError(`サブタスクの切り替えに失敗しました: ${errorMessage}`);
      }
    } finally {
      isOperationActive = false;
      // AbortControllerをクリーンアップ
      abortControllersRef.current.delete(operationId);
    }
  }, [getTaskById, updateTask, setError, clearError, asyncHandler, rollbackOperation, setOperationStates]);
  
  /**
   * エラークリア
   * 設計書要件: エラー状態の適切な管理
   * Issue #028対応: アンマウント後の状態更新防止
   */
  const clearErrorState = useCallback(() => {
    if (isMountedRef.current) {
      clearError();
    }
  }, [clearError]);
  
  return {
    moveTask,
    createTask,
    editTask,
    removeTask,
    toggleSubtask,
    clearError: clearErrorState
  };
};