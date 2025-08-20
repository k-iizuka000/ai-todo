/**
 * カレンダー表示機能の型定義
 */

import type { Priority, TaskStatus } from './task';

// カレンダーイベント型
export interface CalendarEvent {
  id: string;
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  priority: Priority;
  status: TaskStatus;
  description?: string;
}

// カレンダービュー設定
export interface CalendarView {
  type: 'month' | 'week' | 'day' | 'agenda';
  currentDate: Date;
  selectedDate?: Date;
}

// カレンダーフィルター
export interface CalendarFilter {
  projectIds?: string[];
  assigneeIds?: string[];
  priorities?: Priority[];
  showCompleted: boolean;
  showOverdue?: boolean;
}

// カレンダー表示オプション
export interface CalendarOptions {
  view: CalendarView;
  filter: CalendarFilter;
  showWeekends: boolean;
  weekStartsOn: 0 | 1; // 0: 日曜日, 1: 月曜日
}