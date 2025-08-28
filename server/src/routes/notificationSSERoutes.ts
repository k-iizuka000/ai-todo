import { Router, Request, Response } from 'express';
import { requireAuth } from '@/middleware/validateRequest.js';
import { asyncHandler } from '@/middleware/errorHandler.js';
import { NotificationService } from '@/services/NotificationService.js';
import { NotificationRepository } from '@/repositories/NotificationRepository.js';
import { prisma } from '@/config/database.js';
import { notificationLogger } from '@/config/logger.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface SSEClient {
  userId: string;
  response: Response;
  lastEventId?: string;
  connectedAt: Date;
}

// グローバルなSSEクライアント管理
const sseClients = new Map<string, SSEClient>();

const router = Router();

/**
 * @swagger
 * /api/v1/notifications/sse:
 *   get:
 *     summary: Server-Sent Events endpoint for real-time notifications
 *     tags: [Notifications, Real-time]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: header
 *         name: Last-Event-ID
 *         schema:
 *           type: string
 *         description: Last received event ID for reconnection
 *       - in: query
 *         name: reconnect
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether this is a reconnection attempt
 *     responses:
 *       200:
 *         description: SSE connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *             examples:
 *               connection:
 *                 summary: Connection established
 *                 value: |
 *                   event: connected
 *                   data: {"message":"Connected to notifications stream","timestamp":"2025-08-28T10:00:00Z"}
 *               
 *               notification:
 *                 summary: New notification
 *                 value: |
 *                   id: notif_12345
 *                   event: notification
 *                   data: {"id":"notif_12345","type":"TASK_ASSIGNED","title":"New task assigned","message":"Task 'Implement notifications' has been assigned to you","isRead":false,"createdAt":"2025-08-28T10:00:00Z"}
 *               
 *               unread_count:
 *                 summary: Unread count update
 *                 value: |
 *                   event: unread_count
 *                   data: {"count":5}
 *       401:
 *         description: Authentication required
 */
router.get(
  '/sse',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const lastEventId = req.headers['last-event-id'] as string;
    const isReconnect = req.query.reconnect === 'true';

    // SSE接続を設定
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    });

    // ハートビート用の初期メッセージ
    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({
      message: 'Connected to notifications stream',
      timestamp: new Date().toISOString(),
      userId,
      reconnection: isReconnect
    })}\n\n`);

    // クライアントを登録
    const client: SSEClient = {
      userId,
      response: res,
      lastEventId,
      connectedAt: new Date()
    };

    sseClients.set(userId, client);

    notificationLogger.info('SSE client connected:', { 
      userId, 
      isReconnect, 
      lastEventId,
      totalClients: sseClients.size
    });

    // 初回接続時または再接続時に未読数を送信
    try {
      const notificationRepository = new NotificationRepository(prisma);
      const notificationService = new NotificationService(notificationRepository);
      
      const { count } = await notificationService.getUnreadCount(userId);
      sendSSEMessage(userId, 'unread_count', { count });

      // 再接続の場合、最後のイベント以降の通知を送信
      if (isReconnect && lastEventId) {
        await sendMissedNotifications(userId, lastEventId, notificationService);
      }
    } catch (error) {
      notificationLogger.error('Error sending initial SSE data:', { userId, error });
    }

    // クライアント切断時の処理
    req.on('close', () => {
      sseClients.delete(userId);
      notificationLogger.info('SSE client disconnected:', { 
        userId, 
        totalClients: sseClients.size 
      });
    });

    req.on('error', (error) => {
      sseClients.delete(userId);
      notificationLogger.error('SSE client error:', { userId, error });
    });
  })
);

/**
 * @swagger
 * /api/v1/notifications/sse/heartbeat:
 *   get:
 *     summary: SSE heartbeat endpoint to check connection status
 *     tags: [Notifications, Real-time]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 connectedAt:
 *                   type: string
 *                   format: date-time
 *                 totalClients:
 *                   type: integer
 */
router.get(
  '/sse/heartbeat',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const client = sseClients.get(userId);

    res.json({
      success: true,
      data: {
        connected: !!client,
        connectedAt: client?.connectedAt?.toISOString(),
        totalClients: sseClients.size,
      },
      message: client ? 'SSE connection active' : 'No active SSE connection',
    });
  })
);

/**
 * @swagger
 * /api/v1/notifications/sse/broadcast:
 *   post:
 *     summary: Broadcast notification to specific users (Admin only)
 *     tags: [Notifications, Real-time]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - event
 *               - data
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Target user IDs
 *               event:
 *                 type: string
 *                 enum: [notification, unread_count, system_message]
 *                 description: Event type
 *               data:
 *                 type: object
 *                 description: Event data
 *               eventId:
 *                 type: string
 *                 description: Optional event ID
 *     responses:
 *       200:
 *         description: Broadcast sent successfully
 *       403:
 *         description: Admin access required
 */
router.post(
  '/sse/broadcast',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Admin権限チェック
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Admin access required'
        }
      });
      return;
    }

    const { userIds, event, data, eventId } = req.body;

    if (!userIds || !Array.isArray(userIds) || !event || !data) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'userIds (array), event, and data are required'
        }
      });
      return;
    }

    let sentCount = 0;
    for (const userId of userIds) {
      if (sendSSEMessage(userId, event, data, eventId)) {
        sentCount++;
      }
    }

    notificationLogger.info('SSE broadcast sent:', {
      event,
      targetUsers: userIds.length,
      sentCount,
      adminId: req.user.id
    });

    res.json({
      success: true,
      data: {
        targetUsers: userIds.length,
        sentCount,
        event
      },
      message: 'Broadcast sent successfully'
    });
  })
);

/**
 * 特定のユーザーにSSEメッセージを送信
 */
export function sendSSEMessage(
  userId: string,
  event: string,
  data: any,
  id?: string
): boolean {
  const client = sseClients.get(userId);
  if (!client) return false;

  try {
    if (id) {
      client.response.write(`id: ${id}\n`);
    }
    client.response.write(`event: ${event}\n`);
    client.response.write(`data: ${JSON.stringify(data)}\n\n`);
    
    return true;
  } catch (error) {
    notificationLogger.error('Error sending SSE message:', { userId, event, error });
    
    // 接続が切れていた場合は削除
    sseClients.delete(userId);
    return false;
  }
}

/**
 * 複数のユーザーにSSEメッセージを一括送信
 */
export function broadcastSSEMessage(
  userIds: string[],
  event: string,
  data: any,
  id?: string
): number {
  let sentCount = 0;
  
  for (const userId of userIds) {
    if (sendSSEMessage(userId, event, data, id)) {
      sentCount++;
    }
  }
  
  return sentCount;
}

/**
 * 全接続中のユーザーにメッセージを送信
 */
export function broadcastToAllClients(
  event: string,
  data: any,
  id?: string
): number {
  const userIds = Array.from(sseClients.keys());
  return broadcastSSEMessage(userIds, event, data, id);
}

/**
 * 特定のユーザーの未読通知を送信（再接続時など）
 */
async function sendMissedNotifications(
  userId: string,
  lastEventId: string,
  notificationService: NotificationService
): Promise<void> {
  try {
    // 簡単な実装: 最新の未読通知を取得
    // 実際の実装では lastEventId 以降の通知を取得する必要があります
    const recentNotifications = await notificationService.getRecentUnread(userId, 20);
    
    for (const notification of recentNotifications) {
      sendSSEMessage(
        userId,
        'notification',
        notification,
        `notif_${notification.id}`
      );
    }

    notificationLogger.info('Sent missed notifications:', {
      userId,
      lastEventId,
      count: recentNotifications.length
    });
  } catch (error) {
    notificationLogger.error('Error sending missed notifications:', {
      userId,
      lastEventId,
      error
    });
  }
}

/**
 * 定期的なハートビート送信（接続維持）
 */
setInterval(() => {
  const heartbeatData = {
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
    activeConnections: sseClients.size
  };

  broadcastToAllClients('heartbeat', heartbeatData);
}, 30000); // 30秒毎

/**
 * 接続中のクライアント情報を取得
 */
export function getActiveSSEClients(): { userId: string; connectedAt: Date }[] {
  return Array.from(sseClients.values()).map(client => ({
    userId: client.userId,
    connectedAt: client.connectedAt
  }));
}

/**
 * 特定のユーザーの接続状態を確認
 */
export function isUserConnected(userId: string): boolean {
  return sseClients.has(userId);
}

export { router as notificationSSERoutes };