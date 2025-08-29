/**
 * Task API Routes
 * RESTful Task CRUD endpoints
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { taskService, CreateTaskInput, UpdateTaskInput, TaskFilter } from '../models/taskService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).default('MEDIUM'),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().transform(str => new Date(str)).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  tagIds: z.array(z.string()).optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'CRITICAL']).optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().transform(str => new Date(str)).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  actualHours: z.number().min(0).max(1000).optional(),
  tagIds: z.array(z.string()).optional()
});

const querySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('50'),
  status: z.string().transform(str => str.split(',').filter(Boolean)).optional(),
  priority: z.string().transform(str => str.split(',').filter(Boolean)).optional(),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  tags: z.string().transform(str => str.split(',').filter(Boolean)).optional(),
  dueDateFrom: z.string().datetime().transform(str => new Date(str)).optional(),
  dueDateTo: z.string().datetime().transform(str => new Date(str)).optional(),
  search: z.string().optional(),
  includeArchived: z.string().transform(str => str === 'true').default('false')
});

/**
 * GET /api/v1/tasks
 * タスク一覧取得
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const query = querySchema.parse(req.query);
  
  const filter: TaskFilter = {
    status: query.status,
    priority: query.priority,
    projectId: query.projectId,
    assigneeId: query.assigneeId,
    tags: query.tags,
    dueDateFrom: query.dueDateFrom,
    dueDateTo: query.dueDateTo,
    search: query.search,
    includeArchived: query.includeArchived
  };

  const result = await taskService.findAll(filter, query.page, query.limit);
  
  res.json({
    success: true,
    data: result.tasks,
    pagination: result.pagination
  });
}));

/**
 * GET /api/v1/tasks/:id
 * タスク詳細取得
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const task = await taskService.findById(id);
  
  res.json({
    success: true,
    data: task
  });
}));

/**
 * POST /api/v1/tasks
 * タスク作成
 */
router.post('/', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = createTaskSchema.parse(req.body) as CreateTaskInput;
  
  // TODO: 認証実装後はJWTからユーザーID取得
  const createdBy = req.headers['x-user-id'] as string || 'system';
  
  const task = await taskService.create(input, createdBy);
  
  res.status(201).json({
    success: true,
    data: task,
    message: 'Task created successfully'
  });
}));

/**
 * PUT /api/v1/tasks/:id
 * タスク更新
 */
router.put('/:id', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = updateTaskSchema.parse(req.body) as UpdateTaskInput;
  
  // TODO: 認証実装後はJWTからユーザーID取得
  const updatedBy = req.headers['x-user-id'] as string || 'system';
  
  const task = await taskService.update(id, input, updatedBy);
  
  res.json({
    success: true,
    data: task,
    message: 'Task updated successfully'
  });
}));

/**
 * DELETE /api/v1/tasks/:id
 * タスク削除
 */
router.delete('/:id', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  await taskService.delete(id);
  
  res.json({
    success: true,
    message: 'Task deleted successfully'
  });
}));

/**
 * GET /api/v1/tasks/stats/summary
 * タスク統計取得
 */
router.get('/stats/summary', asyncHandler(async (req: Request, res: Response) => {
  // Basic stats query
  const filter: TaskFilter = {};
  const result = await taskService.findAll(filter, 1, 10000); // Get all for stats
  const tasks = result.tasks;

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    todo: tasks.filter(t => t.status === 'todo').length,
    archived: tasks.filter(t => t.status === 'archived').length,
    
    // Priority breakdown
    priorityStats: {
      critical: tasks.filter(t => t.priority === 'critical').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length
    },
    
    // Due date analysis
    overdueTasks: tasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length,
    
    dueSoonTasks: tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const due = new Date(t.dueDate);
      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      return due >= now && due <= sevenDaysFromNow;
    }).length,
    
    // Time tracking
    timeStats: {
      totalEstimated: tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
      totalActual: tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0)
    }
  };
  
  // Calculate completion rate and efficiency
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const efficiency = stats.timeStats.totalActual > 0 
    ? Math.round((stats.timeStats.totalEstimated / stats.timeStats.totalActual) * 100)
    : 100;

  res.json({
    success: true,
    data: {
      ...stats,
      completionRate,
      efficiency
    }
  });
}));

export { router as taskRoutes };