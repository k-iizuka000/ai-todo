/**
 * TaskStore専用 軽量APIクライアント
 * 既存のAPIクライアントの複雑性を回避し、taskStoreに特化したシンプルな実装
 */

import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';
import { useConnectionStore } from '../connectionStore';

// API基盤設定
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// リトライ設定
interface RetryConfig {
  maxRetries: number;
  retryDelays: number[];
  timeoutMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000], // 指数バックオフ: 1秒→2秒→4秒
  timeoutMs: 5000
};

// 基本APIクライアント（リトライ機構付き）
class SimpleApiClient {
  private baseURL: string;
  private retryConfig: RetryConfig;

  constructor(baseURL: string, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.baseURL = baseURL;
    this.retryConfig = retryConfig;
  }

  // リトライ機構付きリクエスト
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

    let lastError: Error;
    
    // 初回 + リトライ回数分試行
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.retryConfig.timeoutMs);
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        // 204 No Content の場合は空を返す
        if (response.status === 204) {
          return undefined as T;
        }

        const result = await response.json();
        
        // 成功時は接続状態を更新
        if (attempt > 0) {
          useConnectionStore.getState().setConnected();
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // 最後の試行または中断エラーの場合はリトライしない
        if (attempt === this.retryConfig.maxRetries || error instanceof DOMException) {
          break;
        }
        
        // リトライ前の待機
        const delay = this.retryConfig.retryDelays[attempt] || this.retryConfig.retryDelays[this.retryConfig.retryDelays.length - 1];
        console.warn(`API request failed (attempt ${attempt + 1}), retrying in ${delay}ms...`, error);
        
        // 接続状態を再接続中に更新
        useConnectionStore.getState().setReconnecting(attempt + 1);
        
        await this.sleep(delay);
      }
    }
    
    console.error('API request failed after all retries:', lastError);
    throw lastError;
  }

  // ユーティリティ: Sleep関数
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// ヘルスチェック結果の型定義
interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  status?: string;
  timestamp: Date;
  error?: Error;
}

// API エンドポイント定数
const ENDPOINTS = {
  TASKS: '/api/v1/tasks',
  TASK_BY_ID: (id: string) => `/api/v1/tasks/${id}`,
  HEALTH: '/health',
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
      // サーバースキーマに合わせてデータを変換
      const serverTaskInput = {
        title: taskInput.title,
        description: taskInput.description || '',
        status: 'todo', // デフォルトでtodoに設定
        priority: taskInput.priority || 'medium', // デフォルト値を小文字に統一
        projectId: taskInput.projectId || null,
        assigneeId: taskInput.assigneeId || null,
        tags: taskInput.tags || [],
        dueDate: taskInput.dueDate || null,
        estimatedHours: taskInput.estimatedHours || null,
      };
      
      return await taskApiClient.post<Task>(ENDPOINTS.TASKS, serverTaskInput);
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

  // ヘルスチェック機能
  healthCheck: async (): Promise<HealthCheckResult> => {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      const response = await taskApiClient.get<{ status: string; timestamp: string; service: string }>(ENDPOINTS.HEALTH);
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        isHealthy: response.status === 'ok',
        responseTime,
        status: response.status,
        timestamp
      };
      
      // 接続状態を更新
      if (result.isHealthy) {
        useConnectionStore.getState().setConnected();
      } else {
        useConnectionStore.getState().setOffline(new Error(`Unhealthy status: ${response.status}`));
      }
      
      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const result: HealthCheckResult = {
        isHealthy: false,
        responseTime,
        timestamp,
        error: error as Error
      };
      
      // 接続状態をオフラインに更新
      useConnectionStore.getState().setOffline(error as Error);
      
      return result;
    }
  },

  // 定期ヘルスチェック管理
  startHealthMonitoring: (intervalMs: number = 30000): () => void => {
    const healthCheckInterval = setInterval(async () => {
      try {
        await taskAPI.healthCheck();
      } catch (error) {
        console.error('Health check monitoring error:', error);
      }
    }, intervalMs);
    
    // 初回ヘルスチェック実行
    taskAPI.healthCheck().catch(console.error);
    
    // 停止関数を返す
    return () => {
      clearInterval(healthCheckInterval);
    };
  },
};