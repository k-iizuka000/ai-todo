/**
 * UserStore テスト
 * Issue-029 JWT認証システム統合テスト
 */

import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUserStore, useAuth, useAuthActions } from '../userStore';
import { authAPI } from '../../lib/api/auth';
import type { LoginInput, SignupInput, User } from '../../types/user';

// authAPIをモック化
vi.mock('../../lib/api/auth');
const mockAuthAPI = vi.mocked(authAPI);

// localStorageをモック化
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// モックユーザーデータ
const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  status: 'active',
  role: 'member',
  profile: {
    firstName: 'Test',
    lastName: 'User',
    displayName: 'Test User',
  },
  preferences: {
    theme: 'system',
    language: 'ja',
    timezone: 'Asia/Tokyo',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    notificationEmail: true,
    notificationPush: false,
    notificationDesktop: true,
  },
  authProvider: 'email',
  emailVerified: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

const mockAuthResponse = {
  user: mockUser,
  token: 'mock-jwt-token',
  refreshToken: 'mock-refresh-token',
  expiresIn: 3600,
};

describe('userStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useUserStore.getState().resetStore();
    
    // localStorageをクリア
    localStorageMock.clear();
    
    // モックをリセット
    vi.clearAllMocks();
  });

  describe('初期状態', () => {
    test('初期状態が正しく設定されている', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('ログイン機能', () => {
    const loginCredentials: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    };

    test('正常なログイン処理', async () => {
      mockAuthAPI.login.mockResolvedValueOnce(mockAuthResponse);
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        await result.current.login(loginCredentials);
      });

      expect(mockAuthAPI.login).toHaveBeenCalledWith(loginCredentials);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock-jwt-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'mock-refresh-token');
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toEqual(mockUser);
      expect(authState.token).toBe('mock-jwt-token');
      expect(authState.error).toBe(null);
    });

    test('ログイン失敗時のエラーハンドリング', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthAPI.login.mockRejectedValueOnce(new Error(errorMessage));
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        try {
          await result.current.login(loginCredentials);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(mockAuthAPI.login).toHaveBeenCalledWith(loginCredentials);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.error).toBe(errorMessage);
    });
  });

  describe('ログアウト機能', () => {
    beforeEach(async () => {
      // 事前にログイン状態を設定
      mockAuthAPI.login.mockResolvedValueOnce(mockAuthResponse);
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    test('正常なログアウト処理', async () => {
      mockAuthAPI.logout.mockResolvedValueOnce({ message: 'Logged out successfully' });
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthAPI.logout).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.token).toBe(null);
      expect(authState.refreshToken).toBe(null);
    });

    test('ログアウトAPI失敗でもローカル状態はクリアされる', async () => {
      mockAuthAPI.logout.mockRejectedValueOnce(new Error('API Error'));
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthAPI.logout).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
      
      // 状態確認（エラーでもクリアされる）
      const authState = useUserStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.token).toBe(null);
    });
  });

  describe('サインアップ機能', () => {
    const signupData: SignupInput = {
      email: 'newuser@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      profile: {
        firstName: 'New',
        lastName: 'User',
        displayName: 'New User',
      },
    };

    test('正常なサインアップ処理', async () => {
      mockAuthAPI.signup.mockResolvedValueOnce({
        user: mockUser,
        message: 'Registration successful',
        requiresVerification: true,
      });
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        await result.current.signup(signupData);
      });

      expect(mockAuthAPI.signup).toHaveBeenCalledWith(signupData);
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.error).toBe(null);
      expect(authState.isLoading).toBe(false);
    });

    test('パスワード不一致エラー', async () => {
      const invalidSignupData = {
        ...signupData,
        confirmPassword: 'different-password',
      };
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        try {
          await result.current.signup(invalidSignupData);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(mockAuthAPI.signup).not.toHaveBeenCalled();
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.error).toBe('Passwords do not match');
    });
  });

  describe('トークンリフレッシュ機能', () => {
    test('正常なトークンリフレッシュ', async () => {
      const refreshResponse = {
        token: 'new-jwt-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      };
      
      // 初期状態設定
      useUserStore.getState().setTokens('old-token', 'old-refresh-token');
      
      mockAuthAPI.refreshToken.mockResolvedValueOnce(refreshResponse);
      
      await act(async () => {
        await useUserStore.getState().refreshAuth();
      });

      expect(mockAuthAPI.refreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'new-jwt-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.token).toBe('new-jwt-token');
      expect(authState.refreshToken).toBe('new-refresh-token');
    });

    test('リフレッシュトークンがない場合のエラー', async () => {
      // リフレッシュトークンなしの状態
      useUserStore.getState().setTokens('token', null);
      
      await act(async () => {
        try {
          await useUserStore.getState().refreshAuth();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(mockAuthAPI.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('プロフィール更新機能', () => {
    beforeEach(async () => {
      // ログイン状態を設定
      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().setTokens('token', 'refresh-token');
    });

    test('正常なプロフィール更新', async () => {
      const updates = {
        profile: {
          ...mockUser.profile,
          displayName: 'Updated Name',
        },
      };
      
      const updatedUser = { ...mockUser, ...updates };
      mockAuthAPI.updateProfile.mockResolvedValueOnce(updatedUser);
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        await result.current.updateProfile(updates);
      });

      expect(mockAuthAPI.updateProfile).toHaveBeenCalledWith(updates);
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.user).toEqual(updatedUser);
      expect(authState.error).toBe(null);
    });

    test('ログインしていない場合のエラー', async () => {
      // ユーザー情報をクリア
      useUserStore.getState().setUser(null);
      
      const { result } = renderHook(() => useAuthActions());
      
      await act(async () => {
        try {
          await result.current.updateProfile({ status: 'inactive' });
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      expect(mockAuthAPI.updateProfile).not.toHaveBeenCalled();
    });
  });

  describe('ユーティリティ機能', () => {
    test('認証ヘッダー取得', () => {
      useUserStore.getState().setTokens('test-token', 'test-refresh');
      
      const headers = useUserStore.getState().getAuthHeaders();
      
      expect(headers).toEqual({
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      });
    });

    test('トークンなしでの認証ヘッダー', () => {
      const headers = useUserStore.getState().getAuthHeaders();
      
      expect(headers).toEqual({});
    });
  });

  describe('ストア管理', () => {
    test('ストアリセット', () => {
      // 状態を設定
      useUserStore.getState().setUser(mockUser);
      useUserStore.getState().setTokens('token', 'refresh-token');
      useUserStore.getState().setError('test error');
      
      // リセット実行
      useUserStore.getState().resetStore();
      
      // 状態確認
      const authState = useUserStore.getState();
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBe(null);
      expect(authState.token).toBe(null);
      expect(authState.refreshToken).toBe(null);
      expect(authState.error).toBe(null);
      expect(authState.isLoading).toBe(false);
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });
});