/**
 * メインカンバンボードコンポーネント
 */

import React, { useState, useMemo } from 'react';
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

interface KanbanBoardProps {
  tasks?: Task[];
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: TaskStatus) => void;
  compact?: boolean;
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

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks = mockTasks,
  onTaskMove,
  onTaskClick,
  onAddTask,
  compact = false,
  className = ''
}) => {
  const [taskList, setTaskList] = useState<Task[]>(tasks);
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  // dnd-kitのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px移動で開始
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
  const handleToggleTaskCollapse = (taskId: string) => {
    setCollapsedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // ドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    const draggedTask = taskList.find(task => task.id === event.active.id);
    setDraggedTask(draggedTask || null);
  };

  // ドラッグ中（リアルタイム移動）
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeTask = taskList.find(task => task.id === active.id);
    if (!activeTask) return;

    // 新しいステータスを判定
    let newStatus: TaskStatus;
    if (COLUMN_ORDER.includes(over.id as TaskStatus)) {
      // カラム上にドロップ
      newStatus = over.id as TaskStatus;
    } else {
      // 他のタスク上にドロップ - そのタスクのステータスを使用
      const overTask = taskList.find(task => task.id === over.id);
      if (!overTask) return;
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
  };

  // ドラッグ終了
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTask(null);

    if (!over) return;

    const activeTask = taskList.find(task => task.id === active.id);
    if (!activeTask) return;

    // 最終的なステータスを確定
    let finalStatus: TaskStatus = activeTask.status;
    if (COLUMN_ORDER.includes(over.id as TaskStatus)) {
      finalStatus = over.id as TaskStatus;
    } else {
      const overTask = taskList.find(task => task.id === over.id);
      if (overTask) {
        finalStatus = overTask.status;
      }
    }

    // 外部コールバック呼び出し
    if (activeTask.status !== finalStatus && onTaskMove) {
      onTaskMove(activeTask.id, finalStatus);
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
      }
    }
  };

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
          {COLUMN_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              title={COLUMN_TITLES[status]}
              tasks={tasksByStatus[status]}
              onTaskClick={onTaskClick}
              onAddTask={() => onAddTask && onAddTask(status)}
              onToggleTaskCollapse={handleToggleTaskCollapse}
              compact={compact}
              collapsedTasks={collapsedTasks}
              className="min-h-0" // グリッド内での高さ制限
            />
          ))}
        </div>

        {/* ドラッグプレビュー */}
        {draggedTask && (
          <div className="fixed top-4 left-4 z-50 opacity-90 pointer-events-none">
            <div className="bg-white border-2 border-blue-400 rounded-lg p-3 shadow-lg">
              <div className="font-medium text-sm text-gray-900">
                {draggedTask.title}
              </div>
            </div>
          </div>
        )}
      </DndContext>
    </div>
  );
};