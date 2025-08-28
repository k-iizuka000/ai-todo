import { PrismaClient, Notification, NotificationType, NotificationPriority, Prisma } from '@prisma/client';
import { BaseRepository } from './base/BaseRepository.js';
import {
  CreateNotificationInput,
  UpdateNotificationInput,
  NotificationFilterInput,
  NotificationQueryParams
} from '@/schemas/notificationSchemas.js';
import { PaginationParams, SortOptions, PaginatedResult } from '@/types/api.js';

export interface NotificationWithMeta extends Notification {
  // 拡張プロパティがある場合はここに定義
}

export interface NotificationFilters {
  type?: NotificationType[];
  priority?: NotificationPriority[];
  isRead?: boolean;
  userId?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  search?: string;
}

export class NotificationRepository extends BaseRepository<
  Notification,
  CreateNotificationInput,
  UpdateNotificationInput
> {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Get paginated notifications with filters
   */
  async findAll(params: {
    userId: string;
    filters?: NotificationFilters;
    pagination?: PaginationParams;
    sort?: SortOptions;
  }): Promise<PaginatedResult<Notification>> {
    const { userId, filters, pagination, sort } = params;
    const { page, limit, offset } = this.getPaginationParams(pagination);
    
    const where = this.buildWhereClause(userId, filters);
    const orderBy = this.generateOrderBy(sort);

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications,
      meta: this.generatePaginationMeta(page, limit, total),
    };
  }

  /**
   * Get notification by ID
   */
  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  /**
   * Get notification by ID with user access check
   */
  async findByIdForUser(id: string, userId: string): Promise<Notification | null> {
    return this.prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  /**
   * Create new notification
   */
  async create(data: CreateNotificationInput, userId: string): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        ...data,
        userId: data.userId || userId,
      },
    });
  }

  /**
   * Update notification
   */
  async update(id: string, data: UpdateNotificationInput, userId: string): Promise<Notification> {
    // ユーザーアクセス権をチェック
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('Notification not found or access denied');
    }

    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete notification
   */
  async delete(id: string, userId: string): Promise<void> {
    // ユーザーアクセス権をチェック
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) {
      throw new Error('Notification not found or access denied');
    }

    await this.prisma.notification.delete({
      where: { id },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    return this.update(id, { isRead: true }, userId);
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: {
        isRead: true,
      },
    });

    return result.count;
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string, filters?: NotificationFilters): Promise<number> {
    const where = this.buildWhereClause(userId, filters);
    
    const result = await this.prisma.notification.updateMany({
      where: {
        ...where,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return result.count;
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(notificationIds: string[], userId: string): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
    });

    return result.count;
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Get notifications by type
   */
  async findByType(
    userId: string, 
    type: NotificationType, 
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Notification>> {
    return this.findAll({
      userId,
      filters: { type: [type] },
      pagination,
    });
  }

  /**
   * Get notifications by priority
   */
  async findByPriority(
    userId: string, 
    priority: NotificationPriority, 
    pagination?: PaginationParams
  ): Promise<PaginatedResult<Notification>> {
    return this.findAll({
      userId,
      filters: { priority: [priority] },
      pagination,
    });
  }

  /**
   * Get recent unread notifications
   */
  async findRecentUnread(userId: string, limit: number = 10): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get notification statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<NotificationPriority, number>;
  }> {
    const [total, unread, typeStats, priorityStats] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
      }),
      this.prisma.notification.groupBy({
        by: ['priority'],
        where: { userId },
        _count: { priority: true },
      }),
    ]);

    const byType = typeStats.reduce((acc, stat) => {
      acc[stat.type] = stat._count.type;
      return acc;
    }, {} as Record<NotificationType, number>);

    const byPriority = priorityStats.reduce((acc, stat) => {
      acc[stat.priority] = stat._count.priority;
      return acc;
    }, {} as Record<NotificationPriority, number>);

    return { total, unread, byType, byPriority };
  }

  /**
   * Create bulk system notifications
   */
  async createSystemNotifications(
    userIds: string[],
    notification: Omit<CreateNotificationInput, 'userId'>
  ): Promise<number> {
    const notifications = userIds.map(userId => ({
      ...notification,
      userId,
    }));

    const result = await this.prisma.notification.createMany({
      data: notifications,
    });

    return result.count;
  }

  /**
   * Delete old read notifications
   */
  async deleteOldReadNotifications(
    userId: string,
    olderThan: Date
  ): Promise<number> {
    const result = await this.prisma.notification.deleteMany({
      where: {
        userId,
        isRead: true,
        createdAt: {
          lt: olderThan,
        },
      },
    });

    return result.count;
  }

  /**
   * Build where clause for notifications
   */
  private buildWhereClause(
    userId: string, 
    filters?: NotificationFilters
  ): Prisma.NotificationWhereInput {
    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (!filters) return where;

    if (filters.type && filters.type.length > 0) {
      where.type = { in: filters.type };
    }

    if (filters.priority && filters.priority.length > 0) {
      where.priority = { in: filters.priority };
    }

    if (filters.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters.dateRange) {
      const { from, to } = filters.dateRange;
      if (from || to) {
        where.createdAt = {};
        if (from) where.createdAt.gte = from;
        if (to) where.createdAt.lte = to;
      }
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { message: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}