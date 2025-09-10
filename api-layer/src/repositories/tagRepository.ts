/**
 * Tag Repository - Prisma Implementation
 * Handles all database operations for tags
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export const tagRepository = {
  /**
   * Get all tags with task count
   */
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

  /**
   * Get tag by ID
   */
  async findById(id: string) {
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

  /**
   * Get tag by name
   */
  async findByName(name: string) {
    return await prisma.tag.findUnique({
      where: { name },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });
  },

  /**
   * Create new tag
   */
  async create(data: CreateTagInput) {
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

  /**
   * Update tag
   */
  async update(id: string, data: UpdateTagInput) {
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

  /**
   * Delete tag
   */
  async delete(id: string) {
    return await prisma.tag.delete({
      where: { id },
    });
  },

  /**
   * Get or create tags by names
   */
  async findOrCreateMany(names: string[]) {
    const tags = await Promise.all(
      names.map(async (name) => {
        return await prisma.tag.upsert({
          where: { name },
          update: {},
          create: {
            name,
            color: generateTagColor(),
          },
        });
      })
    );
    return tags;
  },

  /**
   * Get popular tags (most used)
   */
  async getPopular(limit: number = 10) {
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

// Helper function to generate random tag color
function generateTagColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1'];
  return colors[Math.floor(Math.random() * colors.length)];
}