/**
 * 通知機能のZustandストア実装
 * MockからPrisma DB統合への移行
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  Notification, 
  NotificationType, 
  NotificationPriority 
} from '../types/notification';
import { 
  notificationsApi,
  NotificationFilter,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationResponse,
  NotificationStatsResponse
} from '../api/notifications';

// 通知フィルター設定
interface NotificationFilterState {
  types: NotificationType[];
  priorities: NotificationPriority[];
  isRead?: boolean;
  startDate?: Date;
  endDate?: Date;
  searchQuery?: string;
}

// 通知ストア状態定義
interface NotificationState {
  // Core State
  notifications: Notification[];
  selectedNotificationId: string | null;
  filter: NotificationFilterState;
  isLoading: boolean;
  error: string | null;
  
  // Statistics
  stats: NotificationStatsResponse | null;
  unreadCount: number;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  
  // Real-time updates
  isConnected: boolean;
  lastUpdated: Date | null;
  
  // Actions - Data Management
  fetchNotifications: (filter?: NotificationFilter) => Promise<void>;
  createNotification: (data: CreateNotificationRequest) => Promise<void>;
  updateNotification: (id: string, data: UpdateNotificationRequest) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  
  // Actions - Read Management
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markMultipleAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Actions - Filtering & Search
  setFilter: (filter: Partial<NotificationFilterState>) => void;
  clearFilter: () => void;
  searchNotifications: (query: string) => void;
  
  // Actions - Selection
  selectNotification: (id: string | null) => void;
  
  // Actions - Statistics
  fetchStats: () => Promise<void>;
  updateUnreadCount: () => void;
  
  // Actions - Real-time
  connectRealtime: (userId: string) => void;
  disconnectRealtime: () => void;
  handleRealTimeUpdate: (notification: Notification) => void;
  
  // Getters
  getFilteredNotifications: () => Notification[];
  getUnreadNotifications: () => Notification[];
  getNotificationsByType: (type: NotificationType) => Notification[];
  getNotificationsByPriority: (priority: NotificationPriority) => Notification[];
  getRecentNotifications: (count?: number) => Notification[];
  getNotificationById: (id: string) => Notification | undefined;
  
  // Actions - Cleanup
  cleanupOldNotifications: (daysOld?: number) => Promise<void>;
  
  // Actions - State Management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// デフォルトフィルター設定
const defaultFilter: NotificationFilterState = {
  types: [],
  priorities: [],
  isRead: undefined,
  startDate: undefined,
  endDate: undefined,
  searchQuery: ''
};

// Real-time connection管理
let realtimeConnection: EventSource | null = null;

export const useNotificationStore = create<NotificationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        notifications: [],
        selectedNotificationId: null,
        filter: { ...defaultFilter },
        isLoading: false,
        error: null,
        stats: null,
        unreadCount: 0,
        currentPage: 1,
        totalPages: 1,
        hasMore: false,
        isConnected: false,
        lastUpdated: null,

        // Data Management Actions
        fetchNotifications: async (filter?: NotificationFilter) => {
          set({ isLoading: true, error: null });
          try {
            const response: NotificationResponse = await notificationsApi.getNotifications(filter);
            set({ 
              notifications: response.data.data,
              unreadCount: response.unreadCount || 0,
              hasMore: response.data.meta.hasNextPage,
              currentPage: response.data.meta.page,
              totalPages: response.data.meta.totalPages,
              lastUpdated: new Date(),
              isLoading: false
            });
            
            // 統計も更新
            get().fetchStats();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '通知の取得に失敗しました';
            set({ error: errorMessage, isLoading: false });
          }
        },

        createNotification: async (data: CreateNotificationRequest) => {
          set({ isLoading: true, error: null });
          try {
            const newNotification = await notificationsApi.createNotification(data);
            set(state => ({
              notifications: [newNotification, ...state.notifications],
              unreadCount: state.unreadCount + (newNotification.isRead ? 0 : 1),
              isLoading: false
            }));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '通知の作成に失敗しました';
            set({ error: errorMessage, isLoading: false });
          }
        },

        updateNotification: async (id: string, data: UpdateNotificationRequest) => {
          set({ error: null });
          try {
            const updatedNotification = await notificationsApi.updateNotification(id, data);
            set(state => {
              const notifications = state.notifications.map(notification =>
                notification.id === id ? updatedNotification : notification
              );
              return { 
                notifications,
                lastUpdated: new Date()
              };
            });
            
            // 既読状態が変更された場合は統計更新
            if (data.isRead !== undefined) {
              get().updateUnreadCount();
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '通知の更新に失敗しました';
            set({ error: errorMessage });
          }
        },

        deleteNotification: async (id: string) => {
          set({ error: null });
          try {
            await notificationsApi.deleteNotification(id);
            set(state => {
              const notifications = state.notifications.filter(notification => notification.id !== id);
              return { 
                notifications,
                selectedNotificationId: state.selectedNotificationId === id ? null : state.selectedNotificationId
              };
            });
            get().updateUnreadCount();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '通知の削除に失敗しました';
            set({ error: errorMessage });
          }
        },

        refreshNotifications: async () => {
          const state = get();
          const currentFilter = state.filter;
          const apiFilter: NotificationFilter = {
            type: currentFilter.types.length > 0 ? currentFilter.types : undefined,
            priority: currentFilter.priorities.length > 0 ? currentFilter.priorities : undefined,
            isRead: currentFilter.isRead,
            startDate: currentFilter.startDate?.toISOString(),
            endDate: currentFilter.endDate?.toISOString(),
          };
          await state.fetchNotifications(apiFilter);
        },

        // Read Management Actions
        markAsRead: async (id: string) => {
          await get().updateNotification(id, { isRead: true });
        },

        markAsUnread: async (id: string) => {
          await get().updateNotification(id, { isRead: false });
        },

        markMultipleAsRead: async (ids: string[]) => {
          set({ error: null });
          try {
            await notificationsApi.markMultipleAsRead(ids);
            set(state => {
              const notifications = state.notifications.map(notification =>
                ids.includes(notification.id) ? { ...notification, isRead: true } : notification
              );
              return { 
                notifications,
                lastUpdated: new Date()
              };
            });
            get().updateUnreadCount();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '一括既読処理に失敗しました';
            set({ error: errorMessage });
          }
        },

        markAllAsRead: async () => {
          set({ error: null });
          try {
            await notificationsApi.markAllAsRead();
            set(state => {
              const notifications = state.notifications.map(notification => ({ 
                ...notification, 
                isRead: true 
              }));
              return { 
                notifications,
                unreadCount: 0,
                lastUpdated: new Date()
              };
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '全既読処理に失敗しました';
            set({ error: errorMessage });
          }
        },

        // Filtering & Search Actions
        setFilter: (filter: Partial<NotificationFilterState>) => {
          set(state => ({ 
            filter: { ...state.filter, ...filter },
            currentPage: 1 // フィルター変更時はページリセット
          }));
        },

        clearFilter: () => {
          set({ filter: { ...defaultFilter }, currentPage: 1 });
        },

        searchNotifications: (query: string) => {
          set(state => ({ 
            filter: { ...state.filter, searchQuery: query },
            currentPage: 1
          }));
        },

        // Selection Actions
        selectNotification: (id: string | null) => {
          set({ selectedNotificationId: id });
          
          // 選択時に自動既読
          if (id) {
            const notification = get().getNotificationById(id);
            if (notification && !notification.isRead) {
              get().markAsRead(id);
            }
          }
        },

        // Statistics Actions
        fetchStats: async () => {
          try {
            const response = await notificationsApi.getStats();
            set({ stats: response });
          } catch (error) {
            console.error('統計取得エラー:', error);
          }
        },

        updateUnreadCount: () => {
          const unreadCount = get().notifications.filter(n => !n.isRead).length;
          set({ unreadCount });
        },

        // Real-time Actions
        connectRealtime: (userId: string) => {
          if (realtimeConnection) {
            get().disconnectRealtime();
          }

          const url = notificationsApi.getNotificationStreamUrl(userId);
          realtimeConnection = new EventSource(url);

          realtimeConnection.onopen = () => {
            set({ isConnected: true });
          };

          realtimeConnection.onmessage = (event) => {
            try {
              const notification: Notification = JSON.parse(event.data);
              get().handleRealTimeUpdate(notification);
            } catch (error) {
              console.error('Real-time通知の処理エラー:', error);
            }
          };

          realtimeConnection.onerror = () => {
            set({ isConnected: false });
            // 自動再接続（5秒後）
            setTimeout(() => {
              if (!get().isConnected) {
                get().connectRealtime(userId);
              }
            }, 5000);
          };
        },

        disconnectRealtime: () => {
          if (realtimeConnection) {
            realtimeConnection.close();
            realtimeConnection = null;
          }
          set({ isConnected: false });
        },

        handleRealTimeUpdate: (notification: Notification) => {
          set(state => {
            const existingIndex = state.notifications.findIndex(n => n.id === notification.id);
            let notifications: Notification[];
            
            if (existingIndex >= 0) {
              // 既存の通知を更新
              notifications = [...state.notifications];
              notifications[existingIndex] = notification;
            } else {
              // 新しい通知を追加（先頭に）
              notifications = [notification, ...state.notifications];
            }

            return {
              notifications,
              unreadCount: notifications.filter(n => !n.isRead).length,
              lastUpdated: new Date()
            };
          });
        },

        // Getters
        getFilteredNotifications: () => {
          const state = get();
          let filtered = [...state.notifications];

          // タイプフィルター
          if (state.filter.types.length > 0) {
            filtered = filtered.filter(n => state.filter.types.includes(n.type));
          }

          // 優先度フィルター
          if (state.filter.priorities.length > 0) {
            filtered = filtered.filter(n => state.filter.priorities.includes(n.priority));
          }

          // 既読/未読フィルター
          if (state.filter.isRead !== undefined) {
            filtered = filtered.filter(n => n.isRead === state.filter.isRead);
          }

          // 日付範囲フィルター
          if (state.filter.startDate) {
            filtered = filtered.filter(n => new Date(n.createdAt) >= state.filter.startDate!);
          }
          if (state.filter.endDate) {
            filtered = filtered.filter(n => new Date(n.createdAt) <= state.filter.endDate!);
          }

          // 検索クエリフィルター
          if (state.filter.searchQuery && state.filter.searchQuery.trim()) {
            const query = state.filter.searchQuery.toLowerCase();
            filtered = filtered.filter(n => 
              n.title.toLowerCase().includes(query) || 
              n.message.toLowerCase().includes(query)
            );
          }

          // 作成日時で降順ソート（新しいものが先）
          return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        },

        getUnreadNotifications: () => {
          return get().notifications.filter(n => !n.isRead);
        },

        getNotificationsByType: (type: NotificationType) => {
          return get().notifications.filter(n => n.type === type);
        },

        getNotificationsByPriority: (priority: NotificationPriority) => {
          return get().notifications.filter(n => n.priority === priority);
        },

        getRecentNotifications: (count: number = 10) => {
          return get().notifications
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, count);
        },

        getNotificationById: (id: string) => {
          return get().notifications.find(n => n.id === id);
        },

        // Cleanup Actions
        cleanupOldNotifications: async (daysOld: number = 7) => {
          set({ error: null });
          try {
            const result = await notificationsApi.cleanupOldNotifications(daysOld);
            // 削除された通知をローカル状態からも削除
            await get().refreshNotifications();
            console.log(`古い通知 ${result.deletedCount} 件を削除しました`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '古い通知の削除に失敗しました';
            set({ error: errorMessage });
          }
        },

        // State Management Actions
        setLoading: (isLoading: boolean) => {
          set({ isLoading });
        },

        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        }
      }),
      {
        name: 'notification-storage',
        // 永続化する状態を制限（sensitive dataは除外）
        partialize: (state) => ({
          filter: state.filter,
          selectedNotificationId: state.selectedNotificationId,
          // 通知データはサーバーから取得するため永続化しない
        }),
      }
    ),
    { name: 'NotificationStore' }
  )
);