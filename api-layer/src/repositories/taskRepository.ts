/**
 * Task Repository - Prisma Implementation
 * Handles all database operations for tasks
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  estimatedHours?: number;
  projectId?: string;
  assigneeId?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: Date;
  estimatedHours?: number;
  projectId?: string;
  assigneeId?: string;
  tags?: string[];
}

export const taskRepository = {
  /**
   * Get all tasks with relations
   */
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

  /**
   * Get task by ID
   */
  async findById(id: string) {
    return await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true,
        tags: true,
      },
    });
  },

  /**
   * Create new task
   */
  async create(data: CreateTaskInput) {
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

  /**
   * Update task
   */
  async update(id: string, data: UpdateTaskInput) {
    const { tags, ...taskData } = data;
    
    return await prisma.task.update({
      where: { id },
      data: {
        ...taskData,
        tags: tags ? {
          set: [], // Clear existing tags
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

  /**
   * Update task status only (for drag & drop)
   */
  async updateStatus(id: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED') {
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

  /**
   * Delete task
   */
  async delete(id: string) {
    return await prisma.task.delete({
      where: { id },
    });
  },

  /**
   * Get tasks by project
   */
  async findByProject(projectId: string) {
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

  /**
   * Get tasks by assignee
   */
  async findByAssignee(assigneeId: string) {
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

// Helper function to generate random tag color
function generateTagColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#FFB6C1'];
  return colors[Math.floor(Math.random() * colors.length)];
}