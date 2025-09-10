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

// プロジェクトのinclude設定を共通化
const PROJECT_INCLUDES = {
  _count: {
    select: {
      tasks: true,
      members: true
    }
  },
  owner: {
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

// 詳細用のinclude設定
const PROJECT_INCLUDES_DETAIL = {
  ...PROJECT_INCLUDES,
  members: {
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
    }
  },
  tasks: {
    include: {
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
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10 // 最新10件のタスクのみ取得
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

const router = express.Router();
const prisma = new PrismaClient();

// プロジェクト一覧取得
router.get('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } }
        ]
      },
      include: PROJECT_INCLUDES,
      orderBy: { updatedAt: 'desc' }
    });

    res.status(HTTP_STATUS.OK).json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch projects' });
  }
});

// プロジェクト単体取得
router.get('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    const project = await prisma.project.findFirst({
      where: { 
        id,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } }
        ]
      },
      include: PROJECT_INCLUDES_DETAIL
    });
    
    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Project not found' });
      return;
    }

    res.status(HTTP_STATUS.OK).json(project);
  } catch (error) {
    console.error('Get project by id error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch project' });
  }
});

// プロジェクト作成
router.post('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { name, description, color } = req.body;
    
    if (!name) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Name is required' });
      return;
    }

    const projectData = {
      name,
      description: description || null,
      color: color || generateProjectColor(),
      ownerId: req.userId!,
      createdBy: req.userId!,
      updatedBy: req.userId!,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const project = await prisma.project.create({
      data: projectData,
      include: PROJECT_INCLUDES
    });

    res.status(HTTP_STATUS.CREATED).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2002') {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Project with this name already exists' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create project' });
  }
});

// プロジェクト更新
router.put('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    // 権限確認：オーナーのみが更新可能
    const existingProject = await prisma.project.findFirst({
      where: { 
        id,
        ownerId: req.userId
      }
    });
    
    if (!existingProject) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Project not found or access denied' });
      return;
    }

    const { name, description, color } = req.body;
    
    const updateData = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      updatedBy: req.userId!,
      updatedAt: new Date()
    };

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: PROJECT_INCLUDES
    });

    res.status(HTTP_STATUS.OK).json(project);
  } catch (error) {
    console.error('Update project error:', error);
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Project not found' });
        return;
      }
      if (prismaError.code === 'P2002') {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Project update conflict' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update project' });
  }
});

// プロジェクト削除
router.delete('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    // 権限確認：オーナーのみが削除可能
    const existingProject = await prisma.project.findFirst({
      where: { 
        id,
        ownerId: req.userId
      }
    });
    
    if (!existingProject) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Project not found or access denied' });
      return;
    }

    // タスクのプロジェクト参照を解除
    await prisma.task.updateMany({
      where: { projectId: id },
      data: { projectId: null }
    });

    // プロジェクトを削除
    await prisma.project.delete({ where: { id } });
    
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    console.error('Delete project error:', error);
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Project not found' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete project' });
  }
});

// プロジェクト統計取得
router.get('/:id/stats', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    const project = await prisma.project.findFirst({
      where: { 
        id,
        OR: [
          { ownerId: req.userId },
          { members: { some: { userId: req.userId } } }
        ]
      },
      include: {
        tasks: true,
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    });
    
    if (!project) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Project not found' });
      return;
    }

    const stats = {
      total: project.tasks.length,
      todo: project.tasks.filter(t => t.status === 'TODO').length,
      inProgress: project.tasks.filter(t => t.status === 'IN_PROGRESS').length,
      done: project.tasks.filter(t => t.status === 'DONE').length,
      archived: project.tasks.filter(t => t.status === 'ARCHIVED').length,
      memberCount: project._count.members + 1 // +1 for owner
    };

    res.status(HTTP_STATUS.OK).json({ project: { id: project.id, name: project.name }, stats });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch project statistics' });
  }
});

// Helper function to generate random project color
function generateProjectColor(): string {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export { router as projectApiRoutes };