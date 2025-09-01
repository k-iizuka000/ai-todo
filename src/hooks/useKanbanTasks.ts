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
import { isValidTask, isValidTaskWithStats, getTypeGuardStats, getValidationCacheStats } from '@/utils/typeGuards';
import { SafeArrayAccess, quickHealthCheck, DataIntegrityReport } from '@/utils/taskDataIntegrity';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * 最適化されたタスクセレクター（最小限の状態変更検知）
 * アーカイブを除いた有効なタスクのみを取得
 * 状態の変更を細かく検知してパフォーマンスを最適化
 */
const selectKanbanTasks = (state: any): Task[] => {
  return state.tasks.filter((task: Task) => 
    task.status !== 'archived' && isValidTaskWithStats(task)
  );
};

/**
 * タスクの更新時刻のみを監視するセレクター
 * 更新の必要性を判断するために使用
 */
const selectTasksLastUpdated = (state: any): number => {
  const tasks = state.tasks.filter((task: Task) => 
    task.status !== 'archived' && isValidTaskWithStats(task)
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
  
  // フィルタ値の個別抽出（オブジェクト参照を安定化）
  const { searchQuery, selectedTags = [], tagFilterMode = 'OR', pageType = 'all' } = filters;
  const debouncedSearchQuery = useDebounce(searchQuery, 100);
  const debouncedSelectedTags = useDebounce(selectedTags, 100);
  const debouncedTagFilterMode = useDebounce(tagFilterMode, 100);
  const debouncedPageType = useDebounce(pageType, 100);
  
  // メトリクス収集のための状態管理（拡張版）
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    filteringTime: 0,
    categorizationTime: 0,
    statsCalculationTime: 0,
    updateFrequency: 0,
    responseTime: 0,
    memoryEfficiencyScore: 100,
    timestamp: Date.now()
  });
  
  // 拡張監視用のRef
  const updateCountRef = useRef(0);
  const updateTimestampsRef = useRef<number[]>([]);
  const memoryUsageHistoryRef = useRef<{ timestamp: number; usage: number }[]>([]);
  const renderCountRef = useRef(0);
  const errorCountRef = useRef(0);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  
  // 非同期データ整合性管理用のRef（Task 2.4対応）
  const loadingStateRef = useRef<{
    isLoading: boolean;
    loadingStartTime: number;
    pendingOperations: Set<string>;
    dataSnapshot: Task[] | null;
    integrityCheckInProgress: boolean;
  }>({
    isLoading: false,
    loadingStartTime: 0,
    pendingOperations: new Set(),
    dataSnapshot: null,
    integrityCheckInProgress: false
  });
  
  // データ整合性状態管理（Task 2.4対応）
  const [dataIntegrityState, setDataIntegrityState] = useState<{
    isHealthy: boolean;
    lastHealthCheck: number;
    criticalIssues: number;
    duplicateValidationWarnings: number;
    raceConditionDetections: number;
  }>({
    isHealthy: true,
    lastHealthCheck: Date.now(),
    criticalIssues: 0,
    duplicateValidationWarnings: 0,
    raceConditionDetections: 0
  });
  
  // 非同期データロード中の整合性保証機能（Task 2.4）
  const ensureDataIntegrityDuringLoad = useCallback(async (
    newTasks: Task[], 
    operationId: string
  ): Promise<Task[]> => {
    const startTime = performance.now();
    
    // 既に同じ操作が進行中の場合は競合を検出
    if (loadingStateRef.current.pendingOperations.has(operationId)) {
      setDataIntegrityState(prev => ({
        ...prev,
        raceConditionDetections: prev.raceConditionDetections + 1
      }));
      
      // 競合が発生した場合、スナップショットがあればそれを返す
      if (loadingStateRef.current.dataSnapshot) {
        return loadingStateRef.current.dataSnapshot;
      }
    }
    
    // 操作を登録
    loadingStateRef.current.pendingOperations.add(operationId);
    loadingStateRef.current.isLoading = true;
    loadingStateRef.current.loadingStartTime = startTime;
    
    try {
      // 高速健全性チェック実行
      const healthCheck = quickHealthCheck(newTasks);
      
      // 重大な問題がある場合はフォールバック
      if (!healthCheck.isHealthy) {
        setDataIntegrityState(prev => ({
          ...prev,
          isHealthy: false,
          criticalIssues: healthCheck.criticalIssueCount,
          lastHealthCheck: Date.now()
        }));
        
        // スナップショットがあればフォールバック
        if (loadingStateRef.current.dataSnapshot && 
            loadingStateRef.current.dataSnapshot.length > 0) {
          console.warn(`データ整合性問題により既存データにフォールバック: critical=${healthCheck.criticalIssueCount}, high=${healthCheck.highIssueCount}`);
          return loadingStateRef.current.dataSnapshot;
        }
      }
      
      // 安全な配列アクセスを使用してデータを処理
      const safeTasks = SafeArrayAccess.filter(newTasks, (task, index) => {
        // 無効なタスクを除外
        if (!isValidTask(task)) {
          console.warn(`無効なタスクを除外: index=${index}, taskId=${task?.id || 'unknown'}`);
          return false;
        }
        return true;
      });
      
      // データスナップショットを更新
      loadingStateRef.current.dataSnapshot = safeTasks;
      
      // 整合性状態を更新
      setDataIntegrityState(prev => ({
        ...prev,
        isHealthy: healthCheck.isHealthy,
        criticalIssues: healthCheck.criticalIssueCount,
        lastHealthCheck: Date.now()
      }));
      
      return safeTasks;
      
    } finally {
      // 操作完了処理
      loadingStateRef.current.pendingOperations.delete(operationId);
      
      if (loadingStateRef.current.pendingOperations.size === 0) {
        loadingStateRef.current.isLoading = false;
        loadingStateRef.current.loadingStartTime = 0;
      }
      
      // パフォーマンス記録
      const executionTime = performance.now() - startTime;
      if (executionTime > 100) { // 100ms以上かかった場合は警告
        console.warn(`データ整合性チェックに時間がかかりました: ${Math.round(executionTime)}ms`);
      }
    }
  }, []);
  
  // 重複バリデーション検知・除去機能（Task 2.5）
  const validationCallTracker = useRef<Map<string, {
    lastCalled: number;
    callCount: number;
    cacheHit: boolean;
  }>>(new Map());
  
  const trackValidationCall = useCallback((functionName: string, taskId: string, isFromCache: boolean): void => {
    const key = `${functionName}:${taskId}`;
    const now = Date.now();
    const existing = validationCallTracker.current.get(key);
    
    if (existing && now - existing.lastCalled < 100) { // 100ms以内の重複呼び出し
      setDataIntegrityState(prev => ({
        ...prev,
        duplicateValidationWarnings: prev.duplicateValidationWarnings + 1
      }));
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(`重複バリデーション検出: ${functionName} for ${taskId}`);
      }
    }
    
    validationCallTracker.current.set(key, {
      lastCalled: now,
      callCount: (existing?.callCount || 0) + 1,
      cacheHit: isFromCache
    });
    
    // 古い記録をクリーンアップ（メモリリーク防止）
    if (validationCallTracker.current.size > 1000) {
      const cutoff = now - 60000; // 1分前より古い記録を削除
      for (const [key, value] of validationCallTracker.current.entries()) {
        if (value.lastCalled < cutoff) {
          validationCallTracker.current.delete(key);
        }
      }
    }
  }, []);
  
  // メモリ使用量監視機能
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance && typeof (performance as any).memory === 'object') {
      const memory = (performance as any).memory;
      const usage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        efficiency: Math.round((1 - (memory.usedJSHeapSize / memory.totalJSHeapSize)) * 100)
      };
      
      // メモリ使用履歴を記録（最新20件を保持）
      const now = Date.now();
      memoryUsageHistoryRef.current.push({ timestamp: now, usage: usage.efficiency });
      if (memoryUsageHistoryRef.current.length > 20) {
        memoryUsageHistoryRef.current = memoryUsageHistoryRef.current.slice(-20);
      }
      
      // メモリリークの検出（効率が継続的に下がっている場合）
      const recentReadings = memoryUsageHistoryRef.current.slice(-5);
      const isMemoryLeak = recentReadings.length === 5 && 
        recentReadings.every((reading, index) => 
          index === 0 || reading.usage < recentReadings[index - 1].usage
        );
      
      if (isMemoryLeak) {
        console.warn('🚨 Potential memory leak detected in useKanbanTasks');
      }
      
      return usage;
    }
    
    return {
      used: 0,
      total: 0,
      limit: 0,
      efficiency: 100
    };
  }, []);
  
  // ✅ 新規追加: データ整合性チェック分離（useMemoから分離）
  useEffect(() => {
    let isActive = true;
    const operationId = `integrity_check_${Date.now()}`;
    
    const performIntegrityCheck = async () => {
      try {
        const safeTasks = await ensureDataIntegrityDuringLoad(debouncedTasks, operationId);
        
        if (isActive && safeTasks.length !== debouncedTasks.length) {
          setDataIntegrityState(prev => ({
            ...prev,
            lastHealthCheck: Date.now(),
            criticalIssues: prev.criticalIssues + 1
          }));
        }
      } catch (error) {
        if (isActive) {
          console.error('整合性チェックエラー:', error);
        }
      }
    };
    
    // デバウンスされたタスクデータに変更がある場合のみ実行
    const timeoutId = setTimeout(performIntegrityCheck, 100);
    
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [debouncedTasks, ensureDataIntegrityDuringLoad]); // 依存配列を最小化
  
  // Performance Observer を使用したより詳細な測定（テスト環境対応）
  useEffect(() => {
    // テスト環境でPerformanceObserverを無効化
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name.includes('useKanbanTasks')) {
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
          if (observer && typeof observer.disconnect === 'function') {
            observer.disconnect();
          }
        };
      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }
  }, []);
  
  // フィルタリング機能の統合（設計書対応：二重状態管理排除 + データ整合性保証）
  const filteredTasks = useMemo(() => {
    const startTime = performance.now();
    
    // Performance マークを追加（開始点）
    if (typeof performance.mark === 'function') {
      performance.mark('useKanbanTasks-filtering-start');
    }
    
    // ✅ 修正: useMemo内の非同期処理とstate更新を完全除去
    // データ整合性チェックはuseEffectで分離実行
    let result = loadingStateRef.current.dataSnapshot || debouncedTasks;
    
    // ページタイプフィルタリング
    if (debouncedPageType !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      
      switch (debouncedPageType) {
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
    
    // タグフィルタリング（安全な配列アクセス使用 - Task 2.3対応）
    if (debouncedSelectedTags.length > 0) {
      const tagIdSet = new Set(debouncedSelectedTags);
      
      result = SafeArrayAccess.filter(result, (task, index) => {
        // 重複バリデーション検知（Task 2.5対応）
        trackValidationCall('tagFilter', task.id || `unknown_${index}`, false);
        
        // 安全なタグ配列アクセス
        const taskTags = SafeArrayAccess.slice(task.tags);
        const taskTagIds = taskTags
          .map(tag => tag?.id)
          .filter((id): id is string => typeof id === 'string');
        
        const taskTagIdSet = new Set(taskTagIds);
        
        if (debouncedTagFilterMode === 'AND') {
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
    
    // 検索フィルタリング（安全な配列アクセス使用 - Task 2.3対応）
    if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      
      result = SafeArrayAccess.filter(result, (task, index) => {
        // 重複バリデーション検知（Task 2.5対応）
        trackValidationCall('searchFilter', task.id || `unknown_${index}`, false);
        
        // 安全な文字列検索
        const titleMatch = task.title?.toLowerCase().includes(lowerQuery) || false;
        const descriptionMatch = task.description?.toLowerCase().includes(lowerQuery) || false;
        
        // 安全なタグ検索
        const taskTags = SafeArrayAccess.slice(task.tags);
        const tagMatch = taskTags.some(tag => 
          tag?.name?.toLowerCase().includes(lowerQuery) || false
        );
        
        return titleMatch || descriptionMatch || tagMatch;
      });
    }
    
    // フィルタリング処理時間とメモリ使用量の記録
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
    
    // ✅ 改善: パフォーマンス測定の非同期化強化
    Promise.resolve().then(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        filteringTime,
        memoryEfficiencyScore: memoryUsage.efficiency,
        timestamp: Date.now()
      }));
    });
    
    return result;
  }, [debouncedTasks, debouncedSearchQuery, debouncedSelectedTags, debouncedTagFilterMode, debouncedPageType, debouncedLastUpdated]);
  
  // ステータス別タスク分類（フィルタリング済みタスクを使用）
  const tasksByStatus = useMemo(() => {
    const startTime = performance.now();
    
    // Performance マークを追加
    if (typeof performance.mark === 'function') {
      performance.mark('useKanbanTasks-categorization-start');
    }
    
    const result = selectTasksByStatus(filteredTasks);
    
    // 分類処理時間とメモリ使用量の記録
    const endTime = performance.now();
    const categorizationTime = endTime - startTime;
    const memoryUsage = measureMemoryUsage();
    
    // Performance 測定完了
    if (typeof performance.mark === 'function') {
      performance.mark('useKanbanTasks-categorization-end');
      if (typeof performance.measure === 'function') {
        try {
          performance.measure('useKanbanTasks-categorization', 'useKanbanTasks-categorization-start', 'useKanbanTasks-categorization-end');
        } catch (e) {
          // エラー処理
        }
      }
    }
    
    Promise.resolve().then(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        categorizationTime,
        memoryEfficiencyScore: Math.min(prev.memoryEfficiencyScore, memoryUsage.efficiency)
      }));
    });
    
    return result;
  }, [filteredTasks, debouncedLastUpdated, measureMemoryUsage]);
  
  // 統計情報（リアクティブ更新対応）
  const stats = useMemo(() => {
    const startTime = performance.now();
    
    // Performance マーク追加
    if (typeof performance.mark === 'function') {
      performance.mark('useKanbanTasks-stats-start');
    }
    
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
    
    // 統計計算時間とメモリ使用量の記録
    const endTime = performance.now();
    const statsCalculationTime = endTime - startTime;
    const memoryUsage = measureMemoryUsage();
    
    // Performance 測定完了
    if (typeof performance.mark === 'function') {
      performance.mark('useKanbanTasks-stats-end');
      if (typeof performance.measure === 'function') {
        try {
          performance.measure('useKanbanTasks-stats', 'useKanbanTasks-stats-start', 'useKanbanTasks-stats-end');
        } catch (e) {
          // エラー処理
        }
      }
    }
    
    Promise.resolve().then(() => {
      setPerformanceMetrics(prev => ({
        ...prev,
        statsCalculationTime,
        memoryEfficiencyScore: Math.min(prev.memoryEfficiencyScore, memoryUsage.efficiency)
      }));
    });
    
    return result;
  }, [tasksByStatus, measureMemoryUsage]);
  
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
  
  // 型ガード統計の取得
  const typeGuardStats = useMemo(() => {
    return getTypeGuardStats();
  }, [debouncedLastUpdated]); // タスクの更新時に統計を再計算

  // メモリ監視情報の提供
  const memoryMonitoring = useMemo(() => {
    const currentUsage = measureMemoryUsage();
    const history = memoryUsageHistoryRef.current.slice(); // コピーを作成
    
    // メモリ使用量トレンドの分析
    const analyzeMemoryTrend = () => {
      if (history.length < 3) return 'INSUFFICIENT_DATA';
      
      const recent = history.slice(-3);
      const isIncreasing = recent.every((reading, index) => 
        index === 0 || reading.usage < recent[index - 1].usage
      );
      const isDecreasing = recent.every((reading, index) => 
        index === 0 || reading.usage > recent[index - 1].usage
      );
      
      if (isIncreasing) return 'INCREASING';
      if (isDecreasing) return 'DECREASING';
      return 'STABLE';
    };
    
    // 平均効率の計算
    const avgEfficiency = history.length > 0 
      ? history.reduce((sum, reading) => sum + reading.usage, 0) / history.length
      : 100;
    
    return {
      current: currentUsage,
      history,
      trend: analyzeMemoryTrend(),
      avgEfficiency: Math.round(avgEfficiency * 100) / 100,
      measurements: history.length,
      timespan: history.length > 1 
        ? history[history.length - 1].timestamp - history[0].timestamp
        : 0
    };
  }, [measureMemoryUsage, debouncedLastUpdated]);

  // バリデーションキャッシュ統計（Task 2.1対応）
  const validationCacheStats = useMemo(() => {
    return getValidationCacheStats();
  }, [debouncedLastUpdated]);

  // 重複バリデーション統計（Task 2.5対応）
  const duplicateValidationStats = useMemo(() => {
    const callStats = Array.from(validationCallTracker.current.entries()).map(([key, value]) => ({
      key,
      callCount: value.callCount,
      lastCalled: value.lastCalled,
      fromCache: value.cacheHit
    }));
    
    const duplicates = callStats.filter(stat => stat.callCount > 1);
    const totalCalls = callStats.reduce((sum, stat) => sum + stat.callCount, 0);
    const cachedCalls = callStats.filter(stat => stat.fromCache).length;
    
    return {
      totalValidationCalls: totalCalls,
      duplicateCallsDetected: duplicates.length,
      cacheHitRate: totalCalls > 0 ? Math.round((cachedCalls / totalCalls) * 100) : 0,
      duplicateCallsPreventedByCache: duplicates.filter(d => d.fromCache).length,
      potentialPerformanceGain: duplicates.length > 0 ? Math.round((duplicates.length / totalCalls) * 100) : 0
    };
  }, [dataIntegrityState.duplicateValidationWarnings]);

  return {
    // 基本データ
    tasks: filteredTasks,
    tasksByStatus,
    isLoading: storeState.isLoading,
    error: storeState.error,
    stats,
    hasUpdates,
    lastUpdated: debouncedLastUpdated,
    
    // パフォーマンスメトリクス
    performanceMetrics,
    usageStats,
    typeGuardStats,
    memoryMonitoring,
    
    // Group 2 新機能
    validationCacheStats,           // Task 2.1: キャッシュ統計
    duplicateValidationStats,       // Task 2.5: 重複検知統計
    dataIntegrityState,            // Task 2.4: 整合性状態
    safeArrayAccess: SafeArrayAccess, // Task 2.3: 安全配列アクセス
    
    // デバッグ・監視情報
    loadingState: {
      isLoadingData: loadingStateRef.current.isLoading,
      pendingOperationsCount: loadingStateRef.current.pendingOperations.size,
      hasDataSnapshot: loadingStateRef.current.dataSnapshot !== null
    }
  };
};