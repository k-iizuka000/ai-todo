import React, { useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  StatusBadge,
  PriorityBadge
} from '@/components/ui';
import { TagBadge } from '@/components/tag/TagBadge';
import type { Task } from '@/types/task';

interface TaskListViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTagClick?: (tagId: string) => void;
  className?: string;
}

/**
 * 親タスク専用のリストビューコンポーネント
 * タスク管理画面の分割ビューで使用される
 */
const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  onTaskClick,
  onTagClick,
  className
}) => {
  const handleTaskClick = useCallback((task: Task) => {
    onTaskClick(task);
  }, [onTaskClick]);

  const handleTagClick = useCallback((tagId: string) => {
    onTagClick?.(tagId);
  }, [onTagClick]);

  if (tasks.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className || ''}`}>
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">タスクがありません</p>
          <p className="text-sm">新しいタスクを作成してください</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {tasks.map((task) => (
        <Card 
          key={task.id} 
          variant="interactive" 
          onClick={() => handleTaskClick(task)}
          className="hover:shadow-md transition-shadow duration-200"
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg pr-4 leading-tight">
                {task.title}
              </CardTitle>
              <div className="flex gap-2 flex-shrink-0">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {task.description && (
              <p className="text-muted-foreground mb-3 line-clamp-2">
                {task.description}
              </p>
            )}
            
            {/* サブタスク情報の表示 */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mb-3">
                <div className="text-sm text-muted-foreground">
                  サブタスク: {task.subtasks.filter(subtask => subtask.completed).length} / {task.subtasks.length} 完了
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${task.subtasks.length > 0 ? (task.subtasks.filter(subtask => subtask.completed).length / task.subtasks.length) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {/* タグ */}
              {task.tags.map((tag) => (
                <TagBadge 
                  key={tag.id} 
                  tag={tag} 
                  size="sm"
                  onClick={() => handleTagClick(tag.id)}
                  className="cursor-pointer hover:shadow-sm"
                />
              ))}
              
              {/* 期限 */}
              {task.dueDate && (
                <span className={`text-sm ml-auto flex-shrink-0 ${
                  task.dueDate < new Date() && task.status !== 'done' 
                    ? 'text-red-600 font-medium' 
                    : 'text-muted-foreground'
                }`}>
                  期限: {task.dueDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </span>
              )}
            </div>

            {/* 工数情報 */}
            {(task.estimatedHours || task.actualHours) && (
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {task.estimatedHours && (
                  <span>予定: {task.estimatedHours}h</span>
                )}
                {task.actualHours && task.actualHours > 0 && (
                  <span>実績: {task.actualHours}h</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TaskListView;