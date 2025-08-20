/**
 * コンパクトタスクカードコンポーネント
 */

import React from 'react';
import { Task } from '@/types/task';
import { TaskCard } from './TaskCard';

interface TaskCardCompactProps {
  task: Task;
  onClick?: (task: Task) => void;
}

/**
 * コンパクト版のタスクカード
 * TaskCardコンポーネントのcompact=trueラッパー
 */
export const TaskCardCompact: React.FC<TaskCardCompactProps> = ({
  task,
  onClick
}) => {
  return (
    <TaskCard
      task={task}
      onClick={onClick}
      compact={true}
      isCollapsed={true} // コンパクト版では常に折り畳み
    />
  );
};