import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, type ProjectQueryParams, type ProjectsResponse } from '../api/projects';
import type {
  ProjectWithDetails,
  ProjectWithStats,
  ProjectStats,
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  UpdateProjectMemberInput,
  BulkUpdateProjectsInput
} from '../types/project';
import { toast } from 'react-hot-toast';

// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: ProjectQueryParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  detailWithStats: (id: string) => [...projectKeys.detail(id), 'stats'] as const,
  stats: () => [...projectKeys.all, 'stats'] as const,
  stat: (id: string) => [...projectKeys.stats(), id] as const,
} as const;

/**
 * プロジェクト一覧取得フック
 */
export const useProjects = (params: ProjectQueryParams = {}) => {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectsAPI.getProjects(params),
    staleTime: 5 * 60 * 1000, // 5分
    cacheTime: 10 * 60 * 1000, // 10分
    keepPreviousData: true, // ページネーション時に前のデータを保持
  });
};

/**
 * プロジェクト詳細取得フック
 */
export const useProject = (id: string, includeStats = false) => {
  return useQuery({
    queryKey: includeStats ? projectKeys.detailWithStats(id) : projectKeys.detail(id),
    queryFn: () => projectsAPI.getProjectById(id, includeStats),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2分
    cacheTime: 5 * 60 * 1000, // 5分
  });
};

/**
 * プロジェクト統計情報取得フック
 */
export const useProjectStats = (id: string) => {
  return useQuery({
    queryKey: projectKeys.stat(id),
    queryFn: () => projectsAPI.getProjectStats(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1分
    cacheTime: 3 * 60 * 1000, // 3分
  });
};

/**
 * プロジェクト作成フック
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) => projectsAPI.createProject(data),
    onSuccess: (newProject) => {
      // プロジェクト一覧を無効化
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      
      // 新しいプロジェクトをキャッシュに追加
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject);
      
      toast.success('プロジェクトが作成されました');
    },
    onError: (error: Error) => {
      toast.error(`プロジェクトの作成に失敗しました: ${error.message}`);
    },
  });
};

/**
 * プロジェクト更新フック
 */
export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProjectInput) => projectsAPI.updateProject(id, data),
    onMutate: async (newData) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(id) });
      
      const previousProject = queryClient.getQueryData<ProjectWithDetails>(projectKeys.detail(id));
      
      if (previousProject) {
        const optimisticProject: ProjectWithDetails = {
          ...previousProject,
          ...newData,
          updatedAt: new Date(),
        };
        queryClient.setQueryData(projectKeys.detail(id), optimisticProject);
      }
      
      return { previousProject };
    },
    onSuccess: (updatedProject) => {
      // プロジェクト詳細を更新
      queryClient.setQueryData(projectKeys.detail(id), updatedProject);
      
      // 統計付き詳細も更新（存在すれば）
      const existingWithStats = queryClient.getQueryData<ProjectWithStats>(projectKeys.detailWithStats(id));
      if (existingWithStats) {
        queryClient.setQueryData(projectKeys.detailWithStats(id), {
          ...updatedProject,
          stats: existingWithStats.stats,
        });
      }
      
      // プロジェクト一覧を無効化
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      
      toast.success('プロジェクトが更新されました');
    },
    onError: (error: Error, _, context) => {
      // Rollback optimistic update
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(id), context.previousProject);
      }
      
      toast.error(`プロジェクトの更新に失敗しました: ${error.message}`);
    },
  });
};

/**
 * プロジェクト削除フック
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectsAPI.deleteProject(id),
    onSuccess: (_, id) => {
      // キャッシュからプロジェクト詳細を削除
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      queryClient.removeQueries({ queryKey: projectKeys.detailWithStats(id) });
      queryClient.removeQueries({ queryKey: projectKeys.stat(id) });
      
      // プロジェクト一覧を無効化
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      
      toast.success('プロジェクトが削除されました');
    },
    onError: (error: Error) => {
      toast.error(`プロジェクトの削除に失敗しました: ${error.message}`);
    },
  });
};

/**
 * プロジェクト一括更新フック
 */
export const useBulkUpdateProjects = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkUpdateProjectsInput) => projectsAPI.bulkUpdateProjects(data),
    onSuccess: () => {
      // 全てのプロジェクト関連クエリを無効化
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      
      toast.success('プロジェクトが一括更新されました');
    },
    onError: (error: Error) => {
      toast.error(`一括更新に失敗しました: ${error.message}`);
    },
  });
};

/**
 * プロジェクトメンバー追加フック
 */
export const useAddProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddProjectMemberInput) => projectsAPI.addProjectMember(projectId, data),
    onSuccess: () => {
      // プロジェクト詳細を無効化（メンバーリストが更新される）
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detailWithStats(projectId) });
      
      toast.success('メンバーが追加されました');
    },
    onError: (error: Error) => {
      toast.error(`メンバーの追加に失敗しました: ${error.message}`);
    },
  });
};

/**
 * プロジェクトメンバー役割更新フック
 */
export const useUpdateProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateProjectMemberInput }) => 
      projectsAPI.updateProjectMember(projectId, userId, data),
    onSuccess: () => {
      // プロジェクト詳細を無効化
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detailWithStats(projectId) });
      
      toast.success('メンバーの役割が更新されました');
    },
    onError: (error: Error) => {
      toast.error(`メンバーの役割更新に失敗しました: ${error.message}`);
    },
  });
};

/**
 * プロジェクトメンバー削除フック
 */
export const useRemoveProjectMember = (projectId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => projectsAPI.removeProjectMember(projectId, userId),
    onSuccess: () => {
      // プロジェクト詳細を無効化
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detailWithStats(projectId) });
      
      toast.success('メンバーが削除されました');
    },
    onError: (error: Error) => {
      toast.error(`メンバーの削除に失敗しました: ${error.message}`);
    },
  });
};

/**
 * プロジェクト関連の全キャッシュを無効化するヘルパー関数
 */
export const useInvalidateProjects = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    invalidateList: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    invalidateProject: (id: string) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detailWithStats(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.stat(id) });
    },
  };
};