/**
 * フォーカス管理フック
 * 設計書 グループ2: WCAG準拠アクセシビリティ対応
 * 
 * 目的: WCAG 2.1 AA準拠のフォーカス管理システム構築
 * 特徴: フォーカストラップ、復元、キーボードナビゲーション
 */

import { useEffect, useRef, useCallback } from 'react';

export interface FocusManagementOptions {
  /** フォーカストラップを有効にするか */
  trapFocus?: boolean;
  /** 自動フォーカスを有効にするか */
  autoFocus?: boolean;
  /** 復元対象の要素（指定がない場合は自動検知） */
  restoreElement?: HTMLElement | null;
  /** フォーカス可能な要素のセレクター */
  focusableSelector?: string;
}

const DEFAULT_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable="true"]'
].join(', ');

/**
 * フォーカス管理フック
 * 
 * モーダルやダイアログでのフォーカス管理を自動化
 * WCAG 2.1 AA基準に準拠したキーボードナビゲーションを提供
 */
export const useFocusManagement = (
  containerRef: React.RefObject<HTMLElement>,
  isActive: boolean = true,
  options: FocusManagementOptions = {}
) => {
  const {
    trapFocus = true,
    autoFocus = true,
    restoreElement,
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR
  } = options;

  const previousFocusRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  // フォーカス可能な要素を取得
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    
    const elements = containerRef.current.querySelectorAll(focusableSelector);
    return Array.from(elements) as HTMLElement[];
  }, [containerRef, focusableSelector]);

  // フォーカス可能な要素リストを更新
  const updateFocusableElements = useCallback(() => {
    const elements = getFocusableElements();
    firstFocusableRef.current = elements[0] || null;
    lastFocusableRef.current = elements[elements.length - 1] || null;
  }, [getFocusableElements]);

  // 初回フォーカス設定
  const setInitialFocus = useCallback(() => {
    if (!isActive || !autoFocus) return;
    
    updateFocusableElements();
    
    // 最初のフォーカス可能な要素にフォーカス
    if (firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isActive, autoFocus, updateFocusableElements]);

  // フォーカス復元
  const restoreFocus = useCallback(() => {
    const elementToFocus = restoreElement || previousFocusRef.current;
    
    if (elementToFocus && document.contains(elementToFocus)) {
      // 少し遅延させてDOM更新完了を待つ
      requestAnimationFrame(() => {
        elementToFocus.focus();
      });
    }
  }, [restoreElement]);

  // タブトラップハンドリング
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (!trapFocus || !isActive || event.key !== 'Tab') return;
    if (!containerRef.current) return;

    updateFocusableElements();

    const { shiftKey } = event;
    const activeElement = document.activeElement as HTMLElement;

    // フォーカス可能な要素がない場合
    if (!firstFocusableRef.current) {
      event.preventDefault();
      return;
    }

    // Shift+Tab: 逆方向
    if (shiftKey) {
      if (activeElement === firstFocusableRef.current) {
        event.preventDefault();
        lastFocusableRef.current?.focus();
      }
    } else {
      // Tab: 順方向
      if (activeElement === lastFocusableRef.current) {
        event.preventDefault();
        firstFocusableRef.current?.focus();
      }
    }
  }, [trapFocus, isActive, containerRef, updateFocusableElements]);

  // アクティブ状態の開始処理
  useEffect(() => {
    if (isActive) {
      // 現在のフォーカス要素を保存
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // 初期フォーカス設定
      setInitialFocus();
      
      // キーボードイベントリスナー追加
      document.addEventListener('keydown', handleTabKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isActive, setInitialFocus, handleTabKey]);

  // 非アクティブ状態の終了処理
  useEffect(() => {
    if (!isActive) {
      restoreFocus();
    }
  }, [isActive, restoreFocus]);

  // フォーカス要素の更新（DOM変更時）
  useEffect(() => {
    if (isActive) {
      updateFocusableElements();
    }
  }, [isActive, updateFocusableElements]);

  // 手動フォーカス制御用のメソッド
  const focusFirst = useCallback(() => {
    updateFocusableElements();
    firstFocusableRef.current?.focus();
  }, [updateFocusableElements]);

  const focusLast = useCallback(() => {
    updateFocusableElements();
    lastFocusableRef.current?.focus();
  }, [updateFocusableElements]);

  return {
    focusFirst,
    focusLast,
    restoreFocus,
    getFocusableElements
  };
};