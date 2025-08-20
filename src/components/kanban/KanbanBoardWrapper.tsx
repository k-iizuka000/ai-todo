/**
 * エラーバウンダリ付きカンバンボードラッパー
 */

import React from 'react';
import { Task, TaskStatus } from '@/types/task';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { KanbanErrorFallback } from './KanbanErrorFallback';
import { KanbanBoard } from './KanbanBoard';

interface KanbanBoardWrapperProps {
  tasks?: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  compact?: boolean;
  className?: string;
}

/**
 * エラーハンドリング機能付きカンバンボードラッパー
 */
export const KanbanBoardWrapper: React.FC<KanbanBoardWrapperProps> = (props) => {
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
      },
    });

    // 本来はここでエラーレポーティングサービスに送信
    if (process.env.NODE_ENV === 'production') {
      // 例: Sentry, LogRocket, etc.
      // errorReportingService.captureException(error, { extra: errorInfo });
    }
  };

  return (
    <ErrorBoundary 
      fallback={KanbanErrorFallback}
      onError={handleError}
    >
      <KanbanBoard {...props} />
    </ErrorBoundary>
  );
};