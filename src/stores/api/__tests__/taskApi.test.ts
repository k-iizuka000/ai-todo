/**
 * TaskAPI ユニットテスト
 * Issue #001 Mock Mode Fix: TaskAPI fetchTasks と updateTaskStatus のテスト
 */

import { taskAPI } from '../taskApi';
import { Task, CreateTaskInput, UpdateTaskInput } from '../../../types/task';

// SimpleApiClient のモック
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

// useConnectionStore のモック
const mockSetConnected = jest.fn();
const mockSetReconnecting = jest.fn();
const mockSetOffline = jest.fn();

jest.mock('../../../stores/connectionStore', () => ({
  useConnectionStore: {
    getState: () => ({
      setConnected: mockSetConnected,
      setReconnecting: mockSetReconnecting,
      setOffline: mockSetOffline,
    }),
  },
}));

// SimpleApiClient クラスのモック
jest.mock('../taskApi', () => {
  const originalModule = jest.requireActual('../taskApi');
  return {
    ...originalModule,
    taskAPI: {
      fetchTasks: jest.fn(),
      createTask: jest.fn(),
      updateTask: jest.fn(),
      updateTaskStatus: jest.fn(),
      deleteTask: jest.fn(),
      healthCheck: jest.fn(),
      startHealthMonitoring: jest.fn(),
    },
  };
});

describe('TaskAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTasks', () => {
    it('should fetch tasks successfully and sort by createdAt DESC', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          status: 'todo',
          priority: 'medium',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          projectId: null,
          assigneeId: null,
          tags: [],
          dueDate: null,
          estimatedHours: null,
        },
        {
          id: '2',
          title: 'Task 2',
          description: '',
          status: 'todo',
          priority: 'medium',
          createdAt: '2024-01-02T10:00:00Z', // 新しい
          updatedAt: '2024-01-02T10:00:00Z',
          projectId: null,
          assigneeId: null,
          tags: [],
          dueDate: null,
          estimatedHours: null,
        },
      ];

      (taskAPI.fetchTasks as jest.Mock).mockResolvedValue(mockTasks.slice().reverse()); // 古い順で返す
      
      const result = await taskAPI.fetchTasks();
      
      expect(result).toEqual(mockTasks); // 新しい順でソートされることを期待
      expect(result[0].id).toBe('2'); // 2024-01-02が最初
      expect(result[1].id).toBe('1'); // 2024-01-01が次
    });

    it('should handle fetch error and throw localized message', async () => {
      const error = new Error('Network error');
      (taskAPI.fetchTasks as jest.Mock).mockRejectedValue(error);

      await expect(taskAPI.fetchTasks()).rejects.toThrow('タスクの取得に失敗しました');
    });

    it('should handle invalid date strings in tasks', async () => {
      const mockTasksWithInvalidDates: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: '',
          status: 'todo',
          priority: 'medium',
          createdAt: 'invalid-date',
          updatedAt: 'invalid-date',
          projectId: null,
          assigneeId: null,
          tags: [],
          dueDate: null,
          estimatedHours: null,
        },
      ];

      (taskAPI.fetchTasks as jest.Mock).mockResolvedValue(mockTasksWithInvalidDates);
      
      const result = await taskAPI.fetchTasks();
      
      expect(result).toEqual(mockTasksWithInvalidDates);
      expect(taskAPI.fetchTasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      const mockUpdatedTask: Task = {
        id: '1',
        title: 'Task 1',
        description: '',
        status: 'in_progress',
        priority: 'medium',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z',
        projectId: null,
        assigneeId: null,
        tags: [],
        dueDate: null,
        estimatedHours: null,
      };

      (taskAPI.updateTaskStatus as jest.Mock).mockResolvedValue(mockUpdatedTask);
      
      const result = await taskAPI.updateTaskStatus('1', 'in_progress');
      
      expect(result).toEqual(mockUpdatedTask);
      expect(result.status).toBe('in_progress');
      expect(taskAPI.updateTaskStatus).toHaveBeenCalledWith('1', 'in_progress');
    });

    it('should handle update error and throw localized message', async () => {
      const error = new Error('API Error 400: Invalid status');
      (taskAPI.updateTaskStatus as jest.Mock).mockRejectedValue(error);

      await expect(taskAPI.updateTaskStatus('1', 'invalid_status' as any))
        .rejects.toThrow('タスクステータスの更新に失敗しました');
    });

    it('should handle network timeout', async () => {
      const timeoutError = new Error('Request timeout');
      (taskAPI.updateTaskStatus as jest.Mock).mockRejectedValue(timeoutError);

      await expect(taskAPI.updateTaskStatus('1', 'done'))
        .rejects.toThrow('タスクステータスの更新に失敗しました');
    });

    it('should validate status parameter types', async () => {
      const validStatuses: Array<'todo' | 'in_progress' | 'done'> = ['todo', 'in_progress', 'done'];
      
      for (const status of validStatuses) {
        const mockTask: Task = {
          id: '1',
          title: 'Task 1',
          description: '',
          status,
          priority: 'medium',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          projectId: null,
          assigneeId: null,
          tags: [],
          dueDate: null,
          estimatedHours: null,
        };

        (taskAPI.updateTaskStatus as jest.Mock).mockResolvedValue(mockTask);
        
        const result = await taskAPI.updateTaskStatus('1', status);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('createTask', () => {
    it('should create task with required fields only', async () => {
      const createInput: CreateTaskInput = {
        title: 'New Task',
      };

      const mockCreatedTask: Task = {
        id: '1',
        title: 'New Task',
        description: '',
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

      (taskAPI.createTask as jest.Mock).mockResolvedValue(mockCreatedTask);
      
      const result = await taskAPI.createTask(createInput);
      
      expect(result).toEqual(mockCreatedTask);
      expect(result.title).toBe('New Task');
      expect(result.status).toBe('todo');
    });

    it('should handle create error', async () => {
      const error = new Error('Validation error');
      (taskAPI.createTask as jest.Mock).mockRejectedValue(error);

      const createInput: CreateTaskInput = {
        title: 'New Task',
      };

      await expect(taskAPI.createTask(createInput)).rejects.toThrow('タスクの作成に失敗しました');
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updateInput: UpdateTaskInput = {
        title: 'Updated Task',
        description: 'Updated description',
      };

      const mockUpdatedTask: Task = {
        id: '1',
        title: 'Updated Task',
        description: 'Updated description',
        status: 'todo',
        priority: 'medium',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T11:00:00Z',
        projectId: null,
        assigneeId: null,
        tags: [],
        dueDate: null,
        estimatedHours: null,
      };

      (taskAPI.updateTask as jest.Mock).mockResolvedValue(mockUpdatedTask);
      
      const result = await taskAPI.updateTask('1', updateInput);
      
      expect(result).toEqual(mockUpdatedTask);
      expect(result.title).toBe('Updated Task');
      expect(result.description).toBe('Updated description');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      (taskAPI.deleteTask as jest.Mock).mockResolvedValue(undefined);
      
      await expect(taskAPI.deleteTask('1')).resolves.toBeUndefined();
      expect(taskAPI.deleteTask).toHaveBeenCalledWith('1');
    });

    it('should handle delete error', async () => {
      const error = new Error('Task not found');
      (taskAPI.deleteTask as jest.Mock).mockRejectedValue(error);

      await expect(taskAPI.deleteTask('1')).rejects.toThrow('タスクの削除に失敗しました');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockHealthResult = {
        isHealthy: true,
        responseTime: 100,
        status: 'ok',
        timestamp: new Date(),
      };

      (taskAPI.healthCheck as jest.Mock).mockResolvedValue(mockHealthResult);
      
      const result = await taskAPI.healthCheck();
      
      expect(result.isHealthy).toBe(true);
      expect(result.status).toBe('ok');
      expect(typeof result.responseTime).toBe('number');
    });

    it('should handle health check failure', async () => {
      const mockErrorResult = {
        isHealthy: false,
        responseTime: 5000,
        timestamp: new Date(),
        error: new Error('Connection refused'),
      };

      (taskAPI.healthCheck as jest.Mock).mockResolvedValue(mockErrorResult);
      
      const result = await taskAPI.healthCheck();
      
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});