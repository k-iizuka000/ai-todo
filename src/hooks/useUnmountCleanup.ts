/**
 * アンマウント時のクリーンアップを統一管理するカスタムフック
 * Issue #028対応: React状態更新警告-unmountedコンポーネント
 */

import { useRef, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

interface CleanupOptions {
  /** タイムアウト時間（ミリ秒） */
  timeout?: number;
  /** デバッグログの有効化 */
  enableDebugLog?: boolean;
  /** コンポーネント名（デバッグ用） */
  componentName?: string;
}

interface CleanupController {
  /** マウント状態の確認 */
  isMounted: () => boolean;
  /** 操作の中断確認 */
  isAborted: () => boolean;
  /** AbortControllerの取得 */
  getAbortController: () => AbortController;
  /** 安全な状態更新の実行 */
  safeSetState: <T>(setter: Dispatch<SetStateAction<T>>, newValue: SetStateAction<T>) => boolean;
  /** 非同期操作の安全な実行 */
  safeAsync: <T>(asyncFn: (signal: AbortSignal) => Promise<T>) => Promise<T | null>;
}

/**
 * useUnmountCleanup
 * コンポーネントのアンマウント時に安全なクリーンアップを提供
 * 
 * @param options クリーンアップオプション
 * @returns CleanupController クリーンアップ制御オブジェクト
 */
export const useUnmountCleanup = (options: CleanupOptions = {}): CleanupController => {
  const {
    timeout = 30000, // 30秒デフォルト
    enableDebugLog = process.env.NODE_ENV === 'development',
    componentName = 'Unknown'
  } = options;
  
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef(new AbortController());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const operationCountRef = useRef(0);
  
  // マウント状態の確認
  const isMounted = useCallback(() => {
    return isMountedRef.current && !abortControllerRef.current.signal.aborted;
  }, []);
  
  // 中断状態の確認
  const isAborted = useCallback(() => {
    return abortControllerRef.current.signal.aborted || !isMountedRef.current;
  }, []);
  
  // AbortControllerの取得
  const getAbortController = useCallback(() => {
    return abortControllerRef.current;
  }, []);
  
  // 安全な状態更新
  const safeSetState = useCallback(<T>(setter: Dispatch<SetStateAction<T>>, newValue: SetStateAction<T>): boolean => {
    if (isMounted()) {
      try {
        // 実際の状態更新を実行
        setter(newValue);
        return true;
      } catch (error) {
        if (enableDebugLog) {
          console.warn(`[${componentName}] SafeSetState failed:`, error);
        }
        return false;
      }
    } else {
      if (enableDebugLog) {
        console.warn(`[${componentName}] Attempted setState after unmount prevented`);
      }
      return false;
    }
  }, [isMounted, enableDebugLog, componentName]);
  
  // 安全な非同期操作
  const safeAsync = useCallback(async <T>(
    asyncFn: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    if (isAborted()) {
      if (enableDebugLog) {
        console.warn(`[${componentName}] Async operation aborted before execution`);
      }
      return null;
    }
    
    const operationId = ++operationCountRef.current;
    
    try {
      if (enableDebugLog) {
        console.log(`[${componentName}] Starting async operation ${operationId}`);
      }
      
      const result = await asyncFn(abortControllerRef.current.signal);
      
      if (isMounted()) {
        if (enableDebugLog) {
          console.log(`[${componentName}] Async operation ${operationId} completed successfully`);
        }
        return result;
      } else {
        if (enableDebugLog) {
          console.warn(`[${componentName}] Async operation ${operationId} completed after unmount - result discarded`);
        }
        return null;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (enableDebugLog) {
          console.log(`[${componentName}] Async operation ${operationId} aborted`);
        }
        return null;
      } else {
        if (enableDebugLog && isMounted()) {
          console.error(`[${componentName}] Async operation ${operationId} failed:`, error);
        }
        throw error;
      }
    }
  }, [isAborted, isMounted, enableDebugLog, componentName]);
  
  // タイムアウト監視
  useEffect(() => {
    if (timeout > 0) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          console.warn(`[${componentName}] Component exceeded timeout (${timeout}ms), forcing cleanup`);
          isMountedRef.current = false;
          abortControllerRef.current.abort();
        }
      }, timeout);
    }
  }, [timeout, componentName]);
  
  // クリーンアップ処理
  useEffect(() => {
    return () => {
      if (enableDebugLog) {
        console.log(`[${componentName}] Cleanup initiated - operations: ${operationCountRef.current}`);
      }
      
      isMountedRef.current = false;
      abortControllerRef.current.abort();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (enableDebugLog) {
        console.log(`[${componentName}] Cleanup completed`);
      }
    };
  }, [enableDebugLog, componentName]);
  
  return {
    isMounted,
    isAborted,
    getAbortController,
    safeSetState,
    safeAsync
  };
};

export default useUnmountCleanup;