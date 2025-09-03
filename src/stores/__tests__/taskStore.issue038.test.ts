/**
 * TaskStore Issue-038対応 - 簡素化単体テスト
 * タスク作成機能のUI表示問題の修正に関するテスト
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
};

const mockTask: Task = {
  id: 'issue038-task-1',
  title: mockCreateTaskInput.title!,
  description: mockCreateTaskInput.description,
  status: 'todo',
  priority: mockCreateTaskInput.priority!,
  projectId: undefined,
  assigneeId: undefined,
  tags: [],
  subtasks: [],
  dueDate: undefined,
  estimatedHours: undefined,
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

  describe('API成功時のテスト', () => {
    it('正常なタスク作成でlastUpdatedが設定される', async () => {
      mockTaskAPI.createTask.mockResolvedValue(mockTask);
      
      const { result } = renderHook(() => useTaskStore());
      const beforeTime = Date.now();

      await act(async () => {
        await result.current.getState().addTask(mockCreateTaskInput);
      });
      
      const afterTime = Date.now();
      const state = result.current.getState();

      // lastUpdatedが設定されていることを確認
      expect(state.lastUpdated).toBeDefined();
      expect(state.lastUpdated!).toBeGreaterThanOrEqual(beforeTime);
      expect(state.lastUpdated!).toBeLessThanOrEqual(afterTime);
      
      // タスクが正常に追加されていることを確認
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0]).toEqual(mockTask);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('API失敗時のモックモードテスト', () => {
    it('API失敗時にモックモードでタスクが保持される', async () => {
      const errorMessage = 'API creation failed';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore());
      const beforeTime = Date.now();

      let createdTask: Task;
      await act(async () => {
        createdTask = await result.current.getState().addTask(mockCreateTaskInput);
      });
      
      const afterTime = Date.now();
      const state = result.current.getState();

      // lastUpdatedがモックモード時にも設定されることを確認
      expect(state.lastUpdated).toBeDefined();
      expect(state.lastUpdated!).toBeGreaterThanOrEqual(beforeTime);
      expect(state.lastUpdated!).toBeLessThanOrEqual(afterTime);
      
      // モックモード：タスクは保持され、エラーはnull（成功扱い）
      expect(state.tasks).toHaveLength(1);
      expect(state.tasks[0].title).toBe(mockCreateTaskInput.title);
      expect(state.tasks[0].id).toMatch(/^task-\d+-[a-z0-9]+$/); // モックIDパターン
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull(); // モックモードではエラーなし
      
      // 返されたタスクがモックタスクであることを確認
      expect(createdTask!.id).toMatch(/^task-\d+-[a-z0-9]+$/);
      expect(createdTask!.title).toBe(mockCreateTaskInput.title);
    });
  });

  describe('デバッグログの確認', () => {
    it('API失敗時にモックモードでの詳細ログが出力される', async () => {
      const errorMessage = 'Network failure';
      mockTaskAPI.createTask.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.getState().addTask(mockCreateTaskInput);
      });

      // API失敗時のモックモードログが出力されることを確認
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] API failed, keeping task in mock mode'),
        expect.objectContaining({
          taskInput: mockCreateTaskInput,
        }),
        expect.any(Error)
      );

      // モックモード成功ログが出力されることを確認
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('[Issue #038] Task created in mock mode with enhanced state update'),
        expect.objectContaining({
          taskId: expect.stringMatching(/^task-\d+-[a-z0-9]+$/),
          totalTasks: 1,
          timestamp: expect.any(Number),
          stateUpdateTrigger: 'enhanced',
          duration: expect.any(Number),
        })
      );
    });
  });
});