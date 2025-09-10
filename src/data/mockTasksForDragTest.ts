/**
 * Issue 033: ドラッグ&ドロップテスト専用モックデータ
 * 目的: 固定データを用いたドラッグ&ドロップ機能検証環境の提供
 */

import { Task, TaskStatus } from '@/types/task';
import { Tag } from '@/types/tag';

// テスト用タグデータ
export const testTags: Tag[] = [
  { id: 'test-tag-1', name: 'テスト', color: '#FF6B6B', createdAt: new Date(), updatedAt: new Date() },
  { id: 'test-tag-2', name: 'デザイン', color: '#4ECDC4', createdAt: new Date(), updatedAt: new Date() },
  { id: 'test-tag-3', name: 'UI', color: '#45B7D1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'test-tag-4', name: '開発', color: '#96CEB4', createdAt: new Date(), updatedAt: new Date() },
  { id: 'test-tag-5', name: '緊急', color: '#FFEAA7', createdAt: new Date(), updatedAt: new Date() }
];

/**
 * ドラッグ&ドロップテスト専用タスクデータ（8件構成）
 * 各ステータス（todo: 3件, in_progress: 2件, done: 3件）で多様な設定を持つタスク
 */
export const dragTestTasks: Task[] = [
  // === TODO: 3件 ===
  {
    id: 'drag-test-1',
    title: '🚀 高優先度タスク（ドラッグテスト用）',
    description: 'ドラッグ&ドロップ機能のテスト用に作成された高優先度タスクです。視覚的に分かりやすい絵文字とカラフルなタグを含みます。',
    status: 'todo',
    priority: 'URGENT',
    projectId: 'test-project-1',
    assigneeId: 'test-user-1',
    tags: [testTags[0]!, testTags[4]!], // テスト + 緊急
    subtasks: [],
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2日後
    estimatedHours: 8,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1時間前
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-admin'
  },
  {
    id: 'drag-test-2',
    title: '📝 中優先度タスク（サブタスクあり）',
    description: 'サブタスクを含むテストタスクです。サブタスクの完了状況も含めてドラッグ&ドロップの動作を確認できます。',
    status: 'todo',
    priority: 'MEDIUM',
    projectId: 'test-project-2',
    assigneeId: 'test-user-2',
    tags: [testTags[0]!, testTags[3]!], // テスト + 開発
    subtasks: [
      { 
        id: 'sub-1', 
        title: 'サブタスク1（未完了）', 
        completed: false, 
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) 
      },
      { 
        id: 'sub-2', 
        title: 'サブタスク2（完了済み）', 
        completed: true, 
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) 
      }
    ],
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5日後
    estimatedHours: 4,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前
    updatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30分前
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-2'
  },
  {
    id: 'drag-test-3',
    title: '🔧 低優先度タスク（長い説明テキスト付き）',
    description: '長いテキストの表示とドラッグ動作の確認用タスクです。テキストが長い場合でもドラッグ操作が正常に動作することを確認します。このテキストは意図的に長くしており、タスクカードの表示領域を超える可能性があります。ドラッグ&ドロップ時にレイアウトが崩れないことや、長文が適切に省略表示されることを確認する目的があります。また、スクロール可能な領域でのドラッグ操作も同時に検証します。',
    status: 'todo',
    priority: 'LOW',
    projectId: undefined, // プロジェクト未設定のケース
    assigneeId: undefined, // 担当者未設定のケース
    tags: [testTags[0]!], // テストタグのみ
    subtasks: [],
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10日後
    estimatedHours: 2,
    actualHours: undefined,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1日前
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-admin'
  },

  // === IN PROGRESS: 2件 ===
  {
    id: 'drag-test-4',
    title: '⚡ 進行中タスク（プロジェクト付き）',
    description: 'プロジェクトが割り当てられた進行中のタスクです。プロジェクトバッジの表示とドラッグ操作の組み合わせを確認できます。',
    status: 'in_progress',
    priority: 'HIGH',
    projectId: 'test-project-1',
    assigneeId: 'test-user-3',
    tags: [testTags[0]!, testTags[3]!], // テスト + 開発
    subtasks: [
      { 
        id: 'sub-3', 
        title: '分析フェーズ', 
        completed: true, 
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) 
      },
      { 
        id: 'sub-4', 
        title: '実装フェーズ', 
        completed: false, 
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) 
      }
    ],
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後
    estimatedHours: 16,
    actualHours: 8, // 実績時間の設定
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5日前
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2時間前
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-3'
  },
  {
    id: 'drag-test-5',
    title: '🎨 デザインタスク（複数タグ）',
    description: '複数のタグが付いたデザインタスクです。タグ表示の多様性とドラッグ操作時の見た目を確認できます。',
    status: 'in_progress',
    priority: 'MEDIUM',
    projectId: 'test-project-2',
    assigneeId: 'test-user-1',
    tags: [testTags[1]!, testTags[2]!, testTags[0]!], // デザイン + UI + テスト
    subtasks: [],
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4日後
    estimatedHours: 6,
    actualHours: 3,
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4日前
    updatedAt: new Date(Date.now() - 15 * 60 * 1000), // 15分前
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-1'
  },

  // === DONE: 3件 ===
  {
    id: 'drag-test-6',
    title: '✅ 完了タスク（実績時間付き）',
    description: '実績時間が記録された完了タスクです。見積もり時間と実績時間の比較も表示されます。',
    status: 'done',
    priority: 'HIGH',
    projectId: 'test-project-1',
    assigneeId: 'test-user-2',
    tags: [testTags[0]!, testTags[3]!], // テスト + 開発
    subtasks: [
      { 
        id: 'sub-5', 
        title: '要件定義', 
        completed: true, 
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) 
      },
      { 
        id: 'sub-6', 
        title: '実装', 
        completed: true, 
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) 
      },
      { 
        id: 'sub-7', 
        title: 'テスト', 
        completed: true, 
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) 
      }
    ],
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1日前（期限済み）
    estimatedHours: 8,
    actualHours: 6, // 見積もりより早く完了
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10日前
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1日前（完了時）
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-2'
  },
  {
    id: 'drag-test-7',
    title: '🎯 テストケース完了',
    description: 'テストケースの作成と実行が完了したタスクです。品質保証活動の一環として実施されました。',
    status: 'done',
    priority: 'MEDIUM',
    projectId: 'test-project-2',
    assigneeId: 'test-user-3',
    tags: [testTags[0]!], // テストタグのみ
    subtasks: [
      { 
        id: 'sub-8', 
        title: 'テストケース設計', 
        completed: true, 
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) 
      },
      { 
        id: 'sub-9', 
        title: 'テスト実行', 
        completed: true, 
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), 
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) 
      }
    ],
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前（期限済み）
    estimatedHours: 4,
    actualHours: 4, // 見積もり通り
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8日前
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2日前（完了時）
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-3'
  },
  {
    id: 'drag-test-8',
    title: '📊 レポート作成完了',
    description: 'プロジェクトの進捗レポート作成が完了しました。ステークホルダーへの報告準備も整いました。',
    status: 'done',
    priority: 'LOW',
    projectId: undefined, // プロジェクト未設定のケース
    assigneeId: 'test-user-1',
    tags: [testTags[0]!], // テストタグのみ
    subtasks: [],
    dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前（期限済み）
    estimatedHours: 3,
    actualHours: 5, // 見積もりより時間がかかったケース
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3日前（完了時）
    createdBy: 'test-user-admin',
    updatedBy: 'test-user-1'
  }
];

/**
 * テストケース定義
 * 各種ドラッグ&ドロップパターンの期待動作を定義
 */
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
    description: 'Todo→In Progress→Done の基本的な移動パターンを検証',
    tasks: dragTestTasks,
    expectedBehavior: 'スムーズなドラッグ&ドロップと即座のUI更新、視覚的フィードバックの表示',
    validationRules: [
      {
        type: 'visual',
        description: 'ドラッグ中にプレビューが表示される',
        validator: (context) => context.dragPreview && context.dragPreview.visible
      },
      {
        type: 'visual', 
        description: 'ドロップゾーンがハイライトされる',
        validator: (context) => context.dropZone && context.dropZone.highlighted
      },
      {
        type: 'state',
        description: 'タスクのステータスが即座に更新される',
        validator: (context) => context.task && context.task.status === context.targetStatus
      },
      {
        type: 'api',
        description: 'API呼び出しが成功する',
        validator: (context) => context.apiCall && context.apiCall.success
      }
    ]
  },
  {
    id: 'complex-drag-test',
    name: '複合ドラッグテスト',
    description: 'サブタスクやタグ付きタスクの移動パターンを検証',
    tasks: dragTestTasks.filter(task => task.subtasks.length > 0 || task.tags.length > 1),
    expectedBehavior: 'サブタスクやタグ情報を保持したまま正常に移動',
    validationRules: [
      {
        type: 'state',
        description: 'サブタスクの状態が保持される',
        validator: (context) => context.task && context.task.subtasks.length === context.originalSubtaskCount
      },
      {
        type: 'state',
        description: 'タグ情報が保持される', 
        validator: (context) => context.task && context.task.tags.length === context.originalTagCount
      },
      {
        type: 'visual',
        description: 'プロジェクトバッジが維持される',
        validator: (context) => context.task && context.task.projectId === context.originalProjectId
      }
    ]
  },
  {
    id: 'edge-case-test',
    name: 'エッジケーステスト',
    description: 'プロジェクト未設定、担当者未設定などの特殊ケースを検証',
    tasks: dragTestTasks.filter(task => !task.projectId || !task.assigneeId),
    expectedBehavior: '未設定項目があっても正常に移動処理が実行される',
    validationRules: [
      {
        type: 'state',
        description: '未設定フィールドがnullまたはundefinedのまま保持される',
        validator: (context) => context.task && (context.task.projectId === undefined || context.task.assigneeId === undefined)
      },
      {
        type: 'visual',
        description: '未設定項目のUI表示が適切',
        validator: (context) => context.ui && !context.ui.hasInvalidDisplay
      }
    ]
  }
];

/**
 * ステータス別タスク取得ヘルパー関数
 * @param tasks タスク配列
 * @returns ステータス別にグループ化されたタスク
 */
export const getTasksByStatus = (tasks: Task[]): Record<Exclude<TaskStatus, 'archived'>, Task[]> => {
  return {
    todo: tasks.filter(task => task.status === 'todo'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    done: tasks.filter(task => task.status === 'done')
  };
};

/**
 * テストタスク生成ヘルパー関数
 * @param overrides 上書きしたいプロパティ
 * @returns 生成されたテストタスク
 */
export const generateTestTask = (overrides?: Partial<Task>): Task => {
  const timestamp = Date.now();
  const baseTask: Task = {
    id: `generated-task-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
    title: `生成されたテストタスク ${timestamp}`,
    description: 'generateTestTask関数で動的に生成されたタスクです。',
    status: 'todo',
    priority: 'MEDIUM',
    projectId: undefined,
    assigneeId: undefined,
    tags: [testTags[0]!], // デフォルトでテストタグを付与
    subtasks: [],
    createdAt: new Date(timestamp),
    updatedAt: new Date(timestamp),
    createdBy: 'test-generator',
    updatedBy: 'test-generator'
  };

  return { ...baseTask, ...overrides };
};

/**
 * テストシナリオ作成ヘルパー関数
 * @param scenarioType シナリオタイプ
 * @returns シナリオに適したタスク配列
 */
export const createTestScenario = (scenarioType: 'basic' | 'complex' | 'edge'): Task[] => {
  switch (scenarioType) {
    case 'basic':
      // 基本的な各ステータス1件ずつのシンプルなシナリオ
      return [
        dragTestTasks.find(t => t.id === 'drag-test-1')!, // todo
        dragTestTasks.find(t => t.id === 'drag-test-4')!, // in_progress
        dragTestTasks.find(t => t.id === 'drag-test-6')!  // done
      ];
    case 'complex':
      // サブタスクやタグが多いタスクを含むシナリオ
      return dragTestTasks.filter(task => 
        task.subtasks.length > 0 || task.tags.length > 1 || task.projectId
      );
    case 'edge':
      // プロジェクトや担当者が未設定などのエッジケース
      return dragTestTasks.filter(task => 
        !task.projectId || !task.assigneeId || task.description!.length > 100
      );
    default:
      return dragTestTasks;
  }
};

/**
 * デバッグ用ログ出力ヘルパー
 * @param operation 操作名
 * @param task 対象タスク
 * @param details 詳細情報
 */
export const logDragOperation = (operation: string, task: Task, details?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DragTest] ${operation}:`, {
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      timestamp: new Date().toISOString(),
      details
    });
  }
};