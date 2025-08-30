/**
 * タスク詳細機能用のモックデータ
 */

import type { TaskDetail, TaskComment, TaskAttachment, TaskHistory } from '@/types/task';
import { mockTasks } from './tasks';

// コメントのモックデータ
const mockComments: TaskComment[] = [
  {
    id: 'comment-1',
    taskId: 'task-1',
    userId: 'user-1',
    userName: '田中太郎',
    content: 'API設計について確認が必要です。エンドポイントの命名規則を統一しましょう。',
    createdAt: new Date('2024-01-16T10:30:00Z'),
    updatedAt: new Date('2024-01-16T10:30:00Z'),
    mentions: ['user-2']
  },
  {
    id: 'comment-2',
    taskId: 'task-1',
    userId: 'user-2',
    userName: '山田花子',
    content: '@田中太郎 了解です。RESTful APIの規約に従って設計します。',
    createdAt: new Date('2024-01-16T11:00:00Z'),
    updatedAt: new Date('2024-01-16T11:00:00Z')
  },
  {
    id: 'comment-3',
    taskId: 'task-2',
    userId: 'user-3',
    userName: '佐藤次郎',
    content: 'UIのレスポンシブ対応を進めています。タブレット表示の確認をお願いします。',
    createdAt: new Date('2024-01-17T09:15:00Z'),
    updatedAt: new Date('2024-01-17T09:15:00Z')
  }
];

// 添付ファイルのモックデータ
const mockAttachments: TaskAttachment[] = [
  {
    id: 'attachment-1',
    taskId: 'task-1',
    fileName: 'api-design.pdf',
    fileSize: 1024000,
    fileType: 'application/pdf',
    url: '/files/api-design.pdf',
    uploadedBy: 'user-1',
    uploadedAt: new Date('2024-01-15T14:00:00Z')
  },
  {
    id: 'attachment-2',
    taskId: 'task-1',
    fileName: 'sequence-diagram.png',
    fileSize: 512000,
    fileType: 'image/png',
    url: '/files/sequence-diagram.png',
    uploadedBy: 'user-2',
    uploadedAt: new Date('2024-01-16T09:00:00Z')
  },
  {
    id: 'attachment-3',
    taskId: 'task-2',
    fileName: 'ui-mockup.figma',
    fileSize: 2048000,
    fileType: 'application/figma',
    url: '/files/ui-mockup.figma',
    uploadedBy: 'user-3',
    uploadedAt: new Date('2024-01-17T10:30:00Z')
  }
];

// 履歴のモックデータ
const mockHistory: TaskHistory[] = [
  {
    id: 'history-1',
    taskId: 'task-1',
    userId: 'user-1',
    userName: '田中太郎',
    action: 'created',
    changes: {},
    timestamp: new Date('2024-01-15T09:00:00Z')
  },
  {
    id: 'history-2',
    taskId: 'task-1',
    userId: 'user-1',
    userName: '田中太郎',
    action: 'status_changed',
    changes: { from: 'todo', to: 'in_progress' },
    timestamp: new Date('2024-01-15T10:00:00Z')
  },
  {
    id: 'history-3',
    taskId: 'task-1',
    userId: 'user-2',
    userName: '山田花子',
    action: 'priority_changed',
    changes: { from: 'medium', to: 'high' },
    timestamp: new Date('2024-01-16T08:30:00Z')
  },
  {
    id: 'history-4',
    taskId: 'task-1',
    userId: 'user-1',
    userName: '田中太郎',
    action: 'subtask_added',
    changes: { subtaskTitle: 'APIエンドポイントの設計' },
    timestamp: new Date('2024-01-16T11:30:00Z')
  },
  {
    id: 'history-5',
    taskId: 'task-2',
    userId: 'user-3',
    userName: '佐藤次郎',
    action: 'created',
    changes: {},
    timestamp: new Date('2024-01-17T08:00:00Z')
  },
  {
    id: 'history-6',
    taskId: 'task-2',
    userId: 'user-3',
    userName: '佐藤次郎',
    action: 'comment_added',
    changes: { comment: 'UIのレスポンシブ対応を進めています' },
    timestamp: new Date('2024-01-17T09:15:00Z')
  }
];

// タスク詳細のモックデータ生成
export const mockTaskDetails: TaskDetail[] = mockTasks.slice(0, 6).map((task, index) => ({
  ...task,
  comments: mockComments.filter(comment => comment.taskId === task.id),
  attachments: mockAttachments.filter(attachment => attachment.taskId === task.id),
  history: mockHistory.filter(history => history.taskId === task.id),
  parentTask: undefined,
  childTasks: (task.subtasks || []).map((subtask, subIndex) => ({
    id: subtask.id,
    title: subtask.title,
    description: `${subtask.title}の詳細説明です。このサブタスクは親タスク「${task.title}」の一部として実行されます。`,
    status: subtask.completed ? 'done' : ['todo', 'in_progress'][subIndex % 2] as any,
    priority: ['low', 'medium', 'high'][subIndex % 3] as any,
    projectId: task.projectId,
    assigneeId: task.assigneeId,
    tags: task.tags.slice(0, 2), // 親タスクのタグを一部継承
    subtasks: [], // サブタスクの下にはさらなるサブタスクは作らない
    dueDate: task.dueDate ? new Date(task.dueDate.getTime() - (subIndex + 1) * 24 * 60 * 60 * 1000) : undefined,
    estimatedHours: Math.floor(Math.random() * 4) + 1,
    actualHours: subtask.completed ? Math.floor(Math.random() * 3) + 1 : 0,
    createdAt: subtask.createdAt,
    updatedAt: subtask.updatedAt,
    createdBy: task.createdBy,
    updatedBy: task.updatedBy
  }))
}));

// 今日のタスク用の特別なモックデータ
export const mockTodayTasks: TaskDetail[] = mockTaskDetails.filter(task => {
  const today = new Date();
  const taskDate = task.dueDate || task.updatedAt;
  return taskDate.toDateString() === today.toDateString() ||
         task.status === 'in_progress' ||
         task.priority === 'urgent' ||
         task.priority === 'high';
}).slice(0, 4);

// 特定のタスクIDでタスク詳細を取得するヘルパー関数
/**
 * TaskをTaskDetailに変換する関数
 * グループ1: 基本モーダル実装のためのシンプルな変換機能
 */
export const convertTaskToTaskDetail = (task: any): TaskDetail => {
  return {
    ...task,
    comments: [],
    attachments: [],
    history: [],
    childTasks: [],
    // Date型の確実な変換
    createdAt: task.createdAt instanceof Date ? task.createdAt : new Date(task.createdAt),
    updatedAt: task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt),
    dueDate: task.dueDate ? (task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate)) : undefined
  } as TaskDetail;
};

export const getTaskDetail = (taskId: string): TaskDetail | undefined => {
  // 1. まずmockデータから検索
  const mockDetail = mockTaskDetails.find(task => task.id === taskId);
  if (mockDetail) {
    return mockDetail;
  }
  
  // 2. 実際に作成されたタスクから検索（useTaskStoreから取得）
  try {
    // localStorageから直接取得する（簡易実装）
    const taskStorage = localStorage.getItem('task-storage');
    if (taskStorage) {
      const parsed = JSON.parse(taskStorage);
      const tasks = parsed?.state?.tasks || [];
      const foundTask = tasks.find((task: any) => task.id === taskId);
      if (foundTask) {
        return convertTaskToTaskDetail(foundTask);
      }
    }
  } catch (error) {
    console.warn('Failed to get task from storage:', error);
  }
  
  return undefined;
};

// 今日のタスクを取得するヘルパー関数
export const getTodayTasks = (): TaskDetail[] => {
  return mockTodayTasks;
};