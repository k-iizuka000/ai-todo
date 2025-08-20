/**
 * タスクカードコンポーネント（フル表示版）
 */

import React, { useState } from 'react';
import { Task, Priority } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Calendar, Clock } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  isCollapsed?: boolean;
  onToggleCollapse?: (taskId: string) => void;
  onClick?: (task: Task) => void;
  compact?: boolean;
}

// 優先度に応じた色設定
const getPriorityColor = (priority: Priority): string => {
  switch (priority) {
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// 優先度のラベル
const getPriorityLabel = (priority: Priority): string => {
  switch (priority) {
    case 'low':
      return '低';
    case 'medium':
      return '中';
    case 'high':
      return '高';
    case 'urgent':
      return '緊急';
    default:
      return priority;
  }
};

// 期限の状態を判定
const getDueDateStatus = (dueDate?: Date): 'overdue' | 'due-soon' | 'normal' => {
  if (!dueDate) return 'normal';
  
  const now = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 2) return 'due-soon';
  return 'normal';
};

// 期限バッジの色
const getDueDateColor = (status: 'overdue' | 'due-soon' | 'normal'): string => {
  switch (status) {
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'due-soon':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'normal':
      return 'bg-blue-100 text-blue-800 border-blue-200';
  }
};

// 日付フォーマット
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isCollapsed = false,
  onToggleCollapse,
  onClick,
  compact = false
}) => {
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter(sub => sub.completed).length || 0;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleCollapse) {
      onToggleCollapse(task.id);
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  const handleCardClick = () => {
    onClick?.(task);
  };

  const dueDateStatus = getDueDateStatus(task.dueDate);
  const isCollapsedState = onToggleCollapse ? isCollapsed : localCollapsed;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        p-4 cursor-pointer transition-all duration-200 hover:shadow-md border
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
        ${compact ? 'p-3' : ''}
      `}
      onClick={handleCardClick}
    >
      {/* メインヘッダー */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-gray-900 line-clamp-2 ${compact ? 'text-sm' : ''}`}>
              {task.title}
            </h4>
          </div>
          
          {/* サブタスク折り畳みボタン */}
          {hasSubtasks && (
            <button
              onClick={handleToggleCollapse}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              {isCollapsedState ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* 説明文（コンパクト時は非表示） */}
        {!compact && task.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* バッジエリア */}
        <div className="flex flex-wrap gap-2">
          {/* 優先度バッジ */}
          <Badge 
            variant="outline" 
            className={`${getPriorityColor(task.priority)} text-xs`}
          >
            {getPriorityLabel(task.priority)}
          </Badge>

          {/* 期限バッジ */}
          {task.dueDate && (
            <Badge 
              variant="outline" 
              className={`${getDueDateColor(dueDateStatus)} text-xs flex items-center gap-1`}
            >
              <Calendar className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </Badge>
          )}

          {/* タグ */}
          {!compact && task.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="text-xs"
              style={{ 
                borderColor: tag.color,
                color: tag.color,
                backgroundColor: `${tag.color}10`
              }}
            >
              {tag.name}
            </Badge>
          ))}
        </div>

        {/* 進捗情報 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {hasSubtasks && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{completedSubtasks}/{task.subtasks.length} 完了</span>
            </div>
          )}
          
          {task.estimatedHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedHours}h見積</span>
            </div>
          )}
        </div>

        {/* サブタスク一覧（展開時） */}
        {hasSubtasks && !isCollapsedState && !compact && (
          <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => {}} // TODO: サブタスク完了処理
                  className="rounded text-blue-600 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={`flex-1 ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                  {subtask.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};