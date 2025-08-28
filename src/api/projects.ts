import { apiClient } from './client';
import type { 
  ProjectWithDetails, 
  ProjectWithStats, 
  ProjectStats, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectFilterInput,
  AddProjectMemberInput,
  UpdateProjectMemberInput,
  BulkUpdateProjectsInput
} from '../types/project';

export interface ProjectsResponse {
  projects: ProjectWithDetails[];
  total: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ProjectQueryParams extends ProjectFilterInput {
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * プロジェクトAPI クライアント
 */
export class ProjectsAPI {
  private baseUrl = '/api/v1/projects';

  /**
   * プロジェクト一覧を取得
   */
  async getProjects(params: ProjectQueryParams = {}): Promise<ProjectsResponse> {
    const queryParams = new URLSearchParams();
    
    // 基本的なページネーション・ソート
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortField) queryParams.append('sortField', params.sortField);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    // フィルタリング条件
    if (params.status && params.status.length > 0) {
      params.status.forEach(status => queryParams.append('status', status));
    }
    if (params.priority && params.priority.length > 0) {
      params.priority.forEach(priority => queryParams.append('priority', priority));
    }
    if (params.ownerId) queryParams.append('ownerId', params.ownerId);
    if (params.memberIds && params.memberIds.length > 0) {
      params.memberIds.forEach(id => queryParams.append('memberIds', id));
    }
    if (params.tags && params.tags.length > 0) {
      params.tags.forEach(tag => queryParams.append('tags', tag));
    }
    if (params.search) queryParams.append('search', params.search);
    if (params.isArchived !== undefined) {
      queryParams.append('isArchived', params.isArchived.toString());
    }

    // 日付範囲フィルタ
    if (params.dateRange) {
      queryParams.append('dateRange.field', params.dateRange.field);
      if (params.dateRange.from) {
        queryParams.append('dateRange.from', params.dateRange.from.toISOString());
      }
      if (params.dateRange.to) {
        queryParams.append('dateRange.to', params.dateRange.to.toISOString());
      }
    }

    const url = queryParams.toString() 
      ? `${this.baseUrl}?${queryParams.toString()}`
      : this.baseUrl;

    const response = await apiClient.get<{
      success: boolean;
      data: ProjectWithDetails[];
      pagination: ProjectsResponse['pagination'];
    }>(url);

    return {
      projects: response.data,
      total: response.pagination.total,
      pagination: response.pagination,
    };
  }

  /**
   * プロジェクト詳細を取得
   */
  async getProjectById(id: string, includeStats = false): Promise<ProjectWithDetails | ProjectWithStats> {
    const url = includeStats 
      ? `${this.baseUrl}/${id}?includeStats=true`
      : `${this.baseUrl}/${id}`;

    const response = await apiClient.get<{
      success: boolean;
      data: ProjectWithDetails | ProjectWithStats;
    }>(url);

    return response.data;
  }

  /**
   * プロジェクト統計情報を取得
   */
  async getProjectStats(id: string): Promise<ProjectStats> {
    const response = await apiClient.get<{
      success: boolean;
      data: ProjectStats;
    }>(`${this.baseUrl}/${id}/stats`);

    return response.data;
  }

  /**
   * プロジェクトを作成
   */
  async createProject(data: CreateProjectInput): Promise<ProjectWithDetails> {
    const response = await apiClient.post<{
      success: boolean;
      data: ProjectWithDetails;
    }>(this.baseUrl, data);

    return response.data;
  }

  /**
   * プロジェクトを更新
   */
  async updateProject(id: string, data: UpdateProjectInput): Promise<ProjectWithDetails> {
    const response = await apiClient.put<{
      success: boolean;
      data: ProjectWithDetails;
    }>(`${this.baseUrl}/${id}`, data);

    return response.data;
  }

  /**
   * プロジェクトを削除
   */
  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * プロジェクトを一括更新
   */
  async bulkUpdateProjects(data: BulkUpdateProjectsInput): Promise<void> {
    await apiClient.patch(`${this.baseUrl}/bulk`, data);
  }

  /**
   * プロジェクトメンバーを追加
   */
  async addProjectMember(projectId: string, data: AddProjectMemberInput): Promise<void> {
    await apiClient.post(`${this.baseUrl}/${projectId}/members`, data);
  }

  /**
   * プロジェクトメンバーの役割を更新
   */
  async updateProjectMember(
    projectId: string, 
    userId: string, 
    data: UpdateProjectMemberInput
  ): Promise<void> {
    await apiClient.put(`${this.baseUrl}/${projectId}/members/${userId}`, data);
  }

  /**
   * プロジェクトメンバーを削除
   */
  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${projectId}/members/${userId}`);
  }
}

// シングルトンインスタンス
export const projectsAPI = new ProjectsAPI();

// 名前付きエクスポート（後方互換性のため）
export const {
  getProjects,
  getProjectById,
  getProjectStats,
  createProject,
  updateProject,
  deleteProject,
  bulkUpdateProjects,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} = projectsAPI;

// デフォルトエクスポート
export default projectsAPI;