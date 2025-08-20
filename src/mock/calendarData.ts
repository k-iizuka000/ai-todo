/**
 * カレンダー表示用のモックデータ
 */

import type { CalendarEvent, CalendarView, CalendarFilter } from '@/types/calendar';
import { mockTasks } from './tasks';

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

// カレンダーイベントのモックデータ
export const mockCalendarEvents: CalendarEvent[] = mockTasks
  .filter(task => task.dueDate) // 期限があるタスクのみ
  .map(taskToCalendarEvent);

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
    
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['todo', 'in_progress', 'done'];
    const priority = priorities[Math.floor(Math.random() * priorities.length)] as any;
    const status = statuses[Math.floor(Math.random() * statuses.length)] as any;
    
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

// 全体のカレンダーイベント
export const allCalendarEvents: CalendarEvent[] = [
  ...mockCalendarEvents,
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
  showOverdue: true
};

// 期間でフィルタリングする関数
export const getEventsInRange = (start: Date, end: Date): CalendarEvent[] => {
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
export const getTodaysEvents = (): CalendarEvent[] => {
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  return getEventsInRange(startOfDay, endOfDay);
};

// 今週のイベントを取得する関数
export const getThisWeeksEvents = (): CalendarEvent[] => {
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return getEventsInRange(startOfWeek, endOfWeek);
};

// 月のイベントを取得する関数
export const getMonthEvents = (date: Date): CalendarEvent[] => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return getEventsInRange(startOfMonth, endOfMonth);
};