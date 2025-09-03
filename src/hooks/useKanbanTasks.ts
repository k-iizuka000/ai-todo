/**
 * KanbanBoard専用のカスタムフック（Issue #038対応）
 * 設計書要件: デバウンス調整による過剰更新防止
 * 
 * 目的:
 * - タスクの取得とフィルタリング
 * - デバウンス処理による過剰更新防止（50ms）
 * - ステータス別タスク分類
 */

import { useMemo, useCallback } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { Task, TaskStatus } from '@/types/task';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * KanbanBoard用のタスクセレクター
 * アーカイブを除いた有効なタスクのみを取得
 */
const selectKanbanTasks = (state: { tasks: Task[]; isLoading: boolean; error: string | null }) => {
  return state.tasks.filter((task: Task) => task.status !== 'archived');
};

/**
 * エラー状態とローディング状態のセレクター
 */
const selectTaskStoreState = (state: { tasks: Task[]; isLoading: boolean; error: string | null }) => ({
  isLoading: state.isLoading,
  error: state.error
});

/**
 * ステータス別タスク分類
 */
const selectTasksByStatus = (tasks: Task[]) => {
  type ActiveTaskStatus = Exclude<TaskStatus, 'archived'>;
  const grouped: Record<ActiveTaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    done: []
  };
  
  tasks.forEach(task => {
    if (task.status !== 'archived' && grouped[task.status as ActiveTaskStatus]) {
      grouped[task.status as ActiveTaskStatus].push(task);
    }
  });
  
  return grouped;
};

/**
 * フィルタリング設定の型定義
 */
interface KanbanTaskFilters {
  searchQuery?: string;
  selectedTags?: string[];
  tagFilterMode?: 'AND' | 'OR';
  pageType?: 'all' | 'today' | 'important' | 'completed';
}

/**
 * KanbanBoard専用のタスク取得フック（Issue #038対応）
 * 設計書要件: デバウンス調整（50ms）による過剰更新防止
 * 
 * @param filters フィルタリング設定
 * @returns カンバン表示用のタスクデータ
 */
export const useKanbanTasks = (filters: KanbanTaskFilters = {}) => {
  // Zustandストアからデータ取得
  const tasks = useTaskStore(selectKanbanTasks);
  const storeState = useTaskStore(selectTaskStoreState);
  
  // デバウンス処理（Issue #038: 50ms遅延）
  const debouncedTasks = useDebounce(tasks, 50);
  
  // フィルタ値の抽出
  const { searchQuery = '', selectedTags = [], tagFilterMode = 'OR', pageType = 'all' } = filters;
  
  // フィルタリング機能
  const filteredTasks = useMemo(() => {
    let result = debouncedTasks;
    
    // ページタイプフィルタリング
    if (pageType !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      
      switch (pageType) {
        case 'today':
          result = result.filter(task => 
            (task.dueDate?.startsWith(today)) ||
            (task.createdAt?.toISOString().startsWith(today))
          );
          break;
        case 'important':
          result = result.filter(task => task.priority === 'urgent' || task.priority === 'high');
          break;
        case 'completed':
          result = result.filter(task => task.status === 'done');
          break;
      }
    }
    
    // タグフィルタリング
    if (selectedTags.length > 0) {
      const tagIdSet = new Set(selectedTags);
      
      result = result.filter(task => {
        const taskTagIds = task.tags.map(tag => tag.id);
        const taskTagIdSet = new Set(taskTagIds);
        
        if (tagFilterMode === 'AND') {
          // すべてのタグが含まれること
          return selectedTags.every(tagId => taskTagIdSet.has(tagId));
        } else {
          // いずれかのタグが含まれること
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
  }, [debouncedTasks, searchQuery, selectedTags, tagFilterMode, pageType]);
  
  // ステータス別タスク分類
  const tasksByStatus = useMemo(() => {
    return selectTasksByStatus(filteredTasks);
  }, [filteredTasks]);
  
  // 統計情報
  const stats = useMemo(() => {
    const todoCount = tasksByStatus.todo.length;
    const inProgressCount = tasksByStatus.in_progress.length;
    const doneCount = tasksByStatus.done.length;
    const totalTasks = todoCount + inProgressCount + doneCount;
    
    return {
      totalTasks,
      todoCount,
      inProgressCount,
      doneCount,
      completionRate: totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0
    };
  }, [tasksByStatus]);
  
  // 更新検知機能
  const hasUpdates = useCallback(() => {
    if (debouncedTasks.length === 0) return false;
    return Date.now() - new Date(Math.max(...debouncedTasks.map(task => new Date(task.updatedAt).getTime()))).getTime() < 1000;
  }, [debouncedTasks]);

  return {
    tasks: filteredTasks,
    tasksByStatus,
    isLoading: storeState.isLoading,
    error: storeState.error,
    stats,
    hasUpdates
  };
};