/**
 * キーボードナビゲーション管理フック
 * 設計書 グループ2: WCAG準拠アクセシビリティ対応
 * 
 * 目的: WCAG 2.1 AA準拠のキーボード操作100%対応
 * 特徴: 矢印キー、Enter、Space、Escape、Tab の完全サポート
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAccessibility } from '../providers/AccessibilityProvider';

export interface KeyboardNavigationOptions {
  /** 矢印キーナビゲーション有効化 */
  enableArrowKeys?: boolean;
  /** Enter キーでのアクティベーション */
  enableEnterKey?: boolean;
  /** Space キーでのアクティベーション */
  enableSpaceKey?: boolean;
  /** Escape キーでのキャンセル */
  enableEscapeKey?: boolean;
  /** Home/End キーでの最初/最後への移動 */
  enableHomeEndKeys?: boolean;
  /** 循環ナビゲーション（最後の要素から最初へ）*/
  enableWrapNavigation?: boolean;
  /** フォーカス可能要素のセレクター */
  focusableSelector?: string;
  /** キーボードイベント発生時のコールバック */
  onKeyboardAction?: (action: KeyboardAction, element: HTMLElement) => void;
}

export interface KeyboardAction {
  type: 'navigate' | 'activate' | 'cancel' | 'custom';
  key: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'first' | 'last';
  element: HTMLElement;
}

const DEFAULT_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[role="button"]:not([disabled])',
  '[role="menuitem"]:not([disabled])',
  '[role="option"]:not([disabled])',
  '[contenteditable="true"]'
].join(', ');

/**
 * キーボードナビゲーション管理フック
 * 
 * WCAG 2.1 AA準拠機能:
 * - 2.1.1 Keyboard: すべての機能がキーボードでアクセス可能
 * - 2.1.2 No Keyboard Trap: キーボードトラップの回避
 * - 2.4.3 Focus Order: 適切なフォーカス順序
 * - 2.4.6 Headings and Labels: 適切な見出しとラベル
 */
export const useKeyboardNavigation = (
  containerRef: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) => {
  const {
    enableArrowKeys = true,
    enableEnterKey = true,
    enableSpaceKey = true,
    enableEscapeKey = true,
    enableHomeEndKeys = true,
    enableWrapNavigation = false,
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
    onKeyboardAction
  } = options;

  const { config, announce } = useAccessibility();
  const currentFocusIndexRef = useRef<number>(-1);

  // フォーカス可能な要素を取得
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const elements = containerRef.current.querySelectorAll(focusableSelector);
    return Array.from(elements).filter((element): element is HTMLElement => {
      const htmlElement = element as HTMLElement;
      
      // 見た目上隠れている要素を除外
      const style = getComputedStyle(htmlElement);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
      
      // aria-hidden="true" の要素を除外
      if (htmlElement.getAttribute('aria-hidden') === 'true') {
        return false;
      }
      
      // disabled 状態の要素を除外
      if (htmlElement.hasAttribute('disabled') || 
          htmlElement.getAttribute('aria-disabled') === 'true') {
        return false;
      }
      
      return true;
    });
  }, [containerRef, focusableSelector]);

  // 現在のフォーカス位置を取得
  const getCurrentFocusIndex = useCallback((): number => {
    const elements = getFocusableElements();
    const activeElement = document.activeElement as HTMLElement;
    
    return elements.findIndex(element => element === activeElement);
  }, [getFocusableElements]);

  // 指定した要素にフォーカスを移動
  const focusElement = useCallback((index: number, announce = true) => {
    const elements = getFocusableElements();
    
    if (index < 0 || index >= elements.length) return false;
    
    const element = elements[index];
    element.focus();
    currentFocusIndexRef.current = index;
    
    if (announce && config.keyboardNavigation) {
      // 要素の説明を読み上げ
      const label = element.getAttribute('aria-label') || 
                   element.getAttribute('title') ||
                   element.textContent?.trim() ||
                   element.tagName.toLowerCase();
      
      announce(`${index + 1} / ${elements.length}: ${label}`);
    }
    
    return true;
  }, [getFocusableElements, config.keyboardNavigation, announce]);

  // 次の要素にフォーカス移動
  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = getCurrentFocusIndex();
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= elements.length) {
      nextIndex = enableWrapNavigation ? 0 : elements.length - 1;
    }
    
    return focusElement(nextIndex);
  }, [getCurrentFocusIndex, getFocusableElements, enableWrapNavigation, focusElement]);

  // 前の要素にフォーカス移動
  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    const currentIndex = getCurrentFocusIndex();
    let prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
      prevIndex = enableWrapNavigation ? elements.length - 1 : 0;
    }
    
    return focusElement(prevIndex);
  }, [getCurrentFocusIndex, getFocusableElements, enableWrapNavigation, focusElement]);

  // 最初の要素にフォーカス移動
  const focusFirst = useCallback(() => {
    return focusElement(0);
  }, [focusElement]);

  // 最後の要素にフォーカス移動
  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    return focusElement(elements.length - 1);
  }, [getFocusableElements, focusElement]);

  // 矢印キーによるグリッドナビゲーション（オプション）
  const navigateGrid = useCallback((direction: 'up' | 'down' | 'left' | 'right', columns: number = 1) => {
    const elements = getFocusableElements();
    const currentIndex = getCurrentFocusIndex();
    
    if (currentIndex < 0) return false;
    
    let newIndex = currentIndex;
    
    switch (direction) {
      case 'up':
        newIndex = currentIndex - columns;
        break;
      case 'down':
        newIndex = currentIndex + columns;
        break;
      case 'left':
        newIndex = currentIndex - 1;
        break;
      case 'right':
        newIndex = currentIndex + 1;
        break;
    }
    
    // 境界チェック
    if (newIndex < 0) {
      newIndex = enableWrapNavigation ? elements.length + newIndex : 0;
    } else if (newIndex >= elements.length) {
      newIndex = enableWrapNavigation ? newIndex - elements.length : elements.length - 1;
    }
    
    return focusElement(newIndex);
  }, [getCurrentFocusIndex, getFocusableElements, enableWrapNavigation, focusElement]);

  // キーボードイベントハンドラー
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!config.keyboardNavigation) return;
    
    const activeElement = document.activeElement as HTMLElement;
    if (!containerRef.current?.contains(activeElement)) return;
    
    const action: KeyboardAction = {
      type: 'navigate',
      key: event.key,
      element: activeElement
    };
    
    let handled = false;
    
    switch (event.key) {
      case 'ArrowUp':
        if (enableArrowKeys) {
          event.preventDefault();
          action.direction = 'up';
          handled = focusPrevious();
        }
        break;
        
      case 'ArrowDown':
        if (enableArrowKeys) {
          event.preventDefault();
          action.direction = 'down';
          handled = focusNext();
        }
        break;
        
      case 'ArrowLeft':
        if (enableArrowKeys) {
          event.preventDefault();
          action.direction = 'left';
          handled = focusPrevious();
        }
        break;
        
      case 'ArrowRight':
        if (enableArrowKeys) {
          event.preventDefault();
          action.direction = 'right';
          handled = focusNext();
        }
        break;
        
      case 'Home':
        if (enableHomeEndKeys) {
          event.preventDefault();
          action.direction = 'first';
          handled = focusFirst();
        }
        break;
        
      case 'End':
        if (enableHomeEndKeys) {
          event.preventDefault();
          action.direction = 'last';
          handled = focusLast();
        }
        break;
        
      case 'Enter':
        if (enableEnterKey && activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
          action.type = 'activate';
          activeElement.click();
          handled = true;
        }
        break;
        
      case ' ':
      case 'Spacebar': // IE/Edge legacy
        if (enableSpaceKey && 
            activeElement.tagName !== 'INPUT' && 
            activeElement.tagName !== 'TEXTAREA' &&
            activeElement.getAttribute('role') !== 'textbox') {
          event.preventDefault();
          action.type = 'activate';
          activeElement.click();
          handled = true;
        }
        break;
        
      case 'Escape':
        if (enableEscapeKey) {
          action.type = 'cancel';
          
          // カスタムエスケープイベントを発火
          const escapeEvent = new CustomEvent('accessibility:escape', {
            bubbles: true,
            detail: { originalEvent: event, element: activeElement }
          });
          activeElement.dispatchEvent(escapeEvent);
          handled = true;
        }
        break;
    }
    
    // コールバック呼び出し
    if (handled && onKeyboardAction) {
      onKeyboardAction(action, activeElement);
    }
  }, [
    config.keyboardNavigation, 
    containerRef, 
    enableArrowKeys, 
    enableEnterKey, 
    enableSpaceKey, 
    enableEscapeKey, 
    enableHomeEndKeys,
    focusNext, 
    focusPrevious, 
    focusFirst, 
    focusLast,
    onKeyboardAction
  ]);

  // イベントリスナーの追加/削除
  useEffect(() => {
    if (!config.keyboardNavigation) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [config.keyboardNavigation, containerRef, handleKeyDown]);

  // ARIA属性の自動設定
  useEffect(() => {
    if (!config.keyboardNavigation) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    // コンテナにrole="application"またはrole="group"を設定
    if (!container.getAttribute('role')) {
      container.setAttribute('role', 'group');
    }
    
    // aria-label がない場合は設定
    if (!container.getAttribute('aria-label') && !container.getAttribute('aria-labelledby')) {
      container.setAttribute('aria-label', 'キーボードナビゲーション可能な領域');
    }
    
    // フォーカス可能要素のARIA属性を設定
    const elements = getFocusableElements();
    elements.forEach((element, index) => {
      // aria-posinset と aria-setsize を設定
      element.setAttribute('aria-posinset', (index + 1).toString());
      element.setAttribute('aria-setsize', elements.length.toString());
      
      // role が設定されていない場合は適切なroleを設定
      if (!element.getAttribute('role') && element.tagName === 'DIV') {
        element.setAttribute('role', 'button');
        element.setAttribute('tabindex', '0');
      }
    });
    
    return () => {
      // クリーンアップは基本的に不要（要素がDOMから削除される際に自動的にクリア）
    };
  }, [config.keyboardNavigation, containerRef, getFocusableElements]);

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    focusElement: (index: number) => focusElement(index, false),
    navigateGrid,
    getFocusableElements,
    getCurrentFocusIndex,
    isEnabled: config.keyboardNavigation
  };
};