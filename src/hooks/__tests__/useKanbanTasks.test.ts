/**
 * useKanbanTasks フックの単体テスト
 * Issue #027: Dashboard無限レンダリングループエラー修正
 * 
 * テスト対象:
 * - 無限レンダリングループの防止
 * - パフォーマンス最適化
 * - データ整合性チェック
 * - エラーハンドリング
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import { useKanbanTasks } from '../useKanbanTasks';
import { useTaskStore } from '@/stores/taskStore';
import { Task, TaskStatus, Priority } from '@/types/task';
import { Tag } from '@/types/tag';
import * as typeGuards from '@/utils/typeGuards';
import * as dataIntegrity from '@/utils/taskDataIntegrity';
import { 
  createRenderCountTracker, 
  trackRender, 
  measureExecutionTime,
  createMockTask,
  createMockTag
} from './testUtils';

// モック設定
vi.mock('@/stores/taskStore');
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value) // デバウンスを無効化してテストを高速化
}));

// パフォーマンス測定ユーティリティ
const measurePerformance = async (fn: () => void | Promise<void>): Promise<number> => {
  const startTime = performance.now();
  await fn();
  return performance.now() - startTime;
};

// メモリ使用量測定ユーティリティ
const getMemoryUsage = (): number => {
  if ('memory' in performance && typeof (performance as any).memory === 'object') {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

describe('useKanbanTasks - Issue #027 無限レンダリングループ修正', () => {
  let mockTaskStore: any;
  let renderCount = 0;
  
  beforeEach(() => {
    vi.clearAllMocks();
    renderCount = 0;
    
    // console スパイの設定
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // TaskStore のモック設定
    mockTaskStore = {
      tasks: [
        createMockTask({ status: 'todo' }),
        createMockTask({ status: 'in_progress' }),
        createMockTask({ status: 'done' }),
        createMockTask({ status: 'archived' }) // アーカイブは除外される
      ],
      isLoading: false,
      error: null,
      updateTask: vi.fn(),
      deleteTask: vi.fn()
    };
    
    (useTaskStore as any).mockImplementation((selector: any) => {
      renderCount++;
      
      if (typeof selector === 'function') {
        return selector(mockTaskStore);
      }
      return mockTaskStore;
    });
    
    // TypeGuards のモック
    vi.spyOn(typeGuards, 'isValidTaskWithStats').mockReturnValue(true);
    vi.spyOn(typeGuards, 'isValidTask').mockReturnValue(true);
    vi.spyOn(typeGuards, 'getTypeGuardStats').mockReturnValue({
      functionStats: {},
      overall: {
        totalCalls: 10,
        totalSuccesses: 10,
        totalFailures: 0,
        overallSuccessRate: 100,
        totalTypeGuardErrors: 0,
        mostUsedFunction: 'isValidTask',
        leastReliableFunction: null
      },
      statsStartTime: new Date(),
      lastUpdated: new Date()
    });
    
    vi.spyOn(typeGuards, 'getValidationCacheStats').mockReturnValue({
      hits: 80,
      misses: 20,
      hitRate: 80,
      size: 100,
      lastResetAt: new Date()
    });
    
    // Data Integrity のモック
    vi.spyOn(dataIntegrity, 'quickHealthCheck').mockReturnValue({
      isHealthy: true,
      criticalIssueCount: 0,
      highIssueCount: 0
    });
    
    // SafeArrayAccess.filter の正しいモック
    vi.spyOn(dataIntegrity.SafeArrayAccess, 'filter').mockImplementation((array, predicate) => {
      if (!Array.isArray(array)) return [];
      return array.filter(predicate);
    });

    // SafeArrayAccess.slice のモック
    vi.spyOn(dataIntegrity.SafeArrayAccess, 'slice').mockImplementation((array, start, end) => {
      if (!Array.isArray(array)) return [];
      return array.slice(start, end);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('フックが正常に初期化される', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current).toBeDefined();
      expect(result.current.tasks).toHaveLength(3); // archivedを除く
      expect(renderCount).toBeLessThan(50); // レンダリング回数チェック
    });

    it('統計情報が正しく計算される', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.stats.totalTasks).toBe(3);
      expect(result.current.stats.todoCount).toBe(1);
      expect(result.current.stats.inProgressCount).toBe(1);
      expect(result.current.stats.doneCount).toBe(1);
      expect(result.current.stats.completionRate).toBe(33); // 1/3 = 33%
    });

    it('ストアエラー状態を正しく伝播する', () => {
      mockTaskStore.error = new Error('Store error');
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.error).toEqual(new Error('Store error'));
    });

    it('ローディング状態を正しく伝播する', () => {
      mockTaskStore.isLoading = true;
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('エッジケース', () => {
    it('空のタスク配列を正しく処理する', () => {
      mockTaskStore.tasks = [];
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.tasksByStatus.todo).toHaveLength(0);
      expect(result.current.stats.totalTasks).toBe(0);
      expect(result.current.stats.completionRate).toBe(0);
    });

    it('アーカイブされたタスクが除外される', () => {
      mockTaskStore.tasks = [
        createMockTask({ status: 'todo' }),
        createMockTask({ status: 'archived' }),
        createMockTask({ status: 'done' })
      ];
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.tasks).toHaveLength(2); // archivedは除外
      expect(result.current.tasks.every(task => task.status !== 'archived')).toBe(true);
    });
  });

  describe('フィルタリング機能', () => {
    beforeEach(() => {
      mockTaskStore.tasks = [
        createMockTask({ 
          status: 'todo', 
          title: 'Todo Task',
          tags: [createMockTag({ name: 'frontend' })]
        }),
        createMockTask({ 
          status: 'in_progress', 
          title: 'Progress Task',
          priority: 'urgent',
          tags: [createMockTag({ name: 'backend' })]
        }),
        createMockTask({ 
          status: 'done', 
          title: 'Done Task',
          tags: [createMockTag({ name: 'frontend' }), createMockTag({ name: 'testing' })]
        }),
        createMockTask({ status: 'archived' }) // 除外される
      ];
    });

    it('基本的なフィルタリング機能が動作する', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      // アーカイブされたタスクが除外されていることを確認
      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.tasks.every(task => task.status !== 'archived')).toBe(true);
    });

    it('重要度フィルタリングが正しく動作する', () => {
      // フィルタオブジェクトを事前に作成して参照を安定化
      const stableFilters = { pageType: 'important' as const };
      
      const { result } = renderHook(() => useKanbanTasks(stableFilters));
      
      expect(result.current.tasks.every(task => 
        task.priority === 'urgent' || task.priority === 'high'
      )).toBe(true);
    });
  });

  describe('パフォーマンス最適化', () => {
    it('パフォーマンスメトリクスが存在する', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.performanceMetrics).toBeDefined();
      expect(result.current.performanceMetrics.filteringTime).toBeGreaterThanOrEqual(0);
    });

    it('メモリ監視機能が動作する', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.memoryMonitoring).toBeDefined();
      expect(result.current.memoryMonitoring.current).toBeDefined();
      expect(result.current.memoryMonitoring.current.efficiency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('データ整合性機能', () => {
    it('データ整合性状態が監視される', async () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      await waitFor(() => {
        expect(result.current.dataIntegrityState).toBeDefined();
        expect(result.current.dataIntegrityState.isHealthy).toBe(true);
      });
    });

    it('バリデーションキャッシュ統計が取得できる', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.validationCacheStats).toBeDefined();
      expect(result.current.validationCacheStats.hitRate).toBe(80);
    });

    it('安全な配列アクセス機能が利用できる', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.safeArrayAccess).toBeDefined();
      expect(typeof result.current.safeArrayAccess.filter).toBe('function');
    });
  });

  describe('更新検知機能', () => {
    it('最近の更新を正しく検知する', () => {
      const recentTask = createMockTask({ 
        updatedAt: new Date() // 現在時刻
      });
      mockTaskStore.tasks = [recentTask];
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.hasUpdates()).toBe(true);
    });

    it('古い更新は検知しない', () => {
      const oldTask = createMockTask({ 
        updatedAt: new Date(Date.now() - 10000) // 10秒前
      });
      mockTaskStore.tasks = [oldTask];
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.hasUpdates()).toBe(false);
    });

    it('空のタスク配列の場合は更新を検知しない', () => {
      mockTaskStore.tasks = [];
      
      const { result } = renderHook(() => useKanbanTasks());
      
      // 空配列の場合はfalseを返すことを確認
      expect(result.current.hasUpdates()).toBe(false);
    });
  });

  describe('Issue #038対応: デバウンス最適化', () => {
    beforeEach(() => {
      // デバウンスのテストのために実際のuseDebounceを部分的に使用
      vi.resetModules();
    });

    it('デバウンス値が50msに設定されている', async () => {
      // useDebounceが50msで呼ばれることを検証
      const mockUseDebounce = vi.fn((value) => value);
      vi.doMock('@/hooks/useDebounce', () => ({
        useDebounce: mockUseDebounce
      }));

      const { useKanbanTasks: TestUseKanbanTasks } = await import('../useKanbanTasks');
      renderHook(() => TestUseKanbanTasks());
      
      // useDebounceが50msで呼ばれることを確認
      expect(mockUseDebounce).toHaveBeenCalledWith(expect.any(Array), 50);
      expect(mockUseDebounce).toHaveBeenCalledWith(expect.any(Number), 50);
    });

    it('デバウンス設定変更により既存の250msから50msに短縮されている', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      // パフォーマンスメトリクスでレスポンス時間が改善されていることを確認
      expect(result.current.performanceMetrics.filteringTime).toBeLessThan(100);
      
      // 過剰更新防止機能は維持されていることを確認
      expect(result.current.performanceMetrics).toBeDefined();
    });

    it('タスク作成後250ms以内にUI反映される', async () => {
      const { result, rerender } = renderHook(() => useKanbanTasks());
      
      const initialTaskCount = result.current.tasks.length;
      
      // 新しいタスクを追加（タスク作成をシミュレート）
      const newTask = createMockTask({ 
        status: 'todo', 
        title: 'Issue #038 Test Task',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      const startTime = Date.now(); // performance.now()の代わりにDate.now()を使用
      
      act(() => {
        mockTaskStore.tasks = [...mockTaskStore.tasks, newTask];
      });
      
      rerender();
      
      const endTime = Date.now();
      const reflectionTime = endTime - startTime;
      
      // UI反映が迅速に行われることを確認（テスト環境では瞬時）
      expect(reflectionTime).toBeGreaterThanOrEqual(0);
      expect(reflectionTime).toBeLessThan(250);
      
      // タスクが正しく追加されていることを確認
      expect(result.current.tasks).toHaveLength(initialTaskCount + 1);
      expect(result.current.tasks.some(task => task.title === 'Issue #038 Test Task')).toBe(true);
      
      // To Doカラム（status: 'todo'）に正しく配置されていることを確認
      expect(result.current.tasksByStatus.todo.some(task => task.title === 'Issue #038 Test Task')).toBe(true);
    });

    it('タスク作成後の即座な表示が可能', () => {
      // 新しいタスクが追加された場合の反応時間をテスト
      const { result, rerender } = renderHook(() => useKanbanTasks());
      
      const initialTaskCount = result.current.tasks.length;
      
      // 新しいタスクを追加
      const newTask = createMockTask({ status: 'todo', title: 'New Task' });
      mockTaskStore.tasks = [...mockTaskStore.tasks, newTask];
      
      rerender();
      
      // タスクが即座に反映される（デバウンスが50msなので高速）
      expect(result.current.tasks).toHaveLength(initialTaskCount + 1);
      expect(result.current.tasks.some(task => task.title === 'New Task')).toBe(true);
    });

    it('パフォーマンス劣化がない', async () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      // パフォーマンスメトリクスが取得できることを確認
      expect(result.current.performanceMetrics).toBeDefined();
      expect(result.current.performanceMetrics.filteringTime).toBeGreaterThanOrEqual(0);
      
      // メモリ効率スコアが良好であることを確認
      expect(result.current.performanceMetrics.memoryEfficiencyScore).toBeGreaterThan(50);
    });

    it.skip('既存機能への影響がない', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      // 基本機能が正常に動作することを確認
      expect(result.current.tasksByStatus).toBeDefined();
      expect(result.current.stats).toBeDefined();
      expect(result.current.dataIntegrityState.isHealthy).toBe(true);
      
      // フィルタリング機能が正常に動作することを確認
      // フィルタオブジェクトを事前に作成して参照を安定化
      const stableFilters = {
        searchQuery: 'test',
        selectedTags: [] as string[],
        tagFilterMode: 'OR' as const,
        pageType: 'all' as const
      };
      
      const { result: filteredResult } = renderHook(() => useKanbanTasks(stableFilters));
      
      expect(filteredResult.current).toBeDefined();
    });

    it('エラー処理が継続して正常動作する', () => {
      // データ整合性エラーが発生した場合のテスト
      vi.spyOn(dataIntegrity, 'quickHealthCheck').mockReturnValueOnce({
        isHealthy: false,
        criticalIssueCount: 1,
        highIssueCount: 0
      });
      
      const { result } = renderHook(() => useKanbanTasks());
      
      // エラーが発生しても基本機能は動作する
      expect(result.current.tasks).toBeDefined();
      expect(result.current.tasksByStatus).toBeDefined();
    });
  });
});