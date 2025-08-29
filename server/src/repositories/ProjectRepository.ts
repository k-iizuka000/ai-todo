import { PrismaClient, Project, ProjectMember, ProjectTag, User, Tag, ProjectStatus, ProjectPriority, ProjectRole } from '@prisma/client';
import { BaseRepository } from './base/BaseRepository.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilterInput,
  AddProjectMemberInput,
  UpdateProjectMemberInput,
  ProjectStatsFilterInput
} from '../schemas/projectSchemas.js';

// プロジェクトの詳細情報を含むレスポンス型
export interface ProjectWithDetails extends Project {
  owner: {
    id: string;
    email: string;
    profile?: {
      displayName: string;
      firstName: string;
      lastName: string;
      avatar?: string | null;
    } | null;
  };
  members: {
    id: string;
    role: ProjectRole;
    joinedAt: Date;
    user: {
      id: string;
      email: string;
      profile?: {
        displayName: string;
        firstName: string;
        lastName: string;
        avatar?: string | null;
      } | null;
    };
  }[];
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
  _count: {
    tasks: number;
    members: number;
  };
}

// プロジェクト統計情報型
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completionRate: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  overdueTasks: number;
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    critical: number;
  };
  tasksByStatus: {
    todo: number;
    inProgress: number;
    done: number;
    archived: number;
  };
}

export interface ProjectWithStats extends ProjectWithDetails {
  stats: ProjectStats;
}

export class ProjectRepository extends BaseRepository<Project> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'project');
  }

  /**
   * プロジェクト一覧を取得（フィルタ・ページネーション対応）
   */
  async findManyWithDetails(
    filter: ProjectFilterInput = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 },
    sort: { field: string; order: 'asc' | 'desc' } = { field: 'updatedAt', order: 'desc' }
  ): Promise<{ projects: ProjectWithDetails[]; total: number }> {
    try {
      const skip = (pagination.page - 1) * pagination.limit;
      const take = pagination.limit;

      // WHERE条件の構築
      const where = this.buildWhereClause(filter);

      // ソート条件の構築
      const orderBy = this.buildOrderByClause(sort);

      // データ取得とカウント
      const [projects, total] = await this.prisma.$transaction([
        this.prisma.project.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: {
                      select: {
                        displayName: true,
                        firstName: true,
                        lastName: true,
                        avatar: true,
                      },
                    },
                  },
                },
              },
            },
            projectTags: {
              include: {
                tag: {
                  select: {
                    id: true,
                    name: true,
                    color: true,
                  },
                },
              },
            },
            _count: {
              select: {
                tasks: true,
                members: true,
              },
            },
          },
        }),
        this.prisma.project.count({ where }),
      ]);

      // レスポンス形式に変換
      const projectsWithDetails = projects.map((project) => ({
        ...project,
        tags: project.projectTags.map((pt) => pt.tag),
        members: project.members.map((member) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      })) as ProjectWithDetails[];

      return { projects: projectsWithDetails, total };
    } catch (error) {
      this.logger.error('Failed to fetch projects with details:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  /**
   * プロジェクト詳細を取得
   */
  async findByIdWithDetails(id: string): Promise<ProjectWithDetails | null> {
    try {
      const project = await this.prisma.project.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  displayName: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      displayName: true,
                      firstName: true,
                      lastName: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
          projectTags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
          _count: {
            select: {
              tasks: true,
              members: true,
            },
          },
        },
      });

      if (!project) return null;

      return {
        ...project,
        tags: project.projectTags.map((pt) => pt.tag),
        members: project.members.map((member) => ({
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt,
          user: member.user,
        })),
      } as ProjectWithDetails;
    } catch (error) {
      this.logger.error('Failed to fetch project details:', error);
      throw new Error('Failed to fetch project details');
    }
  }

  /**
   * プロジェクト統計情報を取得
   */
  async getProjectStats(projectId: string): Promise<ProjectStats | null> {
    try {
      const [project, tasks] = await this.prisma.$transaction([
        this.prisma.project.findUnique({
          where: { id: projectId },
        }),
        this.prisma.task.findMany({
          where: { projectId },
          select: {
            status: true,
            priority: true,
            estimatedHours: true,
            actualHours: true,
            dueDate: true,
          },
        }),
      ]);

      if (!project) return null;

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'DONE').length;
      const activeTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
      const todoTasks = tasks.filter(t => t.status === 'TODO').length;
      const inProgressTasks = activeTasks;
      
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
      
      const now = new Date();
      const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < now && t.status !== 'DONE').length;

      // 優先度別集計
      const tasksByPriority = {
        low: tasks.filter(t => t.priority === 'LOW').length,
        medium: tasks.filter(t => t.priority === 'MEDIUM').length,
        high: tasks.filter(t => t.priority === 'HIGH').length,
        urgent: tasks.filter(t => t.priority === 'URGENT').length,
        critical: tasks.filter(t => t.priority === 'CRITICAL').length,
      };

      // ステータス別集計
      const tasksByStatus = {
        todo: tasks.filter(t => t.status === 'TODO').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        done: tasks.filter(t => t.status === 'DONE').length,
        archived: tasks.filter(t => t.status === 'ARCHIVED').length,
      };

      return {
        totalTasks,
        completedTasks,
        activeTasks,
        todoTasks,
        inProgressTasks,
        completionRate,
        totalEstimatedHours,
        totalActualHours,
        overdueTasks,
        tasksByPriority,
        tasksByStatus,
      };
    } catch (error) {
      this.logger.error('Failed to get project stats:', error);
      throw new Error('Failed to get project stats');
    }
  }

  /**
   * 統計付きプロジェクト詳細を取得
   */
  async findByIdWithStats(id: string): Promise<ProjectWithStats | null> {
    try {
      const [project, stats] = await Promise.all([
        this.findByIdWithDetails(id),
        this.getProjectStats(id),
      ]);

      if (!project || !stats) return null;

      return {
        ...project,
        stats,
      };
    } catch (error) {
      this.logger.error('Failed to fetch project with stats:', error);
      throw new Error('Failed to fetch project with stats');
    }
  }

  /**
   * プロジェクト作成
   */
  async create(data: CreateProjectInput, createdBy: string): Promise<ProjectWithDetails> {
    try {
      const { tagIds = [], memberIds = [], ...projectData } = data;

      const project = await this.prisma.$transaction(async (tx) => {
        // プロジェクト作成
        const newProject = await tx.project.create({
          data: {
            ...projectData,
            ownerId: createdBy,
            createdBy,
            updatedBy: createdBy,
          },
        });

        // タグの関連付け
        if (tagIds.length > 0) {
          await tx.projectTag.createMany({
            data: tagIds.map((tagId) => ({
              projectId: newProject.id,
              tagId,
            })),
          });

          // タグの使用回数を更新
          await tx.tag.updateMany({
            where: { id: { in: tagIds } },
            data: { usageCount: { increment: 1 } },
          });
        }

        // メンバーの追加（オーナーを除く）
        if (memberIds.length > 0) {
          const validMemberIds = memberIds.filter(id => id !== createdBy);
          if (validMemberIds.length > 0) {
            await tx.projectMember.createMany({
              data: validMemberIds.map((userId) => ({
                projectId: newProject.id,
                userId,
                role: 'MEMBER',
              })),
            });
          }
        }

        return newProject;
      });

      // 作成されたプロジェクトの詳細を取得
      const createdProject = await this.findByIdWithDetails(project.id);
      if (!createdProject) {
        throw new Error('Failed to fetch created project details');
      }

      return createdProject;
    } catch (error) {
      this.logger.error('Failed to create project:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * プロジェクト更新
   */
  async update(id: string, data: UpdateProjectInput, updatedBy: string): Promise<ProjectWithDetails | null> {
    try {
      const { tagIds, memberIds, ...projectData } = data;

      const project = await this.prisma.$transaction(async (tx) => {
        // プロジェクトの存在確認
        const existingProject = await tx.project.findUnique({ where: { id } });
        if (!existingProject) return null;

        // プロジェクト更新
        const updatedProject = await tx.project.update({
          where: { id },
          data: {
            ...projectData,
            updatedBy,
          },
        });

        // タグの更新
        if (tagIds !== undefined) {
          // 既存のタグ関連付けを削除
          const existingTags = await tx.projectTag.findMany({
            where: { projectId: id },
            select: { tagId: true },
          });

          if (existingTags.length > 0) {
            await tx.projectTag.deleteMany({
              where: { projectId: id },
            });

            // 使用回数を減算
            await tx.tag.updateMany({
              where: { id: { in: existingTags.map(pt => pt.tagId) } },
              data: { usageCount: { decrement: 1 } },
            });
          }

          // 新しいタグ関連付けを作成
          if (tagIds.length > 0) {
            await tx.projectTag.createMany({
              data: tagIds.map((tagId) => ({
                projectId: id,
                tagId,
              })),
            });

            // 使用回数を増加
            await tx.tag.updateMany({
              where: { id: { in: tagIds } },
              data: { usageCount: { increment: 1 } },
            });
          }
        }

        // メンバーの更新
        if (memberIds !== undefined) {
          // 既存のメンバーを削除（オーナーは除外）
          await tx.projectMember.deleteMany({
            where: { projectId: id },
          });

          // 新しいメンバーを追加（オーナーを除く）
          if (memberIds.length > 0) {
            const validMemberIds = memberIds.filter(userId => userId !== existingProject.ownerId);
            if (validMemberIds.length > 0) {
              await tx.projectMember.createMany({
                data: validMemberIds.map((userId) => ({
                  projectId: id,
                  userId,
                  role: 'MEMBER',
                })),
              });
            }
          }
        }

        return updatedProject;
      });

      if (!project) return null;

      // 更新されたプロジェクトの詳細を取得
      return await this.findByIdWithDetails(id);
    } catch (error) {
      this.logger.error('Failed to update project:', error);
      throw new Error('Failed to update project');
    }
  }

  /**
   * プロジェクト削除
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 関連するタグの使用回数を減算
        const projectTags = await tx.projectTag.findMany({
          where: { projectId: id },
          select: { tagId: true },
        });

        if (projectTags.length > 0) {
          await tx.tag.updateMany({
            where: { id: { in: projectTags.map(pt => pt.tagId) } },
            data: { usageCount: { decrement: 1 } },
          });
        }

        // プロジェクト削除（Cascadeで関連データも削除される）
        await tx.project.delete({ where: { id } });
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to delete project:', error);
      throw new Error('Failed to delete project');
    }
  }

  /**
   * プロジェクトメンバー追加
   */
  async addMember(projectId: string, data: AddProjectMemberInput): Promise<boolean> {
    try {
      await this.prisma.projectMember.create({
        data: {
          projectId,
          userId: data.userId,
          role: data.role,
        },
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to add project member:', error);
      throw new Error('Failed to add project member');
    }
  }

  /**
   * プロジェクトメンバー更新
   */
  async updateMember(
    projectId: string,
    userId: string,
    data: UpdateProjectMemberInput
  ): Promise<boolean> {
    try {
      await this.prisma.projectMember.update({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
        data: {
          role: data.role,
        },
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to update project member:', error);
      throw new Error('Failed to update project member');
    }
  }

  /**
   * プロジェクトメンバー削除
   */
  async removeMember(projectId: string, userId: string): Promise<boolean> {
    try {
      await this.prisma.projectMember.delete({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to remove project member:', error);
      throw new Error('Failed to remove project member');
    }
  }

  /**
   * ユーザーのプロジェクト権限を取得
   */
  async getUserProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    try {
      // オーナーかどうかチェック
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
      });

      if (project && project.ownerId === userId) {
        return 'OWNER';
      }

      // メンバーかどうかチェック
      const member = await this.prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
        select: { role: true },
      });

      return member?.role || null;
    } catch (error) {
      this.logger.error('Failed to get user project role:', error);
      throw new Error('Failed to get user project role');
    }
  }

  /**
   * WHERE条件の構築
   */
  private buildWhereClause(filter: ProjectFilterInput): any {
    const where: any = {};

    if (filter.status && filter.status.length > 0) {
      where.status = { in: filter.status };
    }

    if (filter.priority && filter.priority.length > 0) {
      where.priority = { in: filter.priority };
    }

    if (filter.ownerId) {
      where.ownerId = filter.ownerId;
    }

    if (filter.memberIds && filter.memberIds.length > 0) {
      where.members = {
        some: {
          userId: { in: filter.memberIds },
        },
      };
    }

    if (filter.tags && filter.tags.length > 0) {
      where.projectTags = {
        some: {
          tagId: { in: filter.tags },
        },
      };
    }

    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    }

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.dateRange) {
      const dateField = filter.dateRange.field;
      const dateFilter: any = {};

      if (filter.dateRange.from) {
        dateFilter.gte = filter.dateRange.from;
      }

      if (filter.dateRange.to) {
        dateFilter.lte = filter.dateRange.to;
      }

      if (Object.keys(dateFilter).length > 0) {
        where[dateField] = dateFilter;
      }
    }

    return where;
  }

  /**
   * ソート条件の構築
   */
  private buildOrderByClause(sort: { field: string; order: 'asc' | 'desc' }): any {
    const orderBy: any = {};
    orderBy[sort.field] = sort.order;
    return orderBy;
  }
}