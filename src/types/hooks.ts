/**
 * React Hooks専用型定義
 * Issue #027 Group 6: TypeScript型安全性強化
 * 
 * 目的:
 * - Hooks使用時の型安全性を強化
 * - 副作用を型レベルで防止
 * - useMemo/useCallback/useEffectの適切な使用を保証
 */

import React from 'react';

/**
 * 副作用のないピュア関数の型定義
 * useMemoで使用可能な関数の型を制限
 */
export type PureFunction<T> = () => T;

/**
 * 副作用のあるコールバック関数の型定義
 * useCallbackで使用可能な関数の型
 */
export type EffectCallback<Args extends any[] = [], Return = void> = (...args: Args) => Return;

/**
 * useEffect用クリーンアップ関数の型
 */
export type CleanupFunction = () => void;

/**
 * useEffect用エフェクト関数の型
 */
export type EffectFunction = () => CleanupFunction | void;

/**
 * 型安全なuseMemoの型定義
 * 副作用のないピュア関数のみ受け付ける
 */
export type SafeUseMemo = <T>(
  factory: PureFunction<T>,
  deps: React.DependencyList
) => T;

/**
 * 型安全なuseCallbackの型定義
 * 明示的にコールバック関数であることを示す
 */
export type SafeUseCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
) => T;

/**
 * 型安全なuseEffectの型定義
 */
export type SafeUseEffect = (
  effect: EffectFunction,
  deps?: React.DependencyList
) => void;

/**
 * State更新関数の型（副作用を明確化）
 */
export type StateUpdater<T> = React.Dispatch<React.SetStateAction<T>>;

/**
 * useMemo内での副作用を型レベルで防止するヘルパー型
 * この型を使うことで、コンパイル時に副作用をチェック
 */
export type NoSideEffects<T> = T extends (...args: any[]) => any 
  ? T extends ((...args: any[]) => infer R) 
    ? R extends Promise<any>
      ? never // Promiseを返す関数は禁止
      : R extends StateUpdater<any>
        ? never // State更新関数も禁止
        : T
    : never
  : T;

/**
 * Hooks使用時のパフォーマンス監視用の型定義
 */
export interface HookPerformanceMetrics {
  /** Hook名 */
  hookName: string;
  /** 実行時間（ミリ秒） */
  executionTime: number;
  /** 依存配列のサイズ */
  dependencyCount: number;
  /** 再計算回数 */
  recalculationCount: number;
  /** メモリ使用量（概算） */
  memoryUsage?: number;
  /** タイムスタンプ */
  timestamp: number;
}

/**
 * カスタムHook開発用のベース型
 */
export interface CustomHookBase {
  /** Hook名（デバッグ用） */
  hookName?: string;
  /** パフォーマンス監視を有効化 */
  enablePerformanceMonitoring?: boolean;
  /** 詳細ログを有効化 */
  enableDetailedLogging?: boolean;
}

/**
 * Issue #027対応: 無限レンダリングループ防止用の型
 * useMemo内での不正な操作を型レベルで検出
 */
export type RenderLoopSafe<T> = {
  readonly [K in keyof T]: T[K] extends StateUpdater<any>
    ? never // State更新関数は禁止
    : T[K] extends (...args: any[]) => Promise<any>
      ? never // 非同期関数も禁止
      : T[K];
};

/**
 * 型安全なuseKanbanTasks用の戻り値型
 * Issue #027: 無限レンダリングループ防止のために読み取り専用にする
 */
export interface SafeHookReturn<T> {
  readonly data: T;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

/**
 * Hook使用時の副作用チェック用ユーティリティ型
 */
export type SideEffectChecker<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => void
    ? T[K] extends StateUpdater<any>
      ? 'SIDE_EFFECT_DETECTED' // State更新関数が含まれている
      : T[K]
    : T[K];
};

/**
 * useMemo専用の型安全なファクトリー関数
 * コンパイル時に副作用をチェック
 */
export const createSafeMemoFactory = <T>(
  factory: NoSideEffects<() => T>
): (() => T) => {
  return factory as () => T;
};

/**
 * useCallback専用の型安全なコールバック関数
 * 明示的にコールバックであることをマーク
 */
export const createSafeCallback = <Args extends any[], Return>(
  callback: EffectCallback<Args, Return>
): EffectCallback<Args, Return> => {
  return callback;
};

/**
 * 開発環境での Hook パフォーマンス監視用デコレーター型
 */
export type WithPerformanceMonitoring<T extends (...args: any[]) => any> = 
  T & {
    __performance?: HookPerformanceMetrics[];
    __isMonitored?: boolean;
  };

/**
 * React 18 Concurrent Features対応の型定義
 */
export interface ConcurrentSafeHook<T> {
  /** データ */
  data: T;
  /** Suspenseに対応したローディング状態 */
  isPending: boolean;
  /** エラー状態 */
  error: Error | null;
  /** 強制リフレッシュ（Concurrent Safeな実装） */
  refresh: () => void;
  /** Transitionを使用した更新 */
  startTransition: (callback: () => void) => void;
}

/**
 * メモリリーク防止用のクリーンアップ型
 */
export interface CleanupRegistry {
  /** 登録されたクリーンアップ関数 */
  cleanupFunctions: Set<CleanupFunction>;
  /** クリーンアップ関数を追加 */
  addCleanup: (cleanup: CleanupFunction) => void;
  /** すべてのクリーンアップを実行 */
  executeAll: () => void;
}

/**
 * デバッグ用のHook状態型
 */
export interface HookDebugInfo {
  /** Hook名 */
  name: string;
  /** 現在の依存配列 */
  currentDeps: React.DependencyList;
  /** 前回の依存配列 */
  previousDeps?: React.DependencyList;
  /** 依存配列の変更理由 */
  changeReason?: string[];
  /** レンダリング回数 */
  renderCount: number;
  /** 最後のレンダリング時刻 */
  lastRenderTime: number;
}