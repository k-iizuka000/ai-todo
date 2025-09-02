import { ApiError, AuthError, ValidationError, ServerError, NetworkError, isNetworkError } from './errors';

/**
 * API通信基盤クライアント
 * JWT認証ヘッダー自動付与、エラーハンドリング、リトライ機能を提供
 */
export class ApiClient {
  private baseURL: string;
  private maxRetries: number = 3;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 認証ヘッダーを取得
   * TODO: userStoreが実装されたら動的に取得するように変更
   */
  private getAuthHeaders(): Record<string, string> {
    // 現在は環境変数またはモック用のトークンを使用
    // 将来的にはuseUserStore.getState().tokenから取得
    const token = process.env.TEST_JWT_TOKEN;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * 遅延処理（リトライ時のバックオフ用）
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 汎用APIリクエストメソッド
   * エラーハンドリングとリトライ機能を含む
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    let retries = 0;
    const url = `${this.baseURL}${endpoint}`;
    
    while (retries < this.maxRetries) {
      try {
        const config: RequestInit = {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
          },
          ...options,
        };

        const response = await fetch(url, config);
        
        if (!response.ok) {
          await this.handleErrorResponse(response, retries);
        }

        // 204 No Content の場合は空を返す
        if (response.status === 204) {
          return undefined as T;
        }

        return await response.json();
      } catch (error) {
        // リトライ対象外のエラー（認証、バリデーション、サーバーエラー）はそのまま投げる
        if (error instanceof AuthError || error instanceof ValidationError || error instanceof ServerError) {
          console.error('API request failed:', error);
          throw error;
        }
        
        // ネットワークエラー（503含む）や一般的な通信エラーの場合はリトライ対象
        if ((isNetworkError(error) || error instanceof NetworkError) && retries < this.maxRetries - 1) {
          retries++;
          await this.delay(1000 * retries); // Exponential backoff
          continue;
        }
        
        // リトライ回数上限に達した場合はNetworkErrorで統一
        if (isNetworkError(error) || error instanceof NetworkError) {
          throw new NetworkError('Maximum retry attempts exceeded');
        }
        
        console.error('API request failed:', error);
        throw error;
      }
    }

    // このコードパスには到達しないはずだが、型安全のため
    throw new NetworkError('Unexpected error: Maximum retry attempts exceeded');
  }

  /**
   * エラーレスポンスの処理
   */
  private async handleErrorResponse(response: Response, _retries: number): Promise<never> {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // JSONパースに失敗した場合は空オブジェクトを使用
    }

    switch (response.status) {
      case 401:
        // TODO: 認証エラーの場合、将来的にはuseUserStore.getState().logout()を呼び出す
        console.warn('Authentication failed - automatic logout should be triggered');
        throw new AuthError(errorData.error || 'Authentication failed');
        
      case 400:
        throw new ValidationError(errorData.error || 'Validation failed', errorData);
        
      case 500:
        throw new ServerError(errorData.error || 'Internal server error');
        
      case 503:
        // サービス利用不可の場合もエラーを投げる（リトライは上位で処理）
        throw new NetworkError(errorData.error || 'Service unavailable');
        
      default:
        throw new ApiError(
          errorData.error || `HTTP ${response.status}`, 
          response.status
        );
    }
  }

  /**
   * GET リクエスト
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  /**
   * POST リクエスト
   */
  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * PUT リクエスト
   */
  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * DELETE リクエスト
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }

  /**
   * PATCH リクエスト
   */
  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }
}

/**
 * デフォルトAPIクライアントインスタンス
 */
export const apiClient = new ApiClient(
  process.env.VITE_API_URL || 'http://localhost:3010'
);