// API共通型定義
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// Filter interfaces
export interface TaskFilter {
  status?: string[];
  priority?: string[];
  projectId?: string;
  assigneeId?: string;
  dueDate?: {
    from?: Date;
    to?: Date;
  };
  tags?: string[];
  search?: string;
}

export interface ProjectFilter {
  status?: string[];
  priority?: string[];
  ownerId?: string;
  search?: string;
}

export interface ScheduleFilter {
  date?: {
    from?: Date;
    to?: Date;
  };
  userId?: string;
  type?: string[];
  status?: string[];
}

export interface NotificationFilter {
  type?: string[];
  isRead?: boolean;
  priority?: string[];
  userId?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  search?: string;
}

// Sort options
export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Request context
export interface RequestContext {
  userId?: string;
  userRole?: string;
  requestId: string;
  timestamp: Date;
}

// Notification API specific types
export interface NotificationApiResponse<T = any> extends ApiResponse<T> {
  unreadCount?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface BulkOperationResult {
  count: number;
  success: boolean;
  errors?: string[];
}

export interface SSEEvent {
  id?: string;
  event: string;
  data: any;
  timestamp?: string;
}

export interface SSEConnection {
  userId: string;
  connectedAt: Date;
  lastEventId?: string;
}

// Real-time notification events
export interface NotificationCreatedEvent extends SSEEvent {
  event: 'notification';
  data: {
    id: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
    metadata?: any;
  };
}

export interface UnreadCountUpdateEvent extends SSEEvent {
  event: 'unread_count';
  data: {
    count: number;
  };
}

export interface SystemMessageEvent extends SSEEvent {
  event: 'system_message';
  data: {
    type: 'maintenance' | 'announcement' | 'warning';
    title: string;
    message: string;
    actionUrl?: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export interface HeartbeatEvent extends SSEEvent {
  event: 'heartbeat';
  data: {
    type: 'heartbeat';
    timestamp: string;
    activeConnections: number;
  };
}