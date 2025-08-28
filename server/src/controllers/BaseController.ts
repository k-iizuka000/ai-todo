import { Request, Response } from 'express';
import { ApiError, BusinessError } from '@/middleware/errorHandler.js';
import { ApiResponse, PaginatedResult, NotificationApiResponse } from '@/types/api.js';

/**
 * Base Controller with common functionality
 * Implements shared patterns for Clean Architecture controllers
 */
export abstract class BaseController {
  /**
   * Extract authenticated user ID from request headers
   */
  protected getUserId(req: Request): string {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      throw new ApiError(401, 'User authentication required', 'AUTH_REQUIRED');
    }
    return userId;
  }

  /**
   * Build pagination parameters from query
   */
  protected getPaginationParams(req: Request): {
    page: number;
    limit: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  } {
    return {
      page: Math.max(1, parseInt(req.query.page as string) || 1),
      limit: Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10)),
      sortField: req.query.sortField as string || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
    };
  }

  /**
   * Send success response with data
   */
  protected sendSuccess<T>(
    res: Response, 
    data: T, 
    message?: string, 
    statusCode: number = 200
  ): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send success response with paginated data
   */
  protected sendPaginatedSuccess<T>(
    res: Response, 
    result: PaginatedResult<T>, 
    message?: string
  ): void {
    const response: ApiResponse<PaginatedResult<T>> = {
      success: true,
      data: result,
      message,
      timestamp: new Date().toISOString(),
    };
    res.json(response);
  }

  /**
   * Send empty success response (for DELETE operations)
   */
  protected sendNoContent(res: Response): void {
    res.status(204).send();
  }

  /**
   * Extract array parameters from query (handles both single values and arrays)
   */
  protected getArrayParam(value: string | string[] | undefined): string[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Build standard query filters
   */
  protected buildStandardFilters(req: Request): {
    search?: string;
    status?: string[];
    priority?: string[];
    projectId?: string;
    assigneeId?: string;
  } {
    return {
      search: req.query.search as string,
      status: this.getArrayParam(req.query.status as string | string[]),
      priority: this.getArrayParam(req.query.priority as string | string[]),
      projectId: req.query.projectId as string,
      assigneeId: req.query.assigneeId as string,
    };
  }

  /**
   * Validate UUID parameter
   */
  protected validateUUID(id: string, fieldName: string = 'id'): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ApiError(400, `Invalid ${fieldName} format`, 'INVALID_UUID');
    }
  }

  /**
   * Send error response
   */
  protected sendError(
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: any
  ): void {
    const response: ApiResponse<null> = {
      success: false,
      error: code,
      message,
      timestamp: new Date().toISOString(),
    };

    if (details) {
      (response as any).details = details;
    }

    res.status(statusCode).json(response);
  }

  /**
   * Handle errors with proper logging and response
   */
  protected handleError(res: Response, error: any, defaultMessage: string): void {
    if (error instanceof BusinessError) {
      this.sendError(res, 400, error.code, error.message);
    } else if (error instanceof ApiError) {
      this.sendError(res, error.statusCode, error.code, error.message);
    } else if (error?.code === 'P2002') {
      // Prisma unique constraint violation
      this.sendError(res, 409, 'DUPLICATE_ENTRY', 'Resource already exists');
    } else if (error?.code === 'P2025') {
      // Prisma record not found
      this.sendError(res, 404, 'RESOURCE_NOT_FOUND', 'Resource not found');
    } else {
      // Unknown error
      console.error('Unexpected error:', error);
      this.sendError(res, 500, 'INTERNAL_SERVER_ERROR', defaultMessage || 'An unexpected error occurred');
    }
  }

  /**
   * Send notification-specific success response with unread count
   */
  protected sendNotificationSuccess<T>(
    res: Response,
    data: T,
    message?: string,
    unreadCount?: number,
    statusCode: number = 200
  ): void {
    const response: NotificationApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      unreadCount,
    };
    res.status(statusCode).json(response);
  }
}