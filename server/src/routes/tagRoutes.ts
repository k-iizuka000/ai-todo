import { Router } from 'express';
import { z } from 'zod';
import { validateRequest, requireAuth } from '@/middleware/validateRequest.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { tagService } from '@/models/tagService.js';

const router = Router();

// バリデーションスキーマ定義
const createTagSchema = z.object({
  name: z.string()
    .min(1, 'タグ名を入力してください')
    .max(20, 'タグ名は20文字以内で入力してください')
    .regex(/^[^<>&"'`]*$/, 'タグ名に使用できない文字が含まれています（< > & " \' `）')
    .regex(/^[^\s\.].*[^\s\.]$|^[^\s\.]$/, 'タグ名の先頭・末尾に空白やドットは使用できません'),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '有効なカラーコード（#RRGGBB形式）を指定してください')
});

const updateTagSchema = z.object({
  name: z.string()
    .min(1, 'タグ名を入力してください')
    .max(20, 'タグ名は20文字以内で入力してください')
    .regex(/^[^<>&"'`]*$/, 'タグ名に使用できない文字が含まれています（< > & " \' `）')
    .regex(/^[^\s\.].*[^\s\.]$|^[^\s\.]$/, 'タグ名の先頭・末尾に空白やドットは使用できません')
    .optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, '有効なカラーコード（#RRGGBB形式）を指定してください')
    .optional()
});

/**
 * @swagger
 * /api/v1/tags:
 *   get:
 *     summary: Get list of tags
 *     tags: [Tags]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       color:
 *                         type: string
 *                       usageCount:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tags = await tagService.findAll();
    res.json({
      success: true,
      data: tags
    });
  })
);

/**
 * @swagger
 * /api/v1/tags:
 *   post:
 *     summary: Create a new tag
 *     tags: [Tags]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 20
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *             required: [name, color]
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       409:
 *         description: Tag already exists
 */
router.post(
  '/',
  requireAuth,
  validateRequest({ body: createTagSchema }),
  asyncHandler(async (req, res) => {
    const tag = await tagService.create(req.body);
    res.status(201).json({
      success: true,
      data: tag
    });
  })
);

/**
 * @swagger
 * /api/v1/tags/popular:
 *   get:
 *     summary: Get popular tags
 *     tags: [Tags]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *     responses:
 *       200:
 *         description: Popular tags retrieved successfully
 */
router.get(
  '/popular',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const tags = await tagService.getPopularTags(limit);
    res.json({
      success: true,
      data: tags
    });
  })
);

/**
 * @swagger
 * /api/v1/tags/search:
 *   get:
 *     summary: Search tags
 *     tags: [Tags]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Invalid search query
 */
router.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { q: query, limit } = req.query;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Search query is required'
        }
      });
    }

    const searchLimit = Math.min(parseInt(limit as string) || 20, 50);
    const tags = await tagService.search(query.trim(), searchLimit);
    
    res.json({
      success: true,
      data: tags
    });
  })
);

/**
 * @swagger
 * /api/v1/tags/{id}:
 *   get:
 *     summary: Get a specific tag by ID
 *     tags: [Tags]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tag retrieved successfully
 *       404:
 *         description: Tag not found
 */
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tag = await tagService.findById(id);
    res.json({
      success: true,
      data: tag
    });
  })
);

/**
 * @swagger
 * /api/v1/tags/{id}:
 *   put:
 *     summary: Update a tag
 *     tags: [Tags]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 20
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *     responses:
 *       200:
 *         description: Tag updated successfully
 *       404:
 *         description: Tag not found
 *       409:
 *         description: Tag name already exists
 */
router.put(
  '/:id',
  requireAuth,
  validateRequest({ body: updateTagSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tag = await tagService.update(id, req.body);
    res.json({
      success: true,
      data: tag
    });
  })
);

/**
 * @swagger
 * /api/v1/tags/{id}:
 *   delete:
 *     summary: Delete a tag
 *     tags: [Tags]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *       404:
 *         description: Tag not found
 *       409:
 *         description: Tag is currently in use
 */
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await tagService.delete(id);
    res.json({
      success: true,
      message: 'Tag deleted successfully'
    });
  })
);

export { router as tagRoutes };