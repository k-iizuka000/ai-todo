import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const projectRepository = {
    async findAll() {
        return await prisma.project.findMany({
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    },
    async findById(id) {
        return await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: {
                    include: {
                        assignee: true,
                        tags: true,
                    },
                },
                _count: {
                    select: { tasks: true },
                },
            },
        });
    },
    async create(data) {
        return await prisma.project.create({
            data: {
                ...data,
                color: data.color || generateProjectColor(),
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });
    },
    async update(id, data) {
        return await prisma.project.update({
            where: { id },
            data,
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });
    },
    async delete(id) {
        await prisma.task.updateMany({
            where: { projectId: id },
            data: { projectId: null },
        });
        return await prisma.project.delete({
            where: { id },
        });
    },
    async getStats(id) {
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                tasks: true,
            },
        });
        if (!project) {
            return null;
        }
        const stats = {
            total: project.tasks.length,
            todo: project.tasks.filter(t => t.status === 'TODO').length,
            inProgress: project.tasks.filter(t => t.status === 'IN_PROGRESS').length,
            done: project.tasks.filter(t => t.status === 'DONE').length,
            archived: project.tasks.filter(t => t.status === 'ARCHIVED').length,
        };
        return { project, stats };
    },
};
function generateProjectColor() {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    return colors[Math.floor(Math.random() * colors.length)];
}
