/**
 * Zustandを使用した日時スケジュール管理のグローバル状態管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { customStorage } from '@/utils/customStorage';
import { useTaskStore } from './taskStore';
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
import {
  getScheduleForDate,
  createEmptySchedule,
  calculateStatistics,
  mockSuggestions
} from '@/mock/scheduleData';


/**
 * スケジュールストアの状態型定義
 * Zustandストアで管理される日時スケジュール関連の全状態とアクションを定義
 * 
 * @interface ScheduleState
 */
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
  getUnscheduledTasks: () => UnscheduledTaskData[];
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
  
  // タスクからスケジュール作成
  createScheduleFromTask: (taskData: UnscheduledTaskData, timeSlot: TimeSlot) => Promise<void>;
  handleTaskDrop: (dragData: ExtendedScheduleDragData) => Promise<void>;
  syncTaskSchedule: (taskId: string, scheduleItemId: string) => Promise<void>;
  
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

/**
 * スケジュールアイテム用の一意IDを生成する関数
 * タイムスタンプとランダム文字列を組み合わせて衝突を回避
 * 
 * @returns スケジュール項目の一意識別子（例: "schedule-1640995200000-abc123def"）
 */
const generateId = (): string => {
  return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// === 型ガードとユーティリティ関数 ===

/**
 * Date型かどうかを判定する型ガード関数
 * @param value - 判定対象の値
 * @returns Date型の場合true、それ以外はfalse
 */
const isDate = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};


/**
 * Date型または日付文字列かどうかを判定する型ガード関数
 * @param value - 判定対象の値
 * @returns Date型または有効な日付文字列の場合true、それ以外はfalse
 * @note 現在未使用だが、将来のデータ検証で使用予定
 */
// const isDateLike = (value: unknown): value is Date | string => {
//   return isDate(value) || isValidDateString(value);
// };

/**
 * 値を安全にDate型に変換するユーティリティ関数
 * @param value - 変換対象の値
 * @returns 変換されたDateオブジェクト、変換できない場合は現在時刻
 */
const toSafeDate = (value: unknown): Date => {
  if (isDate(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // フォールバック: 現在時刻を返す
  console.warn('Invalid date value provided, falling back to current date:', value);
  return new Date();
};

/**
 * 日付オブジェクトを安全にフォーマットする関数
 * Date型以外の入力に対しても防御的に処理し、型ガードを使用する
 * 
 * @param date - Date型、日付文字列、またはその他の型の値
 * @returns YYYY-MM-DD形式の日付文字列
 * @throws なし（エラー時は現在日時を使用してフォールバック）
 * 
 * @example
 * ```typescript
 * formatDate(new Date()); // "2023-12-25"
 * formatDate("2023-12-25"); // "2023-12-25"
 * formatDate(null); // 現在日時の日付文字列（警告ログ出力）
 * ```
 */
const formatDate = (date: Date | string | unknown): string => {
  // 型ガードを使用した安全な変換
  const safeDate = toSafeDate(date);
  
  // 型ガードで検証済みなので、安全にtoISOStringを呼び出し可能
  return safeDate.toISOString().split('T')[0];
};

/**
 * 時間文字列を時間と分に分解してパースする関数
 * 
 * @param timeStr - "HH:MM"形式の時間文字列（例: "14:30"）
 * @returns 時間と分を含むオブジェクト
 * @throws 無効な形式の場合、NaNが含まれる可能性があります
 */
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

/**
 * 2つの時間文字列の差を分単位で計算する関数
 * 
 * @param startTime - 開始時間の文字列（"HH:MM"形式）
 * @param endTime - 終了時間の文字列（"HH:MM"形式）
 * @returns 時間差（分単位）。負の値になる場合もある
 * @example
 * ```typescript
 * getTimeDifferenceInMinutes("09:00", "10:30"); // 90（分）
 * getTimeDifferenceInMinutes("14:30", "16:15"); // 105（分）
 * ```
 */
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
        
        getUnscheduledTasks: (): UnscheduledTaskData[] => {
          // タスクストアから未スケジュールタスクを取得
          return useTaskStore.getState().getUnscheduledTasks();
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
        
        createScheduleFromTask: async (taskData: UnscheduledTaskData, timeSlot: TimeSlot) => {
          try {
            const createRequest: CreateScheduleItemRequest = {
              date: timeSlot.date,
              taskId: taskData.id,
              type: taskData.type as 'task' | 'subtask',
              title: taskData.title,
              description: taskData.description,
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
              priority: taskData.priority,
              tags: taskData.tags || []
            };
            
            // スケジュールアイテムを作成
            await get().createScheduleItem(createRequest);
            
            // タスクのスケジュール情報を同期
            await get().syncWithTasks();
            
            console.log('Successfully created schedule from task:', taskData.id);
          } catch (error) {
            console.error('Failed to create schedule from task:', error);
            set((state) => ({
              ...state,
              error: 'タスクからスケジュールの作成に失敗しました'
            }));
          }
        },
        
        handleTaskDrop: async (dragData: ExtendedScheduleDragData) => {
          try {
            if (dragData.sourceType === 'unscheduled' && dragData.taskData) {
              // 未スケジュールタスクのドロップ処理
              const timeSlot: TimeSlot = {
                date: new Date(), // この値は適切なドロップ先の日付に更新される必要がある
                startTime: dragData.startTime || '09:00',
                endTime: dragData.endTime || '10:00',
                availability: 'busy'
              };
              
              await get().createScheduleFromTask(dragData.taskData, timeSlot);
            } else if (dragData.sourceType === 'schedule') {
              // 既存スケジュールアイテムのドロップ処理
              await get().handleDrop(dragData);
            }
          } catch (error) {
            console.error('Failed to handle task drop:', error);
            set((state) => ({
              ...state,
              error: 'タスクドロップ処理に失敗しました'
            }));
          }
        },
        
        syncTaskSchedule: async (taskId: string, scheduleItemId: string) => {
          try {
            const taskStore = useTaskStore.getState();
            const task = taskStore.getTaskById(taskId);
            
            if (!task) {
              throw new Error(`Task not found: ${taskId}`);
            }
            
            // スケジュールアイテムを検索
            const currentSchedules = get().dailySchedules;
            let scheduleItem: ScheduleItem | undefined;
            let scheduleDate: Date | undefined;
            
            for (const [dateKey, schedule] of currentSchedules) {
              const item = schedule.scheduleItems.find(item => item.id === scheduleItemId);
              if (item) {
                scheduleItem = item;
                scheduleDate = new Date(dateKey + 'T00:00:00');
                break;
              }
            }
            
            if (scheduleItem && scheduleDate) {
              // タスクのスケジュール情報を更新
              taskStore.updateTaskSchedule(taskId, {
                scheduledDate: scheduleDate,
                scheduledStartTime: scheduleItem.startTime,
                scheduledEndTime: scheduleItem.endTime,
                scheduleItemId: scheduleItem.id
              });
            }
            
            console.log('Task schedule sync completed for task:', taskId);
          } catch (error) {
            console.error('Failed to sync task schedule:', error);
            set((state) => ({
              ...state,
              error: 'タスクスケジュール同期に失敗しました'
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
            try {
              // タスクストアからすべてのタスクを取得
              const taskStore = useTaskStore.getState();
              const tasks = taskStore.tasks;
              
              // スケジュールアイテムからタスクIDを収集
              const currentSchedules = get().dailySchedules;
              const scheduledTaskIds = new Set<string>();
              
              for (const [, schedule] of currentSchedules) {
                for (const item of schedule.scheduleItems) {
                  if (item.taskId) {
                    scheduledTaskIds.add(item.taskId);
                  }
                }
              }
              
              // タスクのスケジュール情報を更新
              for (const task of tasks) {
                if (scheduledTaskIds.has(task.id)) {
                  // スケジュール済みのタスクを探す
                  for (const [dateKey, schedule] of currentSchedules) {
                    const scheduleItem = schedule.scheduleItems.find(item => item.taskId === task.id);
                    if (scheduleItem) {
                      const scheduleDate = new Date(dateKey + 'T00:00:00');
                      taskStore.updateTaskSchedule(task.id, {
                        scheduledDate: scheduleDate,
                        scheduledStartTime: scheduleItem.startTime,
                        scheduledEndTime: scheduleItem.endTime,
                        scheduleItemId: scheduleItem.id
                      });
                      break;
                    }
                  }
                } else if (task.scheduleInfo?.scheduleItemId) {
                  // スケジュールから削除されたタスクのスケジュール情報をクリア
                  taskStore.clearTaskSchedule(task.id);
                }
              }
              
              console.log('Task schedule sync completed successfully');
            } catch (error) {
              console.error('Failed to sync with tasks:', error);
              set((state) => ({
                ...state,
                error: 'タスクとの同期に失敗しました'
              }));
            }
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
        storage: customStorage,
        partialize: (state) => ({
          viewSettings: state.viewSettings,
          currentDate: state.currentDate
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // 復元されたstateでDate型の初期化を実行
            // currentDateが文字列の場合、型ガード関数を使用してDate型に変換
            if (typeof state.currentDate === 'string') {
              state.currentDate = toSafeDate(state.currentDate);
            }
            
            // viewSettings.dateも型ガード関数を使用して同様に処理
            if (state.viewSettings?.date && typeof state.viewSettings.date === 'string') {
              state.viewSettings.date = toSafeDate(state.viewSettings.date);
            }
          }
        }
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