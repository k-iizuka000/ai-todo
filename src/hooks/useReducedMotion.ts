/**
 * アクセシビリティ設定でのアニメーション制御フック
 * prefers-reduced-motionを監視し、ユーザーの設定に応じてアニメーションを制御
 */

import { useState, useEffect } from 'react';

/**
 * ユーザーのモーション設定を監視するフック
 * @returns prefersReducedMotion - true: アニメーション制限, false: アニメーション許可
 */
export const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    // サーバーサイドレンダリング対応
    if (typeof window === 'undefined') {
      return false;
    }
    
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // モダンブラウザ
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // 古いブラウザ対応
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }

    return undefined;
  }, []);

  return prefersReducedMotion;
};

/**
 * アニメーション制御のための条件付きクラス名生成
 */
export const useAnimationClass = (
  animationClass: string, 
  fallbackClass: string = ''
): string => {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? fallbackClass : animationClass;
};

/**
 * アニメーション時間の動的制御
 */
export const useAnimationDuration = (
  normalDuration: number,
  reducedDuration: number = 0
): number => {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? reducedDuration : normalDuration;
};

/**
 * トランジション設定の動的制御
 */
export const useTransitionConfig = <T>(
  normalConfig: T,
  reducedConfig: Partial<T>
): T => {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return { ...normalConfig, ...reducedConfig };
  }
  
  return normalConfig;
};