/**
 * API接続状態管理
 * Zustandパターンを使用してAPI接続の状態を管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// 接続状態の型定義
export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

// 接続状態の詳細情報
export interface ConnectionState {
  status: ConnectionStatus;
  lastError?: Error;
  retryCount: number;
  lastSuccessTime?: Date;
  isHealthy: boolean;
}

// 接続状態管理ストア
interface ConnectionStore extends ConnectionState {
  // アクション
  setConnected: () => void;
  setReconnecting: (retryCount: number) => void;
  setOffline: (error?: Error) => void;
  resetRetryCount: () => void;
  incrementRetryCount: () => void;
  updateLastSuccess: () => void;
  
  // イベント通知機構
  listeners: Set<(state: ConnectionState) => void>;
  subscribe: (callback: (state: ConnectionState) => void) => () => void;
  notifyListeners: () => void;
}

// Zustand store の作成
export const useConnectionStore = create<ConnectionStore>()(
  devtools(
    (set, get) => ({
      // 初期状態
      status: 'offline',
      lastError: undefined,
      retryCount: 0,
      lastSuccessTime: undefined,
      isHealthy: false,
      listeners: new Set(),

      // 接続成功状態に設定
      setConnected: () => {
        set((state) => ({
          status: 'connected',
          retryCount: 0,
          lastError: undefined,
          isHealthy: true,
          lastSuccessTime: new Date()
        }), false, 'setConnected');
        get().notifyListeners();
      },

      // 再接続中状態に設定
      setReconnecting: (retryCount: number) => {
        set((state) => ({
          status: 'reconnecting',
          retryCount,
          isHealthy: false
        }), false, 'setReconnecting');
        get().notifyListeners();
      },

      // オフライン状態に設定
      setOffline: (error?: Error) => {
        set((state) => ({
          status: 'offline',
          lastError: error,
          isHealthy: false
        }), false, 'setOffline');
        get().notifyListeners();
      },

      // リトライ回数をリセット
      resetRetryCount: () => {
        set((state) => ({ retryCount: 0 }), false, 'resetRetryCount');
      },

      // リトライ回数を増加
      incrementRetryCount: () => {
        set((state) => ({ retryCount: state.retryCount + 1 }), false, 'incrementRetryCount');
      },

      // 最終成功時刻を更新
      updateLastSuccess: () => {
        set((state) => ({ lastSuccessTime: new Date() }), false, 'updateLastSuccess');
      },

      // イベント通知の登録
      subscribe: (callback: (state: ConnectionState) => void) => {
        const { listeners } = get();
        listeners.add(callback);
        
        // 登録解除関数を返す
        return () => {
          listeners.delete(callback);
        };
      },

      // 全リスナーに状態変化を通知
      notifyListeners: () => {
        const state = get();
        const connectionState: ConnectionState = {
          status: state.status,
          lastError: state.lastError,
          retryCount: state.retryCount,
          lastSuccessTime: state.lastSuccessTime,
          isHealthy: state.isHealthy
        };
        
        state.listeners.forEach(callback => {
          try {
            callback(connectionState);
          } catch (error) {
            console.error('Connection state listener error:', error);
          }
        });
      }
    }),
    { name: 'connection-store' }
  )
);

// 便利なフック
export const useConnectionStatus = () => {
  return useConnectionStore((state) => state.status);
};

export const useIsConnected = () => {
  return useConnectionStore((state) => state.status === 'connected');
};

export const useIsHealthy = () => {
  return useConnectionStore((state) => state.isHealthy);
};

export const useConnectionError = () => {
  return useConnectionStore((state) => state.lastError);
};

// 接続状態監視のユーティリティ
export const createConnectionMonitor = () => {
  const store = useConnectionStore.getState();
  
  return {
    // 接続状態の監視開始
    startMonitoring: (callback: (state: ConnectionState) => void) => {
      return store.subscribe(callback);
    },
    
    // 現在の接続状態を取得
    getCurrentState: (): ConnectionState => {
      const state = store;
      return {
        status: state.status,
        lastError: state.lastError,
        retryCount: state.retryCount,
        lastSuccessTime: state.lastSuccessTime,
        isHealthy: state.isHealthy
      };
    },
    
    // 手動で状態を更新
    updateStatus: (status: ConnectionStatus, error?: Error) => {
      switch (status) {
        case 'connected':
          store.setConnected();
          break;
        case 'reconnecting':
          store.setReconnecting(store.retryCount);
          break;
        case 'offline':
          store.setOffline(error);
          break;
      }
    }
  };
};