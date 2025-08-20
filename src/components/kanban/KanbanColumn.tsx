/**
 * カンバン列コンポーネント
 */

import React from 'react';
import { Task, TaskStatus } from '@/types/task';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { TaskCardCompact } from './TaskCardCompact';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface KanbanColumnProps {
  status: TaskStatus;
  title?: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: () => void;
  onSettings?: () => void;
  onToggleTaskCollapse?: (taskId: string) => void;
  compact?: boolean;
  className?: string;
  collapsedTasks?: Set<string>;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  onTaskClick,
  onAddTask,
  onSettings,
  onToggleTaskCollapse,
  compact = false,
  className = '',
  collapsedTasks = new Set()
}) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map(task => task.id);

  return (
    <div className={`flex flex-col bg-gray-50 rounded-lg border h-full ${className}`}>
      {/* カラムヘッダー */}
      <ColumnHeader
        status={status}
        title={title || ''}
        taskCount={tasks.length}
        onAddTask={onAddTask}
        onSettings={onSettings}
      />

      {/* タスクリスト */}
      <div
        ref={setNodeRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[200px]"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
              タスクがありません
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task.id}>
                {compact ? (
                  <TaskCardCompact
                    task={task}
                    onClick={onTaskClick}
                  />
                ) : (
                  <TaskCard
                    task={task}
                    isCollapsed={collapsedTasks.has(task.id)}
                    onToggleCollapse={onToggleTaskCollapse}
                    onClick={onTaskClick}
                  />
                )}
              </div>
            ))
          )}
        </SortableContext>
      </div>
      
      {/* ドロップエリアインジケーター */}
      <div className="h-2 transition-all duration-200 opacity-0 bg-blue-200 rounded-b-lg" />
    </div>
  );
};