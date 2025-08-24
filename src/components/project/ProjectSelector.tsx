import React, { useState } from 'react';
import { ChevronDown, Check, Plus, X } from 'lucide-react';
import { Project } from '@/types/project';
import { mockProjects } from '@/mock/projects';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectSelectorProps {
  selectedProject?: Project;
  onProjectSelect: (project: Project | null) => void;
  onCreateProject?: () => void;
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
  onProjectSelect,
  onCreateProject,
  className,
  disabled = false,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const projects = mockProjects.filter(p => !p.isArchived);

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

  const handleProjectSelect = (project: Project) => {
    onProjectSelect(project);
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
          {selectedProject ? (
            <>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedProject.color }}
              />
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium truncate">{selectedProject.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getStatusDisplay(selectedProject.status)}
                </p>
              </div>
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
            {/* 新規作成ボタン */}
            {onCreateProject && (
              <>
                <button
                  onClick={() => {
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
                onClick={() => {
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
                  onClick={() => handleProjectSelect(project)}
                  className={cn(
                    'w-full px-3 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between border-l-4',
                    getPriorityColor(project.priority),
                    selectedProject?.id === project.id && 'bg-muted/30'
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
                  {selectedProject?.id === project.id && (
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