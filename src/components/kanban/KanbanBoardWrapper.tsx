/**
 * エラーバウンダリ付きカンバンボードラッパー
 * グループ4: プロジェクト表示動作確認機能を含む
 */

import React, { useCallback, useMemo } from 'react';
import { Task, TaskStatus } from '@/types/task';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { KanbanErrorFallback } from './KanbanErrorFallback';
import { KanbanBoard } from './KanbanBoard';
import { useProjectHelper } from '@/stores/projectStore';

interface KanbanBoardWrapperProps {
  tasks?: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  onTagClick?: (tagId: string) => void;
  onProjectClick?: (projectId: string) => void;
  compact?: boolean;
  className?: string;
}

/**
 * エラーハンドリング機能付きカンバンボードラッパー
 * グループ4: プロジェクト表示動作確認機能を含む
 */
export const KanbanBoardWrapper: React.FC<KanbanBoardWrapperProps> = (props) => {
  // プロジェクトストアからプロジェクト情報取得用ヘルパーを取得
  const { getProjectById } = useProjectHelper();

  // プロジェクト表示一貫性の確認：タスクのプロジェクトIDが有効かどうかをチェック
  const projectDisplayValidation = useMemo(() => {
    if (!props.tasks) return { validProjects: 0, invalidProjects: 0 };
    
    let validProjects = 0;
    let invalidProjects = 0;
    
    props.tasks.forEach(task => {
      if (task.projectId) {
        const project = getProjectById(task.projectId);
        if (project) {
          validProjects++;
        } else {
          invalidProjects++;
          console.warn(`Task ${task.id} references invalid project ${task.projectId}`);
        }
      }
    });
    
    return { validProjects, invalidProjects };
  }, [props.tasks, getProjectById]);

  // プロジェクトクリック時の動作確認
  const handleProjectClick = useCallback((projectId: string) => {
    const project = getProjectById(projectId);
    
    if (!project) {
      console.error(`Project with id ${projectId} not found`);
      return;
    }

    // プロジェクト表示動作確認ログ
    console.log('Project display verification:', {
      projectId,
      projectName: project.name,
      projectColor: project.color,
      projectIcon: project.icon,
      timestamp: new Date().toISOString(),
      action: 'project_badge_clicked'
    });

    // 親コンポーネントのコールバック呼び出し
    if (props.onProjectClick) {
      props.onProjectClick(projectId);
    }
  }, [getProjectById, props.onProjectClick]);

  // タスク移動時のプロジェクト表示維持確認
  const handleTaskMove = useCallback((taskId: string, newStatus: TaskStatus) => {
    const task = props.tasks?.find(t => t.id === taskId);
    if (task && task.projectId) {
      console.log('Drag & Drop project display verification:', {
        taskId,
        projectId: task.projectId,
        oldStatus: task.status,
        newStatus,
        timestamp: new Date().toISOString(),
        action: 'task_moved_with_project'
      });
    }

    // 親コンポーネントのコールバック呼び出し
    if (props.onTaskMove) {
      props.onTaskMove(taskId, newStatus);
    }
  }, [props.tasks, props.onTaskMove]);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // エラーログ
    console.error('Kanban Board Error:', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date().toISOString(),
      props: {
        tasksCount: props.tasks?.length || 0,
        compact: props.compact,
        projectValidation: projectDisplayValidation,
      },
    });

    // 本来はここでエラーレポーティングサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // 例: Sentry, LogRocket, etc.
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  };

  // 開発環境でのプロジェクト表示統計ログ
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Kanban Board Project Display Stats:', projectDisplayValidation);
    }
  }, [projectDisplayValidation]);

  return (
    <ErrorBoundary 
      fallback={KanbanErrorFallback}
      onError={handleError}
    >
      <KanbanBoard 
        {...props}
        onProjectClick={handleProjectClick}
        onTaskMove={handleTaskMove}
      />
    </ErrorBoundary>
  );
};