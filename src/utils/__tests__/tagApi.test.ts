/**
 * tagApi.ts 単体テスト
 * Issue 040: タグ作成機能-一覧表示問題 対応
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  fetchTags,
  fetchTag,
  createTag,
  updateTag,
  deleteTag,
  fetchTagUsage,
  syncTags,
  isApiError,
  getErrorMessage
} from '../tagApi';
import type { Tag, CreateTagInput, UpdateTagInput } from '../../types/tag';

// モックの設定
const mockFetch = vi.fn();
global.fetch = mockFetch;

// テストデータ
const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'フロントエンド',
    color: '#3B82F6',
    usageCount: 5,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'tag-2', 
    name: 'バックエンド',
    color: '#EF4444',
    usageCount: 3,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  }
];

const mockTag = mockTags[0];

const createTagInput: CreateTagInput = {
  name: 'テストタグ',
  color: '#10B981'
};

const updateTagInput: UpdateTagInput = {
  name: '更新タグ',
  color: '#F59E0B'
};

// ヘルパー関数
const createMockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve({ success: true, data }),
  statusText: status === 200 ? 'OK' : 'Error'
});

const createMockErrorResponse = (status: number, message = 'Error') => ({
  ok: false,
  status,
  json: () => Promise.resolve({ success: false, message }),
  statusText: message
});

describe('tagApi', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('fetchTags', () => {
    it('正常にタグ一覧を取得できる', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockTags));

      const result = await fetchTags();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/tags',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }),
          signal: expect.any(AbortSignal)
        })
      );
      expect(result).toEqual(mockTags);
    });

    it('APIエラー時に適切にエラーをthrowする', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(500));

      await expect(fetchTags()).rejects.toMatchObject({
        code: 'HTTP_500',
        status: 500
      });
    });

    it('AbortErrorが発生した場合にタイムアウトエラーをthrowする', async () => {
      const abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(fetchTags()).rejects.toMatchObject({
        code: 'TIMEOUT',
        status: 408
      });
    });
  });

  describe('fetchTag', () => {
    it('正常に特定のタグを取得できる', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockTag));

      const result = await fetchTag('tag-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/tags/tag-1',
        expect.any(Object)
      );
      expect(result).toEqual(mockTag);
    });

    it('タグが見つからない場合nullを返す', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(404));

      const result = await fetchTag('non-existent');

      expect(result).toBeNull();
    });

    it('404以外のエラーの場合はエラーをthrowする', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(500));

      await expect(fetchTag('tag-1')).rejects.toMatchObject({
        code: 'HTTP_500',
        status: 500
      });
    });
  });

  describe('createTag', () => {
    it('正常にタグを作成できる', async () => {
      const newTag = { ...createTagInput, id: 'tag-3', usageCount: 0 };
      mockFetch.mockResolvedValue(createMockResponse(newTag));

      const result = await createTag(createTagInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/tags',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(createTagInput),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
      expect(result).toEqual(newTag);
    });

    it('重複エラー時に適切にエラーをthrowする', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(409));

      await expect(createTag(createTagInput)).rejects.toMatchObject({
        code: 'HTTP_409',
        status: 409
      });
    });

    it('バリデーションエラー時に適切にエラーをthrowする', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(422));

      await expect(createTag(createTagInput)).rejects.toMatchObject({
        code: 'HTTP_422',
        status: 422
      });
    });
  });

  describe('updateTag', () => {
    it('正常にタグを更新できる', async () => {
      const updatedTag = { ...mockTag, ...updateTagInput };
      mockFetch.mockResolvedValue(createMockResponse(updatedTag));

      const result = await updateTag('tag-1', updateTagInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/tags/tag-1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updateTagInput)
        })
      );
      expect(result).toEqual(updatedTag);
    });

    it('存在しないタグの場合404エラーをthrowする', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(404));

      await expect(updateTag('non-existent', updateTagInput)).rejects.toMatchObject({
        code: 'HTTP_404',
        status: 404
      });
    });
  });

  describe('deleteTag', () => {
    it('正常にタグを削除できる', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null));

      await deleteTag('tag-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/tags/tag-1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });

    it('使用中のタグ削除時に409エラーをthrowする', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(409));

      await expect(deleteTag('tag-1')).rejects.toMatchObject({
        code: 'HTTP_409',
        status: 409
      });
    });

    it('存在しないタグの場合404エラーをthrowする', async () => {
      mockFetch.mockResolvedValue(createMockErrorResponse(404));

      await expect(deleteTag('non-existent')).rejects.toMatchObject({
        code: 'HTTP_404',
        status: 404
      });
    });
  });

  describe('fetchTagUsage', () => {
    it('正常にタグの使用統計を取得できる', async () => {
      const usageData = { isUsed: true, taskCount: 5 };
      mockFetch.mockResolvedValue(createMockResponse(usageData));

      const result = await fetchTagUsage('tag-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/tags/tag-1/usage',
        expect.any(Object)
      );
      expect(result).toEqual(usageData);
    });
  });

  describe('syncTags', () => {
    it('正常にタグデータを同期できる', async () => {
      mockFetch.mockResolvedValue(createMockResponse(mockTags));

      const result = await syncTags();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/tags/sync',
        expect.objectContaining({
          method: 'POST'
        })
      );
      expect(result).toEqual(mockTags);
    });
  });

  describe('エラーハンドリングユーティリティ', () => {
    describe('isApiError', () => {
      it('ApiErrorオブジェクトを正しく判定する', () => {
        const apiError = {
          code: 'HTTP_404',
          message: 'Not found',
          status: 404
        };

        expect(isApiError(apiError)).toBe(true);
      });

      it('通常のErrorオブジェクトはfalseを返す', () => {
        const error = new Error('Test error');
        
        expect(isApiError(error)).toBe(false);
      });

      it('nullやundefinedはfalseを返す', () => {
        expect(isApiError(null)).toBe(false);
        expect(isApiError(undefined)).toBe(false);
      });
    });

    describe('getErrorMessage', () => {
      it('ApiErrorの場合は適切なメッセージを返す', () => {
        const testCases = [
          { code: 'TIMEOUT', expected: 'ネットワークがタイムアウトしました。しばらく時間を置いて再度お試しください。' },
          { code: 'HTTP_401', expected: '認証に失敗しました。ログインし直してください。' },
          { code: 'HTTP_403', expected: 'この操作を実行する権限がありません。' },
          { code: 'HTTP_404', expected: '指定されたタグが見つかりません。' },
          { code: 'HTTP_409', expected: '同じ名前のタグが既に存在します。' },
          { code: 'HTTP_422', expected: '入力内容に不備があります。確認して再度お試しください。' },
          { code: 'HTTP_500', expected: 'サーバーエラーが発生しました。しばらく時間を置いて再度お試しください。' }
        ];

        testCases.forEach(({ code, expected }) => {
          const apiError = { code, message: 'Original message', status: 500 };
          expect(getErrorMessage(apiError)).toBe(expected);
        });
      });

      it('未知のApiErrorコードの場合は元のメッセージを返す', () => {
        const apiError = { 
          code: 'UNKNOWN_CODE', 
          message: 'Original message', 
          status: 500 
        };
        
        expect(getErrorMessage(apiError)).toBe('Original message');
      });

      it('通常のErrorオブジェクトの場合はerror.messageを返す', () => {
        const error = new Error('Test error message');
        
        expect(getErrorMessage(error)).toBe('Test error message');
      });

      it('その他のエラーの場合はデフォルトメッセージを返す', () => {
        expect(getErrorMessage('string error')).toBe('予期しないエラーが発生しました。');
        expect(getErrorMessage(123)).toBe('予期しないエラーが発生しました。');
        expect(getErrorMessage(null)).toBe('予期しないエラーが発生しました。');
      });
    });
  });
});