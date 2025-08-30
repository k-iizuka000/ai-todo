/**
 * アクセシブルモーダル管理フック
 * 設計書 グループ2: WCAG準拠アクセシビリティ対応
 * 
 * 目的: WCAG 2.1 AA準拠のモーダルダイアログ実装
 * 特徴: フォーカストラップ、ARIA属性、スクリーンリーダー対応
 */

import { useCallback, useEffect, useRef } from 'react';
import { useFocusManagement, FocusManagementOptions } from './useFocusManagement';
import { useAccessibility } from '../providers/AccessibilityProvider';

export interface AccessibleModalOptions extends FocusManagementOptions {
  /** モーダルのタイトル（aria-labelledby用） */
  title?: string;
  /** モーダルの説明（aria-describedby用） */
  description?: string;
  /** 閉じるボタンのテキスト */
  closeButtonText?: string;
  /** モーダル開閉時のアナウンス */
  announceOnOpen?: boolean;
  /** モーダル開閉時のアナウンス */
  announceOnClose?: boolean;
  /** Escキーでの閉鎖を許可 */
  allowEscapeClose?: boolean;
  /** オーバーレイクリックでの閉鎖を許可 */
  allowOverlayClose?: boolean;
  /** モーダル開閉時のコールバック */
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * アクセシブルモーダル管理フック
 * 
 * WCAG 2.1 AA準拠機能:
 * - 1.3.1 Info and Relationships: 適切な構造とARIA属性
 * - 2.1.2 No Keyboard Trap: Escキーでの脱出
 * - 2.4.3 Focus Order: モーダル内でのフォーカス管理
 * - 3.2.2 On Input: 予期しない動作の防止
 * - 4.1.2 Name, Role, Value: 適切なrole、aria-modal、aria-label
 * - 4.1.3 Status Messages: 開閉状態のアナウンス
 */
export const useAccessibleModal = (
  isOpen: boolean,
  options: AccessibleModalOptions = {}
) => {
  const {
    title,
    description,
    closeButtonText = '閉じる',
    announceOnOpen = true,
    announceOnClose = true,
    allowEscapeClose = true,
    allowOverlayClose = true,
    onOpen,
    onClose,
    ...focusOptions
  } = options;

  const modalRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const { announce, config } = useAccessibility();

  // フォーカス管理の統合
  const focusManagement = useFocusManagement(
    modalRef,
    isOpen,
    {
      trapFocus: true,
      autoFocus: true,
      ...focusOptions
    }
  );

  // モーダル開閉時の処理
  useEffect(() => {
    if (isOpen) {
      // 開く時の処理
      lastFocusedElementRef.current = document.activeElement as HTMLElement;
      
      // body要素にaria-hidden="true"を設定（モーダル以外を隠す）
      document.body.setAttribute('aria-hidden', 'true');
      
      // スクロール禁止
      document.body.style.overflow = 'hidden';
      
      // アナウンス
      if (announceOnOpen && title) {
        announce(`モーダルダイアログが開きました: ${title}`, 'polite');
      }
      
      onOpen?.();
    } else {
      // 閉じる時の処理
      document.body.removeAttribute('aria-hidden');
      document.body.style.overflow = '';
      
      // フォーカス復元
      if (lastFocusedElementRef.current) {
        requestAnimationFrame(() => {
          lastFocusedElementRef.current?.focus();
        });
      }
      
      // アナウンス
      if (announceOnClose) {
        announce('モーダルダイアログが閉じられました', 'polite');
      }
      
      onClose?.();
    }
  }, [isOpen, title, announceOnOpen, announceOnClose, announce, onOpen, onClose]);

  // Escキーでの閉鎖
  useEffect(() => {
    if (!isOpen || !allowEscapeClose) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    // カスタムエスケープイベントの監視
    const handleCustomEscape = (event: CustomEvent) => {
      event.preventDefault();
      onClose?.();
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('accessibility:escape', handleCustomEscape as EventListener);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('accessibility:escape', handleCustomEscape as EventListener);
    };
  }, [isOpen, allowEscapeClose, onClose]);

  // オーバーレイクリックでの閉鎖
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (!allowOverlayClose) return;
    
    // モーダルコンテンツ以外（オーバーレイ）がクリックされた場合
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  }, [allowOverlayClose, onClose]);

  // ARIA属性の生成
  const getModalProps = useCallback(() => {
    const titleId = titleRef.current?.id || 'modal-title';
    const descriptionId = descriptionRef.current?.id || 'modal-description';

    return {
      ref: modalRef,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': title ? titleId : undefined,
      'aria-describedby': description ? descriptionId : undefined,
      'aria-hidden': !isOpen,
      tabIndex: -1,
      onClick: handleOverlayClick
    };
  }, [title, description, isOpen, handleOverlayClick]);

  // タイトル要素のprops
  const getTitleProps = useCallback(() => ({
    ref: titleRef,
    id: 'modal-title',
    role: 'heading',
    'aria-level': 2
  }), []);

  // 説明要素のprops
  const getDescriptionProps = useCallback(() => ({
    ref: descriptionRef,
    id: 'modal-description'
  }), []);

  // 閉じるボタンのprops
  const getCloseButtonProps = useCallback(() => ({
    ref: closeButtonRef,
    type: 'button' as const,
    'aria-label': closeButtonText,
    onClick: onClose
  }), [closeButtonText, onClose]);

  // キーボードナビゲーション用のヘルプテキスト
  const getKeyboardHelpProps = useCallback(() => ({
    className: 'sr-only',
    'aria-live': 'polite' as const,
    children: config.keyboardNavigation 
      ? 'モーダル内ではTabキーで項目間を移動、Escキーで閉じることができます。' 
      : ''
  }), [config.keyboardNavigation]);

  // フォーカス位置の調整
  const focusCloseButton = useCallback(() => {
    closeButtonRef.current?.focus();
  }, []);

  const focusFirstElement = useCallback(() => {
    focusManagement.focusFirst();
  }, [focusManagement]);

  const focusLastElement = useCallback(() => {
    focusManagement.focusLast();
  }, [focusManagement]);

  return {
    modalRef,
    titleRef,
    descriptionRef,
    closeButtonRef,
    
    // Props生成関数
    getModalProps,
    getTitleProps,
    getDescriptionProps,
    getCloseButtonProps,
    getKeyboardHelpProps,
    
    // フォーカス制御
    focusCloseButton,
    focusFirstElement,
    focusLastElement,
    
    // フォーカス管理機能
    ...focusManagement,
    
    // 状態
    isOpen,
    isKeyboardNavigationEnabled: config.keyboardNavigation
  };
};

/**
 * モーダルコンテンツのレンダリングヘルパー
 */
export const ModalContent: React.FC<{
  isOpen: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
  modalHook: ReturnType<typeof useAccessibleModal>;
  className?: string;
}> = ({ 
  isOpen, 
  title, 
  description, 
  children, 
  modalHook,
  className = '' 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${className}`}
      {...modalHook.getModalProps()}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full m-4 p-6">
        {/* キーボードナビゲーションヘルプ */}
        <div {...modalHook.getKeyboardHelpProps()} />
        
        {/* タイトル */}
        {title && (
          <h2 {...modalHook.getTitleProps()} className="text-xl font-semibold mb-4">
            {title}
          </h2>
        )}
        
        {/* 説明 */}
        {description && (
          <p {...modalHook.getDescriptionProps()} className="text-gray-600 mb-4">
            {description}
          </p>
        )}
        
        {/* メインコンテンツ */}
        <div className="modal-body">
          {children}
        </div>
        
        {/* 閉じるボタン */}
        <div className="flex justify-end mt-6">
          <button 
            {...modalHook.getCloseButtonProps()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};