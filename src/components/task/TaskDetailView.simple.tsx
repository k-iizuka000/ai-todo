/**
 * タスク詳細ビュー - 簡易版
 * 設計書 グループ1: 基本モーダル実装
 * 
 * 目的: シンプルで確実に動作するタスク詳細表示
 * 特徴: 基本機能のみに特化、高度機能は除外
 */

import React, { useCallback, useMemo, useId } from 'react';
import { TaskDetail, Priority, TaskStatus } from '../../types/task';
import { Tag } from '../../types/tag';
import { TagBadge } from '../tag';
import { ProjectBadge } from '../project/ProjectBadge';

export interface TaskDetailViewSimpleProps {
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
  /** プロジェクトクリック時のコールバック */
  onProjectClick?: (projectId: string) => void;
}

/**
 * シンプルなタスク詳細ビュー
 * 複雑な機能（レスポンシブ、アニメーション、スワイプ等）を除去し、
 * 基本的なタスク情報表示に特化
 */
const TaskDetailViewSimple: React.FC<TaskDetailViewSimpleProps> = React.memo(({
  task,
  editable = false,
  onTaskUpdate,
  onTaskDelete,
  onClose,
  availableTags = [],
  onProjectClick
}) => {
  // アクセシビリティ用ID
  const titleId = useId();
  const descId = useId();

  // 優先度表示の色クラス
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

  // ステータス表示の色クラス
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

  // ラベル変換
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

  // メモ化されたクラス名
  const statusColorClasses = useMemo(() => 
    getStatusColor(task.status),
    [task.status, getStatusColor]
  );
  
  const priorityColorClasses = useMemo(() =>
    getPriorityColor(task.priority),
    [task.priority, getPriorityColor]
  );

  // 削除ハンドラー
  const handleDelete = useCallback(() => {
    if (window.confirm('このタスクを削除しますか？この操作は取り消せません。')) {
      onTaskDelete?.(task.id);
    }
  }, [onTaskDelete, task.id]);

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* ヘッダー */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 
              id={titleId}
              className={`text-xl font-semibold text-gray-900 dark:text-gray-100 ${
                task.status === 'done' ? 'line-through opacity-75' : ''
              }`}
            >
              {task.title}
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {editable && (
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                aria-label="タスクを削除"
                title="削除"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="タスク詳細を閉じる"
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
        <div className="flex flex-wrap items-center gap-2 mt-4" role="group" aria-label="タスクの状態情報">
          <span 
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColorClasses}`}
            aria-label={`ステータス: ${getStatusLabel(task.status)}`}
          >
            {getStatusLabel(task.status)}
          </span>
          <span 
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${priorityColorClasses}`}
            aria-label={`優先度: ${getPriorityLabel(task.priority)}`}
          >
            優先度: {getPriorityLabel(task.priority)}
          </span>
          {/* プロジェクトバッジ */}
          <ProjectBadge
            projectId={task.projectId}
            size="sm"
            onClick={task.projectId ? () => {
              const projectId = task.projectId;
              if (projectId) {
                onProjectClick?.(projectId);
              }
            } : undefined}
            showEmptyState={true}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              説明
            </label>
            <div 
              id={descId}
              className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap min-h-[100px] p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
            >
              {task.description || '説明がありません'}
            </div>
          </div>

          {/* 詳細情報グリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              タグ
            </label>
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
                </p>
              )}
            </div>
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
    </div>
  );
}, (prevProps, nextProps) => {
  // 最適化されたReact.memo比較関数
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.updatedAt.getTime() === nextProps.task.updatedAt.getTime() &&
    prevProps.editable === nextProps.editable
  );
});

TaskDetailViewSimple.displayName = 'TaskDetailViewSimple';

export default TaskDetailViewSimple;