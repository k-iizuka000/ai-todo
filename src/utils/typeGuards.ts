/**
 * 型ガード関数群
 * ランタイムでの型安全性を提供する
 */

import { TaskStatus, Priority, Task, Subtask } from '@/types/task';
import { Tag } from '@/types/tag';
import { 
  ScheduleItemType, 
  ScheduleItemStatus, 
  ScheduleItem, 
  ScheduleViewSettings,
  DailySchedule 
} from '@/types/schedule';

/**
 * TaskStatus型のガード関数
 */
export const isTaskStatus = (value: unknown): value is TaskStatus => {
  return typeof value === 'string' && 
    ['todo', 'in_progress', 'done', 'archived'].includes(value);
};

/**
 * Priority型のガード関数
 */
export const isPriority = (value: unknown): value is Priority => {
  return typeof value === 'string' && 
    ['low', 'medium', 'high', 'urgent', 'critical'].includes(value);
};

/**
 * Tagオブジェクトの型ガード
 */
export const isTag = (value: unknown): value is Tag => {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as Tag).id === 'string' &&
    typeof (value as Tag).name === 'string' &&
    typeof (value as Tag).color === 'string';
};

/**
 * Subtaskオブジェクトの型ガード
 */
export const isSubtask = (value: unknown): value is Subtask => {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as Subtask).id === 'string' &&
    typeof (value as Subtask).title === 'string' &&
    typeof (value as Subtask).completed === 'boolean' &&
    (value as Subtask).createdAt instanceof Date &&
    (value as Subtask).updatedAt instanceof Date;
};

/**
 * Taskオブジェクトの型ガード（基本検証）
 */
export const isTask = (value: unknown): value is Task => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const task = value as Task;

  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    isTaskStatus(task.status) &&
    isPriority(task.priority) &&
    Array.isArray(task.tags) &&
    task.tags.every(isTag) &&
    Array.isArray(task.subtasks) &&
    task.subtasks.every(isSubtask) &&
    task.createdAt instanceof Date &&
    task.updatedAt instanceof Date &&
    typeof task.createdBy === 'string' &&
    typeof task.updatedBy === 'string'
  );
};

// ===== 高性能型ガード実装 =====

/**
 * 型ガード結果キャッシュ
 * WeakMapを使用してメモリリークを防止
 */
const validationCache = new WeakMap<object, boolean>();

/**
 * キャッシュ統計
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  cacheSize: number;
}

let cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  cacheSize: 0
};


/**
 * キャッシュクリア
 */
export const clearValidationCache = (): void => {
  // WeakMapはclearメソッドがないため、新しいインスタンスを作成
  const newCache = new WeakMap<object, boolean>();
  (validationCache as any) = newCache;
  cacheStats = { hits: 0, misses: 0, hitRate: 0, cacheSize: 0 };
};

/**
 * 高速な基本型チェック（プリミティブ値用）
 */
const fastPrimitiveCheck = (value: unknown): boolean => {
  // null, undefined, プリミティブ値は即座に false を返す
  return value !== null && 
         value !== undefined && 
         typeof value === 'object' && 
         !Array.isArray(value);
};

/**
 * 高速文字列チェック（最適化版）
 */
const isNonEmptyStringFast = (value: unknown): boolean => {
  return typeof value === 'string' && value.length > 0 && value.trim().length > 0;
};


/**
 * 高速日付比較（最適化版）
 */
const isValidDateOrderFast = (createdAt: unknown, updatedAt: unknown): boolean => {
  // 両方がDateインスタンスの場合のみ比較
  if (createdAt instanceof Date && updatedAt instanceof Date) {
    return createdAt.getTime() <= updatedAt.getTime();
  }
  return true; // 不明な場合は通す（他の検証で捕捉）
};

/**
 * Taskオブジェクトの詳細検証（キャッシュ機能付き最適化版）
 */
export const isValidTask = (value: unknown): value is Task => {
  // プリミティブ値の早期除外
  if (!fastPrimitiveCheck(value)) {
    return false;
  }

  const obj = value as object;
  
  // キャッシュチェック
  if (validationCache.has(obj)) {
    cacheStats.hits++;
    return validationCache.get(obj)!;
  }
  
  cacheStats.misses++;
  
  // 基本構造チェック
  if (!isTask(value)) {
    validationCache.set(obj, false);
    return false;
  }

  const task = value as Task;
  
  // 最適化された詳細検証
  const isValid = (
    isNonEmptyStringFast(task.id) &&
    isNonEmptyStringFast(task.title) &&
    isNonEmptyStringFast(task.createdBy) &&
    isNonEmptyStringFast(task.updatedBy) &&
    isValidDateOrderFast(task.createdAt, task.updatedAt)
  );

  // 結果をキャッシュに保存
  validationCache.set(obj, isValid);
  
  return isValid;
};

/**
 * Taskオブジェクトの詳細検証（従来版 - 後方互換性のため保持）
 */
export const isValidTaskLegacy = (value: unknown): value is Task => {
  if (!isTask(value)) {
    return false;
  }

  const task = value as Task;

  // 追加の検証ロジック
  return (
    task.id.length > 0 &&
    task.title.trim().length > 0 &&
    task.createdBy.length > 0 &&
    task.updatedBy.length > 0 &&
    task.createdAt <= task.updatedAt
  );
};

/**
 * 配列内の全てがTask型かどうかチェック
 */
export const isTaskArray = (value: unknown): value is Task[] => {
  return Array.isArray(value) && value.every(isTask);
};

/**
 * 文字列が空でないかチェック
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * 日付が有効かチェック
 */
export const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

/**
 * Date型またはISO文字列形式の有効な日付かチェック
 * @param value - チェックする値
 * @returns Date型またはISO形式の文字列として有効な日付の場合true
 */
export const isDateOrDateString = (value: unknown): value is Date | string => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return true;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }
  return false;
};

/**
 * ISO 8601形式の日付文字列かチェック
 * @param value - チェックする値
 * @returns ISO 8601形式の文字列の場合true
 */
export const isISODateString = (value: unknown): value is string => {
  return typeof value === 'string' && 
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value);
};

/**
 * Date型またはISO文字列を安全にDate型に変換
 * @param value - 変換する値
 * @returns 有効なDate型または現在日時（フォールバック）
 */
export const toSafeDate = (value: unknown): Date => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  // フォールバック: 現在日時を返す
  console.warn('Invalid date provided to toSafeDate, using current date:', value);
  return new Date();
};

// === スケジュール関連の型ガード ===

/**
 * ScheduleItemType型のガード関数
 * @param value - チェックする値
 * @returns ScheduleItemTypeの場合true
 */
export const isScheduleItemType = (value: unknown): value is ScheduleItemType => {
  return typeof value === 'string' && 
    ['task', 'subtask', 'meeting', 'break', 'personal', 'blocked', 'focus', 'review'].includes(value);
};

/**
 * ScheduleItemStatus型のガード関数
 * @param value - チェックする値
 * @returns ScheduleItemStatusの場合true
 */
export const isScheduleItemStatus = (value: unknown): value is ScheduleItemStatus => {
  return typeof value === 'string' && 
    ['planned', 'in_progress', 'completed', 'postponed', 'cancelled'].includes(value);
};

/**
 * 時刻文字列（HH:mm形式）の型ガード
 * @param value - チェックする値
 * @returns HH:mm形式の文字列の場合true
 */
export const isTimeString = (value: unknown): value is string => {
  return typeof value === 'string' && 
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
};

/**
 * ScheduleItemオブジェクトの型ガード（基本検証）
 * @param value - チェックする値
 * @returns ScheduleItemの場合true
 */
export const isScheduleItem = (value: unknown): value is ScheduleItem => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as ScheduleItem;

  return (
    typeof item.id === 'string' &&
    typeof item.timeBlockId === 'string' &&
    isScheduleItemType(item.type) &&
    typeof item.title === 'string' &&
    isTimeString(item.startTime) &&
    isTimeString(item.endTime) &&
    typeof item.duration === 'number' &&
    typeof item.color === 'string' &&
    isScheduleItemStatus(item.status) &&
    isPriority(item.priority) &&
    item.createdAt instanceof Date &&
    item.updatedAt instanceof Date &&
    typeof item.createdBy === 'string'
  );
};

/**
 * ScheduleViewSettingsオブジェクトの型ガード
 * @param value - チェックする値
 * @returns ScheduleViewSettingsの場合true
 */
export const isScheduleViewSettings = (value: unknown): value is ScheduleViewSettings => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as ScheduleViewSettings;

  return (
    typeof settings.viewType === 'string' &&
    ['day', 'week', 'workweek'].includes(settings.viewType) &&
    isDateOrDateString(settings.date) &&
    typeof settings.timeRange === 'object' &&
    settings.timeRange !== null &&
    isTimeString(settings.timeRange.start) &&
    isTimeString(settings.timeRange.end) &&
    typeof settings.showWeekends === 'boolean' &&
    typeof settings.showCompleted === 'boolean'
  );
};

/**
 * DailyScheduleオブジェクトの型ガード（基本検証）
 * @param value - チェックする値
 * @returns DailyScheduleの場合true
 */
export const isDailySchedule = (value: unknown): value is DailySchedule => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const schedule = value as DailySchedule;

  return (
    typeof schedule.id === 'string' &&
    isDateOrDateString(schedule.date) &&
    typeof schedule.userId === 'string' &&
    Array.isArray(schedule.timeBlocks) &&
    Array.isArray(schedule.scheduleItems) &&
    schedule.scheduleItems.every(item => isScheduleItem(item)) &&
    typeof schedule.totalEstimated === 'number' &&
    typeof schedule.totalActual === 'number' &&
    typeof schedule.utilization === 'number' &&
    schedule.createdAt instanceof Date &&
    schedule.updatedAt instanceof Date
  );
};

/**
 * 数値が正の値かチェック
 */
export const isPositiveNumber = (value: unknown): value is number => {
  return typeof value === 'number' && value > 0 && !isNaN(value);
};

/**
 * 型ガードのエラー処理用ヘルパー関数
 */
export class TypeGuardError extends Error {
  constructor(
    message: string,
    public readonly value: unknown,
    public readonly expectedType: string
  ) {
    super(message);
    this.name = 'TypeGuardError';
  }
}

/**
 * 型ガード失敗時のエラーを投げるヘルパー関数
 */
export const assertTaskStatus = (value: unknown): TaskStatus => {
  if (isTaskStatus(value)) {
    return value;
  }
  throw new TypeGuardError(
    `Expected TaskStatus but received: ${typeof value}`,
    value,
    'TaskStatus'
  );
};

export const assertPriority = (value: unknown): Priority => {
  if (isPriority(value)) {
    return value;
  }
  throw new TypeGuardError(
    `Expected Priority but received: ${typeof value}`,
    value,
    'Priority'
  );
};

export const assertTask = (value: unknown): Task => {
  if (isValidTask(value)) {
    return value;
  }
  throw new TypeGuardError(
    `Expected valid Task but received invalid object`,
    value,
    'Task'
  );
};

/**
 * デバッグ用の型情報表示
 */
export const getTypeInfo = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (typeof value === 'object') {
    return `Object(${Object.keys(value).join(', ')})`;
  }
  return typeof value;
};

// ===== 統計収集機能 =====

/**
 * 型ガード実行統計の型定義
 */
export interface TypeGuardStats {
  /** 関数名 */
  functionName: string;
  /** 実行回数 */
  callCount: number;
  /** 成功回数 */
  successCount: number;
  /** 失敗回数 */
  failureCount: number;
  /** 成功率（パーセント） */
  successRate: number;
  /** 平均実行時間（ミリ秒） */
  avgExecutionTime: number;
  /** 最後の実行時刻 */
  lastExecuted: Date;
  /** エラー統計 */
  errorStats: {
    /** TypeGuardError の発生回数 */
    typeGuardErrors: number;
    /** その他のエラー回数 */
    otherErrors: number;
  };
}

/**
 * 全体統計
 */
export interface OverallTypeGuardStats {
  /** 関数別統計 */
  functionStats: Record<string, TypeGuardStats>;
  /** 全体統計 */
  overall: {
    totalCalls: number;
    totalSuccesses: number;
    totalFailures: number;
    overallSuccessRate: number;
    totalTypeGuardErrors: number;
    mostUsedFunction: string | null;
    leastReliableFunction: string | null;
  };
  /** 統計開始時刻 */
  statsStartTime: Date;
  /** 最後の更新時刻 */
  lastUpdated: Date;
}

/**
 * 統計データのストレージ
 */
class TypeGuardStatsCollector {
  private stats: Record<string, TypeGuardStats> = {};
  private startTime: Date = new Date();
  
  /**
   * 関数実行の記録
   */
  recordExecution(
    functionName: string,
    success: boolean,
    executionTime: number,
    error?: Error
  ) {
    if (!this.stats[functionName]) {
      this.stats[functionName] = {
        functionName,
        callCount: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgExecutionTime: 0,
        lastExecuted: new Date(),
        errorStats: {
          typeGuardErrors: 0,
          otherErrors: 0
        }
      };
    }
    
    const stat = this.stats[functionName];
    stat.callCount++;
    stat.lastExecuted = new Date();
    
    if (success) {
      stat.successCount++;
    } else {
      stat.failureCount++;
      
      if (error instanceof TypeGuardError) {
        stat.errorStats.typeGuardErrors++;
      } else {
        stat.errorStats.otherErrors++;
      }
    }
    
    // 成功率の計算
    stat.successRate = Math.round((stat.successCount / stat.callCount) * 100);
    
    // 平均実行時間の計算（移動平均）
    stat.avgExecutionTime = (stat.avgExecutionTime * (stat.callCount - 1) + executionTime) / stat.callCount;
  }
  
  /**
   * 統計データの取得
   */
  getStats(): OverallTypeGuardStats {
    const functionStats = { ...this.stats };
    
    // 全体統計の計算
    const overall = Object.values(functionStats).reduce(
      (acc, stat) => {
        acc.totalCalls += stat.callCount;
        acc.totalSuccesses += stat.successCount;
        acc.totalFailures += stat.failureCount;
        acc.totalTypeGuardErrors += stat.errorStats.typeGuardErrors;
        return acc;
      },
      {
        totalCalls: 0,
        totalSuccesses: 0,
        totalFailures: 0,
        overallSuccessRate: 0,
        totalTypeGuardErrors: 0,
        mostUsedFunction: null as string | null,
        leastReliableFunction: null as string | null
      }
    );
    
    if (overall.totalCalls > 0) {
      overall.overallSuccessRate = Math.round((overall.totalSuccesses / overall.totalCalls) * 100);
    }
    
    // 最も使用された関数
    const sortedByCalls = Object.values(functionStats).sort((a, b) => b.callCount - a.callCount);
    if (sortedByCalls.length > 0) {
      overall.mostUsedFunction = sortedByCalls[0].functionName;
    }
    
    // 最も信頼性の低い関数（成功率が最も低い）
    const sortedByReliability = Object.values(functionStats)
      .filter(stat => stat.callCount >= 5) // 最低5回は実行されている関数のみ
      .sort((a, b) => a.successRate - b.successRate);
    if (sortedByReliability.length > 0) {
      overall.leastReliableFunction = sortedByReliability[0].functionName;
    }
    
    return {
      functionStats,
      overall,
      statsStartTime: this.startTime,
      lastUpdated: new Date()
    };
  }
  
  /**
   * 統計データのリセット
   */
  resetStats() {
    this.stats = {};
    this.startTime = new Date();
  }
  
  /**
   * CSV形式での統計エクスポート
   */
  exportToCsv(): string {
    const headers = [
      'Function Name',
      'Call Count',
      'Success Count', 
      'Failure Count',
      'Success Rate (%)',
      'Avg Execution Time (ms)',
      'Last Executed',
      'Type Guard Errors',
      'Other Errors'
    ];
    
    const rows = Object.values(this.stats).map(stat => [
      stat.functionName,
      stat.callCount.toString(),
      stat.successCount.toString(),
      stat.failureCount.toString(),
      stat.successRate.toString(),
      stat.avgExecutionTime.toFixed(3),
      stat.lastExecuted.toISOString(),
      stat.errorStats.typeGuardErrors.toString(),
      stat.errorStats.otherErrors.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

/**
 * グローバル統計コレクター
 */
const globalStatsCollector = new TypeGuardStatsCollector();

/**
 * 型ガード関数実行を監視するデコレータ関数
 */
const withStats = <T extends unknown[], R>(
  fn: (...args: T) => R,
  functionName: string
): ((...args: T) => R) => {
  return (...args: T): R => {
    const startTime = performance.now();
    let success = false;
    let error: Error | undefined;
    let result: R;
    
    try {
      result = fn(...args);
      success = true;
      return result;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw e;
    } finally {
      const executionTime = performance.now() - startTime;
      globalStatsCollector.recordExecution(functionName, success, executionTime, error);
    }
  };
};

/**
 * 統計データの取得
 */
export const getTypeGuardStats = (): OverallTypeGuardStats => {
  return globalStatsCollector.getStats();
};

/**
 * 統計データのリセット
 */
export const resetTypeGuardStats = (): void => {
  globalStatsCollector.resetStats();
};

/**
 * 統計データのCSVエクスポート
 */
export const exportTypeGuardStatsToCSV = (): string => {
  return globalStatsCollector.exportToCsv();
};

/**
 * デバッグ用の統計表示
 */
export const logTypeGuardStats = (): void => {
  const stats = globalStatsCollector.getStats();
  console.group('🔍 Type Guard Statistics');
  console.table(Object.values(stats.functionStats));
  console.log('Overall Stats:', stats.overall);
  console.log('Stats Duration:', 
    ((stats.lastUpdated.getTime() - stats.statsStartTime.getTime()) / 1000).toFixed(2) + 's'
  );
  console.groupEnd();
};

// ===== 統計機能付き型ガード関数の再定義 =====

/**
 * 統計機能付きTaskStatus型ガード関数
 */
export const isTaskStatusWithStats = withStats(isTaskStatus, 'isTaskStatus');

/**
 * 統計機能付きPriority型ガード関数  
 */
export const isPriorityWithStats = withStats(isPriority, 'isPriority');

/**
 * 統計機能付きTag型ガード関数
 */
export const isTagWithStats = withStats(isTag, 'isTag');

/**
 * 統計機能付きSubtask型ガード関数
 */
export const isSubtaskWithStats = withStats(isSubtask, 'isSubtask');

/**
 * 統計機能付きTask型ガード関数
 */
export const isTaskWithStats = withStats(isTask, 'isTask');

/**
 * 統計機能付きValidTask型ガード関数
 */
export const isValidTaskWithStats = withStats(isValidTask, 'isValidTask');

/**
 * 統計機能付きScheduleItem型ガード関数
 */
export const isScheduleItemWithStats = withStats(isScheduleItem, 'isScheduleItem');

// ===== 開発環境でのホット統計監視 =====

/**
 * 開発環境での統計監視を開始
 */
export const startStatsMonitoring = (intervalMs: number = 30000): (() => void) => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return () => {}; // サーバーサイドまたは本番環境では何もしない
  }
  
  const interval = setInterval(() => {
    const stats = globalStatsCollector.getStats();
    if (stats.overall.totalCalls > 0) {
      console.log('📊 Type Guard Stats Update:', {
        totalCalls: stats.overall.totalCalls,
        successRate: stats.overall.overallSuccessRate + '%',
        mostUsed: stats.overall.mostUsedFunction,
        errors: stats.overall.totalTypeGuardErrors
      });
    }
  }, intervalMs);
  
  console.log('📊 Type Guard monitoring started');
  
  return () => {
    clearInterval(interval);
    console.log('📊 Type Guard monitoring stopped');
  };
};

// ===== バリデーション呼び出し追跡機能 =====

/**
 * バリデーション呼び出し情報の型定義
 */
interface ValidationCallInfo {
  functionName: string;
  type: 'info' | 'error' | 'recovery' | 'warning';
  timestamp: number;
  context?: any;
}

/**
 * バリデーション呼び出し追跡ストレージ
 */
class ValidationCallTracker {
  private calls: ValidationCallInfo[] = [];
  private maxHistory = 1000; // 最大1000件のログを保持

  /**
   * バリデーション呼び出しの記録
   */
  track(functionName: string, type: ValidationCallInfo['type'], timestamp: number, context?: any) {
    this.calls.push({
      functionName,
      type,
      timestamp,
      context
    });

    // 古い記録を削除（メモリリーク防止）
    if (this.calls.length > this.maxHistory) {
      this.calls = this.calls.slice(-this.maxHistory);
    }

    // 開発環境でのログ出力
    if (process.env.NODE_ENV === 'development' && type === 'error') {
      console.warn(`🔍 Validation Call [${type.toUpperCase()}]: ${functionName}`, context);
    }
  }

  /**
   * 呼び出し履歴の取得
   */
  getHistory(functionName?: string, type?: ValidationCallInfo['type']): ValidationCallInfo[] {
    let filtered = this.calls;

    if (functionName) {
      filtered = filtered.filter(call => call.functionName === functionName);
    }

    if (type) {
      filtered = filtered.filter(call => call.type === type);
    }

    return filtered;
  }

  /**
   * 重複呼び出しの検知
   */
  detectDuplicateCalls(windowMs = 100): ValidationCallInfo[] {
    const duplicates: ValidationCallInfo[] = [];
    const seen = new Map<string, ValidationCallInfo>();

    for (const call of this.calls) {
      const key = `${call.functionName}-${call.type}`;
      const previous = seen.get(key);

      if (previous && (call.timestamp - previous.timestamp) < windowMs) {
        duplicates.push(call);
      } else {
        seen.set(key, call);
      }
    }

    return duplicates;
  }

  /**
   * 統計情報の取得
   */
  getStats() {
    const stats = {
      totalCalls: this.calls.length,
      byType: {} as Record<string, number>,
      byFunction: {} as Record<string, number>,
      duplicates: this.detectDuplicateCalls().length
    };

    for (const call of this.calls) {
      stats.byType[call.type] = (stats.byType[call.type] || 0) + 1;
      stats.byFunction[call.functionName] = (stats.byFunction[call.functionName] || 0) + 1;
    }

    return stats;
  }

  /**
   * 履歴のクリア
   */
  clear() {
    this.calls = [];
  }
}

/**
 * グローバルバリデーション追跡インスタンス
 */
const globalValidationTracker = new ValidationCallTracker();

/**
 * バリデーション呼び出し追跡関数
 * Issue #026 Group 3: エラーハンドリング・UX改善で使用
 */
export const trackValidationCall = (
  functionName: string, 
  type: 'info' | 'error' | 'recovery' | 'warning' = 'info',
  timestamp: number,
  context?: any
): void => {
  globalValidationTracker.track(functionName, type, timestamp, context);
};

/**
 * バリデーション呼び出し履歴の取得
 */
export const getValidationCallHistory = (
  functionName?: string, 
  type?: 'info' | 'error' | 'recovery' | 'warning'
): ValidationCallInfo[] => {
  return globalValidationTracker.getHistory(functionName, type);
};

/**
 * 重複バリデーション呼び出しの検知
 */
export const detectDuplicateValidationCalls = (windowMs = 100): ValidationCallInfo[] => {
  return globalValidationTracker.detectDuplicateCalls(windowMs);
};

/**
 * バリデーション統計の取得
 */
export const getValidationStats = () => {
  return globalValidationTracker.getStats();
};

/**
 * バリデーション履歴のクリア
 */
export const clearValidationHistory = (): void => {
  globalValidationTracker.clear();
};

// ===== バリデーションキャッシュ統計機能 =====

/**
 * バリデーションキャッシュ統計の型定義
 */
export interface ValidationCacheStats {
  /** キャッシュヒット回数 */
  hits: number;
  /** キャッシュミス回数 */
  misses: number;
  /** ヒット率 */
  hitRate: number;
  /** キャッシュサイズ */
  size: number;
  /** 最後のリセット時刻 */
  lastResetAt: Date;
}

/**
 * グローバルキャッシュ統計
 */
let validationCacheStats: ValidationCacheStats = {
  hits: 0,
  misses: 0,
  hitRate: 0,
  size: 0,
  lastResetAt: new Date()
};

/**
 * バリデーションキャッシュ統計の取得
 */
export const getValidationCacheStats = (): ValidationCacheStats => {
  // ヒット率の計算
  const total = validationCacheStats.hits + validationCacheStats.misses;
  validationCacheStats.hitRate = total > 0 ? (validationCacheStats.hits / total) * 100 : 0;
  
  return { ...validationCacheStats };
};

/**
 * キャッシュヒットの記録
 */
export const recordCacheHit = (): void => {
  validationCacheStats.hits++;
};

/**
 * キャッシュミスの記録
 */
export const recordCacheMiss = (): void => {
  validationCacheStats.misses++;
};

/**
 * キャッシュサイズの更新
 */
export const updateCacheSize = (size: number): void => {
  validationCacheStats.size = size;
};

/**
 * キャッシュ統計のリセット
 */
export const resetCacheStats = (): void => {
  validationCacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    lastResetAt: new Date()
  };
};