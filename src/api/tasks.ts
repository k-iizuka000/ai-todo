/**
 * Task API Functions
 * タスクのCRUD操作API
 */

import { apiClient } from './client';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../types/task';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  archived: number;
  completionRate: number;
  priorityStats: {
    critical: number;
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  overdueTasks: number;
  dueSoonTasks: number;
  timeStats: {
    totalEstimated: number;
    totalActual: number;
  };
  efficiency: number;
}

export interface TaskQueryParams extends TaskFilter {
  page?: number;
  limit?: number;
}

// Task CRUD API functions
export const taskApi = {
  /**
   * タスク一覧取得
   */
  async getTasks(params: TaskQueryParams = {}): Promise<PaginatedResponse<Task>> {
    const queryParams: Record<string, any> = { ...params };
    
    // Convert arrays to comma-separated strings for API
    if (params.status) queryParams.status = params.status;
    if (params.priority) queryParams.priority = params.priority;
    if (params.tags) queryParams.tags = params.tags;
    
    // Convert dates to ISO strings
    if (params.dueDateFrom) queryParams.dueDateFrom = params.dueDateFrom.toISOString();
    if (params.dueDateTo) queryParams.dueDateTo = params.dueDateTo.toISOString();
    
    return apiClient.get<PaginatedResponse<Task>>('/tasks', queryParams);
  },

  /**
   * タスク詳細取得
   */
  async getTask(id: string): Promise<ApiResponse<Task>> {
    return apiClient.get<ApiResponse<Task>>(`/tasks/${id}`);
  },

  /**
   * タスク作成
   */
  async createTask(input: CreateTaskInput): Promise<ApiResponse<Task>> {
    // Convert frontend types to API types
    const apiInput = {
      ...input,
      priority: input.priority?.toUpperCase(),
      dueDate: input.dueDate?.toISOString(),
      tagIds: input.tags?.map(tag => tag.id)
    };

    // Remove frontend-specific fields
    const { tags, ...cleanInput } = apiInput;

    return apiClient.post<ApiResponse<Task>>('/tasks', cleanInput);
  },

  /**
   * タスク更新
   */
  async updateTask(id: string, input: UpdateTaskInput): Promise<ApiResponse<Task>> {
    // Convert frontend types to API types
    const apiInput = {
      ...input,
      status: input.status,
      priority: input.priority?.toUpperCase(),
      dueDate: input.dueDate?.toISOString(),
      tagIds: input.tags?.map(tag => tag.id)
    };

    // Remove frontend-specific fields
    const { tags, ...cleanInput } = apiInput;

    return apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, cleanInput);
  },

  /**
   * タスク削除
   */
  async deleteTask(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/tasks/${id}`);
  },

  /**
   * タスク統計取得
   */
  async getTaskStats(): Promise<ApiResponse<TaskStats>> {
    return apiClient.get<ApiResponse<TaskStats>>('/tasks/stats/summary');
  }
};

// Subtask API functions
export const subtaskApi = {
  /**
   * サブタスク一覧取得
   */
  async getSubtasks(taskId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<ApiResponse<any[]>>(`/subtasks/task/${taskId}`);
  },

  /**
   * サブタスク作成
   */
  async createSubtask(taskId: string, title: string): Promise<ApiResponse<any>> {
    return apiClient.post<ApiResponse<any>>('/subtasks', { taskId, title });
  },

  /**
   * サブタスク更新
   */
  async updateSubtask(id: string, input: { title?: string; completed?: boolean }): Promise<ApiResponse<any>> {
    return apiClient.put<ApiResponse<any>>(`/subtasks/${id}`, input);
  },

  /**
   * サブタスク削除
   */
  async deleteSubtask(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/subtasks/${id}`);
  }
};

// Tag API functions
export const tagApi = {
  /**
   * タグ一覧取得
   */
  async getTags(search?: string): Promise<ApiResponse<any[]>> {
    const params = search ? { search } : {};
    return apiClient.get<ApiResponse<any[]>>('/tags', params);
  },

  /**
   * 人気タグ取得
   */
  async getPopularTags(limit = 10): Promise<ApiResponse<any[]>> {
    return apiClient.get<ApiResponse<any[]>>('/tags/popular', { limit });
  },

  /**
   * タグ作成
   */
  async createTag(input: { name: string; color: string }): Promise<ApiResponse<any>> {
    return apiClient.post<ApiResponse<any>>('/tags', input);
  },

  /**
   * タグ更新
   */
  async updateTag(id: string, input: { name?: string; color?: string }): Promise<ApiResponse<any>> {
    return apiClient.put<ApiResponse<any>>(`/tags/${id}`, input);
  },

  /**
   * タグ削除
   */
  async deleteTag(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<ApiResponse<void>>(`/tags/${id}`);
  }
};