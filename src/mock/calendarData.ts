/**
 * カレンダー表示用のモックデータ
 */

import type { CalendarEvent, CalendarView, CalendarFilter, SubtaskCalendarEvent } from '../types/calendar';
import type { Task, Subtask, ExtendedSubtask, Priority, TaskStatus } from '../types/task';
import { mockTasks, mockExtendedSubtasksData } from './tasks';

// タスクからカレンダーイベントを生成する関数
const taskToCalendarEvent = (task: typeof mockTasks[0]): CalendarEvent => {
  const startDate = task.dueDate || new Date();
  const endDate = new Date(startDate);
  
  // 見積時間に基づいて終了時間を設定（デフォルトは2時間）
  endDate.setHours(endDate.getHours() + (task.estimatedHours || 2));

  return {
    id: `event-${task.id}`,
    taskId: task.id,
    title: task.title,
    start: startDate,
    end: endDate,
    allDay: !task.estimatedHours || task.estimatedHours >= 8, // 8時間以上は終日イベント
    color: getPriorityColor(task.priority),
    priority: task.priority,
    status: task.status,
    description: task.description
  };
};

// 優先度に基づく色を取得する関数
const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return '#EF4444'; // 赤
    case 'high':
      return '#F97316'; // オレンジ
    case 'medium':
      return '#EAB308'; // 黄色
    case 'low':
      return '#22C55E'; // 緑
    default:
      return '#6B7280'; // グレー
  }
};

// ExtendedSubtaskからカレンダーイベントを生成する関数
const extendedSubtaskToCalendarEvent = (extendedSubtask: ExtendedSubtask, parentTask?: Task): SubtaskCalendarEvent => {
  // サブタスクの期限がない場合は親タスクの期限またはデフォルト日付を使用
  const startDate = extendedSubtask.dueDate || parentTask?.dueDate || new Date();
  const endDate = new Date(startDate);
  
  // 見積時間に基づいて終了時間を設定
  const estimatedHours = extendedSubtask.estimatedHours || 1;
  endDate.setHours(endDate.getHours() + estimatedHours);

  return {
    id: `subtask-event-${extendedSubtask.id}`,
    taskId: extendedSubtask.parentTaskId,
    subtaskId: extendedSubtask.id,
    subtask: {
      id: extendedSubtask.id,
      title: extendedSubtask.title,
      completed: extendedSubtask.completed,
      dueDate: extendedSubtask.dueDate,
      createdAt: extendedSubtask.createdAt,
      updatedAt: extendedSubtask.updatedAt
    },
    parentTaskTitle: parentTask?.title || 'Unknown Task',
    parentTaskId: extendedSubtask.parentTaskId,
    isSubtask: true,
    title: extendedSubtask.title,
    description: extendedSubtask.description,
    start: startDate,
    end: endDate,
    allDay: estimatedHours >= 8, // 8時間以上は終日イベント
    color: getPriorityColor(extendedSubtask.priority),
    priority: extendedSubtask.priority,
    status: extendedSubtask.status
  };
};

// 互換性のためのレガシー関数（既存のサブタスク型用）
const subtaskToCalendarEvent = (task: Task, subtask: Subtask): SubtaskCalendarEvent => {
  // サブタスクの期限がない場合は親タスクの期限を使用
  const startDate = subtask.dueDate || task.dueDate || new Date();
  const endDate = new Date(startDate);
  
  // 見積時間に基づいて終了時間を設定（サブタスクは通常短時間）
  endDate.setHours(endDate.getHours() + 1); // デフォルト1時間

  return {
    id: `subtask-event-${subtask.id}`,
    taskId: task.id,
    subtaskId: subtask.id,
    subtask,
    parentTaskTitle: task.title,
    parentTaskId: task.id,
    isSubtask: true,
    title: subtask.title,
    start: startDate,
    end: endDate,
    allDay: false,
    color: getPriorityColor(task.priority),
    priority: task.priority,
    status: subtask.completed ? 'done' : 'todo' // サブタスクの完了状態をステータスに変換
  };
};

// カレンダーイベントのモックデータ
export const mockCalendarEvents: CalendarEvent[] = mockTasks
  .filter(task => task.dueDate) // 期限があるタスクのみ
  .map(taskToCalendarEvent);

// ExtendedSubtaskイベントのモックデータ
export const mockExtendedSubtaskCalendarEvents: SubtaskCalendarEvent[] = mockExtendedSubtasksData
  .filter(subtask => subtask.dueDate) // 期限があるサブタスクのみ
  .map(subtask => {
    // 親タスクを見つける
    const parentTask = mockTasks.find(task => task.id === subtask.parentTaskId);
    return extendedSubtaskToCalendarEvent(subtask, parentTask);
  });

// 互換性のためのレガシーサブタスクイベント
export const mockSubtaskCalendarEvents: SubtaskCalendarEvent[] = mockTasks
  .filter(task => task.dueDate && task.subtasks.length > 0) // 期限があってサブタスクがあるタスクのみ
  .flatMap(task => 
    task.subtasks.map(subtask => subtaskToCalendarEvent(task, subtask))
  );

// 今週のイベントを追加で生成
const today = new Date();
const thisWeek = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(today);
  date.setDate(today.getDate() - today.getDay() + i); // 今週の日曜日から土曜日まで
  return date;
});

const additionalEvents: CalendarEvent[] = thisWeek.flatMap((date, dayIndex) => {
  const events: CalendarEvent[] = [];
  
  // 各日に1-3個のイベントを追加
  const eventCount = Math.floor(Math.random() * 3) + 1;
  
  for (let i = 0; i < eventCount; i++) {
    const startTime = new Date(date);
    startTime.setHours(9 + i * 3, 0, 0, 0); // 9時、12時、15時など
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 2); // 2時間のイベント
    
    const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    events.push({
      id: `additional-event-${dayIndex}-${i}`,
      taskId: `task-additional-${dayIndex}-${i}`,
      title: `スケジュールされたタスク ${dayIndex + 1}-${i + 1}`,
      start: startTime,
      end: endTime,
      allDay: false,
      color: getPriorityColor(priority),
      priority,
      status,
      description: `${date.toLocaleDateString('ja-JP')}の予定されたタスクです。`
    });
  }
  
  return events;
});

// 全体のカレンダーイベント（タスクイベント、ExtendedSubtaskイベント、追加イベント）
export const allCalendarEvents: (CalendarEvent | SubtaskCalendarEvent)[] = [
  ...mockCalendarEvents,
  ...mockExtendedSubtaskCalendarEvents,
  ...additionalEvents
];

// 全体のカレンダーイベント（レガシーサブタスク含む）
export const allCalendarEventsWithLegacy: (CalendarEvent | SubtaskCalendarEvent)[] = [
  ...mockCalendarEvents,
  ...mockSubtaskCalendarEvents,
  ...mockExtendedSubtaskCalendarEvents,
  ...additionalEvents
];

// デフォルトのカレンダービュー設定
export const defaultCalendarView: CalendarView = {
  type: 'month',
  currentDate: today,
  selectedDate: today
};

// デフォルトのフィルター設定
export const defaultCalendarFilter: CalendarFilter = {
  projectIds: [],
  assigneeIds: [],
  priorities: [],
  showCompleted: true,
  showOverdue: true,
  showSubtasks: true
};

// 期間でフィルタリングする関数
export const getEventsInRange = (start: Date, end: Date): (CalendarEvent | SubtaskCalendarEvent)[] => {
  return allCalendarEvents.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    return (
      (eventStart >= start && eventStart <= end) ||
      (eventEnd >= start && eventEnd <= end) ||
      (eventStart <= start && eventEnd >= end)
    );
  });
};

// 今日のイベントを取得する関数
export const getTodaysEvents = (): (CalendarEvent | SubtaskCalendarEvent)[] => {
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  return getEventsInRange(startOfDay, endOfDay);
};

// 今週のイベントを取得する関数
export const getThisWeeksEvents = (): (CalendarEvent | SubtaskCalendarEvent)[] => {
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return getEventsInRange(startOfWeek, endOfWeek);
};

// 月のイベントを取得する関数
export const getMonthEvents = (date: Date): (CalendarEvent | SubtaskCalendarEvent)[] => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return getEventsInRange(startOfMonth, endOfMonth);
};

// 追加のサンプルサブタスクイベント（カレンダー表示のテスト用）
const sampleExtendedSubtaskEvents: SubtaskCalendarEvent[] = [
  {
    id: 'sample-subtask-event-1',
    taskId: 'task-8',
    subtaskId: 'sample-subtask-1',
    subtask: {
      id: 'sample-subtask-1',
      title: 'テストケースの設計',
      completed: false,
      dueDate: new Date('2024-02-20T10:00:00Z'),
      createdAt: new Date('2024-01-16T16:00:00Z'),
      updatedAt: new Date('2024-01-16T16:00:00Z')
    },
    parentTaskTitle: 'ユニットテストの追加',
    parentTaskId: 'task-8',
    isSubtask: true,
    title: 'テストケースの設計',
    description: 'コンポーネントのテストケースを網羅的に設計',
    start: new Date('2024-02-20T10:00:00Z'),
    end: new Date('2024-02-20T14:00:00Z'),
    allDay: false,
    color: getPriorityColor('medium'),
    priority: 'medium',
    status: 'todo'
  },
  {
    id: 'sample-subtask-event-2',
    taskId: 'task-9',
    subtaskId: 'sample-subtask-2',
    subtask: {
      id: 'sample-subtask-2',
      title: 'WebSocket接続の実装',
      completed: false,
      dueDate: new Date('2024-03-15T14:00:00Z'),
      createdAt: new Date('2024-01-21T10:30:00Z'),
      updatedAt: new Date('2024-01-21T10:30:00Z')
    },
    parentTaskTitle: 'リアルタイム通知機能',
    parentTaskId: 'task-9',
    isSubtask: true,
    title: 'WebSocket接続の実装',
    description: 'リアルタイム通信のためのWebSocket接続を実装',
    start: new Date('2024-03-15T14:00:00Z'),
    end: new Date('2024-03-15T18:00:00Z'),
    allDay: false,
    color: getPriorityColor('low'),
    priority: 'low',
    status: 'todo'
  }
];

// サンプルイベントを追加したカレンダーイベント
export const enrichedCalendarEvents: (CalendarEvent | SubtaskCalendarEvent)[] = [
  ...allCalendarEvents,
  ...sampleExtendedSubtaskEvents
];