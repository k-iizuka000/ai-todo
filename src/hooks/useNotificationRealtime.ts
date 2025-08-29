/**
 * Real-time通知用カスタムフック
 * Server-Sent Eventsを使用した通知のリアルタイム更新
 */

import { useEffect, useRef, useCallback } from 'react';
import { Notification } from '../types/notification';
import { useNotificationStore } from '../stores/notificationStore';

interface UseNotificationRealtimeOptions {
  userId: string;
  enabled?: boolean;
  onNotificationReceived?: (notification: Notification) => void;
  onConnectionStatusChange?: (isConnected: boolean) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
}

interface NotificationRealtimeState {
  isConnected: boolean;
  lastError: string | null;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * Real-time通知を管理するカスタムフック
 */
export const useNotificationRealtime = ({
  userId,
  enabled = true,
  onNotificationReceived,
  onConnectionStatusChange,
  autoReconnect = true,
  reconnectDelay = 5000
}: UseNotificationRealtimeOptions): NotificationRealtimeState => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  
  const {
    handleRealTimeUpdate,
    isConnected,
    setError: setStoreError,
    clearError
  } = useNotificationStore();

  // 接続状態の管理
  const updateConnectionStatus = useCallback((connected: boolean) => {
    useNotificationStore.setState({ isConnected: connected });
    onConnectionStatusChange?.(connected);
  }, [onConnectionStatusChange]);

  // エラーハンドリング
  const handleError = useCallback((error: string) => {
    console.error('Real-time通知エラー:', error);
    setStoreError(error);
  }, [setStoreError]);

  // 通知受信時の処理
  const handleNotification = useCallback((notification: Notification) => {
    // ストアの状態を更新
    handleRealTimeUpdate(notification);
    
    // コールバック実行
    onNotificationReceived?.(notification);
    
    // ブラウザ通知（権限がある場合）
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/notification-icon.png', // アプリのアイコン
        badge: '/badge-icon.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'high',
        data: {
          url: notification.actionUrl || '/notifications',
          notificationId: notification.id
        }
      });
    }
  }, [handleRealTimeUpdate, onNotificationReceived]);

  // 接続の確立
  const connect = useCallback(() => {
    if (!userId || !enabled || eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const url = `${baseUrl}/notifications/stream/${userId}`;
    
    try {
      const eventSource = new EventSource(url, {
        withCredentials: true // 認証が必要な場合
      });

      // 接続成功
      eventSource.onopen = () => {
        console.log('Real-time通知に接続しました');
        updateConnectionStatus(true);
        clearError();
        isReconnectingRef.current = false;
        
        // 再接続タイマーをクリア
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      // 通知受信
      eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          handleNotification(notification);
        } catch (error) {
          console.error('通知データの解析エラー:', error);
          handleError('通知データの解析に失敗しました');
        }
      };

      // カスタムイベント: 接続テスト
      eventSource.addEventListener('ping', (event) => {
        console.log('Ping受信:', event.data);
      });

      // カスタムイベント: 統計更新
      eventSource.addEventListener('stats', (event) => {
        try {
          const stats = JSON.parse(event.data);
          useNotificationStore.setState({ stats });
        } catch (error) {
          console.error('統計データの解析エラー:', error);
        }
      });

      // エラーまたは接続切断
      eventSource.onerror = () => {
        console.warn('Real-time通知の接続が切断されました');
        updateConnectionStatus(false);
        
        // 自動再接続
        if (autoReconnect && !isReconnectingRef.current) {
          isReconnectingRef.current = true;
          handleError('接続が切断されました。再接続します...');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (eventSourceRef.current?.readyState !== EventSource.OPEN) {
              disconnect();
              connect();
            }
          }, reconnectDelay);
        }
      };

      eventSourceRef.current = eventSource;
      
    } catch (error) {
      console.error('Real-time接続エラー:', error);
      handleError('Real-time接続に失敗しました');
    }
  }, [
    userId, 
    enabled, 
    updateConnectionStatus, 
    clearError, 
    handleNotification, 
    handleError, 
    autoReconnect, 
    reconnectDelay
  ]);

  // 接続の切断
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    updateConnectionStatus(false);
    isReconnectingRef.current = false;
  }, [updateConnectionStatus]);

  // 手動再接続
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);

  // エフェクト: 接続管理
  useEffect(() => {
    if (enabled && userId) {
      connect();
    } else {
      disconnect();
    }

    // クリーンアップ
    return () => {
      disconnect();
    };
  }, [userId, enabled, connect, disconnect]);

  // エフェクト: ページ非表示時の接続管理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // ページが非表示になった場合は接続を保持（バックグラウンド通知用）
        console.log('ページが非表示になりました（接続は保持）');
      } else {
        // ページが表示された場合は接続状態をチェック
        if (enabled && userId && eventSourceRef.current?.readyState !== EventSource.OPEN) {
          console.log('ページが表示されました（接続を再確立）');
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, userId, connect]);

  return {
    isConnected,
    lastError: useNotificationStore.getState().error,
    disconnect,
    reconnect
  };
};

/**
 * ブラウザ通知の許可を求めるユーティリティ
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('このブラウザは通知をサポートしていません');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('通知の許可が拒否されています');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('通知許可の取得エラー:', error);
    return false;
  }
};

/**
 * ブラウザ通知のテスト
 */
export const testBrowserNotification = () => {
  if (Notification.permission !== 'granted') {
    console.warn('通知の許可がありません');
    return;
  }

  new Notification('通知テスト', {
    body: 'ブラウザ通知が正常に動作しています',
    icon: '/notification-icon.png'
  });
};