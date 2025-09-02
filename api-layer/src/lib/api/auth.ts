import { ApiClient } from './client.js';
import { AuthError, ValidationError, ServerError, NetworkError } from './errors.js';

/**
 * ログイン認証情報の型定義
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * ユーザー登録データの型定義
 */
export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

/**
 * 認証レスポンスの型定義
 */
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * 認証APIクライアント
 * ログイン・登録・ログアウト機能を提供
 */
export class AuthAPI {
  private client: ApiClient;

  constructor() {
    this.client = new ApiClient(process.env.VITE_API_URL || 'http://localhost:3010');
  }

  /**
   * ユーザーログイン
   * @param credentials - ログイン認証情報
   * @returns 認証レスポンス（トークン、ユーザー情報）
   * @throws {ValidationError} 入力データが不正な場合
   * @throws {AuthError} 認証に失敗した場合
   * @throws {ServerError} サーバー内部エラーの場合
   * @throws {NetworkError} ネットワークエラーの場合
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // バリデーション
      this.validateLoginCredentials(credentials);
      
      const response = await this.client.post<AuthResponse>('/api/auth/login', credentials);
      
      // レスポンス検証
      this.validateAuthResponse(response);
      
      return response;
    } catch (error) {
      this.handleAuthError(error, 'login');
      throw error;
    }
  }

  /**
   * ユーザー登録
   * @param data - 登録データ
   * @returns 認証レスポンス（トークン、ユーザー情報）
   * @throws {ValidationError} 入力データが不正な場合
   * @throws {AuthError} 登録に失敗した場合（例：重複ユーザー）
   * @throws {ServerError} サーバー内部エラーの場合
   * @throws {NetworkError} ネットワークエラーの場合
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // バリデーション
      this.validateRegisterData(data);
      
      const response = await this.client.post<AuthResponse>('/api/auth/register', data);
      
      // レスポンス検証
      this.validateAuthResponse(response);
      
      return response;
    } catch (error) {
      this.handleAuthError(error, 'register');
      throw error;
    }
  }

  /**
   * ユーザーログアウト
   * JWTベースの認証のため、クライアントサイドでの処理のみ
   */
  async logout(): Promise<void> {
    // JWT のため、サーバーサイドでの無効化は不要
    // ただし、将来的にリフレッシュトークンを実装する場合は
    // サーバーサイドでの無効化処理が必要になる可能性がある
    
    try {
      // TODO: 将来的にリフレッシュトークンを実装する場合のためのプレースホルダー
      // await this.client.post('/api/auth/logout');
      
      // 現在はクライアントサイドログアウトのみ
      console.log('Logout successful - JWT token should be cleared from client storage');
    } catch (error) {
      // ログアウトのエラーは非致命的として処理
      console.warn('Logout warning:', error);
    }
  }

  /**
   * ログイン認証情報のバリデーション
   */
  private validateLoginCredentials(credentials: LoginCredentials): void {
    if (!credentials.email || typeof credentials.email !== 'string') {
      throw new ValidationError('Email is required and must be a string');
    }
    
    if (!credentials.password || typeof credentials.password !== 'string') {
      throw new ValidationError('Password is required and must be a string');
    }

    // Email形式の簡単なバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  /**
   * ユーザー登録データのバリデーション
   */
  private validateRegisterData(data: RegisterData): void {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new ValidationError('Name is required and must be a non-empty string');
    }

    if (!data.email || typeof data.email !== 'string') {
      throw new ValidationError('Email is required and must be a string');
    }
    
    if (!data.password || typeof data.password !== 'string') {
      throw new ValidationError('Password is required and must be a string');
    }

    // Email形式の簡単なバリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new ValidationError('Invalid email format');
    }

    // パスワード強度の最小要件
    if (data.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long');
    }
  }

  /**
   * 認証レスポンスのバリデーション
   */
  private validateAuthResponse(response: AuthResponse): void {
    if (!response.token || typeof response.token !== 'string') {
      throw new ServerError('Invalid server response: missing or invalid token');
    }

    if (!response.user || typeof response.user !== 'object') {
      throw new ServerError('Invalid server response: missing or invalid user data');
    }

    if (!response.user.id || !response.user.email || !response.user.name) {
      throw new ServerError('Invalid server response: incomplete user data');
    }
  }

  /**
   * 認証エラーのハンドリング
   */
  private handleAuthError(error: any, operation: string): void {
    // ログ記録（デバッグ・監視用）
    console.error(`Auth ${operation} error:`, {
      name: error.name,
      message: error.message,
      status: error.status,
      timestamp: new Date().toISOString()
    });

    // エラータイプ別の処理
    if (error instanceof ValidationError) {
      // バリデーションエラーの場合は詳細情報を保持
      return;
    } else if (error instanceof AuthError) {
      // 認証エラーの場合は、セキュリティ上詳細を隠す
      return;
    } else if (error instanceof NetworkError) {
      // ネットワークエラーの場合は再試行を促す
      return;
    }

    // その他のエラーの場合は汎用的な処理
  }
}

/**
 * デフォルトの認証APIインスタンス
 */
export const authAPI = new AuthAPI();