/**
 * タグ管理API連携用のインターフェース
 * 現在はスタブ実装（将来のAPI実装に備えた準備）
 */

import { Tag, CreateTagInput, UpdateTagInput } from '../types/tag';

// API基本設定
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || '/api';
const API_TIMEOUT = 10000; // 10秒

// APIエラー型定義
export interface ApiError {
  code: string;
  message: string;
  status: number;
}

// APIレスポンス型定義
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: ApiError;
}

// APIエンドポイント定義
export const TAG_ENDPOINTS = {
  // タグのCRUD操作
  getTags: () => `${API_BASE_URL}/tags`,
  getTag: (id: string) => `${API_BASE_URL}/tags/${id}`,
  createTag: () => `${API_BASE_URL}/tags`,
  updateTag: (id: string) => `${API_BASE_URL}/tags/${id}`,
  deleteTag: (id: string) => `${API_BASE_URL}/tags/${id}`,
  
  // タグの統計と分析
  getTagStats: () => `${API_BASE_URL}/tags/stats`,
  getTagUsage: (id: string) => `${API_BASE_URL}/tags/${id}/usage`,
  
  // 一括操作
  bulkCreateTags: () => `${API_BASE_URL}/tags/bulk`,
  bulkDeleteTags: () => `${API_BASE_URL}/tags/bulk`,
  
  // 同期処理
  syncTags: () => `${API_BASE_URL}/tags/sync`,
} as const;

// HTTPヘルパー関数
const createHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  // 将来の認証ヘッダー追加用
  // 'Authorization': `Bearer ${getAuthToken()}`,
});

const handleApiError = async (response: Response): Promise<never> => {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorMessage;
  } catch {
    // JSONパースに失敗した場合はデフォルトメッセージを使用
  }
  
  const apiError: ApiError = {
    code: `HTTP_${response.status}`,
    message: errorMessage,
    status: response.status,
  };
  
  throw apiError;
};

// 将来のAPI実装用のHTTPクライアント（現在は未使用）
const apiRequest = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...createHeaders(),
        ...options.headers,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      await handleApiError(response);
    }
    
    const data = await response.json();
    
    return {
      data,
      success: true,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        code: 'TIMEOUT',
        message: 'リクエストがタイムアウトしました',
        status: 408,
      } as ApiError;
    }
    
    throw error;
  }
};

// ============================================
// タグAPI関数（現在はスタブ実装）
// ============================================

/**
 * 全タグを取得
 */
export const fetchTags = async (): Promise<Tag[]> => {
  // TODO: 実際のAPI実装時に有効化（apiRequest関数を使用）
  /*
  try {
    const response = await apiRequest<Tag[]>(TAG_ENDPOINTS.getTags());
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    throw error;
  }
  */
  
  // スタブ実装: 現在はlocalStorageから読み込み
  console.log('[API STUB] fetchTags called - using localStorage');
  return new Promise((resolve) => {
    setTimeout(() => {
      const stored = localStorage.getItem('ai-todo-tags');
      if (stored) {
        const data = JSON.parse(stored);
        resolve(data.tags || []);
      } else {
        resolve([]);
      }
    }, 100); // 疑似的なネットワーク遅延
  });
};

/**
 * 特定のタグを取得
 */
export const fetchTag = async (id: string): Promise<Tag | null> => {
  // TODO: 実際のAPI実装時に有効化
  /*
  try {
    const response = await apiRequest<Tag>(TAG_ENDPOINTS.getTag(id));
    return response.data;
  } catch (error) {
    if ((error as ApiError).status === 404) {
      return null;
    }
    console.error('Failed to fetch tag:', error);
    throw error;
  }
  */
  
  // スタブ実装
  console.log(`[API STUB] fetchTag called with id: ${id}`);
  const tags = await fetchTags();
  return tags.find(tag => tag.id === id) || null;
};

/**
 * タグを作成
 */
export const createTag = async (input: CreateTagInput): Promise<Tag> => {
  // TODO: 実際のAPI実装時に有効化
  /*
  try {
    const response = await apiRequest<Tag>(TAG_ENDPOINTS.createTag(), {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create tag:', error);
    throw error;
  }
  */
  
  // スタブ実装
  console.log('[API STUB] createTag called with input:', input);
  return new Promise((resolve) => {
    setTimeout(() => {
      const newTag: Tag = {
        ...input,
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      resolve(newTag);
    }, 200);
  });
};

/**
 * タグを更新
 */
export const updateTag = async (id: string, updates: UpdateTagInput): Promise<Tag> => {
  // TODO: 実際のAPI実装時に有効化
  /*
  try {
    const response = await apiRequest<Tag>(TAG_ENDPOINTS.updateTag(id), {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update tag:', error);
    throw error;
  }
  */
  
  // スタブ実装
  console.log(`[API STUB] updateTag called with id: ${id}, updates:`, updates);
  const tags = await fetchTags();
  const existingTag = tags.find(tag => tag.id === id);
  
  if (!existingTag) {
    throw {
      code: 'NOT_FOUND',
      message: 'タグが見つかりません',
      status: 404,
    } as ApiError;
  }
  
  return {
    ...existingTag,
    ...updates,
    updatedAt: new Date(),
  };
};

/**
 * タグを削除
 */
export const deleteTag = async (id: string): Promise<void> => {
  // TODO: 実際のAPI実装時に有効化
  /*
  try {
    await apiRequest<void>(TAG_ENDPOINTS.deleteTag(id), {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    throw error;
  }
  */
  
  // スタブ実装
  console.log(`[API STUB] deleteTag called with id: ${id}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 150);
  });
};

/**
 * タグの使用統計を取得
 */
export const fetchTagUsage = async (id: string): Promise<{ isUsed: boolean; taskCount: number }> => {
  // TODO: 実際のAPI実装時に有効化
  /*
  try {
    const response = await apiRequest<{ isUsed: boolean; taskCount: number }>(
      TAG_ENDPOINTS.getTagUsage(id)
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tag usage:', error);
    throw error;
  }
  */
  
  // スタブ実装: LocalStorageベースのチェック
  console.log(`[API STUB] fetchTagUsage called with id: ${id}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const taskStoreData = localStorage.getItem('task-store');
        if (!taskStoreData) {
          resolve({ isUsed: false, taskCount: 0 });
          return;
        }
        
        const { state } = JSON.parse(taskStoreData);
        const tasks = state?.tasks || [];
        
        const usingTasks = tasks.filter((task: any) => 
          task.tags && task.tags.some((tag: any) => tag.id === id)
        );
        
        resolve({
          isUsed: usingTasks.length > 0,
          taskCount: usingTasks.length,
        });
      } catch (error) {
        console.error('Failed to check tag usage:', error);
        resolve({ isUsed: false, taskCount: 0 });
      }
    }, 100);
  });
};

/**
 * タグデータを同期
 */
export const syncTags = async (): Promise<Tag[]> => {
  // TODO: 実際のAPI実装時に有効化
  /*
  try {
    const response = await apiRequest<Tag[]>(TAG_ENDPOINTS.syncTags(), {
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    console.error('Failed to sync tags:', error);
    throw error;
  }
  */
  
  // スタブ実装
  console.log('[API STUB] syncTags called');
  return fetchTags();
};

// ============================================
// エラーハンドリングユーティリティ
// ============================================

/**
 * APIエラーかどうかを判定
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'status' in error
  );
};

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    switch (error.code) {
      case 'TIMEOUT':
        return 'ネットワークがタイムアウトしました。しばらく時間を置いて再度お試しください。';
      case 'HTTP_401':
        return '認証に失敗しました。ログインし直してください。';
      case 'HTTP_403':
        return 'この操作を実行する権限がありません。';
      case 'HTTP_404':
        return '指定されたタグが見つかりません。';
      case 'HTTP_409':
        return '同じ名前のタグが既に存在します。';
      case 'HTTP_422':
        return '入力内容に不備があります。確認して再度お試しください。';
      case 'HTTP_500':
        return 'サーバーエラーが発生しました。しばらく時間を置いて再度お試しください。';
      default:
        return error.message;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return '予期しないエラーが発生しました。';
};

// ============================================
// 将来の拡張用プレースホルダー
// ============================================

/**
 * 認証トークンを取得（将来実装）
 */
// const getAuthToken = (): string | null => {
//   return localStorage.getItem('auth_token');
// };

/**
 * リフレッシュトークンによる自動再認証（将来実装）
 */
// const refreshAuthToken = async (): Promise<string> => {
//   // 実装予定
// };

/**
 * オフライン対応の同期キュー（将来実装）
 */
// export class OfflineSyncQueue {
//   // 実装予定
// }