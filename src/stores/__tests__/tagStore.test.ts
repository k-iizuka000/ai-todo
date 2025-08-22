/**
 * TagStoreのユニットテスト
 * グループ10: テストとドキュメント - ユニットテスト
 */

import { act, renderHook } from '@testing-library/react';
import { useTagStore } from '../tagStore';
import { CreateTagInput, UpdateTagInput, TagFilter } from '../../types/tag';

// localStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// globalのlocalStorageを置き換え
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// mockTagsのモック
jest.mock('@/mock/tags', () => ({
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
jest.mock('@/utils/tagApi', () => ({}));

// Date.nowのモック
const mockNow = 1609459200000; // 2021-01-01T00:00:00.000Z
jest.spyOn(Date, 'now').mockReturnValue(mockNow);

// Math.randomのモック
jest.spyOn(Math, 'random').mockReturnValue(0.5);

describe('useTagStore', () => {
  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('初期状態が正しく設定される', () => {
    const { result } = renderHook(() => useTagStore());
    
    expect(result.current.tags).toHaveLength(2); // mockTagsから
    expect(result.current.selectedTags).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.apiMode).toBe(false);
  });

  describe('タグの追加', () => {
    it('新しいタグを追加できる', async () => {
      const { result } = renderHook(() => useTagStore());
      
      const newTagInput: CreateTagInput = {
        name: '新しいタグ',
        color: '#0000FF'
      };

      await act(async () => {
        await result.current.addTag(newTagInput);
      });

      expect(result.current.tags).toHaveLength(3);
      
      const addedTag = result.current.tags.find(tag => tag.name === '新しいタグ');
      expect(addedTag).toBeDefined();
      expect(addedTag?.color).toBe('#0000FF');
      expect(addedTag?.usageCount).toBe(0);
      expect(addedTag?.id).toMatch(/^tag-\d+-[a-z0-9]+$/);
    });

    it('タグ追加時にlocalStorageに保存される', async () => {
      const { result } = renderHook(() => useTagStore());
      
      const newTagInput: CreateTagInput = {
        name: '保存テスト',
        color: '#FF00FF'
      };

      await act(async () => {
        await result.current.addTag(newTagInput);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-todo-tags',
        expect.stringContaining('保存テスト')
      );
    });
  });

  describe('タグの更新', () => {
    it('既存のタグを更新できる', async () => {
      const { result } = renderHook(() => useTagStore());
      
      const tagId = 'mock-tag-1';
      const updates: UpdateTagInput = {
        name: '更新されたタグ',
        color: '#FFFF00'
      };

      await act(async () => {
        await result.current.updateTag(tagId, updates);
      });

      const updatedTag = result.current.tags.find(tag => tag.id === tagId);
      expect(updatedTag?.name).toBe('更新されたタグ');
      expect(updatedTag?.color).toBe('#FFFF00');
    });
  });

  describe('タグの削除', () => {
    it('未使用のタグを削除できる', async () => {
      const { result } = renderHook(() => useTagStore());
      
      const tagId = 'mock-tag-1';

      await act(async () => {
        await result.current.deleteTag(tagId);
      });

      expect(result.current.tags).toHaveLength(1);
      expect(result.current.tags.find(tag => tag.id === tagId)).toBeUndefined();
    });

    it('使用中のタグ削除時にエラーが表示される', async () => {
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
        await result.current.deleteTag('mock-tag-1');
      });

      expect(result.current.error).toContain('1件のタスクで使用中です');
      expect(result.current.tags).toHaveLength(2); // 削除されない
    });
  });

  describe('タグの選択', () => {
    it('タグを選択できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const tagToSelect = result.current.tags[0];

      act(() => {
        result.current.selectTag(tagToSelect);
      });

      expect(result.current.selectedTags).toHaveLength(1);
      expect(result.current.selectedTags[0]).toEqual(tagToSelect);
    });

    it('既に選択済みのタグは重複追加されない', () => {
      const { result } = renderHook(() => useTagStore());
      
      const tagToSelect = result.current.tags[0];

      act(() => {
        result.current.selectTag(tagToSelect);
        result.current.selectTag(tagToSelect); // 重複選択
      });

      expect(result.current.selectedTags).toHaveLength(1);
    });

    it('選択を解除できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      const tagToSelect = result.current.tags[0];

      act(() => {
        result.current.selectTag(tagToSelect);
      });

      expect(result.current.selectedTags).toHaveLength(1);

      act(() => {
        result.current.deselectTag(tagToSelect.id);
      });

      expect(result.current.selectedTags).toHaveLength(0);
    });

    it('すべての選択を解除できる', () => {
      const { result } = renderHook(() => useTagStore());
      
      act(() => {
        result.current.selectTag(result.current.tags[0]);
        result.current.selectTag(result.current.tags[1]);
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