/**
 * プロジェクト管理API クライアント実装
 * 設計書のAPI層仕様に基づく完全実装
 */

import { apiClient, createApiCall, type ApiResponse } from './index';
import { logger } from '../logger';
import type { 
  Project, 
  ProjectWithDetails,
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectFilter,
  ProjectSort
} from '../../types/project';

/**
 * プロジェクトAPI のエンドポイント定義
 */
const ENDPOINTS = {
  PROJECTS: '/projects',
  PROJECT_BY_ID: (id: string) => `/projects/${id}`,
  PROJECT_STATS: (id: string) => `/projects/${id}/stats`,
  PROJECT_MEMBERS: (id: string) => `/projects/${id}/members`,
  PROJECT_TAGS: (id: string) => `/projects/${id}/tags`,
  BULK_UPDATE: '/projects/bulk-update',
  BULK_DELETE: '/projects/bulk-delete',
  ARCHIVE: '/projects/archive',
  UNARCHIVE: '/projects/unarchive'
} as const;

/**
 * プロジェクト一覧取得のクエリパラメータ
 */
interface ProjectQueryParams {
  filter?: Partial<ProjectFilter>;
  sort?: ProjectSort;
  page?: number;
  limit?: number;
  includeStats?: boolean;
  includeMembers?: boolean;
  includeTags?: boolean;
}

/**
 * 一括操作用のリクエスト型
 */
interface BulkOperationRequest {
  ids: string[];
  updates?: UpdateProjectInput;
}

/**
 * プロジェクトAPI クライアントクラス
 */
export class ProjectsAPI {
  private readonly logContext = { service: 'ProjectsAPI' };

  /**
   * プロジェクト一覧取得
   */
  async getAll(params?: ProjectQueryParams): Promise<ProjectWithDetails[]> {
    try {
      logger.debug('Fetching projects list', { ...this.logContext, params });
      
      const queryString = params ? this.buildQueryString(params) : '';
      const endpoint = `${ENDPOINTS.PROJECTS}${queryString}`;
      
      const response = await apiClient.get<ProjectWithDetails[]>(endpoint, {
        retry: { maxAttempts: 3, backoffMs: 1000 },
        timeout: 10000,
        requestId: `projects-list-${Date.now()}`
      });

      logger.info('Successfully fetched projects', { 
        ...this.logContext, 
        count: response.data.length 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch projects', this.logContext, error);
      throw error;
    }
  }

  /**
   * プロジェクト詳細取得
   */
  async getById(id: string, includeStats = true): Promise<ProjectWithDetails> {
    try {
      this.validateId(id);
      logger.debug('Fetching project by ID', { ...this.logContext, id, includeStats });
      
      const queryParams = includeStats ? '?includeStats=true' : '';
      const endpoint = `${ENDPOINTS.PROJECT_BY_ID(id)}${queryParams}`;
      
      const response = await apiClient.get<ProjectWithDetails>(endpoint, {
        retry: { maxAttempts: 3, backoffMs: 500 },
        timeout: 5000,
        requestId: `project-detail-${id}`
      });

      logger.info('Successfully fetched project details', { 
        ...this.logContext, 
        id, 
        projectName: response.data.name 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch project', { ...this.logContext, id }, error);
      throw error;
    }
  }

  /**
   * プロジェクト作成
   */
  async create(projectData: CreateProjectInput): Promise<Project> {
    try {
      this.validateCreateInput(projectData);
      logger.debug('Creating new project', { 
        ...this.logContext, 
        projectName: projectData.name 
      });
      
      const response = await apiClient.post<Project>(ENDPOINTS.PROJECTS, projectData, {
        retry: { maxAttempts: 2, backoffMs: 1000 },
        timeout: 15000,
        requestId: `project-create-${Date.now()}`
      });

      logger.info('Successfully created project', { 
        ...this.logContext, 
        id: response.data.id,
        name: response.data.name
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create project', { 
        ...this.logContext, 
        projectName: projectData.name 
      }, error);
      throw error;
    }
  }

  /**
   * プロジェクト更新
   */
  async update(id: string, projectData: UpdateProjectInput): Promise<Project> {
    try {
      this.validateId(id);
      this.validateUpdateInput(projectData);
      logger.debug('Updating project', { 
        ...this.logContext, 
        id, 
        updates: Object.keys(projectData) 
      });
      
      const response = await apiClient.put<Project>(
        ENDPOINTS.PROJECT_BY_ID(id), 
        projectData, 
        {
          retry: { maxAttempts: 2, backoffMs: 1000 },
          timeout: 10000,
          requestId: `project-update-${id}`
        }
      );

      logger.info('Successfully updated project', { 
        ...this.logContext, 
        id,
        name: response.data.name
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to update project', { ...this.logContext, id }, error);
      throw error;
    }
  }

  /**
   * プロジェクト削除
   */
  async delete(id: string): Promise<void> {
    try {
      this.validateId(id);
      logger.debug('Deleting project', { ...this.logContext, id });
      
      await apiClient.delete(ENDPOINTS.PROJECT_BY_ID(id), {
        retry: { maxAttempts: 2, backoffMs: 1000 },
        timeout: 10000,
        requestId: `project-delete-${id}`
      });

      logger.info('Successfully deleted project', { ...this.logContext, id });
    } catch (error) {
      logger.error('Failed to delete project', { ...this.logContext, id }, error);
      throw error;
    }
  }

  /**
   * 一括更新
   */
  async bulkUpdate(ids: string[], updates: UpdateProjectInput): Promise<Project[]> {
    try {
      this.validateIds(ids);
      this.validateUpdateInput(updates);
      logger.debug('Bulk updating projects', { 
        ...this.logContext, 
        count: ids.length,
        updates: Object.keys(updates)
      });
      
      const response = await apiClient.post<Project[]>(
        ENDPOINTS.BULK_UPDATE,
        { ids, updates } as BulkOperationRequest,
        {
          retry: { maxAttempts: 2, backoffMs: 2000 },
          timeout: 30000,
          requestId: `projects-bulk-update-${Date.now()}`
        }
      );

      logger.info('Successfully bulk updated projects', { 
        ...this.logContext, 
        count: response.data.length 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to bulk update projects', { 
        ...this.logContext, 
        count: ids.length 
      }, error);
      throw error;
    }
  }

  /**
   * 一括削除
   */
  async bulkDelete(ids: string[]): Promise<void> {
    try {
      this.validateIds(ids);
      logger.debug('Bulk deleting projects', { ...this.logContext, count: ids.length });
      
      await apiClient.post(
        ENDPOINTS.BULK_DELETE,
        { ids } as Pick<BulkOperationRequest, 'ids'>,
        {
          retry: { maxAttempts: 2, backoffMs: 2000 },
          timeout: 30000,
          requestId: `projects-bulk-delete-${Date.now()}`
        }
      );

      logger.info('Successfully bulk deleted projects', { 
        ...this.logContext, 
        count: ids.length 
      });
    } catch (error) {
      logger.error('Failed to bulk delete projects', { 
        ...this.logContext, 
        count: ids.length 
      }, error);
      throw error;
    }
  }

  /**
   * アーカイブ
   */
  async archive(ids: string[]): Promise<Project[]> {
    try {
      this.validateIds(ids);
      logger.debug('Archiving projects', { ...this.logContext, count: ids.length });
      
      const response = await apiClient.post<Project[]>(
        ENDPOINTS.ARCHIVE,
        { ids } as Pick<BulkOperationRequest, 'ids'>,
        {
          retry: { maxAttempts: 2, backoffMs: 1000 },
          timeout: 15000,
          requestId: `projects-archive-${Date.now()}`
        }
      );

      logger.info('Successfully archived projects', { 
        ...this.logContext, 
        count: response.data.length 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to archive projects', { 
        ...this.logContext, 
        count: ids.length 
      }, error);
      throw error;
    }
  }

  /**
   * アーカイブ解除
   */
  async unarchive(ids: string[]): Promise<Project[]> {
    try {
      this.validateIds(ids);
      logger.debug('Unarchiving projects', { ...this.logContext, count: ids.length });
      
      const response = await apiClient.post<Project[]>(
        ENDPOINTS.UNARCHIVE,
        { ids } as Pick<BulkOperationRequest, 'ids'>,
        {
          retry: { maxAttempts: 2, backoffMs: 1000 },
          timeout: 15000,
          requestId: `projects-unarchive-${Date.now()}`
        }
      );

      logger.info('Successfully unarchived projects', { 
        ...this.logContext, 
        count: response.data.length 
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to unarchive projects', { 
        ...this.logContext, 
        count: ids.length 
      }, error);
      throw error;
    }
  }

  // ===== プライベートヘルパーメソッド =====

  /**
   * クエリパラメータ文字列の生成
   */
  private buildQueryString(params: ProjectQueryParams): string {
    const searchParams = new URLSearchParams();
    
    if (params.filter) {
      Object.entries(params.filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }

    if (params.sort) {
      searchParams.append('sortField', params.sort.field);
      searchParams.append('sortOrder', params.sort.order);
    }

    if (params.page !== undefined) {
      searchParams.append('page', String(params.page));
    }

    if (params.limit !== undefined) {
      searchParams.append('limit', String(params.limit));
    }

    if (params.includeStats) {
      searchParams.append('includeStats', 'true');
    }

    if (params.includeMembers) {
      searchParams.append('includeMembers', 'true');
    }

    if (params.includeTags) {
      searchParams.append('includeTags', 'true');
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * ID検証
   */
  private validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('Invalid project ID provided');
    }
  }

  /**
   * ID配列検証
   */
  private validateIds(ids: string[]): void {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('IDs array is required and must not be empty');
    }
    
    ids.forEach((id, index) => {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new Error(`Invalid ID at index ${index}`);
      }
    });
  }

  /**
   * 作成用入力データ検証
   */
  private validateCreateInput(data: CreateProjectInput): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Project data is required');
    }
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Project name is required');
    }
  }

  /**
   * 更新用入力データ検証
   */
  private validateUpdateInput(data: UpdateProjectInput): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Update data is required');
    }
    
    if (Object.keys(data).length === 0) {
      throw new Error('At least one field must be provided for update');
    }

    // 名前が提供されている場合のみ検証
    if (data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        throw new Error('Project name cannot be empty');
      }
    }
  }
}

/**
 * プロジェクトAPIのシングルトンインスタンス
 */
export const projectsAPI = new ProjectsAPI();

/**
 * React Query/SWR用のプロジェクトAPI関数
 */
export const projectApiCalls = {
  getAll: createApiCall<ProjectQueryParams | undefined, ProjectWithDetails[]>('GET', ENDPOINTS.PROJECTS),
  getById: (id: string) => createApiCall<{ includeStats?: boolean }, ProjectWithDetails>('GET', ENDPOINTS.PROJECT_BY_ID(id)),
  create: createApiCall<CreateProjectInput, Project>('POST', ENDPOINTS.PROJECTS),
  update: (id: string) => createApiCall<UpdateProjectInput, Project>('PUT', ENDPOINTS.PROJECT_BY_ID(id)),
  delete: (id: string) => createApiCall<void, void>('DELETE', ENDPOINTS.PROJECT_BY_ID(id)),
  bulkUpdate: createApiCall<BulkOperationRequest, Project[]>('POST', ENDPOINTS.BULK_UPDATE),
  bulkDelete: createApiCall<Pick<BulkOperationRequest, 'ids'>, void>('POST', ENDPOINTS.BULK_DELETE),
  archive: createApiCall<Pick<BulkOperationRequest, 'ids'>, Project[]>('POST', ENDPOINTS.ARCHIVE),
  unarchive: createApiCall<Pick<BulkOperationRequest, 'ids'>, Project[]>('POST', ENDPOINTS.UNARCHIVE)
};

export default projectsAPI;