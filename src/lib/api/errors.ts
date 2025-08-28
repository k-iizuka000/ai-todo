/**
 * API エラークラス定義
 * 設計書の階層化エラーハンドリング戦略に基づく
 */

/**
 * APIエラーの基底クラス
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * エラーが再試行可能かどうか判定
   */
  get isRetryable(): boolean {
    return this.status >= 500 && this.status < 600 || this.status === 429;
  }

  /**
   * ユーザーに表示する適切なメッセージを取得
   */
  get userMessage(): string {
    switch (this.status) {
      case 400:
        return '入力データに問題があります。内容を確認してください。';
      case 401:
        return 'ログインが必要です。再度ログインしてください。';
      case 403:
        return 'この操作を実行する権限がありません。';
      case 404:
        return '要求されたリソースが見つかりません。';
      case 409:
        return '競合エラーが発生しました。最新データを確認してください。';
      case 422:
        return 'データ形式に問題があります。入力内容を確認してください。';
      case 429:
        return 'アクセスが集中しています。しばらく時間をおいてから再試行してください。';
      case 500:
        return 'サーバーでエラーが発生しました。管理者にお問い合わせください。';
      case 502:
      case 503:
      case 504:
        return 'サーバーが一時的に利用できません。しばらく時間をおいてから再試行してください。';
      default:
        return 'ネットワークエラーが発生しました。接続を確認してください。';
    }
  }
}

/**
 * ビジネスロジックエラークラス
 */
export class BusinessError extends Error {
  constructor(
    public code: string, 
    message: string,
    public context?: any
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends BusinessError {
  constructor(
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super('VALIDATION_ERROR', message, { fields });
    this.name = 'ValidationError';
  }

  get fieldErrors(): Record<string, string[]> {
    return this.fields || {};
  }
}

/**
 * ネットワークエラークラス
 */
export class NetworkError extends Error {
  constructor(
    message: string = 'ネットワークエラーが発生しました',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'NetworkError';
  }

  get isRetryable(): boolean {
    return true;
  }
}

/**
 * タイムアウトエラークラス
 */
export class TimeoutError extends Error {
  constructor(
    public timeout: number,
    message: string = `リクエストがタイムアウトしました (${timeout}ms)`
  ) {
    super(message);
    this.name = 'TimeoutError';
  }

  get isRetryable(): boolean {
    return true;
  }
}

/**
 * エラーの種類を判定するヘルパー関数
 */
export const isApiError = (error: any): error is ApiError => {
  return error instanceof ApiError;
};

export const isBusinessError = (error: any): error is BusinessError => {
  return error instanceof BusinessError;
};

export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isNetworkError = (error: any): error is NetworkError => {
  return error instanceof NetworkError;
};

export const isTimeoutError = (error: any): error is TimeoutError => {
  return error instanceof TimeoutError;
};

/**
 * 再試行可能なエラーかどうか判定
 */
export const isRetryableError = (error: any): boolean => {
  if (isApiError(error) || isNetworkError(error) || isTimeoutError(error)) {
    return error.isRetryable;
  }
  return false;
};

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export const getErrorMessage = (error: any): string => {
  if (isApiError(error)) {
    return error.userMessage;
  }
  if (isBusinessError(error)) {
    return sanitizeErrorMessage(error.message);
  }
  if (isNetworkError(error) || isTimeoutError(error)) {
    return error.message; // ネットワークエラーメッセージは安全
  }
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message);
  }
  return '予期しないエラーが発生しました。';
};

/**
 * セキュアなエラーログ出力（本番環境では機密情報を除去）
 */
export const getSecureErrorLog = (error: any): any => {
  const errorLog: any = {
    name: error.name || 'UnknownError',
    message: sanitizeErrorMessage(error.message || 'Unknown error'),
    timestamp: new Date().toISOString(),
    type: error.constructor.name
  };
  
  // 開発環境でのみスタックトレースを含める
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorLog.stack = error.stack;
  }
  
  // APIエラー固有情報の追加（サニタイズ済み）
  if (isApiError(error)) {
    errorLog.status = error.status;
    errorLog.code = error.code;
    errorLog.details = sanitizeErrorData(error.details);
  }
  
  return errorLog;
};

/**
 * 機密情報をサニタイズするヘルパー関数
 */
const sanitizeErrorData = (data: any): any => {
  if (!data) return data;
  
  const sanitized = { ...data };
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key', 'api_key', 'auth_token', 'session_id'];
  
  // 機密データを除去
  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  // スタックトレースの本番環境での制限
  if (process.env.NODE_ENV === 'production' && sanitized.stack) {
    delete sanitized.stack;
  }
  
  return sanitized;
};

/**
 * エラーメッセージをサニタイズ
 */
const sanitizeErrorMessage = (message: string): string => {
  if (!message) return '不明なエラーが発生しました';
  
  // 本番環境では詳細な技術エラーメッセージを隠す
  if (process.env.NODE_ENV === 'production') {
    // SQL関連エラーを一般化
    if (message.toLowerCase().includes('sql') || 
        message.toLowerCase().includes('database') ||
        message.toLowerCase().includes('constraint')) {
      return 'データベース処理中にエラーが発生しました';
    }
    
    // ファイルパス情報を除去
    if (message.includes('/') || message.includes('\\')) {
      return 'システム処理中にエラーが発生しました';
    }
    
    // 内部エラー詳細を一般化
    if (message.toLowerCase().includes('internal') ||
        message.toLowerCase().includes('server') ||
        message.toLowerCase().includes('prisma')) {
      return 'サーバー処理中にエラーが発生しました';
    }
  }
  
  return message;
};

/**
 * エラーレスポンスからAPIErrorを生成
 */
export const createApiError = (
  status: number,
  response?: any
): ApiError => {
  let code = 'UNKNOWN_ERROR';
  let message = '不明なエラーが発生しました';
  let details = response;

  if (response) {
    code = response.code || response.error_code || `HTTP_${status}`;
    const rawMessage = response.message || response.error || response.detail || message;
    message = sanitizeErrorMessage(rawMessage);
    details = sanitizeErrorData(response.details || response.errors || response);
  }

  return new ApiError(status, code, message, details);
};

/**
 * フェッチエラーをAPIエラーに変換
 */
export const convertFetchError = (error: any): ApiError | NetworkError | TimeoutError => {
  if (error.name === 'AbortError') {
    return new TimeoutError(30000); // デフォルトタイムアウト
  }
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError('ネットワーク接続に失敗しました', error);
  }

  return new NetworkError('ネットワークエラーが発生しました', error);
};