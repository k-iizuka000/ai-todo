/**
 * 通知アクション管理用カスタムフック
 * 既読管理、一括操作、通知アクション実行
 */

import { useCallback, useState } from 'react';
import { Notification } from '../types/notification';
import { useNotificationStore } from '../stores/notificationStore';

interface NotificationActionState {
  isProcessing: boolean;
  selectedNotifications: Set<string>;
  lastAction: string | null;
  error: string | null;
}

interface BulkActionResult {
  success: boolean;
  processedCount: number;
  errors: string[];
}

/**
 * 通知アクション管理のカスタムフック
 */
export const useNotificationActions = () => {
  const [actionState, setActionState] = useState<NotificationActionState>({
    isProcessing: false,
    selectedNotifications: new Set(),
    lastAction: null,
    error: null
  });

  const {
    notifications,
    markAsRead,
    markAsUnread,
    markMultipleAsRead,
    markAllAsRead,
    deleteNotification,
    updateUnreadCount,
    setError: setStoreError
  } = useNotificationStore();

  // 選択状態管理
  const selectNotification = useCallback((id: string, selected: boolean) => {
    setActionState(prev => {
      const newSelected = new Set(prev.selectedNotifications);
      if (selected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return { ...prev, selectedNotifications: newSelected };
    });
  }, []);

  const selectAll = useCallback((filtered: Notification[] = notifications) => {
    setActionState(prev => ({
      ...prev,
      selectedNotifications: new Set(filtered.map(n => n.id))
    }));
  }, [notifications]);

  const clearSelection = useCallback(() => {
    setActionState(prev => ({
      ...prev,
      selectedNotifications: new Set()
    }));
  }, []);

  const toggleSelection = useCallback((id: string) => {
    const isSelected = actionState.selectedNotifications.has(id);
    selectNotification(id, !isSelected);
  }, [actionState.selectedNotifications, selectNotification]);

  // 一括既読操作
  const bulkMarkAsRead = useCallback(async (): Promise<BulkActionResult> => {
    const selectedIds = Array.from(actionState.selectedNotifications);
    if (selectedIds.length === 0) {
      return { success: false, processedCount: 0, errors: ['通知が選択されていません'] };
    }

    setActionState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      await markMultipleAsRead(selectedIds);
      
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        selectedNotifications: new Set(),
        lastAction: `${selectedIds.length}件の通知を既読にしました`
      }));

      return { success: true, processedCount: selectedIds.length, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '一括既読処理に失敗しました';
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
      return { success: false, processedCount: 0, errors: [errorMessage] };
    }
  }, [actionState.selectedNotifications, markMultipleAsRead]);

  // 一括未読操作
  const bulkMarkAsUnread = useCallback(async (): Promise<BulkActionResult> => {
    const selectedIds = Array.from(actionState.selectedNotifications);
    if (selectedIds.length === 0) {
      return { success: false, processedCount: 0, errors: ['通知が選択されていません'] };
    }

    setActionState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // 複数を未読にする処理（APIに応じて実装）
      await Promise.all(selectedIds.map(id => markAsUnread(id)));
      
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        selectedNotifications: new Set(),
        lastAction: `${selectedIds.length}件の通知を未読にしました`
      }));

      return { success: true, processedCount: selectedIds.length, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '一括未読処理に失敗しました';
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
      return { success: false, processedCount: 0, errors: [errorMessage] };
    }
  }, [actionState.selectedNotifications, markAsUnread]);

  // 一括削除操作
  const bulkDelete = useCallback(async (): Promise<BulkActionResult> => {
    const selectedIds = Array.from(actionState.selectedNotifications);
    if (selectedIds.length === 0) {
      return { success: false, processedCount: 0, errors: ['通知が選択されていません'] };
    }

    setActionState(prev => ({ ...prev, isProcessing: true, error: null }));

    const errors: string[] = [];
    let successCount = 0;

    try {
      // 削除処理を順次実行（並列実行だと負荷が高い場合）
      for (const id of selectedIds) {
        try {
          await deleteNotification(id);
          successCount++;
        } catch (error) {
          errors.push(`通知 ${id} の削除に失敗: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      }

      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        selectedNotifications: new Set(),
        lastAction: `${successCount}件の通知を削除しました${errors.length > 0 ? ` (${errors.length}件失敗)` : ''}`
      }));

      return { 
        success: errors.length === 0, 
        processedCount: successCount, 
        errors 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '一括削除処理に失敗しました';
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
      return { success: false, processedCount: 0, errors: [errorMessage] };
    }
  }, [actionState.selectedNotifications, deleteNotification]);

  // 全既読操作
  const markAllAsReadAction = useCallback(async (): Promise<BulkActionResult> => {
    setActionState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      await markAllAsRead();
      const unreadCount = notifications.filter(n => !n.isRead).length;
      
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        selectedNotifications: new Set(),
        lastAction: `全ての通知 (${unreadCount}件) を既読にしました`
      }));

      return { success: true, processedCount: unreadCount, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '全既読処理に失敗しました';
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));
      return { success: false, processedCount: 0, errors: [errorMessage] };
    }
  }, [markAllAsRead, notifications]);

  // 通知アクション実行（actionUrlへのナビゲーション）
  const executeNotificationAction = useCallback(async (notification: Notification) => {
    // 自動既読
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    // アクションURL実行
    if (notification.actionUrl) {
      // 内部リンクの場合はSPAナビゲーション
      if (notification.actionUrl.startsWith('/')) {
        window.history.pushState(null, '', notification.actionUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        // 外部リンクの場合は新しいタブで開く
        window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
      }
    }

    setActionState(prev => ({
      ...prev,
      lastAction: `通知「${notification.title}」のアクションを実行しました`
    }));
  }, [markAsRead]);

  // スマート操作（条件に基づく自動処理）
  const smartBulkActions = {
    // 古い既読通知を削除（7日以上前）
    deleteOldRead: useCallback(async (daysOld: number = 7): Promise<BulkActionResult> => {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      const oldReadNotifications = notifications.filter(n => 
        n.isRead && new Date(n.createdAt) < cutoffDate
      );

      if (oldReadNotifications.length === 0) {
        return { success: true, processedCount: 0, errors: ['削除対象の古い通知はありません'] };
      }

      setActionState(prev => ({ 
        ...prev, 
        selectedNotifications: new Set(oldReadNotifications.map(n => n.id))
      }));

      return await bulkDelete();
    }, [notifications, bulkDelete]),

    // 低優先度の既読通知を削除
    deleteLowPriorityRead: useCallback(async (): Promise<BulkActionResult> => {
      const lowPriorityRead = notifications.filter(n => 
        n.isRead && n.priority === 'low'
      );

      if (lowPriorityRead.length === 0) {
        return { success: true, processedCount: 0, errors: ['削除対象の低優先度通知はありません'] };
      }

      setActionState(prev => ({ 
        ...prev, 
        selectedNotifications: new Set(lowPriorityRead.map(n => n.id))
      }));

      return await bulkDelete();
    }, [notifications, bulkDelete]),

    // システム通知の一括既読
    markSystemNotificationsRead: useCallback(async (): Promise<BulkActionResult> => {
      const systemNotifications = notifications.filter(n => 
        n.type === 'system' && !n.isRead
      );

      if (systemNotifications.length === 0) {
        return { success: true, processedCount: 0, errors: ['未読のシステム通知はありません'] };
      }

      setActionState(prev => ({ 
        ...prev, 
        selectedNotifications: new Set(systemNotifications.map(n => n.id))
      }));

      return await bulkMarkAsRead();
    }, [notifications, bulkMarkAsRead])
  };

  // エラークリア
  const clearError = useCallback(() => {
    setActionState(prev => ({ ...prev, error: null }));
  }, []);

  // 最後のアクション結果クリア
  const clearLastAction = useCallback(() => {
    setActionState(prev => ({ ...prev, lastAction: null }));
  }, []);

  return {
    // 状態
    isProcessing: actionState.isProcessing,
    selectedNotifications: actionState.selectedNotifications,
    selectedCount: actionState.selectedNotifications.size,
    lastAction: actionState.lastAction,
    error: actionState.error,
    
    // 選択操作
    selectNotification,
    selectAll,
    clearSelection,
    toggleSelection,
    isSelected: (id: string) => actionState.selectedNotifications.has(id),
    
    // 個別操作
    executeNotificationAction,
    
    // 一括操作
    bulkMarkAsRead,
    bulkMarkAsUnread,
    bulkDelete,
    markAllAsReadAction,
    
    // スマート操作
    smartBulkActions,
    
    // ユーティリティ
    clearError,
    clearLastAction,
    
    // 便利なチェッカー
    hasSelection: actionState.selectedNotifications.size > 0,
    canBulkMarkRead: Array.from(actionState.selectedNotifications).some(id => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.isRead;
    }),
    canBulkMarkUnread: Array.from(actionState.selectedNotifications).some(id => {
      const notification = notifications.find(n => n.id === id);
      return notification && notification.isRead;
    })
  };
};