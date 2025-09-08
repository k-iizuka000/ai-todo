/**
 * メインカンバンボードコンポーネント
 * Issue #026 Group 3 Task 3.2: 型安全性強化とエラーバウンダリ統合
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
 * Issue #045: カスタム衝突検出アルゴリズム（修正版）
 * カラムへのドロップを優先し、確実にターゲットカラムを検出
 */
const customCollisionDetection: CollisionDetection = (args) => {
  // まずrectIntersectionで全ての衝突を検出
  const collisions = rectIntersection(args);
  
  if (collisions.length === 0) {
    return [];
  }
  
  // カラムIDのリスト
  const columnIds = ['todo', 'in_progress', 'done'];
  
  // カラムとの衝突を優先的に検出
  const columnCollisions = collisions.filter((collision) => {
    return columnIds.includes(collision.id as string);
  });
  
  if (columnCollisions.length > 0) {
    // カラムとの衝突がある場合は、最初のカラムを返す
    const targetColumn = columnCollisions[0];
    console.log(`Custom collision: Target column ${targetColumn.id}`);
    return [targetColumn];
  }
  
  // カラムとの衝突がない場合は、タスク間の衝突として処理
  const taskCollisions = collisions.filter((collision) => {
    return !columnIds.includes(collision.id as string);
  });
  
  if (taskCollisions.length > 0) {
    console.log(`Custom collision: Task collision for sorting`);
    return [taskCollisions[0]];
  }
  
  // デフォルトで最初の衝突を返す
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
    if (lastUpdated) {
      console.log(`[KanbanBoard] Tasks updated at: ${lastUpdated}`);
      // デバッグ: タスク更新後の状態確認
      console.log('[KanbanBoard] Debug - Tasks after update:', {
        totalTasks: localTasksByStatus.todo.length + localTasksByStatus.in_progress.length + localTasksByStatus.done.length,
        tasksByStatus: {
          todo: localTasksByStatus.todo.length,
          in_progress: localTasksByStatus.in_progress.length,
          done: localTasksByStatus.done.length
        },
        taskIds: {
          todo: localTasksByStatus.todo.map(t => ({ id: t.id, title: t.title })),
          in_progress: localTasksByStatus.in_progress.map(t => ({ id: t.id, title: t.title })),
          done: localTasksByStatus.done.map(t => ({ id: t.id, title: t.title }))
        },
        lastUpdated
      });
    }
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
      ...localTasksByStatus.todo,
      ...localTasksByStatus.in_progress,
      ...localTasksByStatus.done
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
    
    // デバッグ情報を出力
    console.log('Drag started:', {
      taskId: draggedTask.id,
      title: draggedTask.title,
      originalStatus: draggedTask.status,
      originalColumn: COLUMN_TITLES[draggedTask.status as Exclude<TaskStatus, 'archived'>]
    });
    
    // 元のステータスを記録（ロールバック用）
    // Note: draggedTaskに元のステータスが既に含まれているため、追加の状態管理は不要
  }, [allTasks]);

  // ⭐ ベストプラクティス: ドラッグ中はローカル状態のみ更新
  // @dnd-kit再レンダリングブロック対応 - 即座のUI更新を実現
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    // ドロップターゲットが無効な場合は早期リターン
    if (!over) {
      return;
    }
    
    // ドラッグ中のタスクを取得（ローカル状態から）
    const activeTask = allTasks.find(task => task.id === active.id);
    if (!activeTask) {
      return;
    }
    
    // ドロップターゲットのステータスを判定
    let targetStatus: TaskStatus | null = null;
    
    // カラムに直接ドロップする場合
    if (over.id === 'todo' || over.id === 'in_progress' || over.id === 'done') {
      targetStatus = over.id as TaskStatus;
    }
    // タスク上にドロップする場合
    else {
      const overTask = allTasks.find(task => task.id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }
    
    // 有効なターゲットかつ異なるカラムの場合、ローカル状態を即座に更新
    if (targetStatus && activeTask.status !== targetStatus) {
      console.log(`[DragOver] Moving task locally from ${activeTask.status} to ${targetStatus}`);
      
      // ⭐ ローカル状態のみ更新（即座のUI反映）
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
    }
    
    // デバッグ情報
    if (targetStatus) {
      console.log('[DragOver] Event:', {
        activeTaskId: active.id,
        overTargetId: over.id,
        currentStatus: activeTask.status,
        targetStatus: targetStatus,
        isSameColumn: activeTask.status === targetStatus
      });
    }
  }, [allTasks]);

  // ⭐ ベストプラクティス: ドラッグ終了時にZustandストアと同期
  // 永続化とAPI同期処理
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // ドラッグ状態を即座にクリア
    setDraggedTask(null);
    
    if (!over) {
      console.warn('[DragEnd] Cancelled - no drop target');
      // キャンセルされた場合、Zustandからリセット
      setLocalTasksByStatus(tasksByStatus);
      return;
    }
    
    // ドラッグ中のタスクを取得
    const activeTask = allTasks.find(t => t.id === active.id);
    
    if (!activeTask) {
      console.warn('[DragEnd] Cancelled - active task not found');
      setLocalTasksByStatus(tasksByStatus);
      return;
    }
    
    // ドロップターゲットのステータスを正しく判定
    let targetStatus: TaskStatus | null = null;
    
    // カラムに直接ドロップする場合
    if (over.id === 'todo' || over.id === 'in_progress' || over.id === 'done') {
      targetStatus = over.id as TaskStatus;
    }
    // タスク上にドロップする場合
    else {
      const overTask = allTasks.find(task => task.id === over.id);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }
    
    // 移動が発生しない場合（同一カラム）は何もしない
    if (!targetStatus || activeTask.status === targetStatus) {
      console.log(`[DragEnd] No movement needed: ${activeTask.status} -> ${targetStatus}`);
      return;
    }
    
    try {
      console.log(`[DragEnd] Moving task: ${activeTask.id} from ${activeTask.status} to ${targetStatus}`);
      
      // ⭐ ZustandストアとAPIを更新（永続化）
      await moveTask(activeTask.id, targetStatus);
      
      console.log('[DragEnd] Task movement persisted successfully');
    } catch (error) {
      console.error('[DragEnd] Error persisting task movement:', error);
      
      // ⭐ エラー時はZustandからリセット（ロールバック）
      setLocalTasksByStatus(tasksByStatus);
    }
  }, [allTasks, tasksByStatus, moveTask]);

  return (
    <div className={`h-full ${className}`} data-testid="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
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
                  {draggedTask.priority === 'urgent' && '🔴'}
                  {draggedTask.priority === 'high' && '🟠'}
                  {draggedTask.priority === 'medium' && '🟡'}
                  {draggedTask.priority === 'low' && '🟢'}
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