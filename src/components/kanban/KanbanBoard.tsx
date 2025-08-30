/**
 * メインカンバンボードコンポーネント
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

/**
 * フィルタリング設定の型定義（useKanbanTasksから参照）
 */
interface TaskFilters {
  /** 検索クエリ */
  searchQuery?: string;
  /** 選択されたタグID */
  selectedTags?: string[];
  /** タグフィルターモード */
  tagFilterMode?: 'AND' | 'OR';
  /** ページタイプ */
  pageType?: 'all' | 'today' | 'important' | 'completed';
}

/**
 * KanbanBoardコンポーネントのProps
 * 設計書修正: tasks propsを削除し、直接購読パターンに変更
 * フィルター機能統合: Dashboard側の二重状態管理を排除
 */
interface KanbanBoardProps {
  /** タスククリック時のコールバック */
  onTaskClick?: (task: Task) => void;
  /** タスク追加時のコールバック */
  onAddTask?: (status: TaskStatus) => void;
  /** サブタスク完了切り替え時のコールバック */
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  /** タグクリック時のコールバック */
  onTagClick?: (tagId: string) => void;
  /** プロジェクトクリック時のコールバック */
  onProjectClick?: (projectId: string) => void;
  /** コンパクト表示モード */
  compact?: boolean;
  /** 追加のCSSクラス */
  className?: string;
  /** フィルタリング設定（Dashboard二重状態管理排除） */
  filters?: TaskFilters;
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
 * カンバンボードメインコンポーネント
 * 設計書対応: 状態管理アーキテクチャ修正（グループ1）
 * 
 * 主な変更点:
 * - tasks propsを削除し、Zustandストアから直接購読
 * - ローカル状態（taskList）を削除し、単一データソース原則を適用
 * - useKanbanTasks、useTaskActionsによる最適化されたデータ取得
 * 
 * 機能:
 * - タスクのドラッグ&ドロップによるステータス変更
 * - 同一カラム内でのタスクの順序変更
 * - サブタスクの完了状態切り替え
 * - コンパクト表示モードの切り替え
 * - アクセシビリティ対応
 * 
 * @param props KanbanBoardコンポーネントのプロパティ
 * @returns KanbanBoardコンポーネント
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  onTaskClick,
  onAddTask,
  onSubtaskToggle,
  onTagClick,
  onProjectClick,
  compact = false,
  className = '',
  filters
}) => {
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

  // サブタスクの完了状態を切り替え
  const handleSubtaskToggle = useCallback((taskId: string, subtaskId: string) => {
    try {
      // 設計書要件: 状態管理の一元化
      toggleSubtask(taskId, subtaskId);

      // 外部コールバックがあれば呼び出し
      if (onSubtaskToggle) {
        try {
          onSubtaskToggle(taskId, subtaskId);
        } catch (callbackError) {
          console.error('Error in onSubtaskToggle callback:', callbackError);
        }
      }
    } catch (error) {
      console.error('Error toggling subtask:', error);
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