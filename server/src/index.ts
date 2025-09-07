/**
 * Express API Server - Entry Point
 * Task管理機能のDB統合対応サーバー
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './config/database.js';
import { swaggerOptions } from './config/swagger.js';
import { taskRoutes } from './routes/taskRoutes.js';
import { subtaskRoutes } from './routes/subtasks.js';
import { tagRoutes } from './routes/tags.js';
import { scheduleRoutes } from './routes/scheduleRoutes.js';
import { notificationRoutes } from './routes/notificationRoutes.js';
import { notificationSSERoutes } from './routes/notificationSSERoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = process.env.PORT || 3001;

// OpenAPI Documentation
const specs = swaggerJSDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customSiteTitle: 'AI Todo API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/subtasks', subtaskRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/notifications', notificationSSERoutes);
app.use('/api/v1/projects', projectRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api/v1`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`💊 Health Check: http://localhost:${PORT}/health`);
});

export default app;