/**
 * Tag Service Layer
 * タグ管理のビジネスロジック
 */

import { prisma } from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export class TagService {
  /**
   * タグ一覧取得
   */
  async findAll(includeUsageCount = true) {
    const tags = await prisma.tag.findMany({
      orderBy: [
        { usageCount: 'desc' },
        { name: 'asc' }
      ]
    });

    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: includeUsageCount ? tag.usageCount : undefined,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
    }));
  }

  /**
   * タグ詳細取得
   */
  async findById(id: string) {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        taskTags: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!tag) {
      throw new ApiError(404, 'TAG_NOT_FOUND', 'Tag not found');
    }

    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: tag.usageCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      relatedTasks: tag.taskTags.map(taskTag => taskTag.task)
    };
  }

  /**
   * タグ作成
   */
  async create(input: CreateTagInput) {
    // Check for duplicate name
    const existingTag = await prisma.tag.findUnique({
      where: { name: input.name }
    });

    if (existingTag) {
      throw new ApiError(409, 'TAG_ALREADY_EXISTS', 'A tag with this name already exists');
    }

    const tag = await prisma.tag.create({
      data: {
        name: input.name,
        color: input.color
      }
    });

    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: tag.usageCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
    };
  }

  /**
   * タグ更新
   */
  async update(id: string, input: UpdateTagInput) {
    const existingTag = await prisma.tag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      throw new ApiError(404, 'TAG_NOT_FOUND', 'Tag not found');
    }

    // Check for duplicate name if updating name
    if (input.name && input.name !== existingTag.name) {
      const duplicateTag = await prisma.tag.findUnique({
        where: { name: input.name }
      });

      if (duplicateTag) {
        throw new ApiError(409, 'TAG_ALREADY_EXISTS', 'A tag with this name already exists');
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: input
    });

    return {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: tag.usageCount,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
    };
  }

  /**
   * タグ削除
   */
  async delete(id: string) {
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: { taskTags: true }
    });

    if (!tag) {
      throw new ApiError(404, 'TAG_NOT_FOUND', 'Tag not found');
    }

    if (tag.taskTags.length > 0) {
      throw new ApiError(409, 'TAG_IN_USE', 'Cannot delete tag that is currently in use');
    }

    await prisma.tag.delete({
      where: { id }
    });
  }

  /**
   * 人気タグ取得
   */
  async getPopularTags(limit = 10) {
    const tags = await prisma.tag.findMany({
      where: {
        usageCount: { gt: 0 }
      },
      orderBy: { usageCount: 'desc' },
      take: limit
    });

    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: tag.usageCount
    }));
  }

  /**
   * タグ検索
   */
  async search(query: string, limit = 20) {
    const tags = await prisma.tag.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      orderBy: [
        { usageCount: 'desc' },
        { name: 'asc' }
      ],
      take: limit
    });

    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      usageCount: tag.usageCount
    }));
  }
}

export const tagService = new TagService();