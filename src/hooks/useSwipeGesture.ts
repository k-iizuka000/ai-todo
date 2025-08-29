/**
 * スワイプジェスチャー管理フック
 * タスク詳細画面での前後ナビゲーション用
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SwipeGestureConfig {
  threshold: number;        // スワイプ判定の最小距離（px）
  velocity: number;         // スワイプ判定の最小速度（px/ms）
  preventScrollOnSwipe: boolean;  // スワイプ中のスクロール防止
  direction: 'horizontal' | 'vertical' | 'all';  // 対応方向
}

export interface SwipeGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (event: TouchEvent | PointerEvent) => void;
  onSwipeMove?: (event: TouchEvent | PointerEvent, deltaX: number, deltaY: number) => void;
  onSwipeEnd?: (event: TouchEvent | PointerEvent) => void;
}

export interface SwipeGestureState {
  isSwiping: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  deltaX: number;
  deltaY: number;
  velocity: number;
}

const DEFAULT_CONFIG: SwipeGestureConfig = {
  threshold: 50,
  velocity: 0.3,
  preventScrollOnSwipe: true,
  direction: 'horizontal',
};

/**
 * スワイプジェスチャー管理フック
 * 
 * @param handlers - スワイプイベントハンドラー
 * @param config - スワイプ設定
 * @returns スワイプ状態とイベントハンドラー
 */
export const useSwipeGesture = (
  handlers: SwipeGestureHandlers = {},
  config: Partial<SwipeGestureConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<SwipeGestureState>({
    isSwiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
  });

  const startPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const currentPosRef = useRef<{ x: number; y: number } | null>(null);

  const getEventPosition = useCallback((event: TouchEvent | PointerEvent) => {
    if ('touches' in event) {
      // TouchEvent
      const touch = event.touches[0] || event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    } else {
      // PointerEvent
      return { x: event.clientX, y: event.clientY };
    }
  }, []);

  const handleStart = useCallback((event: TouchEvent | PointerEvent) => {
    const position = getEventPosition(event);
    startPosRef.current = {
      ...position,
      time: Date.now(),
    };
    currentPosRef.current = position;

    setState(prev => ({
      ...prev,
      isSwiping: false,
      direction: null,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
    }));

    handlers.onSwipeStart?.(event);
  }, [getEventPosition, handlers]);

  const handleMove = useCallback((event: TouchEvent | PointerEvent) => {
    if (!startPosRef.current) return;

    const position = getEventPosition(event);
    currentPosRef.current = position;

    const deltaX = position.x - startPosRef.current.x;
    const deltaY = position.y - startPosRef.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // スワイプ方向の判定
    let direction: 'left' | 'right' | 'up' | 'down' | null = null;
    let isSwiping = false;

    if (finalConfig.direction === 'horizontal' || finalConfig.direction === 'all') {
      if (absDeltaX > finalConfig.threshold && absDeltaX > absDeltaY) {
        isSwiping = true;
        direction = deltaX > 0 ? 'right' : 'left';
      }
    }

    if (finalConfig.direction === 'vertical' || finalConfig.direction === 'all') {
      if (absDeltaY > finalConfig.threshold && absDeltaY > absDeltaX) {
        isSwiping = true;
        direction = deltaY > 0 ? 'down' : 'up';
      }
    }

    // スクロール防止
    if (isSwiping && finalConfig.preventScrollOnSwipe) {
      event.preventDefault();
    }

    const timeElapsed = Date.now() - startPosRef.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = timeElapsed > 0 ? distance / timeElapsed : 0;

    setState({
      isSwiping,
      direction,
      deltaX,
      deltaY,
      velocity,
    });

    handlers.onSwipeMove?.(event, deltaX, deltaY);
  }, [finalConfig, getEventPosition, handlers]);

  const handleEnd = useCallback((event: TouchEvent | PointerEvent) => {
    if (!startPosRef.current || !currentPosRef.current) return;

    const deltaX = currentPosRef.current.x - startPosRef.current.x;
    const deltaY = currentPosRef.current.y - startPosRef.current.y;
    const timeElapsed = Date.now() - startPosRef.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = timeElapsed > 0 ? distance / timeElapsed : 0;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // スワイプ判定：閾値と速度の両方をチェック
    const isValidSwipe = (distance > finalConfig.threshold) && (velocity > finalConfig.velocity);

    if (isValidSwipe) {
      if (finalConfig.direction === 'horizontal' || finalConfig.direction === 'all') {
        if (absDeltaX > absDeltaY) {
          if (deltaX > 0) {
            handlers.onSwipeRight?.();
          } else {
            handlers.onSwipeLeft?.();
          }
        }
      }

      if (finalConfig.direction === 'vertical' || finalConfig.direction === 'all') {
        if (absDeltaY > absDeltaX) {
          if (deltaY > 0) {
            handlers.onSwipeDown?.();
          } else {
            handlers.onSwipeUp?.();
          }
        }
      }
    }

    // 状態をリセット
    setState(prev => ({
      ...prev,
      isSwiping: false,
      direction: null,
    }));

    startPosRef.current = null;
    currentPosRef.current = null;

    handlers.onSwipeEnd?.(event);
  }, [finalConfig, handlers]);

  // イベントハンドラーをバインド
  const bindSwipeHandlers = useCallback((element: HTMLElement) => {
    if (!element) return () => {};

    // タッチイベント
    element.addEventListener('touchstart', handleStart, { passive: false });
    element.addEventListener('touchmove', handleMove, { passive: false });
    element.addEventListener('touchend', handleEnd, { passive: false });
    
    // ポインターイベント（デスクトップ対応）
    element.addEventListener('pointerdown', handleStart);
    element.addEventListener('pointermove', handleMove);
    element.addEventListener('pointerup', handleEnd);

    return () => {
      element.removeEventListener('touchstart', handleStart);
      element.removeEventListener('touchmove', handleMove);
      element.removeEventListener('touchend', handleEnd);
      element.removeEventListener('pointerdown', handleStart);
      element.removeEventListener('pointermove', handleMove);
      element.removeEventListener('pointerup', handleEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  return {
    state,
    bindSwipeHandlers,
  };
};

/**
 * プルツーリフレッシュ機能付きスワイプフック
 */
export const usePullToRefresh = (
  onRefresh: () => void | Promise<void>,
  config: Partial<SwipeGestureConfig> = {}
) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const handleSwipeDown = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh, isRefreshing]);

  const swipeHandlers = useSwipeGesture({
    onSwipeDown: handleSwipeDown,
    onSwipeMove: (_, __, deltaY) => {
      if (deltaY > 0 && window.scrollY === 0) {
        setPullDistance(Math.min(deltaY, 120)); // 最大120px
      }
    },
    onSwipeEnd: () => {
      if (!isRefreshing) {
        setPullDistance(0);
      }
    },
  }, {
    ...config,
    direction: 'vertical',
    threshold: 80,
  });

  return {
    ...swipeHandlers,
    isRefreshing,
    pullDistance,
  };
};