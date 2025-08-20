/**
 * プロジェクト管理用のモックデータ（統計情報含む）
 */

import type { ProjectWithFullDetails, ProjectStats, ProjectMember, ProjectView } from '@/types/project';
import type { Task } from '@/types/task';
import { mockTasks } from './tasks';

// 統計データを生成する関数
const generateStats = (projectId: string): ProjectStats => {
  const projectTasks = mockTasks.filter(task => task.projectId === projectId);
  const completedTasks = projectTasks.filter(task => task.status === 'done').length;
  const inProgressTasks = projectTasks.filter(task => task.status === 'in_progress').length;
  const todoTasks = projectTasks.filter(task => task.status === 'todo').length;
  
  const now = new Date();
  const overdueTasks = projectTasks.filter(task => 
    task.dueDate && task.dueDate < now && task.status !== 'done'
  ).length;
  
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dueThisWeek = projectTasks.filter(task =>
    task.dueDate && task.dueDate >= now && task.dueDate <= nextWeek
  ).length;

  return {
    totalTasks: projectTasks.length,
    completedTasks,
    inProgressTasks,
    todoTasks,
    completionRate: projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0,
    overdueCount: overdueTasks,
    dueThisWeek,
    averageCompletionTime: Math.floor(Math.random() * 48) + 24, // 24-72時間
    progressPercentage: projectTasks.length > 0 ? Math.round(((completedTasks + inProgressTasks * 0.5) / projectTasks.length) * 100) : 0,
    estimatedHours: projectTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0),
    actualHours: projectTasks.reduce((sum, task) => sum + (task.actualHours || 0), 0)
  };
};

// メンバーのモックデータ
const mockMembers: ProjectMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    userName: '田中太郎',
    role: 'owner',
    joinedAt: new Date('2024-01-01'),
    avatar: 'https://ui-avatars.com/api/?name=田中太郎&background=3B82F6&color=fff'
  },
  {
    id: 'member-2',
    userId: 'user-2',
    userName: '山田花子',
    role: 'admin',
    joinedAt: new Date('2024-01-05'),
    avatar: 'https://ui-avatars.com/api/?name=山田花子&background=10B981&color=fff'
  },
  {
    id: 'member-3',
    userId: 'user-3',
    userName: '佐藤次郎',
    role: 'member',
    joinedAt: new Date('2024-01-10'),
    avatar: 'https://ui-avatars.com/api/?name=佐藤次郎&background=8B5CF6&color=fff'
  },
  {
    id: 'member-4',
    userId: 'user-4',
    userName: '鈴木美咲',
    role: 'member',
    joinedAt: new Date('2024-01-15'),
    avatar: 'https://ui-avatars.com/api/?name=鈴木美咲&background=F59E0B&color=fff'
  }
];

// プロジェクトビューのモックデータ
const mockViews: ProjectView[] = [
  {
    id: 'view-1',
    name: 'デフォルトビュー',
    viewType: 'kanban',
    filters: {},
    sortBy: {},
    savedAt: new Date('2024-01-01')
  },
  {
    id: 'view-2',
    name: '今週の優先タスク',
    viewType: 'list',
    filters: { priority: ['high', 'urgent'] },
    sortBy: { field: 'dueDate', order: 'asc' },
    savedAt: new Date('2024-01-15')
  }
];

// プロジェクトの最近のタスクを取得する関数
const getRecentTasks = (projectId: string): Task[] => {
  return mockTasks
    .filter(task => task.projectId === projectId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);
};

// 詳細なプロジェクトモックデータ
export const mockProjectsWithStats: ProjectWithFullDetails[] = [
  {
    id: 'project-1',
    name: 'Webアプリケーション開発',
    description: '新規Webアプリケーションの開発プロジェクト。React + TypeScriptを使用し、モダンなUIライブラリを活用してユーザーフレンドリーなインターフェースを構築します。',
    status: 'active',
    priority: 'high',
    color: '#3B82F6',
    icon: '🌐',
    ownerId: 'user-1',
    members: mockMembers,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
    deadline: new Date('2024-06-15'),
    budget: 5000000,
    tags: ['React', 'TypeScript', 'フロントエンド'],
    isArchived: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-20'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    stats: generateStats('project-1'),
    recentTasks: getRecentTasks('project-1'),
    views: mockViews
  },
  {
    id: 'project-2',
    name: 'モバイルアプリ開発',
    description: 'React Nativeを使用したクロスプラットフォームアプリの開発。iOS/Android両対応で、ネイティブに近いパフォーマンスを実現します。',
    status: 'active',
    priority: 'medium',
    color: '#10B981',
    icon: '📱',
    ownerId: 'user-2',
    members: mockMembers.slice(0, 3),
    startDate: new Date('2024-01-10'),
    endDate: new Date('2024-08-31'),
    deadline: new Date('2024-08-15'),
    budget: 3000000,
    tags: ['React Native', 'モバイル', 'クロスプラットフォーム'],
    isArchived: false,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-22'),
    createdBy: 'user-2',
    updatedBy: 'user-2',
    stats: generateStats('project-2'),
    recentTasks: getRecentTasks('project-2'),
    views: mockViews
  },
  {
    id: 'project-3',
    name: 'APIサーバー構築',
    description: 'Node.js + ExpressでのREST API開発。JWT認証機能とPostgreSQLデータベース連携を含む、スケーラブルなバックエンドシステムを構築します。',
    status: 'active',
    priority: 'high',
    color: '#8B5CF6',
    icon: '⚙️',
    ownerId: 'user-1',
    members: [mockMembers[0], mockMembers[2], mockMembers[3]],
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-05-31'),
    deadline: new Date('2024-05-15'),
    budget: 2500000,
    tags: ['Node.js', 'Express', 'PostgreSQL', 'API'],
    isArchived: false,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-23'),
    createdBy: 'user-1',
    updatedBy: 'user-3',
    stats: generateStats('project-3'),
    recentTasks: getRecentTasks('project-3'),
    views: mockViews
  },
  {
    id: 'project-4',
    name: 'デザインシステム構築',
    description: 'Figmaとコードの両方で管理するデザインシステムの構築。一貫性のあるUIコンポーネントライブラリを作成し、開発効率を向上させます。',
    status: 'planning',
    priority: 'medium',
    color: '#F59E0B',
    icon: '🎨',
    ownerId: 'user-4',
    members: [mockMembers[3], mockMembers[1]],
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-04-30'),
    deadline: new Date('2024-04-15'),
    budget: 1500000,
    tags: ['デザインシステム', 'Figma', 'UIライブラリ'],
    isArchived: false,
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-01-26'),
    createdBy: 'user-4',
    updatedBy: 'user-4',
    stats: generateStats('project-4'),
    recentTasks: [],
    views: mockViews
  },
  {
    id: 'project-5',
    name: 'レガシーシステム移行',
    description: '旧システムから新システムへのデータ移行とシステム統合プロジェクト。段階的な移行計画により、ダウンタイムを最小限に抑えます。',
    status: 'on_hold',
    priority: 'low',
    color: '#6B7280',
    icon: '🔄',
    ownerId: 'user-1',
    members: [mockMembers[0], mockMembers[2]],
    startDate: new Date('2024-03-01'),
    endDate: new Date('2024-12-31'),
    deadline: new Date('2024-11-30'),
    budget: 8000000,
    tags: ['移行', 'レガシー', 'システム統合'],
    isArchived: false,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-21'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    stats: generateStats('project-5'),
    recentTasks: [],
    views: mockViews
  }
];

// プロジェクトを検索する関数
export const searchProjects = (query: string): ProjectWithFullDetails[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockProjectsWithStats.filter(project =>
    project.name.toLowerCase().includes(lowercaseQuery) ||
    project.description?.toLowerCase().includes(lowercaseQuery) ||
    project.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

// アクティブなプロジェクトのみを取得する関数
export const getActiveProjects = (): ProjectWithFullDetails[] => {
  return mockProjectsWithStats.filter(project => project.status === 'active');
};

// プロジェクトIDで詳細を取得する関数
export const getProjectDetail = (projectId: string): ProjectWithFullDetails | undefined => {
  return mockProjectsWithStats.find(project => project.id === projectId);
};