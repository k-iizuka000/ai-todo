/**
 * Request Logger Middleware
 * API リクエストのログ記録
 */

import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : res.statusCode >= 300 ? '🟡' : '🟢';
    
    console.log(
      `${statusColor} ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
    
    if (req.method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      console.log('📝 Body:', JSON.stringify(req.body, null, 2));
    }
  });
  
  next();
};