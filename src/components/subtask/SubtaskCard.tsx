/**
 * サブタスクカードコンポーネント
 * サブタスクの表示と基本操作を提供
 */

import React from 'react';
import { Subtask, Task, TaskStatus, Priority } from '../../types/task';
import { useTaskStore } from '../../stores/taskStore';

interface SubtaskCardProps {
  subtask: Subtask;
  parentTask: Task;
  onEdit?: (subtask: Subtask) => void;
  onDelete?: (subtaskId: string) => void;
  isDragging?: boolean;
  className?: string;
}

// サブタスクからステータスを推測する関数
const getSubtaskStatus = (subtask: Subtask): TaskStatus => {
  if (subtask.completed) {
    return 'done';
  } else {
    // 簡易的にdueDateがある場合は進行中とみなす
    return subtask.dueDate ? 'in_progress' : 'todo';
  }
};

// 優先度のカラークラスを取得
const getPriorityColor = (priority: Priority): string => {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'urgent':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'high':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// ステータスのカラークラスを取得
const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'todo':
      return 'bg-gray-100 text-gray-700';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700';
    case 'done':
      return 'bg-green-100 text-green-700';
    case 'archived':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const SubtaskCard: React.FC<SubtaskCardProps> = ({
  subtask,
  parentTask,
  onEdit,
  onDelete,
  isDragging = false,
  className = ''
}) => {
  const { updateTask } = useTaskStore();
  const status = getSubtaskStatus(subtask);

  // サブタスクの完了状態を切り替え
  const handleToggleComplete = () => {
    const updatedSubtasks = parentTask.subtasks.map(st =>
      st.id === subtask.id
        ? { ...st, completed: !st.completed, updatedAt: new Date() }
        : st
    );

    updateTask(parentTask.id, {
      subtasks: updatedSubtasks
    });
  };

  // 編集ボタンクリック
  const handleEditClick = () => {
    onEdit?.(subtask);
  };

  // 削除ボタンクリック
  const handleDeleteClick = () => {
    if (window.confirm(`サブタスク「${subtask.title}」を削除しますか？`)) {
      onDelete?.(subtask.id);
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm p-4 
        hover:shadow-md transition-shadow duration-200
        ${isDragging ? 'opacity-50 transform rotate-2' : ''}
        ${className}
      `}
    >
      {/* ヘッダー：チェックボックスとタイトル */}
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={handleToggleComplete}
          className={`
            flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors duration-200
            ${subtask.completed
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-green-400'
            }
          `}
        >
          {subtask.completed && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h3 className={`
            text-sm font-medium text-gray-900 truncate
            ${subtask.completed ? 'line-through text-gray-500' : ''}
          `}>
            {subtask.title}
          </h3>
        </div>
      </div>

      {/* ステータスバッジ */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
          ${getStatusColor(status)}
        `}>
          {status === 'todo' && '未着手'}
          {status === 'in_progress' && '進行中'}
          {status === 'done' && '完了'}
          {status === 'archived' && 'アーカイブ'}
        </span>

        {/* 親タスクの優先度表示 */}
        <span className={`
          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
          ${getPriorityColor(parentTask.priority)}
        `}>
          {parentTask.priority === 'critical' && '最重要'}
          {parentTask.priority === 'urgent' && '緊急'}
          {parentTask.priority === 'high' && '高'}
          {parentTask.priority === 'medium' && '中'}
          {parentTask.priority === 'low' && '低'}
        </span>
      </div>

      {/* 親タスク情報 */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">親タスク</div>
        <div className="text-sm text-gray-700 truncate" title={parentTask.title}>
          {parentTask.title}
        </div>
      </div>

      {/* 日付情報 */}
      <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
        <span>作成: {subtask.createdAt.toLocaleDateString('ja-JP')}</span>
        <span>更新: {subtask.updatedAt.toLocaleDateString('ja-JP')}</span>
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={handleEditClick}
          className="
            px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700
            hover:bg-blue-50 rounded transition-colors duration-200
          "
          title="編集"
        >
          編集
        </button>
        <button
          onClick={handleDeleteClick}
          className="
            px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700
            hover:bg-red-50 rounded transition-colors duration-200
          "
          title="削除"
        >
          削除
        </button>
      </div>
    </div>
  );
};

export default SubtaskCard;