/**
 * Project Repository - Prisma Implementation
 * Handles all database operations for projects
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateProjectInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
}

export const projectRepository = {
  /**
   * Get all projects with task count
   */
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

  /**
   * Get project by ID
   */
  async findById(id: string) {
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

  /**
   * Create new project
   */
  async create(data: CreateProjectInput) {
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

  /**
   * Update project
   */
  async update(id: string, data: UpdateProjectInput) {
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

  /**
   * Delete project
   */
  async delete(id: string) {
    // First, unlink all tasks from this project
    await prisma.task.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    });

    return await prisma.project.delete({
      where: { id },
    });
  },

  /**
   * Get project statistics
   */
  async getStats(id: string) {
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

// Helper function to generate random project color
function generateProjectColor(): string {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
  return colors[Math.floor(Math.random() * colors.length)];
}