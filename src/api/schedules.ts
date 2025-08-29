/**
 * Schedule API Client
 * スケジュール関連のAPIアクセス機能
 */

import { ApiClient } from './client';
import type {
  DailySchedule,
  ScheduleItem,
  ScheduleStatistics,
  ScheduleConflict,
  CreateScheduleItemRequest,
  UpdateScheduleItemRequest,
  ScheduleSuggestion,
  TimeSlot,
  BulkScheduleOperation
} from '@/types/schedule';

// API Response types
interface DailyScheduleResponse {
  schedule: DailySchedule & {
    scheduleItems: (ScheduleItem & {
      task?: {
        id: string;
        title: string;
        status: string;
      };
    })[];
    timeBlocks: Array<{
      id: string;
      startTime: string;
      endTime: string;
      duration: number;
    }>;
  };
  statistics: ScheduleStatistics;
  conflicts: ScheduleConflict[];
}

interface ScheduleRangeResponse {
  schedules: DailySchedule[];
  count: number;
}

interface CreateScheduleRequest {
  dailyScheduleId: string;
  taskId?: string;
  type: 'TASK' | 'SUBTASK' | 'MEETING' | 'BREAK' | 'PERSONAL' | 'BLOCKED' | 'FOCUS' | 'REVIEW';
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  color?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  estimatedTime?: number;
  isLocked?: boolean;
  isRecurring?: boolean;
}

interface UpdateScheduleRequest {
  taskId?: string | null;
  type?: 'TASK' | 'SUBTASK' | 'MEETING' | 'BREAK' | 'PERSONAL' | 'BLOCKED' | 'FOCUS' | 'REVIEW';
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  estimatedTime?: number;
  actualTime?: number;
  completionRate?: number;
  isLocked?: boolean;
  isRecurring?: boolean;
}

interface BulkUpdateRequest {
  scheduleItemIds: string[];
  updates: {
    status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
    completionRate?: number;
  };
}

interface CreateScheduleFromTaskRequest {
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Schedule API Client class
 */
export class ScheduleApiClient extends ApiClient {
  private static instance: ScheduleApiClient;

  public static getInstance(): ScheduleApiClient {
    if (!this.instance) {
      this.instance = new ScheduleApiClient();
    }
    return this.instance;
  }

  constructor() {
    super();
  }

  // ===== Daily Schedule Operations =====

  /**
   * 指定日のスケジュールを取得
   */
  async getDailySchedule(userId: string, date: Date): Promise<DailyScheduleResponse> {
    const dateStr = date.toISOString().split('T')[0];
    
    return this.request<DailyScheduleResponse>(
      `/schedules/daily/${userId}/${dateStr}`,
      {
        method: 'GET',
        retry: { maxRetries: 2, delay: 500 },
        timeout: 10000
      }
    );
  }

  /**
   * スケジュール期間取得
   */
  async getScheduleRange(startDate: Date, endDate: Date): Promise<ScheduleRangeResponse> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    return this.request<ScheduleRangeResponse>(
      `/schedules/range?${params}`,
      {
        method: 'GET',
        retry: { maxRetries: 2, delay: 500 },
        timeout: 15000
      }
    );
  }

  /**
   * 日次スケジュール更新
   */
  async updateDailySchedule(
    userId: string, 
    date: Date, 
    updates: {
      projectId?: string | null;
      workingHoursStart?: string;
      workingHoursEnd?: string;
    }
  ): Promise<DailySchedule> {
    const dateStr = date.toISOString().split('T')[0];
    
    return this.request<DailySchedule>(
      `/schedules/daily/${userId}/${dateStr}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
        retry: { maxRetries: 1 },
        timeout: 10000
      }
    );
  }

  // ===== Schedule Item Operations =====

  /**
   * スケジュールアイテム作成
   */
  async createScheduleItem(data: CreateScheduleRequest): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(
      '/schedules/items',
      {
        method: 'POST',
        body: JSON.stringify(data),
        retry: { maxRetries: 1 },
        timeout: 10000
      }
    );
  }

  /**
   * スケジュールアイテム更新
   */
  async updateScheduleItem(itemId: string, updates: UpdateScheduleRequest): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(
      `/schedules/items/${itemId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
        retry: { maxRetries: 1 },
        timeout: 10000
      }
    );
  }

  /**
   * スケジュールアイテム削除
   */
  async deleteScheduleItem(itemId: string): Promise<void> {
    await this.request<void>(
      `/schedules/items/${itemId}`,
      {
        method: 'DELETE',
        retry: { maxRetries: 1 },
        timeout: 10000
      }
    );
  }

  /**
   * バルクスケジュールアイテム更新
   */
  async bulkUpdateScheduleItems(data: BulkUpdateRequest): Promise<{ updatedCount: number }> {
    return this.request<{ updatedCount: number }>(
      '/schedules/items/bulk',
      {
        method: 'PUT',
        body: JSON.stringify(data),
        retry: { maxRetries: 1 },
        timeout: 15000
      }
    );
  }

  // ===== Analytics & Statistics =====

  /**
   * スケジュール統計取得
   */
  async getScheduleStatistics(userId: string, date: Date): Promise<ScheduleStatistics> {
    const dateStr = date.toISOString().split('T')[0];
    
    return this.request<ScheduleStatistics>(
      `/schedules/statistics/${userId}/${dateStr}`,
      {
        method: 'GET',
        retry: { maxRetries: 2, delay: 500 },
        timeout: 10000
      }
    );
  }

  /**
   * コンフリクト検知
   */
  async getScheduleConflicts(userId: string, date: Date): Promise<ScheduleConflict[]> {
    const dateStr = date.toISOString().split('T')[0];
    
    return this.request<ScheduleConflict[]>(
      `/schedules/conflicts/${userId}/${dateStr}`,
      {
        method: 'GET',
        retry: { maxRetries: 2, delay: 500 },
        timeout: 10000
      }
    );
  }

  // ===== Task Integration =====

  /**
   * タスクからスケジュール作成
   */
  async createScheduleFromTask(
    taskId: string, 
    data: CreateScheduleFromTaskRequest
  ): Promise<ScheduleItem> {
    return this.request<ScheduleItem>(
      `/schedules/tasks/${taskId}/schedule`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        retry: { maxRetries: 1 },
        timeout: 10000
      }
    );
  }

  /**
   * AI提案取得
   */
  async getScheduleSuggestions(taskId: string): Promise<ScheduleSuggestion[]> {
    return this.request<ScheduleSuggestion[]>(
      `/schedules/suggestions/${taskId}`,
      {
        method: 'GET',
        retry: { maxRetries: 1 },
        timeout: 15000
      }
    );
  }

  // ===== Calendar Integration =====

  /**
   * 外部カレンダー同期
   */
  async syncWithExternalCalendar(userId: string, date: Date): Promise<{
    success: boolean;
    message: string;
    syncedItems: number;
  }> {
    const dateStr = date.toISOString().split('T')[0];
    
    return this.request<{
      success: boolean;
      message: string;
      syncedItems: number;
    }>(
      `/schedules/sync/calendar/${userId}/${dateStr}`,
      {
        method: 'POST',
        retry: { maxRetries: 1 },
        timeout: 30000 // カレンダー同期は時間がかかる場合がある
      }
    );
  }

  // ===== Helper Methods =====

  /**
   * エラー変換：サーバーエラーをクライアント用エラーに変換
   */
  private convertScheduleError(error: any): Error {
    if (error.status === 403) {
      return new Error('スケジュールへのアクセス権限がありません');
    }
    if (error.status === 404) {
      return new Error('指定されたスケジュールが見つかりません');
    }
    if (error.status === 409) {
      return new Error('スケジュールの時間が重複しています');
    }
    if (error.status === 422) {
      return new Error('スケジュールデータが無効です');
    }
    
    return error;
  }

  /**
   * 日付の妥当性チェック
   */
  private validateDate(date: Date): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('無効な日付が指定されました');
    }
  }

  /**
   * 時間文字列の妥当性チェック
   */
  private validateTimeString(time: string): void {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      throw new Error(`無効な時間形式です: ${time}`);
    }
  }

  /**
   * スケジュール期間の妥当性チェック
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    this.validateDate(startDate);
    this.validateDate(endDate);
    
    if (startDate > endDate) {
      throw new Error('開始日は終了日より前である必要があります');
    }
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 31) {
      throw new Error('スケジュール期間は最大31日間までです');
    }
  }
}

// シングルトンインスタンスをエクスポート
export const scheduleApi = ScheduleApiClient.getInstance();