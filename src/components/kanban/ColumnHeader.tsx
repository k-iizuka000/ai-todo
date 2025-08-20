/**
 * カンバン列のヘッダーコンポーネント
 */

import React from 'react';
import { TaskStatus } from '@/types/task';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ColumnHeaderProps {
  status: TaskStatus;
  title: string;
  taskCount: number;
  onAddTask?: () => void;
  onSettings?: () => void;
}

// ステータスに応じた色設定
const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'todo':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'done':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'archived':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// ステータスに応じたタイトル
const getStatusTitle = (status: TaskStatus): string => {
  switch (status) {
    case 'todo':
      return 'To Do';
    case 'in_progress':
      return 'In Progress';
    case 'done':
      return 'Done';
    case 'archived':
      return 'Archived';
    default:
      return status;
  }
};

export const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  status,
  title,
  taskCount,
  onAddTask,
  onSettings
}) => {
  const statusColor = getStatusColor(status);
  const displayTitle = title || getStatusTitle(status);

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      {/* 列タイトルとタスク数 */}
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-gray-900 text-lg">
          {displayTitle}
        </h3>
        <Badge 
          variant="secondary" 
          className={`${statusColor} font-medium min-w-[2rem] justify-center`}
        >
          {taskCount}
        </Badge>
      </div>

      {/* 操作ボタン */}
      <div className="flex items-center gap-1">
        {onAddTask && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTask}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title="タスクを追加"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        
        {onSettings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSettings}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title="列設定"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};