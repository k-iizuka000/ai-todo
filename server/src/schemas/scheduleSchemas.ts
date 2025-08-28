import { z } from 'zod';
import { ScheduleItemType, ScheduleItemStatus, Priority } from '@prisma/client';

// Enum schemas
export const ScheduleItemTypeSchema = z.enum([
  'TASK', 'SUBTASK', 'MEETING', 'BREAK', 'PERSONAL', 'BLOCKED', 'FOCUS', 'REVIEW'
]);
export const ScheduleItemStatusSchema = z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED']);
export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']);

// Time validation helpers
const TimeStringSchema = z.string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
  .refine((time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }, { message: 'Invalid time format' });

const ColorSchema = z.string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color')
  .default('#3B82F6');

// Daily schedule schemas
export const CreateDailyScheduleSchema = z.object({
  date: z.coerce.date(),
  projectId: z.string()
    .uuid('Project ID must be a valid UUID')
    .optional(),
  workingHoursStart: TimeStringSchema.default('09:00'),
  workingHoursEnd: TimeStringSchema.default('18:00'),
}).strict().refine(
  (data) => {
    const start = data.workingHoursStart.split(':').map(Number);
    const end = data.workingHoursEnd.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return startMinutes < endMinutes;
  },
  { message: 'Working hours start must be before end time', path: ['workingHoursEnd'] }
);

export const UpdateDailyScheduleSchema = z.object({
  projectId: z.string()
    .uuid('Project ID must be a valid UUID')
    .nullable()
    .optional(),
  workingHoursStart: TimeStringSchema.optional(),
  workingHoursEnd: TimeStringSchema.optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
).refine(
  (data) => {
    if (data.workingHoursStart && data.workingHoursEnd) {
      const start = data.workingHoursStart.split(':').map(Number);
      const end = data.workingHoursEnd.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return startMinutes < endMinutes;
    }
    return true;
  },
  { message: 'Working hours start must be before end time', path: ['workingHoursEnd'] }
);

// Schedule item schemas
export const CreateScheduleItemSchema = z.object({
  dailyScheduleId: z.string()
    .uuid('Daily schedule ID must be a valid UUID'),
  taskId: z.string()
    .uuid('Task ID must be a valid UUID')
    .optional(),
  type: ScheduleItemTypeSchema,
  title: z.string()
    .min(1, 'Schedule item title is required')
    .max(255, 'Schedule item title must be less than 255 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Schedule item description must be less than 1000 characters')
    .optional(),
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  color: ColorSchema,
  priority: PrioritySchema.default('MEDIUM'),
  estimatedTime: z.number()
    .int('Estimated time must be an integer')
    .min(1, 'Estimated time must be at least 1 minute')
    .max(1440, 'Estimated time cannot exceed 1440 minutes (24 hours)')
    .optional(),
  isLocked: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
}).strict().refine(
  (data) => {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return startMinutes < endMinutes;
  },
  { message: 'Start time must be before end time', path: ['endTime'] }
).refine(
  (data) => {
    if (data.estimatedTime) {
      const start = data.startTime.split(':').map(Number);
      const end = data.endTime.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      const actualDuration = endMinutes - startMinutes;
      return data.estimatedTime <= actualDuration + 30; // Allow 30 minutes tolerance
    }
    return true;
  },
  { message: 'Estimated time should not exceed actual duration by more than 30 minutes', path: ['estimatedTime'] }
);

export const UpdateScheduleItemSchema = z.object({
  taskId: z.string()
    .uuid('Task ID must be a valid UUID')
    .nullable()
    .optional(),
  type: ScheduleItemTypeSchema.optional(),
  title: z.string()
    .min(1, 'Schedule item title is required')
    .max(255, 'Schedule item title must be less than 255 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(1000, 'Schedule item description must be less than 1000 characters')
    .optional(),
  startTime: TimeStringSchema.optional(),
  endTime: TimeStringSchema.optional(),
  color: ColorSchema.optional(),
  status: ScheduleItemStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  estimatedTime: z.number()
    .int('Estimated time must be an integer')
    .min(1, 'Estimated time must be at least 1 minute')
    .max(1440, 'Estimated time cannot exceed 1440 minutes')
    .nullable()
    .optional(),
  actualTime: z.number()
    .int('Actual time must be an integer')
    .min(0, 'Actual time must be positive')
    .max(1440, 'Actual time cannot exceed 1440 minutes')
    .nullable()
    .optional(),
  completionRate: z.number()
    .min(0, 'Completion rate must be between 0 and 1')
    .max(1, 'Completion rate must be between 0 and 1')
    .optional(),
  isLocked: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
).refine(
  (data) => {
    if (data.startTime && data.endTime) {
      const start = data.startTime.split(':').map(Number);
      const end = data.endTime.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return startMinutes < endMinutes;
    }
    return true;
  },
  { message: 'Start time must be before end time', path: ['endTime'] }
).refine(
  (data) => {
    if (data.actualTime && data.estimatedTime) {
      return data.actualTime <= data.estimatedTime * 2; // Actual should not exceed 2x estimated
    }
    return true;
  },
  { message: 'Actual time should not exceed 2x estimated time', path: ['actualTime'] }
);

// Time block schemas
export const CreateTimeBlockSchema = z.object({
  dailyScheduleId: z.string()
    .uuid('Daily schedule ID must be a valid UUID'),
  startTime: TimeStringSchema,
  endTime: TimeStringSchema,
  duration: z.number()
    .int('Duration must be an integer')
    .min(15, 'Duration must be at least 15 minutes')
    .max(480, 'Duration cannot exceed 8 hours')
    .optional(),
}).strict().refine(
  (data) => {
    const start = data.startTime.split(':').map(Number);
    const end = data.endTime.split(':').map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    return startMinutes < endMinutes;
  },
  { message: 'Start time must be before end time', path: ['endTime'] }
);

// Schedule filter schemas
export const ScheduleFilterSchema = z.object({
  date: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    { message: 'Date "from" must be before or equal to "to"' }
  ).optional(),
  userId: z.string()
    .uuid('User ID must be a valid UUID')
    .optional(),
  projectId: z.string()
    .uuid('Project ID must be a valid UUID')
    .optional(),
  type: z.array(ScheduleItemTypeSchema)
    .max(8, 'Maximum 8 type filters allowed')
    .optional(),
  status: z.array(ScheduleItemStatusSchema)
    .max(5, 'Maximum 5 status filters allowed')
    .optional(),
  priority: z.array(PrioritySchema)
    .max(5, 'Maximum 5 priority filters allowed')
    .optional(),
  timeRange: z.object({
    start: TimeStringSchema,
    end: TimeStringSchema,
  }).refine(
    (data) => {
      const start = data.start.split(':').map(Number);
      const end = data.end.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      return startMinutes < endMinutes;
    },
    { message: 'Start time must be before end time' }
  ).optional(),
  search: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
}).strict();

// Pagination and sorting
export const SchedulePaginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
}).strict();

export const ScheduleSortSchema = z.object({
  field: z.enum([
    'date', 'startTime', 'endTime', 'title', 'status',
    'priority', 'type', 'createdAt', 'updatedAt'
  ]),
  order: z.enum(['asc', 'desc']).default('asc'),
}).strict();

// Query parameter schemas
export const ScheduleQueryParamsSchema = z.object({
  ...ScheduleFilterSchema.shape,
  ...SchedulePaginationSchema.shape,
  sortField: ScheduleSortSchema.shape.field.optional(),
  sortOrder: ScheduleSortSchema.shape.order.optional(),
}).transform((data) => {
  const { sortField, sortOrder, ...filter } = data;
  const { page, limit, ...filterParams } = filter;
  
  return {
    filter: filterParams,
    pagination: { page, limit },
    sort: sortField ? { field: sortField, order: sortOrder || 'asc' } : undefined,
  };
});

// ID parameter validation
export const ScheduleIdParamSchema = z.object({
  id: z.string()
    .uuid('Schedule ID must be a valid UUID'),
}).strict();

export const ScheduleItemIdParamSchema = z.object({
  id: z.string()
    .uuid('Schedule item ID must be a valid UUID'),
}).strict();

export const DailyScheduleParamSchema = z.object({
  userId: z.string()
    .uuid('User ID must be a valid UUID'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
}).strict();

// Bulk operations
export const BulkUpdateScheduleItemsSchema = z.object({
  scheduleItemIds: z.array(z.string().uuid('Schedule item ID must be a valid UUID'))
    .min(1, 'At least one schedule item ID is required')
    .max(50, 'Maximum 50 schedule items for bulk update'),
  updates: z.object({
    status: ScheduleItemStatusSchema.optional(),
    priority: PrioritySchema.optional(),
    completionRate: z.number().min(0).max(1).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one update field must be provided' }
  ),
}).strict();

// Analytics schemas
export const ScheduleAnalyticsFilterSchema = z.object({
  userId: z.string()
    .uuid('User ID must be a valid UUID'),
  dateRange: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  }).refine(
    (data) => data.from <= data.to,
    { message: 'Date "from" must be before or equal to "to"' }
  ),
  projectIds: z.array(z.string().uuid('Project ID must be a valid UUID'))
    .max(10, 'Maximum 10 projects for analytics')
    .optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
}).strict();

// Type exports
export type CreateDailyScheduleInput = z.infer<typeof CreateDailyScheduleSchema>;
export type UpdateDailyScheduleInput = z.infer<typeof UpdateDailyScheduleSchema>;
export type CreateScheduleItemInput = z.infer<typeof CreateScheduleItemSchema>;
export type UpdateScheduleItemInput = z.infer<typeof UpdateScheduleItemSchema>;
export type CreateTimeBlockInput = z.infer<typeof CreateTimeBlockSchema>;
export type ScheduleFilterInput = z.infer<typeof ScheduleFilterSchema>;
export type ScheduleQueryParams = z.infer<typeof ScheduleQueryParamsSchema>;
export type ScheduleIdParam = z.infer<typeof ScheduleIdParamSchema>;
export type ScheduleItemIdParam = z.infer<typeof ScheduleItemIdParamSchema>;
export type DailyScheduleParam = z.infer<typeof DailyScheduleParamSchema>;
export type BulkUpdateScheduleItemsInput = z.infer<typeof BulkUpdateScheduleItemsSchema>;
export type ScheduleAnalyticsFilterInput = z.infer<typeof ScheduleAnalyticsFilterSchema>;