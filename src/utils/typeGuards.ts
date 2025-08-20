/**
 * 型ガード関数群
 * ランタイムでの型安全性を提供する
 */

import { TaskStatus, Priority, Task, Subtask, Tag } from '@/types/task';

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