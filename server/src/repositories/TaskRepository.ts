import { BaseRepository } from './base/BaseRepository.js';
import { 
  TaskEntity, 
  CreateTaskDto, 
  UpdateTaskDto 
} from '@/types/entities.js';
import { 
  TaskFilter, 
  PaginationParams, 
  SortOptions 
} from '@/types/api.js';
import { TaskStatus } from '@prisma/client';

export class TaskRepository extends BaseRepository<TaskEntity, CreateTaskDto, UpdateTaskDto> {
  
  async findAll(params?: {
    filter?: TaskFilter;
    pagination?: PaginationParams;
    sort?: SortOptions;
    includeRelations?: boolean;
  }): Promise<TaskEntity[]> {
    const { filter, pagination, sort, includeRelations = true } = params || {};
    const { offset, limit } = this.getPaginationParams(pagination);
    
    const where = this.buildTaskWhereClause(filter);
    const orderBy = this.generateOrderBy(sort);
    
    const include = includeRelations ? {
      project: {
        select: { id: true, name: true, color: true }
      },
      assignee: {
        select: { id: true, profile: { select: { displayName: true } } }
      },
      creator: {
        select: { id: true, profile: { select: { displayName: true } } }
      },
      tags: {
        include: { tag: true }
      },
      subtasks: {
        select: { id: true, title: true, completed: true }
      },
      parent: {
        select: { id: true, title: true }
      },
      children: {
        select: { id: true, title: true, status: true }
      }
    } : {};

    return this.prisma.task.findMany({
      where,
      include,
      orderBy,
      skip: offset,
      take: limit,
    }) as Promise<TaskEntity[]>;
  }

  async findById(id: string, includeRelations: boolean = true): Promise<TaskEntity | null> {
    const include = includeRelations ? {
      project: true,
      assignee: {
        include: { profile: true }
      },
      creator: {
        include: { profile: true }
      },
      tags: {
        include: { tag: true }
      },
      subtasks: true,
      parent: {
        select: { id: true, title: true }
      },
      children: {
        select: { id: true, title: true, status: true }
      },
      comments: {
        include: {
          user: {
            include: { profile: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      attachments: true,
      history: {
        include: {
          user: {
            include: { profile: true }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 10
      }
    } : {};

    return this.prisma.task.findUnique({
      where: { id },
      include,
    }) as Promise<TaskEntity | null>;
  }

  async create(data: CreateTaskDto, userId: string): Promise<TaskEntity> {
    return this.executeTransaction(async (tx) => {
      // Create task
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          status: data.status || 'TODO',
          priority: data.priority || 'MEDIUM',
          projectId: data.projectId,
          assigneeId: data.assigneeId,
          parentId: data.parentId,
          dueDate: data.dueDate,
          estimatedHours: data.estimatedHours,
          createdBy: userId,
          updatedBy: userId,
        },
        include: {
          project: true,
          assignee: { include: { profile: true } },
          creator: { include: { profile: true } },
        }
      });

      // Handle tags
      if (data.tagIds && data.tagIds.length > 0) {
        await tx.taskTag.createMany({
          data: data.tagIds.map(tagId => ({
            taskId: task.id,
            tagId,
          })),
        });

        // Update tag usage counts
        await tx.tag.updateMany({
          where: { id: { in: data.tagIds } },
          data: { usageCount: { increment: 1 } }
        });
      }

      // Create task history entry
      await tx.taskHistory.create({
        data: {
          taskId: task.id,
          userId,
          action: 'CREATED',
          changes: {
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
        },
      });

      return task as TaskEntity;
    });
  }

  async update(id: string, data: UpdateTaskDto, userId: string): Promise<TaskEntity> {
    return this.executeTransaction(async (tx) => {
      // Get current task for history tracking
      const currentTask = await tx.task.findUnique({
        where: { id },
        include: { tags: true }
      });

      if (!currentTask) {
        throw new Error('Task not found');
      }

      // Update task
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
          updatedAt: new Date(),
        },
        include: {
          project: true,
          assignee: { include: { profile: true } },
          creator: { include: { profile: true } },
          tags: { include: { tag: true } },
        },
      });

      // Handle tag updates
      if (data.tagIds !== undefined) {
        // Remove existing tags
        await tx.taskTag.deleteMany({
          where: { taskId: id },
        });

        // Decrement usage count for removed tags
        const currentTagIds = currentTask.tags.map(tt => tt.tagId);
        if (currentTagIds.length > 0) {
          await tx.tag.updateMany({
            where: { id: { in: currentTagIds } },
            data: { usageCount: { decrement: 1 } }
          });
        }

        // Add new tags
        if (data.tagIds.length > 0) {
          await tx.taskTag.createMany({
            data: data.tagIds.map(tagId => ({
              taskId: id,
              tagId,
            })),
          });

          // Increment usage count for new tags
          await tx.tag.updateMany({
            where: { id: { in: data.tagIds } },
            data: { usageCount: { increment: 1 } }
          });
        }
      }

      // Track changes in history
      const changes: any = {};
      if (data.title && data.title !== currentTask.title) changes.title = { from: currentTask.title, to: data.title };
      if (data.status && data.status !== currentTask.status) changes.status = { from: currentTask.status, to: data.status };
      if (data.priority && data.priority !== currentTask.priority) changes.priority = { from: currentTask.priority, to: data.priority };
      if (data.assigneeId !== undefined && data.assigneeId !== currentTask.assigneeId) {
        changes.assigneeId = { from: currentTask.assigneeId, to: data.assigneeId };
      }

      if (Object.keys(changes).length > 0) {
        await tx.taskHistory.create({
          data: {
            taskId: id,
            userId,
            action: 'UPDATED',
            changes,
          },
        });
      }

      return updatedTask as TaskEntity;
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.executeTransaction(async (tx) => {
      // Validate access
      const task = await tx.task.findUnique({
        where: { id },
        select: { createdBy: true, tags: true }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      // Soft delete by setting archivedAt
      await tx.task.update({
        where: { id },
        data: {
          archivedAt: new Date(),
          updatedBy: userId,
        },
      });

      // Decrement tag usage counts
      if (task.tags && task.tags.length > 0) {
        const tagIds = task.tags.map((tt: any) => tt.tagId);
        await tx.tag.updateMany({
          where: { id: { in: tagIds } },
          data: { usageCount: { decrement: 1 } }
        });
      }

      // Create history entry
      await tx.taskHistory.create({
        data: {
          taskId: id,
          userId,
          action: 'STATUS_CHANGED',
          changes: { status: { from: 'active', to: 'archived' } },
        },
      });
    });
  }

  async countByFilter(filter?: TaskFilter): Promise<number> {
    const where = this.buildTaskWhereClause(filter);
    return this.prisma.task.count({ where });
  }

  async findByProjectId(projectId: string, params?: {
    filter?: Omit<TaskFilter, 'projectId'>;
    pagination?: PaginationParams;
    sort?: SortOptions;
  }): Promise<TaskEntity[]> {
    return this.findAll({
      ...params,
      filter: { ...params?.filter, projectId },
    });
  }

  async findByAssigneeId(assigneeId: string, params?: {
    filter?: Omit<TaskFilter, 'assigneeId'>;
    pagination?: PaginationParams;
    sort?: SortOptions;
  }): Promise<TaskEntity[]> {
    return this.findAll({
      ...params,
      filter: { ...params?.filter, assigneeId },
    });
  }

  async updateStatus(id: string, status: TaskStatus, userId: string): Promise<TaskEntity> {
    return this.update(id, { status }, userId);
  }

  private buildTaskWhereClause(filter?: TaskFilter): any {
    const where: any = {
      archivedAt: null, // Only non-archived tasks
    };

    if (!filter) return where;

    if (filter.status && filter.status.length > 0) {
      where.status = { in: filter.status };
    }

    if (filter.priority && filter.priority.length > 0) {
      where.priority = { in: filter.priority };
    }

    if (filter.projectId) {
      where.projectId = filter.projectId;
    }

    if (filter.assigneeId) {
      where.assigneeId = filter.assigneeId;
    }

    if (filter.dueDate) {
      where.dueDate = {};
      if (filter.dueDate.from) where.dueDate.gte = filter.dueDate.from;
      if (filter.dueDate.to) where.dueDate.lte = filter.dueDate.to;
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            id: { in: filter.tags }
          }
        }
      };
    }

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}