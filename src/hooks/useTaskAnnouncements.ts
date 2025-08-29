/**
 * タスクアナウンスメント管理フック
 * グループ3: アクセシビリティ対応（WCAG 2.1 AA）
 * スクリーンリーダー用のライブリージョン実装
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { TaskStatus, Priority } from '../types/task';

export type AnnouncementPriority = 'polite' | 'assertive';

export interface TaskAnnouncementOptions {
  priority?: AnnouncementPriority;
  delay?: number;
  enabled?: boolean;
}

/**
 * タスク関連のアナウンスメント管理フック
 */
export const useTaskAnnouncements = (
  options: TaskAnnouncementOptions = {}
) => {
  const { 
    priority = 'polite', 
    delay = 1000, 
    enabled = true 
  } = options;

  const [announcement, setAnnouncement] = useState<string>('');
  const [currentPriority, setCurrentPriority] = useState<AnnouncementPriority>(priority);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 基本的なアナウンス機能
  const announce = useCallback((
    message: string, 
    announcePriority: AnnouncementPriority = priority
  ) => {
    if (!enabled || !message.trim()) return;

    // 既存のタイムアウトをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setCurrentPriority(announcePriority);
    setAnnouncement(message);

    // 一定時間後にアナウンスをクリア
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('');
      setCurrentPriority(priority);
    }, delay);
  }, [enabled, priority, delay]);

  // タスクステータス変更のアナウンス
  const announceTaskStatusChange = useCallback((
    taskTitle: string, 
    oldStatus: TaskStatus, 
    newStatus: TaskStatus
  ) => {
    if (!enabled) return;

    const statusLabels = {
      todo: '未着手',
      in_progress: '進行中',
      done: '完了',
      archived: 'アーカイブ'
    };

    const oldLabel = statusLabels[oldStatus] || oldStatus;
    const newLabel = statusLabels[newStatus] || newStatus;
    
    announce(
      `タスク「${taskTitle}」のステータスが${oldLabel}から${newLabel}に変更されました`,
      'polite'
    );
  }, [enabled, announce]);

  // タスク保存完了のアナウンス
  const announceTaskSaved = useCallback((taskTitle: string) => {
    if (!enabled) return;
    
    announce(
      `タスク「${taskTitle}」が保存されました`,
      'polite'
    );
  }, [enabled, announce]);

  // タスク削除のアナウンス
  const announceTaskDeleted = useCallback((taskTitle: string) => {
    if (!enabled) return;
    
    announce(
      `タスク「${taskTitle}」が削除されました`,
      'assertive'
    );
  }, [enabled, announce]);

  // ナビゲーション変更のアナウンス
  const announceNavigationChange = useCallback((
    direction: 'prev' | 'next',
    currentTaskTitle?: string
  ) => {
    if (!enabled) return;

    const directionLabel = direction === 'prev' ? '前' : '次';
    const message = currentTaskTitle 
      ? `${directionLabel}のタスク「${currentTaskTitle}」に移動しました`
      : `${directionLabel}のタスクに移動しました`;
    
    announce(message, 'polite');
  }, [enabled, announce]);

  // 編集モード切り替えのアナウンス
  const announceEditModeToggle = useCallback((
    isEditing: boolean, 
    taskTitle: string
  ) => {
    if (!enabled) return;

    const modeLabel = isEditing ? '編集モード' : '表示モード';
    announce(
      `タスク「${taskTitle}」が${modeLabel}に切り替わりました`,
      'polite'
    );
  }, [enabled, announce]);

  // タグ更新のアナウンス
  const announceTagUpdate = useCallback((
    taskTitle: string, 
    action: 'added' | 'removed',
    tagName: string
  ) => {
    if (!enabled) return;

    const actionLabel = action === 'added' ? '追加' : '削除';
    announce(
      `タスク「${taskTitle}」にタグ「${tagName}」が${actionLabel}されました`,
      'polite'
    );
  }, [enabled, announce]);

  // エラーアナウンス
  const announceError = useCallback((errorMessage: string) => {
    if (!enabled) return;
    
    announce(
      `エラー: ${errorMessage}`,
      'assertive'
    );
  }, [enabled, announce]);

  // 成功メッセージのアナウンス
  const announceSuccess = useCallback((successMessage: string) => {
    if (!enabled) return;
    
    announce(successMessage, 'polite');
  }, [enabled, announce]);

  // 警告メッセージのアナウンス
  const announceWarning = useCallback((warningMessage: string) => {
    if (!enabled) return;
    
    announce(
      `警告: ${warningMessage}`,
      'assertive'
    );
  }, [enabled, announce]);

  // フォーカス変更のアナウンス
  const announceFocusChange = useCallback((elementDescription: string) => {
    if (!enabled) return;
    
    announce(
      `フォーカス: ${elementDescription}`,
      'polite'
    );
  }, [enabled, announce]);

  // キーボードショートカットヘルプのアナウンス
  const announceKeyboardShortcuts = useCallback(() => {
    if (!enabled) return;

    const shortcuts = [
      'Ctrl+S で保存',
      'Ctrl+E で編集切り替え', 
      'Escape で閉じる',
      '左右矢印キーで前後のタスクに移動'
    ].join('、');

    announce(
      `利用可能なキーボードショートカット: ${shortcuts}`,
      'polite'
    );
  }, [enabled, announce]);

  // 優先度変更のアナウンス
  const announcePriorityChange = useCallback((
    taskTitle: string, 
    oldPriority: Priority, 
    newPriority: Priority
  ) => {
    if (!enabled) return;

    const priorityLabels = {
      low: '低',
      medium: '中',
      high: '高',
      urgent: '緊急'
    };

    const oldLabel = priorityLabels[oldPriority] || oldPriority;
    const newLabel = priorityLabels[newPriority] || newPriority;
    
    announce(
      `タスク「${taskTitle}」の優先度が${oldLabel}から${newLabel}に変更されました`,
      'polite'
    );
  }, [enabled, announce]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    // 基本機能
    announce,
    announcement,
    priority: currentPriority,
    
    // タスク固有のアナウンス
    announceTaskStatusChange,
    announceTaskSaved,
    announceTaskDeleted,
    announceNavigationChange,
    announceEditModeToggle,
    announceTagUpdate,
    announcePriorityChange,
    
    // 汎用アナウンス
    announceError,
    announceSuccess,
    announceWarning,
    announceFocusChange,
    announceKeyboardShortcuts,
    
    // 設定
    enabled,
  };
};

export default useTaskAnnouncements;