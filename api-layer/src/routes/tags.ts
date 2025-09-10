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

// タグのinclude設定を共通化
const TAG_INCLUDES = {
  _count: {
    select: {
      taskTags: true  // TagモデルはtaskTagsリレーションを持つ
    }
  }
};

// 詳細用のinclude設定
const TAG_INCLUDES_DETAIL = {
  ...TAG_INCLUDES,
  taskTags: {
    include: {
      task: {
        include: {
          project: true,
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
          }
        }
      }
    },
    take: 20 // 最新20件のタスクのみ取得
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

// タグ一覧取得
router.get('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    console.log('Fetching tags with include:', TAG_INCLUDES);

    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            taskTags: true  // tasks ではなく taskTags を使用
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // usageCountを計算して追加
    const tagsWithUsageCount = tags.map(tag => ({
      ...tag,
      usageCount: tag._count?.taskTags || 0
    }));

    console.log(`GET /api/v1/tags - Returning ${tagsWithUsageCount.length} tags`);

    res.status(HTTP_STATUS.OK).json({
      data: tagsWithUsageCount,
      success: true
    });
  } catch (error) {
    console.error('Get tags error details:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch tags' });
  }
});

// タグ単体取得
router.get('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: TAG_INCLUDES_DETAIL
    });
    
    if (!tag) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Tag not found' });
      return;
    }

    // usageCountを計算して追加
    const tagWithUsageCount = {
      ...tag,
      usageCount: tag._count?.taskTags || 0
    };

    res.status(HTTP_STATUS.OK).json({
      data: tagWithUsageCount,
      success: true
    });
  } catch (error) {
    console.error('Get tag by id error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch tag' });
  }
});

// タグ作成
router.post('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { name, color } = req.body;
    
    if (!name) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Name is required' });
      return;
    }

    const tagData = {
      name,
      color: color || generateTagColor()
    };

    const tag = await prisma.tag.create({
      data: tagData,
      include: TAG_INCLUDES
    });

    // usageCountを追加
    const tagWithUsageCount = {
      ...tag,
      usageCount: tag._count?.taskTags || 0
    };

    res.status(HTTP_STATUS.CREATED).json({
      data: tagWithUsageCount,
      success: true
    });
  } catch (error) {
    console.error('Create tag error:', error);
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2002') {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Tag with this name already exists' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create tag' });
  }
});

// 複数タグ作成または取得
router.post('/bulk', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { names } = req.body;
    
    if (!names || !Array.isArray(names) || names.length === 0) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Names array is required' });
      return;
    }

    const tags = await Promise.all(
      names.map(async (name: string) => {
        return await prisma.tag.upsert({
          where: { name },
          update: {},
          create: {
            name,
            color: generateTagColor()
          },
          include: TAG_INCLUDES
        });
      })
    );

    // usageCountを追加
    const tagsWithUsageCount = tags.map(tag => ({
      ...tag,
      usageCount: tag._count?.taskTags || 0
    }));

    res.status(HTTP_STATUS.OK).json({
      data: tagsWithUsageCount,
      success: true
    });
  } catch (error) {
    console.error('Bulk create tags error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create tags' });
  }
});

// タグ更新
router.put('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    const { name, color } = req.body;
    
    const updateData = {
      ...(name !== undefined && { name }),
      ...(color !== undefined && { color })
    };

    const tag = await prisma.tag.update({
      where: { id },
      data: updateData,
      include: TAG_INCLUDES
    });

    // usageCountを追加
    const tagWithUsageCount = {
      ...tag,
      usageCount: tag._count?.taskTags || 0
    };

    res.status(HTTP_STATUS.OK).json({
      data: tagWithUsageCount,
      success: true
    });
  } catch (error) {
    console.error('Update tag error:', error);
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Tag not found' });
        return;
      }
      if (prismaError.code === 'P2002') {
        res.status(HTTP_STATUS.CONFLICT).json({ error: 'Tag with this name already exists' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update tag' });
  }
});

// タグ削除
router.delete('/:id', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const { id } = req.params;
    
    // タグを削除（関連のTaskTagも自動的に削除される）
    await prisma.tag.delete({ where: { id } });
    
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (error) {
    console.error('Delete tag error:', error);
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      if (prismaError.code === 'P2025') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Tag not found' });
        return;
      }
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete tag' });
  }
});

// 人気タグ取得（使用頻度順）
router.get('/popular/:limit?', async (req: AuthRequest, res): Promise<void> => {
  try {
    // 認証チェック
    if (!checkAuthentication(req, res)) return;

    const limit = parseInt(req.params.limit) || 10;
    
    const tags = await prisma.tag.findMany({
      include: TAG_INCLUDES,
      orderBy: {
        taskTags: {
          _count: 'desc'
        }
      },
      take: limit
    });

    // usageCountを計算して追加
    const tagsWithUsageCount = tags.map(tag => ({
      ...tag,
      usageCount: tag._count?.taskTags || 0
    }));

    res.status(HTTP_STATUS.OK).json({
      data: tagsWithUsageCount,
      success: true
    });
  } catch (error) {
    console.error('Get popular tags error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch popular tags' });
  }
});

// Helper function to generate random tag color
function generateTagColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export { router as tagApiRoutes };