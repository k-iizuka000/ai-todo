/**
 * メインカンバンボードコンポーネント
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/types/task';
import { KanbanColumn } from './KanbanColumn';
import { mockTasks } from '@/mock/tasks';
import { isTaskStatus, isValidTask } from '@/utils/typeGuards';
import { ProjectBadge } from '@/components/project/ProjectBadge';

/**
 * KanbanBoardコンポーネントのProps
 */
interface KanbanBoardProps {
  /** 表示するタスクリスト（デフォルト：モックデータ） */
  tasks?: Task[];
  /** タスク移動時のコールバック */
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
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
}

// ステータスの表示順序
const COLUMN_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done', 'archived'];

// カラムタイトル設定
const COLUMN_TITLES: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress', 
  done: 'Done',
  archived: 'Archived'
};

// ドラッグ＆ドロップ設定
const DRAG_ACTIVATION_DISTANCE = 8; // ピクセル単位でのドラッグ開始距離
const DRAG_PREVIEW_OPACITY = 0.9; // ドラッグプレビューの透明度

/**
 * カンバンボードメインコンポーネント
 * 
 * dnd-kitを使用したドラッグ&ドロップ機能付きのカンバンボード。
 * タスクの状態変更、リオーダリング、サブタスク管理などの機能を提供。
 * エラーハンドリングと型安全性を重視した実装。
 * 
 * 主な機能:
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
  tasks = mockTasks,
  onTaskMove,
  onTaskClick,
  onAddTask,
  onSubtaskToggle,
  onTagClick,
  onProjectClick,
  compact = false,
  className = ''
}) => {
  // 型安全な初期化
  const validatedTasks = useMemo(() => {
    try {
      return tasks.filter((task, index) => {
        if (!isValidTask(task)) {
          console.warn(`Invalid task at index ${index}:`, task);
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Error validating tasks:', error);
      return [];
    }
  }, [tasks]);

  const [taskList, setTaskList] = useState<Task[]>(validatedTasks);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // propsのタスクが変更された時にtaskListを同期
  useEffect(() => {
    setTaskList(validatedTasks);
  }, [validatedTasks]);

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

  // ステータス別にタスクを分類
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
      archived: []
    };
    
    taskList.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    
    return grouped;
  }, [taskList]);

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
      setTaskList(prev => prev.map(task => {
        if (task.id !== taskId) return task;
        
        const subtaskToUpdate = task.subtasks.find(sub => sub.id === subtaskId);
        if (!subtaskToUpdate) {
          console.warn(`Subtask with id ${subtaskId} not found in task ${taskId}`);
          return task;
        }

        const updatedSubtasks = task.subtasks.map(subtask => 
          subtask.id === subtaskId 
            ? { ...subtask, completed: !subtask.completed, updatedAt: new Date() }
            : subtask
        );

        return {
          ...task,
          subtasks: updatedSubtasks,
          updatedAt: new Date()
        };
      }));

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
  }, [onSubtaskToggle]);

  // ドラッグ開始
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedTask = taskList.find(task => task.id === event.active.id);
    setDraggedTask(draggedTask || null);
  }, [taskList]);

  // ドラッグ中（リアルタイム移動）
  const handleDragOver = useCallback((event: DragOverEvent) => {
    try {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeTask = taskList.find(task => task.id === active.id);
      if (!activeTask) {
        console.warn(`Task with id ${active.id} not found during drag over`);
        return;
      }

      // 新しいステータスを判定（型安全）
      let newStatus: TaskStatus;
      if (isTaskStatus(over.id) && COLUMN_ORDER.includes(over.id)) {
        // カラム上にドロップ
        newStatus = over.id;
      } else {
        // 他のタスク上にドロップ - そのタスクのステータスを使用
        const overTask = taskList.find(task => task.id === over.id);
        if (!overTask || !isValidTask(overTask)) {
          console.warn(`Target task with id ${over.id} not found or invalid during drag over`);
          return;
        }
        newStatus = overTask.status;
      }

      // ステータスが変わる場合のみ更新
      if (activeTask.status !== newStatus) {
        setTaskList(prev => prev.map(task => 
          task.id === active.id 
            ? { ...task, status: newStatus, updatedAt: new Date() }
            : task
        ));
      }
    } catch (error) {
      console.error('Error during drag over:', error);
    }
  }, [taskList]);

  // ドラッグ終了
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    try {
      const { active, over } = event;
      setDraggedTask(null);

      if (!over) {
        console.warn('Drag ended without valid drop target');
        return;
      }

      const activeTask = taskList.find(task => task.id === active.id);
      if (!activeTask) {
        console.error(`Task with id ${active.id} not found during drag end`);
        return;
      }

      // 最終的なステータスを確定（型安全）
      let finalStatus: TaskStatus = activeTask.status;
      if (isTaskStatus(over.id) && COLUMN_ORDER.includes(over.id)) {
        finalStatus = over.id;
      } else {
        const overTask = taskList.find(task => task.id === over.id);
        if (overTask && isValidTask(overTask)) {
          finalStatus = overTask.status;
        } else {
          console.warn(`Target task with id ${over.id} not found or invalid during drag end`);
        }
      }

      // 外部コールバック呼び出し
      if (activeTask.status !== finalStatus && onTaskMove) {
        try {
          onTaskMove(activeTask.id, finalStatus);
        } catch (callbackError) {
          console.error('Error in onTaskMove callback:', callbackError);
        }
      }

      // 同じカラム内でのリオーダリング
      if (activeTask.status === finalStatus && over.id !== active.id) {
        const columnTasks = tasksByStatus[finalStatus];
        const oldIndex = columnTasks.findIndex(task => task.id === active.id);
        const newIndex = columnTasks.findIndex(task => task.id === over.id);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
          setTaskList(prev => {
            const updatedTasks = [...prev];
            const allOtherTasks = updatedTasks.filter(task => task.status !== finalStatus);
            return [...allOtherTasks, ...reorderedTasks];
          });
        } else {
          console.warn(`Invalid indices for reordering: oldIndex=${oldIndex}, newIndex=${newIndex}`);
        }
      }
    } catch (error) {
      console.error('Critical error during drag end:', error);
      // ドラッグ状態をリセット
      setDraggedTask(null);
    }
  }, [taskList, tasksByStatus, onTaskMove]);

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
                title={COLUMN_TITLES[status]}
                tasks={tasksByStatus[status]}
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