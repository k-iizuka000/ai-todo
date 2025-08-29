/**
 * スクリーンリーダー用のライブアナウンスメント機能
 * 
 * WCAG 2.1 AA準拠のアクセシビリティ機能：
 * - aria-live リージョンを使用した状態変更の通知
 * - 適切なタイミングでのメッセージ配信
 * - 重複メッセージの防止
 * - 優先度に応じたアナウンス種別の選択
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type AnnouncementPriority = 'polite' | 'assertive';

export interface AnnouncementOptions {
  priority?: AnnouncementPriority;
  clearDelay?: number;
  deduplicate?: boolean;
}

export interface UseAnnouncementsReturn {
  announce: (message: string, options?: AnnouncementOptions) => void;
  announcement: string;
  priority: AnnouncementPriority;
  clearAnnouncement: () => void;
}

/**
 * スクリーンリーダー用のアナウンスメント管理フック
 */
export const useAnnouncements = (): UseAnnouncementsReturn => {
  const [announcement, setAnnouncement] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('polite');
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageRef = useRef<string>('');
  const lastMessageTimeRef = useRef<number>(0);

  // アナウンスメントクリア
  const clearAnnouncement = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAnnouncement('');
  }, []);

  // メッセージをアナウンス
  const announce = useCallback((
    message: string,
    options: AnnouncementOptions = {}
  ) => {
    const {
      priority: messagePriority = 'polite',
      clearDelay = 3000,
      deduplicate = true
    } = options;

    // 空メッセージは無視
    if (!message.trim()) return;

    // 重複メッセージの処理
    if (deduplicate) {
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTimeRef.current;
      
      // 同じメッセージが短時間内（1秒以内）に送信された場合はスキップ
      if (lastMessageRef.current === message && timeSinceLastMessage < 1000) {
        return;
      }
      
      lastMessageRef.current = message;
      lastMessageTimeRef.current = now;
    }

    // 既存のタイマーをクリア
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 新しいメッセージを設定
    setPriority(messagePriority);
    setAnnouncement(message);

    // 指定時間後にクリア
    if (clearDelay > 0) {
      timeoutRef.current = setTimeout(() => {
        setAnnouncement('');
        timeoutRef.current = null;
      }, clearDelay);
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    announce,
    announcement,
    priority,
    clearAnnouncement
  };
};

/**
 * タスク関連の定型アナウンスメントを提供するフック
 */
export const useTaskAnnouncements = () => {
  const { announce, ...rest } = useAnnouncements();

  const announceTaskStatusChange = useCallback((
    taskTitle: string,
    oldStatus: string,
    newStatus: string
  ) => {
    const statusMap: Record<string, string> = {
      'todo': '未着手',
      'in_progress': '進行中',
      'done': '完了',
      'archived': 'アーカイブ済み'
    };

    const oldStatusLabel = statusMap[oldStatus] || oldStatus;
    const newStatusLabel = statusMap[newStatus] || newStatus;

    announce(
      `タスク「${taskTitle}」のステータスが${oldStatusLabel}から${newStatusLabel}に変更されました`,
      { priority: 'polite', clearDelay: 2000 }
    );
  }, [announce]);

  const announceTaskSaved = useCallback((taskTitle: string) => {
    announce(
      `タスク「${taskTitle}」が保存されました`,
      { priority: 'polite', clearDelay: 2000 }
    );
  }, [announce]);

  const announceTaskDeleted = useCallback((taskTitle: string) => {
    announce(
      `タスク「${taskTitle}」が削除されました`,
      { priority: 'assertive', clearDelay: 3000 }
    );
  }, [announce]);

  const announceNavigationChange = useCallback((
    direction: 'next' | 'prev',
    newTaskTitle: string
  ) => {
    const directionLabel = direction === 'next' ? '次' : '前';
    announce(
      `${directionLabel}のタスク「${newTaskTitle}」に移動しました`,
      { priority: 'polite', clearDelay: 2000 }
    );
  }, [announce]);

  const announceEditModeToggle = useCallback((
    isEditing: boolean,
    taskTitle: string
  ) => {
    const mode = isEditing ? '編集モード' : '表示モード';
    announce(
      `タスク「${taskTitle}」が${mode}に切り替わりました`,
      { priority: 'polite', clearDelay: 1500 }
    );
  }, [announce]);

  const announceTagUpdate = useCallback((
    taskTitle: string,
    action: 'added' | 'removed',
    tagName: string
  ) => {
    const actionLabel = action === 'added' ? '追加' : '削除';
    announce(
      `タスク「${taskTitle}」にタグ「${tagName}」が${actionLabel}されました`,
      { priority: 'polite', clearDelay: 2000 }
    );
  }, [announce]);

  const announceError = useCallback((message: string) => {
    announce(
      `エラー: ${message}`,
      { priority: 'assertive', clearDelay: 5000 }
    );
  }, [announce]);

  return {
    announce,
    announceTaskStatusChange,
    announceTaskSaved,
    announceTaskDeleted,
    announceNavigationChange,
    announceEditModeToggle,
    announceTagUpdate,
    announceError,
    ...rest
  };
};