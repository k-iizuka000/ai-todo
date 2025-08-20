/**
 * タスクのモックデータ
 */

import { Task, TaskStatus, Priority, Tag, Subtask } from '../types/task';

// モックタグデータ
export const mockTags: Tag[] = [
  { id: 'tag-1', name: 'フロントエンド', color: '#3B82F6' },
  { id: 'tag-2', name: 'バックエンド', color: '#10B981' },
  { id: 'tag-3', name: 'バグ修正', color: '#EF4444' },
  { id: 'tag-4', name: '新機能', color: '#8B5CF6' },
  { id: 'tag-5', name: 'UI/UX', color: '#F59E0B' },
  { id: 'tag-6', name: 'データベース', color: '#6366F1' },
  { id: 'tag-7', name: 'テスト', color: '#84CC16' },
  { id: 'tag-8', name: 'ドキュメント', color: '#06B6D4' },
  { id: 'tag-9', name: 'パフォーマンス', color: '#EC4899' },
  { id: 'tag-10', name: 'セキュリティ', color: '#F97316' }
];

// モックサブタスクデータ
const mockSubtasks: Subtask[] = [
  {
    id: 'subtask-1',
    title: 'APIエンドポイントの設計',
    completed: true,
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-16T14:30:00Z')
  },
  {
    id: 'subtask-2',
    title: 'データベーススキーマの作成',
    completed: true,
    createdAt: new Date('2024-01-16T10:00:00Z'),
    updatedAt: new Date('2024-01-17T16:00:00Z')
  },
  {
    id: 'subtask-3',
    title: 'バリデーション処理の実装',
    completed: false,
    createdAt: new Date('2024-01-17T11:00:00Z'),
    updatedAt: new Date('2024-01-17T11:00:00Z')
  },
  {
    id: 'subtask-4',
    title: 'コンポーネントの作成',
    completed: true,
    createdAt: new Date('2024-01-10T08:00:00Z'),
    updatedAt: new Date('2024-01-12T15:30:00Z')
  },
  {
    id: 'subtask-5',
    title: 'スタイリングの調整',
    completed: false,
    createdAt: new Date('2024-01-12T09:00:00Z'),
    updatedAt: new Date('2024-01-12T09:00:00Z')
  }
];

// 10件以上のモックタスクデータ
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'ユーザー認証機能の実装',
    description: 'JWT認証を使用したログイン・ログアウト機能の実装。パスワードのハッシュ化、セッション管理、リフレッシュトークンの実装も含む。',
    status: 'in_progress',
    priority: 'high',
    projectId: 'project-1',
    assigneeId: 'user-1',
    tags: [mockTags[1], mockTags[9]],
    subtasks: [mockSubtasks[0], mockSubtasks[1], mockSubtasks[2]],
    dueDate: new Date('2024-02-15T23:59:59Z'),
    estimatedHours: 40,
    actualHours: 25,
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-18T16:30:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'task-2',
    title: 'タスク管理画面のUIデザイン',
    description: 'Figmaでタスクリスト、タスク詳細、タスク作成画面のUIデザインを作成。レスポンシブデザイン対応も含む。',
    status: 'done',
    priority: 'medium',
    projectId: 'project-1',
    assigneeId: 'user-2',
    tags: [mockTags[0], mockTags[4]],
    subtasks: [mockSubtasks[3], mockSubtasks[4]],
    dueDate: new Date('2024-01-20T23:59:59Z'),
    estimatedHours: 16,
    actualHours: 18,
    createdAt: new Date('2024-01-10T10:00:00Z'),
    updatedAt: new Date('2024-01-20T17:00:00Z'),
    createdBy: 'user-2',
    updatedBy: 'user-2'
  },
  {
    id: 'task-3',
    title: 'データベースのパフォーマンス最適化',
    description: 'インデックスの追加、クエリの最適化、N+1問題の解決。特にタスク検索機能の高速化を重点的に行う。',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-2',
    assigneeId: 'user-3',
    tags: [mockTags[5], mockTags[8]],
    subtasks: [],
    dueDate: new Date('2024-03-01T23:59:59Z'),
    estimatedHours: 24,
    actualHours: 0,
    createdAt: new Date('2024-01-20T14:00:00Z'),
    updatedAt: new Date('2024-01-20T14:00:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'task-4',
    title: 'ダッシュボード画面の不具合修正',
    description: 'プロジェクト統計が正しく表示されない問題の修正。進捗率の計算ロジックに問題がある可能性が高い。',
    status: 'in_progress',
    priority: 'urgent',
    projectId: 'project-1',
    assigneeId: 'user-1',
    tags: [mockTags[2], mockTags[0]],
    subtasks: [],
    dueDate: new Date('2024-01-25T23:59:59Z'),
    estimatedHours: 8,
    actualHours: 4,
    createdAt: new Date('2024-01-22T11:00:00Z'),
    updatedAt: new Date('2024-01-23T09:30:00Z'),
    createdBy: 'user-2',
    updatedBy: 'user-1'
  },
  {
    id: 'task-5',
    title: 'APIドキュメントの作成',
    description: 'Swaggerを使用してREST APIの仕様書を作成。認証、タスク管理、プロジェクト管理の各エンドポイントについて詳細に記載。',
    status: 'todo',
    priority: 'low',
    projectId: 'project-2',
    assigneeId: 'user-3',
    tags: [mockTags[7], mockTags[1]],
    subtasks: [],
    dueDate: new Date('2024-02-28T23:59:59Z'),
    estimatedHours: 12,
    actualHours: 0,
    createdAt: new Date('2024-01-18T15:30:00Z'),
    updatedAt: new Date('2024-01-18T15:30:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'task-6',
    title: 'プロジェクト作成機能の実装',
    description: 'プロジェクトの新規作成、編集、削除機能の実装。メンバー招待機能も含む。',
    status: 'in_progress',
    priority: 'high',
    projectId: 'project-1',
    assigneeId: 'user-2',
    tags: [mockTags[3], mockTags[1]],
    subtasks: [],
    dueDate: new Date('2024-02-10T23:59:59Z'),
    estimatedHours: 32,
    actualHours: 16,
    createdAt: new Date('2024-01-12T08:00:00Z'),
    updatedAt: new Date('2024-01-21T14:45:00Z'),
    createdBy: 'user-2',
    updatedBy: 'user-2'
  },
  {
    id: 'task-7',
    title: 'モバイル対応の改善',
    description: 'スマートフォンとタブレットでの操作性向上。タッチ操作の最適化とレスポンシブデザインの調整。',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-3',
    assigneeId: 'user-2',
    tags: [mockTags[0], mockTags[4]],
    subtasks: [],
    dueDate: new Date('2024-03-15T23:59:59Z'),
    estimatedHours: 20,
    actualHours: 0,
    createdAt: new Date('2024-01-19T13:00:00Z'),
    updatedAt: new Date('2024-01-19T13:00:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'task-8',
    title: 'ユニットテストの追加',
    description: 'Jest を使用したユニットテストの作成。カバレッジ80%以上を目標とする。',
    status: 'todo',
    priority: 'medium',
    projectId: 'project-2',
    assigneeId: 'user-3',
    tags: [mockTags[6]],
    subtasks: [],
    dueDate: new Date('2024-02-25T23:59:59Z'),
    estimatedHours: 28,
    actualHours: 0,
    createdAt: new Date('2024-01-16T16:00:00Z'),
    updatedAt: new Date('2024-01-16T16:00:00Z'),
    createdBy: 'user-3',
    updatedBy: 'user-3'
  },
  {
    id: 'task-9',
    title: 'リアルタイム通知機能',
    description: 'WebSocketを使用したリアルタイム通知システムの実装。タスクの更新、コメント追加時の通知。',
    status: 'todo',
    priority: 'low',
    projectId: 'project-3',
    assigneeId: 'user-1',
    tags: [mockTags[3], mockTags[1]],
    subtasks: [],
    dueDate: new Date('2024-04-01T23:59:59Z'),
    estimatedHours: 36,
    actualHours: 0,
    createdAt: new Date('2024-01-21T10:30:00Z'),
    updatedAt: new Date('2024-01-21T10:30:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'task-10',
    title: 'セキュリティ監査の実施',
    description: 'アプリケーション全体のセキュリティチェック。SQLインジェクション、XSS、CSRF攻撃への対策確認。',
    status: 'todo',
    priority: 'high',
    projectId: 'project-2',
    assigneeId: 'user-3',
    tags: [mockTags[9]],
    subtasks: [],
    dueDate: new Date('2024-02-20T23:59:59Z'),
    estimatedHours: 16,
    actualHours: 0,
    createdAt: new Date('2024-01-17T12:00:00Z'),
    updatedAt: new Date('2024-01-17T12:00:00Z'),
    createdBy: 'user-1',
    updatedBy: 'user-1'
  },
  {
    id: 'task-11',
    title: 'データエクスポート機能',
    description: 'タスクデータをCSV、JSON形式でエクスポートする機能の実装。日付範囲やプロジェクト指定でのフィルタリング対応。',
    status: 'archived',
    priority: 'low',
    projectId: 'project-3',
    assigneeId: 'user-2',
    tags: [mockTags[3], mockTags[1]],
    subtasks: [],
    dueDate: new Date('2024-01-15T23:59:59Z'),
    estimatedHours: 14,
    actualHours: 16,
    createdAt: new Date('2024-01-05T09:00:00Z'),
    updatedAt: new Date('2024-01-15T18:00:00Z'),
    createdBy: 'user-2',
    updatedBy: 'user-2'
  },
  {
    id: 'task-12',
    title: 'ダークモードの実装',
    description: 'アプリケーション全体のダークモード対応。テーマの切り替え機能とユーザー設定の保存。',
    status: 'done',
    priority: 'medium',
    projectId: 'project-1',
    assigneeId: 'user-2',
    tags: [mockTags[0], mockTags[4]],
    subtasks: [],
    dueDate: new Date('2024-01-30T23:59:59Z'),
    estimatedHours: 18,
    actualHours: 20,
    createdAt: new Date('2024-01-08T14:00:00Z'),
    updatedAt: new Date('2024-01-30T16:30:00Z'),
    createdBy: 'user-2',
    updatedBy: 'user-2'
  }
];

// タスク統計の計算用ヘルパー関数
export const getTaskStats = (tasks: Task[] = mockTasks) => {
  const total = tasks.length;
  const completed = tasks.filter(task => task.status === 'done').length;
  const inProgress = tasks.filter(task => task.status === 'in_progress').length;
  const todo = tasks.filter(task => task.status === 'todo').length;
  const archived = tasks.filter(task => task.status === 'archived').length;
  
  return {
    total,
    completed,
    inProgress,
    todo,
    archived,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

// 優先度別の統計
export const getPriorityStats = (tasks: Task[] = mockTasks) => {
  const urgent = tasks.filter(task => task.priority === 'urgent').length;
  const high = tasks.filter(task => task.priority === 'high').length;
  const medium = tasks.filter(task => task.priority === 'medium').length;
  const low = tasks.filter(task => task.priority === 'low').length;
  
  return { urgent, high, medium, low };
};