/**
 * タスクデータ整合性チェックユーティリティ
 * Issue #026 Group 2 Task 2.2 & 2.3
 * 
 * 目的:
 * - 専用のデータ整合性検証機能
 * - 自動修復機能の提供
 * - 境界チェック付き配列アクセス
 * - データ健全性レポート生成
 */

import { Task } from '@/types/task';
import { 
  isValidTask, 
  isTask,
  isTag,
  getValidationCacheStats,
  clearValidationCache
} from './typeGuards';

/**
 * データ整合性エラーの種類
 */
export type DataIntegrityErrorType = 
  | 'STRUCTURE_VIOLATION'
  | 'REFERENCE_ERROR' 
  | 'BOUNDARY_ERROR'
  | 'CONSISTENCY_ERROR'
  | 'PERFORMANCE_DEGRADATION'
  | 'MEMORY_LEAK'
  | 'ORPHANED_DATA'
  | 'CIRCULAR_REFERENCE';

/**
 * データ整合性エラー詳細
 */
export interface DataIntegrityError {
  /** エラーID */
  id: string;
  /** エラータイプ */
  type: DataIntegrityErrorType;
  /** 重要度 */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** エラー説明 */
  message: string;
  /** 影響を受けるデータ */
  affectedData?: {
    taskId?: string;
    fieldName?: string;
    currentValue?: unknown;
    expectedType?: string;
  };
  /** 修復方法 */
  fixStrategy?: string;
  /** 自動修復可能か */
  autoFixable: boolean;
  /** 検出時刻 */
  timestamp: Date;
}

/**
 * データ整合性レポート
 */
export interface DataIntegrityReport {
  /** レポートID */
  id: string;
  /** 実行時刻 */
  executedAt: Date;
  /** チェック対象数 */
  totalChecked: number;
  /** エラー総数 */
  totalErrors: number;
  /** 重要度別エラー数 */
  errorsBySeverity: Record<DataIntegrityError['severity'], number>;
  /** 自動修復されたエラー数 */
  autoFixedCount: number;
  /** 検出されたエラー詳細 */
  errors: DataIntegrityError[];
  /** パフォーマンス統計 */
  performance: {
    executionTimeMs: number;
    memoryUsageBefore: number;
    memoryUsageAfter: number;
    cacheStats: ReturnType<typeof getValidationCacheStats>;
  };
  /** データ品質スコア (0-100) */
  qualityScore: number;
}

/**
 * 配列の安全なアクセス機能
 */
export class SafeArrayAccess {
  /**
   * 安全な配列要素取得
   * @param array 対象配列
   * @param index インデックス
   * @param defaultValue デフォルト値
   * @returns 要素またはデフォルト値
   */
  static get<T>(array: T[] | undefined | null, index: number, defaultValue?: T): T | undefined {
    if (!Array.isArray(array)) {
      return defaultValue;
    }
    
    if (index < 0 || index >= array.length) {
      return defaultValue;
    }
    
    return array[index];
  }
  
  /**
   * 安全な配列要素設定
   * @param array 対象配列
   * @param index インデックス
   * @param value 設定する値
   * @returns 成功/失敗
   */
  static set<T>(array: T[], index: number, value: T): boolean {
    if (!Array.isArray(array)) {
      return false;
    }
    
    if (index < 0 || index >= array.length) {
      return false;
    }
    
    array[index] = value;
    return true;
  }
  
  /**
   * 安全な配列スライス
   * @param array 対象配列
   * @param start 開始インデックス
   * @param end 終了インデックス
   * @returns スライスされた配列
   */
  static slice<T>(array: T[] | undefined | null, start?: number, end?: number): T[] {
    if (!Array.isArray(array)) {
      return [];
    }
    
    const len = array.length;
    const startIndex = Math.max(0, Math.min(start || 0, len));
    const endIndex = Math.max(startIndex, Math.min(end || len, len));
    
    return array.slice(startIndex, endIndex);
  }
  
  /**
   * 安全な配列検索
   * @param array 対象配列
   * @param predicate 検索条件
   * @param defaultValue デフォルト値
   * @returns 見つかった要素またはデフォルト値
   */
  static find<T>(
    array: T[] | undefined | null, 
    predicate: (item: T, index: number) => boolean, 
    defaultValue?: T
  ): T | undefined {
    if (!Array.isArray(array)) {
      return defaultValue;
    }
    
    try {
      return array.find(predicate) || defaultValue;
    } catch (error) {
      console.warn('Safe array find error:', error);
      return defaultValue;
    }
  }
  
  /**
   * 安全な配列フィルター
   * @param array 対象配列
   * @param predicate フィルター条件
   * @returns フィルターされた配列
   */
  static filter<T>(
    array: T[] | undefined | null, 
    predicate: (item: T, index: number) => boolean
  ): T[] {
    if (!Array.isArray(array)) {
      return [];
    }
    
    try {
      return array.filter(predicate);
    } catch (error) {
      console.warn('Safe array filter error:', error);
      return [];
    }
  }
}

/**
 * データ整合性チェッカー
 */
export class TaskDataIntegrityChecker {
  private errors: DataIntegrityError[] = [];
  private autoFixedCount = 0;
  private startTime = 0;
  private memoryBefore = 0;
  
  /**
   * 包括的なデータ整合性チェック実行
   * @param tasks チェック対象タスク配列
   * @param options チェックオプション
   * @returns 整合性レポート
   */
  async checkIntegrity(
    tasks: Task[],
    options: {
      enableAutoFix?: boolean;
      skipPerformanceCheck?: boolean;
      maxErrorsToReport?: number;
    } = {}
  ): Promise<DataIntegrityReport> {
    const {
      enableAutoFix = true,
      skipPerformanceCheck = false,
      maxErrorsToReport = 100
    } = options;
    
    // 初期化
    this.errors = [];
    this.autoFixedCount = 0;
    this.startTime = performance.now();
    this.memoryBefore = this.getMemoryUsage();
    
    // メイン整合性チェック
    await this.performStructureCheck(tasks);
    await this.performReferenceCheck(tasks);
    await this.performBoundaryCheck(tasks);
    await this.performConsistencyCheck(tasks);
    
    if (!skipPerformanceCheck) {
      await this.performPerformanceCheck(tasks);
    }
    
    // 自動修復実行
    if (enableAutoFix) {
      await this.performAutoFix(tasks);
    }
    
    // レポート生成
    return this.generateReport(tasks, maxErrorsToReport);
  }
  
  /**
   * 構造整合性チェック
   */
  private async performStructureCheck(tasks: Task[]): Promise<void> {
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      if (!isTask(task)) {
        this.addError({
          type: 'STRUCTURE_VIOLATION',
          severity: 'CRITICAL',
          message: `タスク構造が無効です (インデックス: ${i})`,
          affectedData: {
            taskId: (task as any)?.id || 'unknown',
            currentValue: task
          },
          autoFixable: false
        });
        continue;
      }
      
      if (!isValidTask(task)) {
        this.addError({
          type: 'STRUCTURE_VIOLATION',
          severity: 'HIGH',
          message: `タスク詳細構造が無効です: ${task.id}`,
          affectedData: {
            taskId: task.id,
            currentValue: task
          },
          autoFixable: true,
          fixStrategy: 'normalizeTaskStructure'
        });
      }
      
      // 必須フィールドの詳細チェック
      await this.checkRequiredFields(task);
      
      // タグ構造の検証
      await this.checkTagStructure(task);
    }
  }
  
  /**
   * 参照整合性チェック
   */
  private async performReferenceCheck(tasks: Task[]): Promise<void> {
    // 全タグIDを収集
    const tagIds = new Set<string>();
    tasks.forEach(task => {
      if (Array.isArray(task.tags)) {
        task.tags.forEach(tag => {
          if (isTag(tag)) {
            tagIds.add(tag.id);
          }
        });
      }
    });
    
    // 孤立したサブタスクの検出
    for (const task of tasks) {
      if (Array.isArray(task.subtasks)) {
        for (const subtask of task.subtasks) {
          if (!subtask.id || !subtask.title) {
            this.addError({
              type: 'REFERENCE_ERROR',
              severity: 'MEDIUM',
              message: `不正なサブタスク構造: ${task.id}`,
              affectedData: {
                taskId: task.id,
                currentValue: subtask
              },
              autoFixable: true,
              fixStrategy: 'removeInvalidSubtask'
            });
          }
        }
      }
    }
  }
  
  /**
   * 境界値チェック
   */
  private async performBoundaryCheck(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      // 文字列長制限チェック
      if (task.title && task.title.length > 1000) {
        this.addError({
          type: 'BOUNDARY_ERROR',
          severity: 'LOW',
          message: `タスクタイトルが長すぎます: ${task.id}`,
          affectedData: {
            taskId: task.id,
            fieldName: 'title',
            currentValue: task.title.length
          },
          autoFixable: true,
          fixStrategy: 'truncateTitle'
        });
      }
      
      // 配列サイズ制限チェック
      if (Array.isArray(task.tags) && task.tags.length > 50) {
        this.addError({
          type: 'BOUNDARY_ERROR',
          severity: 'MEDIUM',
          message: `タグ数が上限を超えています: ${task.id}`,
          affectedData: {
            taskId: task.id,
            fieldName: 'tags',
            currentValue: task.tags.length
          },
          autoFixable: true,
          fixStrategy: 'limitTags'
        });
      }
    }
  }
  
  /**
   * 一貫性チェック
   */
  private async performConsistencyCheck(tasks: Task[]): Promise<void> {
    // 重複IDチェック
    const idCounts = new Map<string, number>();
    
    tasks.forEach(task => {
      const currentCount = idCounts.get(task.id) || 0;
      idCounts.set(task.id, currentCount + 1);
    });
    
    idCounts.forEach((count, id) => {
      if (count > 1) {
        this.addError({
          type: 'CONSISTENCY_ERROR',
          severity: 'CRITICAL',
          message: `重複するタスクID: ${id}`,
          affectedData: {
            taskId: id,
            currentValue: count
          },
          autoFixable: false,
          fixStrategy: 'generateUniqueId'
        });
      }
    });
    
    // 日付の論理的整合性
    for (const task of tasks) {
      if (task.createdAt instanceof Date && 
          task.updatedAt instanceof Date &&
          task.createdAt > task.updatedAt) {
        this.addError({
          type: 'CONSISTENCY_ERROR',
          severity: 'MEDIUM',
          message: `作成日時が更新日時より新しいです: ${task.id}`,
          affectedData: {
            taskId: task.id,
            currentValue: {
              createdAt: task.createdAt,
              updatedAt: task.updatedAt
            }
          },
          autoFixable: true,
          fixStrategy: 'fixTimestampOrder'
        });
      }
    }
  }
  
  /**
   * パフォーマンスチェック
   */
  private async performPerformanceCheck(tasks: Task[]): Promise<void> {
    const cacheStats = getValidationCacheStats();
    
    // キャッシュヒット率が低い場合の警告
    if (cacheStats.hitRate < 50 && cacheStats.hits + cacheStats.misses > 100) {
      this.addError({
        type: 'PERFORMANCE_DEGRADATION',
        severity: 'LOW',
        message: `型ガードキャッシュのヒット率が低いです: ${cacheStats.hitRate}%`,
        affectedData: {
          currentValue: cacheStats
        },
        autoFixable: true,
        fixStrategy: 'optimizeValidationCache'
      });
    }
    
    // 大量データの処理時間チェック
    if (tasks.length > 1000) {
      const processingTime = performance.now() - this.startTime;
      if (processingTime > 5000) { // 5秒以上
        this.addError({
          type: 'PERFORMANCE_DEGRADATION',
          severity: 'MEDIUM',
          message: `大量データの処理時間が長いです: ${Math.round(processingTime)}ms`,
          affectedData: {
            currentValue: { taskCount: tasks.length, processingTime }
          },
          autoFixable: false,
          fixStrategy: 'considerBatchProcessing'
        });
      }
    }
  }
  
  /**
   * 自動修復実行
   */
  private async performAutoFix(tasks: Task[]): Promise<void> {
    const fixableErrors = this.errors.filter(error => error.autoFixable);
    
    for (const error of fixableErrors) {
      try {
        const fixed = await this.applyFix(error, tasks);
        if (fixed) {
          this.autoFixedCount++;
          // 修復されたエラーを除去
          this.errors = this.errors.filter(e => e.id !== error.id);
        }
      } catch (fixError) {
        console.warn(`自動修復に失敗: ${error.id}`, fixError);
      }
    }
  }
  
  /**
   * 修復実行
   */
  private async applyFix(error: DataIntegrityError, tasks: Task[]): Promise<boolean> {
    const taskId = error.affectedData?.taskId;
    if (!taskId) return false;
    
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return false;
    
    const task = tasks[taskIndex];
    
    switch (error.fixStrategy) {
      case 'normalizeTaskStructure':
        return this.normalizeTaskStructure(task);
      
      case 'removeInvalidSubtask':
        return this.removeInvalidSubtasks(task);
      
      case 'truncateTitle':
        task.title = task.title.substring(0, 1000);
        return true;
      
      case 'limitTags':
        if (Array.isArray(task.tags)) {
          task.tags = task.tags.slice(0, 50);
        }
        return true;
      
      case 'fixTimestampOrder':
        task.updatedAt = new Date(Math.max(task.createdAt.getTime(), task.updatedAt.getTime()));
        return true;
      
      case 'optimizeValidationCache':
        clearValidationCache();
        return true;
      
      default:
        return false;
    }
  }
  
  /**
   * 必須フィールドチェック
   */
  private async checkRequiredFields(task: Task): Promise<void> {
    const requiredStringFields = ['id', 'title', 'createdBy', 'updatedBy'] as const;
    
    for (const field of requiredStringFields) {
      if (!task[field] || typeof task[field] !== 'string' || task[field].trim() === '') {
        this.addError({
          type: 'STRUCTURE_VIOLATION',
          severity: 'HIGH',
          message: `必須フィールドが無効です: ${field}`,
          affectedData: {
            taskId: task.id,
            fieldName: field,
            currentValue: task[field]
          },
          autoFixable: field !== 'id', // IDは修復不可
          fixStrategy: field !== 'id' ? 'setDefaultValue' : undefined
        });
      }
    }
  }
  
  /**
   * タグ構造チェック
   */
  private async checkTagStructure(task: Task): Promise<void> {
    if (!Array.isArray(task.tags)) {
      this.addError({
        type: 'STRUCTURE_VIOLATION',
        severity: 'MEDIUM',
        message: `タグが配列ではありません: ${task.id}`,
        affectedData: {
          taskId: task.id,
          fieldName: 'tags',
          currentValue: task.tags
        },
        autoFixable: true,
        fixStrategy: 'initializeEmptyArray'
      });
      return;
    }
    
    for (let i = 0; i < task.tags.length; i++) {
      const tag = task.tags[i];
      if (!isTag(tag)) {
        this.addError({
          type: 'STRUCTURE_VIOLATION',
          severity: 'MEDIUM',
          message: `不正なタグ構造: ${task.id}[${i}]`,
          affectedData: {
            taskId: task.id,
            fieldName: `tags[${i}]`,
            currentValue: tag
          },
          autoFixable: true,
          fixStrategy: 'removeInvalidTag'
        });
      }
    }
  }
  
  /**
   * タスク構造正規化
   */
  private normalizeTaskStructure(task: Task): boolean {
    let modified = false;
    
    // 文字列フィールドの正規化
    if (typeof task.title !== 'string') {
      task.title = String(task.title || '未設定');
      modified = true;
    }
    
    if (typeof task.createdBy !== 'string') {
      task.createdBy = 'system';
      modified = true;
    }
    
    if (typeof task.updatedBy !== 'string') {
      task.updatedBy = 'system';
      modified = true;
    }
    
    // 配列フィールドの正規化
    if (!Array.isArray(task.tags)) {
      task.tags = [];
      modified = true;
    }
    
    if (!Array.isArray(task.subtasks)) {
      task.subtasks = [];
      modified = true;
    }
    
    return modified;
  }
  
  /**
   * 無効なサブタスクの削除
   */
  private removeInvalidSubtasks(task: Task): boolean {
    if (!Array.isArray(task.subtasks)) {
      return false;
    }
    
    const originalLength = task.subtasks.length;
    task.subtasks = task.subtasks.filter(subtask => 
      subtask && subtask.id && subtask.title
    );
    
    return task.subtasks.length !== originalLength;
  }
  
  /**
   * エラー追加
   */
  private addError(errorData: Omit<DataIntegrityError, 'id' | 'timestamp'>): void {
    this.errors.push({
      ...errorData,
      id: `integrity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    });
  }
  
  /**
   * メモリ使用量取得
   */
  private getMemoryUsage(): number {
    if ('memory' in performance && typeof (performance as any).memory === 'object') {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }
  
  /**
   * レポート生成
   */
  private generateReport(tasks: Task[], maxErrors: number): DataIntegrityReport {
    const executionTime = performance.now() - this.startTime;
    const memoryAfter = this.getMemoryUsage();
    
    const errorsBySeverity = this.errors.reduce(
      (acc, error) => {
        acc[error.severity]++;
        return acc;
      },
      { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    );
    
    const qualityScore = Math.max(0, 100 - (
      errorsBySeverity.CRITICAL * 25 +
      errorsBySeverity.HIGH * 10 +
      errorsBySeverity.MEDIUM * 5 +
      errorsBySeverity.LOW * 1
    ));
    
    return {
      id: `integrity_report_${Date.now()}`,
      executedAt: new Date(),
      totalChecked: tasks.length,
      totalErrors: this.errors.length,
      errorsBySeverity,
      autoFixedCount: this.autoFixedCount,
      errors: this.errors.slice(0, maxErrors),
      performance: {
        executionTimeMs: Math.round(executionTime),
        memoryUsageBefore: this.memoryBefore,
        memoryUsageAfter: memoryAfter,
        cacheStats: getValidationCacheStats()
      },
      qualityScore: Math.round(qualityScore)
    };
  }
}

/**
 * 簡易データ整合性チェック関数
 * @param tasks チェック対象タスク
 * @param enableAutoFix 自動修復を有効にするか
 * @returns 整合性レポート
 */
export const checkTaskDataIntegrity = async (
  tasks: Task[], 
  enableAutoFix = true
): Promise<DataIntegrityReport> => {
  const checker = new TaskDataIntegrityChecker();
  return await checker.checkIntegrity(tasks, { enableAutoFix });
};

/**
 * データ品質スコア計算
 * @param tasks タスク配列
 * @returns 品質スコア (0-100)
 */
export const calculateDataQualityScore = async (tasks: Task[]): Promise<number> => {
  const report = await checkTaskDataIntegrity(tasks, false);
  return report.qualityScore;
};

/**
 * 高速データ健全性チェック（パフォーマンス重視）
 * @param tasks タスク配列
 * @returns 基本的な健全性フラグ
 */
export const quickHealthCheck = (tasks: Task[]): {
  isHealthy: boolean;
  criticalIssueCount: number;
  highIssueCount: number;
} => {
  let criticalIssues = 0;
  let highIssues = 0;
  
  for (const task of tasks) {
    // 高速基本チェック
    if (!task.id || typeof task.id !== 'string') {
      criticalIssues++;
      continue;
    }
    
    if (!isValidTask(task)) {
      highIssues++;
    }
  }
  
  return {
    isHealthy: criticalIssues === 0 && highIssues < tasks.length * 0.1, // 10%以下なら健全
    criticalIssueCount: criticalIssues,
    highIssueCount: highIssues
  };
};