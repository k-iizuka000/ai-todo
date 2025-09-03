/**
 * useDebounceフック - 過剰更新防止のための遅延実行（Issue #028対応）
 * 設計書要件: グループ2のリアクティブ更新メカニズム実装 & アンマウント後の状態更新防止
 * 
 * 機能:
 * - 基本的なデバウンス処理
 * - 前回値との比較による不要な更新防止
 * - 高度なデバウンス制御オプション
 * - React状態更新警告の防止（Issue #028）
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 入力値をデバウンス処理して返すフック（Issue #028対応）
 * @param value デバウンス対象の値
 * @param delay 遅延時間（ミリ秒）- デフォルト250ms（設計書要件）
 * @returns デバウンス処理された値
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const previousValue = useRef<T>(value);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // 前回値と同じ場合は処理をスキップ（過剰更新防止）
    if (previousValue.current === value) {
      return;
    }

    // 指定された遅延後に値を更新（Issue #028: マウント状態チェック付き）
    const handler = setTimeout(() => {
      if (isMountedRef.current) {
        setDebouncedValue(value);
        previousValue.current = value;
      }
    }, delay);

    // クリーンアップ - 新しい値が来た場合は前のタイマーをキャンセル
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  // Issue #028: アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return debouncedValue;
}

/**
 * コールバック関数のデバウンス処理フック（Issue #028対応）
 * 設計書要件: デバウンス処理による過剰更新防止 & アンマウント後の状態更新防止
 * @param callback 実行するコールバック関数
 * @param delay 遅延時間（ミリ秒）
 * @param dependencies 依存関係配列
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 250,
  dependencies: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef<T>(callback);
  const isMountedRef = useRef(true);

  // callbackの最新参照を保持
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // デバウンス関数の作成
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        // Issue #028: マウント状態チェック付きでコールバック実行
        if (isMountedRef.current) {
          callbackRef.current(...args);
        }
      }, delay);
    },
    [delay, ...dependencies]
  ) as T;

  // クリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * スロットリング機能付きデバウンスフック（Issue #028対応）
 * 設計書要件: 最小限の状態変更検知による最適化 & アンマウント後の状態更新防止
 * @param value デバウンス対象の値
 * @param delay デバウンス遅延時間
 * @param maxDelay 最大遅延時間（スロットリング）
 */
export function useThrottledDebounce<T>(
  value: T,
  delay: number = 250,
  maxDelay: number = 1000
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const maxTimeoutRef = useRef<NodeJS.Timeout>();
  const lastExecutionRef = useRef<number>(Date.now());
  const isMountedRef = useRef(true);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutionRef.current;

    // 最大遅延時間を超えている場合は即座に実行（Issue #028: マウント状態チェック付き）
    if (timeSinceLastExecution >= maxDelay) {
      if (isMountedRef.current) {
        setDebouncedValue(value);
        lastExecutionRef.current = now;
      }
      return;
    }

    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
    }

    // デバウンスタイマーを設定（Issue #028: マウント状態チェック付き）
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setDebouncedValue(value);
        lastExecutionRef.current = Date.now();
      }
    }, delay);

    // 最大遅延タイマーを設定（Issue #028: マウント状態チェック付き）
    maxTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setDebouncedValue(value);
        lastExecutionRef.current = Date.now();
      }
    }, maxDelay - timeSinceLastExecution);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current);
      }
    };
  }, [value, delay, maxDelay]);

  // Issue #028: アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return debouncedValue;
}

/**
 * 条件付きデバウンスフック（Issue #028対応）
 * 設計書要件: 必要なコンポーネントのみの更新 & アンマウント後の状態更新防止
 * @param value デバウンス対象の値
 * @param delay 遅延時間
 * @param shouldDebounce デバウンス処理を行うかの条件
 */
export function useConditionalDebounce<T>(
  value: T,
  delay: number = 250,
  shouldDebounce: (currentValue: T, previousValue: T) => boolean
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const previousValue = useRef<T>(value);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // 条件に合致しない場合は即座に更新（Issue #028: マウント状態チェック付き）
    if (!shouldDebounce(value, previousValue.current)) {
      if (isMountedRef.current) {
        setDebouncedValue(value);
        previousValue.current = value;
      }
      return;
    }

    // デバウンス処理（Issue #028: マウント状態チェック付き）
    const handler = setTimeout(() => {
      if (isMountedRef.current) {
        setDebouncedValue(value);
        previousValue.current = value;
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, shouldDebounce]);

  // Issue #028: アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return debouncedValue;
}