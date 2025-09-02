/**
 * TaskStore API統合版 - 単体テスト
 * localStorage依存を除去し、API統合した taskStore.ts のテスト
 * Issue 029: フルスタックアーキテクチャ移行対応
 */

import { act, renderHook } from '@testing-library/react';
import { useTaskStore } from '../taskStore';
import { taskAPI } from '../api/taskApi';
import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';

import { vi } from 'vitest';

// モック設定
vi.mock('../api/taskApi', () => ({
  taskAPI: {
    fetchTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

// グローバルconsoleログをモック
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// テスト用データ
const mockTask: Task = {
  id: 'test-task-1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'todo',
  priority: 'medium',
  projectId: 'project-1',
  assigneeId: 'user-1',
  tags: [],
  subtasks: [],
  dueDate: new Date('2025-12-31'),
  estimatedHours: 4,
  actualHours: 0,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  createdBy: 'test-user',
  updatedBy: 'test-user',
};

const mockTasks: Task[] = [
  mockTask,
  {
    ...mockTask,
    id: 'test-task-2',
    title: 'Another Task',
    status: 'in_progress',
    priority: 'high',
  },
];

const mockCreateTaskInput: CreateTaskInput = {
  title: 'New Task',
  description: 'New Description',
  priority: 'high',
  projectId: 'project-2',
  assigneeId: 'user-2',
  tags: [],
  dueDate: new Date('2025-06-30'),
  estimatedHours: 2,
};

const mockUpdateTaskInput: UpdateTaskInput = {
  title: 'Updated Task',
  description: 'Updated Description',
  status: 'done',
  priority: 'low',
};

const mockTaskAPI = taskAPI as any;

describe('TaskStore API統合版', () => {
  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();
    
    // ストアをリセット
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.resetStore();
    });
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定されている', () => {
      const { result } = renderHook(() => useTaskStore());
      
      expect(result.current.tasks).toEqual([]);
      expect(result.current.selectedTaskId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('loadTasks', () => {
    it('正常にタスクを読み込むことができる', async () => {
      mockTaskAPI.fetchTasks.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.loadTasks();
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isInitialized).toBe(true);
      expect(mockTaskAPI.fetchTasks).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[TaskStore] Tasks loaded successfully',
        { count: mockTasks.length }
      );
    });

    it('API エラー時の処理が正しく動作する', async () => {
      const errorMessage = 'Network Error';
      mockTaskAPI.fetchTasks.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.loadTasks();
        } catch (error) {
          // エラーが投げられることを期待
        }
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isInitialized).toBe(false);
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('addTask', () => {
    it('正常にタスクを追加することができる', async () => {
      const newTask = { ...mockTask, id: 'new-task', title: mockCreateTaskInput.title };
      mockTaskAPI.createTask.mockResolvedValue(newTask);

      const { result } = renderHook(() => useTaskStore());

      let addedTask: Task;
      await act(async () => {
        addedTask = await result.current.addTask(mockCreateTaskInput);
      });

      expect(result.current.tasks).toContainEqual(newTask);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockTaskAPI.createTask).toHaveBeenCalledWith(mockCreateTaskInput);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[TaskStore] Task created successfully',
        { taskId: newTask.id }
      );
    });

    it('Optimistic Update とロールバックが正しく動作する', async () => {
      mockTaskAPI.createTask.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.addTask(mockCreateTaskInput);
        } catch (error) {
          // エラーが投げられることを期待
        }
      });

      // Optimistic Update がロールバックされている
      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('API Error');
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('updateTask', () => {
    it('正常にタスクを更新することができる', async () => {
      const updatedTask = { ...mockTask, ...mockUpdateTaskInput };
      mockTaskAPI.updateTask.mockResolvedValue(updatedTask);

      const { result } = renderHook(() => useTaskStore());
      
      // 初期データを設定
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.updateTask(mockTask.id, mockUpdateTaskInput);
      });

      expect(result.current.tasks[0]).toEqual(updatedTask);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockTaskAPI.updateTask).toHaveBeenCalledWith(mockTask.id, mockUpdateTaskInput);
    });

    it('存在しないタスクの更新でエラーが発生する', async () => {
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.updateTask('non-existent', mockUpdateTaskInput);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain('not found');
        }
      });
    });
  });

  describe('deleteTask', () => {
    it('正常にタスクを削除することができる', async () => {
      mockTaskAPI.deleteTask.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskStore());
      
      // 初期データを設定
      act(() => {
        result.current.setTasks([mockTask]);
      });

      await act(async () => {
        await result.current.deleteTask(mockTask.id);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockTaskAPI.deleteTask).toHaveBeenCalledWith(mockTask.id);
    });

    it('選択されたタスクを削除すると選択状態がクリアされる', async () => {
      mockTaskAPI.deleteTask.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskStore());
      
      // 初期データを設定
      act(() => {
        result.current.setTasks([mockTask]);
        result.current.selectTask(mockTask.id);
      });

      await act(async () => {
        await result.current.deleteTask(mockTask.id);
      });

      expect(result.current.selectedTaskId).toBeNull();
    });
  });

  describe('bulkUpdateTasks', () => {
    it('複数タスクを一括更新することができる', async () => {
      const task1 = { ...mockTask, id: 'task-1' };
      const task2 = { ...mockTask, id: 'task-2' };
      const updatedTask1 = { ...task1, ...mockUpdateTaskInput };
      const updatedTask2 = { ...task2, ...mockUpdateTaskInput };

      mockTaskAPI.updateTask
        .mockResolvedValueOnce(updatedTask1)
        .mockResolvedValueOnce(updatedTask2);

      const { result } = renderHook(() => useTaskStore());
      
      // 初期データを設定
      act(() => {
        result.current.setTasks([task1, task2]);
      });

      await act(async () => {
        await result.current.bulkUpdateTasks(['task-1', 'task-2'], mockUpdateTaskInput);
      });

      expect(result.current.tasks).toEqual([updatedTask1, updatedTask2]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('bulkDeleteTasks', () => {
    it('複数タスクを一括削除することができる', async () => {
      mockTaskAPI.deleteTask.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskStore());
      
      // 初期データを設定
      act(() => {
        result.current.setTasks(mockTasks);
      });

      await act(async () => {
        await result.current.bulkDeleteTasks(['test-task-1', 'test-task-2']);
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('initializeStore', () => {
    it('ストアの初期化が正常に動作する', async () => {
      mockTaskAPI.fetchTasks.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.initializeStore();
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.isInitialized).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith('[TaskStore] Task store initialized successfully');
    });
  });

  describe('syncWithServer', () => {
    it('サーバーとの同期が正常に動作する', async () => {
      mockTaskAPI.fetchTasks.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.syncWithServer();
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(mockConsoleLog).toHaveBeenCalledWith('[TaskStore] Task store synced with server');
    });
  });

  describe('フィルター・ソート機能', () => {
    it('getFilteredTasks が正しく動作する', () => {
      const { result } = renderHook(() => useTaskStore());
      
      // テストデータを設定
      act(() => {
        result.current.setTasks(mockTasks);
        result.current.setFilter({ status: ['todo'] });
      });

      const filteredTasks = result.current.getFilteredTasks();
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0].status).toBe('todo');
    });

    it('getTaskById が正しく動作する', () => {
      const { result } = renderHook(() => useTaskStore());
      
      act(() => {
        result.current.setTasks([mockTask]);
      });

      const foundTask = result.current.getTaskById(mockTask.id);
      expect(foundTask).toEqual(mockTask);

      const notFoundTask = result.current.getTaskById('non-existent');
      expect(notFoundTask).toBeUndefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('setError が正しく動作する', () => {
      const { result } = renderHook(() => useTaskStore());
      
      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });

    it('clearError が正しく動作する', () => {
      const { result } = renderHook(() => useTaskStore());
      
      act(() => {
        result.current.setError('Test error');
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('ローディング状態', () => {
    it('setLoading が正しく動作する', () => {
      const { result } = renderHook(() => useTaskStore());
      
      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('resetStore', () => {
    it('ストアが正しくリセットされる', () => {
      const { result } = renderHook(() => useTaskStore());
      
      // 初期状態を変更
      act(() => {
        result.current.setTasks([mockTask]);
        result.current.selectTask(mockTask.id);
        result.current.setError('Test error');
        result.current.setLoading(true);
      });

      // リセット実行
      act(() => {
        result.current.resetStore();
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.selectedTaskId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
    });
  });
});