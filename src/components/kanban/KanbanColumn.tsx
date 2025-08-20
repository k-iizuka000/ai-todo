/**
 * カンバン列コンポーネント
 */

import React, { useMemo } from 'react';
import { Task, TaskStatus } from '@/types/task';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { TaskCardCompact } from './TaskCardCompact';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

/**
 * KanbanColumnコンポーネントのProps
 */
interface KanbanColumnProps {
  /** カラムのタスクステータス */
  status: TaskStatus;
  /** カラムのタイトル（オプション） */
  title?: string;
  /** カラム内のタスクリスト */
  tasks: Task[];
  /** タスククリック時のコールバック */
  onTaskClick?: (task: Task) => void;
  /** タスク追加時のコールバック */
  onAddTask?: () => void;
  /** 設定ボタンクリック時のコールバック */
  onSettings?: () => void;
  /** タスク折りたたみ切り替え時のコールバック */
  onToggleTaskCollapse?: (taskId: string) => void;
  /** サブタスク切り替え時のコールバック */
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  /** コンパクト表示モード */
  compact?: boolean;
  /** 追加のCSSクラス */
  className?: string;
  /** 折りたたまれたタスクのIDセット */
  collapsedTasks?: Set<string>;
  /** ドラッグオーバー状態（外部制御用） */
  isDraggedOver?: boolean;
}

/**
 * カンバン列コンポーネント
 * 
 * dnd-kitのDroppable機能を使用してドロップ可能なカラムを実装。
 * タスクリストの表示、ドロップ時の視覚的フィードバック、
 * アクセシビリティ対応を提供。
 * 
 * 主な機能:
 * - ドロップ可能なカラムエリア
 * - ドラッグオーバー時の視覚的フィードバック
 * - タスクリストの表示（通常/コンパクトモード）
 * - 空の状態の表示
 * - アクセシビリティ対応（ARIA属性、スクリーンリーダー対応）
 * 
 * @param props KanbanColumnコンポーネントのプロパティ
 * @returns React.memoでメモ化されたKanbanColumnコンポーネント
 */
export const KanbanColumn: React.FC<KanbanColumnProps> = React.memo(({
  status,
  title,
  tasks,
  onTaskClick,
  onAddTask,
  onSettings,
  onToggleTaskCollapse,
  onSubtaskToggle,
  compact = false,
  className = '',
  collapsedTasks = new Set(),
  isDraggedOver = false
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  // ドロップインジケーター表示状態を決定
  const showDropIndicator = isOver || isDraggedOver;

  // メモ化されたタスクIDリスト
  const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);

  return (
    <div 
      className={`flex flex-col rounded-lg border h-full transition-colors duration-200 ${
        showDropIndicator 
          ? 'bg-blue-50 border-blue-300 shadow-lg' 
          : 'bg-gray-50 border-gray-200'
      } ${className}`}
      role="region"
      aria-label={`${title || status} カラム`}
      aria-describedby={`${status}-count`}
    >
      {/* カラムヘッダー */}
      <ColumnHeader
        status={status}
        title={title || ''}
        taskCount={tasks.length}
        onAddTask={onAddTask}
        onSettings={onSettings}
      />

      {/* タスクリスト */}
      <div
        ref={setNodeRef}
        className="flex-1 p-4 space-y-3 overflow-y-auto min-h-[200px]"
        role="list"
        aria-label={`${title || status} のタスク一覧`}
        aria-live="polite"
        aria-atomic="false"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div 
              className="flex items-center justify-center h-32 text-gray-500 text-sm"
              role="status"
              aria-label="タスクが存在しません"
            >
              タスクがありません
            </div>
          ) : (
            tasks.map((task) => (
              <div 
                key={task.id}
                role="listitem"
              >
                {compact ? (
                  <TaskCardCompact
                    task={task}
                    onClick={onTaskClick}
                  />
                ) : (
                  <TaskCard
                    task={task}
                    isCollapsed={collapsedTasks.has(task.id)}
                    onToggleCollapse={onToggleTaskCollapse}
                    onSubtaskToggle={onSubtaskToggle}
                    onClick={onTaskClick}
                  />
                )}
              </div>
            ))
          )}
        </SortableContext>
      </div>
      
      {/* ドロップエリアインジケーター */}
      <div 
        className={`h-2 transition-all duration-200 bg-blue-200 rounded-b-lg ${
          showDropIndicator ? 'opacity-100' : 'opacity-0'
        }`}
        aria-hidden="true"
      />
    </div>
  );
});