/**
 * 共通クリーンアップパターン
 * Issue #028対応: React状態更新警告-unmountedコンポーネント
 */

import type { Dispatch, SetStateAction } from 'react';

export type CleanupFunction = () => void;

/**
 * 基本的なisMountedパターン
 */
export const createIsMountedPattern = () => {
  let isMounted = true;
  
  const checkMounted = () => isMounted;
  
  const cleanup: CleanupFunction = () => {
    isMounted = false;
  };
  
  return { isMounted: checkMounted, cleanup };
};

/**
 * AbortController付きパターン
 */
export const createAbortablePattern = () => {
  let isMounted = true;
  const abortController = new AbortController();
  
  const checkMounted = () => isMounted && !abortController.signal.aborted;
  const getSignal = () => abortController.signal;
  
  const cleanup: CleanupFunction = () => {
    isMounted = false;
    abortController.abort();
  };
  
  return { 
    isMounted: checkMounted, 
    signal: getSignal, 
    cleanup 
  };
};

/**
 * タイムアウト付きパターン
 */
export const createTimeoutPattern = (timeoutMs: number = 30000) => {
  let isMounted = true;
  const abortController = new AbortController();
  
  const timeoutId = setTimeout(() => {
    if (isMounted) {
      console.warn(`Operation timed out after ${timeoutMs}ms, forcing cleanup`);
      isMounted = false;
      abortController.abort();
    }
  }, timeoutMs);
  
  const checkMounted = () => isMounted && !abortController.signal.aborted;
  const getSignal = () => abortController.signal;
  
  const cleanup: CleanupFunction = () => {
    isMounted = false;
    abortController.abort();
    clearTimeout(timeoutId);
  };
  
  return { 
    isMounted: checkMounted, 
    signal: getSignal, 
    cleanup 
  };
};

/**
 * 複数操作管理パターン
 */
export const createMultiOperationPattern = () => {
  let isMounted = true;
  const operations = new Map<string, AbortController>();
  
  const startOperation = (operationId: string): AbortController => {
    if (!isMounted) {
      throw new Error('Cannot start operation after unmount');
    }
    
    const controller = new AbortController();
    operations.set(operationId, controller);
    return controller;
  };
  
  const finishOperation = (operationId: string) => {
    operations.delete(operationId);
  };
  
  const checkMounted = () => isMounted;
  
  const cleanup: CleanupFunction = () => {
    isMounted = false;
    
    // 全ての進行中操作を中断
    for (const [operationId, controller] of operations.entries()) {
      console.log(`Aborting operation: ${operationId}`);
      controller.abort();
    }
    
    operations.clear();
  };
  
  return {
    isMounted: checkMounted,
    startOperation,
    finishOperation,
    cleanup,
    activeOperations: () => operations.size
  };
};

/**
 * 安全な状態更新ヘルパー
 */
export const createSafeStateUpdater = <T>(
  isMountedCheck: () => boolean,
  setter: Dispatch<SetStateAction<T>>
) => {
  return (newState: T | ((prev: T) => T)) => {
    if (isMountedCheck()) {
      setter(newState);
      return true;
    } else {
      console.warn('Prevented state update after component unmount');
      return false;
    }
  };
};