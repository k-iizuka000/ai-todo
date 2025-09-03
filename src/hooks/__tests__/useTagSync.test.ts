/**
 * useTagSyncカスタムフックのユニットテスト
 * Issue 040: タグ同期機能のテスト
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTagSync } from '../useTagSync';
import { useTagStore } from '../../stores/tagStore';

// useTagStoreのモック
vi.mock('../../stores/tagStore', () => ({
  useTagStore: vi.fn(),
}));

const mockUseTagStore = useTagStore as vi.MockedFunction<typeof useTagStore>;

describe('useTagSync', () => {
  const mockSyncWithTasks = vi.fn();
  const mockIsApiModeEnabled = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック設定
    mockUseTagStore.mockReturnValue({
      syncWithTasks: mockSyncWithTasks,
      isApiModeEnabled: mockIsApiModeEnabled,
      isLoading: false,
      error: null,
      tags: [],
      selectedTags: [],
      addTag: vi.fn(),
      updateTag: vi.fn(),
      deleteTag: vi.fn(),
      selectTag: vi.fn(),
      deselectTag: vi.fn(),
      clearSelectedTags: vi.fn(),
      getFilteredTags: vi.fn(),
      getTagByName: vi.fn(),
      getTopUsedTags: vi.fn(),
      checkTagUsage: vi.fn(),
      cleanupUnusedTags: vi.fn(),
      enableApiMode: vi.fn(),
      disableApiMode: vi.fn(),
      apiMode: true,
    });

    mockSyncWithTasks.mockResolvedValue(undefined);
    mockIsApiModeEnabled.mockReturnValue(true);
  });

  describe('基本機能', () => {
    it('デフォルトオプションで初期化される', () => {
      const { result } = renderHook(() => useTagSync());

      expect(result.current.isApiMode).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.syncTags).toBe('function');
    });

    it('カスタムオプションが適用される', () => {
      const options = {
        autoSync: false,
        syncInterval: 60000,
      };

      const { result } = renderHook(() => useTagSync(options));

      expect(result.current.isApiMode).toBe(true);
      expect(typeof result.current.syncTags).toBe('function');
    });
  });

  describe('手動同期', () => {
    it('syncTags関数を呼び出すと手動同期が実行される', async () => {
      mockIsApiModeEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useTagSync({ autoSync: false }));

      // 初期同期をクリア
      mockSyncWithTasks.mockClear();

      await act(async () => {
        await result.current.syncTags();
      });

      expect(mockSyncWithTasks).toHaveBeenCalledTimes(1);
    });

    it('APIモードが無効な場合、手動同期は実行されない', async () => {
      mockIsApiModeEnabled.mockReturnValue(false);

      const { result } = renderHook(() => useTagSync({ autoSync: false }));

      await act(async () => {
        await result.current.syncTags();
      });

      expect(mockSyncWithTasks).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      // console.errorのモック
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('手動同期でエラーが発生してもフックが継続動作する', async () => {
      const syncError = new Error('Manual sync failed');
      mockSyncWithTasks.mockRejectedValue(syncError);
      mockIsApiModeEnabled.mockReturnValue(true);

      const { result } = renderHook(() => useTagSync({ autoSync: false }));

      await act(async () => {
        await result.current.syncTags();
      });

      expect(console.error).toHaveBeenCalledWith('Tag sync failed:', syncError);
    });
  });

  describe('状態の反映', () => {
    it('ストアの状態が正しく反映される', () => {
      const mockState = {
        syncWithTasks: mockSyncWithTasks,
        isApiModeEnabled: mockIsApiModeEnabled,
        isLoading: true,
        error: 'Test error',
        tags: [],
        selectedTags: [],
        addTag: vi.fn(),
        updateTag: vi.fn(),
        deleteTag: vi.fn(),
        selectTag: vi.fn(),
        deselectTag: vi.fn(),
        clearSelectedTags: vi.fn(),
        getFilteredTags: vi.fn(),
        getTagByName: vi.fn(),
        getTopUsedTags: vi.fn(),
        checkTagUsage: vi.fn(),
        cleanupUnusedTags: vi.fn(),
        enableApiMode: vi.fn(),
        disableApiMode: vi.fn(),
        apiMode: true,
      };

      mockUseTagStore.mockReturnValue(mockState);
      mockIsApiModeEnabled.mockReturnValue(false);

      const { result } = renderHook(() => useTagSync());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Test error');
      expect(result.current.isApiMode).toBe(false);
    });
  });

  describe('パフォーマンス', () => {
    it('同一の依存関係で再レンダーされても無駄な処理が実行されない', () => {
      mockIsApiModeEnabled.mockReturnValue(true);

      const { result, rerender } = renderHook(() => 
        useTagSync({ autoSync: true, syncInterval: 30000 })
      );

      const firstSyncTags = result.current.syncTags;

      // 同じオプションで再レンダー
      rerender();

      const secondSyncTags = result.current.syncTags;

      // useCallbackによりsyncTags関数が同じ参照を保持
      expect(firstSyncTags).toBe(secondSyncTags);
    });

    it('オプション変更時のみ関数が再作成される', () => {
      mockIsApiModeEnabled.mockReturnValue(true);

      const { result, rerender } = renderHook(
        (props) => useTagSync(props),
        { initialProps: { autoSync: true, syncInterval: 30000 } }
      );

      const firstSyncTags = result.current.syncTags;

      // オプションを変更
      rerender({ autoSync: true, syncInterval: 60000 });

      const secondSyncTags = result.current.syncTags;

      // オプション変更により新しい関数が作成される
      expect(firstSyncTags).not.toBe(secondSyncTags);
    });
  });
});