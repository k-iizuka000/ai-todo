/**
 * KanbanBoard専用のカスタムフック（Issue #038, #028対応）
 * 設計書要件: デバウンス調整による過剰更新防止 & アンマウント後の状態更新防止
 * 
 * 目的:
 * - タスクの取得とフィルタリング
 * - デバウンス処理による過剰更新防止（50ms）
 * - ステータス別タスク分類
 * - React状態更新警告の防止（Issue #028）
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { Task, TaskStatus } from '@/types/task';
import { useDebounce } from '@/hooks/useDebounce';

// Issue #028対応: 設計書で要求される依存関数（実装想定）
const ensureDataIntegrityDuringLoad = async (tasks: Task[], _operationId: string): Promise<Task[]> => {
  // データ整合性チェック処理
  return tasks.filter(task => task && task.id && task.title);
};

const measureMemoryUsage = () => {
  const memory = (performance as any).memory;
  if (memory) {
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      efficiency: memory.usedJSHeapSize / memory.totalJSHeapSize
    };
  }
  return { used: 0, total: 0, limit: 0, efficiency: 0 };
};

// データ整合性状態の型定義
interface DataIntegrityState {
  lastHealthCheck: number;
  criticalIssues: number;
}

// パフォーマンスメトリクスの型定義
interface PerformanceMetrics {
  responseTime: number;
  filteringTime?: number;
  memoryEfficiencyScore?: number;
  timestamp?: number;
}

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
 * KanbanBoard専用のタスク取得フック（Issue #038, #028対応）
 * 設計書要件: デバウンス調整（50ms）による過剰更新防止 & アンマウント後の状態更新防止
 * 
 * @param filters フィルタリング設定
 * @returns カンバン表示用のタスクデータ
 */
export const useKanbanTasks = (filters: KanbanTaskFilters = {}) => {
  // Issue #028: アンマウント後の状態更新防止
  const isMountedRef = useRef(true);
  
  // Issue #028対応: 詳細設計書要件 - 新しい状態管理
  const [dataIntegrityState, setDataIntegrityState] = useState<DataIntegrityState>({
    lastHealthCheck: Date.now(),
    criticalIssues: 0
  });
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    responseTime: 0
  });
  
  // Performance Observer参照
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  
  // ローディング状態参照（データスナップショット用）
  const loadingStateRef = useRef({
    dataSnapshot: null as Task[] | null
  });
  
  // Zustandストアからデータ取得
  const tasks = useTaskStore(selectKanbanTasks);
  const storeState = useTaskStore(selectTaskStoreState);
  
  // フィルタ値の抽出
  const { searchQuery = '', selectedTags = [], tagFilterMode = 'OR', pageType = 'all' } = filters;
  
  // デバウンス処理（Issue #038: 50ms遅延）
  const debouncedTasks = useDebounce(tasks, 50);
  
  // デバウンスされたフィルター値（パフォーマンス最適化）
  const debouncedSearchQuery = useDebounce(searchQuery, 50);
  const debouncedSelectedTags = useDebounce(selectedTags, 50);
  const debouncedTagFilterMode = useDebounce(tagFilterMode, 50);
  const debouncedPageType = useDebounce(pageType, 50);
  const debouncedLastUpdated = useDebounce(
    tasks.length > 0 ? Math.max(...tasks.map(task => new Date(task.updatedAt).getTime())) : 0,
    50
  );
  
  // フィルタリング機能（Issue #028対応: useMemo内の非同期状態更新同期化）
  const filteredTasks = useMemo(() => {
    const startTime = performance.now();
    
    // Performance マークを追加（開始点）
    if (typeof performance.mark === 'function') {
      performance.mark('useKanbanTasks-filtering-start');
    }
    
    let result = loadingStateRef.current.dataSnapshot || debouncedTasks;
    
    // ページタイプフィルタリング
    if (debouncedPageType !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      
      switch (debouncedPageType) {
        case 'today':
          result = result.filter(task => {
            const dueDateCheck = task.dueDate ? task.dueDate.toISOString().startsWith(today!) : false;
            const createdAtCheck = task.createdAt ? task.createdAt.toISOString().startsWith(today!) : false;
            return dueDateCheck || createdAtCheck;
          });
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
    if (debouncedSelectedTags.length > 0) {
      result = result.filter(task => {
        const taskTagIds = task.tags.map(tag => tag.id);
        const taskTagIdSet = new Set(taskTagIds);
        
        if (debouncedTagFilterMode === 'AND') {
          // すべてのタグが含まれること
          return debouncedSelectedTags.every(tagId => taskTagIdSet.has(tagId));
        } else {
          // いずれかのタグが含まれること
          return debouncedSelectedTags.some(tagId => taskTagIdSet.has(tagId));
        }
      });
    }
    
    // 検索フィルタリング
    if (debouncedSearchQuery.trim()) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      
      result = result.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(lowerQuery);
        const descriptionMatch = task.description?.toLowerCase().includes(lowerQuery);
        const tagMatch = task.tags.some(tag => 
          tag.name?.toLowerCase().includes(lowerQuery)
        );
        
        return titleMatch || descriptionMatch || tagMatch;
      });
    }
    
    // フィルタリング処理時間とメモリ使用量の記録（同期部分のみ）
    const endTime = performance.now();
    const filteringTime = endTime - startTime;
    const memoryUsage = measureMemoryUsage();
    
    // Performance マークを追加（Performance Observer用）
    if (typeof performance.mark === 'function') {
      performance.mark('useKanbanTasks-filtering-end');
      if (typeof performance.measure === 'function') {
        try {
          performance.measure('useKanbanTasks-filtering', 'useKanbanTasks-filtering-start', 'useKanbanTasks-filtering-end');
        } catch (e) {
          // Performance mark が存在しない場合のエラー処理
        }
      }
    }
    
    // 非同期更新は別のuseEffectで処理
    // メトリクス情報を返すが、状態更新はしない
    (window as any).__kanbanTasksMetrics = {
      filteringTime,
      memoryEfficiencyScore: memoryUsage.efficiency,
      timestamp: Date.now()
    };
    
    return result;
  }, [debouncedTasks, debouncedSearchQuery, debouncedSelectedTags, debouncedTagFilterMode, debouncedPageType, debouncedLastUpdated]);
  
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
  
  // Issue #028対応: データ整合性チェック useEffect（詳細設計書 修正箇所1）
  useEffect(() => {
    let isActive = true;
    let abortController = new AbortController();
    const operationId = `integrity_check_${Date.now()}`;
    
    const performIntegrityCheck = async () => {
      try {
        // 中断シグナルの確認
        if (abortController.signal.aborted || !isActive) {
          return;
        }
        
        const safeTasks = await ensureDataIntegrityDuringLoad(debouncedTasks, operationId);
        
        // 状態更新前に再度確認
        if (isActive && !abortController.signal.aborted && safeTasks.length !== debouncedTasks.length) {
          setDataIntegrityState(prev => ({
            ...prev,
            lastHealthCheck: Date.now(),
            criticalIssues: prev.criticalIssues + 1
          }));
        }
      } catch (error) {
        // エラー発生時も生存確認
        if (isActive && !abortController.signal.aborted) {
          console.error('整合性チェックエラー:', error);
          
          // エラー状態の更新も安全化
          setDataIntegrityState(prev => ({
            ...prev,
            lastHealthCheck: Date.now(),
            criticalIssues: prev.criticalIssues + 1
          }));
        }
      }
    };
    
    // デバウンス処理
    const timeoutId = setTimeout(() => {
      if (isActive && !abortController.signal.aborted) {
        performIntegrityCheck();
      }
    }, 100);
    
    return () => {
      isActive = false;
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [debouncedTasks]);
  
  // Issue #028対応: Performance Observer useEffect（詳細設計書 修正箇所2）
  useEffect(() => {
    let isMounted = true;
    
    // テスト環境でPerformanceObserverを無効化
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    if (typeof PerformanceObserver !== 'undefined' && isMounted) {
      try {
        const observer = new PerformanceObserver((list) => {
          // コンポーネント生存確認
          if (!isMounted) {
            return;
          }
          
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name.includes('useKanbanTasks') && isMounted) {
              setPerformanceMetrics(prev => ({
                ...prev,
                responseTime: entry.duration
              }));
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure'] });
        performanceObserverRef.current = observer;
        
        return () => {
          isMounted = false;
          if (observer && typeof observer.disconnect === 'function') {
            observer.disconnect();
          }
          performanceObserverRef.current = null;
        };
      } catch (error) {
        if (isMounted) {
          console.warn('Performance Observer not supported:', error);
        }
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Issue #028対応: メトリクス更新専用useEffect（詳細設計書 修正箇所3）
  useEffect(() => {
    let isMounted = true;
    
    // グローバル変数からメトリクス取得
    const metrics = (window as any).__kanbanTasksMetrics;
    if (metrics && isMounted) {
      setPerformanceMetrics(prev => ({
        ...prev,
        filteringTime: metrics.filteringTime,
        memoryEfficiencyScore: metrics.memoryEfficiencyScore,
        timestamp: metrics.timestamp
      }));
      
      // クリーンアップ
      delete (window as any).__kanbanTasksMetrics;
    }
    
    return () => {
      isMounted = false;
    };
  }, [filteredTasks]); // filteredTasksが変更された時のみ実行
  
  // 更新検知機能（Issue #028: マウント状態チェック付き）
  const hasUpdates = useCallback(() => {
    if (!isMountedRef.current || debouncedTasks.length === 0) return false;
    return Date.now() - new Date(Math.max(...debouncedTasks.map(task => new Date(task.updatedAt).getTime()))).getTime() < 1000;
  }, [debouncedTasks]);

  // Issue #028: 基本クリーンアップ処理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Performance Observerのクリーンアップ
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
        performanceObserverRef.current = null;
      }
      
      // グローバル変数のクリーンアップ
      if ((window as any).__kanbanTasksMetrics) {
        delete (window as any).__kanbanTasksMetrics;
      }
    };
  }, []);

  return {
    tasks: filteredTasks,
    tasksByStatus,
    isLoading: storeState.isLoading,
    error: storeState.error,
    stats,
    hasUpdates,
    // Issue #028対応: 新しい状態を返す
    dataIntegrityState,
    performanceMetrics
  };
};