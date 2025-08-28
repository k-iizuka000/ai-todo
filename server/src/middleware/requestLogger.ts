import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/config/logger.js';

/**
 * Request logging middleware
 * Logs incoming requests and assigns unique request IDs
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  // Add request ID to request headers for use in other middleware
  req.headers['x-request-id'] = requestId;
  
  // Log the incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.headers['x-user-id'],
  });

  // Override res.json to log the response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - startTime;
    
    // Log the response
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.headers['x-user-id'],
    });
    
    // Call the original json method
    return originalJson.call(this, body);
  };

  next();
};

/**
 * Performance monitoring middleware
 * Logs slow requests
 */
export const performanceMonitor = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string;
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const slowRequestThreshold = 2000; // 2 seconds
    
    if (duration > slowRequestThreshold) {
      logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.headers['x-user-id'],
      });
    }
  });
  
  next();
};