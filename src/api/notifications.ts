/**
 * Notifications API
 * 通知機能のCRUD操作とフィルタリング機能
 */

import { apiClient } from './client';
import { Notification, NotificationType, NotificationPriority } from '../types/notification';

// API Request/Response Types
export interface CreateNotificationRequest {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateNotificationRequest {
  isRead?: boolean;
  title?: string;
  message?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilter {
  userId?: string;
  type?: NotificationType[];
  priority?: NotificationPriority[];
  isRead?: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
  search?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationResponse {
  success: boolean;
  data: {
    data: Notification[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  message?: string;
  timestamp: string;
  unreadCount?: number;
}

export interface NotificationStatsResponse {
  success: boolean;
  data: {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  };
  message?: string;
  timestamp: string;
}

export interface BulkReadRequest {
  notificationIds: string[];
  updates: {
    isRead: boolean;
  };
}

export interface BulkReadResponse {
  success: boolean;
  data: {
    count: number;
  };
  message?: string;
  timestamp: string;
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
  message?: string;
  timestamp: string;
}

/**
 * 通知API操作クラス
 */
class NotificationsApi {
  /**
   * 通知一覧取得（フィルタリング対応）
   */
  async getNotifications(filter: NotificationFilter = {}): Promise<NotificationResponse> {
    return apiClient.get<NotificationResponse>('/notifications', filter);
  }

  /**
   * 通知詳細取得
   */
  async getNotificationById(id: string): Promise<Notification> {
    return apiClient.get<Notification>(`/notifications/${id}`);
  }

  /**
   * 通知作成
   */
  async createNotification(data: CreateNotificationRequest): Promise<Notification> {
    return apiClient.post<Notification>('/notifications', data);
  }

  /**
   * 通知更新
   */
  async updateNotification(id: string, data: UpdateNotificationRequest): Promise<Notification> {
    return apiClient.put<Notification>(`/notifications/${id}`, data);
  }

  /**
   * 通知削除
   */
  async deleteNotification(id: string): Promise<void> {
    return apiClient.delete<void>(`/notifications/${id}`);
  }

  /**
   * 通知を既読にする
   */
  async markAsRead(id: string): Promise<Notification> {
    return apiClient.patch<Notification>(`/notifications/${id}/read`);
  }

  /**
   * 通知を未読にする
   */
  async markAsUnread(id: string): Promise<Notification> {
    return this.updateNotification(id, { isRead: false });
  }

  /**
   * 未読通知数を取得
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    return apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  }

  /**
   * 最近の未読通知を取得
   */
  async getRecentUnread(limit: number = 10): Promise<NotificationResponse> {
    return apiClient.get<NotificationResponse>(`/notifications/recent-unread?limit=${limit}`);
  }

  /**
   * 通知統計情報を取得
   */
  async getStats(): Promise<NotificationStatsResponse> {
    return apiClient.get<NotificationStatsResponse>('/notifications/stats');
  }

  /**
   * 複数通知の一括既読
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<BulkReadResponse> {
    return apiClient.post<BulkReadResponse>('/notifications/bulk-read', {
      notificationIds,
      updates: {
        isRead: true
      }
    });
  }

  /**
   * 全ての未読通知を既読にする
   */
  async markAllAsRead(filters?: { type?: NotificationType[], priority?: NotificationPriority[] }): Promise<BulkReadResponse> {
    return apiClient.post<BulkReadResponse>('/notifications/read-all', {
      filters
    });
  }

  /**
   * 複数通知の削除
   */
  async deleteMultiple(notificationIds: string[]): Promise<BulkReadResponse> {
    return apiClient.post<BulkReadResponse>('/notifications/bulk-delete', {
      notificationIds
    });
  }

  /**
   * 古い既読通知の削除
   */
  async cleanupOldNotifications(olderThanDays: number = 30): Promise<BulkReadResponse> {
    return apiClient.post<BulkReadResponse>('/notifications/cleanup', {
      olderThanDays
    });
  }

  /**
   * 未読通知取得
   */
  async getUnreadNotifications(userId?: string, limit?: number): Promise<NotificationResponse> {
    return this.getNotifications({
      userId,
      isRead: false,
      limit
    });
  }

  /**
   * 最新通知取得
   */
  async getRecentNotifications(count: number = 10, userId?: string): Promise<NotificationResponse> {
    return this.getNotifications({
      userId,
      limit: count
    });
  }


  /**
   * 特定タイプの通知取得
   */
  async getNotificationsByType(
    type: NotificationType, 
    userId?: string, 
    limit?: number
  ): Promise<NotificationResponse> {
    return this.getNotifications({
      userId,
      type: [type],
      limit
    });
  }

  /**
   * 特定優先度の通知取得
   */
  async getNotificationsByPriority(
    priority: NotificationPriority, 
    userId?: string,
    limit?: number
  ): Promise<NotificationResponse> {
    return this.getNotifications({
      userId,
      priority: [priority],
      limit
    });
  }

  /**
   * 期限切れ通知取得（期限が近いタスク）
   */
  async getDeadlineNotifications(userId?: string): Promise<NotificationResponse> {
    return this.getNotifications({
      userId,
      type: ['task_deadline'],
      isRead: false
    });
  }

  /**
   * システム通知取得
   */
  async getSystemNotifications(limit?: number): Promise<NotificationResponse> {
    return this.getNotifications({
      type: ['system'],
      limit
    });
  }

  /**
   * Server-Sent Events接続を確立
   */
  connectSSE(onMessage: (event: MessageEvent) => void, onError?: (error: Event) => void): EventSource | null {
    try {
      const eventSource = new EventSource('/api/v1/notifications/sse', {
        withCredentials: true
      });

      eventSource.onmessage = onMessage;
      eventSource.onerror = onError || ((error) => {
        console.error('SSE connection error:', error);
      });

      // イベント別のハンドラー
      eventSource.addEventListener('notification', onMessage);
      eventSource.addEventListener('unread_count', onMessage);
      eventSource.addEventListener('system_message', onMessage);
      eventSource.addEventListener('heartbeat', (event) => {
        // ハートビートは通常ログ出力のみ
        console.debug('SSE heartbeat:', event.data);
      });

      return eventSource;
    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
      return null;
    }
  }

  /**
   * SSE接続状態を確認
   */
  async checkSSEConnection(): Promise<{
    connected: boolean;
    connectedAt?: string;
    totalClients: number;
  }> {
    return apiClient.get('/notifications/sse/heartbeat');
  }
}

export const notificationsApi = new NotificationsApi();