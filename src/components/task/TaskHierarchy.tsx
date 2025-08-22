/**
 * タスク階層表示 - タスクとサブタスクの階層構造を可視化
 */

import React, { useState } from 'react';
import { Task, Priority, TaskStatus } from '../../types/task';
import ProgressIndicator from './ProgressIndicator';

export interface TaskHierarchyProps {
  /** 表示するタスク */
  task: Task;
  /** 階層レベル（0が最上位） */
  level?: number;
  /** 折り畳み可能かどうか */
  collapsible?: boolean;
  /** 初期状態で折り畳まれているか */
  initialCollapsed?: boolean;
  /** タスククリック時のコールバック */
  onTaskClick?: (taskId: string) => void;
  /** サブタスク完了状態変更時のコールバック */
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  /** 最大表示レベル */
  maxLevel?: number;
}

const TaskHierarchy: React.FC<TaskHierarchyProps> = ({
  task,
  level = 0,
  collapsible = true,
  initialCollapsed = false,
  onTaskClick,
  onSubtaskToggle,
  maxLevel = 3
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'archived':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return '未着手';
      case 'in_progress':
        return '進行中';
      case 'done':
        return '完了';
      case 'archived':
        return 'アーカイブ';
      default:
        return status;
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return '緊急';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return priority;
    }
  };

  const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
  const totalSubtasks = task.subtasks.length;

  // インデント計算
  const indentLevel = Math.min(level, maxLevel);
  const indentClass = indentLevel > 0 ? `ml-${indentLevel * 4}` : '';

  return (
    <div className={`${indentClass}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        {/* タスクヘッダー */}
        <div
          className={`p-4 ${
            collapsible && totalSubtasks > 0 
              ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' 
              : ''
          }`}
          onClick={() => {
            if (collapsible && totalSubtasks > 0) {
              setCollapsed(!collapsed);
            }
            onTaskClick?.(task.id);
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* タイトル行 */}
              <div className="flex items-center space-x-2 mb-2">
                {collapsible && totalSubtasks > 0 && (
                  <button
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    aria-label={collapsed ? '展開' : '折りたたみ'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollapsed(!collapsed);
                    }}
                  >
                    <svg
                      className={`w-4 h-4 transform transition-transform ${collapsed ? '' : 'rotate-90'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                
                <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${
                  task.status === 'done' ? 'line-through opacity-75' : ''
                }`}>
                  {task.title}
                </h3>
              </div>

              {/* ステータス・優先度・期限 */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
                {task.dueDate && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    期限: {new Date(task.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* 説明文 */}
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {task.description}
                </p>
              )}

              {/* タグ */}
              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {task.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color
                      }}
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}

              {/* 時間情報 */}
              {(task.estimatedHours || task.actualHours) && (
                <div className="text-xs text-gray-500 dark:text-gray-400 space-x-4">
                  {task.estimatedHours && (
                    <span>見積: {task.estimatedHours}h</span>
                  )}
                  {task.actualHours && (
                    <span>実績: {task.actualHours}h</span>
                  )}
                </div>
              )}
            </div>

            {/* 右側の情報 */}
            <div className="flex flex-col items-end space-y-2 ml-4">
              {totalSubtasks > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  サブタスク {completedSubtasks}/{totalSubtasks}
                </div>
              )}
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(task.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* プログレスバー（サブタスクがある場合） */}
          {totalSubtasks > 0 && (
            <div className="mt-3">
              <ProgressIndicator
                completed={completedSubtasks}
                total={totalSubtasks}
                size="small"
                hidePercentage={false}
                label="サブタスク進捗"
              />
            </div>
          )}
        </div>

        {/* サブタスク一覧 */}
        {!collapsed && totalSubtasks > 0 && level < maxLevel && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                サブタスク一覧
              </h4>
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSubtaskToggle?.(subtask.id, !subtask.completed);
                      }}
                      className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        subtask.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                      }`}
                    >
                      {subtask.completed && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    <span
                      className={`flex-1 text-sm ${
                        subtask.completed
                          ? 'line-through text-gray-500 dark:text-gray-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {subtask.title}
                    </span>
                    
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(subtask.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskHierarchy;