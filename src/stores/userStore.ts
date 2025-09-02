/**
 * Zustandを使用したユーザー認証のグローバル状態管理
 * 設計書 Issue-029 フルスタックアーキテクチャ移行対応 - JWT認証システム実装
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  User, 
  AuthState, 
  LoginInput, 
  SignupInput, 
  UpdateUserInput 
} from '../types/user';
import { authAPI, AuthenticationError } from '../lib/api/auth';

// 最小限のlocalStorage利用（認証トークンのみ）
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// ユーザーストアの状態型定義
interface UserState extends AuthState {
  // Actions - 認証系
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  signup: (userData: SignupInput) => Promise<void>;
  refreshAuth: () => Promise<void>;
  
  // Actions - ユーザー情報更新
  updateProfile: (updates: UpdateUserInput) => Promise<void>;
  
  // Actions - 状態管理
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setTokens: (token: string | null, refreshToken: string | null) => void;
  
  // Utilities
  isTokenValid: () => boolean;
  getAuthHeaders: () => Record<string, string>;
  checkAuthStatus: () => Promise<void>;
  
  // Store管理
  initializeAuth: () => Promise<void>;
  resetStore: () => void;
}

// JWTトークンの有効性チェック
const isValidToken = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    // 有効期限チェック（5分のバッファを設ける）
    return payload.exp > (currentTime + 300);
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

// ローカルストレージからトークンを取得
const getStoredTokens = (): { token: string | null; refreshToken: string | null } => {
  try {
    return {
      token: localStorage.getItem(AUTH_TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY)
    };
  } catch (error) {
    console.error('Failed to read tokens from localStorage:', error);
    return { token: null, refreshToken: null };
  }
};

// ローカルストレージにトークンを保存
const setStoredTokens = (token: string | null, refreshToken: string | null): void => {
  try {
    if (token && refreshToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.error('Failed to store tokens in localStorage:', error);
  }
};

// Zustandストア作成（JWT認証システム対応）
export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      // 初期状態
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      error: null,
      lastActivity: null,

      // ログイン処理
      login: async (credentials: LoginInput) => {
        try {
          set({ isLoading: true, error: null }, false, 'login:start');
          
          const authResponse = await authAPI.login(credentials);
          
          // トークンとユーザー情報を設定
          set({
            isAuthenticated: true,
            user: authResponse.user,
            token: authResponse.token,
            refreshToken: authResponse.refreshToken,
            isLoading: false,
            error: null,
            lastActivity: new Date()
          }, false, 'login:success');
          
          // localStorageにトークンを保存
          setStoredTokens(authResponse.token, authResponse.refreshToken);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            error: errorMessage
          }, false, 'login:error');
          
          // エラー時はトークンをクリア
          setStoredTokens(null, null);
          
          throw error;
        }
      },

      // ログアウト処理
      logout: async () => {
        try {
          set({ isLoading: true }, false, 'logout:start');
          
          // サーバーサイドでのセッション無効化
          try {
            await authAPI.logout();
          } catch (error) {
            // ログアウトAPIエラーでもローカル状態はクリア
            console.error('Logout API failed:', error);
          }
          
          // 状態をクリア
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            isLoading: false,
            error: null,
            lastActivity: null
          }, false, 'logout:success');
          
          // ローカルストレージをクリア
          setStoredTokens(null, null);
          
        } catch (error) {
          console.error('Logout failed:', error);
          // エラーでもローカル状態はクリア
          get().resetStore();
        }
      },

      // サインアップ処理
      signup: async (userData: SignupInput) => {
        try {
          set({ isLoading: true, error: null }, false, 'signup:start');
          
          // 基本的なバリデーション
          if (userData.password !== userData.confirmPassword) {
            throw new Error('Passwords do not match');
          }
          
          await authAPI.signup(userData);
          
          set({
            isLoading: false,
            error: null
          }, false, 'signup:success');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Signup failed';
          
          set({
            isLoading: false,
            error: errorMessage
          }, false, 'signup:error');
          
          throw error;
        }
      },

      // トークンリフレッシュ
      refreshAuth: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          set({ isLoading: true }, false, 'refreshAuth:start');
          
          const authResponse = await authAPI.refreshToken(refreshToken);
          
          set({
            token: authResponse.token,
            refreshToken: authResponse.refreshToken,
            isLoading: false,
            lastActivity: new Date()
          }, false, 'refreshAuth:success');
          
          // 新しいトークンを保存
          setStoredTokens(authResponse.token, authResponse.refreshToken);
          
        } catch (error) {
          console.error('Token refresh failed:', error);
          // リフレッシュ失敗時はログアウト
          await get().logout();
        }
      },

      // プロフィール更新
      updateProfile: async (updates: UpdateUserInput) => {
        try {
          const { user } = get();
          if (!user) {
            throw new Error('No user logged in');
          }

          set({ isLoading: true, error: null }, false, 'updateProfile:start');
          
          const updatedUser = await authAPI.updateProfile(updates);
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null
          }, false, 'updateProfile:success');
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
          
          set({
            isLoading: false,
            error: errorMessage
          }, false, 'updateProfile:error');
          
          throw error;
        }
      },

      // 状態管理系
      setLoading: (isLoading) => {
        set({ isLoading }, false, 'setLoading');
      },

      setError: (error) => {
        set({ error }, false, 'setError');
      },

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user }, false, 'setUser');
      },

      setTokens: (token, refreshToken) => {
        set({ 
          token, 
          refreshToken,
          isAuthenticated: !!token && !!refreshToken 
        }, false, 'setTokens');
        
        setStoredTokens(token, refreshToken);
      },

      // ユーティリティ
      isTokenValid: () => {
        const { token } = get();
        return isValidToken(token);
      },

      getAuthHeaders: () => {
        const { token } = get();
        if (!token) return {};
        
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };
      },

      // 認証状態チェック
      checkAuthStatus: async () => {
        try {
          const { token, refreshToken } = get();
          
          if (!token) return;
          
          if (!isValidToken(token)) {
            if (refreshToken) {
              await get().refreshAuth();
            } else {
              await get().logout();
            }
          }
        } catch (error) {
          console.error('Auth status check failed:', error);
          await get().logout();
        }
      },

      // 認証初期化
      initializeAuth: async () => {
        try {
          set({ isLoading: true }, false, 'initializeAuth:start');
          
          const storedTokens = getStoredTokens();
          
          if (storedTokens.token && storedTokens.refreshToken) {
            if (isValidToken(storedTokens.token)) {
              // トークンが有効な場合、ユーザー情報を復元
              try {
                const user = await authAPI.getCurrentUser();
                set({
                  token: storedTokens.token,
                  refreshToken: storedTokens.refreshToken,
                  user,
                  isAuthenticated: true,
                  isLoading: false
                }, false, 'initializeAuth:restored');
              } catch (error) {
                // ユーザー情報取得失敗時はリフレッシュを試行
                if (storedTokens.refreshToken) {
                  await get().refreshAuth();
                } else {
                  setStoredTokens(null, null);
                  set({ isLoading: false }, false, 'initializeAuth:userInfoFailed');
                }
              }
            } else if (isValidToken(storedTokens.refreshToken)) {
              // リフレッシュトークンで更新
              await get().refreshAuth();
            } else {
              // 両方とも無効な場合はクリア
              setStoredTokens(null, null);
              set({ isLoading: false }, false, 'initializeAuth:cleared');
            }
          } else {
            set({ isLoading: false }, false, 'initializeAuth:noTokens');
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          set({ isLoading: false }, false, 'initializeAuth:error');
        }
      },

      // ストアリセット
      resetStore: () => {
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          refreshToken: null,
          isLoading: false,
          error: null,
          lastActivity: null
        }, false, 'resetStore');
        
        setStoredTokens(null, null);
      }
    }),
    {
      name: 'user-store',
      enabled: import.meta.env.DEV,
    }
  )
);

// カスタムフック：認証状態確認
export const useAuth = () => {
  return useUserStore(state => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    isLoading: state.isLoading,
    error: state.error
  }));
};

// カスタムフック：認証アクション
export const useAuthActions = () => {
  return useUserStore(state => ({
    login: state.login,
    logout: state.logout,
    signup: state.signup,
    updateProfile: state.updateProfile,
    refreshAuth: state.refreshAuth,
    clearError: state.clearError
  }));
};

// カスタムフック：ユーザー情報
export const useCurrentUser = () => {
  return useUserStore(state => state.user);
};

// カスタムフック：認証ヘッダー取得
export const useAuthHeaders = () => {
  return useUserStore(state => state.getAuthHeaders());
};

// 初期化用ヘルパー（アプリケーション起動時に呼び出し）
export const initializeAuth = () => {
  return useUserStore.getState().initializeAuth();
};