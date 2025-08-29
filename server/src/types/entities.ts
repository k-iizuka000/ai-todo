// Entity interfaces corresponding to Prisma models
import { 
  Task as PrismaTask,
  Project as PrismaProject,
  User as PrismaUser,
  Notification as PrismaNotification,
  DailySchedule as PrismaDailySchedule,
  ScheduleItem as PrismaScheduleItem,
  Tag as PrismaTag,
  TaskStatus,
  Priority,
  ProjectStatus,
  ProjectPriority,
  NotificationType,
  NotificationPriority,
  ScheduleItemType,
  ScheduleItemStatus
} from '@prisma/client';

// Extended Task entity with relations
export interface TaskEntity extends PrismaTask {
  project?: ProjectEntity;
  assignee?: UserEntity;
  creator?: UserEntity;
  tags?: TagEntity[];
  subtasks?: SubtaskEntity[];
  parent?: TaskEntity;
  children?: TaskEntity[];
}

// Extended Project entity with relations
export interface ProjectEntity extends PrismaProject {
  owner?: UserEntity;
  members?: ProjectMemberEntity[];
  tasks?: TaskEntity[];
  tags?: TagEntity[];
}

// Extended User entity
export interface UserEntity extends PrismaUser {
  profile?: UserProfileEntity;
  preferences?: UserPreferencesEntity;
}

// Extended Schedule entities
export interface DailyScheduleEntity extends PrismaDailySchedule {
  user?: UserEntity;
  scheduleItems?: ScheduleItemEntity[];
  timeBlocks?: TimeBlockEntity[];
}

export interface ScheduleItemEntity extends PrismaScheduleItem {
  task?: TaskEntity;
  dailySchedule?: DailyScheduleEntity;
  timeBlock?: TimeBlockEntity;
}

// Extended Notification entity
export interface NotificationEntity extends PrismaNotification {
  user?: UserEntity;
}

// Extended Tag entity
export interface TagEntity extends PrismaTag {
  taskTags?: TaskTagEntity[];
  projectTags?: ProjectTagEntity[];
}

// Additional entity interfaces
export interface SubtaskEntity {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  task?: TaskEntity;
}

export interface ProjectMemberEntity {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  joinedAt: Date;
  user?: UserEntity;
  project?: ProjectEntity;
}

export interface UserProfileEntity {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  location?: string;
  website?: string;
}

export interface UserPreferencesEntity {
  id: string;
  userId: string;
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  notificationEmail: boolean;
  notificationPush: boolean;
  notificationDesktop: boolean;
}

export interface TimeBlockEntity {
  id: string;
  dailyScheduleId: string;
  startTime: string;
  endTime: string;
  duration: number;
  scheduleItems?: ScheduleItemEntity[];
}

export interface TaskTagEntity {
  id: string;
  taskId: string;
  tagId: string;
  task?: TaskEntity;
  tag?: TagEntity;
}

export interface ProjectTagEntity {
  id: string;
  projectId: string;
  tagId: string;
  project?: ProjectEntity;
  tag?: TagEntity;
}

// Create/Update DTOs
export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  projectId?: string;
  assigneeId?: string;
  parentId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  tagIds?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  projectId?: string;
  assigneeId?: string;
  parentId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tagIds?: string[];
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  color?: string;
  icon?: string;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  budget?: number;
  tagIds?: string[];
  memberIds?: string[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  color?: string;
  icon?: string;
  startDate?: Date;
  endDate?: Date;
  deadline?: Date;
  budget?: number;
  isArchived?: boolean;
  tagIds?: string[];
  memberIds?: string[];
}

export interface CreateScheduleItemDto {
  dailyScheduleId: string;
  taskId?: string;
  type: ScheduleItemType;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  color?: string;
  priority?: Priority;
  estimatedTime?: number;
}

export interface UpdateScheduleItemDto {
  taskId?: string;
  type?: ScheduleItemType;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  status?: ScheduleItemStatus;
  priority?: Priority;
  estimatedTime?: number;
  actualTime?: number;
  completionRate?: number;
}

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
}

export interface CreateTagDto {
  name: string;
  color: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}