import { ProjectRepository, ProjectWithDetails, ProjectWithStats, ProjectStats } from '../repositories/ProjectRepository.js';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilterInput,
  AddProjectMemberInput,
  UpdateProjectMemberInput,
  BulkUpdateProjectsInput
} from '../schemas/projectSchemas.js';
import { PrismaClient, ProjectRole, ProjectStatus, ProjectPriority } from '@prisma/client';
import { logger } from '../config/logger.js';

export class ProjectService {
  private projectRepository: ProjectRepository;

  constructor(prisma: PrismaClient) {
    this.projectRepository = new ProjectRepository(prisma);
  }

  /**
   * プロジェクト一覧を取得
   */
  async getProjects(
    filter: ProjectFilterInput = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 },
    sort: { field: string; order: 'asc' | 'desc' } = { field: 'updatedAt', order: 'desc' },
    userId?: string
  ): Promise<{ projects: ProjectWithDetails[]; total: number; pagination: any }> {
    try {
      // ユーザーがアクセス可能なプロジェクトのみ取得するためのフィルタを追加
      let accessFilter = filter;
      if (userId) {
        accessFilter = {
          ...filter,
          // オーナーまたはメンバーのプロジェクトのみ
        };
      }

      const result = await this.projectRepository.findManyWithDetails(accessFilter, pagination, sort);

      return {
        ...result,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.total,
          pages: Math.ceil(result.total / pagination.limit),
        },
      };
    } catch (error) {
      logger.error('Failed to get projects:', error);
      throw new Error('Failed to get projects');
    }
  }

  /**
   * プロジェクト詳細を取得
   */
  async getProjectById(id: string, userId?: string): Promise<ProjectWithDetails | null> {
    try {
      const project = await this.projectRepository.findByIdWithDetails(id);

      if (!project) {
        return null;
      }

      // アクセス権限チェック
      if (userId && !await this.hasProjectAccess(id, userId)) {
        throw new Error('Access denied to this project');
      }

      return project;
    } catch (error) {
      logger.error('Failed to get project by id:', error);
      throw new Error('Failed to get project');
    }
  }

  /**
   * 統計付きプロジェクト詳細を取得
   */
  async getProjectWithStats(id: string, userId?: string): Promise<ProjectWithStats | null> {
    try {
      const project = await this.projectRepository.findByIdWithStats(id);

      if (!project) {
        return null;
      }

      // アクセス権限チェック
      if (userId && !await this.hasProjectAccess(id, userId)) {
        throw new Error('Access denied to this project');
      }

      return project;
    } catch (error) {
      logger.error('Failed to get project with stats:', error);
      throw new Error('Failed to get project with stats');
    }
  }

  /**
   * プロジェクト統計情報を取得
   */
  async getProjectStats(id: string, userId?: string): Promise<ProjectStats | null> {
    try {
      // アクセス権限チェック
      if (userId && !await this.hasProjectAccess(id, userId)) {
        throw new Error('Access denied to this project');
      }

      return await this.projectRepository.getProjectStats(id);
    } catch (error) {
      logger.error('Failed to get project stats:', error);
      throw new Error('Failed to get project stats');
    }
  }

  /**
   * プロジェクトを作成
   */
  async createProject(data: CreateProjectInput, createdBy: string): Promise<ProjectWithDetails> {
    try {
      // ビジネスロジック検証
      await this.validateProjectData(data);

      const project = await this.projectRepository.create(data, createdBy);

      logger.info(`Project created: ${project.id} by user ${createdBy}`);
      return project;
    } catch (error) {
      logger.error('Failed to create project:', error);
      throw new Error('Failed to create project');
    }
  }

  /**
   * プロジェクトを更新
   */
  async updateProject(
    id: string,
    data: UpdateProjectInput,
    updatedBy: string
  ): Promise<ProjectWithDetails | null> {
    try {
      // アクセス権限チェック
      const role = await this.getUserProjectRole(id, updatedBy);
      if (!role || !this.canUpdateProject(role)) {
        throw new Error('Insufficient permissions to update project');
      }

      // ビジネスロジック検証
      await this.validateUpdateData(data);

      const project = await this.projectRepository.update(id, data, updatedBy);

      if (project) {
        logger.info(`Project updated: ${id} by user ${updatedBy}`);
      }

      return project;
    } catch (error) {
      logger.error('Failed to update project:', error);
      throw new Error('Failed to update project');
    }
  }

  /**
   * プロジェクトを削除
   */
  async deleteProject(id: string, userId: string): Promise<boolean> {
    try {
      // アクセス権限チェック（オーナーのみ削除可能）
      const role = await this.getUserProjectRole(id, userId);
      if (!role || !this.canDeleteProject(role)) {
        throw new Error('Insufficient permissions to delete project');
      }

      const success = await this.projectRepository.delete(id);

      if (success) {
        logger.info(`Project deleted: ${id} by user ${userId}`);
      }

      return success;
    } catch (error) {
      logger.error('Failed to delete project:', error);
      throw new Error('Failed to delete project');
    }
  }

  /**
   * プロジェクトを一括更新
   */
  async bulkUpdateProjects(data: BulkUpdateProjectsInput, userId: string): Promise<boolean> {
    try {
      // 各プロジェクトに対する権限チェック
      for (const projectId of data.projectIds) {
        const role = await this.getUserProjectRole(projectId, userId);
        if (!role || !this.canUpdateProject(role)) {
          throw new Error(`Insufficient permissions to update project ${projectId}`);
        }
      }

      // 各プロジェクトを個別に更新（トランザクション内で）
      for (const projectId of data.projectIds) {
        await this.projectRepository.update(projectId, data.updates, userId);
      }

      logger.info(`Bulk updated ${data.projectIds.length} projects by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to bulk update projects:', error);
      throw new Error('Failed to bulk update projects');
    }
  }

  /**
   * プロジェクトメンバーを追加
   */
  async addProjectMember(
    projectId: string,
    memberData: AddProjectMemberInput,
    requesterId: string
  ): Promise<boolean> {
    try {
      // アクセス権限チェック
      const role = await this.getUserProjectRole(projectId, requesterId);
      if (!role || !this.canManageMembers(role)) {
        throw new Error('Insufficient permissions to add project members');
      }

      // 重複チェック
      const existingRole = await this.getUserProjectRole(projectId, memberData.userId);
      if (existingRole) {
        throw new Error('User is already a member of this project');
      }

      const success = await this.projectRepository.addMember(projectId, memberData);

      if (success) {
        logger.info(`Member added to project ${projectId}: ${memberData.userId} by ${requesterId}`);
      }

      return success;
    } catch (error) {
      logger.error('Failed to add project member:', error);
      throw new Error('Failed to add project member');
    }
  }

  /**
   * プロジェクトメンバーを更新
   */
  async updateProjectMember(
    projectId: string,
    userId: string,
    memberData: UpdateProjectMemberInput,
    requesterId: string
  ): Promise<boolean> {
    try {
      // アクセス権限チェック
      const requesterRole = await this.getUserProjectRole(projectId, requesterId);
      if (!requesterRole || !this.canManageMembers(requesterRole)) {
        throw new Error('Insufficient permissions to update project members');
      }

      // オーナーの役割は変更できない
      const targetRole = await this.getUserProjectRole(projectId, userId);
      if (targetRole === 'OWNER') {
        throw new Error('Cannot modify project owner role');
      }

      const success = await this.projectRepository.updateMember(projectId, userId, memberData);

      if (success) {
        logger.info(`Member role updated in project ${projectId}: ${userId} by ${requesterId}`);
      }

      return success;
    } catch (error) {
      logger.error('Failed to update project member:', error);
      throw new Error('Failed to update project member');
    }
  }

  /**
   * プロジェクトメンバーを削除
   */
  async removeProjectMember(projectId: string, userId: string, requesterId: string): Promise<boolean> {
    try {
      // アクセス権限チェック
      const requesterRole = await this.getUserProjectRole(projectId, requesterId);
      if (!requesterRole || !this.canManageMembers(requesterRole)) {
        throw new Error('Insufficient permissions to remove project members');
      }

      // オーナーは削除できない
      const targetRole = await this.getUserProjectRole(projectId, userId);
      if (targetRole === 'OWNER') {
        throw new Error('Cannot remove project owner');
      }

      const success = await this.projectRepository.removeMember(projectId, userId);

      if (success) {
        logger.info(`Member removed from project ${projectId}: ${userId} by ${requesterId}`);
      }

      return success;
    } catch (error) {
      logger.error('Failed to remove project member:', error);
      throw new Error('Failed to remove project member');
    }
  }

  /**
   * ユーザーのプロジェクトアクセス権限をチェック
   */
  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    try {
      const role = await this.projectRepository.getUserProjectRole(projectId, userId);
      return role !== null;
    } catch (error) {
      logger.error('Failed to check project access:', error);
      return false;
    }
  }

  /**
   * ユーザーのプロジェクト内での役割を取得
   */
  async getUserProjectRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    try {
      return await this.projectRepository.getUserProjectRole(projectId, userId);
    } catch (error) {
      logger.error('Failed to get user project role:', error);
      return null;
    }
  }

  /**
   * プロジェクトデータの検証
   */
  private async validateProjectData(data: CreateProjectInput): Promise<void> {
    // プロジェクト名の重複チェックなど、必要に応じて実装
    if (data.name.length < 1) {
      throw new Error('Project name is required');
    }

    // 日付の論理チェック
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (data.endDate && data.deadline && data.endDate > data.deadline) {
      throw new Error('End date must be before deadline');
    }
  }

  /**
   * 更新データの検証
   */
  private async validateUpdateData(data: UpdateProjectInput): Promise<void> {
    if (data.name !== undefined && data.name.length < 1) {
      throw new Error('Project name cannot be empty');
    }

    // 日付の論理チェック
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      throw new Error('Start date must be before end date');
    }

    if (data.endDate && data.deadline && data.endDate > data.deadline) {
      throw new Error('End date must be before deadline');
    }
  }

  /**
   * プロジェクト更新権限チェック
   */
  private canUpdateProject(role: ProjectRole): boolean {
    return ['OWNER', 'ADMIN'].includes(role);
  }

  /**
   * プロジェクト削除権限チェック
   */
  private canDeleteProject(role: ProjectRole): boolean {
    return role === 'OWNER';
  }

  /**
   * メンバー管理権限チェック
   */
  private canManageMembers(role: ProjectRole): boolean {
    return ['OWNER', 'ADMIN'].includes(role);
  }
}