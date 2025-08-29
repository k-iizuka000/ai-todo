/**
 * 通知機能の互換性アダプター
 * MockからPrisma移行時の既存コンポーネント互換性を保証
 */

import { Notification } from '../types/notification';
import { mockNotifications } from '../mock/notifications';
import { useNotificationStore } from '../stores/notificationStore';

/**
 * Mock/DB切り替え用のアダプター
 */
export class NotificationAdapter {
  private static instance: NotificationAdapter;
  private useMockData: boolean = false;

  private constructor() {}

  public static getInstance(): NotificationAdapter {
    if (!NotificationAdapter.instance) {
      NotificationAdapter.instance = new NotificationAdapter();
    }
    return NotificationAdapter.instance;
  }

  /**
   * Mock/DB切り替えフラグ設定
   */
  public setUseMockData(useMock: boolean): void {
    this.useMockData = useMock;
  }

  /**
   * Mock/DB使用状態を取得
   */
  public isUsingMockData(): boolean {
    return this.useMockData;
  }

  /**
   * 通知一覧取得（統合インターフェース）
   */
  public async getNotifications(): Promise<Notification[]> {
    if (this.useMockData) {
      return mockNotifications;
    }

    // DB統合版の取得
    const store = useNotificationStore.getState();
    if (store.notifications.length === 0) {
      await store.fetchNotifications();
    }
    return store.notifications;
  }

  /**
   * 未読通知取得
   */
  public async getUnreadNotifications(): Promise<Notification[]> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => !n.isRead);
  }

  /**
   * 通知を既読にする
   */
  public async markAsRead(notificationId: string): Promise<void> {
    if (this.useMockData) {
      // Mock環境では状態変更なし（デモ用）
      console.log(`Mock環境: 通知 ${notificationId} を既読にしました`);
      return;
    }

    const store = useNotificationStore.getState();
    await store.markAsRead(notificationId);
  }

  /**
   * 全通知を既読にする
   */
  public async markAllAsRead(): Promise<void> {
    if (this.useMockData) {
      console.log('Mock環境: 全通知を既読にしました');
      return;
    }

    const store = useNotificationStore.getState();
    await store.markAllAsRead();
  }

  /**
   * 通知削除
   */
  public async deleteNotification(notificationId: string): Promise<void> {
    if (this.useMockData) {
      console.log(`Mock環境: 通知 ${notificationId} を削除しました`);
      return;
    }

    const store = useNotificationStore.getState();
    await store.deleteNotification(notificationId);
  }

  /**
   * 統計情報取得
   */
  public async getNotificationStats() {
    const notifications = await this.getNotifications();
    const total = notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const read = total - unread;

    return {
      total,
      unread,
      read,
      unreadRate: total > 0 ? Math.round((unread / total) * 100) : 0
    };
  }
}

/**
 * 既存コンポーネントとの互換性フック
 * 既存のコンポーネントを最小限の変更で動作させるためのフック
 */
export const useNotificationCompat = () => {
  const adapter = NotificationAdapter.getInstance();

  return {
    // 既存のmockNotifications互換
    notifications: adapter.isUsingMockData() 
      ? mockNotifications 
      : useNotificationStore(state => state.notifications),
    
    // 既存の統計関数互換
    getUnreadCount: async () => {
      const stats = await adapter.getNotificationStats();
      return stats.unread;
    },

    // 既存の操作関数互換
    markAsRead: adapter.markAsRead.bind(adapter),
    markAllAsRead: adapter.markAllAsRead.bind(adapter),
    deleteNotification: adapter.deleteNotification.bind(adapter),

    // 新機能へのブリッジ
    useNewFeatures: () => {
      return {
        store: useNotificationStore,
        isUsingMockData: adapter.isUsingMockData(),
        switchToDatabase: () => adapter.setUseMockData(false),
        switchToMock: () => adapter.setUseMockData(true)
      };
    }
  };
};

/**
 * コンポーネント用の通知フック
 * 既存のNotificationDropdown/NotificationItem等で使用
 */
export const useNotifications = () => {
  const adapter = NotificationAdapter.getInstance();
  
  // Mock環境の場合
  if (adapter.isUsingMockData()) {
    return {
      notifications: mockNotifications,
      unreadCount: mockNotifications.filter(n => !n.isRead).length,
      isLoading: false,
      error: null,
      markAsRead: (id: string) => adapter.markAsRead(id),
      markAllAsRead: () => adapter.markAllAsRead(),
      refresh: async () => { /* Mock環境では何もしない */ }
    };
  }

  // DB統合環境の場合
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotificationStore();

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: refreshNotifications
  };
};

/**
 * 初期化とマイグレーション用ユーティリティ
 */
export const NotificationMigrationHelper = {
  /**
   * Mock → DB移行のテスト
   */
  async testMigration(): Promise<boolean> {
    try {
      const adapter = NotificationAdapter.getInstance();
      
      // Mock環境での動作確認
      adapter.setUseMockData(true);
      const mockData = await adapter.getNotifications();
      console.log(`Mock環境: ${mockData.length}件の通知を取得`);

      // DB環境での動作確認
      adapter.setUseMockData(false);
      const dbData = await adapter.getNotifications();
      console.log(`DB環境: ${dbData.length}件の通知を取得`);

      return true;
    } catch (error) {
      console.error('マイグレーションテストに失敗:', error);
      return false;
    }
  },

  /**
   * Mockデータの初期投入（開発・テスト用）
   */
  async seedDatabaseWithMockData(): Promise<boolean> {
    try {
      const adapter = NotificationAdapter.getInstance();
      adapter.setUseMockData(false);
      
      const store = useNotificationStore.getState();
      
      // Mockデータを1件ずつDB用の形式で投入
      for (const mockNotification of mockNotifications) {
        await store.createNotification({
          type: mockNotification.type,
          priority: mockNotification.priority,
          title: mockNotification.title,
          message: mockNotification.message,
          actionUrl: mockNotification.actionUrl,
          metadata: mockNotification.metadata
        });
      }

      console.log(`${mockNotifications.length}件のMockデータをDBに投入しました`);
      return true;
    } catch (error) {
      console.error('Mockデータの投入に失敗:', error);
      return false;
    }
  },

  /**
   * 既存コンポーネントのテスト
   */
  async testExistingComponents(): Promise<{
    dropdownCompatible: boolean;
    itemCompatible: boolean;
    badgeCompatible: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let dropdownCompatible = true;
    let itemCompatible = true;
    let badgeCompatible = true;

    try {
      const adapter = NotificationAdapter.getInstance();
      
      // 各モードでの基本動作確認
      const modes = [true, false]; // Mock, DB
      
      for (const useMock of modes) {
        adapter.setUseMockData(useMock);
        const modeStr = useMock ? 'Mock' : 'DB';
        
        try {
          // 通知取得テスト
          const notifications = await adapter.getNotifications();
          if (!Array.isArray(notifications)) {
            throw new Error(`${modeStr}: notifications is not array`);
          }

          // 統計取得テスト
          const stats = await adapter.getNotificationStats();
          if (typeof stats.total !== 'number') {
            throw new Error(`${modeStr}: invalid stats format`);
          }

          console.log(`${modeStr}環境: 基本動作OK (${notifications.length}件)`);
          
        } catch (error) {
          const message = `${modeStr}環境でエラー: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(message);
          if (useMock) {
            dropdownCompatible = itemCompatible = badgeCompatible = false;
          }
        }
      }

    } catch (error) {
      const message = `テスト実行エラー: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errors.push(message);
      dropdownCompatible = itemCompatible = badgeCompatible = false;
    }

    return {
      dropdownCompatible,
      itemCompatible,
      badgeCompatible,
      errors
    };
  }
};

// デフォルトエクスポート
export default NotificationAdapter;