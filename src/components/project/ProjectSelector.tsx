import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Check, Plus, X, Loader2 } from 'lucide-react';
import { Project } from '@/types/project';
import { mockProjects } from '@/mock/projects';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  updateButtonDisplay, 
  getSelectorState, 
  showSelectionState,
  getStateIcon,
  getAriaAttributes 
} from '@/utils/selectorUtils';
import { createStopPropagationClickHandler } from '@/utils/eventUtils';

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
  isLoading?: boolean;  // 新規追加：ローディング状態
  error?: string;       // 新規追加：エラーメッセージ
  onRetry?: () => void; // 新規追加：再試行コールバック
  enableFallback?: boolean; // 新規追加：フォールバック表示を有効にする
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
  isLoading = false,
  error,
  onRetry,
  enableFallback = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [displayText, setDisplayText] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [hasAttemptedReload, setHasAttemptedReload] = useState(false);
  
  // プロジェクトデータの取得（エラー時のフォールバック含む）
  const projects = useMemo(() => {
    try {
      const availableProjects = mockProjects.filter(p => !p.isArchived);
      
      // エラー状態でもフォールバック表示を有効にする場合
      if (error && enableFallback && availableProjects.length === 0) {
        return [{
          id: 'fallback',
          name: 'プロジェクトを選択',
          color: '#808080',
          status: 'active' as const,
          priority: 'medium' as const,
          tags: [],
          isArchived: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }];
      }
      
      return availableProjects;
    } catch (err) {
      console.error('プロジェクトデータの取得に失敗:', err);
      return enableFallback ? [{
        id: 'fallback',
        name: 'プロジェクトを選択',
        color: '#808080',
        status: 'active' as const,
        priority: 'medium' as const,
        tags: [],
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }] : [];
    }
  }, [error, enableFallback]);

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

  // 表示テキストの更新ロジック（selectorUtilsを使用）
  useEffect(() => {
    const newDisplayText = updateButtonDisplay({
      project: currentSelectedProject,
      projectId: selectedProjectId,
      isLoading,
      error,
      allowNone,
      noneLabel,
      placeholder: 'プロジェクトを選択'
    });
    setDisplayText(newDisplayText);
  }, [currentSelectedProject, selectedProjectId, isLoading, error, allowNone, noneLabel]);

  // 視覚的フィードバック状態の決定（selectorUtilsを使用）
  const visualState = getSelectorState({
    isLoading,
    error,
    hasSelection: !!currentSelectedProject,
    isOpen
  });

  // 再試行処理
  const handleRetry = useCallback(() => {
    if (onRetry && retryCount < 3) {
      setRetryCount(prev => prev + 1);
      setHasAttemptedReload(true);
      onRetry();
    }
  }, [onRetry, retryCount]);

  // エラー状態での自動回復試行
  useEffect(() => {
    if (error && !hasAttemptedReload && enableFallback && retryCount === 0) {
      const timer = setTimeout(() => {
        handleRetry();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error, hasAttemptedReload, enableFallback, retryCount, handleRetry]);

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

  const handleProjectSelect = useCallback((project: Project, event?: React.MouseEvent) => {
    // 修正: イベント伝播の明示的制御（Issue 036対応）
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // 状態の同期順序を改善
    // 1. まずプロップス経由でコールバックを呼び出し
    onProjectSelect(project);
    if (onProjectIdSelect) {
      onProjectIdSelect(project.id);
    }
    
    // 2. 次にローカル状態を更新
    setIsOpen(false);
    
    // 3. 表示テキストを即座に更新（レスポンス性向上）
    const newDisplayText = updateButtonDisplay({
      project,
      isLoading,
      error,
      allowNone,
      noneLabel,
      placeholder: 'プロジェクトを選択'
    });
    setDisplayText(newDisplayText);
  }, [onProjectSelect, onProjectIdSelect, isLoading, error, allowNone, noneLabel]);

  // Enhanced event handlers using eventUtils
  const handleProjectSelectWithStopPropagation = useCallback(
    createStopPropagationClickHandler((event) => {
      const projectId = event.currentTarget.getAttribute('data-project-id');
      const project = projects.find(p => p.id === projectId);
      if (project) {
        handleProjectSelect(project, event);
      }
    }),
    [projects, handleProjectSelect]
  );

  const handleNoneSelect = useCallback((event?: React.MouseEvent) => {
    // 修正: イベント伝播の明示的制御（Issue 036対応）
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // 状態の同期順序を改善
    // 1. まずプロップス経由でコールバックを呼び出し
    onProjectSelect(null);
    if (onProjectIdSelect) {
      onProjectIdSelect(null);
    }
    
    // 2. 次にローカル状態を更新
    setIsOpen(false);
    
    // 3. 表示テキストを即座に更新
    const newDisplayText = updateButtonDisplay({
      project: null,
      projectId: null,
      isLoading,
      error,
      allowNone,
      noneLabel,
      placeholder: 'プロジェクトを選択'
    });
    setDisplayText(newDisplayText);
  }, [onProjectSelect, onProjectIdSelect, isLoading, error, allowNone, noneLabel]);

  return (
    <div className={cn('relative w-full max-w-sm', className)} data-combobox>
      {/* セレクタボタン */}
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full justify-between h-auto p-3',
          disabled && 'opacity-50 cursor-not-allowed',
          showSelectionState(visualState)
        )}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        data-combobox
        {...getAriaAttributes({
          state: visualState,
          isExpanded: isOpen,
          hasSelection: !!currentSelectedProject,
          errorMessage: error
        })}
      >
        <div className="flex items-center space-x-2 min-w-0">
          {visualState === 'loading' ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />
              <span className="text-blue-600">{displayText}</span>
            </>
          ) : visualState === 'error' ? (
            <>
              <X className="h-3 w-3 text-red-500 flex-shrink-0" />
              <span className="text-red-600">{displayText}</span>
            </>
          ) : currentSelectedProject ? (
            <>
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: currentSelectedProject.color }}
              />
              <div className="text-left min-w-0 flex-1">
                <p className="font-medium truncate text-primary">{displayText}</p>
                <p className="text-xs text-muted-foreground">
                  {getStatusDisplay(currentSelectedProject.status)}
                </p>
              </div>
            </>
          ) : selectedProjectId === null && allowNone ? (
            <>
              <Check className="h-3 w-3 text-primary flex-shrink-0" />
              <span className="text-primary">{displayText}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{displayText}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform flex-shrink-0',
            getStateIcon(visualState)
          )}
        />
      </Button>

      {/* エラー表示と再試行 */}
      {error && visualState === 'error' && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <X className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">
                {error || 'プロジェクトの読み込みに失敗しました'}
              </span>
            </div>
            {onRetry && retryCount < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="text-red-600 border-red-300 hover:bg-red-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    再試行中...
                  </>
                ) : (
                  '再試行'
                )}
              </Button>
            )}
          </div>
          {retryCount > 0 && (
            <div className="mt-2 text-xs text-red-600">
              再試行回数: {retryCount}/3
            </div>
          )}
        </div>
      )}

      {/* ドロップダウンメニュー */}
      {isOpen && !disabled && !isLoading && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-64 overflow-auto" data-combobox>

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
              <div className="px-3 py-4 text-center">
                {error ? (
                  <div className="text-red-600 text-sm">
                    <X className="h-4 w-4 mx-auto mb-2" />
                    プロジェクトの読み込みに失敗しました
                    {onRetry && (
                      <button
                        onClick={handleRetry}
                        className="block mx-auto mt-2 text-xs text-red-600 hover:text-red-800 underline"
                        disabled={isLoading || retryCount >= 3}
                      >
                        再試行
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    利用可能なプロジェクトがありません
                  </div>
                )}
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  data-project-id={project.id}
                  data-combobox
                  onClick={handleProjectSelectWithStopPropagation}
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