/**
 * 認証API実装
 * 設計書 Issue-029 フルスタックアーキテクチャ移行対応 - JWT認証システム
 */

import { apiClient } from './client';
import type { 
  User, 
  LoginInput, 
  SignupInput, 
  ResetPasswordInput, 
  OAuthLoginInput,
  AuthError
} from '../../types/user';

// 認証APIのレスポンス型定義
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenRefreshResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse extends AuthResponse {}
export interface SignupResponse {
  user: User;
  message: string;
  requiresVerification: boolean;
}

export interface LogoutResponse {
  message: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface EmailVerificationResponse {
  message: string;
}

// 認証エラーハンドリング
class AuthenticationError extends Error {
  constructor(
    message: string, 
    public code?: string, 
    public field?: string
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// エラーレスポンスの変換
const handleAuthError = (error: any): never => {
  if (error?.response?.data) {
    const errorData = error.response.data as AuthError;
    throw new AuthenticationError(
      errorData.message || 'Authentication failed',
      errorData.code,
      errorData.field
    );
  }
  
  throw new AuthenticationError(
    error.message || 'Authentication failed'
  );
};

/**
 * 認証API
 */
export const authAPI = {
  /**
   * ログイン
   */
  async login(credentials: LoginInput): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe || false
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * ログアウト
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await apiClient.post<LogoutResponse>('/auth/logout');
      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * サインアップ
   */
  async signup(userData: SignupInput): Promise<SignupResponse> {
    try {
      // パスワード一致確認
      if (userData.password !== userData.confirmPassword) {
        throw new AuthenticationError(
          'Passwords do not match', 
          'PASSWORDS_DO_NOT_MATCH', 
          'confirmPassword'
        );
      }

      const response = await apiClient.post<SignupResponse>('/auth/signup', {
        email: userData.email,
        password: userData.password,
        profile: {
          firstName: userData.profile.firstName,
          lastName: userData.profile.lastName,
          displayName: userData.profile.displayName || 
            `${userData.profile.firstName} ${userData.profile.lastName}`
        }
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * トークンリフレッシュ
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResponse> {
    try {
      const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
        refreshToken
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * パスワードリセット要求
   */
  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    try {
      const response = await apiClient.post<PasswordResetResponse>('/auth/password-reset-request', {
        email
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * パスワードリセット実行
   */
  async resetPassword(resetData: ResetPasswordInput): Promise<PasswordResetResponse> {
    try {
      // パスワード一致確認
      if (resetData.newPassword !== resetData.confirmPassword) {
        throw new AuthenticationError(
          'Passwords do not match', 
          'PASSWORDS_DO_NOT_MATCH', 
          'confirmPassword'
        );
      }

      const response = await apiClient.post<PasswordResetResponse>('/auth/password-reset', {
        token: resetData.token,
        newPassword: resetData.newPassword
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * メール認証
   */
  async verifyEmail(token: string): Promise<EmailVerificationResponse> {
    try {
      const response = await apiClient.post<EmailVerificationResponse>('/auth/verify-email', {
        token
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * メール認証の再送信
   */
  async resendVerificationEmail(email: string): Promise<EmailVerificationResponse> {
    try {
      const response = await apiClient.post<EmailVerificationResponse>('/auth/resend-verification', {
        email
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * OAuth認証
   */
  async oauthLogin(oauthData: OAuthLoginInput): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/oauth/callback', {
        provider: oauthData.provider,
        code: oauthData.code,
        state: oauthData.state
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * OAuth URL取得
   */
  async getOAuthUrl(provider: string, redirectUrl?: string): Promise<{ url: string }> {
    try {
      const response = await apiClient.get<{ url: string }>(`/auth/oauth/${provider}/url`, {
        params: { redirectUrl }
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * 現在のユーザー情報取得
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * ユーザープロフィール更新
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await apiClient.put<User>('/auth/profile', updates);
      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * パスワード変更
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/change-password', {
        currentPassword,
        newPassword
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * アカウント削除
   */
  async deleteAccount(password: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>('/auth/account', {
        data: { password }
      });

      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * セッション一覧取得
   */
  async getSessions(): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>('/auth/sessions');
      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * セッション削除
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    try {
      const response = await apiClient.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  },

  /**
   * 全セッション削除（現在のセッション以外）
   */
  async revokeAllSessions(): Promise<{ message: string }> {
    try {
      const response = await apiClient.post<{ message: string }>('/auth/revoke-all-sessions');
      return response.data;
    } catch (error) {
      handleAuthError(error);
    }
  }
};

// 認証用のヘルパー関数
export const authHelpers = {
  /**
   * JWTトークンのデコード
   */
  decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Token decode failed:', error);
      return null;
    }
  },

  /**
   * トークンの有効性チェック
   */
  isTokenValid(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return false;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  },

  /**
   * トークンの期限切れチェック（バッファ付き）
   */
  isTokenExpiringSoon(token: string, bufferMinutes: number = 5): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;
    
    const currentTime = Date.now() / 1000;
    const bufferSeconds = bufferMinutes * 60;
    return decoded.exp <= (currentTime + bufferSeconds);
  },

  /**
   * ユーザーロール確認
   */
  hasRole(user: User | null, roles: string[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  },

  /**
   * ユーザー権限確認
   */
  hasPermission(user: User | null, permission: string): boolean {
    if (!user) return false;
    
    // 基本的な権限チェックロジック
    switch (permission) {
      case 'admin':
        return user.role === 'admin';
      case 'manage':
        return ['admin', 'manager'].includes(user.role);
      case 'write':
        return ['admin', 'manager', 'member'].includes(user.role);
      case 'read':
        return true; // 全てのログインユーザーに読み取り権限
      default:
        return false;
    }
  }
};

// TypeScript型エクスポート
export type {
  AuthResponse,
  TokenRefreshResponse,
  LoginResponse,
  SignupResponse,
  LogoutResponse,
  PasswordResetResponse,
  EmailVerificationResponse
};

export { AuthenticationError };