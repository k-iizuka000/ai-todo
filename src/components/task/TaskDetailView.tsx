/**
 * タスク詳細ビュー - 単一タスクの詳細情報を表示
 */

import React, { useState } from 'react';
import { Task, Priority, TaskStatus } from '../../types/task';
import SubTaskList from './SubTaskList';
import ProgressIndicator from './ProgressIndicator';

interface TaskDetailViewProps {
  /** 表示するタスク */
  task: Task;
  /** 編集可能かどうか */
  editable?: boolean;
  /** 詳細表示モード */
  mode?: 'compact' | 'full';
  /** タスク更新時のコールバック */
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  /** サブタスク操作のコールバック */
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  onSubtaskAdd?: (title: string) => void;
  onSubtaskDelete?: (subtaskId: string) => void;
  /** タスク削除時のコールバック */
  onTaskDelete?: (taskId: string) => void;
  /** 閉じるボタンのコールバック */
  onClose?: () => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({
  task,
  editable = false,
  mode = 'full',
  onTaskUpdate,
  onSubtaskToggle,
  onSubtaskAdd,
  onSubtaskDelete,
  onTaskDelete,
  onClose
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<Task>>(task);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200';
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200';
      case 'archived':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
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

  const handleSave = () => {
    if (editedTask.title?.trim()) {
      onTaskUpdate?.(task.id, {
        ...editedTask,
        updatedAt: new Date()
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('このタスクを削除しますか？この操作は取り消せません。')) {
      onTaskDelete?.(task.id);
    }
  };

  const completedSubtasks = task.subtasks.filter(subtask => subtask.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTask.title || ''}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="w-full text-xl font-semibold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-gray-100 focus:outline-none"
                autoFocus
              />
            ) : (
              <h1 className={`text-xl font-semibold text-gray-900 dark:text-gray-100 ${
                task.status === 'done' ? 'line-through opacity-75' : ''
              }`}>
                {task.title}
              </h1>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {editable && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="編集"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </>
            )}
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="閉じる"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ステータス・優先度バッジ */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(task.priority)}`}>
            優先度: {getPriorityLabel(task.priority)}
          </span>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="px-6 py-4">
        {/* 基本情報グリッド */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 左カラム */}
          <div className="space-y-4">
            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                説明
              </label>
              {isEditing ? (
                <textarea
                  value={editedTask.description || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="タスクの詳細説明を入力..."
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {task.description || '説明がありません'}
                </p>
              )}
            </div>

            {/* タグ */}
            {task.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  タグ
                </label>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map(tag => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                        borderColor: `${tag.color}40`
                      }}
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右カラム */}
          <div className="space-y-4">
            {/* 期限 */}
            {task.dueDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  期限
                </label>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(task.dueDate).toLocaleString()}
                </p>
              </div>
            )}

            {/* 時間見積・実績 */}
            {(task.estimatedHours || task.actualHours) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  時間
                </label>
                <div className="space-y-1 text-sm">
                  {task.estimatedHours && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">見積時間:</span>
                      <span className="text-gray-900 dark:text-gray-100">{task.estimatedHours}時間</span>
                    </div>
                  )}
                  {task.actualHours && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">実績時間:</span>
                      <span className="text-gray-900 dark:text-gray-100">{task.actualHours}時間</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 作成・更新情報 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                作成・更新情報
              </label>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>作成日: {new Date(task.createdAt).toLocaleString()}</div>
                <div>更新日: {new Date(task.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>

        {/* サブタスクセクション */}
        {(totalSubtasks > 0 || editable) && (
          <div className="space-y-4">
            {/* サブタスク進捗 */}
            {totalSubtasks > 0 && (
              <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  サブタスク進捗状況
                </h3>
                <ProgressIndicator
                  completed={completedSubtasks}
                  total={totalSubtasks}
                  size="large"
                  label={`全体進捗: ${progress}%`}
                />
              </div>
            )}

            {/* サブタスクリスト */}
            <SubTaskList
              subtasks={task.subtasks}
              onSubtaskToggle={onSubtaskToggle}
              onSubtaskDelete={onSubtaskDelete}
              onSubtaskAdd={onSubtaskAdd}
              editable={editable}
              collapsible={mode === 'compact'}
              initialCollapsed={mode === 'compact'}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailView;