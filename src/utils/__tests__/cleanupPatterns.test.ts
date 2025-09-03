/**
 * cleanupPatterns.ts の単体テスト
 * Issue #028対応: React状態更新警告-unmountedコンポーネント
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createIsMountedPattern,
  createAbortablePattern,
  createTimeoutPattern,
  createMultiOperationPattern,
  createSafeStateUpdater
} from '../cleanupPatterns';

describe('cleanupPatterns', () => {
  describe('createIsMountedPattern', () => {
    it('should create isMounted pattern with correct initial state', () => {
      const pattern = createIsMountedPattern();
      
      expect(pattern.isMounted()).toBe(true);
      expect(typeof pattern.cleanup).toBe('function');
    });

    it('should return false after cleanup is called', () => {
      const pattern = createIsMountedPattern();
      
      expect(pattern.isMounted()).toBe(true);
      
      pattern.cleanup();
      
      expect(pattern.isMounted()).toBe(false);
    });

    it('should remain false after multiple cleanup calls', () => {
      const pattern = createIsMountedPattern();
      
      pattern.cleanup();
      pattern.cleanup();
      
      expect(pattern.isMounted()).toBe(false);
    });
  });

  describe('createAbortablePattern', () => {
    it('should create abortable pattern with AbortController', () => {
      const pattern = createAbortablePattern();
      
      expect(pattern.isMounted()).toBe(true);
      expect(pattern.signal()).toBeInstanceOf(AbortSignal);
      expect(pattern.signal().aborted).toBe(false);
    });

    it('should abort signal when cleanup is called', () => {
      const pattern = createAbortablePattern();
      
      expect(pattern.signal().aborted).toBe(false);
      expect(pattern.isMounted()).toBe(true);
      
      pattern.cleanup();
      
      expect(pattern.signal().aborted).toBe(true);
      expect(pattern.isMounted()).toBe(false);
    });

    it('should handle multiple cleanup calls gracefully', () => {
      const pattern = createAbortablePattern();
      
      pattern.cleanup();
      expect(() => pattern.cleanup()).not.toThrow();
      
      expect(pattern.signal().aborted).toBe(true);
      expect(pattern.isMounted()).toBe(false);
    });
  });

  describe('createTimeoutPattern', () => {
    let consoleWarnSpy: any;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should create timeout pattern with default timeout', () => {
      const pattern = createTimeoutPattern();
      
      expect(pattern.isMounted()).toBe(true);
      expect(pattern.signal().aborted).toBe(false);
      
      // クリーンアップして資源解放
      pattern.cleanup();
    });

    it('should create timeout pattern with custom timeout', () => {
      const pattern = createTimeoutPattern(5000);
      
      expect(pattern.isMounted()).toBe(true);
      expect(pattern.signal().aborted).toBe(false);
      
      // クリーンアップして資源解放
      pattern.cleanup();
    });

    it('should auto-cleanup after timeout expires', async () => {
      const timeoutMs = 100; // 短時間に設定
      const pattern = createTimeoutPattern(timeoutMs);
      
      expect(pattern.isMounted()).toBe(true);
      
      // タイムアウト時間を待つ
      await new Promise(resolve => setTimeout(resolve, timeoutMs + 50));
      
      expect(pattern.isMounted()).toBe(false);
      expect(pattern.signal().aborted).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Operation timed out after ${timeoutMs}ms`)
      );
    });

    it('should not trigger timeout after manual cleanup', async () => {
      const timeoutMs = 100; // 短時間に設定
      const pattern = createTimeoutPattern(timeoutMs);
      
      // 手動クリーンアップ
      pattern.cleanup();
      
      expect(pattern.isMounted()).toBe(false);
      
      // タイムアウト時間経過を待つ
      await new Promise(resolve => setTimeout(resolve, timeoutMs + 50));
      
      // 警告は出力されない（既にクリーンアップ済みのため）
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('createMultiOperationPattern', () => {
    it('should create multi-operation pattern', () => {
      const pattern = createMultiOperationPattern();
      
      expect(pattern.isMounted()).toBe(true);
      expect(pattern.activeOperations()).toBe(0);
      expect(typeof pattern.startOperation).toBe('function');
      expect(typeof pattern.finishOperation).toBe('function');
    });

    it('should start and track operations', () => {
      const pattern = createMultiOperationPattern();
      
      const controller1 = pattern.startOperation('operation1');
      expect(pattern.activeOperations()).toBe(1);
      expect(controller1).toBeInstanceOf(AbortController);
      
      const controller2 = pattern.startOperation('operation2');
      expect(pattern.activeOperations()).toBe(2);
    });

    it('should finish operations and reduce count', () => {
      const pattern = createMultiOperationPattern();
      
      pattern.startOperation('operation1');
      pattern.startOperation('operation2');
      expect(pattern.activeOperations()).toBe(2);
      
      pattern.finishOperation('operation1');
      expect(pattern.activeOperations()).toBe(1);
      
      pattern.finishOperation('operation2');
      expect(pattern.activeOperations()).toBe(0);
    });

    it('should throw error when starting operation after unmount', () => {
      const pattern = createMultiOperationPattern();
      
      pattern.cleanup();
      
      expect(() => pattern.startOperation('operation1')).toThrow(
        'Cannot start operation after unmount'
      );
    });

    it('should abort all operations on cleanup', () => {
      const pattern = createMultiOperationPattern();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const controller1 = pattern.startOperation('operation1');
      const controller2 = pattern.startOperation('operation2');
      
      expect(controller1.signal.aborted).toBe(false);
      expect(controller2.signal.aborted).toBe(false);
      
      pattern.cleanup();
      
      expect(controller1.signal.aborted).toBe(true);
      expect(controller2.signal.aborted).toBe(true);
      expect(pattern.activeOperations()).toBe(0);
      expect(pattern.isMounted()).toBe(false);
      
      expect(consoleSpy).toHaveBeenCalledWith('Aborting operation: operation1');
      expect(consoleSpy).toHaveBeenCalledWith('Aborting operation: operation2');
      
      consoleSpy.mockRestore();
    });
  });

  describe('createSafeStateUpdater', () => {
    it('should call setter when component is mounted', () => {
      const mockSetter = vi.fn();
      const mockIsMounted = vi.fn().mockReturnValue(true);
      
      const safeUpdater = createSafeStateUpdater(mockIsMounted, mockSetter);
      const newState = { test: 'value' };
      
      const result = safeUpdater(newState);
      
      expect(result).toBe(true);
      expect(mockIsMounted).toHaveBeenCalled();
      expect(mockSetter).toHaveBeenCalledWith(newState);
    });

    it('should not call setter when component is unmounted', () => {
      const mockSetter = vi.fn();
      const mockIsMounted = vi.fn().mockReturnValue(false);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const safeUpdater = createSafeStateUpdater(mockIsMounted, mockSetter);
      const newState = { test: 'value' };
      
      const result = safeUpdater(newState);
      
      expect(result).toBe(false);
      expect(mockIsMounted).toHaveBeenCalled();
      expect(mockSetter).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Prevented state update after component unmount'
      );
      
      consoleSpy.mockRestore();
    });

    it('should work with function setter', () => {
      const mockSetter = vi.fn();
      const mockIsMounted = vi.fn().mockReturnValue(true);
      
      const safeUpdater = createSafeStateUpdater(mockIsMounted, mockSetter);
      const updaterFunction = (prev: any) => ({ ...prev, updated: true });
      
      const result = safeUpdater(updaterFunction);
      
      expect(result).toBe(true);
      expect(mockSetter).toHaveBeenCalledWith(updaterFunction);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle concurrent patterns correctly', () => {
      const pattern1 = createIsMountedPattern();
      const pattern2 = createAbortablePattern();
      const multiPattern = createMultiOperationPattern();
      
      // 全て初期状態は mounted
      expect(pattern1.isMounted()).toBe(true);
      expect(pattern2.isMounted()).toBe(true);
      expect(multiPattern.isMounted()).toBe(true);
      
      // 操作開始
      const operation = multiPattern.startOperation('test-op');
      expect(operation.signal.aborted).toBe(false);
      
      // 個別にクリーンアップ
      pattern1.cleanup();
      pattern2.cleanup();
      multiPattern.cleanup();
      
      expect(pattern1.isMounted()).toBe(false);
      expect(pattern2.isMounted()).toBe(false);
      expect(multiPattern.isMounted()).toBe(false);
      expect(operation.signal.aborted).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
      const pattern = createAbortablePattern();
      
      // クリーンアップ前
      expect(pattern.isMounted()).toBe(true);
      
      // 複数回クリーンアップしても問題なし
      pattern.cleanup();
      pattern.cleanup();
      pattern.cleanup();
      
      expect(pattern.isMounted()).toBe(false);
      expect(pattern.signal().aborted).toBe(true);
    });
  });
});