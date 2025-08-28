import { z } from 'zod';
import { NotificationType, NotificationPriority } from '@prisma/client';

// Enum schemas
export const NotificationTypeSchema = z.enum([
  'TASK_DEADLINE', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'MENTION', 'PROJECT_UPDATE', 'SYSTEM'
]);
export const NotificationPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

// Base notification schemas
export const CreateNotificationSchema = z.object({
  userId: z.string()
    .uuid('User ID must be a valid UUID'),
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.default('MEDIUM'),
  title: z.string()
    .min(1, 'Notification title is required')
    .max(255, 'Notification title must be less than 255 characters')
    .trim(),
  message: z.string()
    .min(1, 'Notification message is required')
    .max(1000, 'Notification message must be less than 1000 characters')
    .trim(),
  actionUrl: z.string()
    .url('Action URL must be a valid URL')
    .max(500, 'Action URL must be less than 500 characters')
    .optional(),
  metadata: z.record(z.any())
    .optional(),
}).strict();

export const UpdateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  priority: NotificationPrioritySchema.optional(),
  actionUrl: z.string()
    .url('Action URL must be a valid URL')
    .max(500, 'Action URL must be less than 500 characters')
    .nullable()
    .optional(),
  metadata: z.record(z.any())
    .nullable()
    .optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Notification filter schemas
export const NotificationFilterSchema = z.object({
  type: z.array(NotificationTypeSchema)
    .max(6, 'Maximum 6 type filters allowed')
    .optional(),
  priority: z.array(NotificationPrioritySchema)
    .max(3, 'Maximum 3 priority filters allowed')
    .optional(),
  isRead: z.boolean().optional(),
  userId: z.string()
    .uuid('User ID must be a valid UUID')
    .optional(),
  dateRange: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    { message: 'Date "from" must be before or equal to "to"' }
  ).optional(),
  search: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
}).strict();

// Pagination and sorting
export const NotificationPaginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(20),
}).strict();

export const NotificationSortSchema = z.object({
  field: z.enum(['createdAt', 'priority', 'type', 'isRead', 'title']),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Query parameter schemas
export const NotificationQueryParamsSchema = z.object({
  ...NotificationFilterSchema.shape,
  ...NotificationPaginationSchema.shape,
  sortField: NotificationSortSchema.shape.field.optional(),
  sortOrder: NotificationSortSchema.shape.order.optional(),
}).transform((data) => {
  const { sortField, sortOrder, ...filter } = data;
  const { page, limit, ...filterParams } = filter;
  
  return {
    filter: filterParams,
    pagination: { page, limit },
    sort: sortField ? { field: sortField, order: sortOrder || 'desc' } : undefined,
  };
});

// ID parameter validation
export const NotificationIdParamSchema = z.object({
  id: z.string()
    .uuid('Notification ID must be a valid UUID'),
}).strict();

// Bulk operations
export const BulkUpdateNotificationsSchema = z.object({
  notificationIds: z.array(z.string().uuid('Notification ID must be a valid UUID'))
    .min(1, 'At least one notification ID is required')
    .max(100, 'Maximum 100 notifications for bulk update'),
  updates: z.object({
    isRead: z.boolean().optional(),
    priority: NotificationPrioritySchema.optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one update field must be provided' }
  ),
}).strict();

export const BulkDeleteNotificationsSchema = z.object({
  notificationIds: z.array(z.string().uuid('Notification ID must be a valid UUID'))
    .min(1, 'At least one notification ID is required')
    .max(100, 'Maximum 100 notifications for bulk delete'),
  filters: z.object({
    olderThan: z.coerce.date().optional(),
    type: z.array(NotificationTypeSchema).optional(),
    isRead: z.boolean().optional(),
  }).optional(),
}).strict();

// Mark as read schemas
export const MarkAsReadSchema = z.object({
  isRead: z.boolean().default(true),
}).strict();

export const MarkAllAsReadSchema = z.object({
  userId: z.string()
    .uuid('User ID must be a valid UUID'),
  filters: z.object({
    type: z.array(NotificationTypeSchema).optional(),
    priority: z.array(NotificationPrioritySchema).optional(),
    olderThan: z.coerce.date().optional(),
  }).optional(),
}).strict();

// Notification preferences schemas
export const NotificationPreferencesSchema = z.object({
  email: z.object({
    TASK_DEADLINE: z.boolean().default(true),
    TASK_ASSIGNED: z.boolean().default(true),
    TASK_COMPLETED: z.boolean().default(false),
    MENTION: z.boolean().default(true),
    PROJECT_UPDATE: z.boolean().default(true),
    SYSTEM: z.boolean().default(true),
  }).strict(),
  push: z.object({
    TASK_DEADLINE: z.boolean().default(true),
    TASK_ASSIGNED: z.boolean().default(true),
    TASK_COMPLETED: z.boolean().default(false),
    MENTION: z.boolean().default(true),
    PROJECT_UPDATE: z.boolean().default(false),
    SYSTEM: z.boolean().default(true),
  }).strict(),
  desktop: z.object({
    TASK_DEADLINE: z.boolean().default(true),
    TASK_ASSIGNED: z.boolean().default(true),
    TASK_COMPLETED: z.boolean().default(false),
    MENTION: z.boolean().default(true),
    PROJECT_UPDATE: z.boolean().default(false),
    SYSTEM: z.boolean().default(false),
  }).strict(),
  frequency: z.object({
    digest: z.enum(['NEVER', 'DAILY', 'WEEKLY']).default('DAILY'),
    realTime: z.boolean().default(true),
  }).strict(),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    startTime: z.string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
      .default('22:00'),
    endTime: z.string()
      .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
      .default('08:00'),
  }).strict(),
}).strict();

// Analytics schemas
export const NotificationAnalyticsFilterSchema = z.object({
  userId: z.string()
    .uuid('User ID must be a valid UUID'),
  dateRange: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  }).refine(
    (data) => data.from <= data.to,
    { message: 'Date "from" must be before or equal to "to"' }
  ),
  groupBy: z.enum(['day', 'week', 'month', 'type', 'priority']).default('day'),
}).strict();

// Template schemas for notification generation
export const NotificationTemplateSchema = z.object({
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.default('MEDIUM'),
  titleTemplate: z.string()
    .min(1, 'Title template is required')
    .max(255, 'Title template must be less than 255 characters'),
  messageTemplate: z.string()
    .min(1, 'Message template is required')
    .max(1000, 'Message template must be less than 1000 characters'),
  actionUrlTemplate: z.string()
    .max(500, 'Action URL template must be less than 500 characters')
    .optional(),
  variables: z.array(z.string())
    .max(20, 'Maximum 20 template variables allowed')
    .optional(),
}).strict();

// System notification schemas
export const SystemNotificationSchema = z.object({
  userIds: z.array(z.string().uuid('User ID must be a valid UUID'))
    .min(1, 'At least one user ID is required')
    .max(1000, 'Maximum 1000 users for system notification'),
  type: NotificationTypeSchema.default('SYSTEM'),
  priority: NotificationPrioritySchema.default('MEDIUM'),
  title: z.string()
    .min(1, 'System notification title is required')
    .max(255, 'System notification title must be less than 255 characters')
    .trim(),
  message: z.string()
    .min(1, 'System notification message is required')
    .max(1000, 'System notification message must be less than 1000 characters')
    .trim(),
  actionUrl: z.string()
    .url('Action URL must be a valid URL')
    .max(500, 'Action URL must be less than 500 characters')
    .optional(),
  scheduledFor: z.coerce.date()
    .min(new Date(), 'Scheduled date must be in the future')
    .optional(),
}).strict();

// Type exports
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;
export type NotificationFilterInput = z.infer<typeof NotificationFilterSchema>;
export type NotificationQueryParams = z.infer<typeof NotificationQueryParamsSchema>;
export type NotificationIdParam = z.infer<typeof NotificationIdParamSchema>;
export type BulkUpdateNotificationsInput = z.infer<typeof BulkUpdateNotificationsSchema>;
export type BulkDeleteNotificationsInput = z.infer<typeof BulkDeleteNotificationsSchema>;
export type MarkAsReadInput = z.infer<typeof MarkAsReadSchema>;
export type MarkAllAsReadInput = z.infer<typeof MarkAllAsReadSchema>;
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
export type NotificationAnalyticsFilterInput = z.infer<typeof NotificationAnalyticsFilterSchema>;
export type NotificationTemplateInput = z.infer<typeof NotificationTemplateSchema>;
export type SystemNotificationInput = z.infer<typeof SystemNotificationSchema>;