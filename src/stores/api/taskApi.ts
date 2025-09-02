/**
 * TaskStore専用 軽量APIクライアント
 * 既存のAPIクライアントの複雑性を回避し、taskStoreに特化したシンプルな実装
 */

import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';

// API基盤設定
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3010';

// 基本APIクライアント
class SimpleApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      // 204 No Content の場合は空を返す
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// TaskStore専用APIクライアント
const taskApiClient = new SimpleApiClient(API_BASE_URL);

// API エンドポイント定数
const ENDPOINTS = {
  TASKS: '/api/tasks',
  TASK_BY_ID: (id: string) => `/api/tasks/${id}`,
} as const;

// TaskAPI 関数群
export const taskAPI = {
  // 全タスク取得
  fetchTasks: async (): Promise<Task[]> => {
    try {
      return await taskApiClient.get<Task[]>(ENDPOINTS.TASKS);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      throw new Error('タスクの取得に失敗しました');
    }
  },

  // タスク作成
  createTask: async (taskInput: CreateTaskInput): Promise<Task> => {
    try {
      return await taskApiClient.post<Task>(ENDPOINTS.TASKS, taskInput);
    } catch (error) {
      console.error('Failed to create task:', error);
      throw new Error('タスクの作成に失敗しました');
    }
  },

  // タスク更新
  updateTask: async (id: string, taskInput: UpdateTaskInput): Promise<Task> => {
    try {
      return await taskApiClient.put<Task>(ENDPOINTS.TASK_BY_ID(id), taskInput);
    } catch (error) {
      console.error('Failed to update task:', error);
      throw new Error('タスクの更新に失敗しました');
    }
  },

  // タスク削除
  deleteTask: async (id: string): Promise<void> => {
    try {
      await taskApiClient.delete<void>(ENDPOINTS.TASK_BY_ID(id));
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error('タスクの削除に失敗しました');
    }
  },
};