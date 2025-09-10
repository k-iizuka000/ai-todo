/**
 * Store間データ同期ユーティリティ
 * ProjectStoreとTaskStore間の整合性を保つためのヘルパー機能
 */

import React from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { useTagStore } from '../stores/tagStore';
import { logger } from '../lib/logger';

/**
 * Store間の初期同期を実行
 * アプリケーション起動時に一度呼び出す
 */
export const initializeStoreSync = async () => {
  try {
    logger.info('Initializing store synchronization', { category: 'store_sync' });
    
    // 全ストアを初期化
    const projectStore = useProjectStore.getState();
    const taskStore = useTaskStore.getState();
    const tagStore = useTagStore.getState();
    
    // TagStoreを先に初期化（TaskStoreがタグIDを解決するために必要）
    await tagStore.initialize();
    
    // ProjectStoreとTaskStoreを並行初期化
    await Promise.all([
      projectStore.loadProjects(),
      taskStore.initializeStore()
    ]);
    
    // 初期化後にプロジェクト統計を更新
    await projectStore.refreshAllProjectStats();
    
    logger.info('Store synchronization initialized successfully', { category: 'store_sync' });
  } catch (error) {
    logger.error('Failed to initialize store synchronization', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'store_sync'
    });
  }
};

/**
 * 定期的な同期処理
 * データの整合性を定期的にチェック・修正
 */
export const performPeriodicSync = async () => {
  try {
    logger.debug('Performing periodic store sync', { category: 'store_sync' });
    
    const projectStore = useProjectStore.getState();
    
    // 全プロジェクトの統計情報を更新
    await projectStore.refreshAllProjectStats();
    
    logger.debug('Periodic store sync completed', { category: 'store_sync' });
  } catch (error) {
    logger.error('Failed to perform periodic store sync', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'store_sync'
    });
  }
};

/**
 * ストア間の整合性をチェック
 * @returns 整合性チェック結果と修正が必要な項目
 */
export const validateStoreConsistency = () => {
  try {
    const projectStore = useProjectStore.getState();
    const taskStore = useTaskStore.getState();
    
    const projects = projectStore.projects;
    const tasks = taskStore.tasks;
    
    const inconsistencies: Array<{
      type: 'orphaned_task' | 'missing_project_stats' | 'invalid_project_reference';
      description: string;
      projectId?: string;
      taskId?: string;
    }> = [];
    
    // 孤立したタスクのチェック（存在しないプロジェクトを参照）
    const projectIds = new Set(projects.map(p => p.id));
    const orphanedTasks = tasks.filter(task => 
      task.projectId && !projectIds.has(task.projectId)
    );
    
    orphanedTasks.forEach(task => {
      inconsistencies.push({
        type: 'orphaned_task',
        description: `Task "${task.title}" references non-existent project`,
        projectId: task.projectId || undefined,
        taskId: task.id
      });
    });
    
    // プロジェクト統計の不整合チェック
    for (const project of projects) {
      const relatedTasks = tasks.filter(task => task.projectId === project.id);
      const actualTaskCount = relatedTasks.length;
      const storedTaskCount = project._count.tasks;
      
      if (actualTaskCount !== storedTaskCount) {
        inconsistencies.push({
          type: 'missing_project_stats',
          description: `Project "${project.name}" task count mismatch: actual ${actualTaskCount}, stored ${storedTaskCount}`,
          projectId: project.id
        });
      }
    }
    
    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      summary: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        orphanedTasks: orphanedTasks.length,
        inconsistentProjects: inconsistencies.filter(i => i.type === 'missing_project_stats').length
      }
    };
  } catch (error) {
    logger.error('Failed to validate store consistency', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'store_sync'
    });
    
    return {
      isConsistent: false,
      inconsistencies: [{
        type: 'invalid_project_reference' as const,
        description: 'Failed to validate consistency due to error'
      }],
      summary: {
        totalProjects: 0,
        totalTasks: 0,
        orphanedTasks: 0,
        inconsistentProjects: 0
      }
    };
  }
};

/**
 * 整合性の問題を自動修正
 */
export const repairStoreInconsistencies = async () => {
  try {
    const validation = validateStoreConsistency();
    
    if (validation.isConsistent) {
      logger.info('Store consistency is valid, no repair needed', { category: 'store_sync' });
      return { repaired: 0, errors: [] };
    }
    
    const projectStore = useProjectStore.getState();
    const taskStore = useTaskStore.getState();
    
    let repairedCount = 0;
    const repairErrors: string[] = [];
    
    for (const inconsistency of validation.inconsistencies) {
      try {
        switch (inconsistency.type) {
          case 'orphaned_task':
            if (inconsistency.taskId) {
              // 孤立したタスクはプロジェクト参照を削除
              await taskStore.updateTask(inconsistency.taskId, { projectId: undefined });
              repairedCount++;
              logger.info('Repaired orphaned task', { 
                taskId: inconsistency.taskId,
                category: 'store_sync' 
              });
            }
            break;
            
          case 'missing_project_stats':
            if (inconsistency.projectId) {
              // プロジェクト統計を再計算
              await projectStore.refreshProjectStats(inconsistency.projectId);
              repairedCount++;
              logger.info('Repaired project stats', { 
                projectId: inconsistency.projectId,
                category: 'store_sync' 
              });
            }
            break;
            
          default:
            logger.warn('Unknown inconsistency type, skipping repair', { 
              type: inconsistency.type,
              category: 'store_sync' 
            });
        }
      } catch (repairError) {
        const errorMessage = repairError instanceof Error ? repairError.message : 'Unknown repair error';
        repairErrors.push(errorMessage);
        logger.error('Failed to repair inconsistency', {
          inconsistency,
          error: errorMessage,
          category: 'store_sync'
        });
      }
    }
    
    logger.info('Store inconsistency repair completed', {
      totalInconsistencies: validation.inconsistencies.length,
      repairedCount,
      errorCount: repairErrors.length,
      category: 'store_sync'
    });
    
    return { repaired: repairedCount, errors: repairErrors };
  } catch (error) {
    logger.error('Failed to repair store inconsistencies', {
      error: error instanceof Error ? error.message : 'Unknown error',
      category: 'store_sync'
    });
    
    return { repaired: 0, errors: ['Failed to perform repair operation'] };
  }
};

/**
 * React Hook: Store同期の状態を監視
 */
export const useStoreSyncStatus = () => {
  const projectsLoading = useProjectStore(state => state.isLoading);
  const tasksLoading = useTaskStore(state => state.isLoading);
  const projectError = useProjectStore(state => state.error);
  const taskError = useTaskStore(state => state.error);
  const projectsInitialized = useProjectStore(state => state.projects.length > 0);
  const tasksInitialized = useTaskStore(state => state.isInitialized);
  
  return {
    isLoading: projectsLoading || tasksLoading,
    hasErrors: Boolean(projectError || taskError),
    errors: [projectError, taskError].filter(Boolean) as string[],
    isInitialized: projectsInitialized && tasksInitialized,
    syncStatus: {
      projects: {
        loading: projectsLoading,
        error: projectError,
        initialized: projectsInitialized
      },
      tasks: {
        loading: tasksLoading,
        error: taskError,
        initialized: tasksInitialized
      }
    }
  };
};

/**
 * React Hook: Store整合性チェック
 */
export const useStoreConsistency = () => {
  const [lastCheck, setLastCheck] = React.useState<number>(0);
  const [consistencyResult, setConsistencyResult] = React.useState<ReturnType<typeof validateStoreConsistency> | null>(null);
  
  const checkConsistency = React.useCallback(() => {
    const result = validateStoreConsistency();
    setConsistencyResult(result);
    setLastCheck(Date.now());
    return result;
  }, []);
  
  const repairInconsistencies = React.useCallback(async () => {
    const result = await repairStoreInconsistencies();
    // 修正後に再チェック
    checkConsistency();
    return result;
  }, [checkConsistency]);
  
  // 初回チェック
  React.useEffect(() => {
    checkConsistency();
  }, [checkConsistency]);
  
  return {
    consistencyResult,
    lastCheck,
    checkConsistency,
    repairInconsistencies,
    isConsistent: consistencyResult?.isConsistent ?? true
  };
};

