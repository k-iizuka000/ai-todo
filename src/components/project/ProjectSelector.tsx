import React, { useState } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';
import { Project } from '@/types/project';
import { mockProjects } from '@/mock/projects';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectSelectorProps {
  selectedProject?: Project;
  selectedProjectId?: string | null;  // 新規追加：ID直接指定
  onProjectSelect: (project: Project | null) => void;
  onProjectIdSelect?: (projectId: string | null) => void;  // 新規追加
  onCreateProject?: () => void;
  allowNone?: boolean;  // 新規追加：「プロジェクトなし」許可
  noneLabel?: string;   // 新規追加：「プロジェクトなし」表示ラベル
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

/**
 * プロジェクト選択UI
 * ドロップダウンでプロジェクトを選択し、新規作成ボタンも提供
 */
export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  selectedProject,
  selectedProjectId,
  onProjectSelect,
  onProjectIdSelect,
  onCreateProject,
  allowNone = false,
  noneLabel = 'プロジェクトを設定しない',
  className,
  disabled = false,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const projects = mockProjects.filter(p => !p.isArchived);

  // プロパティのバリデーション
  if (selectedProject && selectedProjectId !== undefined) {
    console.warn('ProjectSelector: selectedProject と selectedProjectId の両方が提供されています。selectedProject が優先されます。');
  }

  // 現在の選択状態を決定
  const getCurrentSelectedProject = (): Project | null => {
    if (selectedProject) {
      return selectedProject;
    }
    if (selectedProjectId === null) {
      return null;
    }
    if (selectedProjectId) {
      const foundProject = projects.find(p => p.id === selectedProjectId);
      if (!foundProject) {
        console.warn(`ProjectSelector: 指定されたprojectId "${selectedProjectId}" が見つかりません。`);
      }
      return foundProject || null;
    }
    return null;
  };

  const currentSelectedProject = getCurrentSelectedProject();

  const getStatusDisplay = (status: string) => {
    const statusMap = {
      planning: '計画中',
      active: 'アクティブ',
      on_hold: '保留中',
      completed: '完了',
      cancelled: 'キャンセル',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      planning: 'text-blue-600 bg-blue-50',
      active: 'text-green-600 bg-green-50',
      on_hold: 'text-yellow-600 bg-yellow-50',
      completed: 'text-gray-600 bg-gray-50',
      cancelled: 'text-red-600 bg-red-50',
    };
    return colorMap[status as keyof typeof colorMap] || 'text-gray-600 bg-gray-50';
  };

  const getPriorityColor = (priority: string) => {
    const colorMap = {
      low: 'border-l-blue-400',
      medium: 'border-l-yellow-400',
      high: 'border-l-orange-400',
      critical: 'border-l-red-400',
    };
    return colorMap[priority as keyof typeof colorMap] || 'border-l-gray-400';
  };

  const handleProjectSelect = (project: Project, event?: React.MouseEvent) => {
    // 修正: イベント伝播の明示的制御（Issue 036対応）
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    onProjectSelect(project);
    if (onProjectIdSelect) {
      onProjectIdSelect(project.id);
    }
    setIsOpen(false);
  };

  const handleNoneSelect = (event?: React.MouseEvent) => {
    // 修正: イベント伝播の明示的制御（Issue 036対応）
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (onProjectIdSelect) {
      onProjectIdSelect(null);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('relative w-full max-w-sm', className)}>
      {/* セレクタボタン */}
      <Button
        variant="outline"
        className={cn(
          'w-full justify-between h-auto p-3',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-primary/20'
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center space-x-2 min-w-0">
          {currentSelectedProject ? (
            <>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentSelectedProject.color }}
              />
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium truncate">{currentSelectedProject.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getStatusDisplay(currentSelectedProject.status)}
                </p>
              </div>
            </>
          ) : selectedProjectId === null && allowNone ? (
            <>
              <Check className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{noneLabel}</span>
            </>
          ) : (
            <span className="text-muted-foreground">プロジェクトを選択</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform flex-shrink-0',
            isOpen && 'transform rotate-180'
          )}
        />
      </Button>

      {/* ドロップダウンメニュー */}
      {isOpen && !disabled && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-64 overflow-auto">

            {/* プロジェクトなしオプション */}
            {allowNone && (
              <button
                onClick={(e) => handleNoneSelect(e)}
                className={cn(
                  'w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center space-x-2',
                  onCreateProject && 'border-b border-border',
                  currentSelectedProject === null && 'bg-muted/30'
                )}
              >
                <Check className={cn(
                  'h-4 w-4 flex-shrink-0',
                  currentSelectedProject === null ? 'text-primary' : 'text-transparent'
                )} />
                <span className="text-muted-foreground">{noneLabel}</span>
              </button>
            )}

            {/* 新規作成ボタン */}
            {onCreateProject && (
              <>
                <button
                  onClick={(e) => {
                    // 修正: イベント伝播の明示的制御（Issue 036対応）
                    e.preventDefault();
                    e.stopPropagation();
                    onCreateProject();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center space-x-2 border-b border-border"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">新規プロジェクト作成</span>
                </button>
              </>
            )}

            {/* プロジェクトなしオプション */}
            {allowClear && selectedProject && (
              <button
                onClick={(e) => {
                  // 修正: イベント伝播の明示的制御（Issue 036対応）
                  e.preventDefault();
                  e.stopPropagation();
                  onProjectSelect(null);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between border-b border-border"
              >
                <div className="flex items-center space-x-3">
                  <X className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">プロジェクトなし</span>
                </div>
              </button>
            )}

            {/* プロジェクトリスト */}
            {projects.length === 0 ? (
              <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                利用可能なプロジェクトがありません
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={(e) => handleProjectSelect(project, e)}
                  className={cn(
                    'w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between border-l-4',
                    getPriorityColor(project.priority),
                    currentSelectedProject?.id === project.id && 'bg-muted/30'
                  )}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium truncate">{project.name}</p>
                        {project.icon && (
                          <span className="text-sm flex-shrink-0">{project.icon}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            getStatusColor(project.status)
                          )}
                        >
                          {getStatusDisplay(project.status)}
                        </span>
                        {project.tags.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {project.tags.slice(0, 2).join(', ')}
                            {project.tags.length > 2 && '...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {currentSelectedProject?.id === project.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};