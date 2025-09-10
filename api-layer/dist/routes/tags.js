import express from 'express';
import { PrismaClient } from '@prisma/client';
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
};
const TAG_INCLUDES = {
    _count: {
        select: {
            tasks: true
        }
    }
};
const TAG_INCLUDES_DETAIL = {
    ...TAG_INCLUDES,
    tasks: {
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
        take: 20
    }
};
const checkAuthentication = (req, res) => {
    if (!req.userId) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Authentication required' });
        return false;
    }
    return true;
};
const router = express.Router();
const prisma = new PrismaClient();
router.get('/', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const tags = await prisma.tag.findMany({
            include: TAG_INCLUDES,
            orderBy: { name: 'asc' }
        });
        res.status(HTTP_STATUS.OK).json(tags);
    }
    catch (error) {
        console.error('Get tags error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch tags' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
        const tag = await prisma.tag.findUnique({
            where: { id },
            include: TAG_INCLUDES_DETAIL
        });
        if (!tag) {
            res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Tag not found' });
            return;
        }
        res.status(HTTP_STATUS.OK).json(tag);
    }
    catch (error) {
        console.error('Get tag by id error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch tag' });
    }
});
router.post('/', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { name, color } = req.body;
        if (!name) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Name is required' });
            return;
        }
        const tagData = {
            name,
            color: color || generateTagColor(),
            createdBy: req.userId,
            updatedBy: req.userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const tag = await prisma.tag.create({
            data: tagData,
            include: TAG_INCLUDES
        });
        res.status(HTTP_STATUS.CREATED).json(tag);
    }
    catch (error) {
        console.error('Create tag error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
            if (prismaError.code === 'P2002') {
                res.status(HTTP_STATUS.CONFLICT).json({ error: 'Tag with this name already exists' });
                return;
            }
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create tag' });
    }
});
router.post('/bulk', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { names } = req.body;
        if (!names || !Array.isArray(names) || names.length === 0) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Names array is required' });
            return;
        }
        const tags = await Promise.all(names.map(async (name) => {
            return await prisma.tag.upsert({
                where: { name },
                update: {
                    updatedBy: req.userId,
                    updatedAt: new Date()
                },
                create: {
                    name,
                    color: generateTagColor(),
                    createdBy: req.userId,
                    updatedBy: req.userId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                include: TAG_INCLUDES
            });
        }));
        res.status(HTTP_STATUS.OK).json(tags);
    }
    catch (error) {
        console.error('Bulk create tags error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create tags' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
        const { name, color } = req.body;
        const updateData = {
            ...(name !== undefined && { name }),
            ...(color !== undefined && { color }),
            updatedBy: req.userId,
            updatedAt: new Date()
        };
        const tag = await prisma.tag.update({
            where: { id },
            data: updateData,
            include: TAG_INCLUDES
        });
        res.status(HTTP_STATUS.OK).json(tag);
    }
    catch (error) {
        console.error('Update tag error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
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
router.delete('/:id', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
        await prisma.tag.delete({ where: { id } });
        res.status(HTTP_STATUS.NO_CONTENT).send();
    }
    catch (error) {
        console.error('Delete tag error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
            if (prismaError.code === 'P2025') {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Tag not found' });
                return;
            }
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete tag' });
    }
});
router.get('/popular/:limit?', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const limit = parseInt(req.params.limit) || 10;
        const tags = await prisma.tag.findMany({
            include: TAG_INCLUDES,
            orderBy: {
                tasks: {
                    _count: 'desc'
                }
            },
            take: limit
        });
        res.status(HTTP_STATUS.OK).json(tags);
    }
    catch (error) {
        console.error('Get popular tags error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch popular tags' });
    }
});
function generateTagColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1'];
    return colors[Math.floor(Math.random() * colors.length)];
}
export { router as tagApiRoutes };
