/**
 * 非同期処理の適切なハンドリング用カスタムフック
 * 設計書要件: グループ2のリアクティブ更新メカニズム実装
 * 
 * 目的:
 * - 非同期処理の一元管理
 * - Promise ベースの操作の適切なハンドリング
 * - キャンセル可能な非同期処理
 * - エラー状態の統一管理
 * - メモリリーク防止
 */

import { useCallback, useRef, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface AsyncHandlerOptions {
  /** 自動的にコンポーネントアンマウント時にキャンセルするか */
  autoCancel?: boolean;
  /** 初期データ */
  initialData?: any;
  /** エラー時のコールバック */
  onError?: (error: Error) => void;
  /** 成功時のコールバック */
  onSuccess?: (data: any) => void;
}

/**
 * 非同期処理ハンドリングフック
 * 
 * @param options オプション設定
 * @returns 非同期処理の状態と制御関数
 */
export const useAsyncHandler = <T = any>(options: AsyncHandlerOptions = {}) => {
  const {
    autoCancel = true,
    initialData = null,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false
  });

  // アクティブなリクエストの管理
  const activeRequests = useRef<Set<AbortController>>(new Set());
  const isMountedRef = useRef(true);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (autoCancel) {
        // すべてのアクティブなリクエストをキャンセル
        activeRequests.current.forEach(controller => {
          controller.abort();
        });
        activeRequests.current.clear();
      }
    };
  }, [autoCancel]);

  /**
   * 安全な状態更新（アンマウント後は更新しない）
   */
  const safeSetState = useCallback((updateFn: (prev: AsyncState<T>) => AsyncState<T>) => {
    if (isMountedRef.current) {
      setState(updateFn);
    }
  }, []);

  /**
   * 非同期処理の実行
   * @param asyncFn 実行する非同期関数
   * @param shouldUpdateState 状態を更新するかどうか
   */
  const execute = useCallback(async <TResult = T>(
    asyncFn: (signal: AbortSignal) => Promise<TResult>,
    shouldUpdateState: boolean = true
  ): Promise<TResult | null> => {
    const controller = new AbortController();
    activeRequests.current.add(controller);

    try {
      if (shouldUpdateState) {
        safeSetState(prev => ({
          ...prev,
          isLoading: true,
          isError: false,
          error: null
        }));
      }

      const result = await asyncFn(controller.signal);

      // リクエストがキャンセルされていないかチェック
      if (controller.signal.aborted) {
        return null;
      }

      if (shouldUpdateState) {
        safeSetState(prev => ({
          ...prev,
          data: result as T,
          isLoading: false,
          isSuccess: true,
          isError: false,
          error: null
        }));
      }

      // 成功コールバック
      if (onSuccess) {
        try {
          onSuccess(result);
        } catch (callbackError) {
          console.error('Error in success callback:', callbackError);
        }
      }

      return result;

    } catch (error) {
      // キャンセルされた場合はエラーとして扱わない
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));

      if (shouldUpdateState) {
        safeSetState(prev => ({
          ...prev,
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: errorObj
        }));
      }

      // エラーコールバック
      if (onError) {
        try {
          onError(errorObj);
        } catch (callbackError) {
          console.error('Error in error callback:', callbackError);
        }
      }

      throw errorObj;

    } finally {
      // 完了したリクエストを削除
      activeRequests.current.delete(controller);
    }
  }, [safeSetState, onSuccess, onError]);

  /**
   * すべてのアクティブな処理をキャンセル
   */
  const cancelAll = useCallback(() => {
    activeRequests.current.forEach(controller => {
      controller.abort();
    });
    activeRequests.current.clear();
    
    safeSetState(prev => ({
      ...prev,
      isLoading: false
    }));
  }, [safeSetState]);

  /**
   * 状態をリセット
   */
  const reset = useCallback(() => {
    safeSetState(() => ({
      data: initialData,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false
    }));
  }, [safeSetState, initialData]);

  /**
   * Promise.allSettledのラッパー
   * 複数の非同期処理を並列実行
   */
  const executeParallel = useCallback(async <TResult = T>(
    asyncFns: Array<(signal: AbortSignal) => Promise<TResult>>
  ): Promise<PromiseSettledResult<TResult>[]> => {
    const controller = new AbortController();
    activeRequests.current.add(controller);

    try {
      safeSetState(prev => ({
        ...prev,
        isLoading: true,
        isError: false,
        error: null
      }));

      const promises = asyncFns.map(fn => fn(controller.signal));
      const results = await Promise.allSettled(promises);

      if (controller.signal.aborted) {
        return [];
      }

      safeSetState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: true
      }));

      return results;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      safeSetState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        error: errorObj
      }));

      throw errorObj;

    } finally {
      activeRequests.current.delete(controller);
    }
  }, [safeSetState]);

  return {
    ...state,
    execute,
    executeParallel,
    cancelAll,
    reset,
    hasActiveRequests: activeRequests.current.size > 0
  };
};

/**
 * デバウンス機能付き非同期処理フック
 * @param delay デバウンス遅延時間（ms）
 * @param options オプション設定
 */
export const useDebouncedAsyncHandler = <T = any>(
  delay: number = 300,
  options: AsyncHandlerOptions = {}
) => {
  const asyncHandler = useAsyncHandler<T>(options);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const debouncedExecute = useCallback(
    <TResult = T>(asyncFn: (signal: AbortSignal) => Promise<TResult>, shouldUpdateState: boolean = true) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      return new Promise<TResult | null>((resolve, reject) => {
        debounceTimer.current = setTimeout(async () => {
          try {
            const result = await asyncHandler.execute(asyncFn, shouldUpdateState);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delay);
      });
    },
    [asyncHandler, delay]
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    ...asyncHandler,
    debouncedExecute
  };
};