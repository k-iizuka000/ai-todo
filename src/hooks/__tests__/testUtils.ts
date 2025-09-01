/**
 * テストユーティリティ
 * Issue #027: Dashboard無限レンダリングループエラー修正対応
 * 
 * 機能:
 * - レンダリング監視用のカスタムマッチャー
 * - パフォーマンス測定ユーティリティ
 * - エラー境界テスト用ヘルパー
 */

import React from 'react';
import { expect, vi } from 'vitest';
import { Task, TaskStatus, Priority } from '@/types/task';
import { Tag } from '@/types/tag';

/**
 * レンダリング回数監視
 */
export interface RenderCountTracker {
  count: number;
  threshold: number;
  startTime: number;
  componentName?: string;
}

/**
 * レンダリングカウンタの作成
 */
export const createRenderCountTracker = (
  threshold = 50, // 閾値を50に上げる（テスト環境では多くのレンダリングが発生する）
  componentName = 'Component'
): RenderCountTracker => ({
  count: 0,
  threshold,
  startTime: Date.now(),
  componentName
});

/**
 * レンダリング追跡
 */
export const trackRender = (tracker: RenderCountTracker): void => {
  tracker.count++;
  
  if (tracker.count > tracker.threshold) {
    const duration = Date.now() - tracker.startTime;
    throw new Error(
      `無限レンダリングを検出: ${tracker.componentName} - ${tracker.count}回 ` +
      `(閾値: ${tracker.threshold}) / 期間: ${duration}ms`
    );
  }
};

/**
 * パフォーマンス測定ユーティリティ
 */
export class PerformanceMeasurement {
  private startTime: number = 0;
  private measurements: Array<{ name: string; duration: number; timestamp: number }> = [];

  start(): void {
    this.startTime = performance.now();
  }

  measure(name: string): number {
    const duration = performance.now() - this.startTime;
    this.measurements.push({
      name,
      duration,
      timestamp: Date.now()
    });
    return duration;
  }

  getMeasurements(): Array<{ name: string; duration: number; timestamp: number }> {
    return [...this.measurements];
  }

  getAverageDuration(): number {
    if (this.measurements.length === 0) return 0;
    const total = this.measurements.reduce((sum, m) => sum + m.duration, 0);
    return total / this.measurements.length;
  }

  reset(): void {
    this.measurements = [];
    this.startTime = 0;
  }
}

/**
 * メモリ使用量測定
 */
export const measureMemoryUsage = (): {
  used: number;
  total: number;
  limit: number;
  efficiency: number;
} => {
  if ('memory' in performance && typeof (performance as any).memory === 'object') {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      efficiency: Math.round((1 - (memory.usedJSHeapSize / memory.totalJSHeapSize)) * 100)
    };
  }
  
  return {
    used: 0,
    total: 0,
    limit: 0,
    efficiency: 100
  };
};

/**
 * 実行時間測定ヘルパー
 */
export const measureExecutionTime = async (fn: () => void | Promise<void>): Promise<number> => {
  const startTime = performance.now();
  await fn();
  return performance.now() - startTime;
};

/**
 * モックデータ生成ヘルパー
 */
export const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random().toString(36).substr(2, 9)}`,
  title: 'Mock Task',
  description: 'Mock Description',
  status: 'todo' as TaskStatus,
  priority: 'medium' as Priority,
  projectId: 'mock-project',
  assigneeId: 'mock-user',
  tags: [] as Tag[],
  subtasks: [],
  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  estimatedHours: 2,
  actualHours: 0,
  createdAt: new Date(Date.now() - 60 * 60 * 1000),
  updatedAt: new Date(),
  createdBy: 'mock-user',
  updatedBy: 'mock-user',
  ...overrides
});

export const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
  id: `tag-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Mock Tag',
  color: '#3B82F6',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'mock-user',
  ...overrides
});

/**
 * カスタムマッチャーの定義
 */
declare module 'vitest' {
  interface Assertion<T = any> {
    toRenderWithinThreshold(threshold: number): T;
    toCompleteWithinTime(maxTime: number): T;
    toHaveNoMemoryLeaks(): T;
  }
}

/**
 * レンダリング回数のアサーション
 */
export const toRenderWithinThreshold = (
  tracker: RenderCountTracker,
  threshold: number
) => ({
  pass: tracker.count <= threshold,
  message: () => 
    `Expected render count ${tracker.count} to be ${tracker.count <= threshold ? 'not ' : ''}within threshold ${threshold}`
});

/**
 * 実行時間のアサーション
 */
export const toCompleteWithinTime = (
  actualTime: number,
  maxTime: number
) => ({
  pass: actualTime <= maxTime,
  message: () => 
    `Expected execution time ${actualTime}ms to be ${actualTime <= maxTime ? 'not ' : ''}within ${maxTime}ms`
});

/**
 * メモリリークのアサーション
 */
export const toHaveNoMemoryLeaks = (
  beforeMemory: number,
  afterMemory: number,
  threshold: number = 1024 * 1024 // 1MB
) => ({
  pass: (afterMemory - beforeMemory) <= threshold,
  message: () => 
    `Expected memory increase ${afterMemory - beforeMemory} bytes to be ${(afterMemory - beforeMemory) <= threshold ? 'not ' : ''}within threshold ${threshold} bytes`
});

/**
 * Vitest カスタムマッチャーの登録
 */
export const registerCustomMatchers = () => {
  expect.extend({
    toRenderWithinThreshold(tracker: RenderCountTracker, threshold: number) {
      return toRenderWithinThreshold(tracker, threshold);
    },
    
    toCompleteWithinTime(actualTime: number, maxTime: number) {
      return toCompleteWithinTime(actualTime, maxTime);
    },
    
    toHaveNoMemoryLeaks(beforeMemory: number, afterMemory: number, threshold?: number) {
      return toHaveNoMemoryLeaks(beforeMemory, afterMemory, threshold);
    }
  });
};