/**
 * TaskStore getLastUpdated メソッド - 単体テスト
 * Issue 061: フロントエンド統合問題対応 - 状態同期強化用メソッドのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTaskStore } from '../taskStore';
import { Task } from '../../types/task';

describe('TaskStore getLastUpdated メソッド', () => {
  beforeEach(() => {
    // Zustandストアはグローバル状態なので、各テスト前にリセット
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.resetStore();
    });
  });

  describe('getLastUpdated基本動作', () => {
    it('初期状態でgetLastUpdatedがundefinedを返すこと', () => {
      const { result } = renderHook(() => useTaskStore());
      
      expect(result.current.getLastUpdated()).toBeUndefined();
    });

    it('setTasksでgetLastUpdatedが更新されないこと（内部メソッドのため）', () => {
      const { result } = renderHook(() => useTaskStore());
      
      const mockTasks: Task[] = [{
        id: 'test-1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'todo' as const,
        priority: 'medium' as const,
        projectId: undefined,
        assigneeId: undefined,
        tags: [],
        subtasks: [],
        dueDate: undefined,
        estimatedHours: undefined,
        actualHours: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'test-user',
        updatedBy: 'test-user'
      }];
      
      act(() => {
        result.current.setTasks(mockTasks);
      });
      
      // setTasksはlastUpdatedを更新しない（API操作時のみ更新）
      expect(result.current.getLastUpdated()).toBeUndefined();
      expect(result.current.tasks).toHaveLength(1);
    });
  });

  describe('型安全性の確認', () => {
    it('getLastUpdatedの戻り値の型が正しいこと', () => {
      const { result } = renderHook(() => useTaskStore());
      
      const lastUpdated = result.current.getLastUpdated();
      
      // undefined または number であることを確認
      expect(lastUpdated === undefined || typeof lastUpdated === 'number').toBe(true);
    });
  });
});