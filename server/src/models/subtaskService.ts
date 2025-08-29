/**
 * Subtask Service Layer
 * サブタスクのビジネスロジック
 */

import { prisma } from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';

export interface CreateSubtaskInput {
  taskId: string;
  title: string;
}

export interface UpdateSubtaskInput {
  title?: string;
  completed?: boolean;
}

export class SubtaskService {
  /**
   * サブタスク作成
   */
  async create(input: CreateSubtaskInput) {
    // Check if parent task exists
    const parentTask = await prisma.task.findUnique({
      where: { id: input.taskId }
    });

    if (!parentTask) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Parent task not found');
    }

    const subtask = await prisma.subtask.create({
      data: {
        taskId: input.taskId,
        title: input.title
      }
    });

    return this.transformSubtask(subtask);
  }

  /**
   * サブタスク更新
   */
  async update(id: string, input: UpdateSubtaskInput) {
    const existingSubtask = await prisma.subtask.findUnique({
      where: { id }
    });

    if (!existingSubtask) {
      throw new ApiError(404, 'SUBTASK_NOT_FOUND', 'Subtask not found');
    }

    const subtask = await prisma.subtask.update({
      where: { id },
      data: input
    });

    return this.transformSubtask(subtask);
  }

  /**
   * サブタスク削除
   */
  async delete(id: string) {
    const subtask = await prisma.subtask.findUnique({
      where: { id }
    });

    if (!subtask) {
      throw new ApiError(404, 'SUBTASK_NOT_FOUND', 'Subtask not found');
    }

    await prisma.subtask.delete({
      where: { id }
    });
  }

  /**
   * タスクのサブタスク一覧取得
   */
  async findByTaskId(taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!task) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    return task.subtasks.map(this.transformSubtask);
  }

  /**
   * Transform database subtask to frontend format
   */
  private transformSubtask(subtask: any) {
    return {
      id: subtask.id,
      title: subtask.title,
      completed: subtask.completed,
      createdAt: subtask.createdAt,
      updatedAt: subtask.updatedAt
    };
  }
}

export const subtaskService = new SubtaskService();