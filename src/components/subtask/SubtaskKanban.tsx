/**
 * サブタスクカンバンボードコンポーネント
 * サブタスクのステータス別表示とドラッグ&ドロップによるステータス変更を提供
 */

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskStatus, Task, Subtask } from '../../types/task';
import { useTaskStore } from '../../stores/taskStore';
import SubtaskCard from './SubtaskCard';
import SubtaskFilters, { SubtaskFilterOptions } from './SubtaskFilters';

// カンバンカラムの定義（archivedカラムを除去）
const KANBAN_COLUMNS: Array<{
  id: TaskStatus;
  title: string;
  color: string;
}> = [
  { id: 'todo', title: '未着手', color: 'bg-gray-50 border-gray-200' },
  { id: 'in_progress', title: '進行中', color: 'bg-blue-50 border-blue-200' },
  { id: 'done', title: '完了', color: 'bg-green-50 border-green-200' },
];

interface SubtaskWithParent {
  subtask: Subtask;
  parentTask: Task;
  status: TaskStatus;
}

// ソート可能なサブタスクアイテムコンポーネント
const SortableSubtaskItem: React.FC<{
  item: SubtaskWithParent;
  onEdit: (subtask: Subtask) => void;
  onDelete: (subtaskId: string) => void;
}> = ({ item, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${item.parentTask.id}_${item.subtask.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SubtaskCard
        subtask={item.subtask}
        parentTask={item.parentTask}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
};

// ドロップ可能なカラムコンポーネント
const DroppableColumn: React.FC<{
  column: { id: TaskStatus; title: string; color: string };
  items: SubtaskWithParent[];
  onEdit: (subtask: Subtask) => void;
  onDelete: (subtaskId: string) => void;
}> = ({ column, items, onEdit, onDelete }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const itemIds = items.map(item => `${item.parentTask.id}_${item.subtask.id}`);

  return (
    <div className="flex flex-col h-full">
      {/* カラムヘッダー */}
      <div className={`rounded-t-lg border-t border-l border-r p-4 ${column.color}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{column.title}</h3>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-gray-600">
            {items.length}
          </span>
        </div>
      </div>

      {/* カラムコンテンツ */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 border-l border-r border-b rounded-b-lg p-4 space-y-3 overflow-y-auto
          ${column.color}
          ${isOver ? 'bg-opacity-80' : ''}
        `}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableSubtaskItem
              key={`${item.parentTask.id}_${item.subtask.id}`}
              item={item}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>

        {/* 空状態の表示 */}
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">サブタスクがありません</div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SubtaskKanbanProps {
  className?: string;
}

export const SubtaskKanban: React.FC<SubtaskKanbanProps> = ({
  className = ''
}) => {
  const { tasks, updateTask } = useTaskStore();
  const [filters, setFilters] = useState<SubtaskFilterOptions>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // ドラッグセンサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // 全サブタスクと親タスク情報を取得
  const subtasksWithParent = useMemo((): SubtaskWithParent[] => {
    const result: SubtaskWithParent[] = [];
    
    tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          // サブタスクのステータスを適切に判定
          let status: TaskStatus;
          if (subtask.completed) {
            status = 'done';
          } else {
            // 簡易的にdueDateがある場合は進行中とみなす
            status = subtask.dueDate ? 'in_progress' : 'todo';
          }
          
          result.push({
            subtask,
            parentTask: task,
            status
          });
        });
      }
    });

    return result;
  }, [tasks]);

  // フィルタリングされたサブタスクを取得
  const filteredSubtasks = useMemo(() => {
    let filtered = subtasksWithParent;

    // 検索フィルター
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.subtask.title.toLowerCase().includes(searchLower) ||
        item.parentTask.title.toLowerCase().includes(searchLower)
      );
    }

    // ステータスフィルター
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(item => filters.status!.includes(item.status));
    }

    // 優先度フィルター（親タスクの優先度）
    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(item => filters.priority!.includes(item.parentTask.priority));
    }

    // 親タスクフィルター
    if (filters.parentTaskIds && filters.parentTaskIds.length > 0) {
      filtered = filtered.filter(item => filters.parentTaskIds!.includes(item.parentTask.id));
    }

    // 完了状態フィルター
    if (filters.completedOnly) {
      filtered = filtered.filter(item => item.subtask.completed);
    } else if (filters.incompleteOnly) {
      filtered = filtered.filter(item => !item.subtask.completed);
    }

    return filtered;
  }, [subtasksWithParent, filters]);

  // ステータス別にサブタスクをグループ化（archivedを除去）
  const groupedSubtasks = useMemo(() => {
    const groups: Record<TaskStatus, SubtaskWithParent[]> = {
      todo: [],
      in_progress: [],
      done: [],
      archived: []
    };

    filteredSubtasks.forEach(item => {
      groups[item.status].push(item);
    });

    return groups;
  }, [filteredSubtasks]);

  // 利用可能な親タスクリストを生成
  const availableParentTasks = useMemo(() => {
    const uniqueTasks = new Map<string, { id: string; title: string }>();
    
    subtasksWithParent.forEach(item => {
      uniqueTasks.set(item.parentTask.id, {
        id: item.parentTask.id,
        title: item.parentTask.title
      });
    });

    return Array.from(uniqueTasks.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [subtasksWithParent]);

  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // activeIdとoverIdから情報を取得
    const [activeParentTaskId, activeSubtaskId] = activeId.split('_');
    
    // overIdがカラムID（ステータス）の場合
    if (['todo', 'in_progress', 'done'].includes(overId)) {
      const newStatus = overId as TaskStatus;
      const newCompleted = newStatus === 'done';

      const parentTask = tasks.find(task => task.id === activeParentTaskId);
      if (!parentTask) return;

      // サブタスクのステータスを更新
      const updatedSubtasks = parentTask.subtasks.map(subtask =>
        subtask.id === activeSubtaskId
          ? { 
              ...subtask, 
              completed: newCompleted,
              // in_progressステータスの場合はdueDateを設定
              dueDate: newStatus === 'in_progress' && !subtask.dueDate 
                ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 1日後
                : subtask.dueDate,
              updatedAt: new Date() 
            }
          : subtask
      );

      updateTask(parentTask.id, {
        subtasks: updatedSubtasks
      });
    }
  };

  // サブタスクの削除
  const handleDeleteSubtask = (subtaskId: string) => {
    const subtaskWithParent = subtasksWithParent.find(item => item.subtask.id === subtaskId);
    if (!subtaskWithParent) return;

    const { parentTask } = subtaskWithParent;
    const updatedSubtasks = parentTask.subtasks.filter(subtask => subtask.id !== subtaskId);

    updateTask(parentTask.id, {
      subtasks: updatedSubtasks
    });
  };

  // サブタスクの編集
  const handleEditSubtask = (subtask: Subtask) => {
    // TODO: 編集モーダルまたはインライン編集の実装
    console.log('Edit subtask:', subtask);
  };

  // 統計情報の計算
  const stats = useMemo(() => {
    const total = filteredSubtasks.length;
    const completed = filteredSubtasks.filter(item => item.status === 'done').length;
    const inProgress = filteredSubtasks.filter(item => item.status === 'in_progress').length;
    const todo = filteredSubtasks.filter(item => item.status === 'todo').length;

    return {
      total,
      completed,
      inProgress,
      todo,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [filteredSubtasks]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* ヘッダー */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">サブタスク管理</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>合計: {stats.total}</span>
            <span>完了: {stats.completed}</span>
            <span>進行中: {stats.inProgress}</span>
            <span>未着手: {stats.todo}</span>
            <span className="font-medium">完了率: {stats.completionRate}%</span>
          </div>
        </div>

        {/* フィルター */}
        <SubtaskFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableParentTasks={availableParentTasks}
        />
      </div>

      {/* カンバンボード */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-3 gap-6 h-full">
            {KANBAN_COLUMNS.map(column => (
              <DroppableColumn
                key={column.id}
                column={column}
                items={groupedSubtasks[column.id]}
                onEdit={handleEditSubtask}
                onDelete={handleDeleteSubtask}
              />
            ))}
          </div>

          {/* ドラッグオーバーレイ */}
          <DragOverlay>
            {activeId ? (
              <div className="opacity-90">
                {(() => {
                  const activeItem = filteredSubtasks.find(item => 
                    `${item.parentTask.id}_${item.subtask.id}` === activeId
                  );
                  return activeItem ? (
                    <SubtaskCard
                      subtask={activeItem.subtask}
                      parentTask={activeItem.parentTask}
                      onEdit={() => {}}
                      onDelete={() => {}}
                      isDragging={true}
                    />
                  ) : null;
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default SubtaskKanban;