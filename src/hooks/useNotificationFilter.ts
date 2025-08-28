/**
 * 通知フィルタリング用カスタムフック
 * 高度なフィルタリング機能とプリセット管理
 */

import { useMemo, useCallback } from 'react';
import { 
  Notification, 
  NotificationType, 
  NotificationPriority 
} from '../types/notification';
import { useNotificationStore } from '../stores/notificationStore';

// フィルタープリセット定義
export interface NotificationFilterPreset {
  id: string;
  name: string;
  description: string;
  filter: {
    types?: NotificationType[];
    priorities?: NotificationPriority[];
    isRead?: boolean;
    dateRange?: 'today' | 'week' | 'month' | 'all';
    searchQuery?: string;
  };
}

// プリセット定義
export const NOTIFICATION_FILTER_PRESETS: NotificationFilterPreset[] = [
  {
    id: 'unread',
    name: '未読のみ',
    description: '未読の通知のみを表示',
    filter: { isRead: false }
  },
  {
    id: 'high_priority',
    name: '高優先度',
    description: '高優先度・重要な通知のみ',
    filter: { priorities: ['high'] }
  },
  {
    id: 'task_related',
    name: 'タスク関連',
    description: 'タスクに関する通知のみ',
    filter: { 
      types: ['task_deadline', 'task_assigned', 'task_completed'] 
    }
  },
  {
    id: 'mentions',
    name: 'メンション',
    description: 'メンション・コメント通知',
    filter: { types: ['mention'] }
  },
  {
    id: 'system',
    name: 'システム通知',
    description: 'システム・プロジェクト更新',
    filter: { types: ['system', 'project_update'] }
  },
  {
    id: 'today',
    name: '今日の通知',
    description: '今日受信した通知',
    filter: { dateRange: 'today' }
  },
  {
    id: 'urgent',
    name: '緊急・重要',
    description: '緊急度の高い通知（期限切れ等）',
    filter: {
      types: ['task_deadline'],
      priorities: ['high'],
      isRead: false
    }
  }
];

// 日付範囲の計算
const getDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case 'today':
      return {
        startDate: startOfDay,
        endDate: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    case 'week':
      const weekAgo = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo, endDate: now };
    case 'month':
      const monthAgo = new Date(startOfDay.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo, endDate: now };
    default:
      return {};
  }
};

// カスタムフック
export const useNotificationFilter = () => {
  const {
    notifications,
    filter,
    setFilter,
    clearFilter,
    searchNotifications
  } = useNotificationStore();

  // フィルター適用後の通知を計算
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    // タイプフィルター
    if (filter.types.length > 0) {
      result = result.filter(n => filter.types.includes(n.type));
    }

    // 優先度フィルター
    if (filter.priorities.length > 0) {
      result = result.filter(n => filter.priorities.includes(n.priority));
    }

    // 既読/未読フィルター
    if (filter.isRead !== undefined) {
      result = result.filter(n => n.isRead === filter.isRead);
    }

    // 日付範囲フィルター
    if (filter.startDate) {
      result = result.filter(n => new Date(n.createdAt) >= filter.startDate!);
    }
    if (filter.endDate) {
      result = result.filter(n => new Date(n.createdAt) <= filter.endDate!);
    }

    // 検索クエリフィルター
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(query) || 
        n.message.toLowerCase().includes(query)
      );
    }

    // 作成日時で降順ソート（新しいものが先）
    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications, filter]);

  // フィルター統計情報
  const filterStats = useMemo(() => {
    const total = notifications.length;
    const filtered = filteredNotifications.length;
    const unread = filteredNotifications.filter(n => !n.isRead).length;
    const byType = filteredNotifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);
    const byPriority = filteredNotifications.reduce((acc, n) => {
      acc[n.priority] = (acc[n.priority] || 0) + 1;
      return acc;
    }, {} as Record<NotificationPriority, number>);

    return {
      total,
      filtered,
      unread,
      hidden: total - filtered,
      byType,
      byPriority
    };
  }, [notifications, filteredNotifications]);

  // プリセット適用
  const applyPreset = useCallback((presetId: string) => {
    const preset = NOTIFICATION_FILTER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const newFilter: any = {};

    if (preset.filter.types) {
      newFilter.types = preset.filter.types;
    }
    if (preset.filter.priorities) {
      newFilter.priorities = preset.filter.priorities;
    }
    if (preset.filter.isRead !== undefined) {
      newFilter.isRead = preset.filter.isRead;
    }
    if (preset.filter.dateRange) {
      const dateRange = getDateRange(preset.filter.dateRange);
      newFilter.startDate = dateRange.startDate;
      newFilter.endDate = dateRange.endDate;
    }
    if (preset.filter.searchQuery) {
      newFilter.searchQuery = preset.filter.searchQuery;
    }

    setFilter(newFilter);
  }, [setFilter]);

  // 個別フィルター操作
  const toggleType = useCallback((type: NotificationType) => {
    const currentTypes = filter.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    setFilter({ types: newTypes });
  }, [filter.types, setFilter]);

  const togglePriority = useCallback((priority: NotificationPriority) => {
    const currentPriorities = filter.priorities || [];
    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter(p => p !== priority)
      : [...currentPriorities, priority];
    setFilter({ priorities: newPriorities });
  }, [filter.priorities, setFilter]);

  const setReadFilter = useCallback((isRead: boolean | undefined) => {
    setFilter({ isRead });
  }, [setFilter]);

  const setDateRangeFilter = useCallback((range: 'today' | 'week' | 'month' | 'all') => {
    const dateRange = getDateRange(range);
    setFilter(dateRange);
  }, [setFilter]);

  const setCustomDateRange = useCallback((startDate: Date | undefined, endDate: Date | undefined) => {
    setFilter({ startDate, endDate });
  }, [setFilter]);

  // 検索機能
  const search = useCallback((query: string) => {
    searchNotifications(query);
  }, [searchNotifications]);

  // アクティブフィルターの確認
  const hasActiveFilters = useMemo(() => {
    return filter.types.length > 0 ||
           filter.priorities.length > 0 ||
           filter.isRead !== undefined ||
           filter.startDate !== undefined ||
           filter.endDate !== undefined ||
           (filter.searchQuery && filter.searchQuery.trim().length > 0);
  }, [filter]);

  // 現在のプリセットを特定
  const currentPreset = useMemo(() => {
    return NOTIFICATION_FILTER_PRESETS.find(preset => {
      const f = filter;
      const pf = preset.filter;

      // 各フィルター項目の比較
      const typesMatch = JSON.stringify(f.types?.sort()) === JSON.stringify(pf.types?.sort());
      const prioritiesMatch = JSON.stringify(f.priorities?.sort()) === JSON.stringify(pf.priorities?.sort());
      const readMatch = f.isRead === pf.isRead;

      return typesMatch && prioritiesMatch && readMatch;
    });
  }, [filter]);

  return {
    // データ
    filteredNotifications,
    notifications,
    filter,
    filterStats,
    presets: NOTIFICATION_FILTER_PRESETS,
    currentPreset,
    hasActiveFilters,

    // フィルター操作
    applyPreset,
    setFilter,
    clearFilter,
    
    // 個別操作
    toggleType,
    togglePriority,
    setReadFilter,
    setDateRangeFilter,
    setCustomDateRange,
    search,

    // 便利メソッド
    showUnreadOnly: () => setReadFilter(false),
    showReadOnly: () => setReadFilter(true),
    showAll: () => setReadFilter(undefined),
    showToday: () => setDateRangeFilter('today'),
    showThisWeek: () => setDateRangeFilter('week'),
    showThisMonth: () => setDateRangeFilter('month'),
    clearSearch: () => search(''),
    
    // 高度なフィルター
    getHighPriorityUnread: () => {
      return notifications.filter(n => 
        n.priority === 'high' && !n.isRead
      );
    },
    
    getOverdueNotifications: () => {
      return notifications.filter(n => 
        n.type === 'task_deadline' && 
        n.metadata && 
        'overdue' in n.metadata && 
        n.metadata.overdue === true
      );
    },
    
    getRecentMentions: (hours: number = 24) => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      return notifications.filter(n => 
        n.type === 'mention' && 
        new Date(n.createdAt) >= since
      );
    }
  };
};