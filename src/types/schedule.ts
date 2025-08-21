/**
 * 日時スケジュール機能の型定義
 * 設計書（tasks/日時スケジュール機能設計書.md）に基づいて作成
 */

import { Priority } from './task';

// ===== スケジュール関連の型定義 =====

/**
 * 時間ブロックの型定義
 * 1時間単位でスケジュールを管理
 */
export interface TimeBlock {
  id: string;
  date: Date;                    // 対象日付
  startTime: string;              // "HH:mm" 形式 (例: "09:00")
  endTime: string;                // "HH:mm" 形式 (例: "10:00")
  duration: number;               // 分単位の長さ (通常60)
}

/**
 * スケジュールアイテムの型定義
 * タスクやイベントをスケジュールに配置
 */
export interface ScheduleItem {
  id: string;
  timeBlockId: string;            // 配置される時間ブロックID
  taskId?: string;                // 関連タスクID（タスクの場合）
  type: ScheduleItemType;         // アイテムの種類
  title: string;
  description?: string;
  startTime: string;              // "HH:mm" 形式
  endTime: string;                // "HH:mm" 形式
  duration: number;               // 分単位
  color: string;                  // 表示色
  status: ScheduleItemStatus;     // 進捗状態
  priority: Priority;             // 優先度（task.tsから）
  tags?: string[];                // タグ
  isLocked?: boolean;             // 時間固定フラグ
  isRecurring?: boolean;          // 繰り返しフラグ
  recurringPattern?: RecurringPattern; // 繰り返しパターン
  reminders?: Reminder[];         // リマインダー設定
  linkedItems?: string[];         // 関連アイテムID
  estimatedTime?: number;         // 見積時間（分）
  actualTime?: number;            // 実績時間（分）
  completionRate?: number;        // 完了率 (0-100)
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * スケジュールアイテムの種類
 */
export type ScheduleItemType = 
  | 'task'           // タスク
  | 'subtask'        // サブタスク
  | 'meeting'        // 会議
  | 'break'          // 休憩
  | 'personal'       // 個人的な予定
  | 'blocked'        // ブロック時間
  | 'focus'          // 集中時間
  | 'review';        // レビュー時間

/**
 * スケジュールアイテムの状態
 */
export type ScheduleItemStatus = 
  | 'planned'        // 計画済み
  | 'in_progress'    // 進行中
  | 'completed'      // 完了
  | 'postponed'      // 延期
  | 'cancelled';     // キャンセル

/**
 * 繰り返しパターン
 */
export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;               // 間隔（例: 2週間ごと）
  endDate?: Date;                 // 終了日
  occurrences?: number;           // 繰り返し回数
  daysOfWeek?: number[];          // 曜日指定 (0-6)
  dayOfMonth?: number;            // 日付指定
  exceptions?: Date[];            // 除外日
}

/**
 * リマインダー設定
 */
export interface Reminder {
  id: string;
  type: 'notification' | 'email' | 'popup';
  minutesBefore: number;          // 何分前に通知
  enabled: boolean;
}

/**
 * 日次スケジュール
 */
export interface DailySchedule {
  id: string;
  date: Date;                     // 対象日
  userId: string;
  projectId?: string;
  timeBlocks: TimeBlock[];        // 時間ブロックの配列
  scheduleItems: ScheduleItem[];  // スケジュールアイテムの配列
  workingHours: WorkingHours;    // 稼働時間設定
  totalEstimated: number;         // 合計見積時間（分）
  totalActual: number;            // 合計実績時間（分）
  utilization: number;            // 稼働率 (%)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 稼働時間設定
 */
export interface WorkingHours {
  startTime: string;              // "HH:mm" 形式
  endTime: string;                // "HH:mm" 形式
  breakTimes: BreakTime[];        // 休憩時間
  totalAvailable: number;         // 利用可能合計時間（分）
}

/**
 * 休憩時間
 */
export interface BreakTime {
  startTime: string;              // "HH:mm" 形式
  endTime: string;                // "HH:mm" 形式
  type: 'lunch' | 'short' | 'other';
}

/**
 * スケジュールビュー設定
 */
export interface ScheduleViewSettings {
  viewType: 'day' | 'week' | 'workweek';
  date: Date;                     // 基準日
  timeRange: {
    start: string;                // 表示開始時刻
    end: string;                  // 表示終了時刻
  };
  showWeekends: boolean;
  showCompleted: boolean;
  groupBy?: 'project' | 'priority' | 'type';
  filters: ScheduleFilter;
}

/**
 * スケジュールフィルター
 */
export interface ScheduleFilter {
  projects?: string[];
  types?: ScheduleItemType[];
  priorities?: Priority[];
  statuses?: ScheduleItemStatus[];
  tags?: string[];
}

/**
 * ドラッグ&ドロップ操作用の型
 */
export interface ScheduleDragData {
  itemId: string;
  sourceBlockId: string;
  targetBlockId?: string;
  startTime?: string;
  endTime?: string;
  dragType: 'move' | 'resize-start' | 'resize-end';
}

/**
 * スケジュール統計
 */
export interface ScheduleStatistics {
  date: Date;
  totalTasks: number;
  completedTasks: number;
  totalHours: number;
  productiveHours: number;
  breakHours: number;
  utilizationRate: number;        // 稼働率
  completionRate: number;         // 完了率
  overtimeHours: number;          // 残業時間
  focusTime: number;              // 集中時間
  meetingTime: number;            // 会議時間
}

/**
 * スケジュール提案（AI連携用）
 */
export interface ScheduleSuggestion {
  id: string;
  taskId: string;
  suggestedSlots: TimeSlot[];    // 提案時間枠
  reason: string;                 // 提案理由
  confidence: number;             // 信頼度 (0-1)
  factors: string[];              // 考慮要因
}

/**
 * 時間枠
 */
export interface TimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
  availability: 'free' | 'busy' | 'tentative';
}

/**
 * スケジュールのコンフリクト
 */
export interface ScheduleConflict {
  id: string;
  type: 'overlap' | 'overbooked' | 'deadline';
  items: string[];                // 関連アイテムID
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestions?: ConflictResolution[];
}

/**
 * コンフリクト解決提案
 */
export interface ConflictResolution {
  type: 'move' | 'resize' | 'split' | 'cancel';
  targetItemId: string;
  newTimeSlot?: TimeSlot;
  description: string;
}

// ===== API Request/Response型 =====

/**
 * スケジュール作成リクエスト
 */
export interface CreateScheduleItemRequest {
  date: Date;
  taskId?: string;
  type: ScheduleItemType;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  priority?: Priority;
  tags?: string[];
  isLocked?: boolean;
  recurringPattern?: RecurringPattern;
  reminders?: Reminder[];
}

/**
 * スケジュール更新リクエスト
 */
export interface UpdateScheduleItemRequest {
  id: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  description?: string;
  status?: ScheduleItemStatus;
  priority?: Priority;
  tags?: string[];
  isLocked?: boolean;
  actualTime?: number;
  completionRate?: number;
}

/**
 * スケジュール取得レスポンス
 */
export interface GetScheduleResponse {
  schedule: DailySchedule;
  conflicts: ScheduleConflict[];
  suggestions: ScheduleSuggestion[];
  statistics: ScheduleStatistics;
}

/**
 * バルクスケジュール操作
 */
export interface BulkScheduleOperation {
  action: 'create' | 'update' | 'delete' | 'move';
  items: string[];
  data?: Partial<ScheduleItem>;
  targetDate?: Date;
  targetTimeSlot?: TimeSlot;
}

// ===== デフォルト設定 =====

/**
 * デフォルトのスケジュールビュー設定
 */
export const defaultScheduleViewSettings: ScheduleViewSettings = {
  viewType: 'day',
  date: new Date(),
  timeRange: {
    start: '06:00',
    end: '22:00'
  },
  showWeekends: true,
  showCompleted: true,
  filters: {
    projects: undefined,
    types: undefined,
    priorities: undefined,
    statuses: undefined,
    tags: undefined
  }
};

/**
 * デフォルトの稼働時間設定
 */
export const defaultWorkingHours: WorkingHours = {
  startTime: '09:00',
  endTime: '18:00',
  breakTimes: [
    {
      startTime: '12:00',
      endTime: '13:00',
      type: 'lunch'
    }
  ],
  totalAvailable: 480 // 8時間 = 480分
};

/**
 * スケジュールアイテムタイプ別のデフォルト色
 */
export const scheduleItemColors: Record<ScheduleItemType, string> = {
  task: '#3B82F6',      // 青
  subtask: '#60A5FA',   // 薄青
  meeting: '#8B5CF6',   // 紫
  break: '#10B981',     // 緑
  personal: '#F59E0B',  // 橙
  blocked: '#6B7280',   // 灰
  focus: '#EF4444',     // 赤
  review: '#EC4899'     // ピンク
};

/**
 * 優先度別の色設定
 */
export const priorityColors: Record<Priority, string> = {
  critical: '#DC2626',
  urgent: '#EA580C',
  high: '#F59E0B',
  medium: '#84CC16',
  low: '#6B7280'
};