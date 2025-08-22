/**
 * タスクカードコンポーネント（フル表示版）
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Task, Priority } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronRight, Calendar, Clock } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TagBadge } from '@/components/tag/TagBadge';

/**
 * TaskCardコンポーネントのProps
 */
interface TaskCardProps {
  /** 表示するタスクオブジェクト */
  task: Task;
  /** サブタスクリストの折りたたみ状態（外部制御時） */
  isCollapsed?: boolean;
  /** サブタスクの折りたたみ切り替えコールバック */
  onToggleCollapse?: (taskId: string) => void;
  /** サブタスク完了状態切り替えコールバック */
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  /** タスクカードクリック時のコールバック */
  onClick?: (task: Task) => void;
  /** コンパクト表示モード */
  compact?: boolean;
  /** タグクリック時のコールバック */
  onTagClick?: (tagId: string) => void;
}

/**
 * 優先度に応じたCSSクラスを返す
 * @param priority タスクの優先度
 * @returns 優先度に対応したTailwind CSSクラス
 */
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

/**
 * 優先度の日本語ラベルを返す
 * @param priority タスクの優先度
 * @returns 優先度の日本語表記
 */
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

// 期限判定の設定
const DUE_DATE_WARNING_DAYS = 2; // 期限警告日数
const MS_PER_DAY = 1000 * 60 * 60 * 24; // 1日のミリ秒数

/**
 * 期限の状態を判定する
 * @param dueDate タスクの期限日
 * @returns 期限状態（期限切れ、期限間近、通常）
 */
const getDueDateStatus = (dueDate?: Date): 'overdue' | 'due-soon' | 'normal' => {
  if (!dueDate) return 'normal';
  
  const now = new Date();
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / MS_PER_DAY);
  
  if (diffDays < 0) return 'overdue';
  if (diffDays <= DUE_DATE_WARNING_DAYS) return 'due-soon';
  return 'normal';
};

/**
 * 期限状態に応じたバッジの色を返す
 * @param status 期限の状態
 * @returns 期限状態に対応したTailwind CSSクラス
 */
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

/**
 * 日付を日本語形式でフォーマットする
 * @param date フォーマット対象の日付
 * @returns 日本語形式の日付文字列（例：12/25 火）
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
};

// ドラッグ状態のスタイル設定
const DRAG_OPACITY = 0.5;
const DRAG_SHADOW = 'shadow-lg';

// 表示設定
const MAX_VISIBLE_TAGS = 2; // 表示する最大タグ数

/**
 * タスクカードコンポーネント
 * 
 * ドラッグ&ドロップ対応のタスクカード。
 * サブタスクの表示/非表示、優先度バッジ、期限表示などの機能を提供。
 * コンパクトモードでは一部の情報を省略して表示。
 * 
 * @param props TaskCardコンポーネントのプロパティ
 * @returns React.memoでメモ化されたTaskCardコンポーネント
 */
export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  isCollapsed = false,
  onToggleCollapse,
  onSubtaskToggle,
  onClick,
  compact = false,
  onTagClick
}) => {
  const [localCollapsed, setLocalCollapsed] = useState(isCollapsed);
  
  // メモ化された計算値
  const taskData = useMemo(() => {
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const completedSubtasks = task.subtasks?.filter(sub => sub.completed).length || 0;
    const dueDateStatus = getDueDateStatus(task.dueDate);
    const isCollapsedState = onToggleCollapse ? isCollapsed : localCollapsed;
    
    return {
      hasSubtasks,
      completedSubtasks,
      dueDateStatus,
      isCollapsedState
    };
  }, [task.subtasks, task.dueDate, isCollapsed, localCollapsed, onToggleCollapse]);
  
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

  // メモ化されたコールバック関数
  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleCollapse) {
      onToggleCollapse(task.id);
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  }, [onToggleCollapse, task.id, localCollapsed]);

  const handleCardClick = useCallback(() => {
    onClick?.(task);
  }, [onClick, task]);

  const handleSubtaskChange = useCallback((subtaskId: string) => {
    onSubtaskToggle?.(task.id, subtaskId);
  }, [onSubtaskToggle, task.id]);

  const handleTagClick = useCallback((tagId: string) => {
    onTagClick?.(tagId);
  }, [onTagClick]);

  return (
    <Card
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? DRAG_OPACITY : 1,
      }}
      {...attributes}
      {...listeners}
      className={`
        p-4 cursor-pointer transition-all duration-200 hover:shadow-md border
        ${isDragging ? DRAG_SHADOW : ''}
        ${compact ? 'p-3' : ''}
      `}
      onClick={handleCardClick}
      role="article"
      aria-label={`タスク: ${task.title}`}
      aria-describedby={`task-${task.id}-details`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      {/* メインヘッダー */}
      <div className="space-y-3" id={`task-${task.id}-details`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 
              className={`font-medium text-gray-900 line-clamp-2 ${compact ? 'text-sm' : ''}`}
              id={`task-${task.id}-title`}
            >
              {task.title}
            </h4>
          </div>
          
          {/* サブタスク折り畳みボタン */}
          {taskData.hasSubtasks && (
            <button
              onClick={handleToggleCollapse}
              className="flex-shrink-0 p-1 rounded hover:bg-gray-100 text-gray-500"
              aria-expanded={!taskData.isCollapsedState}
              aria-controls={`task-${task.id}-subtasks`}
              aria-label={`サブタスクを${taskData.isCollapsedState ? '展開' : '折りたたみ'}`}
              title={`サブタスクを${taskData.isCollapsedState ? '展開' : '折りたたみ'}`}
            >
              {taskData.isCollapsedState ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>

        {/* 説明文（コンパクト時は非表示） */}
        {!compact && task.description && (
          <p 
            className="text-sm text-gray-600 line-clamp-2"
            id={`task-${task.id}-description`}
          >
            {task.description}
          </p>
        )}

        {/* バッジエリア */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="タスクの詳細情報">
          {/* 優先度バッジ */}
          <Badge 
            variant="outline" 
            className={`${getPriorityColor(task.priority)} text-xs`}
            role="status"
            aria-label={`優先度: ${getPriorityLabel(task.priority)}`}
          >
            {getPriorityLabel(task.priority)}
          </Badge>

          {/* 期限バッジ */}
          {task.dueDate && (
            <Badge 
              variant="outline" 
              className={`${getDueDateColor(taskData.dueDateStatus)} text-xs flex items-center gap-1`}
              role="status"
              aria-label={`期限: ${formatDate(task.dueDate)}${taskData.dueDateStatus === 'overdue' ? ' (期限切れ)' : taskData.dueDateStatus === 'due-soon' ? ' (期限間近)' : ''}`}
            >
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {formatDate(task.dueDate)}
            </Badge>
          )}

          {/* タグ */}
          {!compact && task.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              size="sm"
              onClick={() => handleTagClick(tag.id)}
            />
          ))}
          
          {/* 追加タグ数の表示 */}
          {!compact && task.tags.length > MAX_VISIBLE_TAGS && (
            <Badge
              variant="outline"
              className="text-xs text-gray-500"
              title={`他に${task.tags.length - MAX_VISIBLE_TAGS}個のタグがあります: ${task.tags.slice(MAX_VISIBLE_TAGS).map(t => t.name).join(', ')}`}
            >
              +{task.tags.length - MAX_VISIBLE_TAGS}
            </Badge>
          )}
        </div>

        {/* 進捗情報 */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          {taskData.hasSubtasks && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{taskData.completedSubtasks}/{task.subtasks.length} 完了</span>
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
        {taskData.hasSubtasks && !taskData.isCollapsedState && !compact && (
          <div 
            className="space-y-2 mt-3 pt-3 border-t border-gray-100"
            id={`task-${task.id}-subtasks`}
            role="group"
            aria-label="サブタスク一覧"
          >
            {task.subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 text-sm"
                role="listitem"
              >
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => handleSubtaskChange(subtask.id)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`サブタスク: ${subtask.title}${subtask.completed ? ' (完了済み)' : ' (未完了)'}`}
                  id={`subtask-${subtask.id}`}
                />
                <label 
                  htmlFor={`subtask-${subtask.id}`}
                  className={`flex-1 cursor-pointer ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}
                >
                  {subtask.title}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
});

TaskCard.displayName = 'TaskCard';