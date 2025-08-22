/**
 * タスク詳細ビュー - 単一タスクの詳細情報を表示
 */

import React, { useState, useCallback, useMemo } from 'react';
import { TaskDetail, Priority, TaskStatus } from '../../types/task';
import { Tag } from '../../types/tag';
import { TaskDetailTabs } from './TaskDetailTabs';
import { TagBadge, TagSelector } from '../tag';
import { DataValidationService } from '../../utils/dataValidation';

export interface TaskDetailViewProps {
  /** 表示するタスク */
  task: TaskDetail;
  /** 編集可能かどうか */
  editable?: boolean;
  /** タスク更新時のコールバック */
  onTaskUpdate?: (taskId: string, updates: Partial<TaskDetail>) => void;
  /** タスク削除時のコールバック */
  onTaskDelete?: (taskId: string) => void;
  /** 閉じるボタンのコールバック */
  onClose?: () => void;
  /** 利用可能なタグ */
  availableTags?: Tag[];
}

const TaskDetailView: React.FC<TaskDetailViewProps> = React.memo(({
  task,
  editable = false,
  onTaskUpdate,
  onTaskDelete,
  onClose,
  availableTags = []
}) => {
  // データバリデーションを適用（メモ化）
  const validatedTask = useMemo(() => 
    DataValidationService.validateTaskDetail(task), 
    [task]
  );
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<TaskDetail>>(validatedTask);
  const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'history'>('subtasks');
  const [isEditingTags, setIsEditingTags] = useState(false);

  const getPriorityColor = useCallback((priority: Priority) => {
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
  }, []);

  const getStatusColor = useCallback((status: TaskStatus) => {
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
  }, []);

  const getStatusLabel = useCallback((status: TaskStatus) => {
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
  }, []);

  const getPriorityLabel = useCallback((priority: Priority) => {
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
  }, []);

  const handleSave = useCallback(() => {
    if (editedTask.title?.trim()) {
      onTaskUpdate?.(validatedTask.id, {
        ...editedTask,
        updatedAt: new Date()
      });
      setIsEditing(false);
    }
  }, [editedTask, onTaskUpdate, validatedTask.id]);

  const handleCancel = useCallback(() => {
    setEditedTask(task);
    setIsEditing(false);
  }, [task]);

  const handleDelete = useCallback(() => {
    if (window.confirm('このタスクを削除しますか？この操作は取り消せません。')) {
      onTaskDelete?.(validatedTask.id);
    }
  }, [onTaskDelete, validatedTask.id]);


  const handleTaskDetailUpdate = useCallback((updates: Partial<TaskDetail>) => {
    onTaskUpdate?.(validatedTask.id, updates);
  }, [onTaskUpdate, validatedTask.id]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-[80vh]">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
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
                validatedTask.status === 'done' ? 'line-through opacity-75' : ''
              }`}>
                {validatedTask.title}
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

      {/* メインコンテンツ - 2カラムレイアウト */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左カラム - メイン情報 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* 基本情報 */}
          <div className="space-y-6">
            {/* 説明 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                説明
              </label>
              {isEditing ? (
                <textarea
                  value={editedTask.description || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  rows={4}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="タスクの詳細説明を入力..."
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap min-h-[100px] p-3 border border-gray-200 dark:border-gray-600 rounded-md">
                  {task.description || '説明がありません'}
                </p>
              )}
            </div>

            {/* 詳細情報グリッド */}
            <div className="grid grid-cols-2 gap-6">
              {/* 期限 */}
              {task.dueDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    期限
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {new Date(task.dueDate).toLocaleString('ja-JP')}
                  </p>
                </div>
              )}

              {/* 時間見積・実績 */}
              {(task.estimatedHours || task.actualHours) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    時間
                  </label>
                  <div className="space-y-1 text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {task.estimatedHours && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">見積:</span>
                        <span className="text-gray-900 dark:text-gray-100">{task.estimatedHours}h</span>
                      </div>
                    )}
                    {task.actualHours && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">実績:</span>
                        <span className="text-gray-900 dark:text-gray-100">{task.actualHours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* タグ */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  タグ
                </label>
                {editable && !isEditingTags && (
                  <button
                    onClick={() => setIsEditingTags(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    編集
                  </button>
                )}
              </div>
              
              {isEditingTags ? (
                <div>
                  <TagSelector
                    selectedTags={task.tags}
                    availableTags={availableTags}
                    onTagsChange={(tags) => {
                      onTaskUpdate?.(validatedTask.id, { tags });
                    }}
                    editing={true}
                    maxTags={10}
                    allowCreate={true}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setIsEditingTags(false)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                    >
                      完了
                    </button>
                    <button
                      onClick={() => {
                        // タグ編集をキャンセルして元の状態に戻す
                        setIsEditingTags(false);
                        // ここでタグを元の状態に戻すロジックが必要であれば追加
                      }}
                      className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {task.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map(tag => (
                        <TagBadge
                          key={tag.id}
                          tag={tag}
                          size="sm"
                          onClick={() => {
                            // タグクリックで関連タスク表示（将来の拡張用）
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      タグなし
                      {editable && (
                        <span
                          className="ml-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                          onClick={() => setIsEditingTags(true)}
                        >
                          追加
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 添付ファイル */}
            {task.attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  添付ファイル
                </label>
                <div className="space-y-2">
                  {task.attachments.map(attachment => (
                    <div key={attachment.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded border">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded flex items-center justify-center">
                        <span className="text-blue-600 text-xs">📎</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{attachment.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round(attachment.fileSize / 1024)}KB • 
                          {attachment.uploadedAt.toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* メタ情報 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>
                  <span className="font-medium">作成:</span><br />
                  {new Date(task.createdAt).toLocaleString('ja-JP')}
                </div>
                <div>
                  <span className="font-medium">更新:</span><br />
                  {new Date(task.updatedAt).toLocaleString('ja-JP')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右カラム - タブ */}
        <TaskDetailTabs
          task={task}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onUpdate={handleTaskDetailUpdate}
        />
      </div>
    </div>
  );
});

TaskDetailView.displayName = 'TaskDetailView';

export default TaskDetailView;