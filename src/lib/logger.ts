/**
 * 構造化ロギングシステム
 * 設計書のLogging・監視設定要件に基づく実装
 */

/**
 * ログレベル定義
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * ログエントリの構造
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata: {
    requestId?: string;
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    url?: string;
    feature?: string;
    component?: string;
  };
}

/**
 * 機密情報を含むキーのリスト
 */
const SENSITIVE_KEYS = [
  'password', 'token', 'authorization', 'secret', 'key', 'api_key', 
  'auth_token', 'session_id', 'refresh_token', 'access_token',
  'cookie', 'auth', 'credential', 'private', 'ssl', 'cert'
];

/**
 * ログデータから機密情報を除去する
 */
const sanitizeLogData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    // 機密キーの検出と除去
    if (SENSITIVE_KEYS.some(sensitiveKey => lowerKey.includes(sensitiveKey))) {
      sanitized[key] = '[REDACTED]';
    }
    // ネストしたオブジェクトの再帰的処理
    else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
    // URLからクエリパラメータの機密情報を除去
    else if (key === 'url' && typeof sanitized[key] === 'string') {
      try {
        const url = new URL(sanitized[key]);
        SENSITIVE_KEYS.forEach(sensitiveKey => {
          if (url.searchParams.has(sensitiveKey)) {
            url.searchParams.set(sensitiveKey, '[REDACTED]');
          }
        });
        sanitized[key] = url.toString();
      } catch {
        // URL解析失敗時はそのまま
      }
    }
  });
  
  return sanitized;
};

/**
 * ログ出力先のインターフェース
 */
export interface LogTransport {
  name: string;
  log(entry: LogEntry): void;
}

/**
 * コンソール出力トランスポート
 */
class ConsoleTransport implements LogTransport {
  name = 'console';

  log(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleString();
    
    const baseMessage = `[${timestamp}] ${levelName}: ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(baseMessage, entry.context, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(baseMessage, entry.context, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(baseMessage, entry.context, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(baseMessage, entry.error, entry.context, entry.metadata);
        break;
    }
  }
}

/**
 * ローカルストレージ出力トランスポート（開発環境用）
 */
class LocalStorageTransport implements LogTransport {
  name = 'localStorage';
  private maxEntries = 1000;

  log(entry: LogEntry): void {
    try {
      // 本番環境では機密レベルの高いログをLocalStorageに保存しない
      if (process.env.NODE_ENV === 'production' && 
          (entry.level === LogLevel.FATAL || 
           entry.context?.category === 'security')) {
        return; // セキュリティログは外部サービスのみに送信
      }
      
      const existingLogs = this.getLogs();
      const updatedLogs = [...existingLogs, entry].slice(-this.maxEntries);
      
      localStorage.setItem('app_logs', JSON.stringify(updatedLogs));
    } catch (error) {
      console.warn('Failed to write log to localStorage:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem('app_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.warn('Failed to read logs from localStorage:', error);
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem('app_logs');
  }
}

/**
 * 外部サービス出力トランスポート（運用強化版）
 */
class ExternalTransport implements LogTransport {
  name = 'external';
  private endpoint: string;
  private buffer: LogEntry[] = [];
  private bufferSize = 10;
  private flushInterval = 5000; // 5秒
  private maxRetries = 3;
  private retryDelay = 1000; // 1秒
  private failedAttempts = 0;
  private isHealthy = true;
  private lastFlushTime = Date.now();
  private compressionEnabled = true;
  private batchQueue: LogEntry[][] = [];
  
  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.startPeriodicFlush();
    this.startHealthMonitoring();
  }

  log(entry: LogEntry): void {
    // パフォーマンス最適化：重要度によるフィルタリング
    if (this.shouldFilterEntry(entry)) {
      return;
    }
    
    this.buffer.push(entry);
    
    // 緊急時は即座送信
    if (entry.level === LogLevel.FATAL || this.isUrgentEntry(entry)) {
      this.flush(true); // force flush
    } else if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }
  
  /**
   * ログエントリをフィルタリングするか判定
   */
  private shouldFilterEntry(entry: LogEntry): boolean {
    // 本番環境ではDEBUGレベルを送信しない
    if (process.env.NODE_ENV === 'production' && entry.level === LogLevel.DEBUG) {
      return true;
    }
    
    // サービスが不健全な場合は重要なログのみ送信
    if (!this.isHealthy && entry.level < LogLevel.ERROR) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 緊急性の高いエントリか判定
   */
  private isUrgentEntry(entry: LogEntry): boolean {
    return entry.context?.category === 'security' || 
           entry.context?.category === 'data_integrity' ||
           entry.level >= LogLevel.ERROR;
  }

  private async flush(force = false): Promise<void> {
    if (this.buffer.length === 0) return;
    if (!force && !this.isHealthy && this.failedAttempts > this.maxRetries) {
      return; // サービス不健全時は送信をスキップ
    }

    const logsToSend = [...this.buffer];
    this.buffer = [];
    
    // バッチキューに追加（パフォーマンス最適化）
    this.batchQueue.push(logsToSend);
    
    await this.processBatchQueue();
  }
  
  /**
   * バッチキューを処理（パフォーマンス最適化）
   */
  private async processBatchQueue(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    
    const batch = this.batchQueue.shift()!;
    
    try {
      const payload = {
        logs: batch,
        source: 'ai-todo-frontend',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.REACT_APP_VERSION || '1.0.0',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        metadata: {
          batchSize: batch.length,
          queueLength: this.batchQueue.length,
          compressionEnabled: this.compressionEnabled
        }
      };
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Log-Client': 'ai-todo-frontend',
        'X-Batch-Size': batch.length.toString()
      };
      
      // 圧縮が有効な場合
      let body: string;
      if (this.compressionEnabled && batch.length > 5) {
        headers['Content-Encoding'] = 'gzip';
        body = JSON.stringify(payload); // 実際は圧縮ライブラリを使用
      } else {
        body = JSON.stringify(payload);
      }
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body,
        // タイムアウト設定
        signal: AbortSignal.timeout(10000) // 10秒
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // 成功時のステータス更新
      this.failedAttempts = 0;
      this.isHealthy = true;
      this.lastFlushTime = Date.now();
      
      // キューに残っているバッチがあれば続けて処理
      if (this.batchQueue.length > 0) {
        setTimeout(() => this.processBatchQueue(), 100);
      }
      
    } catch (error) {
      this.handleFlushError(error, batch);
    }
  }
  
  /**
   * フラッシュエラーを処理
   */
  private handleFlushError(error: any, failedBatch: LogEntry[]): void {
    this.failedAttempts++;
    
    console.warn(`Failed to send logs to external service (attempt ${this.failedAttempts}):`, error);
    
    // リトライ回数を超えていない場合はキューに戻す
    if (this.failedAttempts <= this.maxRetries) {
      this.batchQueue.unshift(failedBatch); // 優先度を上げてキューに戻す
      
      // 指数バックオフでリトライ
      const retryDelay = this.retryDelay * Math.pow(2, this.failedAttempts - 1);
      setTimeout(() => {
        this.processBatchQueue();
      }, retryDelay);
    } else {
      // 最大リトライ回数を超えた場合はサービスを不健全とマーク
      this.isHealthy = false;
      console.error('External logging service marked as unhealthy after max retries');
      
      // 重要なログのみローカルストレージにバックアップ
      const criticalLogs = failedBatch.filter(entry => entry.level >= LogLevel.ERROR);
      if (criticalLogs.length > 0) {
        this.backupCriticalLogs(criticalLogs);
      }
    }
  }
  
  /**
   * 重要なログをローカルストレージにバックアップ
   */
  private backupCriticalLogs(logs: LogEntry[]): void {
    try {
      const existing = JSON.parse(localStorage.getItem('critical_logs_backup') || '[]');
      const combined = [...existing, ...logs].slice(-50); // 最大50件
      localStorage.setItem('critical_logs_backup', JSON.stringify(combined));
    } catch (error) {
      console.warn('Failed to backup critical logs to localStorage:', error);
    }
  }

  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }
  
  /**
   * サービスヘルス監視を開始
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      const timeSinceLastFlush = Date.now() - this.lastFlushTime;
      
      // 5分以上フラッシュが成功していない場合は不健全と判定
      if (timeSinceLastFlush > 300000) {
        this.isHealthy = false;
      }
      
      // 不健全状態であれば、ヘルスチェックを試みる
      if (!this.isHealthy && this.shouldAttemptHealthCheck()) {
        this.performHealthCheck();
      }
    }, 30000); // 30秒間隔でヘルスチェック
  }
  
  /**
   * ヘルスチェックを試みるか判定
   */
  private shouldAttemptHealthCheck(): boolean {
    return this.batchQueue.length === 0; // キューが空の時のみ
  }
  
  /**
   * ヘルスチェックを実行
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const response = await fetch(this.endpoint.replace('/logs', '/health'), {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        this.isHealthy = true;
        this.failedAttempts = 0;
        console.info('External logging service health restored');
      }
    } catch (error) {
      console.debug('Health check failed, service still unhealthy');
    }
  }
  
  /**
   * サービス統計情報を取得
   */
  getStats(): any {
    return {
      isHealthy: this.isHealthy,
      failedAttempts: this.failedAttempts,
      queueLength: this.batchQueue.length,
      bufferSize: this.buffer.length,
      lastFlushTime: new Date(this.lastFlushTime).toISOString()
    };
  }
}

/**
 * メインロガークラス
 */
class Logger {
  private transports: LogTransport[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  private context: Record<string, any> = {};

  constructor() {
    // デフォルトトランスポートを追加
    this.addTransport(new ConsoleTransport());
    
    // 開発環境では LocalStorage も使用
    if (process.env.NODE_ENV === 'development') {
      this.addTransport(new LocalStorageTransport());
    }

    // 本番環境では外部サービスに送信（エンドポイントが設定されている場合）
    if (process.env.NODE_ENV === 'production' && process.env.VITE_LOG_ENDPOINT) {
      this.addTransport(new ExternalTransport(process.env.VITE_LOG_ENDPOINT));
    }
  }

  /**
   * ログレベルを設定
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * トランスポートを追加
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /**
   * トランスポートを削除
   */
  removeTransport(name: string): void {
    this.transports = this.transports.filter(t => t.name !== name);
  }

  /**
   * コンテキスト情報を設定
   */
  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  /**
   * コンテキスト情報をクリア
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * ログエントリを作成
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const metadata = {
      requestId: this.context.requestId,
      userId: this.context.userId,
      sessionId: this.context.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      feature: this.context.feature,
      component: this.context.component
    };

    // 機密情報をサニタイズ
    const sanitizedContext = sanitizeLogData({ ...this.context, ...context });
    const sanitizedMetadata = sanitizeLogData(metadata);
    
    // エラー情報のサニタイズ
    const sanitizedError = error ? {
      name: error.name,
      message: error.message,
      // 本番環境ではスタックトレースを制限
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    } : undefined;

    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: sanitizedContext,
      error: sanitizedError,
      metadata: sanitizedMetadata
    };
  }

  /**
   * ログを出力
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.minLevel) return;

    const entry = this.createLogEntry(level, message, context, error);
    
    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (transportError) {
        console.error(`Logger transport ${transport.name} failed:`, transportError);
      }
    });
  }

  /**
   * デバッグレベルログ
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * 情報レベルログ
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * 警告レベルログ
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * エラーレベルログ
   */
  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * 致命的エラーログ
   */
  fatal(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * 機能別ロガーを作成
   */
  createFeatureLogger(feature: string, component?: string): Logger {
    const featureLogger = new Logger();
    featureLogger.transports = this.transports;
    featureLogger.minLevel = this.minLevel;
    featureLogger.context = {
      ...this.context,
      feature,
      component
    };
    return featureLogger;
  }

  /**
   * パフォーマンス計測開始
   */
  startPerformanceTimer(operation: string): () => void {
    const startTime = performance.now();
    const startContext = { operation, startTime };
    
    this.debug(`Performance timer started: ${operation}`, startContext);
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.info(`Performance timer ended: ${operation}`, {
        ...startContext,
        endTime,
        duration: `${duration.toFixed(2)}ms`
      });
    };
  }

  /**
   * ストレージからログを取得（開発環境用）
   */
  getLogs(): LogEntry[] {
    const localStorage = this.transports.find(t => t instanceof LocalStorageTransport) as LocalStorageTransport;
    return localStorage?.getLogs() || [];
  }

  /**
   * ストレージのログをクリア（開発環境用）
   */
  clearLogs(): void {
    const localStorage = this.transports.find(t => t instanceof LocalStorageTransport) as LocalStorageTransport;
    localStorage?.clearLogs();
  }
}

/**
 * デフォルトロガーインスタンス
 */
export const logger = new Logger();

/**
 * 機能別ロガーファクトリー
 */
export const createLogger = (feature: string, component?: string): Logger => {
  return logger.createFeatureLogger(feature, component);
};

/**
 * パフォーマンス測定デコレーター
 */
export const logPerformance = (operation: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const stopTimer = logger.startPerformanceTimer(`${target.constructor.name}.${propertyKey}: ${operation}`);
      
      try {
        const result = await originalMethod.apply(this, args);
        stopTimer();
        return result;
      } catch (error) {
        stopTimer();
        logger.error(`Performance monitored method failed: ${propertyKey}`, { operation }, error as Error);
        throw error;
      }
    };

    return descriptor;
  };
};

/**
 * エラートラッキング用のヘルパー関数
 */
export const logError = (error: Error, context?: Record<string, any>): void => {
  // セキュアなエラーログ出力
  const sanitizedContext = sanitizeLogData(context);
  logger.error(`Unhandled error: ${error.message}`, sanitizedContext, error);
};

/**
 * セキュリティ監査ログ
 */
export const logSecurityEvent = (
  event: string, 
  severity: 'low' | 'medium' | 'high' | 'critical',
  context?: Record<string, any>
): void => {
  logger.warn(`Security Event: ${event}`, {
    category: 'security',
    severity,
    ...sanitizeLogData(context)
  });
};

/**
 * ユーザーアクションログ
 */
export const logUserAction = (action: string, context?: Record<string, any>): void => {
  logger.info(`User action: ${action}`, {
    category: 'user_action',
    ...context
  });
};

/**
 * API呼び出しログ
 */
export const logApiCall = (method: string, endpoint: string, context?: Record<string, any>): void => {
  logger.info(`API call: ${method} ${endpoint}`, {
    category: 'api_call',
    method,
    endpoint,
    ...context
  });
};

// グローバルエラーハンドリング（セキュリティ強化版）
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // セキュリティセンシティブな情報を除外
    const context = sanitizeLogData({
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      source: 'window.error'
    });
    
    logError(event.error, context);
    
    // セキュリティ関連のエラーを検出
    if (event.error?.message?.toLowerCase().includes('script error') ||
        event.error?.message?.toLowerCase().includes('cross-origin')) {
      logSecurityEvent('Cross-origin script error detected', 'medium', {
        filename: event.filename
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const context = sanitizeLogData({
      type: 'unhandledrejection',
      reason: typeof event.reason === 'string' ? event.reason : 'Unknown rejection',
      source: 'window.unhandledrejection'
    });
    
    logError(new Error(event.reason), context);
  });
  
  // セキュリティ関連イベントの監視
  window.addEventListener('securitypolicyviolation', (event) => {
    logSecurityEvent('Content Security Policy violation', 'high', {
      blockedURI: event.blockedURI,
      violatedDirective: event.violatedDirective,
      effectiveDirective: event.effectiveDirective
    });
  });
}

export default logger;