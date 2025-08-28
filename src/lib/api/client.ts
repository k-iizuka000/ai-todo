/**
 * API クライアント実装
 * 設計書のAPI層アーキテクチャ設計に基づく
 * エラーハンドリング、リトライ機能、ロギングを統合
 */

import { 
  ApiError, 
  NetworkError, 
  TimeoutError, 
  createApiError, 
  convertFetchError 
} from './errors';
import { withRetry, RetryConfig, RETRY_PRESETS } from './retry';
import { logger } from '../logger';

/**
 * APIリクエスト設定
 */
export interface ApiRequestConfig extends RequestInit {
  /** タイムアウト時間（ミリ秒） */
  timeout?: number;
  /** リトライ設定 */
  retry?: Partial<RetryConfig>;
  /** リクエストID（ログ追跡用） */
  requestId?: string;
  /** レスポンスのキャッシュキー */
  cacheKey?: string;
  /** エラー時のフォールバック関数 */
  onError?: (error: any) => void;
}

/**
 * APIレスポンス型定義
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId?: string;
}

/**
 * API統計情報
 */
export interface ApiStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorsByStatus: Record<number, number>;
}

/**
 * APIクライアントクラス
 */
export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private stats: ApiStats;
  private interceptors: {
    request: ((config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>)[];
    response: ((response: Response) => Response | Promise<Response>)[];
    error: ((error: any) => any | Promise<any>)[];
  };

  constructor(baseURL: string = '', defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorsByStatus: {}
    };
    this.interceptors = {
      request: [],
      response: [],
      error: []
    };

    // デフォルトインターセプター
    this.addRequestInterceptor(this.defaultRequestInterceptor.bind(this));
    this.addErrorInterceptor(this.defaultErrorInterceptor.bind(this));
    
    // ヘルスモニタリングの定期実行（本番環境のみ）
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        const healthReport = this.getHealthReport();
        if (healthReport.healthStatus !== 'healthy') {
          logger.warn('API health degradation detected', {
            category: 'system_health',
            healthStatus: healthReport.healthStatus,
            errorRate: healthReport.errorRate,
            avgResponseTime: healthReport.averageResponseTime
          });
        }
      }, 60000); // 1分間隔でヘルスチェック
    }
  }

  /**
   * リクエストインターセプターを追加
   */
  addRequestInterceptor(
    interceptor: (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>
  ): void {
    this.interceptors.request.push(interceptor);
  }

  /**
   * レスポンスインターセプターを追加
   */
  addResponseInterceptor(
    interceptor: (response: Response) => Response | Promise<Response>
  ): void {
    this.interceptors.response.push(interceptor);
  }

  /**
   * エラーインターセプターを追加
   */
  addErrorInterceptor(
    interceptor: (error: any) => any | Promise<any>
  ): void {
    this.interceptors.error.push(interceptor);
  }

  /**
   * デフォルトリクエストインターセプター（統合強化版）
   */
  private defaultRequestInterceptor(config: ApiRequestConfig): ApiRequestConfig {
    // リクエストIDを生成（より強固なトレーサビリティ）
    if (!config.requestId) {
      config.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // リクエストタイムスタンプを追加（パフォーマンス測定用）
    const requestStartTime = performance.now();
    
    // デフォルトヘッダーをマージ
    config.headers = {
      ...this.defaultHeaders,
      'X-Request-ID': config.requestId, // トレーサビリティヘッダー
      'X-Client-Timestamp': new Date().toISOString(),
      ...config.headers
    };

    // 統合ログシステムでリクエストをログ（セキュリティ強化）
    logger.info('API Request initiated', {
      category: 'api_request',
      requestId: config.requestId,
      method: config.method || 'GET',
      endpoint: this.extractEndpoint(config.url || 'unknown'),
      hasAuth: !!config.headers?.Authorization,
      requestStartTime,
      feature: config.cacheKey || 'unknown'
    });
    
    // パフォーマンスタイマー開始
    (config as any)._performanceStart = requestStartTime;

    return config;
  }
  
  /**
   * URLからエンドポイント部分のみを抽出（セキュリティのためフルURLを隠す）
   */
  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url, this.baseURL);
      return urlObj.pathname + (urlObj.search ? '?[PARAMS]' : '');
    } catch {
      return url.replace(this.baseURL, '').split('?')[0] || 'unknown';
    }
  }

  /**
   * デフォルトエラーインターセプター（統合強化版）
   */
  private defaultErrorInterceptor(error: any, requestId?: string): any {
    // エラー統計を更新
    this.stats.failedRequests++;
    
    let errorStatus = 0;
    if (error instanceof ApiError) {
      errorStatus = error.status;
      this.stats.errorsByStatus[error.status] = (this.stats.errorsByStatus[error.status] || 0) + 1;
    }

    // エラー分類とコンテキスト情報の生成
    const errorContext = {
      category: 'api_error',
      requestId: requestId || 'unknown',
      errorType: error.constructor.name,
      errorStatus,
      isRetryable: error.isRetryable || false,
      timestamp: new Date().toISOString(),
      // セキュリティ強化されたエラー詳細
      secureErrorDetails: this.getSecureErrorDetails(error)
    };

    // エラーレベルの判定
    const logLevel = this.determineErrorLogLevel(error);
    
    switch (logLevel) {
      case 'critical':
        logger.fatal('Critical API Error', errorContext, error);
        break;
      case 'error':
        logger.error('API Error', errorContext, error);
        break;
      case 'warn':
        logger.warn('API Warning', errorContext);
        break;
      default:
        logger.info('API Info', errorContext);
    }

    // セキュリティ関連エラーの特別処理
    if (this.isSecurityError(error)) {
      logger.warn('Security-related API error detected', {
        category: 'security',
        requestId: requestId || 'unknown',
        errorStatus,
        potentialThreat: this.classifySecurityThreat(error)
      });
    }

    // エラー統計とアラート
    this.updateErrorMetrics(error);
    
    throw error;
  }
  
  /**
   * セキュリティ強化されたエラー詳細を取得
   */
  private getSecureErrorDetails(error: any): any {
    return {
      name: error.name,
      message: error.message,
      hasStack: !!error.stack,
      isCustomError: error instanceof ApiError,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * エラーログレベルを判定
   */
  private determineErrorLogLevel(error: any): 'critical' | 'error' | 'warn' | 'info' {
    if (error instanceof ApiError) {
      if (error.status >= 500) return 'critical';
      if (error.status === 401 || error.status === 403) return 'warn';
      if (error.status >= 400) return 'error';
    }
    if (error instanceof NetworkError || error instanceof TimeoutError) {
      return 'warn';
    }
    return 'error';
  }
  
  /**
   * セキュリティ関連エラーかどうか判定
   */
  private isSecurityError(error: any): boolean {
    if (error instanceof ApiError) {
      return error.status === 401 || error.status === 403 || error.status === 429;
    }
    return false;
  }
  
  /**
   * セキュリティ脅威を分類
   */
  private classifySecurityThreat(error: any): string {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 401:
          return 'unauthorized_access_attempt';
        case 403:
          return 'forbidden_resource_access';
        case 429:
          return 'potential_rate_limit_abuse';
        default:
          return 'unknown_security_threat';
      }
    }
    return 'unknown_security_threat';
  }
  
  /**
   * エラーメトリクスを更新
   */
  private updateErrorMetrics(error: any): void {
    // エラー率が閾値を超えた場合のアラート
    const errorRate = this.stats.failedRequests / this.stats.totalRequests;
    if (errorRate > 0.1) { // 10%を超えた場合
      logger.warn('High API error rate detected', {
        category: 'system_health',
        errorRate: (errorRate * 100).toFixed(2) + '%',
        totalRequests: this.stats.totalRequests,
        failedRequests: this.stats.failedRequests
      });
    }
  }

  /**
   * AbortController付きのfetch実行
   */
  private async fetchWithTimeout(
    url: string, 
    config: ApiRequestConfig
  ): Promise<Response> {
    const timeout = config.timeout || 30000; // デフォルト30秒
    const abortController = new AbortController();

    // タイムアウト設定
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...config,
        signal: abortController.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (abortController.signal.aborted) {
        throw new TimeoutError(timeout);
      }
      
      throw convertFetchError(error);
    }
  }

  /**
   * レスポンスの処理
   */
  private async processResponse<T>(
    response: Response, 
    requestId?: string
  ): Promise<ApiResponse<T>> {
    // レスポンスインターセプターを実行
    let processedResponse = response;
    for (const interceptor of this.interceptors.response) {
      processedResponse = await interceptor(processedResponse);
    }

    const headers: Record<string, string> = {};
    processedResponse.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // ステータスコードチェック
    if (!processedResponse.ok) {
      let errorData;
      try {
        errorData = await processedResponse.json();
      } catch {
        // JSON解析に失敗した場合はテキストを取得
        errorData = { message: await processedResponse.text() };
      }
      
      throw createApiError(processedResponse.status, errorData);
    }

    // レスポンスボディを解析
    let data: T;
    try {
      data = await processedResponse.json();
    } catch (error) {
      throw new ApiError(
        processedResponse.status,
        'INVALID_JSON',
        'レスポンスのJSON解析に失敗しました'
      );
    }

    return {
      data,
      status: processedResponse.status,
      headers,
      requestId
    };
  }

  /**
   * 基本的なHTTPリクエスト実行
   */
  private async executeRequest<T>(
    method: string,
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // インターセプターを実行
      let processedConfig = { ...config, method };
      for (const interceptor of this.interceptors.request) {
        processedConfig = await interceptor(processedConfig);
      }

      const url = `${this.baseURL}${endpoint}`;
      const requestOperation = () => this.fetchWithTimeout(url, processedConfig);

      // リトライ機能付きでリクエスト実行
      const retryConfig = processedConfig.retry || RETRY_PRESETS.STANDARD;
      const response = await withRetry(requestOperation, retryConfig, `${method} ${endpoint}`);

      // レスポンス処理
      const result = await this.processResponse<T>(response, processedConfig.requestId);
      
      // パフォーマンス測定
      const requestStartTime = (processedConfig as any)._performanceStart || startTime;
      const totalResponseTime = Date.now() - startTime;
      const networkTime = performance.now() - requestStartTime;
      
      // 成功統計を更新
      this.stats.successfulRequests++;
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + totalResponseTime) / 
        this.stats.successfulRequests;

      // 統合ログシステムで成功レスポンスをログ
      logger.info('API Response successful', {
        category: 'api_response',
        requestId: processedConfig.requestId,
        status: result.status,
        totalResponseTime,
        networkTime: networkTime.toFixed(2) + 'ms',
        endpoint: this.extractEndpoint(endpoint),
        method,
        success: true,
        // パフォーマンス分析用
        performance: {
          isSlowRequest: totalResponseTime > 1000,
          responseTimeCategory: this.categorizeResponseTime(totalResponseTime)
        }
      });
      
      // パフォーマンス警告
      if (totalResponseTime > 2000) {
        logger.warn('Slow API response detected', {
          category: 'performance',
          requestId: processedConfig.requestId,
          responseTime: totalResponseTime,
          endpoint: this.extractEndpoint(endpoint),
          threshold: '2000ms'
        });
      }

      return result;

    } catch (error) {
      // エラーハンドリングのコールバック実行
      config.onError?.(error);

      // エラーインターセプターを実行（統合強化版）
      let processedError = error;
      for (const interceptor of this.interceptors.error) {
        processedError = await interceptor(processedError, processedConfig.requestId);
      }

      throw processedError;
    }
  }
  
  /**
   * レスポンス時間をカテゴリ分けする
   */
  private categorizeResponseTime(responseTime: number): string {
    if (responseTime < 200) return 'fast';
    if (responseTime < 500) return 'normal';
    if (responseTime < 1000) return 'slow';
    if (responseTime < 2000) return 'very_slow';
    return 'critical';
  }
  }

  /**
   * GET リクエスト
   */
  async get<T>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('GET', endpoint, {
      ...config,
      retry: config?.retry || RETRY_PRESETS.STANDARD
    });
  }

  /**
   * POST リクエスト
   */
  async post<T>(
    endpoint: string, 
    data?: any, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('POST', endpoint, {
      ...config,
      body: data ? JSON.stringify(data) : undefined,
      retry: config?.retry || RETRY_PRESETS.CRITICAL
    });
  }

  /**
   * PUT リクエスト
   */
  async put<T>(
    endpoint: string, 
    data?: any, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('PUT', endpoint, {
      ...config,
      body: data ? JSON.stringify(data) : undefined,
      retry: config?.retry || RETRY_PRESETS.CRITICAL
    });
  }

  /**
   * DELETE リクエスト
   */
  async delete<T>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('DELETE', endpoint, {
      ...config,
      retry: config?.retry || RETRY_PRESETS.CRITICAL
    });
  }

  /**
   * PATCH リクエスト
   */
  async patch<T>(
    endpoint: string, 
    data?: any, 
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.executeRequest<T>('PATCH', endpoint, {
      ...config,
      body: data ? JSON.stringify(data) : undefined,
      retry: config?.retry || RETRY_PRESETS.STANDARD
    });
  }

  /**
   * API統計情報を取得（統合強化版）
   */
  getStats(): ApiStats {
    return { ...this.stats };
  }
  
  /**
   * 詳細なAPI健全性レポートを取得
   */
  getHealthReport(): any {
    const errorRate = this.stats.totalRequests > 0 ? 
      (this.stats.failedRequests / this.stats.totalRequests) : 0;
      
    const report = {
      ...this.stats,
      errorRate: (errorRate * 100).toFixed(2) + '%',
      successRate: ((1 - errorRate) * 100).toFixed(2) + '%',
      averageResponseTimeCategory: this.categorizeResponseTime(this.stats.averageResponseTime),
      healthStatus: this.determineHealthStatus(errorRate, this.stats.averageResponseTime),
      timestamp: new Date().toISOString()
    };
    
    // ヘルスレポートをログに記録
    logger.info('API Health Report generated', {
      category: 'system_health',
      report
    });
    
    return report;
  }
  
  /**
   * システムヘルスステータスを判定
   */
  private determineHealthStatus(errorRate: number, avgResponseTime: number): string {
    if (errorRate > 0.1 || avgResponseTime > 2000) return 'unhealthy';
    if (errorRate > 0.05 || avgResponseTime > 1000) return 'degraded';
    return 'healthy';
  }

  /**
   * 統計情報をリセット
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      errorsByStatus: {}
    };
  }

  /**
   * ベースURLを設定
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * デフォルトヘッダーを設定
   */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * デフォルトヘッダーを削除
   */
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }
}

/**
 * デフォルトAPIクライアントインスタンス
 */
export const apiClient = new ApiClient(
  process.env.VITE_API_URL || '/api/v1'
);

// 認証トークン設定（将来実装）
// apiClient.addRequestInterceptor((config) => {
//   const token = localStorage.getItem('auth_token');
//   if (token) {
//     config.headers = {
//       ...config.headers,
//       'Authorization': `Bearer ${token}`
//     };
//   }
//   return config;
// });

export default apiClient;