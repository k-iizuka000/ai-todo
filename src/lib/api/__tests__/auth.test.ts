/**
 * Auth API テスト
 * Issue-029 JWT認証システム統合テスト
 */

import { beforeEach, describe, test, expect, vi } from 'vitest';
import { authAPI, authHelpers, AuthenticationError } from '../auth';
import { apiClient } from '../client';
import type { LoginInput, SignupInput, User } from '../../../types/user';

// apiClientをモック化
vi.mock('../client');
const mockApiClient = vi.mocked(apiClient);

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

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    const loginCredentials: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: true,
    };

    test('正常なログイン', async () => {
      const mockResponse = {
        data: {
          user: mockUser,
          token: 'jwt-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.login(loginCredentials);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: loginCredentials.email,
        password: loginCredentials.password,
        rememberMe: loginCredentials.rememberMe,
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('ログインエラー', async () => {
      const errorResponse = {
        response: {
          data: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            field: 'email',
          },
        },
      };

      mockApiClient.post.mockRejectedValueOnce(errorResponse);

      await expect(authAPI.login(loginCredentials)).rejects.toThrow(AuthenticationError);
      await expect(authAPI.login(loginCredentials)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    test('正常なログアウト', async () => {
      const mockResponse = {
        data: { message: 'Logged out successfully' },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('signup', () => {
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

    test('正常なサインアップ', async () => {
      const mockResponse = {
        data: {
          user: mockUser,
          message: 'Registration successful',
          requiresVerification: true,
        },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.signup(signupData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/signup', {
        email: signupData.email,
        password: signupData.password,
        profile: {
          firstName: signupData.profile.firstName,
          lastName: signupData.profile.lastName,
          displayName: signupData.profile.displayName,
        },
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('パスワード不一致エラー', async () => {
      const invalidSignupData = {
        ...signupData,
        confirmPassword: 'different-password',
      };

      await expect(authAPI.signup(invalidSignupData)).rejects.toThrow(AuthenticationError);
      await expect(authAPI.signup(invalidSignupData)).rejects.toThrow('Passwords do not match');

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    test('正常なトークンリフレッシュ', async () => {
      const mockResponse = {
        data: {
          token: 'new-jwt-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
        },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.refreshToken('old-refresh-token');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCurrentUser', () => {
    test('現在ユーザー情報取得', async () => {
      const mockResponse = {
        data: mockUser,
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.getCurrentUser();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    test('プロフィール更新', async () => {
      const updates = {
        profile: {
          ...mockUser.profile,
          displayName: 'Updated Name',
        },
      };
      
      const updatedUser = { ...mockUser, ...updates };
      
      const mockResponse = {
        data: updatedUser,
      };

      mockApiClient.put.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.updateProfile(updates);

      expect(mockApiClient.put).toHaveBeenCalledWith('/auth/profile', updates);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('requestPasswordReset', () => {
    test('パスワードリセット要求', async () => {
      const mockResponse = {
        data: { message: 'Password reset email sent' },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.requestPasswordReset('test@example.com');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/password-reset-request', {
        email: 'test@example.com',
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('resetPassword', () => {
    const resetData = {
      token: 'reset-token',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };

    test('正常なパスワードリセット', async () => {
      const mockResponse = {
        data: { message: 'Password reset successful' },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.resetPassword(resetData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/password-reset', {
        token: resetData.token,
        newPassword: resetData.newPassword,
      });

      expect(result).toEqual(mockResponse.data);
    });

    test('パスワード不一致エラー', async () => {
      const invalidResetData = {
        ...resetData,
        confirmPassword: 'different-password',
      };

      await expect(authAPI.resetPassword(invalidResetData)).rejects.toThrow(AuthenticationError);
      await expect(authAPI.resetPassword(invalidResetData)).rejects.toThrow('Passwords do not match');

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    test('メール認証', async () => {
      const mockResponse = {
        data: { message: 'Email verified successfully' },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.verifyEmail('verification-token');

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/verify-email', {
        token: 'verification-token',
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('oauthLogin', () => {
    test('OAuth認証', async () => {
      const oauthData = {
        provider: 'google' as const,
        code: 'oauth-code',
        state: 'oauth-state',
      };

      const mockResponse = {
        data: {
          user: mockUser,
          token: 'jwt-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        },
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.oauthLogin(oauthData);

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/oauth/callback', {
        provider: oauthData.provider,
        code: oauthData.code,
        state: oauthData.state,
      });

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getOAuthUrl', () => {
    test('OAuth URL取得', async () => {
      const mockResponse = {
        data: { url: 'https://oauth.provider.com/auth?client_id=123' },
      };

      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await authAPI.getOAuthUrl('google', 'http://localhost:3000/callback');

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/oauth/google/url', {
        params: { redirectUrl: 'http://localhost:3000/callback' },
      });

      expect(result).toEqual(mockResponse.data);
    });
  });
});

describe('authHelpers', () => {
  describe('decodeToken', () => {
    test('正常なJWTトークンのデコード', () => {
      // Base64エンコードされたJWTペイロードをモック
      const payload = { sub: '123', name: 'Test User', exp: 1234567890 };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = authHelpers.decodeToken(token);

      expect(result).toEqual(payload);
    });

    test('無効なトークンのデコード', () => {
      const result = authHelpers.decodeToken('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('isTokenValid', () => {
    test('有効なトークン', () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1時間後
      const payload = { exp: futureTimestamp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = authHelpers.isTokenValid(token);
      expect(result).toBe(true);
    });

    test('期限切れトークン', () => {
      const pastTimestamp = Math.floor(Date.now() / 1000) - 3600; // 1時間前
      const payload = { exp: pastTimestamp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = authHelpers.isTokenValid(token);
      expect(result).toBe(false);
    });

    test('無効なトークン', () => {
      const result = authHelpers.isTokenValid('invalid-token');
      expect(result).toBe(false);
    });
  });

  describe('isTokenExpiringSoon', () => {
    test('期限切れが近いトークン', () => {
      const nearFutureTimestamp = Math.floor(Date.now() / 1000) + 60; // 1分後
      const payload = { exp: nearFutureTimestamp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = authHelpers.isTokenExpiringSoon(token, 5); // 5分のバッファ
      expect(result).toBe(true);
    });

    test('期限切れがまだ先のトークン', () => {
      const farFutureTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1時間後
      const payload = { exp: farFutureTimestamp };
      const encodedPayload = btoa(JSON.stringify(payload));
      const token = `header.${encodedPayload}.signature`;

      const result = authHelpers.isTokenExpiringSoon(token, 5); // 5分のバッファ
      expect(result).toBe(false);
    });
  });

  describe('hasRole', () => {
    test('ロール確認 - マッチする場合', () => {
      const result = authHelpers.hasRole(mockUser, ['admin', 'member']);
      expect(result).toBe(true);
    });

    test('ロール確認 - マッチしない場合', () => {
      const result = authHelpers.hasRole(mockUser, ['admin']);
      expect(result).toBe(false);
    });

    test('ロール確認 - ユーザーがnullの場合', () => {
      const result = authHelpers.hasRole(null, ['admin']);
      expect(result).toBe(false);
    });
  });

  describe('hasPermission', () => {
    test('admin権限確認', () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      expect(authHelpers.hasPermission(adminUser, 'admin')).toBe(true);
      expect(authHelpers.hasPermission(mockUser, 'admin')).toBe(false);
    });

    test('manage権限確認', () => {
      const managerUser = { ...mockUser, role: 'manager' as const };
      expect(authHelpers.hasPermission(managerUser, 'manage')).toBe(true);
      expect(authHelpers.hasPermission(mockUser, 'manage')).toBe(false);
    });

    test('write権限確認', () => {
      expect(authHelpers.hasPermission(mockUser, 'write')).toBe(true);
    });

    test('read権限確認', () => {
      expect(authHelpers.hasPermission(mockUser, 'read')).toBe(true);
    });

    test('不明な権限', () => {
      expect(authHelpers.hasPermission(mockUser, 'unknown')).toBe(false);
    });

    test('ユーザーがnullの場合', () => {
      expect(authHelpers.hasPermission(null, 'read')).toBe(false);
    });
  });
});