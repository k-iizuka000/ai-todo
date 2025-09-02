/**
 * Zustandを使用したプロジェクト管理のグローバル状態管理
 * 設計書要件: localStorage除去、API統合版
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  Project, 
  ProjectWithDetails,
  ProjectFilter, 
  ProjectSort, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectWithStats
} from '../types/project';
import { projectsAPI } from '../lib/api/projects';
import { logger } from '../lib/logger';

// プロジェクトストアの状態型定義（API統合版）
interface ProjectState {
  // 状態
  projects: ProjectWithDetails[];
  selectedProjectId: string | null;
  filter: ProjectFilter;
  sort: ProjectSort;
  isLoading: boolean;
  error: string | null;
  
  // API通信アクション
  loadProjects: () => Promise<void>;
  addProject: (projectInput: CreateProjectInput) => Promise<void>;
  updateProject: (id: string, projectInput: UpdateProjectInput) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  selectProject: (id: string | null) => void;
  
  // フィルター・ソート関連
  setFilter: (filter: Partial<ProjectFilter>) => void;
  clearFilter: () => void;
  setSort: (sort: ProjectSort) => void;
  
  // ユーティリティ
  getFilteredProjects: () => ProjectWithDetails[];
  getProjectById: (id: string) => ProjectWithDetails | undefined;
  getProjectsByOwner: (ownerId: string) => ProjectWithDetails[];
  getProjectsByMember: (memberId: string) => ProjectWithDetails[];
  getActiveProjects: () => ProjectWithDetails[];
  getProjectWithStats: (id: string) => ProjectWithStats | undefined;
  
  // 一括操作（API統合）
  bulkUpdateProjects: (ids: string[], updates: UpdateProjectInput) => Promise<void>;
  bulkDeleteProjects: (ids: string[]) => Promise<void>;
  archiveProjects: (ids: string[]) => Promise<void>;
  unarchiveProjects: (ids: string[]) => Promise<void>;
  
  // 状態管理
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // データ初期化
  resetStore: () => void;
  
  // 内部状態管理
  _setProjects: (projects: ProjectWithDetails[]) => void;
  _updateProjectInState: (project: Project) => void;
  _removeProjectFromState: (id: string) => void;
}

// デフォルトのフィルター設定
const defaultFilter: ProjectFilter = {
  status: undefined,
  priority: undefined,
  ownerId: undefined,
  memberId: undefined,
  tags: undefined,
  isArchived: undefined,
  search: undefined
};

// デフォルトのソート設定
const defaultSort: ProjectSort = {
  field: 'updatedAt',
  order: 'desc'
};

// Zustandストアの作成（API統合版）
export const useProjectStore = create<ProjectState>()(
  devtools(
    (set, get) => ({
      // 初期状態
      projects: [],
      selectedProjectId: null,
      filter: defaultFilter,
      sort: defaultSort,
      isLoading: false,
      error: null,

      // API通信でのプロジェクト一覧読み込み
      loadProjects: async () => {
        try {
          set({ isLoading: true, error: null }, false, 'loadProjects:start');
          
          const projects = await projectsAPI.getAll({
            filter: get().filter,
            sort: get().sort,
            includeStats: true,
            includeMembers: true,
            includeTags: true
          });
          
          set({ 
            projects, 
            isLoading: false, 
            error: null 
          }, false, 'loadProjects:success');
          
          logger.info('Projects loaded successfully', { 
            count: projects.length,
            category: 'project_store' 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトの読み込みに失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'loadProjects:error');
          
          logger.error('Failed to load projects', { 
            category: 'project_store',
            error: errorMessage 
          });
        }
      },

      // 内部状態管理用のヘルパー
      _setProjects: (projects) => {
        set({ projects }, false, '_setProjects');
      },

      _updateProjectInState: (updatedProject) => {
        const { projects } = get();
        const updatedProjects = projects.map(project => 
          project.id === updatedProject.id 
            ? { ...project, ...updatedProject } as ProjectWithDetails
            : project
        );
        set({ projects: updatedProjects }, false, '_updateProjectInState');
      },

      _removeProjectFromState: (id) => {
        const { projects, selectedProjectId } = get();
        const filteredProjects = projects.filter(project => project.id !== id);
        set({
          projects: filteredProjects,
          selectedProjectId: selectedProjectId === id ? null : selectedProjectId
        }, false, '_removeProjectFromState');
      },

      addProject: async (projectInput) => {
        try {
          // 入力値の基本検証
          if (!projectInput.name || projectInput.name.trim() === '') {
            get().setError('プロジェクト名は必須です');
            return;
          }

          set({ isLoading: true, error: null }, false, 'addProject:start');
          
          // APIを通じてプロジェクト作成
          const newProject = await projectsAPI.create(projectInput);
          
          // Optimistic Update: 即座にUIに反映
          const { projects } = get();
          const projectWithDetails: ProjectWithDetails = {
            ...newProject,
            owner: { id: newProject.ownerId, email: 'current@user.com', profile: null },
            members: [],
            tags: [],
            _count: { tasks: 0, members: 0 }
          };
          
          set({ 
            projects: [...projects, projectWithDetails],
            isLoading: false,
            error: null
          }, false, 'addProject:success');
          
          logger.info('Project created successfully', {
            category: 'project_store',
            projectId: newProject.id,
            projectName: newProject.name
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'addProject:error');
          
          logger.error('Failed to create project', {
            category: 'project_store',
            projectName: projectInput.name,
            error: errorMessage
          });
        }
      },

      updateProject: async (id, projectInput) => {
        try {
          if (!id) {
            get().setError('プロジェクトIDが必要です');
            return;
          }

          set({ isLoading: true, error: null }, false, 'updateProject:start');
          
          // APIを通じてプロジェクト更新
          const updatedProject = await projectsAPI.update(id, projectInput);
          
          // 状態に反映
          get()._updateProjectInState(updatedProject);
          
          set({ 
            isLoading: false, 
            error: null 
          }, false, 'updateProject:success');
          
          logger.info('Project updated successfully', {
            category: 'project_store',
            projectId: id,
            updates: Object.keys(projectInput)
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトの更新に失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'updateProject:error');
          
          logger.error('Failed to update project', {
            category: 'project_store',
            projectId: id,
            error: errorMessage
          });
        }
      },

      deleteProject: async (id) => {
        try {
          if (!id) {
            get().setError('プロジェクトIDが必要です');
            return;
          }

          set({ isLoading: true, error: null }, false, 'deleteProject:start');
          
          // APIを通じてプロジェクト削除
          await projectsAPI.delete(id);
          
          // 状態から除去
          get()._removeProjectFromState(id);
          
          set({ 
            isLoading: false, 
            error: null 
          }, false, 'deleteProject:success');
          
          logger.info('Project deleted successfully', {
            category: 'project_store',
            projectId: id
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'deleteProject:error');
          
          logger.error('Failed to delete project', {
            category: 'project_store',
            projectId: id,
            error: errorMessage
          });
        }
      },

      selectProject: (id) => {
        set({ selectedProjectId: id }, false, 'selectProject');
      },

      // フィルター・ソート関連
      setFilter: (newFilter) => {
        const { filter } = get();
        set(
          { filter: { ...filter, ...newFilter } },
          false,
          'setFilter'
        );
      },

      clearFilter: () => {
        set({ filter: defaultFilter }, false, 'clearFilter');
      },

      setSort: (sort) => {
        set({ sort }, false, 'setSort');
      },

      // ユーティリティ関数
      getFilteredProjects: () => {
        const { projects, filter, sort } = get();
        
        let filteredProjects = projects.filter(project => {
          // ステータスフィルター
          if (filter.status && filter.status.length > 0) {
            if (!filter.status.includes(project.status)) return false;
          }
          
          // 優先度フィルター
          if (filter.priority && filter.priority.length > 0) {
            if (!filter.priority.includes(project.priority)) return false;
          }
          
          // オーナーフィルター
          if (filter.ownerId) {
            if (project.ownerId !== filter.ownerId) return false;
          }
          
          // メンバーフィルター
          if (filter.memberId) {
            const memberIds = project.members.map(member => member.user.id);
            if (!memberIds.includes(filter.memberId)) return false;
          }
          
          // タグフィルター
          if (filter.tags && filter.tags.length > 0) {
            const projectTagNames = project.tags.map(tag => tag.name);
            if (!filter.tags.some(tag => projectTagNames.includes(tag))) return false;
          }
          
          // アーカイブフィルター
          if (filter.isArchived !== undefined) {
            if (project.isArchived !== filter.isArchived) return false;
          }
          
          // 検索フィルター
          if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            const nameMatch = project.name.toLowerCase().includes(searchLower);
            const descriptionMatch = project.description?.toLowerCase().includes(searchLower);
            const tagMatch = project.tags.some(tag => tag.name.toLowerCase().includes(searchLower));
            if (!nameMatch && !descriptionMatch && !tagMatch) return false;
          }
          
          return true;
        });
        
        // ソート処理
        filteredProjects.sort((a, b) => {
          const { field, order } = sort;
          let aValue: any;
          let bValue: any;
          
          try {
            // Date型の安全な処理ユーティリティ
            const getDateValue = (date: Date | undefined | null): number => {
              if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                return order === 'asc' ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
              }
              return date.getTime();
            };

            switch (field) {
              case 'name':
                aValue = (a.name || '').toLowerCase().trim();
                bValue = (b.name || '').toLowerCase().trim();
                break;
              case 'status':
                aValue = a.status || '';
                bValue = b.status || '';
                break;
              case 'priority':
                const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const;
                aValue = priorityOrder[a.priority] || 0;
                bValue = priorityOrder[b.priority] || 0;
                break;
              case 'deadline':
                aValue = getDateValue(a.deadline);
                bValue = getDateValue(b.deadline);
                break;
              case 'startDate':
                aValue = getDateValue(a.startDate);
                bValue = getDateValue(b.startDate);
                break;
              case 'endDate':
                aValue = getDateValue(a.endDate);
                bValue = getDateValue(b.endDate);
                break;
              case 'createdAt':
                aValue = getDateValue(a.createdAt);
                bValue = getDateValue(b.createdAt);
                break;
              case 'updatedAt':
                aValue = getDateValue(a.updatedAt);
                bValue = getDateValue(b.updatedAt);
                break;
              default:
                // 不明なフィールドの場合はIDで比較
                aValue = a.id;
                bValue = b.id;
                console.warn(`Unknown sort field: ${field}`);
            }
            
            // 値が等しい場合の安定ソートのため、IDで比較
            if (aValue === bValue) {
              const idCompare = a.id.localeCompare(b.id);
              return order === 'asc' ? idCompare : -idCompare;
            }
            
            // 文字列の場合はlocaleCompareを使用
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              const stringCompare = aValue.localeCompare(bValue);
              return order === 'asc' ? stringCompare : -stringCompare;
            }
            
            // 数値の場合は通常の比較
            if (order === 'asc') {
              return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
              return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
          } catch (error) {
            console.error('Sort comparison error:', error, { 
              field, 
              aId: a.id, 
              bId: b.id,
              aValue: a[field as keyof Project],
              bValue: b[field as keyof Project]
            });
            // エラー時はIDで比較
            const idCompare = a.id.localeCompare(b.id);
            return order === 'asc' ? idCompare : -idCompare;
          }
        });
        
        return filteredProjects;
      },

      getProjectById: (id) => {
        return get().projects.find(project => project.id === id);
      },

      getProjectsByOwner: (ownerId) => {
        return get().projects.filter(project => project.ownerId === ownerId);
      },

      getProjectsByMember: (memberId) => {
        return get().projects.filter(project => 
          project.members.some(member => member.user.id === memberId)
        );
      },

      getActiveProjects: () => {
        return get().projects.filter(project => 
          project.status === 'ACTIVE' && !project.isArchived
        );
      },

      getProjectWithStats: (id) => {
        const project = get().getProjectById(id);
        if (!project) return undefined;
        
        // ProjectWithDetailsにはすでに統計情報が含まれている場合がある
        if ('stats' in project) {
          return project as ProjectWithStats;
        }
        
        // 統計情報がない場合は基本プロジェクト情報を返す
        return {
          ...project,
          stats: {
            totalTasks: 0,
            completedTasks: 0,
            activeTasks: 0,
            todoTasks: 0,
            inProgressTasks: 0,
            completionRate: 0,
            totalEstimatedHours: 0,
            totalActualHours: 0,
            overdueTasks: 0,
            tasksByPriority: { low: 0, medium: 0, high: 0, urgent: 0, critical: 0 },
            tasksByStatus: { todo: 0, inProgress: 0, done: 0, archived: 0 }
          }
        };
      },

      // 一括操作（API統合）
      bulkUpdateProjects: async (ids, updates) => {
        try {
          if (!Array.isArray(ids) || ids.length === 0) {
            get().setError('更新対象のプロジェクトIDが指定されていません');
            return;
          }

          set({ isLoading: true, error: null }, false, 'bulkUpdateProjects:start');
          
          // APIを通じて一括更新
          const updatedProjects = await projectsAPI.bulkUpdate(ids, updates);
          
          // 状態を更新
          updatedProjects.forEach(project => {
            get()._updateProjectInState(project);
          });
          
          set({ 
            isLoading: false, 
            error: null 
          }, false, 'bulkUpdateProjects:success');
          
          logger.info('Projects bulk updated successfully', {
            category: 'project_store',
            count: updatedProjects.length,
            updates: Object.keys(updates)
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトの一括更新に失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'bulkUpdateProjects:error');
          
          logger.error('Failed to bulk update projects', {
            category: 'project_store',
            count: ids.length,
            error: errorMessage
          });
        }
      },

      bulkDeleteProjects: async (ids) => {
        try {
          if (!Array.isArray(ids) || ids.length === 0) {
            get().setError('削除対象のプロジェクトIDが指定されていません');
            return;
          }

          set({ isLoading: true, error: null }, false, 'bulkDeleteProjects:start');
          
          // APIを通じて一括削除
          await projectsAPI.bulkDelete(ids);
          
          // 状態から一括除去
          ids.forEach(id => {
            get()._removeProjectFromState(id);
          });
          
          set({ 
            isLoading: false, 
            error: null 
          }, false, 'bulkDeleteProjects:success');
          
          logger.info('Projects bulk deleted successfully', {
            category: 'project_store',
            count: ids.length
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトの一括削除に失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'bulkDeleteProjects:error');
          
          logger.error('Failed to bulk delete projects', {
            category: 'project_store',
            count: ids.length,
            error: errorMessage
          });
        }
      },

      archiveProjects: async (ids) => {
        try {
          set({ isLoading: true, error: null }, false, 'archiveProjects:start');
          
          const archivedProjects = await projectsAPI.archive(ids);
          
          // 状態を更新
          archivedProjects.forEach(project => {
            get()._updateProjectInState(project);
          });
          
          set({ 
            isLoading: false, 
            error: null 
          }, false, 'archiveProjects:success');
          
          logger.info('Projects archived successfully', {
            category: 'project_store',
            count: archivedProjects.length
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトのアーカイブに失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'archiveProjects:error');
          
          logger.error('Failed to archive projects', {
            category: 'project_store',
            count: ids.length,
            error: errorMessage
          });
        }
      },

      unarchiveProjects: async (ids) => {
        try {
          set({ isLoading: true, error: null }, false, 'unarchiveProjects:start');
          
          const unarchivedProjects = await projectsAPI.unarchive(ids);
          
          // 状態を更新
          unarchivedProjects.forEach(project => {
            get()._updateProjectInState(project);
          });
          
          set({ 
            isLoading: false, 
            error: null 
          }, false, 'unarchiveProjects:success');
          
          logger.info('Projects unarchived successfully', {
            category: 'project_store',
            count: unarchivedProjects.length
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'プロジェクトのアーカイブ解除に失敗しました';
          set({ 
            isLoading: false, 
            error: errorMessage 
          }, false, 'unarchiveProjects:error');
          
          logger.error('Failed to unarchive projects', {
            category: 'project_store',
            count: ids.length,
            error: errorMessage
          });
        }
      },

      // 状態管理
      setLoading: (isLoading) => {
        set({ isLoading }, false, 'setLoading');
      },

      setError: (error) => {
        set({ error }, false, 'setError');
      },

      clearError: () => {
        set({ error: null }, false, 'clearError');
      },

      // データ初期化
      resetStore: () => {
        set({
          projects: [],
          selectedProjectId: null,
          filter: defaultFilter,
          sort: defaultSort,
          isLoading: false,
          error: null
        }, false, 'resetStore');
        
        logger.info('Project store reset', {
          category: 'project_store'
        });
      }
    }),
    {
      name: 'project-store'
    }
  )
);

// カスタムフック：フィルタリングされたプロジェクトを取得
export const useFilteredProjects = () => {
  return useProjectStore(state => state.getFilteredProjects());
};

// カスタムフック：選択されたプロジェクトを取得
export const useSelectedProject = () => {
  return useProjectStore(state => 
    state.selectedProjectId ? state.getProjectById(state.selectedProjectId) : null
  );
};

// カスタムフック：アクティブなプロジェクトを取得
export const useActiveProjects = () => {
  return useProjectStore(state => state.getActiveProjects());
};

// カスタムフック：プロジェクト統計を取得
export const useProjectStats = () => {
  return useProjectStore(state => {
    const projects = state.projects;
    const total = projects.length;
    const active = projects.filter(project => project.status === 'ACTIVE').length;
    const completed = projects.filter(project => project.status === 'COMPLETED').length;
    const planning = projects.filter(project => project.status === 'PLANNING').length;
    const onHold = projects.filter(project => project.status === 'ON_HOLD').length;
    const cancelled = projects.filter(project => project.status === 'CANCELLED').length;
    const archived = projects.filter(project => project.isArchived).length;
    
    return {
      total,
      active,
      completed,
      planning,
      onHold,
      cancelled,
      archived,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });
};

// カスタムフック：プロジェクト情報取得のヘルパー
export const useProjectHelper = () => {
  const getProjectById = useProjectStore(state => state.getProjectById);
  const getProjectWithStats = useProjectStore(state => state.getProjectWithStats);
  
  return {
    getProjectById,
    getProjectWithStats,
    // プロジェクト情報を安全に取得するヘルパー関数
    getProjectInfo: (projectId?: string | null) => {
      try {
        if (!projectId || typeof projectId !== 'string') return null;
        return getProjectById(projectId);
      } catch (error) {
        console.error('Failed to get project info:', error, { projectId });
        return null;
      }
    },
    // プロジェクトの表示用データを取得
    getProjectDisplayData: (projectId?: string | null) => {
      try {
        if (!projectId || typeof projectId !== 'string') return null;
        const project = getProjectById(projectId);
        if (!project) return null;
        
        return {
          id: project.id || '',
          name: project.name || 'Unnamed Project',
          color: project.color || '#3B82F6',
          icon: project.icon,
          status: project.status || 'PLANNING'
        };
      } catch (error) {
        console.error('Failed to get project display data:', error, { projectId });
        return null;
      }
    },
    // プロジェクト存在確認のヘルパー関数
    projectExists: (projectId?: string | null): boolean => {
      try {
        if (!projectId || typeof projectId !== 'string') return false;
        return !!getProjectById(projectId);
      } catch (error) {
        console.error('Failed to check project existence:', error, { projectId });
        return false;
      }
    }
  };
};