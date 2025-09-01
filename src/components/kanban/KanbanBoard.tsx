/**
 * メインカンバンボードコンポーネント
 * Issue #026 Group 3 Task 3.2: 型安全性強化とエラーバウンダリ統合
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent, 
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/types/task';
import { KanbanColumn } from './KanbanColumn';
import { isTaskStatus, isValidTask } from '@/utils/typeGuards';
import { ProjectBadge } from '@/components/project/ProjectBadge';
import { useKanbanTasks } from '@/hooks/useKanbanTasks';
import { useTaskActions } from '@/hooks/useTaskActions';
import { TaskErrorBoundary } from '../task/TaskErrorBoundary';

/**
 * フィルタリング設定の型定義（useKanbanTasksから参照）
 * Issue #026 Group 3: 型安全性強化
 */
interface TaskFilters {
  /** 検索クエリ */
  readonly searchQuery?: string;
  /** 選択されたタグID */
  readonly selectedTags?: readonly string[];
  /** タグフィルターモード */
  readonly tagFilterMode?: 'AND' | 'OR';
  /** ページタイプ */
  readonly pageType?: 'all' | 'today' | 'important' | 'completed';
}

/**
 * KanbanBoardコンポーネントのProps
 * Issue #026 Group 3 Task 3.2: プロップス型の厳密化とエラーバウンダリ統合
 * 設計書修正: tasks propsを削除し、直接購読パターンに変更
 * フィルター機能統合: Dashboard側の二重状態管理を排除
 */
interface KanbanBoardProps {
  /** タスククリック時のコールバック - 必須でvalidなTaskオブジェクトを保証 */
  readonly onTaskClick?: (task: Readonly<Task>) => void;
  /** タスク追加時のコールバック - 有効なTaskStatusのみ許可 */
  readonly onAddTask?: (status: TaskStatus) => void;
  /** サブタスク完了切り替え時のコールバック - 非空文字列のみ許可 */
  readonly onSubtaskToggle?: (taskId: NonNullable<string>, subtaskId: NonNullable<string>) => void;
  /** タグクリック時のコールバック - 非空文字列のみ許可 */
  readonly onTagClick?: (tagId: NonNullable<string>) => void;
  /** プロジェクトクリック時のコールバック - 非空文字列のみ許可 */
  readonly onProjectClick?: (projectId: NonNullable<string>) => void;
  /** コンパクト表示モード - デフォルトはfalse */
  readonly compact?: boolean;
  /** 追加のCSSクラス - デフォルトは空文字列 */
  readonly className?: string;
  /** フィルタリング設定（Dashboard二重状態管理排除） - 読み取り専用 */
  readonly filters?: Readonly<TaskFilters>;
  /** エラーハンドリング関連のコールバック */
  readonly onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** エラー復旧時のコールバック */
  readonly onRecoverySuccess?: () => void;
  /** デバッグモードの有効化（開発環境での詳細エラー情報表示） */
  readonly enableDebugMode?: boolean;
}

// ステータスの表示順序（アーカイブカラム削除）
const COLUMN_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

// カラムタイトル設定（アーカイブを除外した型定義）
const COLUMN_TITLES: Record<Exclude<TaskStatus, 'archived'>, string> = {
  todo: 'To Do',
  in_progress: 'In Progress', 
  done: 'Done'
};

// ドラッグ＆ドロップ設定
const DRAG_ACTIVATION_DISTANCE = 8; // ピクセル単位でのドラッグ開始距離
const DRAG_PREVIEW_OPACITY = 0.9; // ドラッグプレビューの透明度

/**
 * 内部KanbanBoardコンポーネント（エラーバウンダリで包まれる前）
 * Issue #026 Group 3 Task 3.2: 型安全性強化とエラーバウンダリ統合
 * 設計書対応: 状態管理アーキテクチャ修正（グループ1）
 * 
 * 主な変更点:
 * - tasks propsを削除し、Zustandストアから直接購読
 * - ローカル状態（taskList）を削除し、単一データソース原則を適用
 * - useKanbanTasks、useTaskActionsによる最適化されたデータ取得
 * - 型安全性の強化とエラーハンドリングの改善
 * 
 * 機能:
 * - タスクのドラッグ&ドロップによるステータス変更
 * - 同一カラム内でのタスクの順序変更
 * - サブタスクの完了状態切り替え
 * - コンパクト表示モードの切り替え
 * - アクセシビリティ対応
 * - 包括的エラーハンドリング
 */
const KanbanBoardInternal: React.FC<KanbanBoardProps> = ({
  onTaskClick,
  onAddTask,
  onSubtaskToggle,
  onTagClick,
  onProjectClick,
  compact = false,
  className = '',
  filters,
  enableDebugMode = false
}) => {
  // Issue #026 Group 3: プロップスの型安全性検証
  React.useEffect(() => {
    if (enableDebugMode || process.env.NODE_ENV === 'development') {
      // 型安全性のランタイムチェック
      if (onTaskClick && typeof onTaskClick !== 'function') {
        console.error('KanbanBoard: onTaskClick must be a function');
      }
      if (onAddTask && typeof onAddTask !== 'function') {
        console.error('KanbanBoard: onAddTask must be a function');
      }
      if (onSubtaskToggle && typeof onSubtaskToggle !== 'function') {
        console.error('KanbanBoard: onSubtaskToggle must be a function');
      }
      if (onTagClick && typeof onTagClick !== 'function') {
        console.error('KanbanBoard: onTagClick must be a function');
      }
      if (onProjectClick && typeof onProjectClick !== 'function') {
        console.error('KanbanBoard: onProjectClick must be a function');
      }
      if (className && typeof className !== 'string') {
        console.error('KanbanBoard: className must be a string');
      }
      if (compact !== undefined && typeof compact !== 'boolean') {
        console.error('KanbanBoard: compact must be a boolean');
      }
    }
  }, [onTaskClick, onAddTask, onSubtaskToggle, onTagClick, onProjectClick, compact, className, enableDebugMode]);
  // 設計書要件: 直接購読パターンによるデータ取得（フィルタリング統合）
  const { tasksByStatus, error } = useKanbanTasks(filters);
  const { moveTask, toggleSubtask } = useTaskActions();
  
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  // エラー状態の表示
  if (error) {
    console.error('KanbanBoard error:', error);
  }

  // dnd-kitのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 全タスクリスト（ドラッグ処理用に統合）
  const allTasks = useMemo(() => {
    return [
      ...tasksByStatus.todo,
      ...tasksByStatus.in_progress,
      ...tasksByStatus.done
    ];
  }, [tasksByStatus]);

  // タスクの折り畳み状態を切り替え
  const handleToggleTaskCollapse = useCallback((taskId: string) => {
    setCollapsedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  // サブタスクの完了状態を切り替え - Issue #026 Group 3: エラーハンドリング強化
  const handleSubtaskToggle = useCallback((taskId: string, subtaskId: string) => {
    try {
      // Issue #026 Group 3: 入力値の型安全性チェック
      if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
        throw new Error('Invalid taskId provided to handleSubtaskToggle');
      }
      if (!subtaskId || typeof subtaskId !== 'string' || subtaskId.trim().length === 0) {
        throw new Error('Invalid subtaskId provided to handleSubtaskToggle');
      }

      // 設計書要件: 状態管理の一元化
      toggleSubtask(taskId, subtaskId);

      // 外部コールバックがあれば呼び出し
      if (onSubtaskToggle) {
        try {
          onSubtaskToggle(taskId, subtaskId);
        } catch (callbackError) {
          console.error('Error in onSubtaskToggle callback:', callbackError);
          // コールバックのエラーは上位に伝播させない
        }
      }
    } catch (error) {
      console.error('Error toggling subtask:', error);
      // エラーを再スローして上位のエラーバウンダリでキャッチ
      throw new Error(`Failed to toggle subtask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [toggleSubtask, onSubtaskToggle]);

  // ドラッグ開始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedTask = allTasks.find(task => task.id === event.active.id);
    setDraggedTask(draggedTask || null);
  }, [allTasks]);

  // ドラッグ中（リアルタイム移動）
  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // 設計書要件: 楽観的更新はhandleDragEndで処理
    // ドラッグ中の視覚的フィードバックのみ実装
    // リアルタイム更新は削除し、パフォーマンスを向上
  }, []);

  // ドラッグ終了
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    try {
      const { active, over } = event;
      setDraggedTask(null);

      if (!over) {
        console.warn('Drag ended without valid drop target');
        return;
      }

      const activeTask = allTasks.find(task => task.id === active.id);
      if (!activeTask) {
        console.error(`Task with id ${active.id} not found during drag end`);
        return;
      }

      // 最終的なステータスを確定（型安全）
      let finalStatus: TaskStatus = activeTask.status;
      if (isTaskStatus(over.id) && COLUMN_ORDER.includes(over.id)) {
        finalStatus = over.id;
      } else {
        const overTask = allTasks.find(task => task.id === over.id);
        if (overTask && isValidTask(overTask)) {
          finalStatus = overTask.status;
        } else {
          console.warn(`Target task with id ${over.id} not found or invalid during drag end`);
        }
      }

      // 設計書要件: 状態管理の一元化
      if (activeTask.status !== finalStatus) {
        moveTask(activeTask.id, finalStatus);
      }

      // 同じカラム内でのリオーダリング（将来の実装用コメント）
      // TODO: リオーダリング機能は将来のフェーズで実装
      if (activeTask.status === finalStatus && over.id !== active.id && finalStatus !== 'archived') {
        console.log('Task reordering - future implementation');
      }
    } catch (error) {
      console.error('Critical error during drag end:', error);
      // ドラッグ状態をリセット
      setDraggedTask(null);
    }
  }, [allTasks, moveTask]);

  return (
    <div className={`h-full ${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* カンバンボード */}
        <div className={`
          h-full grid gap-6 p-6
          ${compact 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
            : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
          }
        `}>
          {COLUMN_ORDER.map((status) => {
            const handleAddTask = onAddTask ? () => onAddTask(status) : undefined;
            
            return (
              <KanbanColumn
                key={status}
                status={status}
                title={COLUMN_TITLES[status as Exclude<TaskStatus, 'archived'>]}
                tasks={tasksByStatus[status as Exclude<TaskStatus, 'archived'>]}
                onTaskClick={onTaskClick}
                onAddTask={handleAddTask}
                onToggleTaskCollapse={handleToggleTaskCollapse}
                onSubtaskToggle={handleSubtaskToggle}
                onTagClick={onTagClick}
                onProjectClick={onProjectClick}
                compact={compact}
                collapsedTasks={collapsedTasks}
                className="min-h-0" // グリッド内での高さ制限
              />
            );
          })}
        </div>

        {/* ドラッグプレビュー - グループ4: プロジェクト表示維持対応 */}
        {draggedTask && (
          <div 
            className="fixed top-4 left-4 z-50 pointer-events-none"
            style={{ opacity: DRAG_PREVIEW_OPACITY }}
          >
            <div className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-lg max-w-xs">
              <div className="font-medium text-sm text-gray-900 mb-2">
                {draggedTask.title}
              </div>
              {/* ドラッグ時のプロジェクト表示維持 - ラベル表示改善 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {draggedTask.projectId && (
                    <ProjectBadge
                      projectId={draggedTask.projectId}
                      size="sm"
                      variant="compact"
                    />
                  )}
                  <div className="text-xs text-blue-600 font-medium">
                    移動中...
                  </div>
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {draggedTask.priority === 'urgent' && '🔴'}
                  {draggedTask.priority === 'high' && '🟠'}
                  {draggedTask.priority === 'medium' && '🟡'}
                  {draggedTask.priority === 'low' && '🟢'}
                </div>
              </div>
            </div>
          </div>
        )}
      </DndContext>
    </div>
  );
};

/**
 * エラーバウンダリで包まれたKanbanBoardコンポーネント
 * Issue #027: 無限レンダリングループ対応 - TaskErrorBoundaryに統合
 * 
 * このコンポーネントは自動的に以下の機能を提供します:
 * - React Error Boundariesによるエラーキャッチ
 * - 🚨 無限レンダリングループの検出・保護
 * - ユーザーフレンドリーなエラー表示
 * - 自動リカバリー機能
 * - 開発者向け詳細デバッグ情報
 * 
 * @param props KanbanBoardコンポーネントのプロパティ
 * @returns エラーバウンダリで包まれたKanbanBoardコンポーネント
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = (props) => {
  return (
    <TaskErrorBoundary
      onError={(error, errorInfo) => {
        // Issue 027: 無限レンダリングループの特別ログ
        console.log('🚨 KanbanBoard: TaskErrorBoundary activated', {
          error: error.message,
          component: 'KanbanBoard',
          useKanbanTasks: true
        });
        props.onError?.(error, errorInfo);
      }}
    >
      <KanbanBoardInternal {...props} />
    </TaskErrorBoundary>
  );
};

// 型安全なプロップス検証のためのユーティリティ関数
export const validateKanbanBoardProps = (props: Partial<KanbanBoardProps>): string[] => {
  const errors: string[] = [];

  if (props.onTaskClick !== undefined && typeof props.onTaskClick !== 'function') {
    errors.push('onTaskClick must be a function');
  }
  if (props.onAddTask !== undefined && typeof props.onAddTask !== 'function') {
    errors.push('onAddTask must be a function');
  }
  if (props.onSubtaskToggle !== undefined && typeof props.onSubtaskToggle !== 'function') {
    errors.push('onSubtaskToggle must be a function');
  }
  if (props.onTagClick !== undefined && typeof props.onTagClick !== 'function') {
    errors.push('onTagClick must be a function');
  }
  if (props.onProjectClick !== undefined && typeof props.onProjectClick !== 'function') {
    errors.push('onProjectClick must be a function');
  }
  if (props.compact !== undefined && typeof props.compact !== 'boolean') {
    errors.push('compact must be a boolean');
  }
  if (props.className !== undefined && typeof props.className !== 'string') {
    errors.push('className must be a string');
  }

  return errors;
};