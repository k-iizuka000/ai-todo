/**
 * TaskStore Issue-038対応 - 専用単体テスト
 * タスク作成機能のUI表示問題の修正に関するテスト
 * 
 * テスト内容:
 * - lastUpdatedフィールドの追加と動作
 * - addTaskメソッドのAPI失敗時状態更新通知強化
 * - デバッグログの強化
 * - エラーハンドリングの改善
 */

import { act, renderHook } from '@testing-library/react';
import { useTaskStore } from '../taskStore';
import { taskAPI } from '../api/taskApi';
import { Task, CreateTaskInput } from '../../types/task';

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

const mockTaskAPI = taskAPI as any;

// テスト用データ
const mockCreateTaskInput: CreateTaskInput = {
  title: 'Issue-038 Test Task',
  description: 'Test task for Issue-038 functionality',
  priority: 'high',
  projectId: 'test-project',
  assigneeId: 'test-user',
  tags: [],
  dueDate: new Date('2025-12-31'),
  estimatedHours: 2,
};

const mockTask: Task = {
  id: 'issue038-task-1',
  title: mockCreateTaskInput.title!,
  description: mockCreateTaskInput.description,
  status: 'todo',
  priority: mockCreateTaskInput.priority!,
  projectId: mockCreateTaskInput.projectId,
  assigneeId: mockCreateTaskInput.assigneeId,
  tags: mockCreateTaskInput.tags || [],
  subtasks: [],
  dueDate: mockCreateTaskInput.dueDate,
  estimatedHours: mockCreateTaskInput.estimatedHours,
  actualHours: 0,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  createdBy: 'current-user',
  updatedBy: 'current-user',
};

describe('TaskStore Issue-038対応テスト', () => {
  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();
  });

  describe('lastUpdatedフィールドの動作テスト', () => {
    it('初期状態でlastUpdatedがnullである', () => {
      const { result } = renderHook(() => useTaskStore());
      
      expect(result.current.lastUpdated).toBeNull();
    });

    it('lastUpdatedフィールドが正しく定義されている', () => {
      const { result } = renderHook(() => useTaskStore());
      
      // lastUpdatedフィールドが存在し、初期値がnullであることを確認
      expect(result.current).toHaveProperty('lastUpdated');
      expect(result.current.lastUpdated).toBeNull();
    });
  });

  describe('addTask - Issue-038対応テスト', () => {
    it('正常なタスク作成でlastUpdatedが設定される', async () => {
      mockTaskAPI.createTask.mockResolvedValue(mockTask);
      
      const { result } = renderHook(() => useTaskStore());
      const beforeTime = new Date();

      await act(async () => {
        await result.current.addTask(mockCreateTaskInput);
      });
      
      const afterTime = new Date();

      // lastUpdatedが設定されていることを確認
      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.current.lastUpdated!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      
      // タスクが正常に追加されていることを確認
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(mockTask);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('API失敗時にlastUpdatedが設定され、エラー状態が正しく更新される', async () => {
      const errorMessage = 'API creation failed';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore());
      const beforeTime = new Date();

      await act(async () => {
        try {
          await result.current.addTask(mockCreateTaskInput);
        } catch (error) {
          // エラーが投げられることを期待
        }
      });
      
      const afterTime = new Date();

      // lastUpdatedがエラー時にも設定されることを確認
      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.current.lastUpdated!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      
      // エラー状態が正しく設定されることを確認
      expect(result.current.tasks).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('Optimistic UpdateでlastUpdatedが即座に設定される', async () => {
      // API呼び出しを遅延させて、Optimistic Updateのタイミングをテスト
      let resolveAPI: (value: Task) => void;
      const apiPromise = new Promise<Task>((resolve) => {
        resolveAPI = resolve;
      });
      mockTaskAPI.createTask.mockReturnValue(apiPromise);
      
      const { result } = renderHook(() => useTaskStore());
      const beforeTime = new Date();

      // addTaskを開始（まだ完了しない）
      const addTaskPromise = act(async () => {
        return result.current.addTask(mockCreateTaskInput);
      });

      // Optimistic Updateの段階でlastUpdatedが設定されているか確認
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0)); // next tick
      });

      expect(result.current.lastUpdated).not.toBeNull();
      expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      
      // Optimistic taskが追加されていることを確認
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id.startsWith('temp-')).toBe(true);
      expect(result.current.tasks[0].title).toBe(mockCreateTaskInput.title);

      // API完了
      act(() => {
        resolveAPI!(mockTask);
      });
      await addTaskPromise;

      // 最終的にreal taskに置き換わっていることを確認
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(mockTask);
    });
  });

  describe('デバッグログの強化テスト', () => {
    it('addTask成功時に詳細なログが出力される', async () => {
      mockTaskAPI.createTask.mockResolvedValue(mockTask);
      
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.addTask(mockCreateTaskInput);
      });

      // Issue-038の詳細ログが出力されることを確認
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] addTask started'),
        expect.objectContaining({
          taskInput: mockCreateTaskInput,
          startTime: expect.any(Number),
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] Optimistic update applied'),
        expect.objectContaining({
          tempId: expect.stringMatching(/^temp-\d+$/),
          optimisticTask: expect.objectContaining({
            id: expect.stringMatching(/^temp-\d+$/),
            title: mockCreateTaskInput.title,
          }),
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] API call starting'),
        expect.objectContaining({
          taskInput: mockCreateTaskInput,
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] API call successful'),
        expect.objectContaining({
          tempId: expect.stringMatching(/^temp-\d+$/),
          realTaskId: mockTask.id,
          duration: expect.any(Number),
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] Task creation completed successfully'),
        expect.objectContaining({
          taskId: mockTask.id,
          totalDuration: expect.any(Number),
          lastUpdated: expect.any(Date),
        })
      );
    });

    it('addTask失敗時に詳細なエラーログが出力される', async () => {
      const errorMessage = 'Network failure';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        try {
          await result.current.addTask(mockCreateTaskInput);
        } catch (error) {
          // エラーが投げられることを期待
        }
      });

      // Issue-038の詳細エラーログが出力されることを確認
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] API call failed, rolling back optimistic update'),
        expect.objectContaining({
          taskInput: mockCreateTaskInput,
          error: errorMessage,
          duration: expect.any(Number),
          rolledBackCount: expect.any(Number),
        }),
        expect.any(Error)
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] Task creation failed'),
        expect.objectContaining({
          taskInput: mockCreateTaskInput,
          error: errorMessage,
          totalDuration: expect.any(Number),
        }),
        expect.any(Error)
      );
    });
  });

  describe('エラーハンドリング改善テスト', () => {
    it('API失敗時のOptimistic Updateロールバックが正確に動作する', async () => {
      // 既存のタスクを設定（setTasksが公開されていないため、loadTasks経由で設定）
      const existingTask: Task = { ...mockTask, id: 'existing-task', title: 'Existing Task' };
      mockTaskAPI.fetchTasks.mockResolvedValue([existingTask]);
      mockTaskAPI.createTask.mockRejectedValue(new Error('Creation failed'));
      
      const { result } = renderHook(() => useTaskStore());
      
      // 既存タスクをロード
      await act(async () => {
        await result.current.loadTasks();
      });

      await act(async () => {
        try {
          await result.current.addTask(mockCreateTaskInput);
        } catch (error) {
          // エラーが投げられることを期待
        }
      });

      // 既存のタスクは残り、一時的なタスクのみが削除されることを確認
      expect(result.current.tasks).toEqual([existingTask]);
      expect(result.current.tasks.every(task => !task.id.startsWith('temp-'))).toBe(true);
      expect(result.current.error).toBe('Creation failed');
      expect(result.current.isLoading).toBe(false);
    });

    it('複数回のOptimistic Updateが正しく管理される', async () => {
      const task1Input: CreateTaskInput = { ...mockCreateTaskInput, title: 'Task 1' };
      const task2Input: CreateTaskInput = { ...mockCreateTaskInput, title: 'Task 2' };
      
      // 最初のAPIは成功、2つ目は失敗
      const successTask = { ...mockTask, id: 'success-task', title: 'Task 1' };
      mockTaskAPI.createTask
        .mockResolvedValueOnce(successTask)
        .mockRejectedValueOnce(new Error('Second task failed'));
      
      const { result } = renderHook(() => useTaskStore());

      // 最初のタスク作成（成功）
      await act(async () => {
        await result.current.addTask(task1Input);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(successTask);

      // 2つ目のタスク作成（失敗）
      await act(async () => {
        try {
          await result.current.addTask(task2Input);
        } catch (error) {
          // エラーが投げられることを期待
        }
      });

      // 最初のタスクは残り、2つ目のOptimistic Updateはロールバック
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(successTask);
      expect(result.current.error).toBe('Second task failed');
    });
  });
});