/**
 * TaskStore Issue-038対応 - 修正版単体テスト
 * タスク作成機能のUI表示問題の修正に関するテスト
 * 
 * テスト内容:
 * - lastUpdatedフィールドの追加と動作
 * - addTaskメソッドのAPI失敗時状態更新通知強化（モックモード）
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

describe('TaskStore Issue-038対応テスト（修正版）', () => {
  beforeEach(() => {
    // モックをリセット
    vi.clearAllMocks();
    
    // ストアをリセット
    const { result } = renderHook(() => useTaskStore(state => state.resetStore));
    act(() => {
      result.current();
    });
  });

  describe('lastUpdatedフィールドの動作テスト', () => {
    it('初期状態でlastUpdatedがundefinedである', () => {
      const { result } = renderHook(() => useTaskStore(state => state.lastUpdated));
      
      expect(result.current).toBeUndefined();
    });

    it('lastUpdatedフィールドが正しく定義されている', () => {
      const { result } = renderHook(() => useTaskStore(state => ({
        lastUpdated: state.lastUpdated
      })));
      
      // lastUpdatedフィールドが存在し、初期値がundefinedであることを確認
      expect(result.current).toHaveProperty('lastUpdated');
      expect(result.current.lastUpdated).toBeUndefined();
    });
  });

  describe('addTask - API成功時のテスト', () => {
    it('正常なタスク作成でlastUpdatedが設定される', async () => {
      mockTaskAPI.createTask.mockResolvedValue(mockTask);
      
      const { result } = renderHook(() => useTaskStore(state => ({
        addTask: state.addTask,
        tasks: state.tasks,
        lastUpdated: state.lastUpdated,
        isLoading: state.isLoading,
        error: state.error
      })));
      const beforeTime = Date.now();

      await act(async () => {
        await result.current.addTask(mockCreateTaskInput);
      });
      
      const afterTime = Date.now();

      // lastUpdatedが設定されていることを確認（number型のタイムスタンプ）
      expect(result.current.lastUpdated).toBeDefined();
      expect(result.current.lastUpdated!).toBeGreaterThanOrEqual(beforeTime);
      expect(result.current.lastUpdated!).toBeLessThanOrEqual(afterTime);
      
      // タスクが正常に追加されていることを確認
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(mockTask);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('addTask - API失敗時のモックモード', () => {
    it('ネットワークエラー時にモックモードでタスクが保持される', async () => {
      const errorMessage = 'NetworkError: fetch failed';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore(state => ({
        addTask: state.addTask,
        tasks: state.tasks,
        lastUpdated: state.lastUpdated,
        isLoading: state.isLoading,
        error: state.error
      })));
      const beforeTime = Date.now();

      let createdTask: Task;
      await act(async () => {
        createdTask = await result.current.addTask(mockCreateTaskInput);
      });
      
      const afterTime = Date.now();

      // lastUpdatedがモックモード時にも設定されることを確認
      expect(result.current.lastUpdated).toBeDefined();
      expect(result.current.lastUpdated!).toBeGreaterThanOrEqual(beforeTime);
      expect(result.current.lastUpdated!).toBeLessThanOrEqual(afterTime);
      
      // モックモード：タスクは保持され、エラーはnull（成功扱い）
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].title).toBe(mockCreateTaskInput.title);
      expect(result.current.tasks[0].id).toMatch(/^task-\d+-[a-z0-9]+$/); // モックIDパターン
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull(); // モックモードではエラーなし
      
      // 返されたタスクがモックタスクであることを確認
      expect(createdTask!.id).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(createdTask!.title).toBe(mockCreateTaskInput.title);
    });

    it('認証エラー時にもモックモードでタスクが保持される', async () => {
      const errorMessage = '401 Unauthorized';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore(state => ({
        addTask: state.addTask,
        tasks: state.tasks,
        error: state.error
      })));

      await act(async () => {
        await result.current.addTask(mockCreateTaskInput);
      });

      // 認証エラーでもモックモードでタスク保持
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.error).toBeNull(); // モックモードなのでエラーなし
    });

    it('バリデーションエラー時にthrowされる', async () => {
      const errorMessage = 'validation failed: title is required';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore(state => ({
        addTask: state.addTask,
        tasks: state.tasks
      })));

      await act(async () => {
        await expect(result.current.addTask(mockCreateTaskInput)).rejects.toThrow(errorMessage);
      });

      // バリデーションエラーの場合はthrowされ、タスクは保持されない
      expect(result.current.tasks).toHaveLength(0);
    });
  });

  describe('デバッグログの確認', () => {
    it('API成功時に詳細なログが出力される', async () => {
      mockTaskAPI.createTask.mockResolvedValue(mockTask);
      
      const { result } = renderHook(() => useTaskStore(state => ({
        addTask: state.addTask
      })));

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
        expect.stringContaining('[Issue #038] Task creation completed successfully'),
        expect.objectContaining({
          taskId: mockTask.id,
          totalDuration: expect.any(Number),
          lastUpdated: expect.any(Number), // number型のタイムスタンプ
        })
      );
    });

    it('API失敗時（ネットワークエラー）にモックモードログが出力される', async () => {
      const errorMessage = 'NetworkError: fetch failed';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore(state => ({
        addTask: state.addTask
      })));

      await act(async () => {
        await result.current.addTask(mockCreateTaskInput);
      });

      // モックモード詳細ログの確認
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] API failed (NETWORK_ERROR), keeping task in mock mode'),
        expect.objectContaining({
          taskInput: mockCreateTaskInput,
          errorType: 'NETWORK_ERROR',
        }),
        expect.any(Error)
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] Task created in mock mode with enhanced state update'),
        expect.objectContaining({
          taskId: expect.stringMatching(/^task-\d+-[a-z0-9]+$/),
          totalTasks: 1,
          timestamp: expect.any(Number),
          stateUpdateTrigger: 'enhanced',
          errorType: 'NETWORK_ERROR',
          duration: expect.any(Number),
        })
      );
    });
  });
});