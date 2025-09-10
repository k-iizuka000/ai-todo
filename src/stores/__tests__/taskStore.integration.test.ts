/**
 * TaskStore インテグレーションテスト
 * Issue #001 Mock Mode Fix: TaskStore operations with error handling and rollback
 */

import { act, renderHook } from '@testing-library/react';
import { useTaskStore } from '../taskStore';
import { taskAPI } from '../api/taskApi';
import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';
import toast from 'react-hot-toast';

// react-hot-toast のモック
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}));

// TaskAPI のモック
jest.mock('../api/taskApi', () => ({
  taskAPI: {
    fetchTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    updateTaskStatus: jest.fn(),
    deleteTask: jest.fn(),
  },
}));

const mockedTaskAPI = taskAPI as jest.Mocked<typeof taskAPI>;
const mockedToast = toast as jest.Mocked<typeof toast>;

describe('TaskStore Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ストアの状態をリセット
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.clearTasks();
    });
  });

  const mockTask: Task = {
    id: '1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'medium',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
    projectId: null,
    assigneeId: null,
    tags: [],
    dueDate: null,
    estimatedHours: null,
  };

  describe('loadTasks', () => {
    it('should load tasks successfully and update store state', async () => {
      const mockTasks: Task[] = [mockTask];
      mockedTaskAPI.fetchTasks.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.loadTasks();
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockedTaskAPI.fetchTasks).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error and show retry toast', async () => {
      const error = new Error('Network error');
      mockedTaskAPI.fetchTasks.mockRejectedValue(error);

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.loadTasks();
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(mockedToast.error).toHaveBeenCalledWith(
        'タスクの読み込みに失敗しました',
        expect.objectContaining({
          duration: 5000,
          action: expect.objectContaining({
            label: '再試行',
            onClick: expect.any(Function),
          }),
        })
      );
    });

    it('should handle retry from toast action', async () => {
      const error = new Error('Network error');
      mockedTaskAPI.fetchTasks
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([mockTask]);

      const { result } = renderHook(() => useTaskStore());

      // 最初の失敗
      await act(async () => {
        await result.current.loadTasks();
      });

      expect(mockedToast.error).toHaveBeenCalled();
      const toastCall = mockedToast.error.mock.calls[0];
      const toastOptions = toastCall[1] as any;
      
      // リトライアクションを実行
      await act(async () => {
        await toastOptions.action.onClick();
      });

      expect(result.current.tasks).toEqual([mockTask]);
      expect(result.current.error).toBe(null);
      expect(mockedTaskAPI.fetchTasks).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status with optimistic UI and API call', async () => {
      const updatedTask: Task = { ...mockTask, status: 'in_progress', updatedAt: '2024-01-01T11:00:00Z' };
      mockedTaskAPI.updateTaskStatus.mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useTaskStore());

      // ストアに初期タスクを追加
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.updateTaskStatus('1', 'in_progress');
      });

      expect(result.current.tasks[0].status).toBe('in_progress');
      expect(result.current.tasks[0].updatedAt).toBe('2024-01-01T11:00:00Z');
      expect(mockedTaskAPI.updateTaskStatus).toHaveBeenCalledWith('1', 'in_progress');
    });

    it('should rollback optimistic update on API failure', async () => {
      const error = new Error('API Error');
      mockedTaskAPI.updateTaskStatus.mockRejectedValue(error);

      const { result } = renderHook(() => useTaskStore());

      // ストアに初期タスクを追加
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        try {
          await result.current.updateTaskStatus('1', 'in_progress');
        } catch (e) {
          // エラーは期待される
        }
      });

      // 楽観的更新がロールバックされることを確認
      expect(result.current.tasks[0].status).toBe('todo'); // 元の状態に戻る
      expect(mockedToast.error).toHaveBeenCalledWith(
        'タスクステータスの更新に失敗しました: API Error'
      );
    });

    it('should handle non-existent task gracefully', async () => {
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.updateTaskStatus('non-existent', 'done');
        } catch (e) {
          // エラーは期待される
        }
      });

      expect(mockedTaskAPI.updateTaskStatus).not.toHaveBeenCalled();
      expect(mockedToast.error).toHaveBeenCalledWith(
        'タスクが見つかりません'
      );
    });
  });

  describe('createTask', () => {
    it('should create task successfully and update store', async () => {
      const createInput: CreateTaskInput = {
        title: 'New Task',
        description: 'New Description',
      };

      const createdTask: Task = {
        ...mockTask,
        id: '2',
        title: 'New Task',
        description: 'New Description',
      };

      mockedTaskAPI.createTask.mockResolvedValue(createdTask);

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.createTask(createInput);
      });

      expect(result.current.tasks).toContainEqual(createdTask);
      expect(mockedTaskAPI.createTask).toHaveBeenCalledWith(createInput);
    });

    it('should handle create error', async () => {
      const error = new Error('Validation error');
      mockedTaskAPI.createTask.mockRejectedValue(error);

      const createInput: CreateTaskInput = {
        title: 'New Task',
      };

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.createTask(createInput);
        } catch (e) {
          // エラーは期待される
        }
      });

      expect(result.current.tasks).toEqual([]);
      expect(mockedToast.error).toHaveBeenCalledWith(
        'タスクの作成に失敗しました: Validation error'
      );
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updateInput: UpdateTaskInput = {
        title: 'Updated Task',
        description: 'Updated Description',
      };

      const updatedTask: Task = {
        ...mockTask,
        title: 'Updated Task',
        description: 'Updated Description',
        updatedAt: '2024-01-01T11:00:00Z',
      };

      mockedTaskAPI.updateTask.mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useTaskStore());

      // ストアに初期タスクを追加
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.updateTask('1', updateInput);
      });

      expect(result.current.tasks[0].title).toBe('Updated Task');
      expect(result.current.tasks[0].description).toBe('Updated Description');
      expect(mockedTaskAPI.updateTask).toHaveBeenCalledWith('1', updateInput);
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      mockedTaskAPI.deleteTask.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskStore());

      // ストアに初期タスクを追加
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.deleteTask('1');
      });

      expect(result.current.tasks).toEqual([]);
      expect(mockedTaskAPI.deleteTask).toHaveBeenCalledWith('1');
    });

    it('should handle delete error', async () => {
      const error = new Error('Delete failed');
      mockedTaskAPI.deleteTask.mockRejectedValue(error);

      const { result } = renderHook(() => useTaskStore());

      // ストアに初期タスクを追加
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        try {
          await result.current.deleteTask('1');
        } catch (e) {
          // エラーは期待される
        }
      });

      expect(result.current.tasks).toEqual([mockTask]); // タスクは削除されない
      expect(mockedToast.error).toHaveBeenCalledWith(
        'タスクの削除に失敗しました: Delete failed'
      );
    });
  });

  describe('Error state management', () => {
    it('should clear error state when operation succeeds', async () => {
      const mockTasks: Task[] = [mockTask];
      
      // 最初に失敗させる
      mockedTaskAPI.fetchTasks.mockRejectedValueOnce(new Error('Network error'));
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.loadTasks();
      });

      expect(result.current.error).toBe('Network error');

      // 次に成功させる
      mockedTaskAPI.fetchTasks.mockResolvedValueOnce(mockTasks);

      await act(async () => {
        await result.current.loadTasks();
      });

      expect(result.current.error).toBe(null);
      expect(result.current.tasks).toEqual(mockTasks);
    });
  });

  describe('Loading state management', () => {
    it('should manage loading state during async operations', async () => {
      let resolvePromise: (value: Task[]) => void;
      const promise = new Promise<Task[]>((resolve) => {
        resolvePromise = resolve;
      });

      mockedTaskAPI.fetchTasks.mockReturnValue(promise);

      const { result } = renderHook(() => useTaskStore());

      // 非同期操作を開始
      const loadPromise = act(async () => {
        await result.current.loadTasks();
      });

      // ローディング状態を確認
      expect(result.current.isLoading).toBe(true);

      // 操作を完了
      resolvePromise([mockTask]);
      await loadPromise;

      expect(result.current.isLoading).toBe(false);
      expect(result.current.tasks).toEqual([mockTask]);
    });
  });
});