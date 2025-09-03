/**
 * TagStoreのユニットテスト
 * グループ10: テストとドキュメント - ユニットテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTagStore } from '../tagStore';
import { CreateTagInput, UpdateTagInput, TagFilter } from '../../types/tag';

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// globalのlocalStorageを置き換え
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// mockTagsのモック
vi.mock('@/mock/tags', () => ({
  mockTags: [
    {
      id: 'mock-tag-1',
      name: 'モックタグ1',
      color: '#FF0000',
      usageCount: 3,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01')
    },
    {
      id: 'mock-tag-2',
      name: 'モックタグ2',
      color: '#00FF00',
      usageCount: 5,
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02')
    }
  ]
}));

// tagApiのモック
const mockFetchTags = vi.fn();
const mockCreateTag = vi.fn();
const mockUpdateTag = vi.fn();
const mockDeleteTag = vi.fn();
const mockFetchTagUsage = vi.fn();
const mockIsApiError = vi.fn();
const mockGetErrorMessage = vi.fn();

vi.mock('@/utils/tagApi', () => ({
  fetchTags: mockFetchTags,
  createTag: mockCreateTag,
  updateTag: mockUpdateTag,
  deleteTag: mockDeleteTag,
  fetchTagUsage: mockFetchTagUsage,
  isApiError: mockIsApiError,
  getErrorMessage: mockGetErrorMessage
}));

// Date.nowのモック
const mockNow = 1609459200000; // 2021-01-01T00:00:00.000Z
vi.spyOn(Date, 'now').mockReturnValue(mockNow);

// Math.randomのモック
vi.spyOn(Math, 'random').mockReturnValue(0.5);

describe('useTagStore', () => {
  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useTagStore());
    
    expect(result.current.tags).toHaveLength(0); // API統合により初期状態は空配列
    expect(result.current.selectedTags).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.apiMode).toBe(true); // Issue 040でAPIモードがデフォルトで有効
  });

  describe('初期化機能', () => {
    it('APIモードで初期化できる', async () => {
      const mockTags = [
        { id: 'api-tag-1', name: 'APIタグ', color: '#123456', usageCount: 0 }
      ];
      mockFetchTags.mockResolvedValueOnce(mockTags);
      
      const { result } = renderHook(() => useTagStore());
      
      await act(async () => {
        await result.current.initialize();
      });

      expect(mockFetchTags).toHaveBeenCalled();
      expect(result.current.tags).toEqual(mockTags);
      expect(result.current.error).toBe(null);
    });

    it('初期化時のエラーハンドリング', async () => {
      const error = new Error('API Error');
      mockFetchTags.mockRejectedValueOnce(error);
      
      const { result } = renderHook(() => useTagStore());
      
      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.error).toBe('タグの取得に失敗しました');
    });
  });

  describe('タグの追加', () => {
    it('新しいタグを追加できる', async () => {
      const mockNewTag = {
        id: 'new-tag-123',
        name: '新しいタグ',
        color: '#0000FF',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockCreateTag.mockResolvedValueOnce(mockNewTag);

      const { result } = renderHook(() => useTagStore());
      
      const newTagInput: CreateTagInput = {
        name: '新しいタグ',
        color: '#0000FF'
      };

      await act(async () => {
        await result.current.addTag(newTagInput);
      });

      expect(mockCreateTag).toHaveBeenCalledWith(newTagInput);
      expect(result.current.tags).toContain(mockNewTag);
    });

    it('タグ追加時にAPIが呼び出される', async () => {
      const mockNewTag = {
        id: 'api-tag-123',
        name: 'APIテスト',
        color: '#FF00FF',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockCreateTag.mockResolvedValueOnce(mockNewTag);

      const { result } = renderHook(() => useTagStore());
      
      const newTagInput: CreateTagInput = {
        name: 'APIテスト',
        color: '#FF00FF'
      };

      await act(async () => {
        await result.current.addTag(newTagInput);
      });

      expect(mockCreateTag).toHaveBeenCalledWith(newTagInput);
    });
  });

  describe('タグの更新', () => {
    it('既存のタグを更新できる', async () => {
      const mockUpdatedTag = {
        id: 'mock-tag-1',
        name: '更新されたタグ',
        color: '#FFFF00',
        usageCount: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockUpdateTag.mockResolvedValueOnce(mockUpdatedTag);

      const { result } = renderHook(() => useTagStore());
      
      const tagId = 'mock-tag-1';
      const updates: UpdateTagInput = {
        name: '更新されたタグ',
        color: '#FFFF00'
      };

      await act(async () => {
        await result.current.updateTag(tagId, updates);
      });

      expect(mockUpdateTag).toHaveBeenCalledWith(tagId, updates);
    });
  });

  describe('タグの削除', () => {
    it('未使用のタグを削除できる', async () => {
      mockDeleteTag.mockResolvedValueOnce();
      
      const { result } = renderHook(() => useTagStore());
      
      const tagId = 'mock-tag-1';

      await act(async () => {
        await result.current.deleteTag(tagId);
      });

      expect(mockDeleteTag).toHaveBeenCalledWith(tagId);
    });

    it('使用中のタグ削除時にAPIエラーが適切に処理される', async () => {
      const apiError = new Error('このタグは使用中です');
      mockDeleteTag.mockRejectedValueOnce(apiError);
      mockIsApiError.mockReturnValueOnce(true);
      mockGetErrorMessage.mockReturnValueOnce('このタグは使用中です');

      const { result } = renderHook(() => useTagStore());
      
      await act(async () => {
        await result.current.deleteTag('mock-tag-1');
      });

      expect(result.current.error).toBe('このタグは使用中です');
      expect(mockDeleteTag).toHaveBeenCalledWith('mock-tag-1');
    });
  });

  describe('タグの選択', () => {
    it('タグを選択できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const mockTag = {
        id: 'test-tag-1',
        name: 'テストタグ',
        color: '#FF0000',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      act(() => {
        result.current.selectTag(mockTag);
      });

      expect(result.current.selectedTags).toHaveLength(1);
      expect(result.current.selectedTags[0]).toEqual(mockTag);
    });

    it('既に選択済みのタグは重複追加されない', () => {
      const { result } = renderHook(() => useTagStore());
      
      const mockTag = {
        id: 'test-tag-1',
        name: 'テストタグ',
        color: '#FF0000',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      act(() => {
        result.current.selectTag(mockTag);
        result.current.selectTag(mockTag); // 重複選択
      });

      expect(result.current.selectedTags).toHaveLength(1);
    });

    it('選択を解除できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const mockTag = {
        id: 'test-tag-1',
        name: 'テストタグ',
        color: '#FF0000',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      act(() => {
        result.current.selectTag(mockTag);
      });

      expect(result.current.selectedTags).toHaveLength(1);

      act(() => {
        result.current.deselectTag(mockTag.id);
      });

      expect(result.current.selectedTags).toHaveLength(0);
    });

    it('すべての選択を解除できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const mockTag1 = {
        id: 'test-tag-1',
        name: 'テストタグ1',
        color: '#FF0000',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockTag2 = {
        id: 'test-tag-2',
        name: 'テストタグ2',
        color: '#00FF00',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      act(() => {
        result.current.selectTag(mockTag1);
        result.current.selectTag(mockTag2);
      });

      expect(result.current.selectedTags).toHaveLength(2);

      act(() => {
        result.current.clearSelectedTags();
      });

      expect(result.current.selectedTags).toHaveLength(0);
    });
  });

  describe('フィルタリング機能', () => {
    it('名前で検索フィルタリングできる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const filter: TagFilter = {
        search: 'モックタグ1'
      };

      const filteredTags = result.current.getFilteredTags(filter);
      
      expect(filteredTags).toHaveLength(1);
      expect(filteredTags[0].name).toBe('モックタグ1');
    });

    it('名前でソートできる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const filter: TagFilter = {
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const sortedTags = result.current.getFilteredTags(filter);
      
      expect(sortedTags[0].name).toBe('モックタグ1');
      expect(sortedTags[1].name).toBe('モックタグ2');
    });

    it('使用回数でソートできる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const filter: TagFilter = {
        sortBy: 'usageCount',
        sortOrder: 'desc'
      };

      const sortedTags = result.current.getFilteredTags(filter);
      
      expect(sortedTags[0].usageCount).toBe(5); // モックタグ2
      expect(sortedTags[1].usageCount).toBe(3); // モックタグ1
    });
  });

  describe('セレクター機能', () => {
    it('名前でタグを検索できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const found = result.current.getTagByName('モックタグ1');
      expect(found?.id).toBe('mock-tag-1');
      
      const notFound = result.current.getTagByName('存在しないタグ');
      expect(notFound).toBeUndefined();
    });

    it('大文字小文字を区別せずに検索できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const found = result.current.getTagByName('モックたぐ1');
      expect(found?.id).toBe('mock-tag-1');
    });

    it('使用回数の多いタグを取得できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const topTags = result.current.getTopUsedTags(1);
      
      expect(topTags).toHaveLength(1);
      expect(topTags[0].usageCount).toBe(5); // モックタグ2が最も使用されている
    });
  });

  describe('データの永続化', () => {
    it('タグデータを読み込める', async () => {
      const { result } = renderHook(() => useTagStore());
      
      await act(async () => {
        await result.current.loadTags();
      });

      expect(result.current.tags).toHaveLength(2); // mockTagsから
      expect(result.current.error).toBe(null);
    });

    it('タグデータを保存できる', async () => {
      const { result } = renderHook(() => useTagStore());
      
      await act(async () => {
        await result.current.saveTags();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-todo-tags',
        expect.any(String)
      );
      expect(result.current.error).toBe(null);
    });
  });

  describe('整合性チェック', () => {
    it('タグの使用状況をチェックできる', () => {
      // タスクストアにタグを使用するタスクがある状態をモック
      localStorageMock.setItem('task-store', JSON.stringify({
        state: {
          tasks: [
            {
              id: 'task-1',
              tags: [{ id: 'mock-tag-1' }]
            },
            {
              id: 'task-2',
              tags: [{ id: 'mock-tag-1' }]
            }
          ]
        }
      }));

      const { result } = renderHook(() => useTagStore());
      
      const usage = result.current.checkTagUsage('mock-tag-1');
      
      expect(usage.isUsed).toBe(true);
      expect(usage.taskCount).toBe(2);
    });

    it('未使用タグの使用状況をチェックできる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const usage = result.current.checkTagUsage('mock-tag-2');
      
      expect(usage.isUsed).toBe(false);
      expect(usage.taskCount).toBe(0);
    });

    it('タスクとの同期で使用回数を更新できる', async () => {
      // タスクストアにタグを使用するタスクがある状態をモック
      localStorageMock.setItem('task-store', JSON.stringify({
        state: {
          tasks: [
            {
              id: 'task-1',
              tags: [{ id: 'mock-tag-1' }]
            }
          ]
        }
      }));

      const { result } = renderHook(() => useTagStore());
      
      await act(async () => {
        await result.current.syncWithTasks();
      });

      const updatedTag = result.current.tags.find(tag => tag.id === 'mock-tag-1');
      expect(updatedTag?.usageCount).toBe(1);
    });
  });

  describe('APIモード', () => {
    it('APIモードを有効にできる', () => {
      const { result } = renderHook(() => useTagStore());
      
      act(() => {
        result.current.enableApiMode();
      });

      expect(result.current.apiMode).toBe(true);
      expect(result.current.isApiModeEnabled()).toBe(true);
    });

    it('APIモードを無効にできる', () => {
      const { result } = renderHook(() => useTagStore());
      
      act(() => {
        result.current.enableApiMode();
        result.current.disableApiMode();
      });

      expect(result.current.apiMode).toBe(false);
      expect(result.current.isApiModeEnabled()).toBe(false);
    });
  });
});