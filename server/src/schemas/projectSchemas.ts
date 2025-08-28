import { z } from 'zod';
import { ProjectStatus, ProjectPriority, ProjectRole } from '@prisma/client';

// Enum schemas
export const ProjectStatusSchema = z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']);
export const ProjectPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ProjectRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

// Color validation schema
const ColorSchema = z.string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex color')
  .default('#3B82F6');

// Base project schemas
export const CreateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be less than 255 characters')
    .trim(),
  description: z.string()
    .max(5000, 'Project description must be less than 5000 characters')
    .optional(),
  status: ProjectStatusSchema.default('PLANNING'),
  priority: ProjectPrioritySchema.default('MEDIUM'),
  color: ColorSchema,
  icon: z.string()
    .max(50, 'Icon identifier must be less than 50 characters')
    .optional(),
  startDate: z.coerce.date()
    .optional(),
  endDate: z.coerce.date()
    .optional(),
  deadline: z.coerce.date()
    .optional(),
  budget: z.number()
    .min(0, 'Budget must be positive')
    .max(999999999, 'Budget cannot exceed 999,999,999')
    .optional(),
  tagIds: z.array(z.string().uuid('Tag ID must be a valid UUID'))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .default([]),
  memberIds: z.array(z.string().uuid('Member ID must be a valid UUID'))
    .max(100, 'Maximum 100 project members allowed')
    .optional()
    .default([]),
}).strict().refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: 'Start date must be before or equal to end date', path: ['endDate'] }
).refine(
  (data) => !data.endDate || !data.deadline || data.endDate <= data.deadline,
  { message: 'End date must be before or equal to deadline', path: ['deadline'] }
).refine(
  (data) => !data.startDate || !data.deadline || data.startDate <= data.deadline,
  { message: 'Start date must be before or equal to deadline', path: ['deadline'] }
);

export const UpdateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be less than 255 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(5000, 'Project description must be less than 5000 characters')
    .optional(),
  status: ProjectStatusSchema.optional(),
  priority: ProjectPrioritySchema.optional(),
  color: ColorSchema.optional(),
  icon: z.string()
    .max(50, 'Icon identifier must be less than 50 characters')
    .nullable()
    .optional(),
  startDate: z.coerce.date()
    .nullable()
    .optional(),
  endDate: z.coerce.date()
    .nullable()
    .optional(),
  deadline: z.coerce.date()
    .nullable()
    .optional(),
  budget: z.number()
    .min(0, 'Budget must be positive')
    .max(999999999, 'Budget cannot exceed 999,999,999')
    .nullable()
    .optional(),
  isArchived: z.boolean().optional(),
  tagIds: z.array(z.string().uuid('Tag ID must be a valid UUID'))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  memberIds: z.array(z.string().uuid('Member ID must be a valid UUID'))
    .max(100, 'Maximum 100 project members allowed')
    .optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: 'Start date must be before or equal to end date', path: ['endDate'] }
).refine(
  (data) => !data.endDate || !data.deadline || data.endDate <= data.deadline,
  { message: 'End date must be before or equal to deadline', path: ['deadline'] }
);

// Project filter schema
export const ProjectFilterSchema = z.object({
  status: z.array(ProjectStatusSchema)
    .max(5, 'Maximum 5 status filters allowed')
    .optional(),
  priority: z.array(ProjectPrioritySchema)
    .max(4, 'Maximum 4 priority filters allowed')
    .optional(),
  ownerId: z.string()
    .uuid('Owner ID must be a valid UUID')
    .optional(),
  memberIds: z.array(z.string().uuid('Member ID must be a valid UUID'))
    .max(10, 'Maximum 10 member filters allowed')
    .optional(),
  dateRange: z.object({
    field: z.enum(['startDate', 'endDate', 'deadline', 'createdAt']),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }).refine(
    (data) => !data.from || !data.to || data.from <= data.to,
    { message: 'Date "from" must be before or equal to "to"' }
  ).optional(),
  tags: z.array(z.string().uuid('Tag ID must be a valid UUID'))
    .max(10, 'Maximum 10 tag filters allowed')
    .optional(),
  search: z.string()
    .max(100, 'Search query must be less than 100 characters')
    .trim()
    .optional(),
  isArchived: z.boolean().optional(),
}).strict();

// Project member schemas
export const AddProjectMemberSchema = z.object({
  userId: z.string()
    .uuid('User ID must be a valid UUID'),
  role: ProjectRoleSchema.default('MEMBER'),
}).strict();

export const UpdateProjectMemberSchema = z.object({
  role: ProjectRoleSchema,
}).strict();

// Pagination and sorting schemas
export const ProjectPaginationSchema = z.object({
  page: z.coerce.number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page cannot exceed 1000')
    .default(1),
  limit: z.coerce.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50 for projects')
    .default(10),
}).strict();

export const ProjectSortSchema = z.object({
  field: z.enum([
    'name', 'status', 'priority', 'createdAt', 'updatedAt',
    'startDate', 'endDate', 'deadline', 'budget'
  ]),
  order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// Query parameter schemas for API endpoints
export const ProjectQueryParamsSchema = z.object({
  ...ProjectFilterSchema.shape,
  ...ProjectPaginationSchema.shape,
  sortField: ProjectSortSchema.shape.field.optional(),
  sortOrder: ProjectSortSchema.shape.order.optional(),
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
export const ProjectIdParamSchema = z.object({
  id: z.string()
    .uuid('Project ID must be a valid UUID'),
}).strict();

export const ProjectMemberIdParamSchema = z.object({
  projectId: z.string()
    .uuid('Project ID must be a valid UUID'),
  userId: z.string()
    .uuid('User ID must be a valid UUID'),
}).strict();

// Project statistics schemas
export const ProjectStatsFilterSchema = z.object({
  projectIds: z.array(z.string().uuid('Project ID must be a valid UUID'))
    .max(10, 'Maximum 10 projects for statistics')
    .optional(),
  dateRange: z.object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  }).refine(
    (data) => data.from <= data.to,
    { message: 'Date "from" must be before or equal to "to"' }
  ).optional(),
}).strict();

// Bulk operations schemas
export const BulkUpdateProjectsSchema = z.object({
  projectIds: z.array(z.string().uuid('Project ID must be a valid UUID'))
    .min(1, 'At least one project ID is required')
    .max(50, 'Maximum 50 projects for bulk update'),
  updates: z.object({
    status: ProjectStatusSchema.optional(),
    priority: ProjectPrioritySchema.optional(),
    isArchived: z.boolean().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one update field must be provided' }
  ),
}).strict();

// Type exports for use in controllers
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
export type ProjectFilterInput = z.infer<typeof ProjectFilterSchema>;
export type AddProjectMemberInput = z.infer<typeof AddProjectMemberSchema>;
export type UpdateProjectMemberInput = z.infer<typeof UpdateProjectMemberSchema>;
export type ProjectQueryParams = z.infer<typeof ProjectQueryParamsSchema>;
export type ProjectIdParam = z.infer<typeof ProjectIdParamSchema>;
export type ProjectMemberIdParam = z.infer<typeof ProjectMemberIdParamSchema>;
export type ProjectStatsFilterInput = z.infer<typeof ProjectStatsFilterSchema>;
export type BulkUpdateProjectsInput = z.infer<typeof BulkUpdateProjectsSchema>;