/**
 * タスク詳細キーボードナビゲーションフック
 * グループ3: アクセシビリティ対応（WCAG 2.1 AA）
 * 設計書通りのキーボードショートカット機能を実装
 */

import { useEffect, useCallback, RefObject } from 'react';

export interface KeyboardHandlers {
  onSave?: () => void;
  onEdit?: () => void;
  onClose?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export interface UseTaskDetailKeyboardOptions {
  enabled?: boolean;
  trapFocus?: boolean;
  containerRef?: RefObject<HTMLElement>;
}

/**
 * タスク詳細画面用のキーボードナビゲーション管理フック
 */
export const useTaskDetailKeyboard = (
  handlers: KeyboardHandlers,
  options: UseTaskDetailKeyboardOptions = {}
) => {
  const { enabled = true, trapFocus = true, containerRef } = options;

  // フォーカストラッピング用の要素取得
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]:not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      'summary',
      'details[open]',
    ].join(', ');

    const focusableElements = Array.from(
      container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    return focusableElements.filter(
      element => 
        element.offsetParent !== null && // 表示されている要素
        !element.hasAttribute('aria-hidden') && // aria-hiddenでない
        element.tabIndex >= 0 // tabindex -1以外
    );
  }, []);

  // タブナビゲーション制御
  const handleTabNavigation = useCallback((e: KeyboardEvent) => {
    if (!trapFocus || !containerRef?.current) return;

    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const currentElement = document.activeElement as HTMLElement;

    // 前方向のTab（Shift+Tab）
    if (e.shiftKey) {
      if (currentElement === firstElement || !focusableElements.includes(currentElement)) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // 後方向のTab
      if (currentElement === lastElement || !focusableElements.includes(currentElement)) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [trapFocus, containerRef, getFocusableElements]);

  // キーボードイベントハンドラー
  const handleKeydown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // モディファイアキーとの組み合わせ
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          // Ctrl+S: 保存
          e.preventDefault();
          handlers.onSave?.();
          break;
        case 'e':
          // Ctrl+E: 編集モード切り替え
          e.preventDefault();
          handlers.onEdit?.();
          break;
        default:
          break;
      }
      return;
    }

    // 単体キー
    switch (e.key) {
      case 'Escape':
        // Escape: 閉じる
        handlers.onClose?.();
        break;
      case 'Tab':
        // Tab: フォーカストラッピング
        handleTabNavigation(e);
        break;
      case 'ArrowLeft':
        // ←: 前のタスク
        if (!isInputFocused()) {
          e.preventDefault();
          handlers.onNavigate?.('prev');
        }
        break;
      case 'ArrowRight':
        // →: 次のタスク
        if (!isInputFocused()) {
          e.preventDefault();
          handlers.onNavigate?.('next');
        }
        break;
      default:
        break;
    }
  }, [enabled, handlers, handleTabNavigation]);

  // 入力要素にフォーカスが当たっているかチェック
  const isInputFocused = useCallback((): boolean => {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const inputTags = ['input', 'textarea', 'select'];
    const isContentEditable = activeElement.hasAttribute('contenteditable');
    
    return inputTags.includes(activeElement.tagName.toLowerCase()) || isContentEditable;
  }, []);

  // 初期フォーカス設定
  const setInitialFocus = useCallback(() => {
    if (!enabled || !containerRef?.current) return;

    const container = containerRef.current;
    const focusableElements = getFocusableElements(container);
    
    if (focusableElements.length > 0) {
      // 最初のフォーカス可能な要素にフォーカス
      focusableElements[0].focus();
    } else {
      // フォーカス可能な要素がない場合はコンテナ自体にフォーカス
      container.setAttribute('tabindex', '-1');
      container.focus();
    }
  }, [enabled, containerRef, getFocusableElements]);

  // フォーカスを特定の要素に移動
  const focusElement = useCallback((selector: string) => {
    if (!enabled || !containerRef?.current) return false;

    const element = containerRef.current.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }, [enabled, containerRef]);

  // 現在フォーカスされている要素を取得
  const getCurrentFocusedElement = useCallback((): HTMLElement | null => {
    return document.activeElement as HTMLElement;
  }, []);

  // エフェクト：キーボードリスナーの設定
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [enabled, handleKeydown]);

  // エフェクト：初期フォーカス設定
  useEffect(() => {
    if (!enabled) return;

    // 少し遅延を入れてDOMが安定してからフォーカス設定
    const timeoutId = setTimeout(setInitialFocus, 100);
    
    return () => clearTimeout(timeoutId);
  }, [enabled, setInitialFocus]);

  return {
    setInitialFocus,
    focusElement,
    getCurrentFocusedElement,
    getFocusableElements: () => 
      containerRef?.current ? getFocusableElements(containerRef.current) : [],
    isInputFocused,
  };
};

export default useTaskDetailKeyboard;