/**
 * Zod Validation Schemas
 * 設計書のValidation要件とAPI設計に基づく型安全なバリデーション
 */

import { z } from 'zod'

// ===== 基本型定義 =====

/**
 * 共通の文字列バリデーション
 */
const nonEmptyString = z.string().min(1, '必須項目です').trim()
const optionalString = z.string().optional()
const email = z.string().email('有効なメールアドレスを入力してください')

/**
 * 日付バリデーション
 */
const dateString = z.string().datetime('有効な日時形式で入力してください')
const optionalDate = z.string().datetime().optional()

/**
 * 数値バリデーション
 */
const positiveNumber = z.number().positive('正の数値を入力してください')
const nonNegativeNumber = z.number().min(0, '0以上の値を入力してください')

// ===== Enum Validations =====

export const UserStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'])
export const UserRoleSchema = z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'GUEST'])
export const AuthProviderSchema = z.enum(['EMAIL', 'GOOGLE', 'GITHUB', 'MICROSOFT'])
export const ThemeSchema = z.enum(['LIGHT', 'DARK', 'SYSTEM'])
export const TimeFormatSchema = z.enum(['TWELVE_HOUR', 'TWENTYFOUR_HOUR'])

export const ProjectStatusSchema = z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
export const ProjectPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
export const ProjectRoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'])
export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL'])
export const TaskActionSchema = z.enum([
  'CREATED', 'UPDATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 
  'ASSIGNED', 'COMMENT_ADDED', 'SUBTASK_ADDED', 'SUBTASK_COMPLETED'
])

export const ScheduleItemTypeSchema = z.enum([
  'TASK', 'SUBTASK', 'MEETING', 'BREAK', 'PERSONAL', 'BLOCKED', 'FOCUS', 'REVIEW'
])
export const ScheduleItemStatusSchema = z.enum([
  'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED', 'CANCELLED'
])

export const NotificationTypeSchema = z.enum([
  'TASK_DEADLINE', 'TASK_ASSIGNED', 'TASK_COMPLETED', 
  'MENTION', 'PROJECT_UPDATE', 'SYSTEM'
])
export const NotificationPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW'])

// ===== User Related Schemas =====

export const UserProfileSchema = z.object({
  firstName: nonEmptyString.max(50, '50文字以内で入力してください'),
  lastName: nonEmptyString.max(50, '50文字以内で入力してください'),
  displayName: nonEmptyString.max(100, '100文字以内で入力してください'),
  bio: z.string().max(500, '500文字以内で入力してください').optional(),
  avatar: z.string().url('有効なURLを入力してください').optional(),
  department: z.string().max(100, '100文字以内で入力してください').optional(),
  position: z.string().max(100, '100文字以内で入力してください').optional(),
  phoneNumber: z.string().regex(/^[\d\-\+\(\)\s]+$/, '有効な電話番号を入力してください').optional(),
  location: z.string().max(200, '200文字以内で入力してください').optional(),
  website: z.string().url('有効なURLを入力してください').optional()
})

export const UserPreferencesSchema = z.object({
  theme: ThemeSchema.default('SYSTEM'),
  language: z.string().default('ja'),
  timezone: z.string().default('Asia/Tokyo'),
  dateFormat: z.string().default('YYYY-MM-DD'),
  timeFormat: TimeFormatSchema.default('TWENTYFOUR_HOUR'),
  notificationEmail: z.boolean().default(true),
  notificationPush: z.boolean().default(true),
  notificationDesktop: z.boolean().default(true)
})

export const CreateUserSchema = z.object({
  email,
  profile: UserProfileSchema,
  role: UserRoleSchema.default('MEMBER'),
  preferences: UserPreferencesSchema.partial().optional(),
  authProvider: AuthProviderSchema.default('EMAIL')
})

export const UpdateUserSchema = z.object({
  status: UserStatusSchema.optional(),
  role: UserRoleSchema.optional(),
  profile: UserProfileSchema.partial().optional(),
  preferences: UserPreferencesSchema.partial().optional()
})

export const LoginSchema = z.object({
  email,
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  rememberMe: z.boolean().optional().default(false)
})

export const SignupSchema = z.object({
  email,
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  confirmPassword: z.string(),
  profile: z.object({
    firstName: nonEmptyString.max(50),
    lastName: nonEmptyString.max(50),
    displayName: z.string().max(100).optional()
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword']
})

// ===== Tag Related Schemas =====

export const TagSchema = z.object({
  id: z.string().cuid().optional(),
  name: nonEmptyString
    .max(20, 'タグ名は20文字以内で入力してください')
    .regex(/^[^<>&"'`]+$/, 'タグ名に使用できない文字が含まれています')
    .regex(/^(?!\s)(?!.*\s$)(?!^\.)(?!.*\.$).*$/, 'タグ名の先頭・末尾に空白やドットは使用できません'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '有効なカラーコード（#RRGGBB形式）を指定してください'),
  usageCount: z.number().min(0).optional(),
  createdAt: dateString.optional(),
  updatedAt: dateString.optional()
})

export const CreateTagSchema = TagSchema.pick({ name: true, color: true })
export const UpdateTagSchema = CreateTagSchema.partial()

// ===== Project Related Schemas =====

export const ProjectSchema = z.object({
  id: z.string().cuid().optional(),
  name: nonEmptyString.max(200, 'プロジェクト名は200文字以内で入力してください'),
  description: z.string().max(2000, '説明は2000文字以内で入力してください').optional(),
  status: ProjectStatusSchema.default('PLANNING'),
  priority: ProjectPrioritySchema.default('MEDIUM'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  icon: optionalString,
  ownerId: z.string().cuid(),
  startDate: optionalDate,
  endDate: optionalDate,
  deadline: optionalDate,
  budget: positiveNumber.optional(),
  isArchived: z.boolean().default(false),
  tagIds: z.array(z.string().cuid()).optional()
})

export const CreateProjectSchema = ProjectSchema.omit({ 
  id: true, 
  ownerId: true, 
  isArchived: true 
})

export const UpdateProjectSchema = CreateProjectSchema.partial()

export const ProjectFilterSchema = z.object({
  status: z.array(ProjectStatusSchema).optional(),
  priority: z.array(ProjectPrioritySchema).optional(),
  ownerId: z.string().cuid().optional(),
  memberId: z.string().cuid().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
  search: optionalString
})

// ===== Task Related Schemas =====

export const SubtaskSchema = z.object({
  id: z.string().cuid().optional(),
  title: nonEmptyString.max(500, 'サブタスク名は500文字以内で入力してください'),
  completed: z.boolean().default(false)
})

export const TaskSchema = z.object({
  id: z.string().cuid().optional(),
  title: nonEmptyString.max(500, 'タスク名は500文字以内で入力してください'),
  description: z.string().max(5000, '説明は5000文字以内で入力してください').optional(),
  status: TaskStatusSchema.default('TODO'),
  priority: PrioritySchema.default('MEDIUM'),
  projectId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
  dueDate: optionalDate,
  estimatedHours: nonNegativeNumber.optional(),
  actualHours: nonNegativeNumber.optional(),
  archivedAt: optionalDate,
  tags: z.array(z.string().cuid()).optional(),
  subtasks: z.array(SubtaskSchema).optional()
})

export const CreateTaskSchema = TaskSchema.omit({ 
  id: true, 
  status: true, 
  archivedAt: true,
  subtasks: true 
})

export const UpdateTaskSchema = z.object({
  title: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  projectId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  dueDate: optionalDate,
  estimatedHours: nonNegativeNumber.optional(),
  actualHours: nonNegativeNumber.optional(),
  tags: z.array(z.string().cuid()).optional()
})

export const TaskFilterSchema = z.object({
  status: z.array(TaskStatusSchema).optional(),
  priority: z.array(PrioritySchema).optional(),
  projectId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
  tags: z.array(z.string()).optional(),
  dueDateFrom: optionalDate,
  dueDateTo: optionalDate,
  search: optionalString,
  includeArchived: z.boolean().default(false)
})

export const CreateSubtaskSchema = z.object({
  parentId: z.string().cuid(),
  title: nonEmptyString.max(500),
  description: z.string().max(2000).optional(),
  priority: PrioritySchema.optional(),
  assigneeId: z.string().cuid().optional(),
  dueDate: optionalDate,
  estimatedHours: nonNegativeNumber.optional()
})

// ===== Schedule Related Schemas =====

export const TimeBlockSchema = z.object({
  id: z.string().cuid().optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:mm形式で入力してください'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'HH:mm形式で入力してください'),
  duration: positiveNumber.default(60)
})

export const ScheduleItemSchema = z.object({
  id: z.string().cuid().optional(),
  timeBlockId: z.string().cuid(),
  taskId: z.string().cuid().optional(),
  type: ScheduleItemTypeSchema,
  title: nonEmptyString.max(200),
  description: z.string().max(1000).optional(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  duration: positiveNumber,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  status: ScheduleItemStatusSchema.default('PLANNED'),
  priority: PrioritySchema.default('MEDIUM'),
  isLocked: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  estimatedTime: positiveNumber.optional(),
  actualTime: nonNegativeNumber.optional(),
  completionRate: z.number().min(0).max(100).default(0)
})

export const CreateScheduleItemSchema = ScheduleItemSchema.omit({ 
  id: true,
  timeBlockId: true 
}).extend({
  date: z.string().datetime()
})

export const UpdateScheduleItemSchema = z.object({
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  status: ScheduleItemStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  isLocked: z.boolean().optional(),
  actualTime: nonNegativeNumber.optional(),
  completionRate: z.number().min(0).max(100).optional()
})

// ===== Notification Related Schemas =====

export const NotificationSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string().cuid(),
  type: NotificationTypeSchema,
  priority: NotificationPrioritySchema.default('MEDIUM'),
  title: nonEmptyString.max(200),
  message: nonEmptyString.max(1000),
  isRead: z.boolean().default(false),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional()
})

export const CreateNotificationSchema = NotificationSchema.omit({ id: true })
export const UpdateNotificationSchema = z.object({
  isRead: z.boolean().optional()
})

// ===== Common Request/Response Schemas =====

export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: optionalString,
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const ApiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: z.string().optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  }).optional()
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime()
})

// ===== Export Types =====

export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type Login = z.infer<typeof LoginSchema>
export type Signup = z.infer<typeof SignupSchema>

export type CreateTag = z.infer<typeof CreateTagSchema>
export type UpdateTag = z.infer<typeof UpdateTagSchema>

export type CreateProject = z.infer<typeof CreateProjectSchema>
export type UpdateProject = z.infer<typeof UpdateProjectSchema>
export type ProjectFilter = z.infer<typeof ProjectFilterSchema>

export type CreateTask = z.infer<typeof CreateTaskSchema>
export type UpdateTask = z.infer<typeof UpdateTaskSchema>
export type TaskFilter = z.infer<typeof TaskFilterSchema>
export type CreateSubtask = z.infer<typeof CreateSubtaskSchema>

export type CreateScheduleItem = z.infer<typeof CreateScheduleItemSchema>
export type UpdateScheduleItem = z.infer<typeof UpdateScheduleItemSchema>

export type CreateNotification = z.infer<typeof CreateNotificationSchema>
export type UpdateNotification = z.infer<typeof UpdateNotificationSchema>

export type Pagination = z.infer<typeof PaginationSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>