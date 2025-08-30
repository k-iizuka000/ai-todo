/**
 * KanbanBoard専用のカスタムフック
 * 設計書要件: グループ2のリアクティブ更新メカニズム実装
 * 
 * 目的:
 * - 最小限の状態変更検知によるパフォーマンス最適化
 * - 必要なコンポーネントのみの更新
 * - デバウンス処理による過剰更新防止
 * - ストア購読の最適化
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { Task, TaskStatus } from '@/types/task';
import { isValidTask } from '@/utils/typeGuards';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * 最適化されたタスクセレクター（最小限の状態変更検知）
 * アーカイブを除いた有効なタスクのみを取得
 * 状態の変更を細かく検知してパフォーマンスを最適化
 */
const selectKanbanTasks = (state: any): Task[] => {
  return state.tasks.filter((task: Task) => 
    task.status !== 'archived' && isValidTask(task)
  );
};

/**
 * タスクの更新時刻のみを監視するセレクター
 * 更新の必要性を判断するために使用
 */
const selectTasksLastUpdated = (state: any): number => {
  const tasks = state.tasks.filter((task: Task) => 
    task.status !== 'archived' && isValidTask(task)
  );
  
  return tasks.reduce((latest: number, task: Task) => {
    const taskUpdated = new Date(task.updatedAt).getTime();
    return Math.max(latest, taskUpdated);
  }, 0);
};

/**
 * エラー状態とローディング状態の最適化されたセレクター
 */
const selectTaskStoreState = (state: any) => ({
  isLoading: state.isLoading,
  error: state.error
});

/**
 * ステータス別タスク分類のセレクター（型安全・最適化）
 * デバウンス処理による過剰更新防止機能付き
 */
const selectTasksByStatus = (tasks: Task[]) => {
  type ActiveTaskStatus = Exclude<TaskStatus, 'archived'>;
  const grouped: Record<ActiveTaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    done: []
  };
  
  // 効率的な分類処理（forEachよりも高速なfor文を使用）
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.status !== 'archived' && grouped[task.status as ActiveTaskStatus]) {
      grouped[task.status as ActiveTaskStatus].push(task);
    }
  }
  
  return grouped;
};

/**
 * タスクリストの差分検知機能
 * 前回との比較により、実際に変更があったかを判定
 */
const hasTasksChanged = (prevTasks: Task[], currentTasks: Task[]): boolean => {
  if (prevTasks.length !== currentTasks.length) {
    return true;
  }
  
  // 各タスクのID、ステータス、更新時刻をチェック
  for (let i = 0; i < currentTasks.length; i++) {
    const current = currentTasks[i];
    const prev = prevTasks.find(t => t.id === current.id);
    
    if (!prev || 
        prev.status !== current.status ||
        prev.updatedAt.getTime() !== current.updatedAt.getTime()) {
      return true;
    }
  }
  
  return false;
};

/**
 * フィルタリング設定の型定義
 */
interface KanbanTaskFilters {
  /** 検索クエリ */
  searchQuery?: string;
  /** 選択されたタグID */
  selectedTags?: string[];
  /** タグフィルターモード */
  tagFilterMode?: 'AND' | 'OR';
  /** ページタイプ */
  pageType?: 'all' | 'today' | 'important' | 'completed';
}

/**
 * パフォーマンスメトリクス収集の型定義
 */
interface PerformanceMetrics {
  /** フィルタリング処理時間（ミリ秒） */
  filteringTime: number;
  /** 分類処理時間（ミリ秒） */
  categorizationTime: number;
  /** 統計計算時間（ミリ秒） */
  statsCalculationTime: number;
  /** 更新頻度（分あたり） */
  updateFrequency: number;
  /** レスポンス時間（ミリ秒） */
  responseTime: number;
  /** メモリ使用効率スコア */
  memoryEfficiencyScore: number;
  /** 収集タイムスタンプ */
  timestamp: number;
}

/**
 * 使用状況統計の型定義
 */
interface UsageStats {
  /** 今日作成されたタスク数 */
  todayCreated: number;
  /** 今日完了されたタスク数 */
  todayCompleted: number;
  /** 平均タスク完了時間（時間） */
  avgCompletionTime: number;
  /** 最も使用されているタグ */
  mostUsedTags: string[];
  /** アクティブなタスク数（進行中） */
  activeTasks: number;
}

/**
 * KanbanBoard専用のタスク取得フック（設計書グループ1+2統合対応）
 * 
 * 機能:
 * - 最小限の状態変更検知による最適化
 * - デバウンス処理による過剰更新防止
 * - 必要なコンポーネントのみ更新
 * - 型安全なタスク分類
 * - リアクティブ更新メカニズム
 * - Dashboard側フィルタリングの統合（二重状態管理排除）
 * 
 * @param filters フィルタリング設定
 * @returns {Object} カンバン表示用のタスクデータ
 */
export const useKanbanTasks = (filters: KanbanTaskFilters = {}) => {
  // Zustandストアから最適化された購読
  const tasks = useTaskStore(selectKanbanTasks);
  const storeState = useTaskStore(selectTaskStoreState);
  const lastUpdated = useTaskStore(selectTasksLastUpdated);
  
  // デバウンス処理による過剰更新防止（250msの遅延）
  const debouncedTasks = useDebounce(tasks, 250);
  const debouncedLastUpdated = useDebounce(lastUpdated, 250);
  
  // メトリクス収集のための状態管理
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    filteringTime: 0,
    categorizationTime: 0,
    statsCalculationTime: 0,
    updateFrequency: 0,
    responseTime: 0,
    memoryEfficiencyScore: 100,
    timestamp: Date.now()
  });
  
  const updateCountRef = useRef(0);
  const updateTimestampsRef = useRef<number[]>([]);
  
  // フィルタリング機能の統合（設計書対応：二重状態管理排除）
  const filteredTasks = useMemo(() => {
    const startTime = performance.now();
    let result = debouncedTasks;
    const { searchQuery, selectedTags = [], tagFilterMode = 'OR', pageType = 'all' } = filters;
    
    // ページタイプフィルタリング
    if (pageType !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      
      switch (pageType) {
        case 'today':
          result = result.filter(task => 
            (task.dueDate && task.dueDate.startsWith(today)) ||
            (task.createdAt && task.createdAt.startsWith(today))
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
    
    // タグフィルタリング（Dashboardから移行）
    if (selectedTags.length > 0) {
      const tagIdSet = new Set(selectedTags);
      
      result = result.filter(task => {
        const taskTagIdSet = new Set(task.tags.map(tag => tag.id));
        
        if (tagFilterMode === 'AND') {
          // すべてのタグが含まれること
          for (const tagId of tagIdSet) {
            if (!taskTagIdSet.has(tagId)) {
              return false;
            }
          }
          return true;
        } else {
          // いずれかのタグが含まれること
          for (const tagId of tagIdSet) {
            if (taskTagIdSet.has(tagId)) {
              return true;
            }
          }
          return false;
        }
      });
    }
    
    // 検索フィルタリング（Dashboardから移行）
    if (searchQuery && searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(lowerQuery) ||
        task.description?.toLowerCase().includes(lowerQuery) ||
        task.tags.some(tag => tag.name.toLowerCase().includes(lowerQuery))
      );
    }
    
    // フィルタリング処理時間の記録
    const endTime = performance.now();
    const filteringTime = endTime - startTime;
    
    // メトリクス更新（非同期で実行、パフォーマンスに影響しない）
    setTimeout(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        filteringTime,
        timestamp: Date.now()
      }));
    }, 0);
    
    return result;
  }, [debouncedTasks, filters, debouncedLastUpdated]);
  
  // ステータス別タスク分類（フィルタリング済みタスクを使用）
  const tasksByStatus = useMemo(() => {
    const startTime = performance.now();
    const result = selectTasksByStatus(filteredTasks);
    
    // 分類処理時間の記録
    const endTime = performance.now();
    const categorizationTime = endTime - startTime;
    
    setTimeout(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        categorizationTime
      }));
    }, 0);
    
    return result;
  }, [filteredTasks, debouncedLastUpdated]);
  
  // 統計情報（リアクティブ更新対応）
  const stats = useMemo(() => {
    const startTime = performance.now();
    
    const todoCount = tasksByStatus.todo.length;
    const inProgressCount = tasksByStatus.in_progress.length;
    const doneCount = tasksByStatus.done.length;
    const totalTasks = todoCount + inProgressCount + doneCount;
    
    const result = {
      totalTasks,
      todoCount,
      inProgressCount,
      doneCount,
      completionRate: totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0
    };
    
    // 統計計算時間の記録
    const endTime = performance.now();
    const statsCalculationTime = endTime - startTime;
    
    setTimeout(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        statsCalculationTime
      }));
    }, 0);
    
    return result;
  }, [tasksByStatus]);
  
  // 更新検知機能
  const hasUpdates = useCallback(() => {
    return debouncedLastUpdated > Date.now() - 1000; // 1秒以内の更新をチェック
  }, [debouncedLastUpdated]);
  
  // 更新頻度の計算
  useEffect(() => {
    const now = Date.now();
    updateCountRef.current++;
    updateTimestampsRef.current.push(now);
    
    // 1分以内の更新のみを保持
    const oneMinuteAgo = now - 60000;
    updateTimestampsRef.current = updateTimestampsRef.current.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    // 更新頻度を計算（分あたり）
    const updateFrequency = updateTimestampsRef.current.length;
    
    setPerformanceMetrics(prev => ({
      ...prev,
      updateFrequency,
      responseTime: performance.now() - (prev.timestamp || now)
    }));
  }, [debouncedLastUpdated]);
  
  // 使用状況統計の計算
  const usageStats = useMemo<UsageStats>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCreated = filteredTasks.filter(task => 
      task.createdAt.toISOString().split('T')[0] === today
    ).length;
    
    const todayCompleted = filteredTasks.filter(task => 
      task.status === 'done' && 
      task.updatedAt.toISOString().split('T')[0] === today
    ).length;
    
    // タグの使用頻度を計算
    const tagUsage = new Map<string, number>();
    filteredTasks.forEach(task => {
      task.tags.forEach(tag => {
        tagUsage.set(tag.name, (tagUsage.get(tag.name) || 0) + 1);
      });
    });
    
    const mostUsedTags = Array.from(tagUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);
    
    // 平均完了時間の計算（完了したタスクの作成から完了までの時間）
    const completedTasks = filteredTasks.filter(task => task.status === 'done');
    const avgCompletionTime = completedTasks.length > 0 
      ? completedTasks.reduce((total, task) => {
          const completionHours = (task.updatedAt.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60);
          return total + completionHours;
        }, 0) / completedTasks.length
      : 0;
    
    return {
      todayCreated,
      todayCompleted,
      avgCompletionTime,
      mostUsedTags,
      activeTasks: tasksByStatus.in_progress.length
    };
  }, [filteredTasks, tasksByStatus]);
  
  return {
    tasks: filteredTasks,
    tasksByStatus,
    isLoading: storeState.isLoading,
    error: storeState.error,
    stats,
    hasUpdates,
    lastUpdated: debouncedLastUpdated,
    performanceMetrics,
    usageStats
  };
};