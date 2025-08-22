/**
 * コンパクトタスクカードコンポーネント
 */

import React from 'react';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';

interface TaskCardCompactProps {
  task: Task;
  onClick?: (task: Task) => void;
  onTagClick?: (tagId: string) => void;
}

/**
 * コンパクト版のタスクカード
 * TaskCardコンポーネントのcompact=trueラッパー
 */
export const TaskCardCompact: React.FC<TaskCardCompactProps> = React.memo(({
  task,
  onClick,
  onTagClick
}) => {
  return (
    <TaskCard
      task={task}
      onClick={onClick}
      onTagClick={onTagClick}
      compact={true}
      isCollapsed={true} // コンパクト版では常に折り畳み
    />
  );
});