import React, { useState, useEffect } from 'react';
import { Plus, Search, Grid, List } from 'lucide-react';
import { Project, ProjectWithFullDetails, CreateProjectInput, UpdateProjectInput, mapFromLegacyStatus, mapFromLegacyPriority } from '@/types/project';
import { projectsAPI } from '@/lib/api/projects';
import { ProjectSelector, ProjectCreateModal, ProjectSettings, ProjectCard } from '@/components/project';
import { Button, Input } from '@/components/ui';

/**
 * プロジェクト管理デモページ
 */
export const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<ProjectWithFullDetails[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithFullDetails[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithFullDetails | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // プロジェクト一覧をAPIから読み込む
  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const projectsData = await projectsAPI.getAll({
        includeStats: true,
        includeMembers: true,
        includeTags: true
      });
      // APIレスポンス構造を確認してデータを取得
      const projectsArray = Array.isArray(projectsData) ? projectsData : projectsData.data || [];
      // データをProjectWithFullDetails型に変換（必要に応じて）
      const convertedProjects = projectsArray as ProjectWithFullDetails[];
      setProjects(convertedProjects);
      setFilteredProjects(convertedProjects);
      if (convertedProjects.length > 0 && !selectedProject) {
        setSelectedProject(convertedProjects[0]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('プロジェクトの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    loadProjects();
  }, []);

  // 検索機能
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const filtered = (Array.isArray(projects) ? projects : []).filter(project =>
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredProjects(filtered);
    }
  };

  const handleCreateProject = async (projectData: CreateProjectInput) => {
    // 楽観的更新用の仮プロジェクト作成
    const optimisticProject: ProjectWithFullDetails = {
      id: `temp-${Date.now()}`,
      name: projectData.name,
      description: projectData.description || '',
      status: projectData.status || 'PLANNING',
      priority: projectData.priority || 'MEDIUM',
      color: projectData.color || '#3B82F6',
      icon: projectData.icon || '📋',
      ownerId: 'current-user',
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      deadline: projectData.deadline,
      budget: projectData.budget,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'current-user',
      updatedBy: 'current-user',
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
      },
      members: [],
      recentTasks: [],
      views: []
    };
    
    try {
      console.log('Creating project:', projectData);
      
      // 楽観的更新: UIに即座に反映
      const currentProjects = [...projects];
      const updatedProjects = [optimisticProject, ...currentProjects];
      setProjects(updatedProjects);
      setFilteredProjects(searchQuery ? updatedProjects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) : updatedProjects);
      
      // 型マッピングを適用してバックエンド形式に変換
      const mappedData: CreateProjectInput = {
        ...projectData,
        status: projectData.status ? mapFromLegacyStatus(projectData.status as string) : 'PLANNING',
        priority: projectData.priority ? mapFromLegacyPriority(projectData.priority as string) : 'MEDIUM'
      };
      
      const newProject = await projectsAPI.create(mappedData);
      console.log('Project created successfully:', newProject);
      
      // 成功通知を表示
      setSuccessMessage(`プロジェクト「${newProject.name}」を作成しました`);
      
      // サーバーからの最新データで更新
      await loadProjects();
      
      // 3秒後に成功メッセージを自動で消す
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      console.error('Failed to create project:', err);
      
      // 楽観的更新をロールバック
      setProjects(projects);
      setFilteredProjects(searchQuery ? (Array.isArray(projects) ? projects : []).filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) : projects);
      
      setError('プロジェクトの作成に失敗しました。');
      throw err; // ProjectCreateModalでキャッチするためにエラーを再スロー
    }
  };

  const handleUpdateProject = (id: string, updates: UpdateProjectInput) => {
    console.log('Updating project:', id, updates);
    // ここで実際のプロジェクト更新処理を行う
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

  const handleArchiveById = (id: string) => {
    console.log('Archive project by id:', id);
  };

  return (
    <div className="p-6">
      {/* 成功メッセージ表示 */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center">
              <span className="mr-2">✓</span>
              {successMessage}
            </p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="text-sm text-green-600 dark:text-green-400 underline hover:no-underline"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
      
      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          <button 
            onClick={() => { setError(null); loadProjects(); }}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            再試行
          </button>
        </div>
      )}
      
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">プロジェクト</h1>
        <Button 
          onClick={() => setShowCreateModal(true)}
          disabled={isLoading}
        >
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
            {(Array.isArray(projects) ? projects : []).filter(p => p.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">計画中</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {(Array.isArray(projects) ? projects : []).filter(p => p.status === 'PLANNING').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">完了済み</h3>
          <p className="text-2xl font-bold text-blue-600">
            {(Array.isArray(projects) ? projects : []).filter(p => p.status === 'COMPLETED').length}
          </p>
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">プロジェクトを読み込んでいます...</p>
        </div>
      )}
      
      {/* プロジェクト一覧 */}
      {!isLoading && (
        <div className="space-y-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project as Project}
                  onClick={() => handleProjectClick(project)}
                  onSettingsClick={() => handleSettingsClick(project)}
                  onArchiveClick={() => handleArchiveClick(project)}
                  showStats={true}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project as Project}
                  onClick={() => handleProjectClick(project)}
                  onSettingsClick={() => handleSettingsClick(project)}
                  onArchiveClick={() => handleArchiveClick(project)}
                  variant="compact"
                  showStats={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 空の状態 */}
      {!isLoading && filteredProjects.length === 0 && !error && (
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
                onArchiveProject={handleArchiveById}
                onDeleteProject={(id: string) => console.log('Delete project:', id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};