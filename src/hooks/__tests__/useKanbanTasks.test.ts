/**
 * useKanbanTasks フックの単体テスト
 * Issue #061対応: 設計書準拠の簡潔な実装
 * 
 * テスト対象:
 * - lastUpdated参照によるUI同期強化
 * - シンプルなタスクフィルタリング
 * - ステータス別タスク分類
 * - 基本的なエラーハンドリング
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKanbanTasks } from '../useKanbanTasks';
import { useTaskStore } from '../../stores/taskStore';
import { Task } from '../../types/task';

// モック設定
vi.mock('../../stores/taskStore');

const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random()}`,
  title: 'Mock Task',
  description: '',
  status: 'todo',
  priority: 'medium',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  ...overrides
});

describe('useKanbanTasks - Issue #061対応', () => {
  let mockTaskStore: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
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
      getLastUpdated: vi.fn(() => Date.now())
    };
    
    (useTaskStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockTaskStore);
      }
      return mockTaskStore;
    });
  });

  describe('基本機能', () => {
    it('フックが正常に初期化される', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current).toBeDefined();
      expect(result.current.tasks).toHaveLength(3); // archivedを除く
      expect(result.current.tasksByStatus).toBeDefined();
      expect(result.current.lastUpdated).toBeDefined();
    });

    it('アーカイブされたタスクが除外される', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.tasks).toHaveLength(3); // archivedは除外
      expect(result.current.tasks.every(task => task.status !== 'archived')).toBe(true);
    });

    it('ステータス別にタスクが分類される', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.tasksByStatus.todo).toHaveLength(1);
      expect(result.current.tasksByStatus.in_progress).toHaveLength(1);
      expect(result.current.tasksByStatus.done).toHaveLength(1);
    });

    it('ストアの状態を正しく伝播する', () => {
      mockTaskStore.isLoading = true;
      mockTaskStore.error = 'Test error';
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe('Test error');
    });
  });

  describe('フィルタリング機能', () => {
    beforeEach(() => {
      mockTaskStore.tasks = [
        createMockTask({ 
          status: 'todo', 
          title: 'Todo Task',
          priority: 'high'
        }),
        createMockTask({ 
          status: 'in_progress', 
          title: 'Search Term',
          priority: 'urgent'
        }),
        createMockTask({ 
          status: 'done', 
          title: 'Done Task'
        })
      ];
    });

    it('検索クエリでフィルタリングできる', () => {
      const filters = { searchQuery: 'Search Term' };
      const { result } = renderHook(() => useKanbanTasks(filters));
      
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe('Search Term');
    });

    it('重要度でフィルタリングできる', () => {
      const filters = { pageType: 'important' as const };
      const { result } = renderHook(() => useKanbanTasks(filters));
      
      expect(result.current.tasks.every(task => 
        task.priority === 'urgent' || task.priority === 'high'
      )).toBe(true);
    });

    it('完了タスクでフィルタリングできる', () => {
      const filters = { pageType: 'completed' as const };
      const { result } = renderHook(() => useKanbanTasks(filters));
      
      expect(result.current.tasks.every(task => task.status === 'done')).toBe(true);
    });
  });

  describe('Issue #061対応: lastUpdated機能', () => {
    it('lastUpdatedがフックから正しく取得できる', () => {
      const mockTimestamp = 1234567890;
      mockTaskStore.getLastUpdated = vi.fn(() => mockTimestamp);

      const { result } = renderHook(() => useKanbanTasks());

      expect(result.current.lastUpdated).toBe(mockTimestamp);
      expect(mockTaskStore.getLastUpdated).toHaveBeenCalled();
    });

    it('lastUpdatedがundefinedの場合を正しく処理する', () => {
      mockTaskStore.getLastUpdated = vi.fn(() => undefined);

      const { result } = renderHook(() => useKanbanTasks());

      expect(result.current.lastUpdated).toBeUndefined();
    });

    it('lastUpdated変更時にuseMemoが再計算される', () => {
      let timestamp = 1000;
      mockTaskStore.getLastUpdated = vi.fn(() => timestamp);

      const { result, rerender } = renderHook(() => useKanbanTasks());
      const initialTasks = result.current.tasks;

      // タスクを追加してタイムスタンプを更新
      timestamp = 2000;
      mockTaskStore.tasks = [...mockTaskStore.tasks, createMockTask({ status: 'todo' })];

      rerender();

      // lastUpdatedの変更によりuseMemoが再実行される
      expect(result.current.lastUpdated).toBe(2000);
      expect(result.current.tasks.length).toBeGreaterThan(initialTasks.length);
    });
  });

  describe('エッジケース', () => {
    it('空のタスク配列を正しく処理する', () => {
      mockTaskStore.tasks = [];
      
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.tasks).toHaveLength(0);
      expect(result.current.tasksByStatus.todo).toHaveLength(0);
      expect(result.current.tasksByStatus.in_progress).toHaveLength(0);
      expect(result.current.tasksByStatus.done).toHaveLength(0);
    });

    it('フィルタなしの場合は全タスクを返す', () => {
      const { result } = renderHook(() => useKanbanTasks());
      
      expect(result.current.tasks).toHaveLength(3); // archivedを除く
    });

    it('無効なフィルタを無視する', () => {
      const invalidFilters = { pageType: 'invalid' as any };
      const { result } = renderHook(() => useKanbanTasks(invalidFilters));
      
      expect(result.current.tasks).toHaveLength(3); // 全タスクを表示
    });
  });
});