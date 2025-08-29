/**
 * Task Service Layer
 * ビジネスロジックとデータアクセス層
 */

import { prisma } from '../config/database.js';
import { ApiError, BusinessError } from '../middleware/errorHandler.js';
import { Prisma } from '@prisma/client';

// Input Types (Frontend型との互換性)
export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  projectId?: string;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  tagIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  projectId?: string;
  assigneeId?: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tagIds?: string[];
}

export interface TaskFilter {
  status?: string[];
  priority?: string[];
  projectId?: string;
  assigneeId?: string;
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
  includeArchived?: boolean;
}

export class TaskService {
  /**
   * タスク一覧取得
   */
  async findAll(filter: TaskFilter = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.TaskWhereInput = {};

    if (!filter.includeArchived) {
      where.status = { not: 'ARCHIVED' };
    }

    if (filter.status && filter.status.length > 0) {
      where.status = { in: filter.status as any[] };
    }

    if (filter.priority && filter.priority.length > 0) {
      where.priority = { in: filter.priority as any[] };
    }

    if (filter.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter.assigneeId) {
      where.assigneeId = filter.assigneeId;
    }

    if (filter.dueDateFrom || filter.dueDateTo) {
      where.dueDate = {};
      if (filter.dueDateFrom) {
        where.dueDate.gte = filter.dueDateFrom;
      }
      if (filter.dueDateTo) {
        where.dueDate.lte = filter.dueDateTo;
      }
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = {
        some: {
          tagId: { in: filter.tags }
        }
      };
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } }
      ];
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          tags: {
            include: {
              tag: true
            }
          },
          subtasks: {
            orderBy: { createdAt: 'asc' }
          },
          assignee: {
            select: {
              id: true,
              profile: {
                select: {
                  displayName: true,
                  avatar: true
                }
              }
            }
          },
          project: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.task.count({ where })
    ]);

    return {
      tasks: tasks.map(this.transformTask),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * タスク詳細取得
   */
  async findById(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
          }
        },
        subtasks: {
          orderBy: { createdAt: 'asc' }
        },
        assignee: {
          select: {
            id: true,
            profile: {
              select: {
                displayName: true,
                avatar: true
              }
            }
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    if (!task) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return this.transformTask(task);
  }

  /**
   * タスク作成
   */
  async create(input: CreateTaskInput, createdBy: string) {
    try {
      const task = await prisma.$transaction(async (tx) => {
        // Create task
        const newTask = await tx.task.create({
          data: {
            title: input.title,
            description: input.description,
            priority: input.priority || 'MEDIUM',
            projectId: input.projectId,
            assigneeId: input.assigneeId,
            dueDate: input.dueDate,
            estimatedHours: input.estimatedHours,
            createdBy,
            updatedBy: createdBy,
          },
          include: {
            tags: {
              include: {
                tag: true
              }
            },
            subtasks: true
          }
        });

        // Add tags if provided
        if (input.tagIds && input.tagIds.length > 0) {
          await tx.taskTag.createMany({
            data: input.tagIds.map(tagId => ({
              taskId: newTask.id,
              tagId
            }))
          });

          // Update tag usage counts
          await tx.tag.updateMany({
            where: {
              id: { in: input.tagIds }
            },
            data: {
              usageCount: { increment: 1 }
            }
          });
        }

        // Fetch complete task with relations
        return tx.task.findUnique({
          where: { id: newTask.id },
          include: {
            tags: {
              include: {
                tag: true
              }
            },
            subtasks: {
              orderBy: { createdAt: 'asc' }
            },
            assignee: {
              select: {
                id: true,
                profile: {
                  select: {
                    displayName: true,
                    avatar: true
                  }
                }
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        });
      });

      return this.transformTask(task!);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BusinessError('INVALID_REFERENCE', 'Project or assignee does not exist');
        }
      }
      throw error;
    }
  }

  /**
   * タスク更新
   */
  async update(id: string, input: UpdateTaskInput, updatedBy: string) {
    try {
      const task = await prisma.$transaction(async (tx) => {
        // Check if task exists
        const existingTask = await tx.task.findUnique({
          where: { id },
          include: { tags: true }
        });

        if (!existingTask) {
          throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
        }

        // Update task
        const updatedTask = await tx.task.update({
          where: { id },
          data: {
            title: input.title,
            description: input.description,
            status: input.status,
            priority: input.priority,
            projectId: input.projectId,
            assigneeId: input.assigneeId,
            dueDate: input.dueDate,
            estimatedHours: input.estimatedHours,
            actualHours: input.actualHours,
            archivedAt: input.status === 'ARCHIVED' ? new Date() : null,
            updatedBy,
          }
        });

        // Handle tag updates
        if (input.tagIds !== undefined) {
          const currentTagIds = existingTask.tags.map(t => t.tagId);
          const newTagIds = input.tagIds;

          // Remove old tags
          const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id));
          if (tagsToRemove.length > 0) {
            await tx.taskTag.deleteMany({
              where: {
                taskId: id,
                tagId: { in: tagsToRemove }
              }
            });

            // Decrease usage count
            await tx.tag.updateMany({
              where: { id: { in: tagsToRemove } },
              data: { usageCount: { decrement: 1 } }
            });
          }

          // Add new tags
          const tagsToAdd = newTagIds.filter(id => !currentTagIds.includes(id));
          if (tagsToAdd.length > 0) {
            await tx.taskTag.createMany({
              data: tagsToAdd.map(tagId => ({
                taskId: id,
                tagId
              }))
            });

            // Increase usage count
            await tx.tag.updateMany({
              where: { id: { in: tagsToAdd } },
              data: { usageCount: { increment: 1 } }
            });
          }
        }

        // Fetch updated task with relations
        return tx.task.findUnique({
          where: { id },
          include: {
            tags: {
              include: {
                tag: true
              }
            },
            subtasks: {
              orderBy: { createdAt: 'asc' }
            },
            assignee: {
              select: {
                id: true,
                profile: {
                  select: {
                    displayName: true,
                    avatar: true
                  }
                }
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        });
      });

      return this.transformTask(task!);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BusinessError('INVALID_REFERENCE', 'Project or assignee does not exist');
        }
      }
      throw error;
    }
  }

  /**
   * タスク削除
   */
  async delete(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { tags: true }
    });

    if (!task) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    await prisma.$transaction(async (tx) => {
      // Decrease tag usage counts
      if (task.tags.length > 0) {
        await tx.tag.updateMany({
          where: {
            id: { in: task.tags.map(t => t.tagId) }
          },
          data: {
            usageCount: { decrement: 1 }
          }
        });
      }

      // Delete task (cascade will handle relations)
      await tx.task.delete({
        where: { id }
      });
    });
  }

  /**
   * Transform database task to frontend format
   */
  private transformTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status.toLowerCase(), // DB: ENUM, Frontend: lowercase
      priority: task.priority.toLowerCase(), // DB: ENUM, Frontend: lowercase
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      tags: task.tags?.map((taskTag: any) => ({
        id: taskTag.tag.id,
        name: taskTag.tag.name,
        color: taskTag.tag.color
      })) || [],
      subtasks: task.subtasks?.map((subtask: any) => ({
        id: subtask.id,
        title: subtask.title,
        completed: subtask.completed,
        createdAt: subtask.createdAt,
        updatedAt: subtask.updatedAt
      })) || [],
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      createdBy: task.createdBy,
      updatedBy: task.updatedBy,
      archivedAt: task.archivedAt,
      // Additional info for UI
      assignee: task.assignee ? {
        id: task.assignee.id,
        name: task.assignee.profile?.displayName || 'Unknown',
        avatar: task.assignee.profile?.avatar
      } : null,
      project: task.project ? {
        id: task.project.id,
        name: task.project.name,
        color: task.project.color
      } : null
    };
  }
}

export const taskService = new TaskService();