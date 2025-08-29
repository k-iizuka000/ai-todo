import React, { useState, useMemo } from 'react';
import { Plus, Search, Grid, List, Settings, Users, MoreVertical } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { ProjectCreateModal, ProjectSettings, ProjectCard } from '../components/project';
import { useProjects, useCreateProject, useDeleteProject, useBulkUpdateProjects } from '../hooks/useProjects';
import { useProjectStore, useProjectQueryParams, useProjectUI, useSelectedProjectIds } from '../stores/projectStoreHybrid';
import { useProjectPermissions, useProjectUI as useProjectUIPermissions } from '../hooks/useProjectPermissions';
import type { 
  ProjectWithDetails, 
  CreateProjectInput, 
  UpdateProjectInput, 
  mapToLegacyStatus, 
  mapToLegacyPriority 
} from '../types/project';
import { toast } from 'react-hot-toast';

/**
 * プロジェクト管理画面 (Hybrid版: React Query + Zustand)
 * 既存のMock版との互換性を維持しながら、DB統合を実現
 */
export const ProjectManagementHybrid: React.FC = () => {
  // Zustandストア（UI状態管理）
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    showCreateModal,
    openCreateModal,
    closeCreateModal,
    showSettingsModal,
    openSettingsModal,
    closeSettingsModal,
    selectedProjectId,
    setSelectedProject,
  } = useProjectStore();

  const selectedProjectIds = useSelectedProjectIds();
  const queryParams = useProjectQueryParams();

  // React Query（サーバー状態管理）
  const {
    data: projectsResponse,
    isLoading,
    error,
    refetch
  } = useProjects(queryParams);

  const createProjectMutation = useCreateProject();
  const deleteProjectMutation = useDeleteProject();
  const bulkUpdateMutation = useBulkUpdateProjects();

  // データの取得
  const projects = projectsResponse?.projects || [];
  const pagination = projectsResponse?.pagination;

  // 統計情報の計算
  const projectStats = useMemo(() => {
    if (!projects.length) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        planning: 0,
        onHold: 0,
        cancelled: 0,
        archived: 0,
      };
    }

    return {
      total: projects.length,
      active: projects.filter(p => p.status === 'ACTIVE').length,
      completed: projects.filter(p => p.status === 'COMPLETED').length,
      planning: projects.filter(p => p.status === 'PLANNING').length,
      onHold: projects.filter(p => p.status === 'ON_HOLD').length,
      cancelled: projects.filter(p => p.status === 'CANCELLED').length,
      archived: projects.filter(p => p.isArchived).length,
    };
  }, [projects]);

  // 選択されたプロジェクトの詳細
  const selectedProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // イベントハンドラー
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreateProject = async (projectData: CreateProjectInput) => {
    try {
      await createProjectMutation.mutateAsync(projectData);
      closeCreateModal();
      toast.success('プロジェクトが作成されました');
    } catch (error) {
      console.error('Project creation failed:', error);
      toast.error('プロジェクトの作成に失敗しました');
    }
  };

  const handleUpdateProject = (id: string, updates: UpdateProjectInput) => {
    console.log('Updating project:', id, updates);
    // 実際の更新処理はProjectSettingsコンポーネント内で実行
  };

  const handleProjectSelect = (project: ProjectWithDetails) => {
    setSelectedProject(project.id);
  };

  const handleProjectClick = (project: ProjectWithDetails) => {
    console.log('Project clicked:', project);
    // プロジェクト詳細画面への遷移やモーダル表示
  };

  const handleSettingsClick = (project: ProjectWithDetails) => {
    setSelectedProject(project.id);
    openSettingsModal();
  };

  const handleArchiveClick = async (project: ProjectWithDetails) => {
    try {
      await bulkUpdateMutation.mutateAsync({
        projectIds: [project.id],
        updates: { isArchived: !project.isArchived }
      });
      
      const action = project.isArchived ? '復元' : 'アーカイブ';
      toast.success(`プロジェクトを${action}しました`);
    } catch (error) {
      console.error('Archive operation failed:', error);
      toast.error('操作に失敗しました');
    }
  };

  const handleDeleteClick = async (project: ProjectWithDetails) => {
    if (window.confirm(`「${project.name}」を削除しますか？この操作は取り消せません。`)) {
      try {
        await deleteProjectMutation.mutateAsync(project.id);
        toast.success('プロジェクトを削除しました');
      } catch (error) {
        console.error('Project deletion failed:', error);
        toast.error('プロジェクトの削除に失敗しました');
      }
    }
  };

  // ローディング状態
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
          <p className="text-red-600 mt-1">プロジェクトの読み込みに失敗しました。</p>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            再試行
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">プロジェクト</h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          新規プロジェクト
        </Button>
      </div>

      {/* プロジェクト統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">総プロジェクト数</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projectStats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブ</h3>
          <p className="text-2xl font-bold text-green-600">{projectStats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">計画中</h3>
          <p className="text-2xl font-bold text-yellow-600">{projectStats.planning}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">完了済み</h3>
          <p className="text-2xl font-bold text-blue-600">{projectStats.completed}</p>
        </div>
      </div>

      {/* プロジェクト作成モーダル */}
      <ProjectCreateModal
        open={showCreateModal}
        onOpenChange={closeCreateModal}
        onCreateProject={handleCreateProject}
      />
    </div>
  );
};