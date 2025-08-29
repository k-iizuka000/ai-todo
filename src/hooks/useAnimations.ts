/**
 * アニメーション管理フック
 * 60fps維持、レスポンシブ対応、タッチフレンドリーなアニメーション
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useResponsiveLayout } from './useResponsiveLayout';

export interface AnimationConfig {
  duration: number;         // アニメーション時間（ms）
  easing: string;          // イージング関数
  delay?: number;          // 遅延時間（ms）
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
  iterations?: number | 'infinite';
}

export interface SpringAnimationConfig {
  stiffness: number;       // バネの硬さ
  damping: number;         // 減衰係数
  mass: number;           // 質量
  initialVelocity?: number; // 初期速度
}

export interface AnimationState {
  isAnimating: boolean;
  progress: number;        // 0-1の進行度
  currentValue: number;    // 現在の値
}

const DEFAULT_CONFIG: AnimationConfig = {
  duration: 200,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // 自然なイージング
  fillMode: 'forwards',
};

const SPRING_CONFIG: SpringAnimationConfig = {
  stiffness: 300,
  damping: 30,
  mass: 1,
  initialVelocity: 0,
};

/**
 * 値アニメーション管理フック
 * 
 * @param from - 開始値
 * @param to - 終了値
 * @param config - アニメーション設定
 * @returns アニメーション状態と制御関数
 */
export const useValueAnimation = (
  from: number,
  to: number,
  config: Partial<AnimationConfig> = {}
) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<AnimationState>({
    isAnimating: false,
    progress: 0,
    currentValue: from,
  });

  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / finalConfig.duration, 1);

    // イージング関数の適用（簡易版）
    let easedProgress = progress;
    if (finalConfig.easing === 'cubic-bezier(0.16, 1, 0.3, 1)') {
      // 自然なイージング曲線
      easedProgress = 1 - Math.pow(1 - progress, 4);
    } else if (finalConfig.easing === 'ease-in-out') {
      easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    }

    const currentValue = from + (to - from) * easedProgress;

    setState({
      isAnimating: progress < 1,
      progress,
      currentValue,
    });

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      startTimeRef.current = undefined;
    }
  }, [from, to, finalConfig]);

  const start = useCallback(() => {
    if (state.isAnimating) return;
    
    setState(prev => ({ ...prev, isAnimating: true, progress: 0 }));
    startTimeRef.current = undefined;
    animationRef.current = requestAnimationFrame(animate);
  }, [animate, state.isAnimating]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
    setState(prev => ({ ...prev, isAnimating: false }));
    startTimeRef.current = undefined;
  }, []);

  const reset = useCallback(() => {
    stop();
    setState({
      isAnimating: false,
      progress: 0,
      currentValue: from,
    });
  }, [stop, from]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    state,
    start,
    stop,
    reset,
  };
};

/**
 * スプリングアニメーション管理フック
 * より自然な物理ベースのアニメーション
 */
export const useSpringAnimation = (
  target: number,
  config: Partial<SpringAnimationConfig> = {}
) => {
  const finalConfig = { ...SPRING_CONFIG, ...config };
  const [currentValue, setCurrentValue] = useState(target);
  const [velocity, setVelocity] = useState(finalConfig.initialVelocity || 0);
  const [isAnimating, setIsAnimating] = useState(false);

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>();

  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = Math.min((timestamp - lastTimeRef.current) / 1000, 0.016); // 最大16ms
    lastTimeRef.current = timestamp;

    setCurrentValue(prev => {
      const displacement = target - prev;
      
      // スプリング物理計算
      const springForce = finalConfig.stiffness * displacement;
      const dampingForce = finalConfig.damping * velocity;
      const force = springForce - dampingForce;
      
      const acceleration = force / finalConfig.mass;
      const newVelocity = velocity + acceleration * deltaTime;
      const newValue = prev + newVelocity * deltaTime;

      setVelocity(newVelocity);

      // 収束判定
      const isSettled = Math.abs(displacement) < 0.01 && Math.abs(newVelocity) < 0.01;
      
      if (isSettled) {
        setIsAnimating(false);
        lastTimeRef.current = undefined;
        return target;
      } else {
        animationRef.current = requestAnimationFrame(animate);
        return newValue;
      }
    });
  }, [target, finalConfig, velocity]);

  useEffect(() => {
    if (Math.abs(target - currentValue) > 0.01) {
      setIsAnimating(true);
      lastTimeRef.current = undefined;
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, animate, currentValue]);

  return {
    value: currentValue,
    velocity,
    isAnimating,
  };
};

/**
 * レスポンシブアニメーション設定フック
 * デバイスに応じてアニメーション設定を最適化
 */
export const useResponsiveAnimation = () => {
  const { layout, isTouch } = useResponsiveLayout();

  const getOptimizedConfig = useCallback((baseConfig: Partial<AnimationConfig> = {}): AnimationConfig => {
    const finalConfig = { ...DEFAULT_CONFIG, ...baseConfig };

    // モバイル端末では短めのアニメーションを使用
    if (layout === 'mobile') {
      finalConfig.duration = Math.min(finalConfig.duration * 0.8, 150);
    }

    // タッチデバイスでは応答性を優先
    if (isTouch) {
      finalConfig.easing = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // ease-out
    }

    // Reduced motionの対応
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      finalConfig.duration = 0;
    }

    return finalConfig;
  }, [layout, isTouch]);

  return { getOptimizedConfig };
};

/**
 * ページトランジションアニメーション
 */
export const usePageTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState<'slide' | 'fade' | 'scale'>('slide');

  const startTransition = useCallback((type: 'slide' | 'fade' | 'scale' = 'slide') => {
    setTransitionType(type);
    setIsTransitioning(true);
  }, []);

  const endTransition = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  const getTransitionStyles = useCallback((direction: 'in' | 'out' = 'in') => {
    const baseStyles = {
      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    };

    if (!isTransitioning) return baseStyles;

    switch (transitionType) {
      case 'slide':
        return {
          ...baseStyles,
          transform: direction === 'in' ? 'translateX(0)' : 'translateX(100%)',
          opacity: direction === 'in' ? 1 : 0,
        };
      case 'fade':
        return {
          ...baseStyles,
          opacity: direction === 'in' ? 1 : 0,
        };
      case 'scale':
        return {
          ...baseStyles,
          transform: direction === 'in' ? 'scale(1)' : 'scale(0.95)',
          opacity: direction === 'in' ? 1 : 0,
        };
      default:
        return baseStyles;
    }
  }, [isTransitioning, transitionType]);

  return {
    isTransitioning,
    startTransition,
    endTransition,
    getTransitionStyles,
  };
};

/**
 * パフォーマンス最適化のためのアニメーション管理
 */
export const useAnimationOptimization = () => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    shouldAnimate: isVisible, // バックグラウンドではアニメーション停止
  };
};