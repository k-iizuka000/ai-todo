/**
 * Tag API Routes
 * タグ管理エンドポイント
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { tagService, CreateTagInput, UpdateTagInput } from '../models/tagService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Validation schemas
const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format')
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional()
});

const querySchema = z.object({
  includeUsageCount: z.string().transform(str => str !== 'false').default('true'),
  search: z.string().optional(),
  limit: z.string().transform(Number).default('20')
});

/**
 * GET /api/v1/tags
 * タグ一覧取得
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const query = querySchema.parse(req.query);
  
  let tags;
  
  if (query.search) {
    tags = await tagService.search(query.search, query.limit);
  } else {
    tags = await tagService.findAll(query.includeUsageCount);
  }
  
  res.json({
    success: true,
    data: tags
  });
}));

/**
 * GET /api/v1/tags/popular
 * 人気タグ取得
 */
router.get('/popular', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  
  const tags = await tagService.getPopularTags(limit);
  
  res.json({
    success: true,
    data: tags
  });
}));

/**
 * GET /api/v1/tags/:id
 * タグ詳細取得
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const tag = await tagService.findById(id);
  
  res.json({
    success: true,
    data: tag
  });
}));

/**
 * POST /api/v1/tags
 * タグ作成
 */
router.post('/', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = createTagSchema.parse(req.body) as CreateTagInput;
  
  const tag = await tagService.create(input);
  
  res.status(201).json({
    success: true,
    data: tag,
    message: 'Tag created successfully'
  });
}));

/**
 * PUT /api/v1/tags/:id
 * タグ更新
 */
router.put('/:id', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const input = updateTagSchema.parse(req.body) as UpdateTagInput;
  
  const tag = await tagService.update(id, input);
  
  res.json({
    success: true,
    data: tag,
    message: 'Tag updated successfully'
  });
}));

/**
 * DELETE /api/v1/tags/:id
 * タグ削除
 */
router.delete('/:id', writeRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  await tagService.delete(id);
  
  res.json({
    success: true,
    message: 'Tag deleted successfully'
  });
}));

export { router as tagRoutes };