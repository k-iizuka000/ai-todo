/**
 * カンバン列コンポーネント
 * グループ4: 各カラムでの表示一貫性確保機能を含む
 */

import React, { useMemo, useEffect } from 'react';
import { Task, TaskStatus } from '@/types/task';
import { ColumnHeader } from './ColumnHeader';
import { TaskCard } from './TaskCard';
import { TaskCardCompact } from './TaskCardCompact';
import { useDroppable } from '@dnd-kit/core';
import { useProjectHelper } from '@/stores/projectStore';
import { safeGetTime } from '@/utils/dateUtils';

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
  /** タグクリック時のコールバック */
  onTagClick?: (tagId: string) => void;
  /** プロジェクトクリック時のコールバック */
  onProjectClick?: (projectId: string) => void;
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
 * KanbanColumn用のカスタム比較関数
 * Task配列の深い比較と日付フィールドの型安全な比較を行い、React.memoでの比較エラーを防ぐ
 */
const areKanbanColumnPropsEqual = (prevProps: KanbanColumnProps, nextProps: KanbanColumnProps): boolean => {
  // 基本プロパティの比較
  if (prevProps.status !== nextProps.status ||
      prevProps.title !== nextProps.title ||
      prevProps.compact !== nextProps.compact ||
      prevProps.className !== nextProps.className ||
      prevProps.isDraggedOver !== nextProps.isDraggedOver ||
      prevProps.onTaskClick !== nextProps.onTaskClick ||
      prevProps.onAddTask !== nextProps.onAddTask ||
      prevProps.onSettings !== nextProps.onSettings ||
      prevProps.onToggleTaskCollapse !== nextProps.onToggleTaskCollapse ||
      prevProps.onSubtaskToggle !== nextProps.onSubtaskToggle ||
      prevProps.onTagClick !== nextProps.onTagClick ||
      prevProps.onProjectClick !== nextProps.onProjectClick) {
    return false;
  }

  // collapsedTasks Set の比較
  const prevCollapsed = prevProps.collapsedTasks || new Set();
  const nextCollapsed = nextProps.collapsedTasks || new Set();
  if (prevCollapsed.size !== nextCollapsed.size) {
    return false;
  }
  for (const taskId of prevCollapsed) {
    if (!nextCollapsed.has(taskId)) {
      return false;
    }
  }

  // tasks配列の比較
  const prevTasks = prevProps.tasks || [];
  const nextTasks = nextProps.tasks || [];
  if (prevTasks.length !== nextTasks.length) {
    return false;
  }

  // 各タスクの深い比較
  for (let i = 0; i < prevTasks.length; i++) {
    const prevTask = prevTasks[i];
    const nextTask = nextTasks[i];
    
    if (!prevTask || !nextTask) {
      return false;
    }

    // タスクの基本フィールド比較
    if (prevTask.id !== nextTask.id ||
        prevTask.title !== nextTask.title ||
        prevTask.description !== nextTask.description ||
        prevTask.status !== nextTask.status ||
        prevTask.priority !== nextTask.priority ||
        prevTask.projectId !== nextTask.projectId ||
        prevTask.assigneeId !== nextTask.assigneeId ||
        prevTask.estimatedHours !== nextTask.estimatedHours ||
        prevTask.actualHours !== nextTask.actualHours ||
        prevTask.createdBy !== nextTask.createdBy ||
        prevTask.updatedBy !== nextTask.updatedBy) {
      return false;
    }

    // 日付フィールドの型安全な比較
    const prevDueTime = safeGetTime(prevTask.dueDate);
    const nextDueTime = safeGetTime(nextTask.dueDate);
    const prevCreatedTime = safeGetTime(prevTask.createdAt);
    const nextCreatedTime = safeGetTime(nextTask.createdAt);
    const prevUpdatedTime = safeGetTime(prevTask.updatedAt);
    const nextUpdatedTime = safeGetTime(nextTask.updatedAt);
    const prevArchivedTime = safeGetTime(prevTask.archivedAt);
    const nextArchivedTime = safeGetTime(nextTask.archivedAt);

    if (prevDueTime !== nextDueTime ||
        prevCreatedTime !== nextCreatedTime ||
        prevUpdatedTime !== nextUpdatedTime ||
        prevArchivedTime !== nextArchivedTime) {
      return false;
    }

    // タグ配列の比較
    const prevTags = prevTask.tags || [];
    const nextTags = nextTask.tags || [];
    if (prevTags.length !== nextTags.length) {
      return false;
    }
    for (let j = 0; j < prevTags.length; j++) {
      const prevTag = prevTags[j];
      const nextTag = nextTags[j];
      if (!prevTag || !nextTag ||
          prevTag.id !== nextTag.id ||
          prevTag.name !== nextTag.name ||
          prevTag.color !== nextTag.color) {
        return false;
      }
    }

    // サブタスク配列の比較
    const prevSubtasks = prevTask.subtasks || [];
    const nextSubtasks = nextTask.subtasks || [];
    if (prevSubtasks.length !== nextSubtasks.length) {
      return false;
    }
    for (let j = 0; j < prevSubtasks.length; j++) {
      const prevSubtask = prevSubtasks[j];
      const nextSubtask = nextSubtasks[j];
      if (!prevSubtask || !nextSubtask ||
          prevSubtask.id !== nextSubtask.id ||
          prevSubtask.title !== nextSubtask.title ||
          prevSubtask.completed !== nextSubtask.completed) {
        return false;
      }
    }

    // scheduleInfo の比較
    const prevSchedule = prevTask.scheduleInfo;
    const nextSchedule = nextTask.scheduleInfo;
    if (prevSchedule && nextSchedule) {
      if (prevSchedule.startDate !== nextSchedule.startDate ||
          prevSchedule.endDate !== nextSchedule.endDate) {
        return false;
      }
    } else if (prevSchedule || nextSchedule) {
      return false;
    }
  }

  return true;
};

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
  onTagClick,
  onProjectClick,
  compact = false,
  className = '',
  collapsedTasks = new Set(),
  isDraggedOver = false
}) => {
  // プロジェクトストアからプロジェクト情報取得用ヘルパーを取得
  const { getProjectById } = useProjectHelper();
  
  // Issue #045: ドラッグ&ドロップ機能修正 - カラムステータスをIDとして明確に設定
  const { setNodeRef, isOver, active } = useDroppable({
    id: status, // カラムのステータスをドロップゾーンのIDとして使用
    data: {
      type: 'column',
      status: status
    }
  });

  // Issue #045: ドラッグ&ドロップ機能修正 - 視覚的フィードバックの改善
  // ドロップインジケーター表示状態を決定
  const showDropIndicator = isOver || isDraggedOver;
  
  // 同一カラムへのドロップかチェック（視覚的フィードバック用）
  const isSameColumn = active && tasks.some(task => task.id === active.id);
  const isValidDropTarget = showDropIndicator && !isSameColumn;

  // 各カラムでのプロジェクト表示一貫性チェック
  const columnProjectConsistency = useMemo(() => {
    const projectInfo = new Map<string, {
      count: number;
      project: any;
      taskIds: string[];
    }>();

    tasks.forEach(task => {
      if (task.projectId) {
        const project = getProjectById(task.projectId);
        if (project) {
          if (!projectInfo.has(task.projectId)) {
            projectInfo.set(task.projectId, {
              count: 0,
              project,
              taskIds: []
            });
          }
          const info = projectInfo.get(task.projectId)!;
          info.count++;
          info.taskIds.push(task.id);
        }
      }
    });

    return {
      totalTasks: tasks.length,
      tasksWithProjects: tasks.filter(t => t.projectId).length,
      uniqueProjects: projectInfo.size,
      projectBreakdown: Array.from(projectInfo.entries()).map(([projectId, info]) => ({
        projectId,
        projectName: info.project.name,
        projectColor: info.project.color,
        taskCount: info.count,
        taskIds: info.taskIds
      }))
    };
  }, [tasks, getProjectById]);

  // 開発環境でのカラム表示一貫性ログ
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && tasks.length > 0) {
      console.log(`Kanban Column "${title || status}" Project Consistency:`, {
        status,
        consistency: columnProjectConsistency,
        timestamp: new Date().toISOString()
      });
    }
  }, [status, title, columnProjectConsistency, tasks.length]);

  return (
    <div 
      className={`flex flex-col rounded-lg border h-full transition-all duration-200 ${
        isValidDropTarget 
          ? 'bg-blue-50 border-blue-400 shadow-lg ring-2 ring-blue-300 ring-opacity-50' 
          : isSameColumn && showDropIndicator
          ? 'bg-gray-100 border-gray-400 opacity-60' // 同一カラムの場合は薄く表示
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

      {/* ドロップゾーン（カラム全体をカバー） */}
      {/* Issue #045: ドラッグ&ドロップ機能修正 - setNodeRefを適切に適用 */}
      <div
        ref={setNodeRef}
        className="flex-1 relative"
        role="region"
        aria-label={`${title || status} ドロップエリア`}
        data-testid={`column-${status}`}
        data-droppable-status={status}
      >
        {/* 透明ドロップレイヤー（カラム全体をカバー） */}
        <div 
          className="absolute inset-0 z-0" 
          aria-hidden="true"
          title={`${title || status} エリアにタスクをドロップ`}
        />
        
        {/* タスクリスト */}
        <div
          className="p-4 space-y-3 overflow-y-auto min-h-[200px] relative z-10"
          role="list"
          aria-label={`${title || status} のタスク一覧`}
          aria-live="polite"
          aria-atomic="false"
        >
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
                data-testid="task-item"
              >
                {compact ? (
                  <TaskCardCompact
                    task={task}
                    onClick={onTaskClick}
                    onTagClick={onTagClick}
                    onProjectClick={onProjectClick}
                  />
                ) : (
                  <TaskCard
                    task={task}
                    isCollapsed={collapsedTasks.has(task.id)}
                    onToggleCollapse={onToggleTaskCollapse}
                    onSubtaskToggle={onSubtaskToggle}
                    onClick={onTaskClick}
                    onTagClick={onTagClick}
                    onProjectClick={onProjectClick}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* ドロップエリアインジケーター */}
      {/* Issue #045: ドラッグ&ドロップ機能修正 - 視覚的フィードバックの強化 */}
      <div 
        className={`h-2 transition-all duration-200 rounded-b-lg ${
          isValidDropTarget 
            ? 'bg-blue-400 opacity-100' 
            : isSameColumn && showDropIndicator
            ? 'bg-gray-300 opacity-50' // 同一カラムは薄いグレー
            : 'bg-blue-200 opacity-0'
        }`}
        aria-hidden="true"
      />
    </div>
  );
}, areKanbanColumnPropsEqual);