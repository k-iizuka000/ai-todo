/**
 * Subtask API Routes
 * サブタスク管理エンドポイント
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { subtaskService, CreateSubtaskInput, UpdateSubtaskInput } from '../models/subtaskService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Validation schemas
const createSubtaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long')
});

const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional()
});

/**
 * GET /api/v1/subtasks/task/:taskId
 * タスクのサブタスク一覧取得
 */
router.get('/task/:taskId', asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;
  
  const subtasks = await subtaskService.findByTaskId(taskId);
  
  res.json({
    success: true,
    data: subtasks
  });
}));

/**
 * POST /api/v1/subtasks
 * サブタスク作成
 */
router.post('/', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = createSubtaskSchema.parse(req.body) as CreateSubtaskInput;
  
  const subtask = await subtaskService.create(input);
  
  res.status(201).json({
    success: true,
    data: subtask,
    message: 'Subtask created successfully'
  });
}));

/**
 * PUT /api/v1/subtasks/:id
 * サブタスク更新
 */
router.put('/:id', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = updateSubtaskSchema.parse(req.body) as UpdateSubtaskInput;
  
  const subtask = await subtaskService.update(id, input);
  
  res.json({
    success: true,
    data: subtask,
    message: 'Subtask updated successfully'
  });
}));

/**
 * DELETE /api/v1/subtasks/:id
 * サブタスク削除
 */
router.delete('/:id', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  await subtaskService.delete(id);
  
  res.json({
    success: true,
    message: 'Subtask deleted successfully'
  });
}));

export { router as subtaskRoutes };