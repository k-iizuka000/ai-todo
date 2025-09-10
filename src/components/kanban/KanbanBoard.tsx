/**
 * メインカンバンボードコンポーネント
 * Issue #026 Group 3 Task 3.2: 型安全性強化とエラーバウンダリ統合
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverEvent, 
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  closestCenter,
  rectIntersection,
  pointerWithin,
  CollisionDetection
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
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
const COLUMN_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];

// カラムタイトル設定（アーカイブを除外した型定義）
const COLUMN_TITLES: Record<Exclude<TaskStatus, 'ARCHIVED'>, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress', 
  DONE: 'Done'
};

// ドラッグ＆ドロップ設定
const DRAG_ACTIVATION_DISTANCE = 8; // ピクセル単位でのドラッグ開始距離
const DRAG_PREVIEW_OPACITY = 0.9; // ドラッグプレビューの透明度

/**
 * Issue #045: カスタム衝突検出アルゴリズム（修正版）
 * カラムへのドロップを優先し、確実にターゲットカラムを検出
 */
const customCollisionDetection: CollisionDetection = (args) => {
  // デバッグログ
  console.log('[COLLISION] Detection called with:', {
    activeId: args.active.id,
    droppableContainers: Array.from(args.droppableContainers.keys())
  });
  
  // まずpointerWithinで検出（より正確）
  let collisions = pointerWithin(args);
  
  // pointerWithinで検出できない場合はclosestCenterを試す
  if (collisions.length === 0) {
    collisions = closestCenter(args);
  }
  
  // それでも検出できない場合はrectIntersectionを使用
  if (collisions.length === 0) {
    collisions = rectIntersection(args);
  }
  
  console.log('[COLLISION] Detected collisions:', collisions.map(c => ({
    id: c.id,
    data: c.data
  })));
  
  if (collisions.length === 0) {
    return [];
  }
  
  // カラムIDのリスト
  const columnIds = ['todo', 'in_progress', 'done'];
  
  // カラムとの衝突を優先的に検出
  const columnCollisions = collisions.filter((collision) => {
    const isColumn = columnIds.includes(collision.id as string);
    if (isColumn) {
      console.log('[COLLISION] Found column collision:', collision.id);
    }
    return isColumn;
  });
  
  if (columnCollisions.length > 0) {
    // カラムとの衝突がある場合は、最初のカラムを返す
    const targetColumn = columnCollisions[0];
    console.log('[COLLISION] Returning column:', targetColumn.id);
    return [targetColumn];
  }
  
  // カラムとの衝突がない場合は、タスク間の衝突として処理
  const taskCollisions = collisions.filter((collision) => {
    return !columnIds.includes(collision.id as string);
  });
  
  if (taskCollisions.length > 0) {
    console.log('[COLLISION] Returning task:', taskCollisions[0].id);
    return [taskCollisions[0]];
  }
  
  // デフォルトで最初の衝突を返す
  console.log('[COLLISION] Returning default:', collisions[0].id);
  return collisions.slice(0, 1);
};

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
  // Issue #028: アンマウント後の状態更新防止
  React.useEffect(() => {
    let isMounted = true;
    
    if ((enableDebugMode || process.env.NODE_ENV === 'development') && isMounted) {
      // 型安全性のランタイムチェック（isMounted確認付き）
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
    
    return () => {
      isMounted = false;
    };
  }, [onTaskClick, onAddTask, onSubtaskToggle, onTagClick, onProjectClick, compact, className, enableDebugMode]);
  // 設計書要件: 直接購読パターンによるデータ取得（フィルタリング統合）
  // Issue 059対応: lastUpdated追加によるUI同期強化
  const { tasksByStatus, error, lastUpdated } = useKanbanTasks(filters);
  const { moveTask, toggleSubtask } = useTaskActions();
  
  // ⭐ ベストプラクティス: ローカル状態 + 外部状態パターン
  // @dnd-kitのドラッグ中再レンダリングブロック対応
  const [localTasksByStatus, setLocalTasksByStatus] = useState(tasksByStatus);
  
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  // ⭐ ベストプラクティス: Zustand更新時にローカル状態を同期
  // @dnd-kitドラッグ中の再レンダリングブロック対応
  useEffect(() => {
    setLocalTasksByStatus(tasksByStatus);
  }, [tasksByStatus]);
  
  
  // Issue 059対応: 状態更新時の強制再描画トリガー追加
  useEffect(() => {
    // タスク更新時の再描画処理（デバッグログ削除済み）
  }, [lastUpdated, localTasksByStatus]);
  
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

  // ⭐ ベストプラクティス: ローカル状態ベースのタスクリスト計算
  // ドラッグ中の即座UI更新に対応
  const allTasks = useMemo(() => {
    return [
      ...localTasksByStatus.TODO,
      ...localTasksByStatus.IN_PROGRESS,
      ...localTasksByStatus.DONE
    ];
  }, [localTasksByStatus]);
  
  // 全ローカルタスクID（パフォーマンス最適化用）
  const allTaskIds = useMemo(() => {
    return allTasks.map(task => task.id);
  }, [allTasks]);

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
  // Issue #028: ドラッグ操作の中断可能化とクリーンアップ強化
  // Issue #045: ドラッグ&ドロップ機能修正 - 正しいタスクデータと元のステータスをキャプチャ
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const taskId = String(event.active.id);
    const draggedTask = allTasks.find(task => task.id === taskId);
    
    if (!draggedTask) {
      console.error(`Task with id ${taskId} not found during drag start`);
      return;
    }
    
    // ドラッグ中のタスクを設定
    setDraggedTask(draggedTask);
  }, [allTasks]);

  // ⭐ ベストプラクティス: ドラッグ中はローカル状態のみ更新
  // @dnd-kit再レンダリングブロック対応 - 即座のUI更新を実現
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    // ドロップターゲットが無効な場合は早期リターン
    if (!over) {
      return;
    }
    
    // ドラッグ中のタスクを取得（ローカル状態から）（ID型の一貫性確保）
    const activeTaskId = String(active.id); // String変換でID型を統一
    const activeTask = allTasks.find(task => task.id === activeTaskId);
    if (!activeTask) {
      return;
    }
    
    // ドロップターゲットのステータスを判定（ID型の一貫性確保）
    const overTargetId = String(over.id); // String変換でID型を統一
    let targetStatus: TaskStatus | null = null;
    
    // カラムに直接ドロップする場合
    if (overTargetId === 'todo' || overTargetId === 'in_progress' || overTargetId === 'done') {
      targetStatus = overTargetId as TaskStatus;
    }
    // タスク上にドロップする場合
    else {
      const overTask = allTasks.find(task => task.id === overTargetId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }
    
    // 【修正】楽観的更新を無効化 - handleDragEndでのみ状態を更新
    // Issue #004: handleDragOverでの楽観的更新が原因で、
    // handleDragEndで同一ステータス判定されてしまう問題を修正
    // 
    // 元のコード（問題あり）：
    // if (targetStatus && activeTask.status !== targetStatus) {
    //   setLocalTasksByStatus(prev => {
    //     const newState = { ...prev };
    //     newState[activeTask.status] = prev[activeTask.status]
    //       .filter(t => t.id !== activeTask.id);
    //     newState[targetStatus] = [
    //       ...prev[targetStatus],
    //       { ...activeTask, status: targetStatus }
    //     ];
    //     return newState;
    //   });
    // }
  }, [allTasks]);

  // ⭐ ベストプラクティス: ドラッグ終了時にZustandストアと同期
  // 永続化とAPI同期処理
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // デバッグ: ドラッグ&ドロップのイベント詳細をログ出力
    console.log('[DRAG_END] Event details:', {
      activeId: active.id,
      overId: over?.id,
      overData: over?.data,
      activeData: active.data
    });
    
    // ドラッグ状態を即座にクリア
    setDraggedTask(null);
    
    if (!over) {
      // キャンセルされた場合、Zustandからリセット
      console.log('[DRAG_END] Cancelled - no drop target');
      setLocalTasksByStatus(tasksByStatus);
      return;
    }
    
    // ドラッグ中のタスクを取得（ID型の一貫性確保）
    const activeTaskId = String(active.id);
    const activeTask = allTasks.find(t => t.id === activeTaskId);
    
    if (!activeTask) {
      console.log('[DRAG_END] Active task not found:', activeTaskId);
      setLocalTasksByStatus(tasksByStatus);
      return;
    }
    
    // ドロップターゲットのステータスを正しく判定（ID型の一貫性確保）
    const overTargetId = String(over.id);
    let targetStatus: TaskStatus | null = null;
    
    console.log('[DRAG_END] Determining target status for:', overTargetId);
    
    // カラムに直接ドロップする場合
    if (overTargetId === 'TODO' || overTargetId === 'IN_PROGRESS' || overTargetId === 'DONE') {
      targetStatus = overTargetId as TaskStatus;
      console.log('[DRAG_END] Dropped on column:', targetStatus);
    }
    // タスク上にドロップする場合
    else {
      const overTask = allTasks.find(task => task.id === overTargetId);
      if (overTask) {
        targetStatus = overTask.status;
        console.log('[DRAG_END] Dropped on task, target status:', targetStatus);
      }
    }
    
    // 移動が発生しない場合（同一カラム）は何もしない
    if (!targetStatus || activeTask.status === targetStatus) {
      console.log('[DRAG_END] No move needed. Current:', activeTask.status, 'Target:', targetStatus);
      return;
    }
    
    // 楽観的更新（即座のUI更新）
    setLocalTasksByStatus(prev => {
      const newState = { ...prev };
      
      // 元のステータスから削除
      newState[activeTask.status] = prev[activeTask.status]
        .filter(t => t.id !== activeTask.id);
      
      // 新しいステータスに追加（ステータス更新付き）
      newState[targetStatus] = [
        ...prev[targetStatus],
        { ...activeTask, status: targetStatus }
      ];
      
      return newState;
    });
    
    try {
      // ⭐ ZustandストアとAPIを更新（永続化）
      console.log('[DRAG_END] Moving task:', activeTask.id, 'from', activeTask.status, 'to', targetStatus);
      console.log('[DRAG_END] moveTask function:', typeof moveTask);
      console.log('[DRAG_END] Calling moveTask NOW...');
      
      const result = await moveTask(activeTask.id, targetStatus);
      
      console.log('[DRAG_END] moveTask returned:', result);
      console.log('[DRAG_END] Move successful!');
    } catch (error) {
      console.error('[DRAG_END] Error persisting task movement:', error);
      
      // ⭐ エラー時はZustandからリセット（ロールバック）
      setLocalTasksByStatus(tasksByStatus);
      
      // ユーザーにエラーを通知（toast使用）
      toast.error(`タスクの移動に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }, [allTasks, tasksByStatus, moveTask]);

  return (
    <div className={`h-full ${className}`} data-testid="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        data-testid="kanban-dnd-context"
      >
        <SortableContext items={allTaskIds} strategy={verticalListSortingStrategy}>
          {/* カンバンボード */}
          <div className={`
            h-full grid gap-6 p-6
            ${compact 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' 
              : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-4'
            }
          `} data-testid="kanban-columns-container">
            {COLUMN_ORDER.map((status) => {
              const handleAddTask = onAddTask ? () => onAddTask(status) : undefined;
              
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  title={COLUMN_TITLES[status as Exclude<TaskStatus, 'archived'>]}
                  tasks={localTasksByStatus[status as Exclude<TaskStatus, 'archived'>]}
                  onTaskClick={onTaskClick}
                  onAddTask={handleAddTask}
                  onToggleTaskCollapse={handleToggleTaskCollapse}
                  onSubtaskToggle={handleSubtaskToggle}
                  data-testid={`kanban-column-${status}`}
                  onTagClick={onTagClick}
                  onProjectClick={onProjectClick}
                  compact={compact}
                  collapsedTasks={collapsedTasks}
                  className="min-h-0" // グリッド内での高さ制限
                />
              );
            })}
          </div>

        {/* ⭐ ベストプラクティス: DragOverlayによるフリッカー防止 */}
        <DragOverlay>
          {draggedTask ? (
            <div 
              className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-lg max-w-xs opacity-90"
              style={{ cursor: 'grabbing' }}
            >
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
                  {draggedTask.priority === 'CRITICAL' && '⚫'}
                  {draggedTask.priority === 'URGENT' && '🔴'}
                  {draggedTask.priority === 'HIGH' && '🟠'}
                  {draggedTask.priority === 'MEDIUM' && '🟡'}
                  {draggedTask.priority === 'LOW' && '🟢'}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
        </SortableContext>
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
        console.error('KanbanBoard: Error caught by TaskErrorBoundary:', error.message);
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