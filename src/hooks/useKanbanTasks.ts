/**
 * KanbanBoard専用のカスタムフック（Issue #061対応）
 * 設計書要件: lastUpdated参照追加による軽微な修正
 * 
 * 目的:
 * - タスクの取得とフィルタリング
 * - ステータス別タスク分類
 * - UI同期強化
 */

import { useMemo } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { Task, TaskStatus } from '../types/task';

/**
 * KanbanBoard用のタスクセレクター
 * アーカイブを除いた有効なタスクのみを取得
 * statusフィールドの欠落にも対応
 */
const selectKanbanTasks = (state: { tasks: Task[]; isLoading: boolean; error: string | null }) => {
  return state.tasks.filter((task: Task) => {
    // statusが存在しない場合はデフォルトでTODOとして扱う
    const taskStatus = task.status || 'TODO';
    return taskStatus !== 'ARCHIVED';
  });
};

/**
 * エラー状態とローディング状態のセレクター
 */
const selectTaskStoreState = (state: { tasks: Task[]; isLoading: boolean; error: string | null }) => ({
  isLoading: state.isLoading,
  error: state.error
});

/**
 * フィルタリング設定の型定義
 */
interface TaskFilters {
  searchQuery?: string;
  selectedTags?: string[];
  tagFilterMode?: 'AND' | 'OR';
  pageType?: 'all' | 'today' | 'important' | 'completed';
}

/**
 * ステータス別タスク分類
 * statusフィールドの欠落にも対応
 */
const selectTasksByStatus = (tasks: Task[]) => {
  const grouped = {
    TODO: [] as Task[],
    IN_PROGRESS: [] as Task[],
    DONE: [] as Task[]
  };
  
  tasks.forEach(task => {
    // statusが存在しない場合はデフォルトでTODOとして扱う
    const taskStatus = task.status || 'TODO';
    
    if (taskStatus === 'TODO') {
      grouped.TODO.push(task);
    } else if (taskStatus === 'IN_PROGRESS') {
      grouped.IN_PROGRESS.push(task);
    } else if (taskStatus === 'DONE') {
      grouped.DONE.push(task);
    }
  });
  
  return grouped;
};

/**
 * フィルタリングロジック
 */
const applyFilters = (tasks: Task[], filters?: TaskFilters) => {
  if (!filters) return tasks;
  
  let result = tasks;
  
  const { searchQuery = '', selectedTags = [], tagFilterMode = 'OR', pageType = 'all' } = filters;
  
  // ページタイプフィルタリング
  if (pageType !== 'all') {
    const today = new Date().toISOString().split('T')[0];
    
    switch (pageType) {
      case 'today':
        result = result.filter(task => {
          const dueDateCheck = task.dueDate ? task.dueDate.toISOString().startsWith(today!) : false;
          const createdAtCheck = task.createdAt ? task.createdAt.toISOString().startsWith(today!) : false;
          return dueDateCheck || createdAtCheck;
        });
        break;
      case 'important':
        result = result.filter(task => task.priority === 'URGENT' || task.priority === 'HIGH');
        break;
      case 'completed':
        result = result.filter(task => task.status === 'DONE');
        break;
    }
  }
  
  // タグフィルタリング（修正: タグフィルターが適用された場合のみ動作）
  if (selectedTags && selectedTags.length > 0) {
    result = result.filter(task => {
      // タグフィルターが適用されている場合のみ、タグなしタスクを除外
      if (!task.tags || task.tags.length === 0) {
        return false; // タグフィルターがアクティブなのでタグなしタスクは非表示
      }
      
      const taskTagIds = task.tags.map(tag => tag?.id).filter(Boolean);
      const taskTagIdSet = new Set(taskTagIds);
      
      if (tagFilterMode === 'AND') {
        return selectedTags.every(tagId => taskTagIdSet.has(tagId));
      } else {
        return selectedTags.some(tagId => taskTagIdSet.has(tagId));
      }
    });
  }
  
  // 検索フィルタリング
  if (searchQuery.trim()) {
    const lowerQuery = searchQuery.toLowerCase();
    
    result = result.filter(task => {
      const titleMatch = task.title?.toLowerCase().includes(lowerQuery);
      const descriptionMatch = task.description?.toLowerCase().includes(lowerQuery);
      const tagMatch = task.tags.some(tag => 
        tag.name?.toLowerCase().includes(lowerQuery)
      );
      
      return titleMatch || descriptionMatch || tagMatch;
    });
  }
  
  return result;
};

/**
 * useKanbanTasksフックの戻り値型定義（Issue #061対応）
 */
interface UseKanbanTasksReturn {
  tasks: Task[];
  tasksByStatus: {
    todo: Task[];
    in_progress: Task[];
    done: Task[];
  };
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | undefined;
}

/**
 * KanbanBoard専用のタスク取得フック（Issue #061対応）
 * 設計書要件: lastUpdated参照追加による軽微な修正
 * 
 * @param filters フィルタリング設定
 * @returns カンバン表示用のタスクデータ
 */
export const useKanbanTasks = (filters?: TaskFilters): UseKanbanTasksReturn => {
  const tasks = useTaskStore(selectKanbanTasks);
  const storeState = useTaskStore(selectTaskStoreState);
  const lastUpdated = useTaskStore(state => state.getLastUpdated()); // Issue #061対応

  const filteredTasks = useMemo(() => {
    const result = applyFilters(tasks, filters);
    
    // デバッグ: タスクフィルタリングの結果をログ出力
    console.log('[useKanbanTasks] Filtering results:', {
      originalTasksCount: tasks.length,
      filteredTasksCount: result.length,
      filters: {
        searchQuery: filters?.searchQuery || '',
        selectedTags: filters?.selectedTags || [],
        tagFilterMode: filters?.tagFilterMode || 'OR',
        pageType: filters?.pageType || 'all'
      },
      selectedTagsLength: filters?.selectedTags?.length || 0,
      hasSelectedTags: !!(filters?.selectedTags && filters.selectedTags.length > 0),
      lastUpdated,
      taskIds: result.map(t => ({ id: t.id, title: t.title, status: t.status })),
      timestamp: Date.now()
    });
    
    return result;
  }, [tasks, filters, lastUpdated]); // lastUpdatedを依存配列に追加

  const tasksByStatus = useMemo(() => {
    return selectTasksByStatus(filteredTasks);
  }, [filteredTasks]);

  return {
    tasks: filteredTasks,
    tasksByStatus,
    isLoading: storeState.isLoading,
    error: storeState.error,
    lastUpdated // Issue #061対応: lastUpdatedを返り値に追加
  };
};