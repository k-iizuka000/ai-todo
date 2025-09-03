/**
 * API エラーハンドリング用のカスタムエラークラス
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class AuthError extends ApiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export class ValidationError extends ApiError {
  public readonly details?: any;

  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class ServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network error') {
    super(message, 503, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/**
 * エラーがネットワークエラーかどうかを判定
 */
export function isNetworkError(error: any): boolean {
  if (!error) {
    return false;
  }
  
  return error instanceof TypeError || 
         error.name === 'TypeError' || 
         error.code === 'NETWORK_ERROR' ||
         error.message?.includes('fetch');
}