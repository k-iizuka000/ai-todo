/**
 * Hybrid Schedule Store - DB + Zustand統合
 * MockからDBへの移行を考慮したスケジュールストア
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { customStorage } from '@/utils/customStorage';
import { useTaskStore } from './taskStore';
import { scheduleApi } from '@/api/schedules';
import {
  DailySchedule,
  ScheduleItem,
  ScheduleViewSettings,
  ScheduleConflict,
  ScheduleSuggestion,
  ScheduleStatistics,
  CreateScheduleItemRequest,
  ScheduleDragData,
  ExtendedScheduleDragData,
  UnscheduledTaskData,
  TimeSlot,
  ConflictResolution,
  BulkScheduleOperation,
  defaultScheduleViewSettings,
  scheduleItemColors
} from '@/types/schedule';

interface ScheduleCache {
  [dateKey: string]: {
    schedule: DailySchedule;
    statistics: ScheduleStatistics;
    conflicts: ScheduleConflict[];
    cachedAt: Date;
    expiresAt: Date;
  };
}

/**
 * ハイブリッドスケジュールストアの状態型定義
 */
interface HybridScheduleState {
  // === キャッシュ管理 ===
  cache: ScheduleCache;
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncAt: Date | null;
  
  // === UI状態 ===
  currentDate: Date;
  viewSettings: ScheduleViewSettings;
  selectedItemId: string | null;
  editingItemId: string | null;
  draggedItemId: string | null;
  loading: boolean;
  error: string | null;
  
  // === 派生状態（computed） ===
  getCurrentSchedule: () => DailySchedule | undefined;
  getScheduleForDate: (date: Date) => DailySchedule | undefined;
  getUnscheduledTasks: () => UnscheduledTaskData[];
  getConflictsForItem: (itemId: string) => ScheduleConflict[];
  getStatistics: (date: Date) => ScheduleStatistics | undefined;
  
  // === キャッシュ管理 ===
  isCacheValid: (date: Date) => boolean;
  invalidateCache: (date?: Date) => void;
  clearExpiredCache: () => void;
  
  // === API操作 ===
  // スケジュール取得
  fetchSchedule: (date: Date, forceRefresh?: boolean) => Promise<void>;
  fetchScheduleRange: (startDate: Date, endDate: Date, forceRefresh?: boolean) => Promise<void>;
  
  // アイテム操作
  createScheduleItem: (item: CreateScheduleItemRequest) => Promise<void>;
  updateScheduleItem: (id: string, updates: Partial<ScheduleItem>) => Promise<void>;
  deleteScheduleItem: (id: string) => Promise<void>;
  moveScheduleItem: (id: string, newTime: TimeSlot) => Promise<void>;
  
  // バルク操作
  bulkUpdateItems: (operations: BulkScheduleOperation[]) => Promise<void>;
  
  // ドラッグ&ドロップ
  startDrag: (itemId: string) => void;
  endDrag: () => void;
  handleDrop: (data: ScheduleDragData) => Promise<void>;
  
  // タスクからスケジュール作成
  createScheduleFromTask: (taskData: UnscheduledTaskData, timeSlot: TimeSlot) => Promise<void>;
  handleTaskDrop: (dragData: ExtendedScheduleDragData) => Promise<void>;
  syncTaskSchedule: (taskId: string, scheduleItemId: string) => Promise<void>;
  
  // コンフリクト管理
  detectConflicts: (date: Date) => Promise<void>;
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  
  // AI連携
  generateSuggestions: (taskId: string) => Promise<void>;
  applySuggestion: (suggestionId: string) => Promise<void>;
  
  // 同期・設定
  setCurrentDate: (date: Date) => void;
  setViewSettings: (settings: Partial<ScheduleViewSettings>) => void;
  syncWithExternalCalendar: (date: Date) => Promise<void>;
  
  // ユーティリティ
  reset: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// === ヘルパー関数 ===

const generateId = (): string => {
  return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const formatDate = (date: Date | string | unknown): string => {
  if (date instanceof Date && !isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  }
  
  console.warn('Invalid date value provided, falling back to current date:', date);
  return new Date().toISOString().split('T')[0];
};

const toSafeDate = (value: unknown): Date => {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  console.warn('Invalid date value provided, falling back to current date:', value);
  return new Date();
};

const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

const getTimeDifferenceInMinutes = (startTime: string, endTime: string): number => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
};

// キャッシュ有効期間（5分）
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * ハイブリッドスケジュールストア
 * DB APIとローカルキャッシュを統合
 */
export const useScheduleStoreHybrid = create<HybridScheduleState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        cache: {},
        isOnline: navigator.onLine,
        syncStatus: 'idle',
        lastSyncAt: null,
        currentDate: new Date(),
        viewSettings: defaultScheduleViewSettings,
        selectedItemId: null,
        editingItemId: null,
        draggedItemId: null,
        loading: false,
        error: null,
        
        // === 派生状態 ===
        getCurrentSchedule: () => {
          const { currentDate, cache } = get();
          const dateKey = formatDate(currentDate);
          return cache[dateKey]?.schedule;
        },
        
        getScheduleForDate: (date: Date) => {
          const { cache } = get();
          const dateKey = formatDate(date);
          return cache[dateKey]?.schedule;
        },
        
        getUnscheduledTasks: (): UnscheduledTaskData[] => {
          return useTaskStore.getState().getUnscheduledTasks();
        },
        
        getConflictsForItem: (itemId: string) => {
          const { currentDate, cache } = get();
          const dateKey = formatDate(currentDate);
          const conflicts = cache[dateKey]?.conflicts || [];
          return conflicts.filter(conflict => conflict.items.includes(itemId));
        },
        
        getStatistics: (date: Date) => {
          const { cache } = get();
          const dateKey = formatDate(date);
          return cache[dateKey]?.statistics;
        },
        
        // === キャッシュ管理 ===
        isCacheValid: (date: Date) => {
          const { cache } = get();
          const dateKey = formatDate(date);
          const cacheEntry = cache[dateKey];
          
          if (!cacheEntry) return false;
          
          return new Date() < cacheEntry.expiresAt;
        },
        
        invalidateCache: (date?: Date) => {
          const { cache } = get();
          
          if (date) {
            const dateKey = formatDate(date);
            const newCache = { ...cache };
            delete newCache[dateKey];
            set({ cache: newCache });
          } else {
            set({ cache: {} });
          }
        },
        
        clearExpiredCache: () => {
          const { cache } = get();
          const now = new Date();
          const newCache: ScheduleCache = {};
          
          Object.entries(cache).forEach(([dateKey, entry]) => {
            if (now < entry.expiresAt) {
              newCache[dateKey] = entry;
            }
          });
          
          set({ cache: newCache });
        },
        
        // === API操作 ===
        fetchSchedule: async (date: Date, forceRefresh = false) => {
          const { isCacheValid, cache } = get();
          const dateKey = formatDate(date);
          
          // キャッシュが有効で強制リフレッシュでない場合はスキップ
          if (!forceRefresh && isCacheValid(date)) {
            return;
          }
          
          set({ loading: true, error: null, syncStatus: 'syncing' });
          
          try {
            // TODO: ユーザーIDを適切に取得（認証システムから）
            const userId = 'current-user'; // 仮の値
            
            const response = await scheduleApi.getDailySchedule(userId, date);
            const statistics = await scheduleApi.getScheduleStatistics(userId, date);
            const conflicts = await scheduleApi.getScheduleConflicts(userId, date);
            
            const now = new Date();
            const newCache = {
              ...cache,
              [dateKey]: {
                schedule: response.schedule,
                statistics,
                conflicts,
                cachedAt: now,
                expiresAt: new Date(now.getTime() + CACHE_DURATION)
              }
            };
            
            set({ 
              cache: newCache, 
              loading: false, 
              syncStatus: 'idle',
              lastSyncAt: now 
            });
            
          } catch (error) {
            console.error('Failed to fetch schedule:', error);
            set({ 
              error: error instanceof Error ? error.message : 'スケジュール取得に失敗しました',
              loading: false,
              syncStatus: 'error'
            });
          }
        },
        
        // === ユーティリティ ===
        reset: () => {
          set({
            cache: {},
            currentDate: new Date(),
            viewSettings: defaultScheduleViewSettings,
            selectedItemId: null,
            editingItemId: null,
            draggedItemId: null,
            loading: false,
            error: null,
            syncStatus: 'idle',
            lastSyncAt: null
          });
        },
        
        clearError: () => {
          set({ error: null });
        },
        
        setLoading: (loading: boolean) => {
          set({ loading });
        },
        
        setError: (error: string | null) => {
          set({ error });
        }
      }),
      {
        name: 'schedule-storage-hybrid',
        storage: customStorage,
        partialize: (state) => ({
          viewSettings: state.viewSettings,
          currentDate: state.currentDate,
          // キャッシュは永続化しない（セッション毎にリフレッシュ）
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (typeof state.currentDate === 'string') {
              state.currentDate = toSafeDate(state.currentDate);
            }
            
            if (state.viewSettings?.date && typeof state.viewSettings.date === 'string') {
              state.viewSettings.date = toSafeDate(state.viewSettings.date);
            }
            
            // オンライン状態を初期化
            state.isOnline = navigator.onLine;
            state.syncStatus = 'idle';
          }
        }
      }
    ),
    {
      name: 'schedule-store-hybrid'
    }
  )
);

// オンライン状態の監視
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useScheduleStoreHybrid.setState({ isOnline: true });
  });
  
  window.addEventListener('offline', () => {
    useScheduleStoreHybrid.setState({ isOnline: false });
  });
}

// 定期的なキャッシュクリーンアップ
if (typeof window !== 'undefined') {
  setInterval(() => {
    useScheduleStoreHybrid.getState().clearExpiredCache();
  }, 60000); // 1分ごと
}

// カスタムフック：現在のスケジュールを取得
export const useCurrentScheduleHybrid = () => {
  return useScheduleStoreHybrid(state => state.getCurrentSchedule());
};

// カスタムフック：選択されたアイテムを取得
export const useSelectedScheduleItemHybrid = () => {
  return useScheduleStoreHybrid(state => {
    if (!state.selectedItemId) return null;
    
    const schedule = state.getCurrentSchedule();
    if (!schedule) return null;
    
    return schedule.scheduleItems.find(item => item.id === state.selectedItemId) || null;
  });
};

// カスタムフック：統計を取得
export const useScheduleStatisticsHybrid = (date?: Date) => {
  return useScheduleStoreHybrid(state => {
    const targetDate = date || state.currentDate;
    return state.getStatistics(targetDate);
  });
};

// カスタムフック：未スケジュールタスクを取得
export const useUnscheduledTasksHybrid = () => {
  return useScheduleStoreHybrid(state => state.getUnscheduledTasks());
};