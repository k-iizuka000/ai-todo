/**
 * 分析・レポート機能用のモックデータ
 */

import type { 
  AnalyticsDashboard, 
  TaskMetrics, 
  ProductivityTrend, 
  ProjectPerformance, 
  ProjectStats,
  ProjectDetail,
  TimeDistribution, 
  Bottleneck,
  ChartDataPoint,
  WeeklyProductivityData
} from '@/types/analytics';
import { mockTasks } from './tasks';
import { mockProjectsWithStats } from './projectsWithStats';

// 現在の日付
const today = new Date();

// タスクメトリクス生成
const generateTaskMetrics = (): TaskMetrics => {
  const completedTasks = mockTasks.filter(task => task.status === 'done').length;
  const totalTasks = mockTasks.length;
  
  return {
    period: 'month',
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    endDate: today,
    tasksCreated: totalTasks,
    tasksCompleted: completedTasks,
    averageCompletionTime: 2.5, // 平均2.5日で完了
    productivityScore: Math.round((completedTasks / totalTasks) * 100)
  };
};

// 生産性トレンドデータ生成（過去30日分）
const generateProductivityTrends = (): ProductivityTrend[] => {
  const trends: ProductivityTrend[] = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    trends.push({
      date,
      completed: Math.floor(Math.random() * 8) + 2, // 2-10個完了
      created: Math.floor(Math.random() * 5) + 1,   // 1-6個作成
      inProgress: Math.floor(Math.random() * 3) + 1, // 1-4個進行中
      overdue: Math.floor(Math.random() * 3)         // 0-2個遅延
    });
  }
  
  return trends;
};

// プロジェクトパフォーマンス生成
const generateProjectPerformance = (): ProjectPerformance[] => {
  return mockProjectsWithStats.map(project => ({
    projectId: project.id,
    projectName: project.name,
    completionRate: project.stats.completionRate,
    onTimeDeliveryRate: Math.floor(Math.random() * 30) + 70, // 70-100%
    averageTaskDuration: project.stats.averageCompletionTime,
    taskCount: project.stats.totalTasks,
    color: project.color
  }));
};

// 時間配分データ生成
const generateTimeDistribution = (): TimeDistribution[] => {
  const categories = [
    { name: '開発作業', color: '#3B82F6' },
    { name: '会議・打ち合わせ', color: '#10B981' },
    { name: 'レビュー・テスト', color: '#F59E0B' },
    { name: '設計・調査', color: '#8B5CF6' },
    { name: 'ドキュメント作成', color: '#EF4444' },
    { name: 'その他', color: '#6B7280' }
  ];
  
  const totalHours = 40; // 週40時間
  let remainingHours = totalHours;
  
  return categories.map((category, index) => {
    const isLast = index === categories.length - 1;
    const hours = isLast ? remainingHours : Math.floor(Math.random() * (remainingHours / 2)) + 1;
    remainingHours -= hours;
    
    const percentage = Math.round((hours / totalHours) * 100);
    const taskCount = Math.floor(hours / 2) + 1; // 2時間に1タスクの想定
    
    return {
      category: category.name,
      hours,
      percentage,
      taskCount,
      color: category.color
    };
  });
};

// ボトルネック分析生成
const generateBottlenecks = (): Bottleneck[] => {
  const bottleneckTasks = mockTasks
    .filter(task => task.status === 'in_progress')
    .slice(0, 5)
    .map(task => {
      const createdAt = new Date(task.createdAt);
      const daysSinceCreated = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      
      let daysOverdue: number | undefined;
      if (task.dueDate && task.dueDate < today) {
        daysOverdue = Math.floor((today.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
      const project = mockProjectsWithStats.find(p => p.id === task.projectId);
      
      return {
        taskId: task.id,
        taskTitle: task.title,
        projectId: task.projectId,
        projectName: project?.name,
        status: task.status,
        priority: task.priority,
        daysSinceCreated,
        daysOverdue,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours
      };
    });
    
  return bottleneckTasks;
};

// 期限間近のタスク生成
const generateUpcomingDeadlines = (): any[] => {
  const upcoming = mockTasks
    .filter(task => {
      if (!task.dueDate || task.status === 'done') return false;
      
      const daysUntilDue = Math.floor((task.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue >= 0 && daysUntilDue <= 7; // 今後7日以内
    })
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 10);
    
  return upcoming;
};

// プロジェクト統計生成
const generateProjectStats = (): ProjectStats => {
  const totalProjects = mockProjectsWithStats.length;
  
  // プロジェクトの進捗率に基づいてステータスを判定
  const activeProjects = mockProjectsWithStats.filter(p => 
    p.stats.progressPercentage > 0 && p.stats.progressPercentage < 100
  ).length;
  
  const completedProjects = mockProjectsWithStats.filter(p => 
    p.stats.progressPercentage >= 100
  ).length;
  
  const planningProjects = mockProjectsWithStats.filter(p => 
    p.stats.progressPercentage === 0
  ).length;
  
  // 残りはon_holdとする
  const onHoldProjects = Math.max(0, totalProjects - activeProjects - completedProjects - planningProjects);
  
  return {
    active: activeProjects,
    completed: completedProjects,
    planning: planningProjects,
    onHold: onHoldProjects,
    archived: 0, // アーカイブされたプロジェクトはとりあえず0
    total: totalProjects
  };
};

// プロジェクト詳細データ生成
const generateProjectDetails = (): ProjectDetail[] => {
  return mockProjectsWithStats.map(project => ({
    id: project.id,
    name: project.name,
    icon: project.icon || '📁',
    totalTasks: project.stats.totalTasks,
    completedTasks: project.stats.completedTasks,
    inProgressTasks: project.stats.inProgressTasks || Math.floor(project.stats.totalTasks * 0.3),
    todoTasks: project.stats.totalTasks - project.stats.completedTasks - Math.floor(project.stats.totalTasks * 0.3),
    progressPercentage: project.stats.completionRate,
    estimatedHours: project.stats.estimatedHours || Math.floor(project.stats.totalTasks * 8),
    actualHours: project.stats.actualHours || Math.floor(project.stats.completedTasks * 6)
  }));
};

// メインの分析ダッシュボードデータ
export const mockAnalyticsDashboard: AnalyticsDashboard = {
  metrics: generateTaskMetrics(),
  trends: generateProductivityTrends(),
  projectPerformance: generateProjectPerformance(),
  projectStats: generateProjectStats(),
  projectDetails: generateProjectDetails(),
  timeDistribution: generateTimeDistribution(),
  upcomingDeadlines: generateUpcomingDeadlines(),
  bottlenecks: generateBottlenecks()
};

// チャート用データ生成関数

// 完了タスク数のチャートデータ
export const getCompletionTrendChartData = (): ChartDataPoint[] => {
  return mockAnalyticsDashboard.trends.map(trend => ({
    x: trend.date,
    y: trend.completed,
    label: `${trend.date.getMonth() + 1}/${trend.date.getDate()}`
  }));
};

// プロジェクト別完了率のチャートデータ
export const getProjectCompletionChartData = (): ChartDataPoint[] => {
  return mockAnalyticsDashboard.projectPerformance.map(project => ({
    x: project.projectName,
    y: project.completionRate,
    label: `${project.completionRate}%`,
    color: project.color
  }));
};

// 時間配分のチャートデータ
export const getTimeDistributionChartData = (): ChartDataPoint[] => {
  return mockAnalyticsDashboard.timeDistribution.map(dist => ({
    x: dist.category,
    y: dist.hours,
    label: `${dist.hours}時間 (${dist.percentage}%)`,
    color: dist.color
  }));
};

// 生産性スコアの週次データ
export const getWeeklyProductivityData = (): ChartDataPoint[] => {
  const weeklyData: ChartDataPoint[] = [];
  const trends = mockAnalyticsDashboard.trends;
  
  for (let i = 0; i < trends.length; i += 7) {
    const week = trends.slice(i, i + 7);
    const weekCompleted = week.reduce((sum, day) => sum + day.completed, 0);
    const weekCreated = week.reduce((sum, day) => sum + day.created, 0);
    const productivityScore = weekCreated > 0 ? Math.round((weekCompleted / weekCreated) * 100) : 0;
    
    weeklyData.push({
      x: `Week ${Math.floor(i / 7) + 1}`,
      y: productivityScore,
      label: `${productivityScore}%`
    });
  }
  
  return weeklyData;
};

// 優先度別タスク分布
export const getPriorityDistributionData = (): ChartDataPoint[] => {
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const colors = ['#22C55E', '#EAB308', '#F97316', '#EF4444'];
  
  return priorities.map((priority, index) => {
    const count = mockTasks.filter(task => task.priority === priority).length;
    return {
      x: priority,
      y: count,
      label: `${count}個`,
      color: colors[index]
    };
  });
};

// 月次完了タスク数（過去6ヶ月）
export const getMonthlyCompletionData = (): ChartDataPoint[] => {
  const monthlyData: ChartDataPoint[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(today.getMonth() - i);
    
    const completed = Math.floor(Math.random() * 20) + 10; // 10-30個
    
    monthlyData.push({
      x: date,
      y: completed,
      label: `${completed}個完了`
    });
  }
  
  return monthlyData;
};

// 週次生産性データ（Analytics.tsxで使用される）
export const getWeeklyProductivityDataForAnalytics = (): WeeklyProductivityData[] => {
  const weeklyData: WeeklyProductivityData[] = [];
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (i * 7) - 6);
    
    const estimatedHours = Math.floor(Math.random() * 10) + 30; // 30-40時間
    const actualHours = Math.floor(Math.random() * 15) + 25; // 25-40時間
    const efficiency = Math.round((estimatedHours / actualHours) * 100);
    
    weeklyData.push({
      period: `第${4 - i}週`,
      efficiency: Math.min(efficiency, 120), // 最大120%に制限
      estimatedHours,
      actualHours
    });
  }
  
  return weeklyData;
};