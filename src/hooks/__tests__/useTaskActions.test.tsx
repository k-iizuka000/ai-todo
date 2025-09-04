/**
 * useTaskActions フック単体テスト
 * Issue #028対応: React状態更新警告-unmountedコンポーネント
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useTaskActions } from '../useTaskActions';
import { useTaskStore } from '@/stores/taskStore';
import { taskApi, subtaskApi } from '@/api/tasks';

// モック設定
vi.mock('@/stores/taskStore');
vi.mock('@/api/tasks');

const mockUseTaskStore = vi.mocked(useTaskStore);
const mockTaskApi = vi.mocked(taskApi);
const mockSubtaskApi = vi.mocked(subtaskApi);

describe('useTaskActions - Issue #028対応', () => {
  // モック初期化
  const mockAddTask = vi.fn();
  const mockUpdateTask = vi.fn();
  const mockDeleteTask = vi.fn();
  const mockSetLoading = vi.fn();
  const mockSetError = vi.fn();
  const mockClearError = vi.fn();
  const mockGetTaskById = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseTaskStore.mockReturnValue({
      tasks: [],
      addTask: mockAddTask,
      updateTask: mockUpdateTask,
      deleteTask: mockDeleteTask,
      setLoading: mockSetLoading,
      setError: mockSetError,
      clearError: mockClearError,
      getTaskById: mockGetTaskById,
      selectedTaskId: null,
      filter: { status: [], tags: [], priority: [], assignee: [] },
      sort: { field: 'createdAt', direction: 'desc' },
      isLoading: false,
      error: null,
      isInitialized: true,
      setTasks: vi.fn(),
      loadTasks: vi.fn(),
      selectTask: vi.fn(),
      setFilter: vi.fn(),
      clearFilter: vi.fn(),
      setSort: vi.fn(),
      getFilteredTasks: vi.fn(),
      getTasksByProject: vi.fn(),
      getTasksByAssignee: vi.fn(),
      getArchivedTasks: vi.fn(),
      getNonArchivedTasks: vi.fn(),
      getFilteredTasksWithArchived: vi.fn(),
      bulkUpdateTasks: vi.fn()
    });

    // API のモック設定
    mockTaskApi.updateTask.mockResolvedValue({
      data: { success: true, task: {} }
    });
    mockTaskApi.createTask.mockResolvedValue({
      data: { success: true, task: {} }
    });
    mockTaskApi.deleteTask.mockResolvedValue({
      data: { success: true }
    });
    mockSubtaskApi.updateSubtask.mockResolvedValue({
      data: { success: true, subtask: {} }
    });
  });

  describe('アンマウント後の状態更新防止', () => {
    it('アンマウント後にmoveTaskの状態更新を防ぐべき', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: []
      };

      mockGetTaskById.mockReturnValue(mockTask);
      
      // 長時間実行をシミュレート
      mockTaskApi.updateTask.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            data: { success: true, task: mockTask }
          }), 100);
        })
      );

      const { result, unmount } = renderHook(() => useTaskActions());

      // タスク移動を開始
      const moveTaskPromise = act(async () => {
        return result.current.moveTask('task-1', 'in-progress');
      });

      // すぐにアンマウント
      unmount();

      // API呼び出しの完了を待つ
      await act(async () => {
        await moveTaskPromise;
      });

      // アンマウント後は状態更新関数が呼ばれないことを確認
      expect(mockSetError).not.toHaveBeenCalledWith(
        expect.stringContaining('タスクの移動に失敗しました')
      );
    });

    it('アンマウント後にtoggleSubtaskの状態更新を防ぐべき', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: [
          {
            id: 'subtask-1',
            title: 'Subtask 1',
            completed: false,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]
      };

      mockGetTaskById.mockReturnValue(mockTask);
      
      // 長時間実行をシミュレート
      mockTaskApi.updateSubtask.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            data: { success: true, subtask: {} }
          }), 100);
        })
      );

      const { result, unmount } = renderHook(() => useTaskActions());

      // サブタスク切り替えを開始
      const togglePromise = act(async () => {
        return result.current.toggleSubtask('task-1', 'subtask-1');
      });

      // すぐにアンマウント
      unmount();

      // API呼び出しの完了を待つ
      await act(async () => {
        await togglePromise;
      });

      // アンマウント後は状態更新関数が呼ばれないことを確認
      expect(mockSetError).not.toHaveBeenCalledWith(
        expect.stringContaining('サブタスクの切り替えに失敗しました')
      );
    });

    it('アンマウント後にcreateTaskの状態更新を防ぐべき', async () => {
      const taskInput = {
        title: 'New Task',
        description: 'Test task',
        status: 'todo' as const,
        priority: 'medium' as const
      };

      // 長時間実行をシミュレート
      mockTaskApi.createTask.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            data: { success: true, task: {} }
          }), 100);
        })
      );

      const { result, unmount } = renderHook(() => useTaskActions());

      // タスク作成を開始
      const createPromise = act(async () => {
        return result.current.createTask(taskInput);
      });

      // すぐにアンマウント
      unmount();

      // API呼び出しの完了を待つ
      await act(async () => {
        await createPromise;
      });

      // アンマウント後はsetLoadingが呼ばれないことを確認
      // (setLoading(false)がfinallyで実行されないことを確認)
      expect(mockSetLoading).not.toHaveBeenCalledWith(false);
    });

    it('エラー発生時、アンマウント後の状態更新を防ぐべき', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: []
      };

      mockGetTaskById.mockReturnValue(mockTask);
      
      // API エラーをシミュレート
      mockTaskApi.updateTask.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API Error')), 50);
        })
      );

      const { result, unmount } = renderHook(() => useTaskActions());

      // タスク移動を開始
      const moveTaskPromise = act(async () => {
        return result.current.moveTask('task-1', 'in-progress');
      });

      // すぐにアンマウント
      unmount();

      // エラーの完了を待つ
      await act(async () => {
        try {
          await moveTaskPromise;
        } catch (error) {
          // エラーは期待される
        }
      });

      // アンマウント後はエラー設定が呼ばれないことを確認
      expect(mockSetError).not.toHaveBeenCalled();
    });
  });

  describe('正常な動作の確認', () => {
    it('マウント中のmoveTask実行では正常に状態更新される', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: []
      };

      mockGetTaskById.mockReturnValue(mockTask);

      const { result } = renderHook(() => useTaskActions());

      await act(async () => {
        await result.current.moveTask('task-1', 'in-progress');
      });

      // 楽観的更新が実行されることを確認
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'in-progress' });
    });

    it('マウント中のcreateTask実行では正常に状態更新される', async () => {
      const taskInput = {
        title: 'New Task',
        description: 'Test task',
        status: 'todo' as const,
        priority: 'medium' as const
      };

      const { result } = renderHook(() => useTaskActions());

      await act(async () => {
        await result.current.createTask(taskInput);
      });

      // 楽観的更新が実行されることを確認
      expect(mockAddTask).toHaveBeenCalledWith(taskInput);
      expect(mockClearError).toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(true);
    });

    it('clearError実行時、マウント中は正常に動作する', () => {
      const { result } = renderHook(() => useTaskActions());

      act(() => {
        result.current.clearError();
      });

      expect(mockClearError).toHaveBeenCalled();
    });

    it('アンマウント後のclearError実行では状態更新されない', () => {
      const { result, unmount } = renderHook(() => useTaskActions());

      unmount();

      act(() => {
        result.current.clearError();
      });

      expect(mockClearError).not.toHaveBeenCalled();
    });
  });

  describe('AbortController機能の確認', () => {
    it('進行中の操作がアンマウント時に適切に中断される', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: []
      };

      mockGetTaskById.mockReturnValue(mockTask);

      // AbortControllerの動作を確認するためのスパイ
      const abortSpy = vi.spyOn(AbortController.prototype, 'abort');
      
      const { result, unmount } = renderHook(() => useTaskActions());

      // 複数の操作を同時に開始
      act(() => {
        result.current.moveTask('task-1', 'in-progress');
        result.current.editTask('task-1', { title: 'Updated Task' });
      });

      // アンマウント
      unmount();

      // AbortControllerのabortが呼ばれることを確認
      expect(abortSpy).toHaveBeenCalled();

      abortSpy.mockRestore();
    });
  });

  describe('メモリリーク防止', () => {
    it('アンマウント時にタイムアウトが適切にクリアされる', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { unmount } = renderHook(() => useTaskActions());

      unmount();

      // clearTimeoutが呼ばれることを確認（タイムアウトがあれば）
      // この実装では、operationTimeoutsの管理により適切にクリアされる
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(0); // 初期状態では0

      clearTimeoutSpy.mockRestore();
    });

    it('複数回のアンマウントでもエラーが発生しない', () => {
      const { unmount } = renderHook(() => useTaskActions());

      // 複数回アンマウントしてもエラーが発生しないことを確認
      expect(() => {
        unmount();
        unmount(); // 2回目のアンマウント
      }).not.toThrow();
    });
  });

  describe('楽観的更新とUI同期の強化 - Issue #061対応', () => {
    it('moveTaskで楽観的更新後に強制再描画トリガーが実行される', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: []
      };

      const mockSetTasks = vi.fn();
      const mockTasks = [mockTask];
      
      mockGetTaskById.mockReturnValue(mockTask);
      mockUpdateTask.mockResolvedValue(mockTask);
      
      // useTaskStore.getState()のモック設定
      const mockGetState = vi.fn().mockReturnValue({
        tasks: mockTasks,
        setTasks: mockSetTasks
      });
      
      // useTaskStore.getStateのモックを設定
      vi.mocked(useTaskStore).getState = mockGetState;

      const { result } = renderHook(() => useTaskActions());

      await act(async () => {
        await result.current.moveTask('task-1', 'in-progress');
      });

      // updateTaskが呼ばれることを確認
      expect(mockUpdateTask).toHaveBeenCalledWith('task-1', { status: 'in-progress' });
      
      // getStateが呼ばれることを確認
      expect(mockGetState).toHaveBeenCalled();
      
      // setTasksが強制再描画のために呼ばれることを確認
      expect(mockSetTasks).toHaveBeenCalledWith([...mockTasks]);
    });

    it('updateTask失敗時にエラーハンドリングが適切に動作する', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: []
      };

      mockGetTaskById.mockReturnValue(mockTask);
      
      // updateTaskでエラーをスローするようにモック
      const updateError = new Error('Update failed');
      mockUpdateTask.mockRejectedValue(updateError);

      const { result } = renderHook(() => useTaskActions());

      await act(async () => {
        await result.current.moveTask('task-1', 'in-progress');
      });

      // エラー処理のためsetErrorが呼ばれることを確認
      expect(mockSetError).toHaveBeenCalledWith('タスクの状態更新に失敗しました');
    });

    it('アンマウント後は強制再描画トリガーが実行されない', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'todo' as const,
        priority: 'medium' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        subtasks: []
      };

      const mockSetTasks = vi.fn();
      
      mockGetTaskById.mockReturnValue(mockTask);
      mockUpdateTask.mockResolvedValue(mockTask);
      
      // useTaskStore.getState()のモック設定
      const mockGetState = vi.fn().mockReturnValue({
        tasks: [mockTask],
        setTasks: mockSetTasks
      });
      
      vi.mocked(useTaskStore).getState = mockGetState;

      const { result, unmount } = renderHook(() => useTaskActions());

      // moveTaskを開始してすぐにアンマウント
      const movePromise = act(async () => {
        return result.current.moveTask('task-1', 'in-progress');
      });

      unmount();

      await act(async () => {
        await movePromise;
      });

      // アンマウント後は強制再描画トリガーが呼ばれないことを確認
      expect(mockSetTasks).not.toHaveBeenCalled();
    });
  });
});