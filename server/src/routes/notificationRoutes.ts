import { Router } from 'express';
import { validateRequest, requireAuth } from '@/middleware/validateRequest.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { NotificationController } from '@/controllers/NotificationController.js';
import {
  CreateNotificationSchema,
  UpdateNotificationSchema,
  NotificationQueryParamsSchema,
  NotificationIdParamSchema,
  BulkUpdateNotificationsSchema,
  BulkDeleteNotificationsSchema,
  MarkAllAsReadSchema,
  SystemNotificationSchema,
} from '@/schemas/notificationSchemas.js';

const router = Router();
const notificationController = new NotificationController();

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get paginated list of notifications
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of notifications per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [TASK_DEADLINE, TASK_ASSIGNED, TASK_COMPLETED, MENTION, PROJECT_UPDATE, SYSTEM]
 *         description: Filter by notification types
 *       - in: query
 *         name: priority
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [HIGH, MEDIUM, LOW]
 *         description: Filter by priority levels
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search in title and message
 *     responses:
 *       200:
 *         description: Successfully retrieved notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(notificationController.getNotifications.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get count of unread notifications
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 */
router.get(
  '/unread-count',
  requireAuth,
  asyncHandler(notificationController.getUnreadCount.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/recent-unread:
 *   get:
 *     summary: Get recent unread notifications
 *     tags: [Notifications]
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
 *         description: Recent unread notifications retrieved successfully
 */
router.get(
  '/recent-unread',
  requireAuth,
  asyncHandler(notificationController.getRecentUnread.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/stats:
 *   get:
 *     summary: Get notification statistics
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Notification statistics retrieved successfully
 */
router.get(
  '/stats',
  requireAuth,
  asyncHandler(notificationController.getNotificationStats.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags: [Notifications]
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
 *         description: Notification retrieved successfully
 *       404:
 *         description: Notification not found
 */
router.get(
  '/:id',
  requireAuth,
  asyncHandler(notificationController.getNotificationById.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Create new notification
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotificationInput'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Invalid input data
 */
router.post(
  '/',
  requireAuth,
  validateRequest({ body: CreateNotificationSchema }),
  asyncHandler(notificationController.createNotification.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/system:
 *   post:
 *     summary: Create system notification (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SystemNotificationInput'
 *     responses:
 *       201:
 *         description: System notification created successfully
 *       403:
 *         description: Admin access required
 */
router.post(
  '/system',
  requireAuth,
  validateRequest({ body: SystemNotificationSchema }),
  asyncHandler(notificationController.createSystemNotification.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/bulk-read:
 *   post:
 *     summary: Mark multiple notifications as read
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkUpdateNotificationsInput'
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.post(
  '/bulk-read',
  requireAuth,
  validateRequest({ body: BulkUpdateNotificationsSchema }),
  asyncHandler(notificationController.markMultipleAsRead.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAllAsReadInput'
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.post(
  '/read-all',
  requireAuth,
  validateRequest({ body: MarkAllAsReadSchema }),
  asyncHandler(notificationController.markAllAsRead.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/bulk-delete:
 *   post:
 *     summary: Delete multiple notifications
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkDeleteNotificationsInput'
 *     responses:
 *       200:
 *         description: Notifications deleted successfully
 */
router.post(
  '/bulk-delete',
  requireAuth,
  validateRequest({ body: BulkDeleteNotificationsSchema }),
  asyncHandler(notificationController.deleteMultiple.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/cleanup:
 *   post:
 *     summary: Clean up old read notifications
 *     tags: [Notifications]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olderThanDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 30
 *     responses:
 *       200:
 *         description: Old notifications cleaned up successfully
 */
router.post(
  '/cleanup',
  requireAuth,
  asyncHandler(notificationController.cleanupOldNotifications.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   put:
 *     summary: Update notification
 *     tags: [Notifications]
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
 *             $ref: '#/components/schemas/UpdateNotificationInput'
 *     responses:
 *       200:
 *         description: Notification updated successfully
 *       404:
 *         description: Notification not found
 */
router.put(
  '/:id',
  requireAuth,
  validateRequest({ 
    params: NotificationIdParamSchema,
    body: UpdateNotificationSchema 
  }),
  asyncHandler(notificationController.updateNotification.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch(
  '/:id/read',
  requireAuth,
  validateRequest({ params: NotificationIdParamSchema }),
  asyncHandler(notificationController.markAsRead.bind(notificationController))
);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
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
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 */
router.delete(
  '/:id',
  requireAuth,
  validateRequest({ params: NotificationIdParamSchema }),
  asyncHandler(notificationController.deleteNotification.bind(notificationController))
);

export { router as notificationRoutes };