export interface RouteConfig {
  path: string;
  label: string;
  icon?: string;
  children?: RouteConfig[];
}

export const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    label: 'ダッシュボード',
    icon: 'CheckSquare',
    children: [
      { path: '/dashboard', label: '全てのタスク' },
      { path: '/dashboard/today', label: '今日のタスク' },
      { path: '/dashboard/important', label: '重要なタスク' },
      { path: '/dashboard/completed', label: '完了済みタスク' },
      { path: '/dashboard/demo', label: 'タスク詳細デモ' },
    ],
  },
  {
    path: '/projects',
    label: 'プロジェクト',
    icon: 'Folder',
  },
  {
    path: '/calendar',
    label: 'カレンダー',
    icon: 'Calendar',
  },
  {
    path: '/schedule',
    label: '日時スケジュール',
    icon: 'Clock',
  },
  {
    path: '/analytics',
    label: '分析',
    icon: 'BarChart3',
  },
  {
    path: '/tags',
    label: 'タグの管理',
    icon: 'Tag',
  },
  {
    path: '/settings',
    label: '設定',
    icon: 'Settings',
    children: [
      { path: '/settings/general', label: '一般設定' },
      { path: '/settings/ai', label: 'AI設定' },
      { path: '/settings/theme', label: 'テーマ設定' },
      { path: '/settings/data', label: 'データ管理' },
    ],
  },
];

export const mobileRoutes = routes.filter(route => !route.children);