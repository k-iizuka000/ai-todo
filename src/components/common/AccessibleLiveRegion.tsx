/**
 * アクセシブルライブリージョンコンポーネント
 * 設計書 グループ2: WCAG準拠アクセシビリティ対応
 * 
 * 目的: スクリーンリーダー対応のライブアナウンス機能
 * 特徴: ARIA Live Region、動的コンテンツの読み上げ
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

export type LiveRegionPriority = 'polite' | 'assertive' | 'off';

export interface AccessibleLiveRegionProps {
  /** アナウンスメッセージ */
  message?: string;
  /** ライブリージョンの優先度 */
  priority?: LiveRegionPriority;
  /** アナウンス後の自動クリア */
  clearAfter?: number;
  /** テスト用のdata-testid */
  'data-testid'?: string;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * スクリーンリーダー用ライブリージョン
 * 
 * WCAG 2.1 AA準拠:
 * - aria-live: 動的コンテンツの変更を通知
 * - aria-atomic: コンテンツ全体を読み上げ
 * - 視覚的に隠蔽（sr-only）
 */
export const AccessibleLiveRegion: React.FC<AccessibleLiveRegionProps> = ({
  message = '',
  priority = 'polite',
  clearAfter = 5000,
  'data-testid': testId,
  className = ''
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // メッセージ更新時の処理
  useEffect(() => {
    if (message && message !== currentMessage) {
      setCurrentMessage(message);

      // 自動クリア処理
      if (clearAfter > 0) {
        // 既存のタイマーをクリア
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // 新しいタイマーを設定
        timeoutRef.current = setTimeout(() => {
          setCurrentMessage('');
          timeoutRef.current = null;
        }, clearAfter);
      }
    }
  }, [message, currentMessage, clearAfter]);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      data-testid={testId}
    >
      {currentMessage}
    </div>
  );
};

/**
 * ライブリージョン管理用カスタムフック
 * 
 * 使用例:
 * ```tsx
 * const { announce, LiveRegion } = useLiveRegion();
 * 
 * const handleSave = () => {
 *   // タスク保存処理
 *   announce('タスクが保存されました');
 * };
 * 
 * return (
 *   <div>
 *     {content}
 *     <LiveRegion />
 *   </div>
 * );
 * ```
 */
export const useLiveRegion = (defaultPriority: LiveRegionPriority = 'polite') => {
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<LiveRegionPriority>(defaultPriority);

  // アナウンス実行
  const announce = useCallback((
    text: string, 
    announcePriority?: LiveRegionPriority
  ) => {
    if (announcePriority) {
      setPriority(announcePriority);
    }
    setMessage(text);
  }, []);

  // アナウンスクリア
  const clearAnnouncement = useCallback(() => {
    setMessage('');
  }, []);

  // ライブリージョンコンポーネント
  const LiveRegion = useCallback(
    (props: Omit<AccessibleLiveRegionProps, 'message' | 'priority'>) => (
      <AccessibleLiveRegion
        message={message}
        priority={priority}
        {...props}
      />
    ),
    [message, priority]
  );

  return {
    announce,
    clearAnnouncement,
    LiveRegion,
    currentMessage: message,
    currentPriority: priority
  };
};

/**
 * タスク詳細モーダル専用のライブリージョンフック
 * 
 * タスク操作に特化したアナウンス機能を提供
 */
export const useTaskDetailAnnouncements = () => {
  const { announce, LiveRegion } = useLiveRegion();

  // タスク保存アナウンス
  const announceTaskSaved = useCallback((taskTitle: string) => {
    announce(`タスク「${taskTitle}」が保存されました`, 'polite');
  }, [announce]);

  // タスク削除アナウンス
  const announceTaskDeleted = useCallback((taskTitle: string) => {
    announce(`タスク「${taskTitle}」が削除されました`, 'polite');
  }, [announce]);

  // ステータス変更アナウンス
  const announceStatusChange = useCallback((
    taskTitle: string, 
    oldStatus: string, 
    newStatus: string
  ) => {
    announce(
      `タスク「${taskTitle}」のステータスが${oldStatus}から${newStatus}に変更されました`,
      'polite'
    );
  }, [announce]);

  // エラーアナウンス
  const announceError = useCallback((errorMessage: string) => {
    announce(`エラー: ${errorMessage}`, 'assertive');
  }, [announce]);

  // モーダル開閉アナウンス
  const announceModalOpen = useCallback((taskTitle: string) => {
    announce(`タスク詳細モーダルが開きました: ${taskTitle}`, 'polite');
  }, [announce]);

  const announceModalClose = useCallback(() => {
    announce('タスク詳細モーダルが閉じられました', 'polite');
  }, [announce]);

  return {
    announceTaskSaved,
    announceTaskDeleted,
    announceStatusChange,
    announceError,
    announceModalOpen,
    announceModalClose,
    LiveRegion
  };
};

export default AccessibleLiveRegion;