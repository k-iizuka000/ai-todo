/**
 * API リトライ機能実装
 * 設計書の指数バックオフ戦略に基づく
 */

import { isRetryableError, isApiError, isNetworkError, isTimeoutError } from './errors';
import { logger, logPerformanceMetrics } from '../logger';

/**
 * リトライ設定（統合強化版）
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries: number;
  /** 初期遅延時間（ミリ秒） */
  initialDelay: number;
  /** 最大遅延時間（ミリ秒） */
  maxDelay: number;
  /** バックオフ乗数 */
  backoffMultiplier: number;
  /** ジッター（遅延時間のランダム化）を有効にするか */
  enableJitter: boolean;
  /** リトライ可能なエラーの判定関数 */
  isRetryable?: (error: any) => boolean;
  /** エラー分類による動的リトライ戦略 */
  adaptiveStrategy?: boolean;
  /** サーキットブレーカー機能を有効にするか */
  enableCircuitBreaker?: boolean;
  /** サーキットブレーカーのエラー率閾値 */
  circuitBreakerThreshold?: number;
  /** パフォーマンス監視を有効にするか */
  enablePerformanceMonitoring?: boolean;
}

/**
 * デフォルトリトライ設定（統合強化版）
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  maxDelay: 30000,   // 30秒
  backoffMultiplier: 2,
  enableJitter: true,
  isRetryable: isRetryableError,
  adaptiveStrategy: true,
  enableCircuitBreaker: false,
  circuitBreakerThreshold: 0.5, // 50%エラー率
  enablePerformanceMonitoring: true
};

/**
 * 指数バックオフによる遅延時間を計算
 */
const calculateDelay = (
  attempt: number, 
  config: RetryConfig
): number => {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  if (!config.enableJitter) {
    return cappedDelay;
  }
  
  // ジッターを追加（±25%のランダム性）
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(0, cappedDelay + jitter);
};

/**
 * 遅延実行のためのスリープ関数
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * リトライ実行の詳細情報（統合強化版）
 */
export interface RetryAttempt {
  attempt: number;
  error: any;
  delay: number;
  timestamp: string;
  errorType: string;
  errorCategory: 'network' | 'server' | 'client' | 'timeout' | 'unknown';
  retryReason: string;
  adaptedDelay?: number;
}

/**
 * リトライ統計情報（統合強化版）
 */
export interface RetryStats {
  totalAttempts: number;
  totalDelay: number;
  attempts: RetryAttempt[];
  success: boolean;
  finalError?: any;
  errorCategories: Record<string, number>;
  performanceMetrics?: {
    totalDuration: number;
    averageRetryDelay: number;
    maxRetryDelay: number;
    adaptiveAdjustments: number;
  };
  circuitBreakerStatus?: 'closed' | 'open' | 'half-open';
}

/**
 * リトライ機能付きの非同期関数実行
 */
export class RetryManager {
  private config: RetryConfig;
  private stats: RetryStats;
  private operationHistory: Array<{ timestamp: number; success: boolean }> = [];
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
  private lastCircuitBreakerCheck = Date.now();
  private adaptiveDelayMultiplier = 1;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.stats = {
      totalAttempts: 0,
      totalDelay: 0,
      attempts: [],
      success: false,
      errorCategories: {},
      circuitBreakerStatus: this.circuitBreakerState
    };
  }

  /**
   * リトライ統計情報を取得
   */
  getStats(): RetryStats {
    return { ...this.stats };
  }

  /**
   * リトライ統計をリセット
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      totalDelay: 0,
      attempts: [],
      success: false,
      errorCategories: {},
      circuitBreakerStatus: this.circuitBreakerState
    };
  }

  /**
   * 関数をリトライ機能付きで実行（統合強化版）
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'API Request'
  ): Promise<T> {
    this.resetStats();
    const startTime = Date.now();
    let lastError: any;

    // サーキットブレーカーチェック
    if (this.config.enableCircuitBreaker && this.isCircuitOpen()) {
      throw new Error(`Circuit breaker is open for ${operationName}. Service temporarily unavailable.`);
    }

    // パフォーマンス監視開始
    const performanceTimer = this.config.enablePerformanceMonitoring ? 
      logger.startPerformanceTimer(`RetryManager.${operationName}`) : null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.stats.totalAttempts++;
        
        // 最初の試行以外は遅延を挟む
        if (attempt > 0) {
          const baseDelay = calculateDelay(attempt - 1, this.config);
          const adaptedDelay = this.config.adaptiveStrategy ? 
            this.adaptDelay(baseDelay, lastError, attempt) : baseDelay;
            
          this.stats.totalDelay += adaptedDelay;
          
          // 統合ログシステムでリトライ詳細をログ
          logger.warn(`Retry attempt for ${operationName}`, {
            category: 'retry',
            attempt,
            maxRetries: this.config.maxRetries,
            delay: adaptedDelay,
            errorType: this.classifyError(lastError).errorType,
            adaptiveMultiplier: this.adaptiveDelayMultiplier
          });
          
          await sleep(adaptedDelay);
        }

        const result = await operation();
        this.stats.success = true;
        
        // 成功記録
        this.recordOperationResult(true);
        
        if (attempt > 0) {
          logger.info(`Operation succeeded after retries`, {
            category: 'retry',
            operationName,
            attempts: attempt + 1,
            totalDelay: this.stats.totalDelay
          });
        }
        
        // パフォーマンス監視終了
        if (performanceTimer) {
          performanceTimer();
          this.updatePerformanceMetrics(startTime);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        const errorClassification = this.classifyError(error);
        
        // エラー統計を更新
        this.stats.errorCategories[errorClassification.errorCategory] = 
          (this.stats.errorCategories[errorClassification.errorCategory] || 0) + 1;
        
        // リトライ試行を記録
        const attemptInfo: RetryAttempt = {
          attempt,
          error,
          delay: attempt > 0 ? calculateDelay(attempt - 1, this.config) : 0,
          timestamp: new Date().toISOString(),
          errorType: errorClassification.errorType,
          errorCategory: errorClassification.errorCategory,
          retryReason: errorClassification.retryReason
        };
        this.stats.attempts.push(attemptInfo);

        // 適応的リトライ判定
        const shouldRetry = this.shouldRetryWithAdaptiveStrategy(error, attempt);
        
        if (!shouldRetry) {
          logger.warn(`Non-retryable error in ${operationName}`, {
            category: 'retry',
            error: error.message,
            errorType: errorClassification.errorType,
            attempt
          });
          break;
        }
        
        if (attempt === this.config.maxRetries) {
          logger.error(`Max retries exceeded for ${operationName}`, {
            category: 'retry',
            maxRetries: this.config.maxRetries,
            totalAttempts: this.stats.totalAttempts,
            errorCategories: this.stats.errorCategories,
            finalError: error.message
          });
          break;
        }

        // 中間的なリトライ警告
        logger.debug(`Retry attempt failed for ${operationName}`, {
          category: 'retry',
          attempt: attempt + 1,
          error: error.message,
          errorCategory: errorClassification.errorCategory
        });
      }
    }

    // 失敗記録
    this.recordOperationResult(false);
    this.stats.finalError = lastError;
    
    // パフォーマンス監視終了
    if (performanceTimer) {
      performanceTimer();
      this.updatePerformanceMetrics(startTime);
    }
    
    throw lastError;
  }
  
  /**
   * エラーを分類して適切なリトライ戦略を決定
   */
  private classifyError(error: any): {
    errorType: string;
    errorCategory: 'network' | 'server' | 'client' | 'timeout' | 'unknown';
    retryReason: string;
  } {
    if (isNetworkError(error)) {
      return {
        errorType: 'NetworkError',
        errorCategory: 'network',
        retryReason: 'Network connectivity issue - likely transient'
      };
    }
    
    if (isTimeoutError(error)) {
      return {
        errorType: 'TimeoutError',
        errorCategory: 'timeout',
        retryReason: 'Request timeout - server may be overloaded'
      };
    }
    
    if (isApiError(error)) {
      if (error.status >= 500) {
        return {
          errorType: 'ServerError',
          errorCategory: 'server',
          retryReason: 'Server error - likely transient server issue'
        };
      } else if (error.status === 429) {
        return {
          errorType: 'RateLimitError',
          errorCategory: 'server',
          retryReason: 'Rate limit exceeded - backoff and retry'
        };
      } else {
        return {
          errorType: 'ClientError',
          errorCategory: 'client',
          retryReason: 'Client error - unlikely to succeed on retry'
        };
      }
    }
    
    return {
      errorType: error.constructor.name || 'UnknownError',
      errorCategory: 'unknown',
      retryReason: 'Unknown error type - applying default retry logic'
    };
  }
  
  /**
   * 適応的リトライ戦略による判定
   */
  private shouldRetryWithAdaptiveStrategy(error: any, attempt: number): boolean {
    const classification = this.classifyError(error);
    
    // 基本的なリトライ可能性チェック
    const basicRetryable = this.config.isRetryable?.(error) ?? false;
    if (!basicRetryable) return false;
    
    // 適応戦略が無効な場合は基本判定のみ
    if (!this.config.adaptiveStrategy) return basicRetryable;
    
    // エラー分類による適応的判定
    switch (classification.errorCategory) {
      case 'network':
      case 'timeout':
        return true; // 常にリトライ
        
      case 'server':
        if (isApiError(error) && error.status === 429) {
          // レート制限の場合、より長い遅延を適用
          this.adaptiveDelayMultiplier = Math.min(this.adaptiveDelayMultiplier * 1.5, 4);
        }
        return true;
        
      case 'client':
        return false; // クライアントエラーはリトライしない
        
      default:
        return attempt < 1; // 未知のエラーは1回だけリトライ
    }
  }
  
  /**
   * 遅延時間を適応的に調整
   */
  private adaptDelay(baseDelay: number, error: any, attempt: number): number {
    if (!this.config.adaptiveStrategy) return baseDelay;
    
    const classification = this.classifyError(error);
    let adaptedDelay = baseDelay * this.adaptiveDelayMultiplier;
    
    // エラー分類による調整
    switch (classification.errorCategory) {
      case 'timeout':
        // タイムアウトエラーの場合、より長い遅延
        adaptedDelay *= 1.5;
        break;
        
      case 'server':
        if (isApiError(error) && error.status === 429) {
          // レート制限の場合、さらに長い遅延
          adaptedDelay *= 2;
        }
        break;
        
      case 'network':
        // ネットワークエラーは標準遅延
        break;
    }
    
    return Math.min(adaptedDelay, this.config.maxDelay);
  }
  
  /**
   * サーキットブレーカーの状態をチェック
   */
  private isCircuitOpen(): boolean {
    if (!this.config.enableCircuitBreaker) return false;
    
    const now = Date.now();
    const recentOperations = this.operationHistory.filter(
      op => now - op.timestamp < 60000 // 過去1分間
    );
    
    if (recentOperations.length < 10) return false; // 最小サンプル数
    
    const failureRate = recentOperations.filter(op => !op.success).length / recentOperations.length;
    
    if (failureRate > (this.config.circuitBreakerThreshold || 0.5)) {
      this.circuitBreakerState = 'open';
      this.stats.circuitBreakerStatus = 'open';
      return true;
    }
    
    this.circuitBreakerState = 'closed';
    this.stats.circuitBreakerStatus = 'closed';
    return false;
  }
  
  /**
   * 操作結果を記録
   */
  private recordOperationResult(success: boolean): void {
    this.operationHistory.push({
      timestamp: Date.now(),
      success
    });
    
    // 履歴を過去5分間に限定
    const fiveMinutesAgo = Date.now() - 300000;
    this.operationHistory = this.operationHistory.filter(
      op => op.timestamp > fiveMinutesAgo
    );
  }
  
  /**
   * パフォーマンスメトリクスを更新
   */
  private updatePerformanceMetrics(startTime: number): void {
    const totalDuration = Date.now() - startTime;
    const attempts = this.stats.attempts;
    
    this.stats.performanceMetrics = {
      totalDuration,
      averageRetryDelay: attempts.length > 0 ? 
        attempts.reduce((sum, a) => sum + a.delay, 0) / attempts.length : 0,
      maxRetryDelay: Math.max(...attempts.map(a => a.delay), 0),
      adaptiveAdjustments: this.adaptiveDelayMultiplier > 1 ? 1 : 0
    };
    
    // パフォーマンスメトリクスをログ
    if (this.config.enablePerformanceMonitoring) {
      logPerformanceMetrics('RetryManager.execute', totalDuration, {
        attempts: this.stats.totalAttempts,
        success: this.stats.success,
        totalDelay: this.stats.totalDelay,
        errorCategories: this.stats.errorCategories
      });
    }
  }
}

/**
 * シンプルなリトライ実行関数
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'Operation'
): Promise<T> => {
  const retryManager = new RetryManager(config);
  return retryManager.execute(operation, operationName);
};

/**
 * デバウンス機能付きリトライ
 * 短時間に連続してリクエストが発生した場合の制御
 */
export class DebouncedRetryManager extends RetryManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private debounceMs: number;

  constructor(config: Partial<RetryConfig> = {}, debounceMs: number = 300) {
    super(config);
    this.debounceMs = debounceMs;
  }

  /**
   * デバウンス機能付きでリトライ実行
   */
  async executeDebounced<T>(
    operation: () => Promise<T>,
    operationName: string = 'Debounced API Request'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
      }

      this.timeoutId = setTimeout(async () => {
        try {
          const result = await this.execute(operation, operationName);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.debounceMs);
    });
  }
}

/**
 * 特定のAPIエンドポイント用のリトライ設定プリセット
 */
export const RETRY_PRESETS = {
  /** 重要なデータ操作（CRUD） */
  CRITICAL: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    enableJitter: true
  } as Partial<RetryConfig>,

  /** 一般的な読み取り操作 */
  STANDARD: {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    enableJitter: true
  } as Partial<RetryConfig>,

  /** 軽量な操作（検索、フィルタ等） */
  LIGHTWEIGHT: {
    maxRetries: 1,
    initialDelay: 300,
    maxDelay: 1000,
    backoffMultiplier: 1.5,
    enableJitter: false
  } as Partial<RetryConfig>,

  /** リアルタイム操作（即座にレスポンスが必要） */
  REALTIME: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1,
    enableJitter: false
  } as Partial<RetryConfig>
};