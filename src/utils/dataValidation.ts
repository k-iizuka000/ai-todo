/**
 * データバリデーション層
 * 設計書に従ったデータ整合性保証の実装
 */

import type { TaskDetail } from '@/types/task';
import type { AnalyticsDashboard, ProjectStats, ProjectDetail } from '@/types/analytics';

/**
 * データバリデーションサービス
 */
export class DataValidationService {
  /**
   * TaskDetail のバリデーション
   * 必須フィールドのデフォルト値を保証
   */
  static validateTaskDetail(data: any): TaskDetail {
    if (!data) {
      throw new Error('TaskDetail data is required');
    }

    return {
      ...data,
      childTasks: data.childTasks || [], // デフォルト値の保証
      subtasks: data.subtasks || [],
      tags: data.tags || [],
      attachments: data.attachments || [],
      comments: data.comments || [],
      history: data.history || []
    };
  }

  /**
   * Analytics データのバリデーション
   * projectStats フィールドの存在を保証
   */
  static validateAnalyticsDashboard(data: any): AnalyticsDashboard {
    if (!data) {
      throw new Error('AnalyticsDashboard data is required');
    }

    return {
      ...data,
      projectStats: data.projectStats || {
        active: 0,
        completed: 0,
        planning: 0,
        onHold: 0,
        archived: 0,
        total: 0
      },
      projectDetails: data.projectDetails || []
    };
  }

  /**
   * ProjectStats のバリデーション
   */
  static validateProjectStats(data: any): ProjectStats {
    if (!data) {
      return {
        active: 0,
        completed: 0,
        planning: 0,
        onHold: 0,
        archived: 0,
        total: 0
      };
    }

    return {
      active: Number(data.active) || 0,
      completed: Number(data.completed) || 0,
      planning: Number(data.planning) || 0,
      onHold: Number(data.onHold) || 0,
      archived: Number(data.archived) || 0,
      total: Number(data.total) || 0
    };
  }

  /**
   * ProjectDetail 配列のバリデーション
   */
  static validateProjectDetails(data: any[]): ProjectDetail[] {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(project => ({
      id: project.id || '',
      name: project.name || 'Unknown Project',
      icon: project.icon || '📁',
      totalTasks: Number(project.totalTasks) || 0,
      completedTasks: Number(project.completedTasks) || 0,
      inProgressTasks: Number(project.inProgressTasks) || 0,
      todoTasks: Number(project.todoTasks) || 0,
      progressPercentage: Number(project.progressPercentage) || 0,
      estimatedHours: Number(project.estimatedHours) || 0,
      actualHours: Number(project.actualHours) || 0
    }));
  }
}

/**
 * 安全なデータ取得ヘルパー
 * エラー時にデフォルト値を返す
 */
export const safeGetData = <T>(
  fetcher: () => T,
  defaultValue: T,
  validator?: (data: T) => boolean
): T => {
  try {
    const data = fetcher();
    if (validator && !validator(data)) {
      console.warn('Data validation failed, using default');
      return defaultValue;
    }
    return data;
  } catch (error) {
    console.error('Data fetch error:', error);
    return defaultValue;
  }
};

/**
 * 安全な配列アクセス
 */
export const safeArrayAccess = <T>(
  array: T[] | undefined | null,
  defaultValue: T[] = []
): T[] => {
  return Array.isArray(array) ? array : defaultValue;
};

/**
 * オブジェクトの必須プロパティ確認
 */
export const ensureRequiredProperties = <T extends Record<string, any>>(
  obj: Partial<T>,
  requiredKeys: (keyof T)[],
  defaults: Partial<T> = {}
): T => {
  const result = { ...obj };
  
  requiredKeys.forEach(key => {
    if (result[key] === undefined || result[key] === null) {
      result[key] = defaults[key];
    }
  });
  
  return result as T;
};

/**
 * 安全な数値変換
 */
export const safeParseNumber = (
  value: any,
  defaultValue: number = 0,
  min?: number,
  max?: number
): number => {
  try {
    const num = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(num) || !isFinite(num)) {
      return defaultValue;
    }
    
    if (min !== undefined && num < min) {
      return min;
    }
    
    if (max !== undefined && num > max) {
      return max;
    }
    
    return num;
  } catch {
    return defaultValue;
  }
};

/**
 * 安全な整数変換
 */
export const safeParseInt = (
  value: any,
  defaultValue: number = 0,
  min?: number,
  max?: number
): number => {
  try {
    const num = typeof value === 'number' ? Math.floor(value) : parseInt(value, 10);
    
    if (isNaN(num) || !isFinite(num)) {
      return defaultValue;
    }
    
    if (min !== undefined && num < min) {
      return min;
    }
    
    if (max !== undefined && num > max) {
      return max;
    }
    
    return num;
  } catch {
    return defaultValue;
  }
};

/**
 * 安全な日付変換
 */
export const safeParseDate = (
  value: any,
  defaultValue?: Date
): Date | undefined => {
  try {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? defaultValue : value;
    }
    
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? defaultValue : date;
    }
    
    return defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * 日付範囲の検証
 */
export const validateDateRange = (
  startDate: Date | undefined,
  endDate: Date | undefined,
  allowSameDay: boolean = true
): { isValid: boolean; error?: string } => {
  if (!startDate || !endDate) {
    return { isValid: true }; // 任意のフィールドの場合
  }
  
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  
  if (isNaN(startTime) || isNaN(endTime)) {
    return { isValid: false, error: '無効な日付形式です' };
  }
  
  if (startTime > endTime) {
    return { isValid: false, error: '開始日は終了日より前である必要があります' };
  }
  
  if (!allowSameDay && startTime === endTime) {
    return { isValid: false, error: '開始日と終了日は異なる日付である必要があります' };
  }
  
  return { isValid: true };
};

/**
 * 文字列の長さ検証
 */
export const validateStringLength = (
  value: string,
  minLength: number = 0,
  maxLength: number = Infinity
): { isValid: boolean; error?: string } => {
  if (typeof value !== 'string') {
    return { isValid: false, error: '文字列である必要があります' };
  }
  
  if (value.length < minLength) {
    return { isValid: false, error: `最低${minLength}文字以上入力してください` };
  }
  
  if (value.length > maxLength) {
    return { isValid: false, error: `最大${maxLength}文字以内で入力してください` };
  }
  
  return { isValid: true };
};

/**
 * エラーハンドリング用のヘルパー
 */
export class ErrorHandler {
  /**
   * 非同期処理のエラーハンドリング
   */
  static async handleAsync<T>(
    asyncFn: () => Promise<T>,
    errorMessage: string = 'エラーが発生しました',
    onError?: (error: Error) => void
  ): Promise<{ data?: T; error?: string }> {
    try {
      const data = await asyncFn();
      return { data };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
      return { error: errorMsg };
    }
  }

  /**
   * 同期処理のエラーハンドリング
   */
  static handleSync<T>(
    fn: () => T,
    defaultValue: T,
    errorMessage: string = 'エラーが発生しました',
    onError?: (error: Error) => void
  ): T {
    try {
      return fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(errorMessage);
      if (onError) {
        onError(err);
      }
      return defaultValue;
    }
  }

  /**
   * ユーザーフィードバック用のエラーメッセージ生成
   */
  static createUserFriendlyMessage(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;
    
    // よくあるエラーメッセージの日本語化
    const errorMappings: Record<string, string> = {
      'Network Error': 'ネットワークエラーが発生しました。接続を確認してください。',
      'Failed to fetch': 'データの取得に失敗しました。しばらく時間をおいて再試行してください。',
      'Validation Error': '入力内容に不備があります。内容を確認してください。',
      'Not Found': '要求されたデータが見つかりません。',
      'Unauthorized': '認証が必要です。ログインしてください。',
      'Forbidden': 'この操作を実行する権限がありません。'
    };

    return errorMappings[message] || message || '予期しないエラーが発生しました。';
  }
}