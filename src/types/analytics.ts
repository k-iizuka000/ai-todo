/**
 * 分析・レポート機能の型定義
 */

import type { Priority, TaskStatus } from './task';

// 分析期間
export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

// タスクメトリクス
export interface TaskMetrics {
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  tasksCreated: number;
  tasksCompleted: number;
  averageCompletionTime: number;
  productivityScore: number;
}

// 生産性トレンド
export interface ProductivityTrend {
  date: Date;
  completed: number;
  created: number;
  inProgress: number;
  overdue: number;
}

// プロジェクトパフォーマンス
export interface ProjectPerformance {
  projectId: string;
  projectName: string;
  completionRate: number;
  onTimeDeliveryRate: number;
  averageTaskDuration: number;
  taskCount: number;
  color?: string;
}

// 時間配分
export interface TimeDistribution {
  category: string;
  hours: number;
  percentage: number;
  taskCount: number;
  color?: string;
}

// ボトルネック分析
export interface Bottleneck {
  taskId: string;
  taskTitle: string;
  projectId?: string;
  projectName?: string;
  status: TaskStatus;
  priority: Priority;
  daysSinceCreated: number;
  daysOverdue?: number;
  estimatedHours?: number;
  actualHours?: number;
}

// プロジェクト統計
export interface ProjectStats {
  active: number;
  completed: number;
  planning: number;
  onHold: number;
  archived: number;
  total: number;
}

// プロジェクト詳細
export interface ProjectDetail {
  id: string;
  name: string;
  icon: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  progressPercentage: number;
  estimatedHours: number;
  actualHours: number;
}

// 分析ダッシュボード
export interface AnalyticsDashboard {
  metrics: TaskMetrics;
  trends: ProductivityTrend[];
  projectPerformance: ProjectPerformance[];
  projectStats: ProjectStats; // 必須フィールドとして追加
  projectDetails: ProjectDetail[]; // 必須フィールドとして追加
  timeDistribution: TimeDistribution[];
  upcomingDeadlines: any[]; // Task[] - 循環import回避のためany
  bottlenecks: Bottleneck[];
}

// チャート用データポイント
export interface ChartDataPoint {
  x: string | number | Date;
  y: number;
  label?: string;
  color?: string;
}

// 週次生産性データ
export interface WeeklyProductivityData {
  period: string;
  efficiency: number;
  estimatedHours: number;
  actualHours: number;
}

// チャート設定
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  data: ChartDataPoint[];
  colors?: string[];
}