/**
 * 型ガード関数群
 * ランタイムでの型安全性を提供する
 */

import { TaskStatus, Priority, Task, Subtask } from '@/types/task';
import { Tag } from '@/types/tag';
import { 
  ScheduleItemType, 
  ScheduleItemStatus, 
  ScheduleItem, 
  ScheduleViewSettings,
  DailySchedule 
} from '@/types/schedule';

/**
 * TaskStatus型のガード関数
 */
export const isTaskStatus = (value: unknown): value is TaskStatus => {
  return typeof value === 'string' && 
    ['todo', 'in_progress', 'done', 'archived'].includes(value);
};

/**
 * Priority型のガード関数
 */
export const isPriority = (value: unknown): value is Priority => {
  return typeof value === 'string' && 
    ['low', 'medium', 'high', 'urgent', 'critical'].includes(value);
};

/**
 * Tagオブジェクトの型ガード
 */
export const isTag = (value: unknown): value is Tag => {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as Tag).id === 'string' &&
    typeof (value as Tag).name === 'string' &&
    typeof (value as Tag).color === 'string';
};

/**
 * Subtaskオブジェクトの型ガード
 */
export const isSubtask = (value: unknown): value is Subtask => {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as Subtask).id === 'string' &&
    typeof (value as Subtask).title === 'string' &&
    typeof (value as Subtask).completed === 'boolean' &&
    (value as Subtask).createdAt instanceof Date &&
    (value as Subtask).updatedAt instanceof Date;
};

/**
 * Taskオブジェクトの型ガード（基本検証）
 */
export const isTask = (value: unknown): value is Task => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const task = value as Task;

  return (
    typeof task.id === 'string' &&
    typeof task.title === 'string' &&
    isTaskStatus(task.status) &&
    isPriority(task.priority) &&
    Array.isArray(task.tags) &&
    task.tags.every(isTag) &&
    Array.isArray(task.subtasks) &&
    task.subtasks.every(isSubtask) &&
    task.createdAt instanceof Date &&
    task.updatedAt instanceof Date &&
    typeof task.createdBy === 'string' &&
    typeof task.updatedBy === 'string'
  );
};

/**
 * Taskオブジェクトの詳細検証（より厳密）
 */
export const isValidTask = (value: unknown): value is Task => {
  if (!isTask(value)) {
    return false;
  }

  const task = value as Task;

  // 追加の検証ロジック
  return (
    task.id.length > 0 &&
    task.title.trim().length > 0 &&
    task.createdBy.length > 0 &&
    task.updatedBy.length > 0 &&
    task.createdAt <= task.updatedAt
  );
};

/**
 * 配列内の全てがTask型かどうかチェック
 */
export const isTaskArray = (value: unknown): value is Task[] => {
  return Array.isArray(value) && value.every(isTask);
};

/**
 * 文字列が空でないかチェック
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * 日付が有効かチェック
 */
export const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

/**
 * Date型またはISO文字列形式の有効な日付かチェック
 * @param value - チェックする値
 * @returns Date型またはISO形式の文字列として有効な日付の場合true
 */
export const isDateOrDateString = (value: unknown): value is Date | string => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return true;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }
  return false;
};

/**
 * ISO 8601形式の日付文字列かチェック
 * @param value - チェックする値
 * @returns ISO 8601形式の文字列の場合true
 */
export const isISODateString = (value: unknown): value is string => {
  return typeof value === 'string' && 
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value);
};

/**
 * Date型またはISO文字列を安全にDate型に変換
 * @param value - 変換する値
 * @returns 有効なDate型または現在日時（フォールバック）
 */
export const toSafeDate = (value: unknown): Date => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  // フォールバック: 現在日時を返す
  console.warn('Invalid date provided to toSafeDate, using current date:', value);
  return new Date();
};

// === スケジュール関連の型ガード ===

/**
 * ScheduleItemType型のガード関数
 * @param value - チェックする値
 * @returns ScheduleItemTypeの場合true
 */
export const isScheduleItemType = (value: unknown): value is ScheduleItemType => {
  return typeof value === 'string' && 
    ['task', 'subtask', 'meeting', 'break', 'personal', 'blocked', 'focus', 'review'].includes(value);
};

/**
 * ScheduleItemStatus型のガード関数
 * @param value - チェックする値
 * @returns ScheduleItemStatusの場合true
 */
export const isScheduleItemStatus = (value: unknown): value is ScheduleItemStatus => {
  return typeof value === 'string' && 
    ['planned', 'in_progress', 'completed', 'postponed', 'cancelled'].includes(value);
};

/**
 * 時刻文字列（HH:mm形式）の型ガード
 * @param value - チェックする値
 * @returns HH:mm形式の文字列の場合true
 */
export const isTimeString = (value: unknown): value is string => {
  return typeof value === 'string' && 
    /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
};

/**
 * ScheduleItemオブジェクトの型ガード（基本検証）
 * @param value - チェックする値
 * @returns ScheduleItemの場合true
 */
export const isScheduleItem = (value: unknown): value is ScheduleItem => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as ScheduleItem;

  return (
    typeof item.id === 'string' &&
    typeof item.timeBlockId === 'string' &&
    isScheduleItemType(item.type) &&
    typeof item.title === 'string' &&
    isTimeString(item.startTime) &&
    isTimeString(item.endTime) &&
    typeof item.duration === 'number' &&
    typeof item.color === 'string' &&
    isScheduleItemStatus(item.status) &&
    isPriority(item.priority) &&
    item.createdAt instanceof Date &&
    item.updatedAt instanceof Date &&
    typeof item.createdBy === 'string'
  );
};

/**
 * ScheduleViewSettingsオブジェクトの型ガード
 * @param value - チェックする値
 * @returns ScheduleViewSettingsの場合true
 */
export const isScheduleViewSettings = (value: unknown): value is ScheduleViewSettings => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const settings = value as ScheduleViewSettings;

  return (
    typeof settings.viewType === 'string' &&
    ['day', 'week', 'workweek'].includes(settings.viewType) &&
    isDateOrDateString(settings.date) &&
    typeof settings.timeRange === 'object' &&
    settings.timeRange !== null &&
    isTimeString(settings.timeRange.start) &&
    isTimeString(settings.timeRange.end) &&
    typeof settings.showWeekends === 'boolean' &&
    typeof settings.showCompleted === 'boolean'
  );
};

/**
 * DailyScheduleオブジェクトの型ガード（基本検証）
 * @param value - チェックする値
 * @returns DailyScheduleの場合true
 */
export const isDailySchedule = (value: unknown): value is DailySchedule => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const schedule = value as DailySchedule;

  return (
    typeof schedule.id === 'string' &&
    isDateOrDateString(schedule.date) &&
    typeof schedule.userId === 'string' &&
    Array.isArray(schedule.timeBlocks) &&
    Array.isArray(schedule.scheduleItems) &&
    schedule.scheduleItems.every(item => isScheduleItem(item)) &&
    typeof schedule.totalEstimated === 'number' &&
    typeof schedule.totalActual === 'number' &&
    typeof schedule.utilization === 'number' &&
    schedule.createdAt instanceof Date &&
    schedule.updatedAt instanceof Date
  );
};

/**
 * 数値が正の値かチェック
 */
export const isPositiveNumber = (value: unknown): value is number => {
  return typeof value === 'number' && value > 0 && !isNaN(value);
};

/**
 * 型ガードのエラー処理用ヘルパー関数
 */
export class TypeGuardError extends Error {
  constructor(
    message: string,
    public readonly value: unknown,
    public readonly expectedType: string
  ) {
    super(message);
    this.name = 'TypeGuardError';
  }
}

/**
 * 型ガード失敗時のエラーを投げるヘルパー関数
 */
export const assertTaskStatus = (value: unknown): TaskStatus => {
  if (isTaskStatus(value)) {
    return value;
  }
  throw new TypeGuardError(
    `Expected TaskStatus but received: ${typeof value}`,
    value,
    'TaskStatus'
  );
};

export const assertPriority = (value: unknown): Priority => {
  if (isPriority(value)) {
    return value;
  }
  throw new TypeGuardError(
    `Expected Priority but received: ${typeof value}`,
    value,
    'Priority'
  );
};

export const assertTask = (value: unknown): Task => {
  if (isValidTask(value)) {
    return value;
  }
  throw new TypeGuardError(
    `Expected valid Task but received invalid object`,
    value,
    'Task'
  );
};

/**
 * デバッグ用の型情報表示
 */
export const getTypeInfo = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (typeof value === 'object') {
    return `Object(${Object.keys(value).join(', ')})`;
  }
  return typeof value;
};