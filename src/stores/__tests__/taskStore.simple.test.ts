/**
 * TaskStore API統合版 - 簡易単体テスト
 * 基本的な動作確認のみに絞ったテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskStore } from '../taskStore';

// モック設定を削除し、実際の動作をテスト
describe('TaskStore 基本動作テスト', () => {
  beforeEach(() => {
    // Zustandストアはグローバル状態なので、各テスト前にリセット
    const { result } = renderHook(() => useTaskStore());
    act(() => {
      result.current.resetStore();
    });
  });

  it('初期状態が正しく設定されている', () => {
    const { result } = renderHook(() => useTaskStore());
    
    expect(result.current.tasks).toEqual([]);
    expect(result.current.selectedTaskId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isInitialized).toBe(false);
  });

  it('setTasks が正しく動作する', () => {
    const { result } = renderHook(() => useTaskStore());
    
    const mockTasks = [
      {
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
      }
    ];
    
    act(() => {
      result.current.setTasks(mockTasks);
    });
    
    expect(result.current.tasks).toEqual(mockTasks);
  });

  it('selectTask が正しく動作する', () => {
    const { result } = renderHook(() => useTaskStore());
    
    act(() => {
      result.current.selectTask('test-id');
    });
    
    expect(result.current.selectedTaskId).toBe('test-id');
    
    act(() => {
      result.current.selectTask(null);
    });
    
    expect(result.current.selectedTaskId).toBeNull();
  });

  it('setLoading が正しく動作する', () => {
    const { result } = renderHook(() => useTaskStore());
    
    act(() => {
      result.current.setLoading(true);
    });
    
    expect(result.current.isLoading).toBe(true);
    
    act(() => {
      result.current.setLoading(false);
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('setError と clearError が正しく動作する', () => {
    const { result } = renderHook(() => useTaskStore());
    
    act(() => {
      result.current.setError('Test error');
    });
    
    expect(result.current.error).toBe('Test error');
    
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('getTaskById が正しく動作する', () => {
    const { result } = renderHook(() => useTaskStore());
    
    const mockTask = {
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
    };
    
    act(() => {
      result.current.setTasks([mockTask]);
    });
    
    const foundTask = result.current.getTaskById('test-1');
    expect(foundTask).toEqual(mockTask);
    
    const notFoundTask = result.current.getTaskById('non-existent');
    expect(notFoundTask).toBeUndefined();
  });

  it('resetStore が正しく動作する', () => {
    const { result } = renderHook(() => useTaskStore());
    
    // 状態を変更
    act(() => {
      result.current.setTasks([{
        id: 'test-1',
        title: 'Test',
        description: '',
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
        createdBy: 'test',
        updatedBy: 'test'
      }]);
      result.current.selectTask('test-1');
      result.current.setError('Test error');
      result.current.setLoading(true);
    });
    
    // リセット実行
    act(() => {
      result.current.resetStore();
    });
    
    // 初期状態に戻っていることを確認
    expect(result.current.tasks).toEqual([]);
    expect(result.current.selectedTaskId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isInitialized).toBe(false);
  });
});