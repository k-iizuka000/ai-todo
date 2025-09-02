import express from 'express';
import { PrismaClient } from '@prisma/client';

interface AuthRequest extends express.Request {
  userId?: string;
  params: any;
  body: any;
}

// HTTPステータスコード定数
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
} as const;

// タスクのinclude設定を共通化
const TASK_INCLUDES = {
  project: true,
  tags: {
    include: {
      tag: true
    }
  },
  subtasks: true,
  assignee: {
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          displayName: true
        }
      }
    }
  },
  creator: {
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          displayName: true
        }
      }
    }
  }
};

// コメント付きのタスクinclude設定
const TASK_INCLUDES_WITH_COMMENTS = {
  ...TASK_INCLUDES,
  comments: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          profile: {
            select: {
              displayName: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  }
};

// 認証チェック関数
const checkAuthentication = (req: AuthRequest, res: express.Response): boolean => {
  if (!req.userId) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Authentication required' });
    return false;
  }
  return true;
};

// タスク更新用の型定義
interface TaskUpdateData {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  projectId?: string | null;
  assigneeId?: string | null;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  updatedBy: string;
  updatedAt: Date;
}

const router = express.Router();
const prisma = new PrismaClient();

// タスク一覧取得
router.get('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const tasks = await prisma.task.findMany({
      where: { 
        OR: [
          { assigneeId: req.userId },
          { createdBy: req.userId }
        ]
      },
      include: TASK_INCLUDES,
      orderBy: { updatedAt: 'desc' }
    });

    res.status(HTTP_STATUS.OK).json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch tasks' });
  }
});

// タスク単体取得
router.get('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    const task = await prisma.task.findFirst({
      where: { 
        id,
        OR: [
          { assigneeId: req.userId },
          { createdBy: req.userId }
        ]
      },
      include: TASK_INCLUDES_WITH_COMMENTS
    });
    
    if (!task) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
      return;
    }

    res.status(HTTP_STATUS.OK).json(task);
  } catch (error) {
    console.error('Get task by id error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch task' });
  }
});

// タスク作成
router.post('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    // バリデーション
    const { title, description, status, priority, projectId, dueDate, estimatedHours } = req.body;
    
    if (!title) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Title is required' });
      return;
    }

    // プロジェクトの権限確認（指定がある場合）
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: req.userId },
            { members: { some: { userId: req.userId } } }
          ]
        }
      });
      
      if (!project) {
        res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Access denied to project' });
        return;
      }
    }

    const taskData = {
      title,
      description: description || null,
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      projectId: projectId || null,
      assigneeId: req.userId, // 作成者を自動的にアサイン
      dueDate: dueDate ? new Date(dueDate) : null,
      estimatedHours: estimatedHours || null,
      createdBy: req.userId!,
      updatedBy: req.userId!,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const task = await prisma.task.create({
      data: taskData,
      include: TASK_INCLUDES
    });

    res.status(HTTP_STATUS.CREATED).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    // より具体的なエラーハンドリング
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2002') {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Task with this title already exists for this project' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create task' });
  }
});

// タスク更新
router.put('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    // 権限確認：作成者またはアサイン者のみが更新可能
    const existingTask = await prisma.task.findFirst({
      where: { 
        id,
        OR: [
          { assigneeId: req.userId },
          { createdBy: req.userId }
        ]
      }
    });
    
    if (!existingTask) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
      return;
    }

    // プロジェクトの権限確認（変更がある場合）
    const { projectId } = req.body;
    if (projectId && projectId !== existingTask.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: req.userId },
            { members: { some: { userId: req.userId } } }
          ]
        }
      });
      
      if (!project) {
        res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Access denied to project' });
        return;
      }
    }

    // 更新可能フィールドのみ抽出（型安全性を向上）
    const updateData: TaskUpdateData = {
      updatedBy: req.userId!,
      updatedAt: new Date()
    };

    // 許可されたフィールドのみを更新
    const allowedFields = [
      'title', 'description', 'status', 'priority', 
      'projectId', 'assigneeId', 'dueDate', 'estimatedHours', 'actualHours'
    ] as const;

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'dueDate' && req.body[field]) {
          (updateData as any)[field] = new Date(req.body[field]);
        } else {
          (updateData as any)[field] = req.body[field];
        }
      }
    });

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: TASK_INCLUDES
    });

    res.status(HTTP_STATUS.OK).json(task);
  } catch (error) {
    console.error('Update task error:', error);
    // より具体的なエラーハンドリング
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
        return;
      }
      if (prismaError.code === 'P2002') {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Task update conflict' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update task' });
  }
});

// タスク削除
router.delete('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    // 権限確認：作成者のみが削除可能
    const existingTask = await prisma.task.findFirst({
      where: { 
        id,
        createdBy: req.userId
      }
    });
    
    if (!existingTask) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found or access denied' });
      return;
    }

    // 関連データと一緒に削除（Prismaのカスケード削除により自動処理）
    await prisma.task.delete({ where: { id } });
    
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    console.error('Delete task error:', error);
    // より具体的なエラーハンドリング
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete task' });
  }
});

// タスクアーカイブ（論理削除）
router.patch('/:id/archive', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    // 権限確認
    const existingTask = await prisma.task.findFirst({
      where: { 
        id,
        OR: [
          { assigneeId: req.userId },
          { createdBy: req.userId }
        ]
      }
    });
    
    if (!existingTask) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        updatedBy: req.userId!,
        updatedAt: new Date()
      },
      include: TASK_INCLUDES
    });

    res.status(HTTP_STATUS.OK).json(task);
  } catch (error) {
    console.error('Archive task error:', error);
    // より具体的なエラーハンドリング
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to archive task' });
  }
});

// タスクアーカイブ解除
router.patch('/:id/unarchive', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    // 権限確認
    const existingTask = await prisma.task.findFirst({
      where: { 
        id,
        OR: [
          { assigneeId: req.userId },
          { createdBy: req.userId }
        ]
      }
    });
    
    if (!existingTask) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
      return;
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        archivedAt: null,
        updatedBy: req.userId!,
        updatedAt: new Date()
      },
      include: TASK_INCLUDES
    });

    res.status(HTTP_STATUS.OK).json(task);
  } catch (error) {
    console.error('Unarchive task error:', error);
    // より具体的なエラーハンドリング
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to unarchive task' });
  }
});

export { router as taskApiRoutes };