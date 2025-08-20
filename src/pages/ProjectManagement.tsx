import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Project, CreateProjectInput, UpdateProjectInput } from '@/types/project';
import { mockProjectsWithStats } from '@/mock/projects';
import { ProjectSelector, ProjectCreateModal, ProjectSettings, ProjectCard } from '@/components/project';
import { Button } from '@/components/ui/button';

/**
 * プロジェクト管理デモページ
 */
export const ProjectManagement: React.FC = () => {
  const [projects] = useState(mockProjectsWithStats);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(projects[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleCreateProject = (projectData: CreateProjectInput) => {
    console.log('Creating project:', projectData);
    // ここで実際のプロジェクト作成処理を行う
  };

  const handleUpdateProject = (id: string, updates: UpdateProjectInput) => {
    console.log('Updating project:', id, updates);
    // ここで実際のプロジェクト更新処理を行う
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
  };

  const handleProjectClick = (project: Project) => {
    console.log('Project clicked:', project);
  };

  const handleSettingsClick = (project: Project) => {
    setSelectedProject(project);
    setShowSettings(true);
  };

  const handleArchiveClick = (project: Project) => {
    console.log('Archive project:', project);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">プロジェクト管理</h1>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>新規プロジェクト</span>
        </Button>
      </div>

      {/* プロジェクト選択セクション */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">プロジェクト選択</h2>
        <div className="flex items-center space-x-4">
          <ProjectSelector
            selectedProject={selectedProject}
            onProjectSelect={handleProjectSelect}
            onCreateProject={() => setShowCreateModal(true)}
            className="w-80"
          />
          {selectedProject && (
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
            >
              設定
            </Button>
          )}
        </div>
      </div>

      {/* プロジェクトカード一覧 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">プロジェクト一覧</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
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
      </div>

      {/* コンパクト表示例 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">コンパクト表示</h2>
        <div className="space-y-2">
          {projects.slice(0, 3).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={handleProjectClick}
              variant="compact"
              showStats={true}
            />
          ))}
        </div>
      </div>

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