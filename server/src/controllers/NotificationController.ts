import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { NotificationService } from '@/services/NotificationService.js';
import { NotificationRepository } from '@/repositories/NotificationRepository.js';
import { prisma } from '@/config/database.js';
import {
  CreateNotificationSchema,
  UpdateNotificationSchema,
  NotificationQueryParamsSchema,
  NotificationIdParamSchema,
  BulkUpdateNotificationsSchema,
  BulkDeleteNotificationsSchema,
  MarkAsReadSchema,
  MarkAllAsReadSchema,
  SystemNotificationSchema,
} from '@/schemas/notificationSchemas.js';
import { ApiResponse } from '@/types/api.js';
import { notificationLogger } from '@/config/logger.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor() {
    super();
    const notificationRepository = new NotificationRepository(prisma);
    this.notificationService = new NotificationService(notificationRepository);
  }

  /**
   * Get paginated notifications with filters
   * GET /api/v1/notifications
   */
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const queryParams = NotificationQueryParamsSchema.parse(req.query);
      
      const result = await this.notificationService.getNotifications(userId, queryParams);
      
      this.sendSuccess(res, result, 'Notifications retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to get notifications');
    }
  }

  /**
   * Get notification by ID
   * GET /api/v1/notifications/:id
   */
  async getNotificationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const { id } = NotificationIdParamSchema.parse(req.params);
      
      const notification = await this.notificationService.getNotificationById(id, userId);
      
      this.sendSuccess(res, notification, 'Notification retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to get notification');
    }
  }

  /**
   * Create new notification
   * POST /api/v1/notifications
   */
  async createNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const data = CreateNotificationSchema.parse(req.body);
      
      const notification = await this.notificationService.createNotification(data, userId);
      
      this.sendSuccess(res, notification, 'Notification created successfully', 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create notification');
    }
  }

  /**
   * Update notification
   * PUT /api/v1/notifications/:id
   */
  async updateNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const { id } = NotificationIdParamSchema.parse(req.params);
      const data = UpdateNotificationSchema.parse(req.body);
      
      const notification = await this.notificationService.updateNotification(id, data, userId);
      
      this.sendSuccess(res, notification, 'Notification updated successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to update notification');
    }
  }

  /**
   * Delete notification
   * DELETE /api/v1/notifications/:id
   */
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const { id } = NotificationIdParamSchema.parse(req.params);
      
      await this.notificationService.deleteNotification(id, userId);
      
      this.sendSuccess(res, null, 'Notification deleted successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to delete notification');
    }
  }

  /**
   * Mark notification as read
   * PATCH /api/v1/notifications/:id/read
   */
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const { id } = NotificationIdParamSchema.parse(req.params);
      
      const notification = await this.notificationService.markAsRead(id, userId);
      
      this.sendSuccess(res, notification, 'Notification marked as read');
    } catch (error) {
      this.handleError(res, error, 'Failed to mark notification as read');
    }
  }

  /**
   * Mark multiple notifications as read
   * POST /api/v1/notifications/bulk-read
   */
  async markMultipleAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const data = BulkUpdateNotificationsSchema.parse(req.body);
      
      const result = await this.notificationService.markMultipleAsRead(data, userId);
      
      this.sendSuccess(res, result, 'Notifications marked as read');
    } catch (error) {
      this.handleError(res, error, 'Failed to mark notifications as read');
    }
  }

  /**
   * Mark all notifications as read
   * POST /api/v1/notifications/read-all
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const data = MarkAllAsReadSchema.parse({ ...req.body, userId });
      
      const result = await this.notificationService.markAllAsRead(data, userId);
      
      this.sendSuccess(res, result, 'All notifications marked as read');
    } catch (error) {
      this.handleError(res, error, 'Failed to mark all notifications as read');
    }
  }

  /**
   * Delete multiple notifications
   * POST /api/v1/notifications/bulk-delete
   */
  async deleteMultiple(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const data = BulkDeleteNotificationsSchema.parse(req.body);
      
      const result = await this.notificationService.deleteMultiple(data, userId);
      
      this.sendSuccess(res, result, 'Notifications deleted successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to delete notifications');
    }
  }

  /**
   * Get unread notifications count
   * GET /api/v1/notifications/unread-count
   */
  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      
      const result = await this.notificationService.getUnreadCount(userId);
      
      this.sendSuccess(res, result, 'Unread count retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to get unread count');
    }
  }

  /**
   * Get recent unread notifications
   * GET /api/v1/notifications/recent-unread
   */
  async getRecentUnread(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      
      const notifications = await this.notificationService.getRecentUnread(userId, limit);
      
      this.sendSuccess(res, { notifications }, 'Recent unread notifications retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to get recent unread notifications');
    }
  }

  /**
   * Get notification statistics
   * GET /api/v1/notifications/stats
   */
  async getNotificationStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      
      const stats = await this.notificationService.getNotificationStats(userId);
      
      this.sendSuccess(res, stats, 'Notification statistics retrieved successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to get notification statistics');
    }
  }

  /**
   * Create system notification (Admin only)
   * POST /api/v1/notifications/system
   */
  async createSystemNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      
      // Check if user is admin (assuming role-based authorization)
      if (req.user?.role !== 'ADMIN') {
        this.sendError(res, 403, 'INSUFFICIENT_PERMISSIONS', 'Admin access required');
        return;
      }
      
      const data = SystemNotificationSchema.parse(req.body);
      
      const result = await this.notificationService.createSystemNotification(data, userId);
      
      this.sendSuccess(res, result, 'System notification created successfully', 201);
    } catch (error) {
      this.handleError(res, error, 'Failed to create system notification');
    }
  }

  /**
   * Clean up old read notifications
   * POST /api/v1/notifications/cleanup
   */
  async cleanupOldNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = this.getUserId(req);
      const olderThanDays = Math.min(365, Math.max(1, parseInt(req.body.olderThanDays) || 30));
      
      const result = await this.notificationService.cleanupOldNotifications(userId, olderThanDays);
      
      this.sendSuccess(res, result, 'Old notifications cleaned up successfully');
    } catch (error) {
      this.handleError(res, error, 'Failed to cleanup old notifications');
    }
  }

  /**
   * Get user ID from authenticated request
   */
  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.id) {
      throw new Error('User not authenticated');
    }
    return req.user.id;
  }

  /**
   * Handle errors with appropriate logging
   */
  private handleError(res: Response, error: any, defaultMessage: string): void {
    notificationLogger.error('Notification controller error:', error);
    super.handleError(res, error, defaultMessage);
  }
}