/**
 * Zustandを使用したプロジェクト管理のグローバル状態管理
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

// プロジェクトストアの状態型定義
interface ProjectState {
  // 状態
  projects: Project[];
  selectedProjectId: string | null;
  filter: ProjectFilter;
  sort: ProjectSort;
  isLoading: boolean;
  error: string | null;
  
  // アクション
  setProjects: (projects: Project[]) => void;
  addProject: (projectInput: CreateProjectInput) => void;
  updateProject: (id: string, projectInput: UpdateProjectInput) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;
  
  // フィルター・ソート関連
  setFilter: (filter: Partial<ProjectFilter>) => void;
  clearFilter: () => void;
  setSort: (sort: ProjectSort) => void;
  
  // ユーティリティ
  getFilteredProjects: () => Project[];
  getProjectById: (id: string) => Project | undefined;
  getProjectsByOwner: (ownerId: string) => Project[];
  getProjectsByMember: (memberId: string) => Project[];
  getActiveProjects: () => Project[];
  getProjectWithStats: (id: string) => ProjectWithStats | undefined;
  
  // 一括操作
  bulkUpdateProjects: (ids: string[], updates: UpdateProjectInput) => void;
  bulkDeleteProjects: (ids: string[]) => void;
  archiveProjects: (ids: string[]) => void;
  unarchiveProjects: (ids: string[]) => void;
  
  // 状態管理
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // データ初期化
  loadMockData: () => void;
  resetStore: () => void;
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

// IDジェネレーター
const generateId = (): string => {
  return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Zustandストアの作成
export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        projects: [],
        selectedProjectId: null,
        filter: defaultFilter,
        sort: defaultSort,
        isLoading: false,
        error: null,

        // 基本的なCRUD操作
        setProjects: (projects) => {
          set({ projects }, false, 'setProjects');
        },

        addProject: (projectInput) => {
          try {
            // 入力値の検証
            if (!projectInput.name || projectInput.name.trim() === '') {
              get().setError('プロジェクト名は必須です');
              return;
            }

            const { projects } = get();
            
            // プロジェクト名の重複チェック
            const existingProject = projects.find(p => 
              p.name.toLowerCase().trim() === projectInput.name.toLowerCase().trim()
            );
            if (existingProject) {
              get().setError('同じ名前のプロジェクトが既に存在します');
              return;
            }
            
            const newProject: Project = {
              id: generateId(),
              name: projectInput.name.trim(),
              description: projectInput.description?.trim(),
              status: 'planning',
              priority: projectInput.priority || 'medium',
              color: projectInput.color || '#3B82F6',
              icon: projectInput.icon,
              ownerId: 'current-user', // 実際の実装では認証されたユーザーIDを使用
              members: [],
              startDate: projectInput.startDate,
              endDate: projectInput.endDate,
              deadline: projectInput.deadline,
              budget: projectInput.budget,
              tags: projectInput.tags || [],
              isArchived: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'current-user',
              updatedBy: 'current-user'
            };
            
            // 日付の論理チェック
            if (newProject.startDate && newProject.endDate && 
                newProject.startDate > newProject.endDate) {
              get().setError('開始日は終了日より前に設定してください');
              return;
            }

            if (newProject.deadline && newProject.startDate && 
                newProject.deadline < newProject.startDate) {
              get().setError('締切日は開始日以降に設定してください');
              return;
            }
            
            get().clearError();
            set(
              { projects: [...projects, newProject] },
              false,
              'addProject'
            );
          } catch (error) {
            console.error('Failed to add project:', error);
            get().setError('プロジェクトの作成に失敗しました');
          }
        },

        updateProject: (id, projectInput) => {
          try {
            if (!id) {
              get().setError('プロジェクトIDが必要です');
              return;
            }

            const { projects } = get();
            const targetProject = projects.find(p => p.id === id);
            
            if (!targetProject) {
              get().setError('指定されたプロジェクトが見つかりません');
              return;
            }

            // プロジェクト名の検証（更新時）
            if (projectInput.name !== undefined) {
              if (!projectInput.name || projectInput.name.trim() === '') {
                get().setError('プロジェクト名は必須です');
                return;
              }

              // 他のプロジェクトとの重複チェック
              const duplicateProject = projects.find(p => 
                p.id !== id && 
                p.name.toLowerCase().trim() === projectInput.name!.toLowerCase().trim()
              );
              if (duplicateProject) {
                get().setError('同じ名前のプロジェクトが既に存在します');
                return;
              }
            }

            const updatedProject = {
              ...targetProject,
              ...projectInput,
              name: projectInput.name ? projectInput.name.trim() : targetProject.name,
              description: projectInput.description !== undefined ? 
                projectInput.description?.trim() : targetProject.description,
              updatedAt: new Date(),
              updatedBy: 'current-user'
            };

            // 日付の論理チェック
            if (updatedProject.startDate && updatedProject.endDate && 
                updatedProject.startDate > updatedProject.endDate) {
              get().setError('開始日は終了日より前に設定してください');
              return;
            }

            if (updatedProject.deadline && updatedProject.startDate && 
                updatedProject.deadline < updatedProject.startDate) {
              get().setError('締切日は開始日以降に設定してください');
              return;
            }

            const updatedProjects = projects.map(project =>
              project.id === id ? updatedProject : project
            );
            
            get().clearError();
            set({ projects: updatedProjects }, false, 'updateProject');
          } catch (error) {
            console.error('Failed to update project:', error);
            get().setError('プロジェクトの更新に失敗しました');
          }
        },

        deleteProject: (id) => {
          try {
            if (!id) {
              get().setError('プロジェクトIDが必要です');
              return;
            }

            const { projects } = get();
            const targetProject = projects.find(p => p.id === id);
            
            if (!targetProject) {
              get().setError('指定されたプロジェクトが見つかりません');
              return;
            }

            const filteredProjects = projects.filter(project => project.id !== id);
            
            get().clearError();
            set(
              {
                projects: filteredProjects,
                selectedProjectId: get().selectedProjectId === id ? null : get().selectedProjectId
              },
              false,
              'deleteProject'
            );
          } catch (error) {
            console.error('Failed to delete project:', error);
            get().setError('プロジェクトの削除に失敗しました');
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
              const memberIds = project.members.map(member => member.userId);
              if (!memberIds.includes(filter.memberId)) return false;
            }
            
            // タグフィルター
            if (filter.tags && filter.tags.length > 0) {
              if (!filter.tags.some(tag => project.tags.includes(tag))) return false;
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
              const tagMatch = project.tags.some(tag => tag.toLowerCase().includes(searchLower));
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
                  const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 } as const;
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
            project.members.some(member => member.userId === memberId)
          );
        },

        getActiveProjects: () => {
          return get().projects.filter(project => 
            project.status === 'active' && !project.isArchived
          );
        },

        getProjectWithStats: (id) => {
          const project = get().getProjectById(id);
          if (!project) return undefined;
          
          const stats = mockProjectStats[id];
          if (!stats) return undefined;
          
          return {
            ...project,
            stats
          };
        },

        // 一括操作
        bulkUpdateProjects: (ids, updates) => {
          try {
            if (!Array.isArray(ids) || ids.length === 0) {
              get().setError('更新対象のプロジェクトIDが指定されていません');
              return;
            }

            if (!updates || typeof updates !== 'object') {
              get().setError('更新データが無効です');
              return;
            }

            const { projects } = get();
            const existingIds = projects.map(p => p.id);
            const invalidIds = ids.filter(id => !existingIds.includes(id));
            
            if (invalidIds.length > 0) {
              console.warn('Invalid project IDs in bulk update:', invalidIds);
            }

            const updatedProjects = projects.map(project => {
              if (!ids.includes(project.id)) {
                return project;
              }

              // 更新データのバリデーション
              const validatedUpdates = { ...updates };
              
              // 名前の検証
              if (validatedUpdates.name !== undefined) {
                if (!validatedUpdates.name || validatedUpdates.name.trim() === '') {
                  console.warn(`Invalid name in bulk update for project ${project.id}`);
                  delete validatedUpdates.name; // 無効な名前は除外
                } else {
                  validatedUpdates.name = validatedUpdates.name.trim();
                }
              }

              // 日付の検証
              ['startDate', 'endDate', 'deadline'].forEach(dateField => {
                const dateValue = validatedUpdates[dateField as keyof typeof validatedUpdates] as Date | undefined;
                if (dateValue && !(dateValue instanceof Date) || (dateValue && isNaN(dateValue.getTime()))) {
                  console.warn(`Invalid ${dateField} in bulk update for project ${project.id}`);
                  delete validatedUpdates[dateField as keyof typeof validatedUpdates];
                }
              });

              return {
                ...project,
                ...validatedUpdates,
                updatedAt: new Date(),
                updatedBy: 'current-user'
              };
            });
            
            get().clearError();
            set({ projects: updatedProjects }, false, 'bulkUpdateProjects');
          } catch (error) {
            console.error('Failed to bulk update projects:', error);
            get().setError('プロジェクトの一括更新に失敗しました');
          }
        },

        bulkDeleteProjects: (ids) => {
          try {
            if (!Array.isArray(ids) || ids.length === 0) {
              get().setError('削除対象のプロジェクトIDが指定されていません');
              return;
            }

            const { projects } = get();
            const existingIds = projects.map(p => p.id);
            const validIds = ids.filter(id => existingIds.includes(id));
            const invalidIds = ids.filter(id => !existingIds.includes(id));

            if (invalidIds.length > 0) {
              console.warn('Invalid project IDs in bulk delete:', invalidIds);
            }

            if (validIds.length === 0) {
              get().setError('削除可能なプロジェクトがありません');
              return;
            }

            const filteredProjects = projects.filter(project => !validIds.includes(project.id));
            const currentSelectedId = get().selectedProjectId;
            
            get().clearError();
            set(
              {
                projects: filteredProjects,
                selectedProjectId: (currentSelectedId && validIds.includes(currentSelectedId)) ? null : currentSelectedId
              },
              false,
              'bulkDeleteProjects'
            );
          } catch (error) {
            console.error('Failed to bulk delete projects:', error);
            get().setError('プロジェクトの一括削除に失敗しました');
          }
        },

        archiveProjects: (ids) => {
          get().bulkUpdateProjects(ids, { isArchived: true });
        },

        unarchiveProjects: (ids) => {
          get().bulkUpdateProjects(ids, { isArchived: false });
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
        loadMockData: () => {
          try {
            get().clearError();
            set({ projects: mockProjects }, false, 'loadMockData');
          } catch (error) {
            console.error('Failed to load mock data:', error);
            get().setError('モックデータの読み込みに失敗しました');
          }
        },

        resetStore: () => {
          set({
            projects: [],
            selectedProjectId: null,
            filter: defaultFilter,
            sort: defaultSort,
            isLoading: false,
            error: null
          }, false, 'resetStore');
        }
      }),
      {
        name: 'project-store',
        partialize: (state) => ({
          projects: state.projects,
          filter: state.filter,
          sort: state.sort
        }),
        // Date型の適切なシリアライズ・デシリアライズ処理
        serialize: (state) => {
          try {
            // partializeで指定した部分のみがstateに含まれる
            const serializedProjects = (state as any).projects?.map((project: Project) => ({
              ...project,
              // Date型フィールドを安全にシリアライズ
              createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : new Date().toISOString(),
              updatedAt: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : new Date().toISOString(),
              startDate: project.startDate instanceof Date ? project.startDate.toISOString() : project.startDate || undefined,
              endDate: project.endDate instanceof Date ? project.endDate.toISOString() : project.endDate || undefined,
              deadline: project.deadline instanceof Date ? project.deadline.toISOString() : project.deadline || undefined
            })) || [];
            
            return JSON.stringify({
              projects: serializedProjects,
              filter: (state as any).filter || defaultFilter,
              sort: (state as any).sort || defaultSort
            });
          } catch (error) {
            console.error('Failed to serialize project store:', error);
            // シリアライズに失敗した場合はデフォルト状態を返す
            return JSON.stringify({
              projects: [],
              filter: defaultFilter,
              sort: defaultSort
            });
          }
        },
        deserialize: (str) => {
          try {
            const parsed = JSON.parse(str);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.projects)) {
              const deserializedProjects = parsed.projects.map((project: any): Project => {
                // Date型フィールドを安全にデシリアライズ
                const safeParseDate = (dateValue: any): Date | undefined => {
                  if (!dateValue) return undefined;
                  if (dateValue instanceof Date) return dateValue;
                  if (typeof dateValue === 'string') {
                    const parsed = new Date(dateValue);
                    return isNaN(parsed.getTime()) ? undefined : parsed;
                  }
                  return undefined;
                };

                return {
                  ...project,
                  createdAt: safeParseDate(project.createdAt) || new Date(),
                  updatedAt: safeParseDate(project.updatedAt) || new Date(),
                  startDate: safeParseDate(project.startDate),
                  endDate: safeParseDate(project.endDate),
                  deadline: safeParseDate(project.deadline)
                };
              });
              return {
                ...parsed,
                projects: deserializedProjects
              };
            }
            // データ形式が不正な場合はデフォルト状態を返す
            return {
              projects: [],
              filter: defaultFilter,
              sort: defaultSort
            };
          } catch (error) {
            console.error('Failed to deserialize project store:', error);
            return {
              projects: [],
              filter: defaultFilter,
              sort: defaultSort
            };
          }
        }
      }
    ),
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
    const active = projects.filter(project => project.status === 'active').length;
    const completed = projects.filter(project => project.status === 'completed').length;
    const planning = projects.filter(project => project.status === 'planning').length;
    const onHold = projects.filter(project => project.status === 'on_hold').length;
    const cancelled = projects.filter(project => project.status === 'cancelled').length;
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
          status: project.status || 'planning'
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