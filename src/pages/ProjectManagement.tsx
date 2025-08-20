import React, { useState } from 'react';
import { Plus, Search, Grid, List } from 'lucide-react';
import { ProjectWithFullDetails, CreateProjectInput, UpdateProjectInput } from '@/types/project';
import { mockProjectsWithStats, searchProjects, getActiveProjects } from '@/mock/projectsWithStats';
import { ProjectSelector, ProjectCreateModal, ProjectSettings, ProjectCard } from '@/components/project';
import { Button, Input } from '@/components/ui';

/**
 * プロジェクト管理デモページ
 */
export const ProjectManagement: React.FC = () => {
  const [projects] = useState(mockProjectsWithStats);
  const [filteredProjects, setFilteredProjects] = useState(mockProjectsWithStats);
  const [selectedProject, setSelectedProject] = useState<ProjectWithFullDetails | undefined>(projects[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // 検索機能
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(searchProjects(query));
    }
  };

  const handleCreateProject = (projectData: CreateProjectInput) => {
    console.log('Creating project:', projectData);
    // ここで実際のプロジェクト作成処理を行う
    setShowCreateModal(false);
  };

  const handleUpdateProject = (id: string, updates: UpdateProjectInput) => {
    console.log('Updating project:', id, updates);
    // ここで実際のプロジェクト更新処理を行う
  };

  const handleProjectSelect = (project: ProjectWithFullDetails) => {
    setSelectedProject(project);
  };

  const handleProjectClick = (project: ProjectWithFullDetails) => {
    console.log('Project clicked:', project);
    // プロジェクト詳細画面への遷移やモーダル表示などの処理
  };

  const handleSettingsClick = (project: ProjectWithFullDetails) => {
    setSelectedProject(project);
    setShowSettings(true);
  };

  const handleArchiveClick = (project: ProjectWithFullDetails) => {
    console.log('Archive project:', project);
  };

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">プロジェクト</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規プロジェクト
        </Button>
      </div>

      {/* 検索とビュー切り替え */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="プロジェクトを検索..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* プロジェクト統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">総プロジェクト数</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projects.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">アクティブ</h3>
          <p className="text-2xl font-bold text-green-600">
            {projects.filter(p => p.status === 'active').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">計画中</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {projects.filter(p => p.status === 'planning').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">完了済み</h3>
          <p className="text-2xl font-bold text-blue-600">
            {projects.filter(p => p.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* プロジェクト一覧 */}
      <div className="space-y-6">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={handleProjectClick}
                onSettingsClick={handleSettingsClick}
                onArchiveClick={handleArchiveClick}
                showStats={true}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={handleProjectClick}
                onSettingsClick={handleSettingsClick}
                onArchiveClick={handleArchiveClick}
                variant="compact"
                showStats={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* 空の状態 */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery ? '検索結果が見つかりませんでした' : 'プロジェクトがありません'}
          </div>
          {!searchQuery && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              最初のプロジェクトを作成
            </Button>
          )}
        </div>
      )}

      {/* プロジェクト作成モーダル */}
      <ProjectCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateProject={handleCreateProject}
      />

      {/* プロジェクト設定 */}
      {selectedProject && showSettings && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-4 bg-background border rounded-lg overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">プロジェクト設定</h2>
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  閉じる
                </Button>
              </div>
              <ProjectSettings
                project={selectedProject}
                onUpdateProject={handleUpdateProject}
                onArchiveProject={handleArchiveClick}
                onDeleteProject={(id) => console.log('Delete project:', id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};