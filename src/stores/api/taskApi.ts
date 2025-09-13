/**
 * TaskStore専用 軽量APIクライアント
 * Issue #001 Mock Mode Fix: 最小構成でモック禁止・自動リトライなし
 */

import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';

// API基盤設定
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';
const TIMEOUT_MS = 5000; // 共通5秒タイムアウト

// 基本APIクライアント（シンプル構成）
class SimpleApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // シンプルリクエスト（リトライなし）
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
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

      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
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

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// TaskStore専用APIクライアント
const taskApiClient = new SimpleApiClient(API_BASE_URL);

// API エンドポイント定数
const ENDPOINTS = {
  TASKS: '/api/v1/tasks',
  TASK_BY_ID: (id: string) => `/api/v1/tasks/${id}`,
} as const;

// サーバーレスポンスの正規化関数
const normalizeTask = (serverTask: any): Task => {
  // ステータスの正規化（サーバーの様々な形式に対応）
  const normalizeStatus = (status: string): 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED' => {
    // 大文字ENUM形式と小文字スネークケース形式の両方に対応
    switch (status) {
      case 'TODO': 
      case 'todo': 
        return 'TODO';
      case 'IN_PROGRESS': 
      case 'in_progress': 
        return 'IN_PROGRESS';
      case 'DONE': 
      case 'done': 
        return 'DONE';
      case 'ARCHIVED': 
      case 'archived': 
        return 'ARCHIVED';
      default: 
        console.warn(`Unexpected task status value: "${status}". Defaulting to TODO.`);
        return 'TODO'; // デフォルト値
    }
  };

  // 日付フィールドの正規化（ISO文字列 → Date型）
  const normalizeDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    return new Date(dateValue);
  };

  // タグの正規化（サーバーのリレーション形状にも対応）
  const normalizeTags = (tags: any): any[] => {
    if (!tags || !Array.isArray(tags)) return [];

    return tags
      .map(item => {
        // 1) 既にTag形式のオブジェクト { id, name, color, ... }
        if (item && typeof item === 'object' && 'name' in item && 'id' in item) {
          return item;
        }

        // 2) Prismaの中間テーブル形状: { id: TaskTagId, tagId: string, tag: { id, name, ... } }
        if (item && typeof item === 'object' && 'tag' in item && item.tag && typeof item.tag === 'object') {
          return item.tag;
        }

        // 3) IDのみの場合は最小限のTagオブジェクトに変換（後段でTagStoreから名称解決）
        if (typeof item === 'string') {
          return {
            id: item,
            name: `Loading Tag...`, // 一時的な表示、後段のenrichTasksWithTagsで解決される
            color: '#9CA3AF',
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }

        // 4) それ以外は無視
        return null;
      })
      .filter(Boolean);
  };

  const normalizedStatus = normalizeStatus(serverTask.status);
  
  // デバッグログ: ステータス正規化結果
  if (normalizedStatus === 'TODO' && serverTask.status !== 'TODO' && serverTask.status !== 'todo') {
    console.warn(`Task ${serverTask.id} status normalized from "${serverTask.status}" to "TODO"`);
  }

  return {
    ...serverTask,
    status: normalizedStatus,
    createdAt: normalizeDate(serverTask.createdAt)!,
    updatedAt: normalizeDate(serverTask.updatedAt)!,
    dueDate: normalizeDate(serverTask.dueDate),
    tags: normalizeTags(serverTask.tags)
  };
};

// TaskAPI 関数群
export const taskAPI = {
  // 全タスク取得
  fetchTasks: async (): Promise<Task[]> => {
    try {
      const serverTasks = await taskApiClient.get<any[]>(ENDPOINTS.TASKS);
      
      // サーバーレスポンスを正規化
      const normalizedTasks = serverTasks.map(normalizeTask);
      
      // サーバがcreatedAt DESCで返せない場合はクライアントでソートを強制
      return normalizedTasks.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // DESC: 新しい順
      });
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
        status: 'TODO', // デフォルトでTODOに設定
        priority: taskInput.priority || 'MEDIUM', // デフォルト値を大文字に統一
        projectId: taskInput.projectId || null,
        assigneeId: taskInput.assigneeId || null,
        tagIds: taskInput.tags?.map(tag => tag.id) || [], // タグオブジェクトからIDを抽出
        dueDate: taskInput.dueDate || null,
        estimatedHours: taskInput.estimatedHours || null,
      };
      
      const serverTask = await taskApiClient.post<any>(ENDPOINTS.TASKS, serverTaskInput);
      return normalizeTask(serverTask);
    } catch (error) {
      console.error('Failed to create task:', error);
      throw new Error('タスクの作成に失敗しました');
    }
  },

  // タスク更新
  updateTask: async (id: string, taskInput: UpdateTaskInput): Promise<Task> => {
    try {
      // タグが含まれている場合は、IDに変換
      const serverTaskInput = taskInput.tags ? {
        ...taskInput,
        tagIds: taskInput.tags.map(tag => tag.id),
        tags: undefined // tagsフィールドを削除
      } : taskInput;

      const serverTask = await taskApiClient.put<any>(ENDPOINTS.TASK_BY_ID(id), serverTaskInput);
      return normalizeTask(serverTask);
    } catch (error) {
      console.error('Failed to update task:', error);
      throw new Error('タスクの更新に失敗しました');
    }
  },

  // タスクステータス更新（PATCH /api/v1/tasks/:id専用）
  updateTaskStatus: async (id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE'): Promise<Task> => {
    try {
      // デバッグ: API呼び出しの詳細をログ出力
      const endpoint = ENDPOINTS.TASK_BY_ID(id);
      const payload = { status };
      console.log('[taskAPI] Calling PATCH:', endpoint, payload);
      
      // 応答は少なくとも id, status, updatedAt を含む前提
      const serverTask = await taskApiClient.patch<any>(endpoint, payload);
      console.log('[taskAPI] PATCH response:', serverTask);
      
      return normalizeTask(serverTask);
    } catch (error) {
      console.error('[taskAPI] Failed to update task status:', error);
      throw new Error('タスクステータスの更新に失敗しました');
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
