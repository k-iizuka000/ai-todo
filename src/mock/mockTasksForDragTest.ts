/**
 * ドラッグ&ドロップテスト専用のモックデータ
 * Issue 033: ドラッグアンドドロップ機能動作確認用
 */

import { Task, TaskStatus, Priority } from '../types/task';
import { Tag } from '../types/tag';

// ドラッグテスト専用タグデータ
export const dragTestTags: Tag[] = [
  { id: 'test-tag-1', name: 'テスト', color: '#FF6B6B' },
  { id: 'test-tag-2', name: 'デザイン', color: '#4ECDC4' },
  { id: 'test-tag-3', name: 'UI', color: '#45B7D1' },
  { id: 'test-tag-4', name: 'バグ修正', color: '#FFA07A' },
  { id: 'test-tag-5', name: '機能追加', color: '#98D8C8' }
];

// ドラッグテスト専用タスクデータ（各ステータス2-3件、多様な設定）
export const dragTestTasks: Task[] = [
  // Todo: 3件
  {
    id: 'drag-test-1',
    title: '🚀 高優先度タスク（ドラッグテスト用）',
    description: 'このタスクは緊急度が高く、早急な対応が必要です。ドラッグ操作のテストに使用します。',
    status: 'todo',
    priority: 'urgent',
    projectId: 'test-project-1',
    assigneeId: 'test-user-1',
    tags: [dragTestTags[0], dragTestTags[4]],
    subtasks: [
      {
        id: 'sub-drag-1',
        title: '要件定義',
        completed: true,
        createdAt: new Date('2024-09-01T09:00:00Z'),
        updatedAt: new Date('2024-09-01T10:00:00Z')
      },
      {
        id: 'sub-drag-2',
        title: '実装計画',
        completed: false,
        createdAt: new Date('2024-09-01T11:00:00Z'),
        updatedAt: new Date('2024-09-01T11:00:00Z')
      }
    ],
    dueDate: new Date('2024-09-10T23:59:59Z'),
    estimatedHours: 8,
    actualHours: 2,
    createdAt: new Date('2024-09-01T08:00:00Z'),
    updatedAt: new Date('2024-09-04T14:30:00Z'),
    createdBy: 'test-user-1',
    updatedBy: 'test-user-1'
  },
  {
    id: 'drag-test-2',
    title: '📝 中優先度タスク（サブタスクあり）',
    description: 'ドキュメント作成タスクです。複数のサブタスクを含んでいるため、ドラッグ時の動作確認に適しています。',
    status: 'todo',
    priority: 'medium',
    projectId: 'test-project-1',
    assigneeId: 'test-user-2',
    tags: [dragTestTags[1]],
    subtasks: [
      {
        id: 'sub-drag-3',
        title: '資料収集',
        completed: true,
        createdAt: new Date('2024-09-02T09:00:00Z'),
        updatedAt: new Date('2024-09-02T16:00:00Z')
      },
      {
        id: 'sub-drag-4',
        title: '初稿作成',
        completed: true,
        createdAt: new Date('2024-09-03T09:00:00Z'),
        updatedAt: new Date('2024-09-03T17:00:00Z')
      },
      {
        id: 'sub-drag-5',
        title: 'レビュー対応',
        completed: false,
        createdAt: new Date('2024-09-04T09:00:00Z'),
        updatedAt: new Date('2024-09-04T09:00:00Z')
      }
    ],
    dueDate: new Date('2024-09-15T23:59:59Z'),
    estimatedHours: 12,
    actualHours: 6,
    createdAt: new Date('2024-09-02T08:30:00Z'),
    updatedAt: new Date('2024-09-04T15:00:00Z'),
    createdBy: 'test-user-2',
    updatedBy: 'test-user-2'
  },
  {
    id: 'drag-test-3',
    title: '🔧 低優先度タスク（長い説明テキスト付き）',
    description: '長いテキストの表示とドラッグ動作の確認用タスクです。テキストが長い場合でもドラッグ操作が正常に動作することを確認します。このタスクには多くの詳細情報が含まれており、UI表示の際にテキスト折り返しやスクロール動作なども検証できます。',
    status: 'todo',
    priority: 'low',
    projectId: 'test-project-2',
    assigneeId: 'test-user-3',
    tags: [dragTestTags[2], dragTestTags[3]],
    subtasks: [],
    dueDate: new Date('2024-09-30T23:59:59Z'),
    estimatedHours: 4,
    actualHours: 0,
    createdAt: new Date('2024-09-01T12:00:00Z'),
    updatedAt: new Date('2024-09-01T12:00:00Z'),
    createdBy: 'test-user-3',
    updatedBy: 'test-user-3'
  },

  // In Progress: 2件
  {
    id: 'drag-test-4',
    title: '⚡ 進行中タスク（プロジェクト付き）',
    description: '現在進行中のタスクです。プロジェクトが設定されており、実際の作業時間も記録されています。',
    status: 'in_progress',
    priority: 'high',
    projectId: 'test-project-1',
    assigneeId: 'test-user-1',
    tags: [dragTestTags[0], dragTestTags[4]],
    subtasks: [
      {
        id: 'sub-drag-6',
        title: '設計書作成',
        completed: true,
        createdAt: new Date('2024-09-01T14:00:00Z'),
        updatedAt: new Date('2024-09-02T10:00:00Z')
      },
      {
        id: 'sub-drag-7',
        title: '実装',
        completed: false,
        createdAt: new Date('2024-09-03T09:00:00Z'),
        updatedAt: new Date('2024-09-03T09:00:00Z')
      }
    ],
    dueDate: new Date('2024-09-12T23:59:59Z'),
    estimatedHours: 16,
    actualHours: 8,
    createdAt: new Date('2024-08-30T09:00:00Z'),
    updatedAt: new Date('2024-09-04T16:00:00Z'),
    createdBy: 'test-user-1',
    updatedBy: 'test-user-1'
  },
  {
    id: 'drag-test-5',
    title: '🎨 デザインタスク（複数タグ）',
    description: 'UIデザインの作成タスクです。複数のタグが付与されており、視覚的にリッチな表示になっています。',
    status: 'in_progress',
    priority: 'medium',
    projectId: 'test-project-2',
    assigneeId: 'test-user-2',
    tags: [dragTestTags[1], dragTestTags[2]],
    subtasks: [
      {
        id: 'sub-drag-8',
        title: 'ワイヤーフレーム作成',
        completed: true,
        createdAt: new Date('2024-08-28T09:00:00Z'),
        updatedAt: new Date('2024-08-30T17:00:00Z')
      }
    ],
    dueDate: new Date('2024-09-20T23:59:59Z'),
    estimatedHours: 20,
    actualHours: 12,
    createdAt: new Date('2024-08-28T10:00:00Z'),
    updatedAt: new Date('2024-09-04T17:00:00Z'),
    createdBy: 'test-user-2',
    updatedBy: 'test-user-2'
  },

  // Done: 3件
  {
    id: 'drag-test-6',
    title: '✅ 完了タスク（実績時間付き）',
    description: '完了したタスクです。見積もり時間と実績時間の両方が記録されており、実際の作業効率を確認できます。',
    status: 'done',
    priority: 'medium',
    projectId: 'test-project-1',
    assigneeId: 'test-user-1',
    tags: [dragTestTags[0]],
    subtasks: [
      {
        id: 'sub-drag-9',
        title: 'テスト計画',
        completed: true,
        createdAt: new Date('2024-08-25T09:00:00Z'),
        updatedAt: new Date('2024-08-26T15:00:00Z')
      },
      {
        id: 'sub-drag-10',
        title: 'テスト実行',
        completed: true,
        createdAt: new Date('2024-08-27T09:00:00Z'),
        updatedAt: new Date('2024-08-28T16:00:00Z')
      }
    ],
    dueDate: new Date('2024-08-30T23:59:59Z'),
    estimatedHours: 8,
    actualHours: 6,
    createdAt: new Date('2024-08-25T08:00:00Z'),
    updatedAt: new Date('2024-08-29T10:00:00Z'),
    createdBy: 'test-user-1',
    updatedBy: 'test-user-1'
  },
  {
    id: 'drag-test-7',
    title: '🎯 テストケース完了',
    description: 'テストケースの作成と実行が完了したタスクです。品質保証の観点で重要な作業でした。',
    status: 'done',
    priority: 'high',
    projectId: 'test-project-2',
    assigneeId: 'test-user-3',
    tags: [dragTestTags[0], dragTestTags[3]],
    subtasks: [],
    dueDate: new Date('2024-08-28T23:59:59Z'),
    estimatedHours: 6,
    actualHours: 7,
    createdAt: new Date('2024-08-22T14:00:00Z'),
    updatedAt: new Date('2024-08-28T18:00:00Z'),
    createdBy: 'test-user-3',
    updatedBy: 'test-user-3'
  },
  {
    id: 'drag-test-8',
    title: '📊 レポート作成完了',
    description: '月次レポートの作成が完了しました。統計データの集計と分析を含む包括的なレポートです。',
    status: 'done',
    priority: 'low',
    projectId: 'test-project-1',
    assigneeId: 'test-user-2',
    tags: [dragTestTags[1]],
    subtasks: [
      {
        id: 'sub-drag-11',
        title: 'データ収集',
        completed: true,
        createdAt: new Date('2024-08-20T09:00:00Z'),
        updatedAt: new Date('2024-08-21T17:00:00Z')
      },
      {
        id: 'sub-drag-12',
        title: 'データ分析',
        completed: true,
        createdAt: new Date('2024-08-22T09:00:00Z'),
        updatedAt: new Date('2024-08-24T16:00:00Z')
      }
    ],
    dueDate: new Date('2024-08-31T23:59:59Z'),
    estimatedHours: 10,
    actualHours: 9,
    createdAt: new Date('2024-08-20T08:00:00Z'),
    updatedAt: new Date('2024-08-26T15:30:00Z'),
    createdBy: 'test-user-2',
    updatedBy: 'test-user-2'
  }
];

// テストケース定義
export interface TestCase {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  expectedBehavior: string;
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  type: 'visual' | 'api' | 'state';
  description: string;
  validator: (context: any) => boolean;
}

export const testCases: TestCase[] = [
  {
    id: 'basic-drag-test',
    name: '基本ドラッグテスト',
    description: 'Todo→In Progress→Done の基本的な移動',
    tasks: dragTestTasks,
    expectedBehavior: 'スムーズなドラッグ&ドロップと即座のUI更新',
    validationRules: [
      {
        type: 'visual',
        description: 'ドラッグ中にタスクカードがプレビュー表示される',
        validator: () => true
      },
      {
        type: 'state',
        description: 'ドロップ後にタスクのステータスが更新される',
        validator: () => true
      },
      {
        type: 'api',
        description: 'moveTask APIが呼び出される',
        validator: () => true
      }
    ]
  },
  {
    id: 'reverse-drag-test',
    name: '逆方向ドラッグテスト',
    description: 'Done→In Progress→Todo の逆方向移動',
    tasks: dragTestTasks,
    expectedBehavior: '逆方向の移動も正常に動作',
    validationRules: [
      {
        type: 'visual',
        description: 'ドロップ可能領域がハイライト表示される',
        validator: () => true
      },
      {
        type: 'state',
        description: 'ステータスが正しく更新される',
        validator: () => true
      }
    ]
  },
  {
    id: 'complex-task-drag-test',
    name: '複雑タスクドラッグテスト',
    description: 'サブタスクや複数タグを持つタスクの移動',
    tasks: dragTestTasks.filter(task => task.subtasks.length > 0 || task.tags.length > 1),
    expectedBehavior: '複雑なタスクでも正常にドラッグ&ドロップできる',
    validationRules: [
      {
        type: 'visual',
        description: 'タスクの詳細情報が維持される',
        validator: () => true
      },
      {
        type: 'state',
        description: 'サブタスクとタグが保持される',
        validator: () => true
      }
    ]
  }
];

// ヘルパー関数
export const getTasksByStatus = (tasks: Task[] = dragTestTasks): Record<Exclude<TaskStatus, 'archived'>, Task[]> => {
  return {
    todo: tasks.filter(task => task.status === 'todo'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    done: tasks.filter(task => task.status === 'done')
  };
};

export const generateTestTask = (overrides?: Partial<Task>): Task => {
  const baseTask: Task = {
    id: `test-${Date.now()}`,
    title: '生成されたテストタスク',
    description: 'このタスクは動的に生成されました',
    status: 'todo',
    priority: 'medium',
    projectId: 'test-project-dynamic',
    assigneeId: 'test-user-dynamic',
    tags: [dragTestTags[0]],
    subtasks: [],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
    estimatedHours: 4,
    actualHours: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'test-system',
    updatedBy: 'test-system'
  };

  return { ...baseTask, ...overrides };
};

export const createTestScenario = (scenarioType: 'basic' | 'complex' | 'edge'): Task[] => {
  switch (scenarioType) {
    case 'basic':
      // 基本シナリオ: サブタスクが少ない（0-1個）、タグが少ない（1-2個）
      return dragTestTasks.filter(task => task.subtasks.length <= 1 && task.tags.length <= 2);
    case 'complex':
      // 複雑シナリオ: サブタスクが多い（2個以上）、または複数タグ（3個以上）
      return dragTestTasks.filter(task => task.subtasks.length >= 2 || task.tags.length >= 3);
    case 'edge':
      return [
        ...dragTestTasks.filter(task => task.description && task.description.length > 100),
        generateTestTask({ priority: 'critical', tags: dragTestTags })
      ];
    default:
      return dragTestTasks;
  }
};

// デバッグ情報用の統計計算
export const getDragTestStats = () => {
  const todoTasks = dragTestTasks.filter(task => task.status === 'todo');
  const inProgressTasks = dragTestTasks.filter(task => task.status === 'in_progress');
  const doneTasks = dragTestTasks.filter(task => task.status === 'done');
  
  return {
    total: dragTestTasks.length,
    todo: todoTasks.length,
    inProgress: inProgressTasks.length,
    done: doneTasks.length,
    withSubtasks: dragTestTasks.filter(task => task.subtasks.length > 0).length,
    withMultipleTags: dragTestTasks.filter(task => task.tags.length > 1).length,
    priorityDistribution: {
      urgent: dragTestTasks.filter(task => task.priority === 'urgent').length,
      high: dragTestTasks.filter(task => task.priority === 'high').length,
      medium: dragTestTasks.filter(task => task.priority === 'medium').length,
      low: dragTestTasks.filter(task => task.priority === 'low').length
    }
  };
};