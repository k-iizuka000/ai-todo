/**
 * API層 メインエクスポート
 * エラーハンドリング基盤の統合エクスポート
 */

// API クライアント
export { ApiClient, apiClient, type ApiRequestConfig, type ApiResponse, type ApiStats } from './client';
import { apiClient } from './client';

// エラークラス
export {
  ApiError,
  BusinessError,
  ValidationError,
  NetworkError,
  TimeoutError,
  isApiError,
  isBusinessError,
  isValidationError,
  isNetworkError,
  isTimeoutError,
  isRetryableError,
  getErrorMessage,
  createApiError,
  convertFetchError
} from './errors';

// リトライ機能
export {
  RetryManager,
  DebouncedRetryManager,
  withRetry,
  RETRY_PRESETS,
  type RetryConfig,
  type RetryAttempt,
  type RetryStats,
  DEFAULT_RETRY_CONFIG
} from './retry';

// ログ機能
export { logger, createLogger, logError, logUserAction, logApiCall, LogLevel } from '../logger';

/**
 * エラーハンドリング統合ヘルパー関数
 */

/**
 * 統一されたエラーレスポンス処理
 */
export const handleApiError = (error: any): never => {
  if (isApiError(error)) {
    // APIエラーの場合は構造化ログを出力
    logger.error('API Error occurred', {
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details
    }, error);
  } else if (isNetworkError(error) || isTimeoutError(error)) {
    // ネットワークエラーの場合
    logger.error('Network Error occurred', {
      type: error.constructor.name,
      message: error.message
    }, error);
  } else {
    // 予期しないエラーの場合
    logger.error('Unexpected Error occurred', {
      type: error.constructor?.name || 'Unknown',
      message: error.message || 'Unknown error'
    }, error);
  }
  
  throw error;
};

/**
 * Promiseエラーをキャッチして統一処理
 */
export const catchApiError = <T>(promise: Promise<T>): Promise<T> => {
  return promise.catch(handleApiError);
};

/**
 * React Query用のエラーハンドリング関数
 */
export const reactQueryErrorHandler = (error: any) => {
  const message = getErrorMessage(error);
  
  // エラー通知などの処理をここに追加
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    navigator.vibrate(100); // エラー時の軽い振動
  }

  logger.error('React Query Error', { message }, error instanceof Error ? error : new Error(message));
  return message;
};

/**
 * API呼び出しのユーティリティ関数
 */
export const createApiCall = <TParams = any, TResponse = any>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  config?: Partial<ApiRequestConfig>
) => {
  return async (params?: TParams): Promise<TResponse> => {
    try {
      let response;
      
      switch (method) {
        case 'GET':
          response = await apiClient.get<TResponse>(endpoint, config);
          break;
        case 'POST':
          response = await apiClient.post<TResponse>(endpoint, params, config);
          break;
        case 'PUT':
          response = await apiClient.put<TResponse>(endpoint, params, config);
          break;
        case 'DELETE':
          response = await apiClient.delete<TResponse>(endpoint, config);
          break;
        case 'PATCH':
          response = await apiClient.patch<TResponse>(endpoint, params, config);
          break;
      }
      
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  };
};

/**
 * デフォルトのエラー境界設定
 */
export const DEFAULT_ERROR_BOUNDARY_CONFIG = {
  onError: (error: Error, errorInfo: any) => {
    logger.error('React Error Boundary triggered', {
      component: errorInfo.componentStack?.split('\n')[1]?.trim(),
      errorBoundary: true
    }, error);
  },
  fallbackRender: ({ error, resetError }: { error: Error; resetError: () => void }) => {
    const message = getErrorMessage(error);
    
    return {
      error,
      resetError,
      message,
      userMessage: isApiError(error) ? error.userMessage : message
    };
  }
};

export default {
  apiClient,
  handleApiError,
  catchApiError,
  reactQueryErrorHandler,
  createApiCall,
  DEFAULT_ERROR_BOUNDARY_CONFIG
};