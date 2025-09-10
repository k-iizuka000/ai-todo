import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const tagRepository = {
    async findAll() {
        return await prisma.tag.findMany({
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    },
    async findById(id) {
        return await prisma.tag.findUnique({
            where: { id },
            include: {
                tasks: {
                    include: {
                        project: true,
                        assignee: true,
                    },
                },
                _count: {
                    select: { tasks: true },
                },
            },
        });
    },
    async findByName(name) {
        return await prisma.tag.findUnique({
            where: { name },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });
    },
    async create(data) {
        return await prisma.tag.create({
            data: {
                ...data,
                color: data.color || generateTagColor(),
            },
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
        });
    },
    async update(id, data) {
        return await prisma.tag.update({
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
        return await prisma.tag.delete({
            where: { id },
        });
    },
    async findOrCreateMany(names) {
        const tags = await Promise.all(names.map(async (name) => {
            return await prisma.tag.upsert({
                where: { name },
                update: {},
                create: {
                    name,
                    color: generateTagColor(),
                },
            });
        }));
        return tags;
    },
    async getPopular(limit = 10) {
        return await prisma.tag.findMany({
            include: {
                _count: {
                    select: { tasks: true },
                },
            },
            orderBy: {
                tasks: {
                    _count: 'desc',
                },
            },
            take: limit,
        });
    },
};
function generateTagColor() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1'];
    return colors[Math.floor(Math.random() * colors.length)];
}
