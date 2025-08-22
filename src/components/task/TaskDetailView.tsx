/**
 * タスク詳細ビュー - 単一タスクの詳細情報を表示
 */

import React, { useState, useCallback, useMemo } from 'react';
import { TaskDetail, Priority, TaskStatus, ExtendedSubtask } from '../../types/task';
import { Tag } from '../../types/tag';
import { TaskDetailTabs } from './TaskDetailTabs';
import { TagBadge, TagSelector } from '../tag';
import { DataValidationService } from '../../utils/dataValidation';
import { useTaskStore } from '../../stores/taskStore';

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
  /** サブタスクナビゲーション時のコールバック */
  onSubtaskNavigate?: (subtaskId: string, parentTaskId: string) => void;
  /** 親タスクへのナビゲーション時のコールバック */
  onParentTaskNavigate?: (parentTaskId: string) => void;
  /** 表示中のサブタスクID（サブタスク詳細表示時） */
  focusedSubtaskId?: string;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = React.memo(({
  task,
  editable = false,
  onTaskUpdate,
  onTaskDelete,
  onClose,
  availableTags = [],
  onSubtaskNavigate,
  onParentTaskNavigate,
  focusedSubtaskId
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
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskData, setEditingSubtaskData] = useState<Partial<ExtendedSubtask>>({});
  
  // Zustandストアからサブタスク管理機能を取得
  const { updateSubtask, deleteSubtask } = useTaskStore();

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

  // サブタスク関連のハンドラー
  const handleSubtaskUpdate = useCallback((subtaskId: string, updates: Partial<ExtendedSubtask>) => {
    updateSubtask(validatedTask.id, subtaskId, updates);
  }, [updateSubtask, validatedTask.id]);

  const handleSubtaskDelete = useCallback((subtaskId: string) => {
    if (window.confirm('このサブタスクを削除しますか？')) {
      deleteSubtask(validatedTask.id, subtaskId);
    }
  }, [deleteSubtask, validatedTask.id]);

  const handleSubtaskStatusToggle = useCallback((subtaskId: string, currentStatus: TaskStatus) => {
    const newStatus: TaskStatus = 
      currentStatus === 'done' ? 'todo' : 
      currentStatus === 'todo' ? 'in_progress' :
      'done';
    handleSubtaskUpdate(subtaskId, { status: newStatus });
  }, [handleSubtaskUpdate]);

  const startSubtaskInlineEdit = useCallback((subtask: ExtendedSubtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskData({
      title: subtask.title,
      description: subtask.description,
      priority: subtask.priority,
      dueDate: subtask.dueDate
    });
  }, []);

  const saveSubtaskInlineEdit = useCallback(() => {
    if (!editingSubtaskId) return;
    handleSubtaskUpdate(editingSubtaskId, editingSubtaskData);
    setEditingSubtaskId(null);
    setEditingSubtaskData({});
  }, [editingSubtaskId, editingSubtaskData, handleSubtaskUpdate]);

  const cancelSubtaskInlineEdit = useCallback(() => {
    setEditingSubtaskId(null);
    setEditingSubtaskData({});
  }, []);

  const handleSubtaskNavigate = useCallback((subtaskId: string) => {
    onSubtaskNavigate?.(subtaskId, validatedTask.id);
  }, [onSubtaskNavigate, validatedTask.id]);

  // ExtendedSubtaskを安全に取得する
  const getExtendedSubtasks = useCallback((): ExtendedSubtask[] => {
    try {
      return (validatedTask.subtasks as unknown as ExtendedSubtask[]) || [];
    } catch {
      return [];
    }
  }, [validatedTask.subtasks]);

  const extendedSubtasks = useMemo(() => getExtendedSubtasks(), [getExtendedSubtasks]);

  // 表示中のサブタスクを取得（サブタスク詳細表示時）
  const focusedSubtask = useMemo(() => {
    if (!focusedSubtaskId) return null;
    return extendedSubtasks.find(s => s.id === focusedSubtaskId) || null;
  }, [focusedSubtaskId, extendedSubtasks]);

  // 親タスクの完了率計算
  const subtaskStats = useMemo(() => {
    const total = extendedSubtasks.length;
    const completed = extendedSubtasks.filter(s => s.status === 'done').length;
    const inProgress = extendedSubtasks.filter(s => s.status === 'in_progress').length;
    const todo = extendedSubtasks.filter(s => s.status === 'todo').length;
    return {
      total,
      completed,
      inProgress,
      todo,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [extendedSubtasks]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-[80vh]">
      {/* ヘッダー */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* サブタスク詳細表示時の親タスクリンク */}
            {focusedSubtask && onParentTaskNavigate && (
              <div className="mb-2">
                <button
                  onClick={() => onParentTaskNavigate(validatedTask.id)}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  title="親タスクに戻る"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  親タスク: {validatedTask.title}
                </button>
              </div>
            )}
            
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
                (focusedSubtask ? focusedSubtask.status : validatedTask.status) === 'done' ? 'line-through opacity-75' : ''
              }`}>
                {focusedSubtask ? focusedSubtask.title : validatedTask.title}
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
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(focusedSubtask ? focusedSubtask.status : task.status)}`}>
            {getStatusLabel(focusedSubtask ? focusedSubtask.status : task.status)}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(focusedSubtask ? focusedSubtask.priority : task.priority)}`}>
            優先度: {getPriorityLabel(focusedSubtask ? focusedSubtask.priority : task.priority)}
          </span>
          {focusedSubtask && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200">
              サブタスク
            </span>
          )}
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
              {isEditing && !focusedSubtask ? (
                <textarea
                  value={editedTask.description || ''}
                  onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
                  rows={4}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="タスクの詳細説明を入力..."
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap min-h-[100px] p-3 border border-gray-200 dark:border-gray-600 rounded-md">
                  {focusedSubtask ? (focusedSubtask.description || 'サブタスクの説明がありません') : (task.description || '説明がありません')}
                </p>
              )}
            </div>

            {/* 詳細情報グリッド */}
            <div className="grid grid-cols-2 gap-6">
              {/* 期限 */}
              {(focusedSubtask ? focusedSubtask.dueDate : task.dueDate) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    期限
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {new Date(focusedSubtask ? focusedSubtask.dueDate! : task.dueDate!).toLocaleString('ja-JP')}
                  </p>
                </div>
              )}

              {/* 時間見積・実績 */}
              {(focusedSubtask ? (focusedSubtask.estimatedHours || focusedSubtask.actualHours) : (task.estimatedHours || task.actualHours)) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    時間
                  </label>
                  <div className="space-y-1 text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    {(focusedSubtask ? focusedSubtask.estimatedHours : task.estimatedHours) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">見積:</span>
                        <span className="text-gray-900 dark:text-gray-100">{focusedSubtask ? focusedSubtask.estimatedHours : task.estimatedHours}h</span>
                      </div>
                    )}
                    {(focusedSubtask ? focusedSubtask.actualHours : task.actualHours) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">実績:</span>
                        <span className="text-gray-900 dark:text-gray-100">{focusedSubtask ? focusedSubtask.actualHours : task.actualHours}h</span>
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
                {editable && !isEditingTags && !focusedSubtask && (
                  <button
                    onClick={() => setIsEditingTags(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    編集
                  </button>
                )}
              </div>
              
              {isEditingTags && !focusedSubtask ? (
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
                  {/* サブタスク表示時は親タスクのタグを表示 */}
                  {(focusedSubtask ? focusedSubtask.tags : task.tags).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(focusedSubtask ? focusedSubtask.tags : task.tags).map(tag => (
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
                      {editable && !focusedSubtask && (
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

            {/* サブタスクの概要と進捗 - サブタスク詳細表示時は非表示 */}
            {extendedSubtasks.length > 0 && !focusedSubtask && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    サブタスク ({subtaskStats.total}件)
                  </label>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    完了率: {subtaskStats.completionRate}% ({subtaskStats.completed}/{subtaskStats.total})
                  </span>
                </div>
                
                {/* 進捗バー */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${subtaskStats.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* サブタスクサマリー */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {subtaskStats.todo}
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">未着手</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                      {subtaskStats.inProgress}
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">進行中</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {subtaskStats.completed}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">完了</div>
                  </div>
                </div>

                {/* サブタスクリスト */}
                <div className="space-y-3">
                  {extendedSubtasks.map((subtask) => (
                    <div 
                      key={subtask.id} 
                      className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                    >
                      {editingSubtaskId === subtask.id ? (
                        /* インライン編集モード */
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editingSubtaskData.title || ''}
                            onChange={(e) => setEditingSubtaskData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            placeholder="サブタスクタイトル"
                          />
                          <textarea
                            value={editingSubtaskData.description || ''}
                            onChange={(e) => setEditingSubtaskData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            rows={2}
                            placeholder="説明"
                          />
                          <div className="flex items-center gap-3">
                            <select
                              value={editingSubtaskData.priority || subtask.priority}
                              onChange={(e) => setEditingSubtaskData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                              <option value="low">低</option>
                              <option value="medium">中</option>
                              <option value="high">高</option>
                              <option value="urgent">緊急</option>
                            </select>
                            <input
                              type="date"
                              value={editingSubtaskData.dueDate ? editingSubtaskData.dueDate.toISOString().split('T')[0] : ''}
                              onChange={(e) => setEditingSubtaskData(prev => ({ 
                                ...prev, 
                                dueDate: e.target.value ? new Date(e.target.value) : undefined 
                              }))}
                              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={saveSubtaskInlineEdit}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              保存
                            </button>
                            <button
                              onClick={cancelSubtaskInlineEdit}
                              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* 通常表示モード */
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <button
                                onClick={() => handleSubtaskStatusToggle(subtask.id, subtask.status)}
                                className={`mt-1 p-1 rounded ${
                                  subtask.status === 'done' 
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                    : subtask.status === 'in_progress'
                                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                } hover:opacity-75 transition-opacity`}
                                title={`ステータス: ${getStatusLabel(subtask.status)}`}
                              >
                                {subtask.status === 'done' ? '✓' : 
                                 subtask.status === 'in_progress' ? '○' : '□'}
                              </button>
                              <div className="flex-1">
                                <button
                                  onClick={() => handleSubtaskNavigate(subtask.id)}
                                  className={`text-left font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors ${
                                    subtask.status === 'done' ? 'line-through opacity-75' : ''
                                  }`}
                                  title="サブタスク詳細を表示"
                                >
                                  {subtask.title}
                                </button>
                                {subtask.description && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {subtask.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span className={`px-2 py-1 rounded ${getPriorityColor(subtask.priority)}`}>
                                    {getPriorityLabel(subtask.priority)}
                                  </span>
                                  {subtask.dueDate && (
                                    <span>
                                      期限: {subtask.dueDate.toLocaleDateString('ja-JP')}
                                    </span>
                                  )}
                                  {subtask.estimatedHours && (
                                    <span>
                                      見積: {subtask.estimatedHours}h
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {editable && (
                              <div className="flex items-center gap-1 ml-3">
                                <button
                                  onClick={() => startSubtaskInlineEdit(subtask)}
                                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                                  title="編集"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleSubtaskDelete(subtask.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                  title="削除"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
                  {new Date(focusedSubtask ? focusedSubtask.createdAt : task.createdAt).toLocaleString('ja-JP')}
                </div>
                <div>
                  <span className="font-medium">更新:</span><br />
                  {new Date(focusedSubtask ? focusedSubtask.updatedAt : task.updatedAt).toLocaleString('ja-JP')}
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