import { z } from 'zod';
import { TaskStatus, Priority } from '@prisma/client';

// Enum schemas
export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED']);
export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']);

// Base task schemas
export const CreateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(255, 'Task title must be less than 255 characters')
    .trim(),
  description: z.string()
    .max(5000, 'Task description must be less than 5000 characters')
    .optional(),
  status: TaskStatusSchema.default('TODO'),
  priority: PrioritySchema.default('MEDIUM'),
  projectId: z.string()
    .uuid('Project ID must be a valid UUID')
    .optional(),
  assigneeId: z.string()
    .uuid('Assignee ID must be a valid UUID')
    .optional(),
  parentId: z.string()
    .uuid('Parent ID must be a valid UUID')
    .optional(),
  dueDate: z.coerce.date()
    .optional(),
  estimatedHours: z.number()
    .min(0, 'Estimated hours must be positive')
    .max(1000, 'Estimated hours cannot exceed 1000')
    .optional(),
  tagIds: z.array(z.string().uuid('Tag ID must be a valid UUID'))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
}).strict();

export const UpdateTaskSchema = z.object({
  title: z.string()
    .min(1, 'Task title is required')
    .max(255, 'Task title must be less than 255 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(5000, 'Task description must be less than 5000 characters')
    .optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  projectId: z.string()
    .uuid('Project ID must be a valid UUID')
    .nullable()
    .optional(),
  assigneeId: z.string()
    .uuid('Assignee ID must be a valid UUID')
    .nullable()
    .optional(),
  parentId: z.string()
    .uuid('Parent ID must be a valid UUID')
    .nullable()
    .optional(),
  dueDate: z.coerce.date()
    .nullable()
    .optional(),
  estimatedHours: z.number()
    .min(0, 'Estimated hours must be positive')
    .max(1000, 'Estimated hours cannot exceed 1000')
    .nullable()
    .optional(),
  actualHours: z.number()
    .min(0, 'Actual hours must be positive')
    .max(1000, 'Actual hours cannot exceed 1000')
    .nullable()
    .optional(),
  tagIds: z.array(z.string().uuid('Tag ID must be a valid UUID'))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Task filter schema
export const TaskFilterSchema = z.object({
  status: z.array(TaskStatusSchema)
    .max(4, 'Maximum 4 status filters allowed')
    .optional(),
  priority: z.array(PrioritySchema)
    .max(5, 'Maximum 5 priority filters allowed')
    .optional(),
  projectId: z.string()
    .uuid('Project ID must be a valid UUID')
    .optional(),
  assigneeId: z.string()
    .uuid('Assignee ID must be a valid UUID')
    .optional(),
  dueDate: z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    { message: 'Due date "from" must be before or equal to "to"' }
  ).optional(),
  tags: z.array(z.string().uuid('Tag ID must be a valid UUID'))
    .max(10, 'Maximum 10 tag filters allowed')
    .optional(),
  search: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
}).strict();

// Subtask schemas
export const CreateSubtaskSchema = z.object({
  taskId: z.string()
    .uuid('Task ID must be a valid UUID'),
  title: z.string()
    .min(1, 'Subtask title is required')
    .max(255, 'Subtask title must be less than 255 characters')
    .trim(),
}).strict();

export const UpdateSubtaskSchema = z.object({
  title: z.string()
    .min(1, 'Subtask title is required')
    .max(255, 'Subtask title must be less than 255 characters')
    .trim()
    .optional(),
  completed: z.boolean().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Task comment schemas
export const CreateTaskCommentSchema = z.object({
  taskId: z.string()
    .uuid('Task ID must be a valid UUID'),
  content: z.string()
    .min(1, 'Comment content is required')
    .max(2000, 'Comment content must be less than 2000 characters')
    .trim(),
  mentions: z.array(z.string().uuid('User ID must be a valid UUID'))
    .max(10, 'Maximum 10 mentions allowed')
    .optional()
    .default([]),
}).strict();

// Pagination and sorting schemas
export const PaginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(10),
}).strict();

export const SortSchema = z.object({
  field: z.enum([
    'title', 'status', 'priority', 'createdAt', 'updatedAt', 
    'dueDate', 'estimatedHours', 'actualHours'
  ]),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Query parameter schemas for API endpoints
export const TaskQueryParamsSchema = z.object({
  ...TaskFilterSchema.shape,
  ...PaginationSchema.shape,
  sortField: SortSchema.shape.field.optional(),
  sortOrder: SortSchema.shape.order.optional(),
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
export const TaskIdParamSchema = z.object({
  id: z.string()
    .uuid('Task ID must be a valid UUID'),
}).strict();

export const TaskStatusUpdateSchema = z.object({
  status: TaskStatusSchema,
}).strict();

// Type exports for use in controllers
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskFilterInput = z.infer<typeof TaskFilterSchema>;
export type CreateSubtaskInput = z.infer<typeof CreateSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof UpdateSubtaskSchema>;
export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentSchema>;
export type TaskQueryParams = z.infer<typeof TaskQueryParamsSchema>;
export type TaskIdParam = z.infer<typeof TaskIdParamSchema>;
export type TaskStatusUpdateInput = z.infer<typeof TaskStatusUpdateSchema>;