import { NotificationRepository, NotificationFilters } from '@/repositories/NotificationRepository.js';
import { BusinessError } from '@/middleware/errorHandler.js';
import { 
  CreateNotificationInput,
  UpdateNotificationInput,
  NotificationQueryParams,
  BulkUpdateNotificationsInput,
  BulkDeleteNotificationsInput,
  MarkAllAsReadInput,
  SystemNotificationInput,
} from '@/schemas/notificationSchemas.js';
import { PaginatedResult } from '@/types/api.js';
import { Notification, NotificationType, NotificationPriority } from '@prisma/client';
import { notificationLogger } from '@/config/logger.js';

export interface NotificationTemplate {
  type: NotificationType;
  priority: NotificationPriority;
  titleTemplate: string;
  messageTemplate: string;
  actionUrlTemplate?: string;
}

export class NotificationService {
  constructor(private notificationRepository: NotificationRepository) {}

  /**
   * Get paginated notifications for user
   */
  async getNotifications(
    userId: string,
    params: NotificationQueryParams
  ): Promise<PaginatedResult<Notification>> {
    try {
      const { filter, pagination, sort } = params;
      
      return await this.notificationRepository.findAll({
        userId,
        filters: filter,
        pagination,
        sort,
      });
    } catch (error) {
      notificationLogger.error('Error getting notifications:', { userId, error });
      throw new BusinessError('NOTIFICATION_FETCH_ERROR', 'Failed to fetch notifications');
    }
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(id: string, userId: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.findByIdForUser(id, userId);
      
      if (!notification) {
        throw new BusinessError('NOTIFICATION_NOT_FOUND', 'Notification not found');
      }
      
      return notification;
    } catch (error) {
      if (error instanceof BusinessError) throw error;
      notificationLogger.error('Error getting notification by ID:', { id, userId, error });
      throw new BusinessError('NOTIFICATION_FETCH_ERROR', 'Failed to fetch notification');
    }
  }

  /**
   * Create new notification
   */
  async createNotification(
    data: CreateNotificationInput,
    createdBy?: string
  ): Promise<Notification> {
    try {
      // ビジネスルール: システム通知の場合は特別な処理
      if (data.type === 'SYSTEM' && !createdBy) {
        throw new BusinessError('INVALID_SYSTEM_NOTIFICATION', 'System notifications require creator');
      }

      const notification = await this.notificationRepository.create(data, createdBy || data.userId);
      
      // Real-time通知の送信をスケジュール（後でSSE実装時に使用）
      await this.scheduleRealTimeNotification(notification);
      
      notificationLogger.info('Notification created:', { 
        id: notification.id, 
        type: notification.type,
        userId: notification.userId 
      });
      
      return notification;
    } catch (error) {
      if (error instanceof BusinessError) throw error;
      notificationLogger.error('Error creating notification:', { data, error });
      throw new BusinessError('NOTIFICATION_CREATE_ERROR', 'Failed to create notification');
    }
  }

  /**
   * Update notification
   */
  async updateNotification(
    id: string,
    data: UpdateNotificationInput,
    userId: string
  ): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.update(id, data, userId);
      
      notificationLogger.info('Notification updated:', { 
        id: notification.id,
        updates: Object.keys(data),
        userId 
      });
      
      return notification;
    } catch (error) {
      if (error instanceof BusinessError) throw error;
      notificationLogger.error('Error updating notification:', { id, data, userId, error });
      throw new BusinessError('NOTIFICATION_UPDATE_ERROR', 'Failed to update notification');
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string, userId: string): Promise<void> {
    try {
      await this.notificationRepository.delete(id, userId);
      
      notificationLogger.info('Notification deleted:', { id, userId });
    } catch (error) {
      if (error instanceof BusinessError) throw error;
      notificationLogger.error('Error deleting notification:', { id, userId, error });
      throw new BusinessError('NOTIFICATION_DELETE_ERROR', 'Failed to delete notification');
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    try {
      const notification = await this.notificationRepository.markAsRead(id, userId);
      
      notificationLogger.info('Notification marked as read:', { id, userId });
      
      return notification;
    } catch (error) {
      if (error instanceof BusinessError) throw error;
      notificationLogger.error('Error marking notification as read:', { id, userId, error });
      throw new BusinessError('NOTIFICATION_UPDATE_ERROR', 'Failed to mark notification as read');
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(
    data: BulkUpdateNotificationsInput,
    userId: string
  ): Promise<{ count: number }> {
    try {
      const count = await this.notificationRepository.markMultipleAsRead(
        data.notificationIds,
        userId
      );
      
      notificationLogger.info('Multiple notifications marked as read:', { 
        count,
        notificationIds: data.notificationIds.length,
        userId 
      });
      
      return { count };
    } catch (error) {
      notificationLogger.error('Error marking multiple notifications as read:', { 
        data, userId, error 
      });
      throw new BusinessError('NOTIFICATION_BULK_UPDATE_ERROR', 'Failed to mark notifications as read');
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(
    data: MarkAllAsReadInput,
    userId: string
  ): Promise<{ count: number }> {
    try {
      const count = await this.notificationRepository.markAllAsRead(userId, data.filters);
      
      notificationLogger.info('All notifications marked as read:', { count, userId });
      
      return { count };
    } catch (error) {
      notificationLogger.error('Error marking all notifications as read:', { 
        data, userId, error 
      });
      throw new BusinessError('NOTIFICATION_BULK_UPDATE_ERROR', 'Failed to mark all notifications as read');
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(
    data: BulkDeleteNotificationsInput,
    userId: string
  ): Promise<{ count: number }> {
    try {
      const count = await this.notificationRepository.deleteMultiple(
        data.notificationIds,
        userId
      );
      
      notificationLogger.info('Multiple notifications deleted:', { 
        count,
        notificationIds: data.notificationIds.length,
        userId 
      });
      
      return { count };
    } catch (error) {
      notificationLogger.error('Error deleting multiple notifications:', { 
        data, userId, error 
      });
      throw new BusinessError('NOTIFICATION_BULK_DELETE_ERROR', 'Failed to delete notifications');
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<{ count: number }> {
    try {
      const count = await this.notificationRepository.getUnreadCount(userId);
      return { count };
    } catch (error) {
      notificationLogger.error('Error getting unread count:', { userId, error });
      throw new BusinessError('NOTIFICATION_FETCH_ERROR', 'Failed to get unread count');
    }
  }

  /**
   * Get recent unread notifications
   */
  async getRecentUnread(userId: string, limit: number = 10): Promise<Notification[]> {
    try {
      return await this.notificationRepository.findRecentUnread(userId, limit);
    } catch (error) {
      notificationLogger.error('Error getting recent unread notifications:', { userId, limit, error });
      throw new BusinessError('NOTIFICATION_FETCH_ERROR', 'Failed to get recent notifications');
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  }> {
    try {
      return await this.notificationRepository.getStats(userId);
    } catch (error) {
      notificationLogger.error('Error getting notification stats:', { userId, error });
      throw new BusinessError('NOTIFICATION_FETCH_ERROR', 'Failed to get notification statistics');
    }
  }

  /**
   * Create system notification for multiple users
   */
  async createSystemNotification(
    data: SystemNotificationInput,
    createdBy: string
  ): Promise<{ count: number }> {
    try {
      const notificationData = {
        type: data.type,
        priority: data.priority,
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
        metadata: {
          scheduledFor: data.scheduledFor?.toISOString(),
          createdBy,
        },
      };

      const count = await this.notificationRepository.createSystemNotifications(
        data.userIds,
        notificationData
      );

      notificationLogger.info('System notification created:', { 
        count,
        userCount: data.userIds.length,
        createdBy 
      });

      return { count };
    } catch (error) {
      notificationLogger.error('Error creating system notification:', { data, createdBy, error });
      throw new BusinessError('SYSTEM_NOTIFICATION_ERROR', 'Failed to create system notification');
    }
  }

  /**
   * Create notification from template
   */
  async createFromTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
    userId: string,
    createdBy?: string
  ): Promise<Notification> {
    try {
      const processedData = this.processTemplate(template, variables);
      
      const notificationData: CreateNotificationInput = {
        userId,
        type: template.type,
        priority: template.priority,
        title: processedData.title,
        message: processedData.message,
        actionUrl: processedData.actionUrl,
        metadata: variables,
      };

      return await this.createNotification(notificationData, createdBy);
    } catch (error) {
      notificationLogger.error('Error creating notification from template:', { 
        template, variables, userId, error 
      });
      throw new BusinessError('NOTIFICATION_TEMPLATE_ERROR', 'Failed to create notification from template');
    }
  }

  /**
   * Clean up old read notifications
   */
  async cleanupOldNotifications(
    userId: string,
    olderThanDays: number = 30
  ): Promise<{ count: number }> {
    try {
      const olderThan = new Date();
      olderThan.setDate(olderThan.getDate() - olderThanDays);

      const count = await this.notificationRepository.deleteOldReadNotifications(
        userId,
        olderThan
      );

      notificationLogger.info('Old notifications cleaned up:', { 
        count, 
        userId, 
        olderThanDays 
      });

      return { count };
    } catch (error) {
      notificationLogger.error('Error cleaning up old notifications:', { 
        userId, olderThanDays, error 
      });
      throw new BusinessError('NOTIFICATION_CLEANUP_ERROR', 'Failed to clean up old notifications');
    }
  }

  /**
   * Schedule real-time notification (for SSE implementation)
   * 現在はプレースホルダー、SSE実装時に実装
   */
  private async scheduleRealTimeNotification(notification: Notification): Promise<void> {
    // TODO: SSE実装時にreal-time通知をスケジュール
    // For now, just log that we would send a real-time notification
    notificationLogger.info('Real-time notification scheduled:', {
      id: notification.id,
      userId: notification.userId,
      type: notification.type
    });
  }

  /**
   * Process notification template
   */
  private processTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>
  ): {
    title: string;
    message: string;
    actionUrl?: string;
  } {
    const processString = (template: string): string => {
      return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key]?.toString() || match;
      });
    };

    return {
      title: processString(template.titleTemplate),
      message: processString(template.messageTemplate),
      actionUrl: template.actionUrlTemplate 
        ? processString(template.actionUrlTemplate) 
        : undefined,
    };
  }
}