/**
 * サブタスクイベント表示コンポーネント
 * カレンダー上でサブタスクを表示するためのコンポーネント
 */

import React from 'react';
import type { TaskStatus, Priority, Subtask } from '@/types/task';
import { StatusBadge } from '@/components/ui';

// サブタスクイベント用の拡張型
export interface SubtaskEventProps {
  id: string;
  subtask: Subtask;
  parentTaskTitle: string;
  parentTaskId: string;
  color: string;
  priority: Priority;
  status: TaskStatus;
  allDay?: boolean;
  showParentInfo?: boolean;
  onClick?: () => void;
  onStatusChange?: () => void;
  onParentTaskClick?: () => void;
}

const SubtaskEvent: React.FC<SubtaskEventProps> = ({
  subtask,
  parentTaskTitle,
  color,
  status,
  allDay = false,
  showParentInfo = true,
  onClick,
  onStatusChange,
  onParentTaskClick
}) => {
  return (
    <div
      className="text-xs p-1 rounded truncate cursor-pointer transition-all hover:opacity-80"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderLeft: `3px solid ${color}`
      }}
      title={`${subtask.title}${showParentInfo ? ` (${parentTaskTitle}より)` : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium truncate flex-1">
          {subtask.title}
        </span>
        {!allDay && (
          <div className="flex items-center gap-1 ml-1">
            <div
              onClick={(e) => {
                e.stopPropagation(); // 親のonClickイベントを防ぐ
                onStatusChange?.();
              }}
              className="cursor-pointer hover:scale-110 transition-transform"
              title="ステータスを変更"
            >
              <StatusBadge status={status} size="sm" />
            </div>
          </div>
        )}
      </div>
      
      {showParentInfo && (
        <div 
          className="text-xs opacity-75 truncate cursor-pointer hover:opacity-100 hover:underline"
          onClick={(e) => {
            e.stopPropagation(); // 親のonClickイベントを防ぐ
            onParentTaskClick?.();
          }}
          title="親タスクを表示"
        >
          親: {parentTaskTitle}
        </div>
      )}
    </div>
  );
};

export default SubtaskEvent;