export interface RouteConfig {
  path: string;
  label: string;
  icon?: string;
  children?: RouteConfig[];
}

export const routes: RouteConfig[] = [
  {
    path: '/',
    label: 'ダッシュボード',
    icon: 'Home',
  },
  {
    path: '/tasks',
    label: 'タスク管理',
    icon: 'CheckSquare',
    children: [
      { path: '/tasks', label: '全てのタスク' },
      { path: '/tasks/today', label: '今日のタスク' },
      { path: '/tasks/important', label: '重要なタスク' },
      { path: '/tasks/completed', label: '完了済みタスク' },
      { path: '/tasks/demo', label: 'タスク詳細デモ' },
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