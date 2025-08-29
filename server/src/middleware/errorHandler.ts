import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/config/logger.js';
import { ApiError } from '@/types/api.js';

/**
 * Global error handling middleware
 * Converts various error types to consistent API responses
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  const userId = req.headers['x-user-id'] as string;
  
  logger.error('API Error:', error, {
    requestId,
    userId,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
  });

  // Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors: Record<string, string[]> = {};
    
    error.errors.forEach((err) => {
      const field = err.path.join('.');
      if (!validationErrors[field]) {
        validationErrors[field] = [];
      }
      validationErrors[field].push(err.message);
    });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validationErrors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint failed
        res.status(409).json({
          success: false,
          error: 'A resource with this data already exists',
          code: 'DUPLICATE_ERROR',
          details: {
            fields: error.meta?.target,
          },
          timestamp: new Date().toISOString(),
        });
        return;

      case 'P2025': // Record not found
        res.status(404).json({
          success: false,
          error: 'Resource not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        });
        return;

      case 'P2003': // Foreign key constraint failed
        res.status(400).json({
          success: false,
          error: 'Invalid reference to related resource',
          code: 'FOREIGN_KEY_ERROR',
          details: {
            field: error.meta?.field_name,
          },
          timestamp: new Date().toISOString(),
        });
        return;

      case 'P2014': // Required relation missing
        res.status(400).json({
          success: false,
          error: 'Required relationship is missing',
          code: 'MISSING_RELATION_ERROR',
          details: {
            relation: error.meta?.relation_name,
          },
          timestamp: new Date().toISOString(),
        });
        return;

      default:
        logger.error('Unhandled Prisma error:', {
          code: error.code,
          message: error.message,
          meta: error.meta,
        });
        break;
    }
  }

  // Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: 'Database validation failed',
      code: 'DATABASE_VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Custom API errors
  if (error instanceof ApiError || error.name === 'ApiError') {
    const apiError = error as ApiError;
    res.status(apiError.status).json({
      success: false,
      error: apiError.message,
      code: apiError.code,
      details: apiError.details,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Business logic errors
  if (error instanceof BusinessError || error.name === 'BusinessError') {
    const businessError = error as BusinessError;
    res.status(400).json({
      success: false,
      error: businessError.message,
      code: businessError.code,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Business logic errors (thrown as regular errors)
  const businessErrorMessages = [
    'Task not found',
    'Project not found',
    'Access denied',
    'Invalid status transition',
    'Insufficient permissions',
  ];

  if (businessErrorMessages.some(msg => error.message.includes(msg))) {
    let statusCode = 400;
    let errorCode = 'BUSINESS_LOGIC_ERROR';

    if (error.message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
    } else if (error.message.includes('Access denied') || error.message.includes('permissions')) {
      statusCode = 403;
      errorCode = 'FORBIDDEN';
    } else if (error.message.includes('Invalid status transition')) {
      statusCode = 422;
      errorCode = 'INVALID_STATE_TRANSITION';
    }

    res.status(statusCode).json({
      success: false,
      error: error.message,
      code: errorCode,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Syntax errors (likely programming errors)
  if (error instanceof SyntaxError) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
      code: 'SYNTAX_ERROR',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Type errors (likely programming errors)
  if (error instanceof TypeError) {
    logger.error('Type error - possible programming issue:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : `Type error: ${error.message}`,
      code: 'TYPE_ERROR',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default internal server error
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Business logic error class
 */
export class BusinessError extends Error {
  constructor(message: string, public code: string = 'BUSINESS_ERROR') {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * Create a custom API error (legacy function for compatibility)
 */
export const createApiError = (
  status: number,
  message: string,
  code: string,
  details?: any
): ApiError => {
  return new ApiError(status, message, code, details);
};

/**
 * Async error handler wrapper
 * Catches async errors and passes them to the error handler
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = createApiError(
    404,
    `Route ${req.originalUrl} not found`,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};