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
    }
    catch (error) {
        console.error('Get tasks error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch tasks' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
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
    }
    catch (error) {
        console.error('Get task by id error:', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to fetch task' });
    }
});
router.post('/', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { title, description, status, priority, projectId, dueDate, estimatedHours } = req.body;
        if (!title) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Title is required' });
            return;
        }
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
            assigneeId: req.userId,
            dueDate: dueDate ? new Date(dueDate) : null,
            estimatedHours: estimatedHours || null,
            createdBy: req.userId,
            updatedBy: req.userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const task = await prisma.task.create({
            data: taskData,
            include: TASK_INCLUDES
        });
        res.status(HTTP_STATUS.CREATED).json(task);
    }
    catch (error) {
        console.error('Create task error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
            if (prismaError.code === 'P2002') {
                res.status(HTTP_STATUS.CONFLICT).json({ error: 'Task with this title already exists for this project' });
                return;
            }
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to create task' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
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
        const updateData = {
            updatedBy: req.userId,
            updatedAt: new Date()
        };
        const allowedFields = [
            'title', 'description', 'status', 'priority',
            'projectId', 'assigneeId', 'dueDate', 'estimatedHours', 'actualHours'
        ];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                if (field === 'dueDate' && req.body[field]) {
                    updateData[field] = new Date(req.body[field]);
                }
                else {
                    updateData[field] = req.body[field];
                }
            }
        });
        const task = await prisma.task.update({
            where: { id },
            data: updateData,
            include: TASK_INCLUDES
        });
        res.status(HTTP_STATUS.OK).json(task);
    }
    catch (error) {
        console.error('Update task error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
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
router.delete('/:id', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
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
        await prisma.task.delete({ where: { id } });
        res.status(HTTP_STATUS.NO_CONTENT).send();
    }
    catch (error) {
        console.error('Delete task error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
            if (prismaError.code === 'P2025') {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
                return;
            }
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to delete task' });
    }
});
router.patch('/:id', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({ error: 'Status is required' });
            return;
        }
        const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];
        const normalizedStatus = status.toUpperCase().replace('-', '_');
        if (!validStatuses.includes(normalizedStatus)) {
            res.status(HTTP_STATUS.BAD_REQUEST).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
            return;
        }
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
                status: normalizedStatus,
                updatedBy: req.userId,
                updatedAt: new Date()
            },
            include: TASK_INCLUDES
        });
        console.log(`PATCH /api/v1/tasks/${id} - Updated status to: ${normalizedStatus}`);
        res.status(HTTP_STATUS.OK).json(task);
    }
    catch (error) {
        console.error('Update task status error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
            if (prismaError.code === 'P2025') {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
                return;
            }
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to update task status' });
    }
});
router.patch('/:id/archive', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
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
                updatedBy: req.userId,
                updatedAt: new Date()
            },
            include: TASK_INCLUDES
        });
        res.status(HTTP_STATUS.OK).json(task);
    }
    catch (error) {
        console.error('Archive task error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
            if (prismaError.code === 'P2025') {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
                return;
            }
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to archive task' });
    }
});
router.patch('/:id/unarchive', async (req, res) => {
    try {
        if (!checkAuthentication(req, res))
            return;
        const { id } = req.params;
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
                updatedBy: req.userId,
                updatedAt: new Date()
            },
            include: TASK_INCLUDES
        });
        res.status(HTTP_STATUS.OK).json(task);
    }
    catch (error) {
        console.error('Unarchive task error:', error);
        if (error instanceof Error && 'code' in error) {
            const prismaError = error;
            if (prismaError.code === 'P2025') {
                res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Task not found' });
                return;
            }
        }
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: 'Failed to unarchive task' });
    }
});
export { router as taskApiRoutes };
