import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@/config/logger.js';

/**
 * Request validation middleware using Zod schemas
 */
export const validateRequest = (
  schema: {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      // Validate request body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      // Validate request parameters
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      // Validate query parameters
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Request validation failed', {
          requestId,
          path: req.path,
          method: req.method,
          errors: error.errors,
        });
        
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
      } else {
        next(error);
      }
    }
  };
};

/**
 * Validate specific request parts
 */
export const validateBody = (schema: ZodSchema) => {
  return validateRequest({ body: schema });
};

export const validateParams = (schema: ZodSchema) => {
  return validateRequest({ params: schema });
};

export const validateQuery = (schema: ZodSchema) => {
  return validateRequest({ query: schema });
};

/**
 * Validate user authentication
 * Basic implementation - should be enhanced with proper auth
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  // Add user ID to request for use in controllers
  req.user = { id: userId };
  
  next();
};

/**
 * Type augmentation for Express Request
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: string;
      };
    }
  }
}