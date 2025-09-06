/**
 * コンパクトタスクカードコンポーネント
 */

import React from 'react';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';
import { safeGetTime } from '@/utils/dateUtils';

interface TaskCardCompactProps {
  task: Task;
  onClick?: (task: Task) => void;
  onTagClick?: (tagId: string) => void;
  onProjectClick?: (projectId: string) => void;
}

/**
 * TaskCardCompact用のカスタム比較関数
 * 日付フィールドの型安全な比較を行い、React.memoでの比較エラーを防ぐ
 */
const areTaskCardCompactPropsEqual = (prevProps: TaskCardCompactProps, nextProps: TaskCardCompactProps): boolean => {
  // 基本プロパティの比較
  if (prevProps.onClick !== nextProps.onClick ||
      prevProps.onTagClick !== nextProps.onTagClick ||
      prevProps.onProjectClick !== nextProps.onProjectClick) {
    return false;
  }

  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  // タスクの基本フィールド比較
  if (prevTask.id !== nextTask.id ||
      prevTask.title !== nextTask.title ||
      prevTask.description !== nextTask.description ||
      prevTask.status !== nextTask.status ||
      prevTask.priority !== nextTask.priority ||
      prevTask.projectId !== nextTask.projectId ||
      prevTask.assigneeId !== nextTask.assigneeId ||
      prevTask.estimatedHours !== nextTask.estimatedHours ||
      prevTask.actualHours !== nextTask.actualHours ||
      prevTask.createdBy !== nextTask.createdBy ||
      prevTask.updatedBy !== nextTask.updatedBy) {
    return false;
  }

  // 日付フィールドの型安全な比較
  const prevDueTime = safeGetTime(prevTask.dueDate);
  const nextDueTime = safeGetTime(nextTask.dueDate);
  const prevCreatedTime = safeGetTime(prevTask.createdAt);
  const nextCreatedTime = safeGetTime(nextTask.createdAt);
  const prevUpdatedTime = safeGetTime(prevTask.updatedAt);
  const nextUpdatedTime = safeGetTime(nextTask.updatedAt);
  const prevArchivedTime = safeGetTime(prevTask.archivedAt);
  const nextArchivedTime = safeGetTime(nextTask.archivedAt);

  if (prevDueTime !== nextDueTime ||
      prevCreatedTime !== nextCreatedTime ||
      prevUpdatedTime !== nextUpdatedTime ||
      prevArchivedTime !== nextArchivedTime) {
    return false;
  }

  // タグ配列の比較（コンパクト版では表示制限あり、安全なアクセス）
  const prevTags = prevTask.tags || [];
  const nextTags = nextTask.tags || [];
  if (prevTags.length !== nextTags.length) {
    return false;
  }
  for (let i = 0; i < Math.min(prevTags.length, 1); i++) {
    const prevTag = prevTags[i];
    const nextTag = nextTags[i];
    if (!prevTag || !nextTag ||
        prevTag.id !== nextTag.id ||
        prevTag.name !== nextTag.name ||
        prevTag.color !== nextTag.color) {
      return false;
    }
  }

  // サブタスク配列の比較（コンパクト版では非表示だが一応、安全なアクセス）
  const prevSubtasks = prevTask.subtasks || [];
  const nextSubtasks = nextTask.subtasks || [];
  if (prevSubtasks.length !== nextSubtasks.length) {
    return false;
  }

  return true;
};

/**
 * コンパクト版のタスクカード
 * TaskCardコンポーネントのcompact=trueラッパー
 */
export const TaskCardCompact: React.FC<TaskCardCompactProps> = React.memo(({
  task,
  onClick,
  onTagClick,
  onProjectClick
}) => {
  return (
    <TaskCard
      task={task}
      onClick={onClick}
      onTagClick={onTagClick}
      onProjectClick={onProjectClick}
      compact={true}
      isCollapsed={true} // コンパクト版では常に折り畳み
    />
  );
}, areTaskCardCompactPropsEqual);

TaskCardCompact.displayName = 'TaskCardCompact';