/**
 * タスク詳細モーダル - WCAG 2.1 AA完全準拠
 * 設計書 グループ3: アクセシビリティ完全対応
 * 
 * 実装内容:
 * - Single Modal Context による一元的フォーカス制御
 * - Radix UI Dialog による業界標準のアクセシビリティ実装
 * - 完全なキーボードナビゲーション対応
 * - 詳細なARIA属性とスクリーンリーダー最適化
 * - フォーカストラップと復元機能
 * - 動的コンテンツのアナウンス対応
 */

import React, { Suspense, lazy, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TaskDetail } from '../../types/task';
import { Tag } from '../../types/tag';
import { Spinner } from '../ui/loading';
import { useCoreWebVitals } from '../../hooks/useCoreWebVitals';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useResponsiveAnimation } from '../../hooks/useAnimations';

// 設計書要件: 最適化された dynamic import と Code Splitting
const LazyTaskDetailView = lazy(() => 
  import(
    /* webpackChunkName: "task-detail-view" */
    /* webpackPreload: true */
    /* webpackPrefetch: true */
    './TaskDetailView'
  ).then(module => ({ 
    default: module.default 
  })).catch(error => {
    console.error('TaskDetailView lazy loading failed:', error);
    // フォールバック用の簡易コンポーネントを返す
    return { default: () => <div>タスク詳細を読み込めませんでした</div> };
  })
);

const LazyTaskDetailTabs = lazy(() => 
  import(
    /* webpackChunkName: "task-detail-tabs" */
    /* webpackPreload: true */
    './TaskDetailTabs'
  ).then(module => ({ 
    default: module.TaskDetailTabs 
  })).catch(error => {
    console.error('TaskDetailTabs lazy loading failed:', error);
    return { default: () => null };
  })
);

// ARIA属性用のヘルパー関数
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'todo': return '未着手';
    case 'in_progress': return '進行中';
    case 'done': return '完了';
    case 'archived': return 'アーカイブ';
    default: return status;
  }
};

const getPriorityLabel = (priority: string): string => {
  switch (priority) {
    case 'urgent': return '緊急';
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return priority;
  }
};

const formatDateForAria = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
};

export interface TaskDetailModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** 表示するタスク */
  task: TaskDetail | null;
  /** 編集可能かどうか */
  editable?: boolean;
  /** タスク更新時のコールバック */
  onTaskUpdate?: (taskId: string, updates: Partial<TaskDetail>) => void;
  /** タスク削除時のコールバック */
  onTaskDelete?: (taskId: string) => void;
  /** 利用可能なタグ */
  availableTags?: Tag[];
  /** プロジェクトクリック時のコールバック */
  onProjectClick?: (projectId: string) => void;
}

/**
 * レイジーローディング対応のタスク詳細モーダル
 * Core Web Vitals最適化のためのコード分割を実装
 */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  editable = false,
  onTaskUpdate,
  onTaskDelete,
  availableTags = [],
  onProjectClick
}) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // アクセシビリティ設定の検出
  const prefersReducedMotion = useReducedMotion();
  const [userPreferences, setUserPreferences] = useState({
    highContrast: false,
    largeText: false,
    reduceTransparency: false,
    prefersDarkMode: false
  });
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // アクセシビリティ設定の検出
    const detectPreferences = () => {
      const highContrast = window.matchMedia('(prefers-contrast: high)').matches ||
                          window.matchMedia('(-ms-high-contrast: active)').matches;
      const reduceTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // フォントサイズ設定の推定（ブラウザ設定）
      const baseFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const largeText = baseFontSize > 16;
      
      setUserPreferences({
        highContrast,
        largeText,
        reduceTransparency,
        prefersDarkMode
      });
    };
    
    detectPreferences();
    
    // メディアクエリの変更を監視
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
      window.matchMedia('(prefers-color-scheme: dark)')
    ];
    
    const handleChange = () => detectPreferences();
    mediaQueries.forEach(mq => {
      if (mq.addEventListener) {
        mq.addEventListener('change', handleChange);
      }
    });
    
    return () => {
      mediaQueries.forEach(mq => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', handleChange);
        }
      });
    };
  }, []);
  
  // アニメーション設定
  const overlayAnimationClass = useAnimationClass(
    `data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 transition-all duration-300 ease-out ${
      userPreferences.reduceTransparency ? 'bg-opacity-90' : 'bg-opacity-50'
    }`,
    'transition-none'
  );
  const contentAnimationClass = useAnimationClass(
    'transition-all duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
    'transition-none'
  );
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  
  // スクリーンリーダー用アナウンス管理
  const [announcement, setAnnouncement] = useState<string>('');
  const [ariaLive, setAriaLive] = useState<'polite' | 'assertive'>('polite');
  
  // アナウンス送信用関数
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAriaLive(priority);
    setAnnouncement(''); // 一旦クリア
    // 次のフレームでアナウンス（確実に音読されるようにするため）
    requestAnimationFrame(() => {
      setAnnouncement(message);
    });
  }, []);
  
  // Core Web Vitals 測定（強化版）
  const { measureModalLCP, measureFID, measureCLS, measureBundleSize } = useCoreWebVitals({
    enabled: process.env.NODE_ENV !== 'test',
    debug: process.env.NODE_ENV === 'development',
    realTimeMonitoring: true,
    onMetric: (name, value, id, context) => {
      // 本番環境では分析サービスに送信
      if (process.env.NODE_ENV === 'production') {
        // Google Analytics 4やその他の分析ツールに送信
        // gtag('event', 'core_web_vitals', { 
        //   metric_name: name, 
        //   metric_value: value, 
        //   metric_id: id,
        //   context: context 
        // });
      }
    }
  });
  
  // WCAG 2.1 AA準拠: 統一キーボードナビゲーション
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;
    
    const activeElement = document.activeElement as HTMLElement;
    const modal = modalContentRef.current;
    if (!modal) return;
    
    // フォーカス可能な要素を取得
    const focusableElements = modal.querySelectorAll(
      'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    ) as NodeListOf<HTMLElement>;
    
    const focusableArray = Array.from(focusableElements);
    const currentIndex = focusableArray.indexOf(activeElement);
    
    // 設計書: 統一されたショートカットキー体系
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      
      case 'Tab':
        // Radix UIが自動的にフォーカストラップを処理
        // タブ順序の確認とスキップロジック
        if (event.shiftKey && currentIndex === 0) {
          // 最初の要素から前に戻る場合は最後の要素に移動
          event.preventDefault();
          focusableArray[focusableArray.length - 1]?.focus();
        } else if (!event.shiftKey && currentIndex === focusableArray.length - 1) {
          // 最後の要素から次に進む場合は最初の要素に移動
          event.preventDefault();
          focusableArray[0]?.focus();
        }
        break;
      
      case 'ArrowDown':
      case 'ArrowRight':
        // 次のフォーカス可能要素に移動
        event.preventDefault();
        if (currentIndex < focusableArray.length - 1) {
          focusableArray[currentIndex + 1]?.focus();
        } else {
          focusableArray[0]?.focus(); // 循環ナビゲーション
        }
        break;
      
      case 'ArrowUp':
      case 'ArrowLeft':
        // 前のフォーカス可能要素に移動
        event.preventDefault();
        if (currentIndex > 0) {
          focusableArray[currentIndex - 1]?.focus();
        } else {
          focusableArray[focusableArray.length - 1]?.focus(); // 循環ナビゲーション
        }
        break;
      
      case 'Home':
        // 最初のフォーカス可能要素に移動
        event.preventDefault();
        focusableArray[0]?.focus();
        break;
      
      case 'End':
        // 最後のフォーカス可能要素に移動
        event.preventDefault();
        focusableArray[focusableArray.length - 1]?.focus();
        break;
      
      case 'Enter':
        // エンターキーでボタンやリンクをアクティベート
        if (activeElement && (activeElement.tagName === 'BUTTON' || activeElement.tagName === 'A')) {
          event.preventDefault();
          (activeElement as HTMLButtonElement | HTMLAnchorElement).click();
        }
        break;
      
      case ' ':
        // スペースキーでボタンをアクティベート（チェックボックス以外）
        if (activeElement && activeElement.tagName === 'BUTTON' && activeElement.getAttribute('type') !== 'checkbox') {
          event.preventDefault();
          (activeElement as HTMLButtonElement).click();
        }
        break;
        
      default:
        break;
    }
  }, [isOpen, onClose]);
  
  // WCAG 2.1 AA準拠: フォーカス管理の完全実装
  useEffect(() => {
    if (isOpen) {
      // モーダル開時: 現在のフォーカス要素を保存
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // スクリーンリーダー用アナウンス
      announceToScreenReader(
        `タスク詳細モーダルが開きました。タスク: ${task?.title || '不明'}。Escapeキーで閉じることができます。`,
        'assertive'
      );
      
      // キーボードイベントリスナーを追加
      document.addEventListener('keydown', handleKeyDown);
      
      // Core Web Vitals 測定開始
      if (modalContentRef.current) {
        measureModalLCP(modalContentRef.current);
        // CLS測定も開始
        const clsCleanup = measureCLS(modalContentRef.current);
        // Bundle Size測定（非同期）
        measureBundleSize('task-detail-modal');
        // クリーンアップをreturnで処理
        return () => {
          document.removeEventListener('keydown', handleKeyDown);
          clsCleanup?.();
        };
      }
      
      // 初回フォーカスをモーダル内の適切な要素に設定（優先順位あり）
      requestAnimationFrame(() => {
        if (modalContentRef.current) {
          // 1. スキップリンク（優先）
          const skipLink = modalContentRef.current.querySelector('[data-skip-link]') as HTMLElement;
          // 2. 閉じるボタン（重要な操作）
          const closeButton = modalContentRef.current.querySelector('[aria-label*="閉じる"], [data-close-button]') as HTMLElement;
          // 3. 最初のインタラクション可能な要素
          const firstFocusableElement = modalContentRef.current.querySelector(
            'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
          ) as HTMLElement;
          
          // フォーカス優先順位
          const focusTarget = skipLink || closeButton || firstFocusableElement;
          
          if (focusTarget) {
            focusTarget.focus();
            // アクセシビリティ: フォーカス要素をアナウンス
            const elementLabel = focusTarget.getAttribute('aria-label') || 
                                focusTarget.textContent || 
                                focusTarget.getAttribute('title') || 
                                'フォーカスされた要素';
            announceToScreenReader(`${elementLabel}にフォーカスが移動しました。`, 'polite');
          } else {
            // フォーカス可能要素がない場合は、モーダル自体にフォーカス
            modalContentRef.current.focus();
            announceToScreenReader('モーダル内にフォーカスしました。Tabキーで要素を移動できます。', 'polite');
          }
        }
      });
    } else {
      // キーボードイベントリスナーを削除
      document.removeEventListener('keydown', handleKeyDown);
      
      // スクリーンリーダー用アナウンス（モーダル閉時）
      if (previousFocusRef.current) {
        announceToScreenReader('タスク詳細モーダルが閉じられました。', 'polite');
      }
      
      // モーダル閉時: 前のフォーカス要素に復元
      if (previousFocusRef.current) {
        // DOM更新完了まで待機してフォーカス復元
        requestAnimationFrame(() => {
          if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
            previousFocusRef.current.focus();
          }
          previousFocusRef.current = null;
        });
      }
    }
    
    // クリーンアップ
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown, measureModalLCP, measureCLS, announceToScreenReader, task?.title]);
  
  if (!task) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* オーバーレイ - アクセシビリティ設定対応 */}
        <Dialog.Overlay 
          className={`fixed inset-0 z-40 ${overlayAnimationClass} ${
            userPreferences.highContrast 
              ? 'bg-black' 
              : userPreferences.reduceTransparency 
                ? 'bg-black/80' 
                : 'bg-black/50 backdrop-blur-sm'
          }`} 
        />
        
        {/* モーダルコンテンツ - レスポンシブ最適化 */}
        <Dialog.Content 
          ref={modalContentRef}
          className={`fixed z-50 focus:outline-none ${contentAnimationClass}
            /* アクセシビリティ設定対応 */
            ${userPreferences.highContrast 
              ? 'bg-white dark:bg-black border-4 border-black dark:border-white' 
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }
            ${userPreferences.largeText 
              ? 'text-lg' 
              : 'text-base'
            }
            ${userPreferences.reduceTransparency 
              ? 'shadow-2xl' 
              : 'shadow-lg backdrop-blur-sm'
            }
            /* モバイル: フルスクリーン表示 */
            max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none
            ${!prefersReducedMotion ? 'max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom' : ''}
            /* タブレット: 90vh サイズ最適化 */
            sm:max-lg:top-[5vh] sm:max-lg:left-1/2 sm:max-lg:transform sm:max-lg:-translate-x-1/2 sm:max-lg:w-[95vw] sm:max-lg:max-w-3xl sm:max-lg:h-[90vh] sm:max-lg:rounded-lg
            ${!prefersReducedMotion ? 'sm:max-lg:data-[state=closed]:zoom-out-95 sm:max-lg:data-[state=open]:zoom-in-95' : ''}
            /* デスクトップ: 4xl サイズ最適化 */
            lg:top-1/2 lg:left-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[90vw] lg:max-w-4xl lg:h-[85vh] lg:rounded-lg
            ${!prefersReducedMotion ? 'lg:data-[state=closed]:zoom-out-95 lg:data-[state=open]:zoom-in-95' : ''}
          `}
          aria-labelledby="task-detail-title"
          aria-describedby="task-detail-description"
          aria-modal="true"
          role="dialog"
          tabIndex={-1}
          aria-live="polite"
          aria-atomic="false"
          onInteractOutside={(e) => {
            // クリックアウトサイドでは閉じない（アクセシビリティ向上）
            e.preventDefault();
          }}
          onEscapeKeyDown={() => {
            // FID測定: Escapeキー応答時間
            const measureEnd = measureFID('escape-key');
            onClose();
            measureEnd?.();
          }}
        >
          {/* WCAG 2.1 AA準拠: 改善されたアクセシビリティ情報 */}
          <Dialog.Title id="task-detail-title" className="sr-only">
            タスク詳細モーダル: {task.title} 
            {task.status && ` - ステータス: ${getStatusLabel(task.status)}`}
            {task.priority && `, 優先度: ${getPriorityLabel(task.priority)}`}
            {task.dueDate && `, 期限: ${formatDateForAria(task.dueDate)}`}
          </Dialog.Title>
          <Dialog.Description id="task-detail-description" className="sr-only">
            {task.title}の詳細情報を表示するモーダルダイアログです。
            {task.description ? ` 説明: ${task.description.slice(0, 120)}${task.description.length > 120 ? '...' : ''}。` : ' 説明は設定されていません。'}
            {task.tags && task.tags.length > 0 ? ` タグ: ${task.tags.map(tag => tag.name).join(', ')}。` : ''}
            Escapeキーまたは閉じるボタンでモーダルを閉じることができます。
            Tabキーで要素間を移動し、Shift+Tabで逆方向に移動できます。
            編集機能が有効な場合は、各フィールドで直接編集が可能です。
          </Dialog.Description>

          {/* WCAG 2.1 AA準拠: スキップリンク */}
          <button
            data-skip-link
            className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:outline-none focus:ring-2 ${
              userPreferences.highContrast 
                ? 'focus:bg-black focus:text-white focus:ring-white focus:border-2 focus:border-white' 
                : 'focus:bg-blue-600 focus:text-white focus:ring-blue-400'
            } ${
              userPreferences.largeText 
                ? 'focus:text-lg focus:px-6 focus:py-3' 
                : 'focus:text-sm'
            }`}
            onClick={() => {
              const mainContent = modalContentRef.current?.querySelector('[data-main-content]') as HTMLElement;
              if (mainContent) {
                mainContent.focus();
                announceToScreenReader('メインコンテンツにジャンプしました。', 'polite');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
            aria-label="メインコンテンツにスキップ"
            tabIndex={0}
          >
            メインコンテンツにスキップ
          </button>

          {/* Suspenseでレイジーローディングをラップ */}
          <Suspense 
            fallback={
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex items-center justify-center">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-sm text-gray-500">タスク詳細を読み込んでいます...</p>
                </div>
              </div>
            }
          >
            <div data-main-content tabIndex={-1}>
              <LazyTaskDetailView
                task={task}
                editable={editable}
                onTaskUpdate={onTaskUpdate}
                onTaskDelete={onTaskDelete}
                onClose={onClose}
                availableTags={availableTags}
                onProjectClick={onProjectClick}
                enableA11y={false}
              />
            </div>
          </Suspense>
          
          {/* WCAG 2.1 AA準拠: モーダル操作の動的アナウンス */}
          <div
            role="status"
            aria-live={ariaLive}
            aria-atomic="true"
            className="sr-only"
            data-testid="modal-announcement-region"
            aria-label="タスク詳細モーダルの状態変更を通知する領域"
          >
            {announcement}
          </div>
          
          {/* 追加のlive region for assertive announcements */}
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="sr-only"
            data-testid="modal-alert-region"
            aria-label="重要な通知を即座に読み上げる領域"
          >
            {ariaLive === 'assertive' ? announcement : ''}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default TaskDetailModal;