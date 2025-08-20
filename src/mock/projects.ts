/**
 * プロジェクトのモックデータ
 */

import { Project, ProjectStatus, ProjectPriority, ProjectMember, ProjectStats, ProjectWithStats } from '../types/project';

// モックプロジェクトメンバー
const mockProjectMembers: ProjectMember[] = [
  {
    userId: 'user-1',
    role: 'owner',
    joinedAt: new Date('2024-01-01T09:00:00Z')
  },
  {
    userId: 'user-2',
    role: 'admin',
    joinedAt: new Date('2024-01-02T10:00:00Z')
  },
  {
    userId: 'user-3',
    role: 'member',
    joinedAt: new Date('2024-01-03T11:00:00Z')
  },
  {
    userId: 'user-4',
    role: 'member',
    joinedAt: new Date('2024-01-10T14:00:00Z')
  },
  {
    userId: 'user-5',
    role: 'viewer',
    joinedAt: new Date('2024-01-15T16:00:00Z')
  }
];

// 3件以上のモックプロジェクトデータ
export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'タスク管理システム開発',
    description: 'チーム向けのタスク管理システムの開発プロジェクト。React + TypeScript + Node.jsで構築し、リアルタイム機能とモバイル対応を含む。',
    status: 'active',
    priority: 'high',
    color: '#3B82F6',
    icon: '📋',
    ownerId: 'user-1',
    members: [
      mockProjectMembers[0],
      mockProjectMembers[1],
      mockProjectMembers[2],
      mockProjectMembers[3]
    ],
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-06-30T23:59:59Z'),
    deadline: new Date('2024-06-15T23:59:59Z'),
    budget: 5000000,
    tags: ['React', 'TypeScript', 'Node.js', 'WebSocket', 'モバイル対応'],
    isArchived: false,
    createdAt: new Date('2023-12-15T09:00:00Z'),
    updatedAt: new Date('2024-01-23T16:30:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'project-2',
    name: 'ECサイトリニューアル',
    description: 'オンラインショップの全面リニューアルプロジェクト。パフォーマンス向上、SEO対策、決済システムの刷新を行う。',
    status: 'active',
    priority: 'critical',
    color: '#10B981',
    icon: '🛒',
    ownerId: 'user-2',
    members: [
      mockProjectMembers[1],
      mockProjectMembers[2],
      mockProjectMembers[4]
    ],
    startDate: new Date('2023-12-01T00:00:00Z'),
    endDate: new Date('2024-05-31T23:59:59Z'),
    deadline: new Date('2024-04-30T23:59:59Z'),
    budget: 8000000,
    tags: ['EC', 'リニューアル', 'パフォーマンス', 'SEO', '決済'],
    isArchived: false,
    createdAt: new Date('2023-11-20T10:00:00Z'),
    updatedAt: new Date('2024-01-22T14:15:00Z'),
    createdBy: 'user-2',
    updatedBy: 'user-2'
  },
  {
    id: 'project-3',
    name: 'モバイルアプリ開発',
    description: 'iOS/Android向けのネイティブアプリ開発。React Nativeを使用してクロスプラットフォーム対応。',
    status: 'planning',
    priority: 'medium',
    color: '#8B5CF6',
    icon: '📱',
    ownerId: 'user-3',
    members: [
      mockProjectMembers[2],
      mockProjectMembers[3],
      mockProjectMembers[4]
    ],
    startDate: new Date('2024-03-01T00:00:00Z'),
    endDate: new Date('2024-09-30T23:59:59Z'),
    deadline: new Date('2024-08-31T23:59:59Z'),
    budget: 3500000,
    tags: ['React Native', 'iOS', 'Android', 'クロスプラットフォーム'],
    isArchived: false,
    createdAt: new Date('2024-01-10T13:00:00Z'),
    updatedAt: new Date('2024-01-20T11:45:00Z'),
    createdBy: 'user-3',
    updatedBy: 'user-3'
  },
  {
    id: 'project-4',
    name: 'データ分析基盤構築',
    description: 'ビジネス分析のためのデータウェアハウスとBIツールの導入。データの可視化と自動レポート生成機能を含む。',
    status: 'on_hold',
    priority: 'medium',
    color: '#F59E0B',
    icon: '📊',
    ownerId: 'user-1',
    members: [
      mockProjectMembers[0],
      mockProjectMembers[2]
    ],
    startDate: new Date('2024-02-15T00:00:00Z'),
    endDate: new Date('2024-08-31T23:59:59Z'),
    budget: 2500000,
    tags: ['データ分析', 'BI', 'データウェアハウス', '可視化'],
    isArchived: false,
    createdAt: new Date('2024-01-05T15:30:00Z'),
    updatedAt: new Date('2024-01-18T09:20:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'project-5',
    name: 'レガシーシステム移行',
    description: '旧システムから新システムへの移行プロジェクト。データマイグレーション、機能の移植、ユーザートレーニングを含む。',
    status: 'completed',
    priority: 'high',
    color: '#EF4444',
    icon: '🔄',
    ownerId: 'user-2',
    members: [
      mockProjectMembers[1],
      mockProjectMembers[3]
    ],
    startDate: new Date('2023-06-01T00:00:00Z'),
    endDate: new Date('2023-12-31T23:59:59Z'),
    deadline: new Date('2023-12-15T23:59:59Z'),
    budget: 6000000,
    tags: ['移行', 'レガシー', 'マイグレーション', 'トレーニング'],
    isArchived: false,
    createdAt: new Date('2023-05-15T08:00:00Z'),
    updatedAt: new Date('2023-12-31T17:00:00Z'),
    createdBy: 'user-2',
    updatedBy: 'user-2'
  }
];

// プロジェクト統計データ
export const mockProjectStats: Record<string, ProjectStats> = {
  'project-1': {
    totalTasks: 8,
    completedTasks: 2,
    inProgressTasks: 3,
    todoTasks: 3,
    progressPercentage: 25,
    estimatedHours: 186,
    actualHours: 79
  },
  'project-2': {
    totalTasks: 4,
    completedTasks: 0,
    inProgressTasks: 1,
    todoTasks: 3,
    progressPercentage: 0,
    estimatedHours: 80,
    actualHours: 4
  },
  'project-3': {
    totalTasks: 3,
    completedTasks: 1,
    inProgressTasks: 0,
    todoTasks: 2,
    progressPercentage: 33,
    estimatedHours: 72,
    actualHours: 16
  },
  'project-4': {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    progressPercentage: 0,
    estimatedHours: 0,
    actualHours: 0
  },
  'project-5': {
    totalTasks: 15,
    completedTasks: 15,
    inProgressTasks: 0,
    todoTasks: 0,
    progressPercentage: 100,
    estimatedHours: 320,
    actualHours: 295
  }
};

// 統計付きプロジェクトデータ
export const mockProjectsWithStats: ProjectWithStats[] = mockProjects.map(project => ({
  ...project,
  stats: mockProjectStats[project.id] || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    todoTasks: 0,
    progressPercentage: 0,
    estimatedHours: 0,
    actualHours: 0
  }
}));

// プロジェクト統計の計算用ヘルパー関数
export const getAllProjectsStats = (projects: Project[] = mockProjects) => {
  const total = projects.length;
  const active = projects.filter(p => p.status === 'active').length;
  const completed = projects.filter(p => p.status === 'completed').length;
  const planning = projects.filter(p => p.status === 'planning').length;
  const onHold = projects.filter(p => p.status === 'on_hold').length;
  const cancelled = projects.filter(p => p.status === 'cancelled').length;
  
  return {
    total,
    active,
    completed,
    planning,
    onHold,
    cancelled,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

// 優先度別の統計
export const getProjectPriorityStats = (projects: Project[] = mockProjects) => {
  const critical = projects.filter(p => p.priority === 'critical').length;
  const high = projects.filter(p => p.priority === 'high').length;
  const medium = projects.filter(p => p.priority === 'medium').length;
  const low = projects.filter(p => p.priority === 'low').length;
  
  return { critical, high, medium, low };
};

// プロジェクトメンバー数の統計
export const getProjectMemberStats = (projects: Project[] = mockProjects) => {
  const memberCounts = projects.map(p => p.members.length);
  const total = memberCounts.reduce((sum, count) => sum + count, 0);
  const average = projects.length > 0 ? Math.round(total / projects.length) : 0;
  const max = Math.max(...memberCounts, 0);
  const min = Math.min(...memberCounts, 0);
  
  return { total, average, max, min };
};