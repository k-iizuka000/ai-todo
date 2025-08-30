/**
 * タスク詳細ビュー - 単一タスクの詳細情報を表示
 */

import React, { useState, useCallback, useMemo, useRef, useId, useEffect } from 'react';
import { TaskDetail, Priority, TaskStatus } from '../../types/task';
import { Tag } from '../../types/tag';
import { TaskDetailTabs } from './TaskDetailTabs';
import { TagBadge, TagSelector } from '../tag';
import { ProjectBadge } from '../project/ProjectBadge';
import { DataValidationService } from '../../utils/dataValidation';
import { useTaskDetail, useTaskDetailActions, useTaskDetailLoading } from '../../stores/taskDetailStore';
import { useResponsiveLayout, useResponsiveRender, useResponsiveValue } from '../../hooks/useResponsiveLayout';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { usePageTransition } from '../../hooks/useAnimations';
import { useTaskDetailKeyboard } from '../../hooks/useTaskDetailKeyboard';
import { useTaskAnnouncements } from '../../hooks/useTaskAnnouncements';

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
  /** プロジェクトクリック時のコールバック */
  onProjectClick?: (projectId: string) => void;
  /** 前後タスクナビゲーション時のコールバック */
  onTaskNavigate?: (direction: 'prev' | 'next') => void;
  /** タスク一覧での前後ナビゲーション */
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  /** プルツーリフレッシュ */
  onRefresh?: () => void | Promise<void>;
  /** アクセシビリティモードの有効化 */
  enableA11y?: boolean;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = React.memo(({
  task,
  editable = false,
  onTaskUpdate,
  onTaskDelete,
  onClose,
  availableTags = [],
  onProjectClick,
  onTaskNavigate,
  onNavigatePrevious,
  onNavigateNext,
  onRefresh,
  enableA11y = true
}) => {
  // ヘルパー関数を先に定義
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

  // データバリデーションを適用（最適化されたメモ化）
  const validatedTask = useMemo(() => 
    DataValidationService.validateTaskDetail(task), 
    [task.id, task.updatedAt] // 最適化されたdeps
  );
  
  // ステータス色クラスをメモ化
  const statusColorClasses = useMemo(() => 
    getStatusColor(validatedTask.status),
    [validatedTask.status, getStatusColor]
  );
  
  // 優先度色クラスをメモ化  
  const priorityColorClasses = useMemo(() =>
    getPriorityColor(validatedTask.priority),
    [validatedTask.priority, getPriorityColor]
  );
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState<Partial<TaskDetail>>(validatedTask);
  const [activeTab, setActiveTab] = useState<'subtasks' | 'comments' | 'history'>('subtasks');
  const [isEditingTags, setIsEditingTags] = useState(false);
  
  // プルツーリフレッシュ状態管理
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0); // 0-100の進捗
  
  // レスポンシブレイアウト
  const { layout, isMobile, isTablet, isDesktop, isTouch } = useResponsiveLayout();
  const responsiveRender = useResponsiveRender();
  
  // ページトランジション
  const { isTransitioning, startTransition, endTransition, getTransitionStyles } = usePageTransition();
  
  // スワイプジェスチャー（モバイル用）
  const { bindSwipeHandlers } = useSwipeGesture({
    onSwipeLeft: () => {
      if (isMobile && onNavigateNext) {
        startTransition('slide');
        onNavigateNext();
      }
    },
    onSwipeRight: () => {
      if (isMobile && onNavigatePrevious) {
        startTransition('slide');
        onNavigatePrevious();
      }
    },
    onSwipeDown: async () => {
      if (isMobile && onRefresh && !isRefreshing) {
        setIsRefreshing(true);
        setPullProgress(100);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          // アニメーション完了まで少し待つ
          setTimeout(() => {
            setIsRefreshing(false);
            setPullProgress(0);
          }, 300);
        }
      }
    },
  }, {
    threshold: 50,
    velocity: 0.3,
    direction: isMobile ? 'all' : 'horizontal',
  });
  
  // レスポンシブ値の取得
  const containerHeight = useResponsiveValue({
    mobile: '100vh',
    tablet: '85vh',
    desktop: '80vh',
  });
  
  const headerPadding = useResponsiveValue({
    mobile: 'px-4 py-3',
    tablet: 'px-6 py-4',
    desktop: 'px-6 py-4',
  });
  
  const contentPadding = useResponsiveValue({
    mobile: 'px-4 py-3',
    tablet: 'px-6 py-4', 
    desktop: 'px-6 py-4',
  });

  // アクセシビリティ関連
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  // アナウンスメント機能
  const {
    announce,
    announceTaskStatusChange,
    announceTaskSaved,
    announceTaskDeleted,
    announceNavigationChange,
    announceEditModeToggle,
    announceTagUpdate,
    announceError,
    announcement,
    priority
  } = useTaskAnnouncements({
    enabled: enableA11y,
    priority: 'polite'
  });

  // スワイプイベントのバインド
  useEffect(() => {
    if (containerRef.current && isMobile) {
      const cleanup = bindSwipeHandlers(containerRef.current);
      return cleanup;
    }
  }, [bindSwipeHandlers, isMobile]);

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
      const previousStatus = validatedTask.status;
      const newStatus = editedTask.status || validatedTask.status;
      
      onTaskUpdate?.(validatedTask.id, {
        ...editedTask,
        updatedAt: new Date()
      });
      setIsEditing(false);
      
      // アクセシビリティ: 保存完了をアナウンス
      if (enableA11y) {
        announceTaskSaved(validatedTask.title);
        
        // ステータス変更があった場合はそれもアナウンス
        if (previousStatus !== newStatus) {
          setTimeout(() => {
            announceTaskStatusChange(validatedTask.title, previousStatus, newStatus);
          }, 1000);
        }
      }
    } else {
      // エラー: タイトルが空の場合
      if (enableA11y) {
        announceError('タスクタイトルは必須です');
      }
    }
  }, [editedTask, onTaskUpdate, validatedTask.id, validatedTask.title, validatedTask.status, enableA11y]);

  const handleCancel = useCallback(() => {
    setEditedTask(task);
    setIsEditing(false);
  }, [task]);

  const handleDelete = useCallback(() => {
    if (window.confirm('このタスクを削除しますか？この操作は取り消せません。')) {
      onTaskDelete?.(validatedTask.id);
      
      // アクセシビリティ: 削除完了をアナウンス
      if (enableA11y) {
        announceTaskDeleted(validatedTask.title);
      }
    }
  }, [onTaskDelete, validatedTask.id, validatedTask.title, enableA11y]);


  const handleTaskDetailUpdate = useCallback((updates: Partial<TaskDetail>) => {
    onTaskUpdate?.(validatedTask.id, updates);
  }, [onTaskUpdate, validatedTask.id]);

  // 編集モード切り替えのハンドリング
  const handleEditToggle = useCallback(() => {
    const newEditingState = !isEditing;
    setIsEditing(newEditingState);
    
    if (enableA11y) {
      announceEditModeToggle(newEditingState, validatedTask.title);
    }
    
    // キャンセル処理
    if (!newEditingState) {
      setEditedTask(validatedTask);
    }
  }, [isEditing, enableA11y, validatedTask]);

  // キーボードナビゲーション設定
  const keyboardHandlers = useMemo(() => ({
    onSave: () => {
      if (isEditing) {
        handleSave();
      }
    },
    onEdit: () => {
      if (editable && !isEditingTags) {
        handleEditToggle();
      }
    },
    onClose: onClose,
    onNavigate: (direction) => {
      if (onTaskNavigate && !isEditing && !isEditingTags) {
        onTaskNavigate(direction);
      }
    }
  }), [isEditing, editable, isEditingTags, handleSave, handleEditToggle, onClose, onTaskNavigate]);

  // キーボードナビゲーションの初期化
  useTaskDetailKeyboard(keyboardHandlers, {
    enabled: enableA11y,
    trapFocus: true,
    containerRef
  });

  // タグ更新時のアナウンス
  const handleTagsChange = useCallback((tags: Tag[]) => {
    const oldTags = validatedTask.tags;
    onTaskUpdate?.(validatedTask.id, { tags });
    
    if (enableA11y) {
      // 追加・削除されたタグを特定してアナウンス
      const addedTags = tags.filter(tag => !oldTags.find(oldTag => oldTag.id === tag.id));
      const removedTags = oldTags.filter(oldTag => !tags.find(tag => tag.id === oldTag.id));
      
      addedTags.forEach(tag => {
        announceTagUpdate(validatedTask.title, 'added', tag.name);
      });
      
      removedTags.forEach(tag => {
        announceTagUpdate(validatedTask.title, 'removed', tag.name);
      });
    }
  }, [validatedTask.tags, validatedTask.id, validatedTask.title, onTaskUpdate, enableA11y]);

  return (
    <div 
      ref={containerRef}
      className={`bg-white dark:bg-gray-800 overflow-hidden flex flex-col ${
        isMobile ? 'h-screen w-screen fixed inset-0 z-50' : 
        isTablet ? 'rounded-lg shadow-lg h-[85vh] max-w-4xl mx-auto' :
        'rounded-lg shadow-lg h-[80vh]'
      }`}
      style={{
        height: isMobile ? '100vh' : containerHeight,
        ...getTransitionStyles('in'),
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      {/* モバイル用プルツーリフレッシュインジケーター */}
      {responsiveRender.mobile(
        <div 
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 transition-transform duration-200 ease-out origin-left z-10 pull-to-refresh-indicator ${
            isRefreshing ? 'scale-x-100' : 'scale-x-0'
          }`}
          style={{
            transform: `scaleX(${pullProgress / 100})`,
          }}
          aria-hidden="true"
        />
      )}
      
      {/* プルツーリフレッシュスピナー */}
      {responsiveRender.mobile(
        isRefreshing && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-600">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">更新中...</span>
            </div>
          </div>
        )
      )}
      
      {/* ヘッダー */}
      <div className={`border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${headerPadding}`}>
        <div className={`flex items-start justify-between ${
          isMobile ? 'flex-col space-y-2' : 'flex-row'
        }`}>
          <div className={`${
            isMobile ? 'w-full' : 'flex-1'
          }`}>
            {isEditing ? (
              <input
                type="text"
                value={editedTask.title || ''}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="w-full text-xl font-semibold bg-transparent border-b-2 border-blue-500 text-gray-900 dark:text-gray-100 focus:outline-none"
                autoFocus
              />
            ) : (
              <h1 
                id={titleId}
                className={`text-xl font-semibold text-gray-900 dark:text-gray-100 ${
                  validatedTask.status === 'done' ? 'line-through opacity-75' : ''
                }`}
              >
                {validatedTask.title}
              </h1>
            )}
          </div>
          
          <div className={`flex items-center space-x-2 ${
            isMobile ? 'w-full justify-between mt-2' : 'ml-4'
          }`}>
            {editable && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      className="touch-manipulation px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-out"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancel}
                      className="touch-manipulation px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-200 ease-out"
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <div id={descId} className="sr-only">
                      タスクの詳細情報を表示しています。Escキーで閉じ、Ctrl+Eで編集、Ctrl+Sで保存できます。
                    </div>
                    <button
                      onClick={handleEditToggle}
                      className="touch-manipulation p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 ease-out"
                      aria-label="タスクを編集"
                      title="編集 (Ctrl+E)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="touch-manipulation p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 ease-out"
                      aria-label="タスクを削除"
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
                className="touch-manipulation p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 ease-out"
                aria-label="タスク詳細を閉じる"
                title="閉じる (Escape)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ステータス・優先度バッジ */}
        <div className={`flex flex-wrap items-center gap-2 mt-3 ${
          isMobile ? 'justify-center' : ''
        }`} role="group" aria-label="タスクの状態情報">
          <span 
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(validatedTask.status)}`}
            aria-label={`ステータス: ${getStatusLabel(validatedTask.status)}`}
          >
            {getStatusLabel(validatedTask.status)}
          </span>
          <span 
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(validatedTask.priority)}`}
            aria-label={`優先度: ${getPriorityLabel(validatedTask.priority)}`}
          >
            優先度: {getPriorityLabel(validatedTask.priority)}
          </span>
          {/* プロジェクトバッジ追加 */}
          <ProjectBadge
            projectId={validatedTask.projectId}
            size="sm"
            onClick={validatedTask.projectId ? () => {
              const projectId = validatedTask.projectId;
              if (projectId) {
                onProjectClick?.(projectId);
              }
            } : undefined}
            showEmptyState={true}
          />
        </div>
      </div>

      {/* メインコンテンツ - レスポンシブレイアウト */}
      <div className={`flex flex-1 overflow-hidden ${
        isDesktop ? 'flex-row' : 'flex-col'  // 設計書: デスクトップは2カラム表示、他は1カラム
      }`}>
        {/* メイン情報セクション */}
        <div className={`overflow-y-auto ${contentPadding} ${
          isDesktop ? 'flex-1 border-r border-gray-200 dark:border-gray-700' : 'flex-none'  // デスクトップではサイドパネル分離
        }`}>
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
                  aria-label="タスクの詳細説明"
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap min-h-[100px] p-3 border border-gray-200 dark:border-gray-600 rounded-md">
                  {task.description || '説明がありません'}
                </p>
              )}
            </div>

            {/* 詳細情報グリッド */}
            <div className={`grid gap-6 ${
              isMobile ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
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
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-all duration-200 ease-out"
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
                    onTagsChange={handleTagsChange}
                    editing={true}
                    maxTags={10}
                    allowCreate={true}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setIsEditingTags(false)}
                      className="touch-manipulation px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-out"
                    >
                      完了
                    </button>
                    <button
                      onClick={() => {
                        // タグ編集をキャンセルして元の状態に戻す
                        setIsEditingTags(false);
                        // ここでタグを元の状態に戻すロジックが必要であれば追加
                      }}
                      className="touch-manipulation px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-200 ease-out"
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

        {/* タブセクション - 設計書準拠のレスポンシブ実装 */}
        {isDesktop ? (
          // デスクトップ（1024px+）: 右サイドパネル表示
          <div className={`w-96 ${contentPadding} border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900`}>
            <TaskDetailTabs
              task={task}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onUpdate={handleTaskDetailUpdate}
            />
          </div>
        ) : isTablet ? (
          // タブレット（768-1023px）: 折りたたみ可能セクション
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <TaskDetailTabs
              task={task}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onUpdate={handleTaskDetailUpdate}
            />
          </div>
        ) : (
          // モバイル（< 768px）: フルスクリーンタブ、スワイプナビゲーション対応
          responsiveRender.mobile(
            <div className="border-t border-gray-200 dark:border-gray-700 flex-1 bg-white dark:bg-gray-800">
              <TaskDetailTabs
                task={task}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onUpdate={handleTaskDetailUpdate}
              />
            </div>
          )
        )}
        
        {/* モバイル用ナビゲーションヒント */}
        {responsiveRender.mobile(
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gray-900 bg-opacity-75 text-white text-sm rounded-full text-center">
            ← スワイプでタスク切り替え →
          </div>
        )}
      </div>
      
      {/* スクリーンリーダー用のライブリージョン */}
      {enableA11y && announcement && (
        <div 
          role="status"
          aria-live={priority}
          aria-atomic="true"
          className="sr-only"
          data-testid="task-detail-announcement"
        >
          {announcement}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // カスタム比較関数で詳細な比較を実装
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.updatedAt.getTime() === nextProps.task.updatedAt.getTime() &&
    prevProps.editable === nextProps.editable &&
    prevProps.availableTags?.length === nextProps.availableTags?.length
  );
});

TaskDetailView.displayName = 'TaskDetailView';

export default TaskDetailView;

// レスポンシブ対応のためのサブコンポーネント（将来の拡張用）
export const MobileTaskDetailView = React.memo((props: TaskDetailViewProps) => {
  return <TaskDetailView {...props} />;
});

export const TabletTaskDetailView = React.memo((props: TaskDetailViewProps) => {
  return <TaskDetailView {...props} />;
});

export const DesktopTaskDetailView = React.memo((props: TaskDetailViewProps) => {
  return <TaskDetailView {...props} />;
});