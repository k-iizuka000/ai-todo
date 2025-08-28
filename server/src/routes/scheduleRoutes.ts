import { Router } from 'express';
import { validateRequest, requireAuth } from '@/middleware/validateRequest.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { ScheduleService } from '../services/ScheduleService.js';
import { prisma } from '../config/database.js';
import {
  CreateDailyScheduleSchema,
  UpdateDailyScheduleSchema,
  CreateScheduleItemSchema,
  UpdateScheduleItemSchema,
  ScheduleQueryParamsSchema,
  ScheduleIdParamSchema,
  ScheduleItemIdParamSchema,
  DailyScheduleParamSchema,
  BulkUpdateScheduleItemsSchema,
  ScheduleAnalyticsFilterSchema
} from '../schemas/scheduleSchemas.js';

const router = Router();
const scheduleService = new ScheduleService(prisma);

/**
 * @swagger
 * /api/v1/schedules/daily/{userId}/{date}:
 *   get:
 *     summary: Get daily schedule for specific user and date
 *     tags: [Schedules]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *     responses:
 *       200:
 *         description: Successfully retrieved daily schedule
 */
router.get(
  '/daily/:userId/:date',
  requireAuth,
  validateRequest({
    params: DailyScheduleParamSchema
  }),
  asyncHandler(async (req, res) => {
    const { userId, date: dateStr } = req.params;
    const date = new Date(dateStr + 'T00:00:00.000Z');

    // 権限チェック：自分のスケジュールのみアクセス可能
    if (req.session?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのスケジュールにはアクセスできません'
      });
    }

    const schedule = await scheduleService.getDailySchedule(userId, date);
    const statistics = await scheduleService.getScheduleStatistics(userId, date);
    const conflicts = await scheduleService.detectConflicts(userId, date);

    res.json({
      success: true,
      data: {
        schedule,
        statistics,
        conflicts
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/range:
 *   get:
 *     summary: Get schedule range for multiple days
 *     tags: [Schedules]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Successfully retrieved schedule range
 */
router.get(
  '/range',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const userId = req.session?.userId as string;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDateとendDateパラメータが必要です'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: '有効な日付形式ではありません'
      });
    }

    const schedules = await scheduleService.getScheduleRange(userId, start, end);

    res.json({
      success: true,
      data: schedules,
      count: schedules.length,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/daily:
 *   post:
 *     summary: Create daily schedule
 *     tags: [Schedules]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDailySchedule'
 *     responses:
 *       201:
 *         description: Daily schedule created successfully
 */
router.post(
  '/daily',
  requireAuth,
  validateRequest({
    body: CreateDailyScheduleSchema
  }),
  asyncHandler(async (req, res) => {
    const userId = req.session?.userId as string;
    const schedule = await scheduleService.updateDailySchedule(
      userId,
      req.body.date,
      req.body
    );

    res.status(201).json({
      success: true,
      data: schedule,
      message: '日次スケジュールが作成されました',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/daily/{userId}/{date}:
 *   put:
 *     summary: Update daily schedule
 *     tags: [Schedules]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDailySchedule'
 *     responses:
 *       200:
 *         description: Daily schedule updated successfully
 */
router.put(
  '/daily/:userId/:date',
  requireAuth,
  validateRequest({
    params: DailyScheduleParamSchema,
    body: UpdateDailyScheduleSchema
  }),
  asyncHandler(async (req, res) => {
    const { userId, date: dateStr } = req.params;
    const date = new Date(dateStr + 'T00:00:00.000Z');

    // 権限チェック
    if (req.session?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのスケジュールは更新できません'
      });
    }

    const schedule = await scheduleService.updateDailySchedule(userId, date, req.body);

    res.json({
      success: true,
      data: schedule,
      message: '日次スケジュールが更新されました',
      timestamp: new Date().toISOString()
    });
  })
);

// ===== Schedule Item Operations =====

/**
 * @swagger
 * /api/v1/schedules/items:
 *   post:
 *     summary: Create schedule item
 *     tags: [Schedule Items]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateScheduleItem'
 *     responses:
 *       201:
 *         description: Schedule item created successfully
 */
router.post(
  '/items',
  requireAuth,
  validateRequest({
    body: CreateScheduleItemSchema
  }),
  asyncHandler(async (req, res) => {
    const userId = req.session?.userId as string;
    const item = await scheduleService.createScheduleItem(userId, req.body);

    res.status(201).json({
      success: true,
      data: item,
      message: 'スケジュールアイテムが作成されました',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/items/{id}:
 *   put:
 *     summary: Update schedule item
 *     tags: [Schedule Items]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateScheduleItem'
 *     responses:
 *       200:
 *         description: Schedule item updated successfully
 */
router.put(
  '/items/:id',
  requireAuth,
  validateRequest({
    params: ScheduleItemIdParamSchema,
    body: UpdateScheduleItemSchema
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session?.userId as string;
    
    const item = await scheduleService.updateScheduleItem(userId, id, req.body);

    res.json({
      success: true,
      data: item,
      message: 'スケジュールアイテムが更新されました',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/items/{id}:
 *   delete:
 *     summary: Delete schedule item
 *     tags: [Schedule Items]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Schedule item deleted successfully
 */
router.delete(
  '/items/:id',
  requireAuth,
  validateRequest({
    params: ScheduleItemIdParamSchema
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.session?.userId as string;
    
    await scheduleService.deleteScheduleItem(userId, id);

    res.json({
      success: true,
      message: 'スケジュールアイテムが削除されました',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/items/bulk:
 *   put:
 *     summary: Bulk update schedule items
 *     tags: [Schedule Items]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateScheduleItems'
 *     responses:
 *       200:
 *         description: Schedule items updated successfully
 */
router.put(
  '/items/bulk',
  requireAuth,
  validateRequest({
    body: BulkUpdateScheduleItemsSchema
  }),
  asyncHandler(async (req, res) => {
    const userId = req.session?.userId as string;
    const { scheduleItemIds, updates } = req.body;
    
    const updatedCount = await scheduleService.bulkUpdateScheduleItems(
      userId, 
      scheduleItemIds, 
      updates
    );

    res.json({
      success: true,
      data: { updatedCount },
      message: `${updatedCount}件のスケジュールアイテムが更新されました`,
      timestamp: new Date().toISOString()
    });
  })
);

// ===== Advanced Features =====

/**
 * @swagger
 * /api/v1/schedules/statistics/{userId}/{date}:
 *   get:
 *     summary: Get schedule statistics for specific date
 *     tags: [Analytics]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *     responses:
 *       200:
 *         description: Successfully retrieved schedule statistics
 */
router.get(
  '/statistics/:userId/:date',
  requireAuth,
  validateRequest({
    params: DailyScheduleParamSchema
  }),
  asyncHandler(async (req, res) => {
    const { userId, date: dateStr } = req.params;
    const date = new Date(dateStr + 'T00:00:00.000Z');

    // 権限チェック
    if (req.session?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '他のユーザーの統計情報にはアクセスできません'
      });
    }

    const statistics = await scheduleService.getScheduleStatistics(userId, date);

    res.json({
      success: true,
      data: statistics,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/conflicts/{userId}/{date}:
 *   get:
 *     summary: Detect schedule conflicts for specific date
 *     tags: [Analytics]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *     responses:
 *       200:
 *         description: Successfully detected schedule conflicts
 */
router.get(
  '/conflicts/:userId/:date',
  requireAuth,
  validateRequest({
    params: DailyScheduleParamSchema
  }),
  asyncHandler(async (req, res) => {
    const { userId, date: dateStr } = req.params;
    const date = new Date(dateStr + 'T00:00:00.000Z');

    // 権限チェック
    if (req.session?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのスケジュールにはアクセスできません'
      });
    }

    const conflicts = await scheduleService.detectConflicts(userId, date);

    res.json({
      success: true,
      data: conflicts,
      count: conflicts.length,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/tasks/{taskId}/schedule:
 *   post:
 *     summary: Create schedule from task
 *     tags: [Task Integration]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - startTime
 *               - endTime
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *               endTime:
 *                 type: string
 *                 pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$'
 *     responses:
 *       201:
 *         description: Schedule created from task successfully
 */
router.post(
  '/tasks/:taskId/schedule',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { date, startTime, endTime } = req.body;
    const userId = req.session?.userId as string;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'date, startTime, endTimeが必要です'
      });
    }

    const scheduleDate = new Date(date);
    const item = await scheduleService.createScheduleFromTask(
      userId,
      taskId,
      scheduleDate,
      startTime,
      endTime
    );

    res.status(201).json({
      success: true,
      data: item,
      message: 'タスクからスケジュールが作成されました',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/suggestions/{taskId}:
 *   get:
 *     summary: Get AI scheduling suggestions for task
 *     tags: [AI Features]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully generated scheduling suggestions
 */
router.get(
  '/suggestions/:taskId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const userId = req.session?.userId as string;

    const suggestions = await scheduleService.generateScheduleSuggestions(userId, taskId);

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * @swagger
 * /api/v1/schedules/sync/calendar/{userId}/{date}:
 *   post:
 *     summary: Sync with external calendar
 *     tags: [Calendar Integration]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *     responses:
 *       200:
 *         description: Calendar sync completed successfully
 */
router.post(
  '/sync/calendar/:userId/:date',
  requireAuth,
  validateRequest({
    params: DailyScheduleParamSchema
  }),
  asyncHandler(async (req, res) => {
    const { userId, date: dateStr } = req.params;
    const date = new Date(dateStr + 'T00:00:00.000Z');

    // 権限チェック
    if (req.session?.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '他のユーザーのカレンダーは同期できません'
      });
    }

    const result = await scheduleService.syncWithExternalCalendar(userId, date);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

export { router as scheduleRoutes };