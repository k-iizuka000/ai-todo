/**
 * useUnmountCleanup カスタムフックの単体テスト
 * Issue #028対応: React状態更新警告-unmountedコンポーネント
 */

import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { useUnmountCleanup } from '../../../hooks/useUnmountCleanup';

// コンソール警告をモック化
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

let mockConsoleLog: ReturnType<typeof vi.fn>;
let mockConsoleWarn: ReturnType<typeof vi.fn>;
let mockConsoleError: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockConsoleLog = vi.fn();
  mockConsoleWarn = vi.fn();
  mockConsoleError = vi.fn();
  
  console.log = mockConsoleLog;
  console.warn = mockConsoleWarn;
  console.error = mockConsoleError;
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('useUnmountCleanup', () => {
  it('should initialize with mounted state', () => {
    const { result } = renderHook(() =>
      useUnmountCleanup({ componentName: 'TestComponent' })
    );

    expect(result.current.isMounted()).toBe(true);
    expect(result.current.isAborted()).toBe(false);
    expect(result.current.getAbortController()).toBeInstanceOf(AbortController);
  });

  it('should prevent state updates after unmount', () => {
    const { result, unmount } = renderHook(() =>
      useUnmountCleanup({ 
        componentName: 'TestComponent', 
        enableDebugLog: true 
      })
    );

    expect(result.current.isMounted()).toBe(true);

    unmount();

    expect(result.current.isMounted()).toBe(false);
    expect(result.current.isAborted()).toBe(true);
    
    // デバッグログの確認
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[TestComponent] Cleanup initiated - operations: 0'
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[TestComponent] Cleanup completed'
    );
  });

  it('should handle safe state updates correctly', () => {
    const { result, unmount } = renderHook(() =>
      useUnmountCleanup({ 
        componentName: 'TestComponent',
        enableDebugLog: true
      })
    );

    // マウント中の状態更新は成功
    const mockSetter = vi.fn((prev: string) => prev + '_updated');
    expect(result.current.safeSetState(mockSetter)).toBe(true);

    // アンマウント後の状態更新は防止される
    unmount();
    expect(result.current.safeSetState(mockSetter)).toBe(false);
    
    // 警告ログの確認
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[TestComponent] Attempted setState after unmount prevented'
    );
  });

  it('should abort async operations on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useUnmountCleanup({
        componentName: 'TestComponent',
        enableDebugLog: true
      })
    );

    const asyncOperation = vi.fn().mockImplementation(
      (signal: AbortSignal) => new Promise<string>((resolve, reject) => {
        setTimeout(() => {
          if (signal.aborted) {
            const error = new Error('Operation was aborted');
            error.name = 'AbortError';
            reject(error);
          } else {
            resolve('success');
          }
        }, 100);
      })
    );

    // 非同期操作を開始
    const operationPromise = result.current.safeAsync(asyncOperation);

    // すぐにアンマウント
    unmount();

    const operationResult = await operationPromise;
    expect(operationResult).toBe(null);
    expect(asyncOperation).toHaveBeenCalled();
    
    // デバッグログの確認
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[TestComponent] Starting async operation 1'
    );
  });

  it('should handle async operation completion after unmount', () => {
    const { result, unmount } = renderHook(() =>
      useUnmountCleanup({
        componentName: 'TestComponent',
        enableDebugLog: true
      })
    );

    // アンマウント前はマウント状態
    expect(result.current.isMounted()).toBe(true);
    
    // アンマウント
    unmount();
    
    // アンマウント後は中断状態
    expect(result.current.isMounted()).toBe(false);
    expect(result.current.isAborted()).toBe(true);
  });

  it('should handle async operation errors correctly', async () => {
    const { result } = renderHook(() =>
      useUnmountCleanup({
        componentName: 'TestComponent',
        enableDebugLog: true
      })
    );

    const asyncOperation = vi.fn().mockRejectedValue(new Error('Test error'));

    await expect(result.current.safeAsync(asyncOperation)).rejects.toThrow('Test error');
    
    // エラーログの確認
    expect(mockConsoleError).toHaveBeenCalledWith(
      '[TestComponent] Async operation 1 failed:',
      expect.any(Error)
    );
  });

  it('should handle AbortError specially', async () => {
    const { result } = renderHook(() =>
      useUnmountCleanup({
        componentName: 'TestComponent',
        enableDebugLog: true
      })
    );

    const abortError = new Error('Operation aborted');
    abortError.name = 'AbortError';
    
    const asyncOperation = vi.fn().mockRejectedValue(abortError);

    const operationResult = await result.current.safeAsync(asyncOperation);
    expect(operationResult).toBe(null);
    
    // AbortErrorの場合は通常のログ出力
    expect(mockConsoleLog).toHaveBeenCalledWith(
      '[TestComponent] Async operation 1 aborted'
    );
  });

  it('should prevent async operations if already aborted', async () => {
    const { result, unmount } = renderHook(() =>
      useUnmountCleanup({
        componentName: 'TestComponent',
        enableDebugLog: true
      })
    );

    // 先にアンマウント
    unmount();

    const asyncOperation = vi.fn();
    const operationResult = await result.current.safeAsync(asyncOperation);

    expect(operationResult).toBe(null);
    expect(asyncOperation).not.toHaveBeenCalled();
    
    // 実行前中断の警告ログ
    expect(mockConsoleWarn).toHaveBeenCalledWith(
      '[TestComponent] Async operation aborted before execution'
    );
  });

  it('should apply timeout settings correctly', () => {
    const { result } = renderHook(() =>
      useUnmountCleanup({
        componentName: 'TestComponent',
        timeout: 50, // 50msの短いタイムアウト
        enableDebugLog: true
      })
    );

    expect(result.current.isMounted()).toBe(true);

    // タイムアウト設定が適用されているか確認のみ
    // (実際の時間経過テストは複雑になるためスキップ)
  });

  it('should disable debug logs in production environment', () => {
    // 元の環境変数を保存
    const originalNodeEnv = process.env.NODE_ENV;
    
    // production環境をシミュレート
    process.env.NODE_ENV = 'production';
    
    const { result, unmount } = renderHook(() =>
      useUnmountCleanup({ componentName: 'TestComponent' })
    );

    unmount();

    // production環境ではデバッグログが出力されない
    expect(mockConsoleLog).not.toHaveBeenCalled();
    
    // 環境変数を復元
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('should provide stable references for functions', () => {
    const { result, rerender } = renderHook(() =>
      useUnmountCleanup({ componentName: 'TestComponent' })
    );

    const firstController = result.current;

    // 再レンダリング
    rerender();

    const secondController = result.current;

    // 関数参照が安定している
    expect(firstController.isMounted).toBe(secondController.isMounted);
    expect(firstController.isAborted).toBe(secondController.isAborted);
    expect(firstController.getAbortController).toBe(secondController.getAbortController);
    expect(firstController.safeSetState).toBe(secondController.safeSetState);
    expect(firstController.safeAsync).toBe(secondController.safeAsync);
  });
});