/**
 * 日時スケジュール機能のmockデータ
 * テスト・開発用のサンプルデータ
 */

import { 
  DailySchedule, 
  ScheduleItem, 
  TimeBlock, 
  ScheduleStatistics,
  ScheduleConflict,
  ScheduleSuggestion,
  WorkingHours,
  defaultWorkingHours,
  scheduleItemColors
} from '@/types/schedule';
import { Priority } from '@/types/task';

// IDジェネレーター
const generateId = (): string => {
  return `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 日付文字列を生成
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// 今日の日付
const today = new Date();
today.setHours(0, 0, 0, 0);

// 明日の日付
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// 昨日の日付
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

// 時間ブロック生成（6:00-22:00の1時間刻み）
const generateTimeBlocks = (date: Date): TimeBlock[] => {
  const blocks: TimeBlock[] = [];
  const startHour = 6;
  const endHour = 22;
  
  for (let hour = startHour; hour < endHour; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
    
    blocks.push({
      id: `block-${formatDate(date)}-${hour}`,
      date: new Date(date),
      startTime,
      endTime,
      duration: 60
    });
  }
  
  return blocks;
};

// サンプルスケジュールアイテム（今日）
const todayScheduleItems: ScheduleItem[] = [
  {
    id: 'item-1',
    timeBlockId: `block-${formatDate(today)}-8`,
    taskId: 'task-1',
    type: 'task',
    title: '朝のルーティン',
    description: 'メールチェック、スケジュール確認',
    startTime: '08:00',
    endTime: '09:00',
    duration: 60,
    color: scheduleItemColors.task,
    status: 'completed',
    priority: 'medium',
    tags: ['日課', 'ルーティン'],
    isLocked: false,
    estimatedTime: 60,
    actualTime: 55,
    completionRate: 100,
    createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    createdBy: 'user-1'
  },
  {
    id: 'item-2',
    timeBlockId: `block-${formatDate(today)}-9`,
    taskId: 'task-2',
    type: 'task',
    title: '企画書作成',
    description: '新プロジェクトの企画書を作成',
    startTime: '09:30',
    endTime: '11:30',
    duration: 120,
    color: scheduleItemColors.task,
    status: 'in_progress',
    priority: 'high',
    tags: ['企画', '重要'],
    isLocked: false,
    estimatedTime: 120,
    actualTime: 80,
    completionRate: 40,
    createdAt: new Date(today.getTime() - 12 * 60 * 60 * 1000),
    updatedAt: new Date(),
    createdBy: 'user-1'
  },
  {
    id: 'item-3',
    timeBlockId: `block-${formatDate(today)}-12`,
    type: 'break',
    title: '昼休憩',
    description: 'ランチタイム',
    startTime: '12:00',
    endTime: '13:00',
    duration: 60,
    color: scheduleItemColors.break,
    status: 'planned',
    priority: 'medium',
    isLocked: true,
    estimatedTime: 60,
    completionRate: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system'
  },
  {
    id: 'item-4',
    timeBlockId: `block-${formatDate(today)}-14`,
    taskId: 'task-3',
    type: 'task',
    title: '開発作業',
    description: 'フロントエンド、バックエンド、テスト',
    startTime: '14:00',
    endTime: '17:00',
    duration: 180,
    color: scheduleItemColors.task,
    status: 'planned',
    priority: 'high',
    tags: ['開発', 'フロントエンド', 'バックエンド'],
    isLocked: false,
    estimatedTime: 180,
    completionRate: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1'
  },
  {
    id: 'item-5',
    timeBlockId: `block-${formatDate(today)}-19`,
    type: 'personal',
    title: '学習時間',
    description: '技術書読書、オンライン講座',
    startTime: '19:00',
    endTime: '20:00',
    duration: 60,
    color: scheduleItemColors.personal,
    status: 'planned',
    priority: 'medium',
    tags: ['学習', '自己啓発'],
    isLocked: false,
    estimatedTime: 60,
    completionRate: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1'
  }
];

// サンプルスケジュールアイテム（明日）
const tomorrowScheduleItems: ScheduleItem[] = [
  {
    id: 'item-6',
    timeBlockId: `block-${formatDate(tomorrow)}-9`,
    type: 'meeting',
    title: 'チーム会議',
    description: '週次進捗報告とタスク調整',
    startTime: '09:00',
    endTime: '10:00',
    duration: 60,
    color: scheduleItemColors.meeting,
    status: 'planned',
    priority: 'high',
    tags: ['会議', 'チーム'],
    isLocked: true,
    estimatedTime: 60,
    completionRate: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1'
  },
  {
    id: 'item-7',
    timeBlockId: `block-${formatDate(tomorrow)}-10`,
    taskId: 'task-4',
    type: 'task',
    title: 'バグ修正',
    description: 'Issue #123 のバグ修正対応',
    startTime: '10:30',
    endTime: '11:30',
    duration: 60,
    color: scheduleItemColors.task,
    status: 'planned',
    priority: 'urgent',
    tags: ['バグ修正', '緊急'],
    isLocked: false,
    estimatedTime: 60,
    completionRate: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1'
  }
];

// 今日のデイリースケジュール
export const todaySchedule: DailySchedule = {
  id: `schedule-${formatDate(today)}`,
  date: new Date(today),
  userId: 'user-1',
  projectId: 'project-1',
  timeBlocks: generateTimeBlocks(today),
  scheduleItems: todayScheduleItems,
  workingHours: defaultWorkingHours,
  totalEstimated: 480, // 8時間
  totalActual: 135,    // 実績（進行中含む）
  utilization: 75,     // 稼働率
  createdAt: new Date(),
  updatedAt: new Date()
};

// 明日のデイリースケジュール
export const tomorrowSchedule: DailySchedule = {
  id: `schedule-${formatDate(tomorrow)}`,
  date: new Date(tomorrow),
  userId: 'user-1',
  projectId: 'project-1',
  timeBlocks: generateTimeBlocks(tomorrow),
  scheduleItems: tomorrowScheduleItems,
  workingHours: defaultWorkingHours,
  totalEstimated: 120, // 2時間
  totalActual: 0,
  utilization: 25,
  createdAt: new Date(),
  updatedAt: new Date()
};

// スケジュールの辞書（日付をキーとして）
export const mockSchedules: Record<string, DailySchedule> = {
  [formatDate(today)]: todaySchedule,
  [formatDate(tomorrow)]: tomorrowSchedule
};

// 今日の統計
export const todayStatistics: ScheduleStatistics = {
  date: new Date(today),
  totalTasks: 4,
  completedTasks: 1,
  totalHours: 8,
  productiveHours: 6,
  breakHours: 1,
  utilizationRate: 75,
  completionRate: 25,
  overtimeHours: 0,
  focusTime: 5,
  meetingTime: 0
};

// サンプルコンフリクト
export const mockConflicts: ScheduleConflict[] = [
  {
    id: 'conflict-1',
    type: 'overlap',
    items: ['item-2', 'item-3'],
    message: '企画書作成と昼休憩の時間が重複しています',
    severity: 'medium',
    suggestions: [
      {
        type: 'move',
        targetItemId: 'item-2',
        newTimeSlot: {
          date: new Date(today),
          startTime: '13:30',
          endTime: '15:30',
          availability: 'free'
        },
        description: '企画書作成を13:30-15:30に移動'
      }
    ]
  }
];

// AI提案サンプル
export const mockSuggestions: ScheduleSuggestion[] = [
  {
    id: 'suggestion-1',
    taskId: 'task-5',
    suggestedSlots: [
      {
        date: new Date(today),
        startTime: '10:00',
        endTime: '12:00',
        availability: 'free'
      },
      {
        date: new Date(tomorrow),
        startTime: '14:00',
        endTime: '16:00',
        availability: 'free'
      }
    ],
    reason: '集中力が最も高い時間帯で、他のタスクとの関連性も考慮',
    confidence: 0.85,
    factors: ['集中力ピーク時間', 'タスク優先度', 'スケジュール空き']
  }
];

// 未スケジュールタスクのサンプル
export const unscheduledTasks = [
  {
    id: 'task-5',
    title: 'デザインレビュー',
    description: 'UI/UXデザインの最終確認',
    priority: 'medium' as Priority,
    estimatedTime: 120, // 2時間
    tags: ['デザイン', 'レビュー']
  },
  {
    id: 'task-6',
    title: 'データベース最適化',
    description: 'クエリパフォーマンスの改善',
    priority: 'low' as Priority,
    estimatedTime: 90, // 1.5時間
    tags: ['DB', '最適化']
  },
  {
    id: 'task-7',
    title: 'ドキュメント更新',
    description: 'API仕様書の更新',
    priority: 'medium' as Priority,
    estimatedTime: 60, // 1時間
    tags: ['ドキュメント', 'API']
  }
];

// スケジュール取得用のヘルパー関数
export const getScheduleForDate = (date: Date): DailySchedule | undefined => {
  const dateKey = formatDate(date);
  return mockSchedules[dateKey];
};

// 空のスケジュールを生成
export const createEmptySchedule = (date: Date): DailySchedule => {
  return {
    id: `schedule-${formatDate(date)}`,
    date: new Date(date),
    userId: 'user-1',
    timeBlocks: generateTimeBlocks(date),
    scheduleItems: [],
    workingHours: defaultWorkingHours,
    totalEstimated: 0,
    totalActual: 0,
    utilization: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// 統計計算用のヘルパー関数
export const calculateStatistics = (schedule: DailySchedule): ScheduleStatistics => {
  const { scheduleItems } = schedule;
  
  const totalTasks = scheduleItems.filter(item => 
    item.type === 'task' || item.type === 'subtask'
  ).length;
  
  const completedTasks = scheduleItems.filter(item => 
    (item.type === 'task' || item.type === 'subtask') && item.status === 'completed'
  ).length;
  
  const totalMinutes = scheduleItems.reduce((sum, item) => sum + item.duration, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  
  const breakMinutes = scheduleItems
    .filter(item => item.type === 'break')
    .reduce((sum, item) => sum + item.duration, 0);
  const breakHours = Math.round(breakMinutes / 60 * 10) / 10;
  
  const meetingMinutes = scheduleItems
    .filter(item => item.type === 'meeting')
    .reduce((sum, item) => sum + item.duration, 0);
  const meetingTime = Math.round(meetingMinutes / 60 * 10) / 10;
  
  const productiveMinutes = totalMinutes - breakMinutes;
  const productiveHours = Math.round(productiveMinutes / 60 * 10) / 10;
  
  const utilizationRate = Math.round((productiveMinutes / schedule.workingHours.totalAvailable) * 100);
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  return {
    date: schedule.date,
    totalTasks,
    completedTasks,
    totalHours,
    productiveHours,
    breakHours,
    utilizationRate,
    completionRate,
    overtimeHours: 0, // 簡易実装
    focusTime: productiveHours,
    meetingTime
  };
};