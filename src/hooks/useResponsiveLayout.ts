/**
 * レスポンシブレイアウト管理フック
 * デスクトップ/タブレット/モバイルの画面サイズを管理し、
 * 適切なレイアウトモードを提供する
 */

import { useState, useEffect, useCallback } from 'react';

export type LayoutMode = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveLayoutConfig {
  desktop: number;  // デスクトップ閾値 (1024px)
  tablet: number;   // タブレット閾値 (768px)
}

export interface ResponsiveLayoutHook {
  layout: LayoutMode;
  width: number;
  height: number;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

const DEFAULT_CONFIG: ResponsiveLayoutConfig = {
  desktop: 1024,
  tablet: 768,
};

/**
 * レスポンシブレイアウト管理フック
 * 
 * @param config - ブレークポイント設定
 * @returns レスポンシブレイアウト情報
 */
export const useResponsiveLayout = (
  config: Partial<ResponsiveLayoutConfig> = {}
): ResponsiveLayoutHook => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  }));

  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  const getLayoutMode = useCallback((width: number): LayoutMode => {
    if (width >= finalConfig.desktop) return 'desktop';
    if (width >= finalConfig.tablet) return 'tablet';
    return 'mobile';
  }, [finalConfig]);

  const updateLayout = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    
    setDimensions(prev => {
      // サイズ変更が微細な場合は更新をスキップ（パフォーマンス最適化）
      if (Math.abs(prev.width - newWidth) < 10 && Math.abs(prev.height - newHeight) < 10) {
        return prev;
      }
      return { width: newWidth, height: newHeight };
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // タッチ対応の検出
    const detectTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    // リサイズイベントのデバウンス処理
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, 100);
    };

    // 初期化
    updateLayout();
    detectTouch();

    // イベントリスナーの設定
    window.addEventListener('resize', debouncedResize, { passive: true });
    window.addEventListener('orientationchange', updateLayout, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, [updateLayout]);

  const layout = getLayoutMode(dimensions.width);
  const orientation = dimensions.height > dimensions.width ? 'portrait' : 'landscape';

  return {
    layout,
    width: dimensions.width,
    height: dimensions.height,
    isDesktop: layout === 'desktop',
    isTablet: layout === 'tablet',
    isMobile: layout === 'mobile',
    isTouch,
    orientation,
  };
};

/**
 * CSS-in-JS用のブレークポイントユーティリティ
 */
export const breakpoints = {
  mobile: `@media (max-width: ${DEFAULT_CONFIG.tablet - 1}px)`,
  tablet: `@media (min-width: ${DEFAULT_CONFIG.tablet}px) and (max-width: ${DEFAULT_CONFIG.desktop - 1}px)`,
  desktop: `@media (min-width: ${DEFAULT_CONFIG.desktop}px)`,
  touchDevice: '@media (hover: none) and (pointer: coarse)',
  nonTouchDevice: '@media (hover: hover) and (pointer: fine)',
} as const;

/**
 * レスポンシブ条件付きレンダリング用フック
 */
export const useResponsiveRender = () => {
  const { layout, isTouch } = useResponsiveLayout();
  
  return {
    desktop: (component: React.ReactNode) => layout === 'desktop' ? component : null,
    tablet: (component: React.ReactNode) => layout === 'tablet' ? component : null,
    mobile: (component: React.ReactNode) => layout === 'mobile' ? component : null,
    touch: (component: React.ReactNode) => isTouch ? component : null,
    nonTouch: (component: React.ReactNode) => !isTouch ? component : null,
    // 組み合わせ条件
    desktopOrTablet: (component: React.ReactNode) => 
      layout === 'desktop' || layout === 'tablet' ? component : null,
    tabletOrMobile: (component: React.ReactNode) => 
      layout === 'tablet' || layout === 'mobile' ? component : null,
  };
};

/**
 * レスポンシブ値セレクター用フック
 */
export const useResponsiveValue = <T>(values: {
  mobile: T;
  tablet?: T;
  desktop?: T;
}): T => {
  const { layout } = useResponsiveLayout();
  
  switch (layout) {
    case 'desktop':
      return values.desktop ?? values.tablet ?? values.mobile;
    case 'tablet':
      return values.tablet ?? values.mobile;
    case 'mobile':
    default:
      return values.mobile;
  }
};