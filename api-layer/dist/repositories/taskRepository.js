import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const taskRepository = {
    async findAll() {
        return await prisma.task.findMany({
            include: {
                project: true,
                assignee: true,
                tags: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    },
    async findById(id) {
        return await prisma.task.findUnique({
            where: { id },
            include: {
                project: true,
                assignee: true,
                tags: true,
            },
        });
    },
    async create(data) {
        const { tags, ...taskData } = data;
        return await prisma.task.create({
            data: {
                ...taskData,
                status: taskData.status || 'TODO',
                priority: taskData.priority || 'MEDIUM',
                tags: tags ? {
                    connectOrCreate: tags.map((tagName) => ({
                        where: { name: tagName },
                        create: { name: tagName, color: generateTagColor() },
                    })),
                } : undefined,
            },
            include: {
                project: true,
                assignee: true,
                tags: true,
            },
        });
    },
    async update(id, data) {
        const { tags, ...taskData } = data;
        return await prisma.task.update({
            where: { id },
            data: {
                ...taskData,
                tags: tags ? {
                    set: [],
                    connectOrCreate: tags.map((tagName) => ({
                        where: { name: tagName },
                        create: { name: tagName, color: generateTagColor() },
                    })),
                } : undefined,
            },
            include: {
                project: true,
                assignee: true,
                tags: true,
            },
        });
    },
    async updateStatus(id, status) {
        return await prisma.task.update({
            where: { id },
            data: { status },
            include: {
                project: true,
                assignee: true,
                tags: true,
            },
        });
    },
    async delete(id) {
        return await prisma.task.delete({
            where: { id },
        });
    },
    async findByProject(projectId) {
        return await prisma.task.findMany({
            where: { projectId },
            include: {
                project: true,
                assignee: true,
                tags: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    },
    async findByAssignee(assigneeId) {
        return await prisma.task.findMany({
            where: { assigneeId },
            include: {
                project: true,
                assignee: true,
                tags: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    },
};
function generateTagColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1'];
    return colors[Math.floor(Math.random() * colors.length)];
}
