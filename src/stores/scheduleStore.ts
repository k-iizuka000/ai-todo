/**
 * Zustandを使用した日時スケジュール管理のグローバル状態管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  DailySchedule,
  ScheduleItem,
  ScheduleViewSettings,
  ScheduleConflict,
  ScheduleSuggestion,
  ScheduleStatistics,
  CreateScheduleItemRequest,
  UpdateScheduleItemRequest,
  ScheduleDragData,
  TimeSlot,
  ConflictResolution,
  BulkScheduleOperation,
  defaultScheduleViewSettings,
  scheduleItemColors
} from '@/types/schedule';
import { Task, Priority } from '@/types/task';
import {
  mockSchedules,
  getScheduleForDate,
  createEmptySchedule,
  calculateStatistics,
  mockConflicts,
  mockSuggestions,
  unscheduledTasks
} from '@/mock/scheduleData';

// 未スケジュールタスクの型定義
interface UnscheduledTask {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  estimatedTime: number;
  tags: string[];
}

// スケジュールストアの状態型定義
interface ScheduleState {
  // === 状態 ===
  currentDate: Date;
  viewSettings: ScheduleViewSettings;
  dailySchedules: Map<string, DailySchedule>; // dateString -> schedule
  selectedItemId: string | null;
  editingItemId: string | null;
  draggedItemId: string | null;
  conflicts: ScheduleConflict[];
  suggestions: ScheduleSuggestion[];
  loading: boolean;
  error: string | null;
  
  // === 派生状態（computed） ===
  getCurrentSchedule: () => DailySchedule | undefined;
  getScheduleForDate: (date: Date) => DailySchedule | undefined;
  getUnscheduledTasks: () => UnscheduledTask[];
  getConflictsForItem: (itemId: string) => ScheduleConflict[];
  getStatistics: (date: Date) => ScheduleStatistics;
  
  // === アクション ===
  // 基本操作
  setCurrentDate: (date: Date) => void;
  setViewSettings: (settings: Partial<ScheduleViewSettings>) => void;
  
  // スケジュール取得
  fetchSchedule: (date: Date) => Promise<void>;
  fetchScheduleRange: (startDate: Date, endDate: Date) => Promise<void>;
  
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
  
  // コンフリクト管理
  detectConflicts: (date: Date) => void;
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  
  // AI連携
  generateSuggestions: (taskId: string) => Promise<void>;
  applySuggestion: (suggestionId: string) => Promise<void>;
  
  // 同期
  syncWithTasks: () => Promise<void>;
  subscribeToUpdates: (date: Date) => () => void;
  
  // ユーティリティ
  reset: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// IDジェネレーター
const generateId = (): string => {
  return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 日付文字列を生成
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 時間文字列をパース
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

// 時間の差を分単位で計算
const getTimeDifferenceInMinutes = (startTime: string, endTime: string): number => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  return (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
};

// Zustandストアの作成
export const useScheduleStore = create<ScheduleState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        currentDate: new Date(),
        viewSettings: defaultScheduleViewSettings,
        dailySchedules: new Map(),
        selectedItemId: null,
        editingItemId: null,
        draggedItemId: null,
        conflicts: [],
        suggestions: [],
        loading: false,
        error: null,
        
        // 派生状態
        getCurrentSchedule: () => {
          const { currentDate, dailySchedules } = get();
          const dateKey = formatDate(currentDate);
          return dailySchedules.get(dateKey);
        },
        
        getScheduleForDate: (date: Date) => {
          const { dailySchedules } = get();
          const dateKey = formatDate(date);
          return dailySchedules.get(dateKey);
        },
        
        getUnscheduledTasks: (): UnscheduledTask[] => {
          // mockデータから未スケジュールタスクを返す
          return unscheduledTasks as UnscheduledTask[];
        },
        
        getConflictsForItem: (itemId: string) => {
          return get().conflicts.filter(conflict => 
            conflict.items.includes(itemId)
          );
        },
        
        getStatistics: (date: Date) => {
          const schedule = get().getScheduleForDate(date);
          if (!schedule) {
            return {
              date,
              totalTasks: 0,
              completedTasks: 0,
              totalHours: 0,
              productiveHours: 0,
              breakHours: 0,
              utilizationRate: 0,
              completionRate: 0,
              overtimeHours: 0,
              focusTime: 0,
              meetingTime: 0
            };
          }
          return calculateStatistics(schedule);
        },
        
        // 基本操作
        setCurrentDate: (date: Date) => {
          set((state) => ({
            ...state,
            currentDate: new Date(date),
            viewSettings: {
              ...state.viewSettings,
              date: new Date(date)
            }
          }));
        },
        
        setViewSettings: (settings: Partial<ScheduleViewSettings>) => {
          set((state) => ({
            ...state,
            viewSettings: {
              ...state.viewSettings,
              ...settings
            }
          }));
        },
        
        // スケジュール取得
        fetchSchedule: async (date: Date) => {
          set((state) => ({
            ...state,
            loading: true,
            error: null
          }));
          
          try {
            // mockデータから取得をシミュレート
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const dateKey = formatDate(date);
            let schedule = getScheduleForDate(date);
            
            if (!schedule) {
              schedule = createEmptySchedule(date);
            }
            
            const newSchedules = new Map(get().dailySchedules);
            newSchedules.set(dateKey, schedule);
            
            set((state) => ({
              ...state,
              dailySchedules: newSchedules,
              loading: false
            }));
            
            // コンフリクト検出
            get().detectConflicts(date);
            
          } catch (error) {
            set((state) => ({
              ...state,
              error: error instanceof Error ? error.message : 'スケジュール取得に失敗しました',
              loading: false
            }));
          }
        },
        
        fetchScheduleRange: async (startDate: Date, endDate: Date) => {
          set((state) => ({
            ...state,
            loading: true,
            error: null
          }));
          
          try {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const newSchedules = new Map(get().dailySchedules);
            const currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
              const dateKey = formatDate(currentDate);
              let schedule = getScheduleForDate(currentDate);
              
              if (!schedule) {
                schedule = createEmptySchedule(currentDate);
              }
              
              newSchedules.set(dateKey, schedule);
              currentDate.setDate(currentDate.getDate() + 1);
            }
            
            set((state) => ({
              ...state,
              dailySchedules: newSchedules,
              loading: false
            }));
            
          } catch (error) {
            set((state) => ({
              ...state,
              error: error instanceof Error ? error.message : 'スケジュール範囲取得に失敗しました',
              loading: false
            }));
          }
        },
        
        // アイテム操作
        createScheduleItem: async (itemRequest: CreateScheduleItemRequest) => {
          try {
            const dateKey = formatDate(itemRequest.date);
            const duration = getTimeDifferenceInMinutes(itemRequest.startTime, itemRequest.endTime);
            
            const newItem: ScheduleItem = {
              id: generateId(),
              timeBlockId: `block-${dateKey}-${itemRequest.startTime.split(':')[0]}`,
              taskId: itemRequest.taskId,
              type: itemRequest.type,
              title: itemRequest.title,
              description: itemRequest.description,
              startTime: itemRequest.startTime,
              endTime: itemRequest.endTime,
              duration,
              color: scheduleItemColors[itemRequest.type],
              status: 'planned',
              priority: itemRequest.priority || 'medium',
              tags: itemRequest.tags || [],
              isLocked: itemRequest.isLocked || false,
              recurringPattern: itemRequest.recurringPattern,
              reminders: itemRequest.reminders || [],
              estimatedTime: duration,
              completionRate: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'current-user'
            };
            
            const currentSchedules = get().dailySchedules;
            const schedule = currentSchedules.get(dateKey);
            if (schedule) {
              const updatedSchedule = {
                ...schedule,
                scheduleItems: [...schedule.scheduleItems, newItem],
                updatedAt: new Date()
              };
              
              const newSchedules = new Map(currentSchedules);
              newSchedules.set(dateKey, updatedSchedule);
              
              set((state) => ({
                ...state,
                dailySchedules: newSchedules
              }));
            }
            
            // コンフリクト検出
            get().detectConflicts(itemRequest.date);
            
          } catch (error) {
            set((state) => ({
              ...state,
              error: error instanceof Error ? error.message : 'スケジュールアイテム作成に失敗しました'
            }));
          }
        },
        
        updateScheduleItem: async (id: string, updates: Partial<ScheduleItem>) => {
          try {
            const currentSchedules = new Map(get().dailySchedules);
            let updated = false;
            
            for (const [dateKey, schedule] of currentSchedules) {
              const itemIndex = schedule.scheduleItems.findIndex(item => item.id === id);
              if (itemIndex !== -1) {
                const item = { ...schedule.scheduleItems[itemIndex], ...updates };
                item.updatedAt = new Date();
                
                // 時間が変更された場合は継続時間を再計算
                if (updates.startTime || updates.endTime) {
                  item.duration = getTimeDifferenceInMinutes(item.startTime, item.endTime);
                }
                
                const updatedItems = [...schedule.scheduleItems];
                updatedItems[itemIndex] = item;
                
                const updatedSchedule = {
                  ...schedule,
                  scheduleItems: updatedItems,
                  updatedAt: new Date()
                };
                
                currentSchedules.set(dateKey, updatedSchedule);
                updated = true;
                break;
              }
            }
            
            if (updated) {
              set((state) => ({
                ...state,
                dailySchedules: currentSchedules
              }));
            }
            
          } catch (error) {
            set((state) => ({
              ...state,
              error: error instanceof Error ? error.message : 'スケジュールアイテム更新に失敗しました'
            }));
          }
        },
        
        deleteScheduleItem: async (id: string) => {
          try {
            const currentSchedules = new Map(get().dailySchedules);
            let updated = false;
            
            for (const [dateKey, schedule] of currentSchedules) {
              const itemIndex = schedule.scheduleItems.findIndex(item => item.id === id);
              if (itemIndex !== -1) {
                const updatedItems = schedule.scheduleItems.filter(item => item.id !== id);
                const updatedSchedule = {
                  ...schedule,
                  scheduleItems: updatedItems,
                  updatedAt: new Date()
                };
                
                currentSchedules.set(dateKey, updatedSchedule);
                updated = true;
                break;
              }
            }
            
            if (updated) {
              set((state) => ({
                ...state,
                dailySchedules: currentSchedules,
                selectedItemId: state.selectedItemId === id ? null : state.selectedItemId
              }));
            }
            
          } catch (error) {
            set((state) => ({
              ...state,
              error: error instanceof Error ? error.message : 'スケジュールアイテム削除に失敗しました'
            }));
          }
        },
        
        // ドラッグ&ドロップと追加機能
        moveScheduleItem: async (id: string, newTime: TimeSlot) => {
          const updates = {
            startTime: newTime.startTime,
            endTime: newTime.endTime
          };
          await get().updateScheduleItem(id, updates);
        },
        
        bulkUpdateItems: async (operations: BulkScheduleOperation[]) => {
          for (const operation of operations) {
            if (operation.action === 'update' && operation.data) {
              for (const itemId of operation.items) {
                await get().updateScheduleItem(itemId, operation.data);
              }
            }
          }
        },
        
        startDrag: (itemId: string) => {
          set((state) => ({ ...state, draggedItemId: itemId }));
        },
        
        endDrag: () => {
          set((state) => ({ ...state, draggedItemId: null }));
        },
        
        handleDrop: async (data: ScheduleDragData) => {
          try {
            if (data.dragType === 'move' && data.startTime && data.endTime) {
              await get().updateScheduleItem(data.itemId, {
                startTime: data.startTime,
                endTime: data.endTime,
                timeBlockId: data.targetBlockId || data.sourceBlockId
              });
            }
          } catch (error) {
            console.error('ドロップ処理エラー:', error);
            set((state) => ({
              ...state,
              error: 'ドラッグ&ドロップ処理に失敗しました'
            }));
          }
        },
        
        detectConflicts: (date: Date) => {
          const schedule = get().getScheduleForDate(date);
          if (!schedule) return;
          
          const conflicts: ScheduleConflict[] = [];
          const items = schedule.scheduleItems;
          
          // 重複チェック
          for (let i = 0; i < items.length; i++) {
            for (let j = i + 1; j < items.length; j++) {
              const item1 = items[i];
              const item2 = items[j];
              
              const start1 = parseTime(item1.startTime);
              const end1 = parseTime(item1.endTime);
              const start2 = parseTime(item2.startTime);
              const end2 = parseTime(item2.endTime);
              
              const time1Start = start1.hours * 60 + start1.minutes;
              const time1End = end1.hours * 60 + end1.minutes;
              const time2Start = start2.hours * 60 + start2.minutes;
              const time2End = end2.hours * 60 + end2.minutes;
              
              if (time1Start < time2End && time2Start < time1End) {
                conflicts.push({
                  id: `conflict-${item1.id}-${item2.id}`,
                  type: 'overlap',
                  items: [item1.id, item2.id],
                  message: `「${item1.title}」と「${item2.title}」の時間が重複しています`,
                  severity: 'medium'
                });
              }
            }
          }
          
          set((state) => ({ ...state, conflicts }));
        },
        
        resolveConflict: async (conflictId: string, resolution: ConflictResolution) => {
          if (resolution.type === 'move' && resolution.newTimeSlot) {
            await get().updateScheduleItem(resolution.targetItemId, {
              startTime: resolution.newTimeSlot.startTime,
              endTime: resolution.newTimeSlot.endTime
            });
          }
          
          // コンフリクトを解決済みとしてリストから削除
          set((state) => ({
            ...state,
            conflicts: state.conflicts.filter(c => c.id !== conflictId)
          }));
        },
        
        generateSuggestions: async (taskId: string) => {
          // AIによる提案のモック実装
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const suggestions = mockSuggestions.filter(s => s.taskId === taskId);
          set((state) => ({ ...state, suggestions }));
        },
        
        applySuggestion: async (suggestionId: string) => {
          const suggestion = get().suggestions.find(s => s.id === suggestionId);
          if (!suggestion || suggestion.suggestedSlots.length === 0) return;
          
          const slot = suggestion.suggestedSlots[0];
          const createRequest: CreateScheduleItemRequest = {
            date: slot.date,
            taskId: suggestion.taskId,
            type: 'task',
            title: `Task ${suggestion.taskId}`,
            startTime: slot.startTime,
            endTime: slot.endTime
          };
          
          await get().createScheduleItem(createRequest);
          
          // 提案を削除
          set((state) => ({
            ...state,
            suggestions: state.suggestions.filter(s => s.id !== suggestionId)
          }));
        },
        
        syncWithTasks: async () => {
          // タスクストアとの同期処理（簡易実装）
          console.log('Syncing with tasks...');
        },
        
        subscribeToUpdates: (date: Date) => {
          // リアルタイム更新の購読（簡易実装）
          console.log('Subscribing to updates for:', date);
          return () => {
            console.log('Unsubscribed from updates');
          };
        },
        
        // ユーティリティ
        reset: () => {
          set({
            currentDate: new Date(),
            viewSettings: defaultScheduleViewSettings,
            dailySchedules: new Map(),
            selectedItemId: null,
            editingItemId: null,
            draggedItemId: null,
            conflicts: [],
            suggestions: [],
            loading: false,
            error: null
          });
        },
        
        clearError: () => {
          set((state) => ({ ...state, error: null }));
        },
        
        setLoading: (loading: boolean) => {
          set((state) => ({ ...state, loading }));
        },
        
        setError: (error: string | null) => {
          set((state) => ({ ...state, error }));
        }
      }),
      {
        name: 'schedule-storage',
        partialize: (state) => ({
          viewSettings: state.viewSettings,
          currentDate: state.currentDate
        })
      }
    ),
    {
      name: 'schedule-store'
    }
  )
);

// カスタムフック：現在のスケジュールを取得
export const useCurrentSchedule = () => {
  return useScheduleStore(state => state.getCurrentSchedule());
};

// カスタムフック：選択されたアイテムを取得
export const useSelectedScheduleItem = () => {
  return useScheduleStore(state => {
    if (!state.selectedItemId) return null;
    
    const schedule = state.getCurrentSchedule();
    if (!schedule) return null;
    
    return schedule.scheduleItems.find(item => item.id === state.selectedItemId) || null;
  });
};

// カスタムフック：統計を取得
export const useScheduleStatistics = (date?: Date) => {
  return useScheduleStore(state => {
    const targetDate = date || state.currentDate;
    return state.getStatistics(targetDate);
  });
};

// カスタムフック：未スケジュールタスクを取得
export const useUnscheduledTasks = () => {
  return useScheduleStore(state => state.getUnscheduledTasks());
};