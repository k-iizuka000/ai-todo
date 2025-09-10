/**
 * タスク詳細ビュー - 単一タスクの詳細情報を表示
 */

import React, { useState, useCallback, useMemo, useRef, useId, useEffect } from 'react';
import { TaskDetail, Priority, TaskStatus } from '../../types/task';
import { Tag } from '../../types/tag';
import { Project } from '../../types/project';
import { TaskDetailTabs } from './TaskDetailTabs';
import { TagBadge, TagSelector } from '../tag';
import { ProjectBadge } from '../project/ProjectBadge';
import { ProjectSelector } from '../project/ProjectSelector';
import { useProjectStore } from '../../stores/projectStore';
import { useTagStore } from '../../stores/tagStore';
import { DataValidationService } from '../../utils/dataValidation';
import { useTaskDetail, useTaskDetailActions, useTaskDetailLoading } from '../../stores/taskDetailStore';
import { useResponsiveLayout, useResponsiveRender, useResponsiveValue } from '../../hooks/useResponsiveLayout';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useTaskDetailKeyboard } from '../../hooks/useTaskDetailKeyboard';
import { useTaskAnnouncements } from '../../hooks/useTaskAnnouncements';
import { safeGetTime } from '../../utils/dateUtils';

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
  /** サブタスク追加時のコールバック */
  onSubtaskAdd?: (title: string) => void;
  /** サブタスクステータス変更時のコールバック */
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  /** サブタスク削除時のコールバック */
  onSubtaskDelete?: (subtaskId: string) => void;
  /** テスト用のdata属性 */
  'data-testid'?: string;
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
  enableA11y = true,
  onSubtaskAdd,
  onSubtaskToggle,
  onSubtaskDelete,
  'data-testid': dataTestId
}) => {
  // ヘルパー関数を先に定義
  const getPriorityColor = useCallback((priority: Priority) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200';
      case 'CRITICAL':
        return 'bg-red-200 text-red-900 dark:bg-red-800/30 dark:text-red-200 border-red-300';
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
    [task.id, task.updatedAt, task.projectId] // task.projectIdを追加して即時反映
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
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [hasChanges, setHasChanges] = useState(false); // 変更検知用の状態
  
  // 🔧 修正: コンポーネント初期化時に編集状態を強制リセット
  useEffect(() => {
    console.log('🔧 TaskDetailView mounted - resetting edit states');
    setIsEditing(false);
    setIsEditingProject(false);
    setIsEditingTags(false);
    console.log('🔧 Edit states reset to false');
  }, []); // 空の依存配列 = マウント時のみ実行
  
  // タグ編集用のローカル状態（TaskFormパターンと同じ）
  const [editingTags, setEditingTags] = useState<Tag[]>(validatedTask.tags);
  
  // 🔧 修正: 統一されたprojectId計算（両方のProjectBadgeで使用）
  const currentProjectId = useMemo(() => {
    return editedTask.projectId !== undefined ? editedTask.projectId : validatedTask.projectId;
  }, [editedTask.projectId, validatedTask.projectId]);
  
  // タスクが変更された場合のeditingTagsを同期
  useEffect(() => {
    if (!isEditingTags) {
      setEditingTags(validatedTask.tags);
    }
  }, [validatedTask.tags, isEditingTags]);
  
  // 🔧 修正: タスクが変更された場合のeditedTaskを同期（循環参照を防ぐ）
  useEffect(() => {
    if (!isEditingProject) {
      const timeoutId = setTimeout(() => {
        setEditedTask(prev => {
          // 既にeditedTaskにprojectIdが設定されている場合は上書きしない
          if (prev.projectId !== undefined && prev.projectId !== validatedTask.projectId) {
            return prev; // 変更を保持
          }
          return { ...prev, projectId: validatedTask.projectId };
        });
      }, 0); // 次のティックまで遅延して循環参照を防ぐ
      
      return () => clearTimeout(timeoutId);
    }
  }, [validatedTask.projectId]); // isEditingProjectを依存配列から削除
  
  // タスクが変更された場合のeditedTaskを同期
  useEffect(() => {
    if (!isEditing) {
      setEditedTask(validatedTask);
    }
  }, [validatedTask, isEditing]);
  
  // フォームデータ変更検知
  useEffect(() => {
    const changed = JSON.stringify(editedTask) !== JSON.stringify(validatedTask);
    setHasChanges(changed);
  }, [editedTask, validatedTask]);

  // タスクタイトル編集のハンドリング
  const handleTitleChange = useCallback((title: string) => {
    setEditedTask(prev => ({ ...prev, title }));
  }, []);

  // ステータス変更のハンドリング
  const handleStatusChange = useCallback((status: TaskStatus) => {
    setEditedTask(prev => ({ ...prev, status }));
  }, []);

  // 優先度変更のハンドリング
  const handlePriorityChange = useCallback((priority: Priority) => {
    setEditedTask(prev => ({ ...prev, priority }));
  }, []);

  // ローカル状態のハンドリング
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // レスポンシブレイアウトフック
  const { isDesktop, isTablet, isMobile } = useResponsiveLayout();
  const { contentPadding, layoutClasses } = useResponsiveRender({ 
    isDesktop, 
    isTablet, 
    isMobile 
  });

  // スワイプジェスチャフック（正しい引数で使用）
  const swipeEnabled = !isEditing && !isEditingTags && !isEditingProject;
  const { bindSwipeHandlers } = useSwipeGesture(
    {
      onSwipeLeft: onNavigateNext,
      onSwipeRight: onNavigatePrevious,
    },
    {
      threshold: 100,
      velocity: 0.3,
      direction: 'horizontal',
      preventScrollOnSwipe: true,
    }
  );

  // スワイプイベントをコンテナにバインド
  useEffect(() => {
    if (!swipeEnabled) return;
    if (!containerRef.current) return;
    return bindSwipeHandlers(containerRef.current);
  }, [swipeEnabled, bindSwipeHandlers]);


  // キーボードナビゲーションフック（副作用でドキュメントにリスナーを登録）
  useTaskDetailKeyboard({
    onClose,
    onEdit: editable ? () => setIsEditing(true) : undefined,
    onNavigatePrevious,
    onNavigateNext,
    onDelete: editable ? () => handleDelete() : undefined,
    enabled: !isEditing && !isEditingTags && !isEditingProject // 編集中は無効化
  });

  // アクセシビリティアナウンスフック - 🔧 修正: 正しい関数名を使用
  const { 
    announceTaskSaved,
    announceTaskDeleted,
    announceTaskStatusChange,
    announceEditModeToggle,
    announceTagUpdate,  
    announceError,
    announceNavigationChange
  } = useTaskAnnouncements();

  // プロジェクトストア
  const { projects, getProjectById } = useProjectStore(state => ({
    projects: state.projects,
    getProjectById: state.getProjectById
  }));

  // ステータス・優先度ラベル
  const getStatusLabel = useCallback((status: TaskStatus) => {
    switch (status) {
      case 'todo': return '未着手';
      case 'in_progress': return '進行中';
      case 'done': return '完了';
      case 'archived': return 'アーカイブ';
      default: return '不明';
    }
  }, []);

  const getPriorityLabel = useCallback((priority: Priority) => {
    switch (priority) {
      case 'URGENT': return '緊急';
      case 'HIGH': return '高';
      case 'MEDIUM': return '中';
      case 'LOW': return '低';
      case 'CRITICAL': return '最重要';
      default: return '不明';
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
      
      if (enableA11y) {
        // ステータス変更のアナウンス
        if (previousStatus !== newStatus) {
          announceTaskStatusChange(
            validatedTask.title, 
            previousStatus, 
            newStatus
          );
        } else {
          announceTaskSaved(validatedTask.title);
        }
      }
    } else {
      // エラー: タイトルが空の場合
      if (enableA11y) {
        announceError('タスクタイトルは必須です');
      }
    }
  }, [editedTask, onTaskUpdate, validatedTask.id, validatedTask.title, validatedTask.status, enableA11y, announceTaskStatusChange, announceTaskSaved, announceError]);

  const handleCancel = useCallback(() => {
    setEditedTask(task);
    setIsEditing(false);
  }, [task]);

  const handleDelete = useCallback(() => {
    if (window.confirm('このタスクを削除しますか？')) {
      onTaskDelete?.(validatedTask.id);
      if (enableA11y) {
        announceTaskDeleted(validatedTask.title);
      }
    }
  }, [onTaskDelete, validatedTask.id, validatedTask.title, enableA11y, announceTaskDeleted]);


  const handleTaskDetailUpdate = useCallback((updates: Partial<TaskDetail>) => {
    onTaskUpdate?.(validatedTask.id, updates);
  }, [onTaskUpdate, validatedTask.id]);
  
  // 全体的な更新処理
  const handleUpdate = useCallback(() => {
    if (onTaskUpdate && hasChanges) {
      onTaskUpdate(validatedTask.id, editedTask);
      setHasChanges(false);
      // 成功メッセージを表示する場合はここに追加
    }
  }, [onTaskUpdate, hasChanges, validatedTask.id, editedTask]);

  // 編集モード切り替えのハンドリング
  const handleEditToggle = useCallback(() => {
    const newEditingState = !isEditing;
    setIsEditing(newEditingState);
    
    if (newEditingState) {
      // 編集モード開始時：タイトル入力フィールドにフォーカス
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      
      if (enableA11y) {
        announceEditModeToggle(true, validatedTask.title);
      }
    } else {
      if (enableA11y) {
        announceEditModeToggle(false, validatedTask.title);
      }
    }
  }, [isEditing, validatedTask.title, enableA11y, announceEditModeToggle]);




  // プロジェクト変更ハンドラー
  const handleProjectChange = useCallback((project: Project | null) => {
    const newProjectId = project ? project.id : undefined;
    
    // ローカル状態を即座に更新して上部バッジに反映
    setEditedTask(prev => ({ ...prev, projectId: newProjectId }));
    
    // 編集モードを終了
    setIsEditingProject(false);
    
    onTaskUpdate?.(validatedTask.id, { projectId: newProjectId });
    
    if (enableA11y) {
      const oldProject = validatedTask.projectId ? getProjectById(validatedTask.projectId) : null;
      const announcement = newProjectId 
        ? `プロジェクト「${project?.name}」に変更されました`
        : oldProject 
        ? `プロジェクト「${oldProject.name}」から変更されました`
        : 'プロジェクトが設定されませんでした';
      
      // アナウンスの実装（必要に応じて）
      console.log(announcement);
    }
  }, [validatedTask.id, validatedTask.projectId, onTaskUpdate, enableA11y, getProjectById]);

  return (
    <div 
      ref={containerRef}
      className="bg-white dark:bg-gray-800 overflow-hidden flex flex-col"
      style={{ height: '90vh' }}
    >
      {/* ヘッダー */}
      <div className={`border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${contentPadding}`}>
        <div className="flex items-start justify-between">
          {/* タイトル */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editedTask.title || ''}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                  }
                }}
                id={titleId}
                className="w-full text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-0"
                placeholder="タスクタイトルを入力..."
                aria-label="タスクタイトルを編集"
                autoFocus
              />
            ) : (
              <h1 
                id={titleId}
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 break-words cursor-text"
                onClick={editable ? handleEditToggle : undefined}
                role={editable ? "button" : undefined}
                tabIndex={editable ? 0 : -1}
                onKeyDown={editable ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleEditToggle();
                  }
                } : undefined}
                aria-label={editable ? "タスクタイトル（クリックで編集）" : "タスクタイトル"}
              >
                {validatedTask.title}
              </h1>
            )}
          </div>
          
          {/* 操作ボタン群 */}
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={!editedTask.title?.trim()}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    editedTask.title?.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  aria-label="変更を保存"
                >
                  保存
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 active:bg-gray-700 transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="編集をキャンセル"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                {editable && (
                  <button
                    onClick={handleEditToggle}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="タスクを編集"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {editable && (
                  <button
                    onClick={handleDelete}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="タスクを削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  aria-label="詳細を閉じる"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ステータス・優先度・プロジェクトバッジ */}
        <div className="flex flex-wrap items-center gap-2 mt-3 mb-3">
          <span 
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColorClasses}`}
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
          {/* 🔧 修正: 統一されたcurrentProjectIdを使用 */}
          <ProjectBadge
            projectId={currentProjectId}
            size="sm"
            onClick={currentProjectId ? () => {
              if (currentProjectId) {
                onProjectClick?.(currentProjectId);
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
                <div className="min-h-[6rem] p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {validatedTask.description ? (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {validatedTask.description}
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      説明はありません
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 期限 */}
            {(validatedTask.dueDate || isEditing) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  期限
                </label>
                {isEditing ? (
                  <input
                    type="datetime-local"
                    value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value ? new Date(e.target.value) : undefined })}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="期限を設定"
                  />
                ) : validatedTask.dueDate ? (
                  <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                    <time className="text-gray-900 dark:text-gray-100">
                      {new Date(validatedTask.dueDate).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </time>
                  </div>
                ) : null}
              </div>
            )}

            {/* プロジェクト */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  プロジェクト
                </label>
                {editable && !isEditingProject && (
                  <button
                    onClick={() => setIsEditingProject(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline transition-all duration-200 ease-out"
                  >
                    編集
                  </button>
                )}
              </div>
              
              {isEditingProject ? (
                <div>
                  <ProjectSelector
                    selectedProject={validatedTask.projectId ? getProjectById(validatedTask.projectId) : undefined}
                    selectedProjectId={validatedTask.projectId}
                    onProjectSelect={handleProjectChange}
                    onProjectIdSelect={(projectId: string | null) => {
                      const project = projectId ? getProjectById(projectId) : null;
                      handleProjectChange(project);
                    }}
                    projects={projects}
                    placeholder="プロジェクトを選択..."
                    noneLabel="プロジェクトなし"
                    showNone={true}
                    className="w-full"
                    disabled={false}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        // 🔧 デバッグ: 確定ボタンクリック時の状態確認
                        console.log('🔧 Debug: 確定ボタンクリック - isEditingProject:', isEditingProject);
                        // 現在の選択を確定
                        setIsEditingProject(false);
                        console.log('🔧 Debug: setIsEditingProject(false)実行完了');
                      }}
                      className="touch-manipulation px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-all duration-200 ease-out"
                    >
                      確定
                    </button>
                    <button
                      onClick={() => {
                        // 🔧 デバッグ: キャンセルボタンクリック時の状態確認
                        console.log('🔧 Debug: キャンセルボタンクリック - isEditingProject:', isEditingProject);
                        setIsEditingProject(false);
                        // 元の値に戻す
                        setEditedTask(prev => ({ ...prev, projectId: validatedTask.projectId }));
                        console.log('🔧 Debug: キャンセル処理完了 - isEditingProjectをfalseに設定');
                      }}
                      className="touch-manipulation px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-all duration-200 ease-out"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* 🔧 修正: 統一されたcurrentProjectIdを使用 */}
                  {currentProjectId ? (
                    <div>
                      <ProjectBadge
                        projectId={currentProjectId}
                        size="sm"
                        onClick={currentProjectId ? () => {
                          if (currentProjectId) {
                            onProjectClick?.(currentProjectId);
                          }
                        } : undefined}
                      />
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                      プロジェクトなし
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* タグ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                タグ
              </label>
              
              {editable ? (
                <TagSelector
                  selectedTags={editingTags}
                  onTagsChange={(newTags) => {
                    setEditingTags(newTags)
                    // 即座に保存するのではなく、内部状態のみ更新
                    onTaskUpdate?.(validatedTask.id, { tags: newTags });
                  }}
                  availableTags={availableTags}
                  editing={true}
                  mode="dropdown"
                  className="w-full"
                  placeholder="タグを選択..."
                  maxTags={10}
                  allowCreate={true}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {validatedTask.tags.length > 0 ? (
                    validatedTask.tags.map(tag => (
                      <TagBadge key={tag.id} tag={tag} size="sm" />
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                      タグなし
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* 更新ボタン */}
          {editable && hasChanges && (
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setEditedTask(validatedTask);
                  setHasChanges(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                更新
              </button>
            </div>
          )}
        </div>

        {/* サイドパネル（タブコンテンツ）- デスクトップのみ */}
        {isDesktop && (
          <div className="flex-1 flex flex-col">
            <TaskDetailTabs
              task={validatedTask}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onUpdate={handleTaskDetailUpdate}
              enableA11y={enableA11y}
              onSubtaskAdd={onSubtaskAdd}
              onSubtaskToggle={onSubtaskToggle}
              onSubtaskDelete={onSubtaskDelete}
            />
          </div>
        )}
      </div>

      {/* タブセクション（タブレット・モバイル用） */}
      {!isDesktop && (
        <div className="border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <TaskDetailTabs
            task={validatedTask}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onUpdate={handleTaskDetailUpdate}
            enableA11y={enableA11y}
            onSubtaskAdd={onSubtaskAdd}
            onSubtaskToggle={onSubtaskToggle}
            onSubtaskDelete={onSubtaskDelete}
            compact={true} // モバイル向けのコンパクト表示
          />
        </div>
      )}
    </div>
  );
});

/**
 * React.memoの比較関数
 * TaskDetail型の日付フィールドの型安全な比較を行い、React.memoでの比較エラーを防ぐ
 */
const areTaskDetailViewPropsEqual = (prevProps: TaskDetailViewProps, nextProps: TaskDetailViewProps): boolean => {
  // 基本プロパティの比較
  if (prevProps.editable !== nextProps.editable ||
      prevProps.onTaskUpdate !== nextProps.onTaskUpdate ||
      prevProps.onTaskDelete !== nextProps.onTaskDelete ||
      prevProps.onClose !== nextProps.onClose) {
    return false;
  }

  // タスクの詳細比較（日付の型安全な比較）
  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  if (prevTask.id !== nextTask.id ||
      prevTask.title !== nextTask.title ||
      prevTask.description !== nextTask.description ||
      prevTask.status !== nextTask.status ||
      prevTask.priority !== nextTask.priority ||
      prevTask.projectId !== nextTask.projectId) {
    return false;
  }

  // 日付フィールドの安全な比較
  const prevDueDate = safeGetTime(prevTask.dueDate);
  const nextDueDate = safeGetTime(nextTask.dueDate);
  const prevCreatedAt = safeGetTime(prevTask.createdAt);
  const nextCreatedAt = safeGetTime(nextTask.createdAt);
  const prevUpdatedAt = safeGetTime(prevTask.updatedAt);
  const nextUpdatedAt = safeGetTime(nextTask.updatedAt);

  if (prevDueDate !== nextDueDate ||
      prevCreatedAt !== nextCreatedAt ||
      prevUpdatedAt !== nextUpdatedAt) {
    return false;
  }

  // タグ配列の比較
  if (prevTask.tags.length !== nextTask.tags.length ||
      !prevTask.tags.every((tag, index) => tag.id === nextTask.tags[index].id)) {
    return false;
  }

  // その他のプロパティも同様に比較
  return true;
};

// React.memoでラップしてパフォーマンス最適化
TaskDetailView.displayName = 'TaskDetailView';
export default React.memo(TaskDetailView, areTaskDetailViewPropsEqual);
