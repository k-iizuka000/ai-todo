/**
 * 通知のモックデータ
 */

import { Notification, NotificationType, NotificationPriority } from '../types/notification';

// 通知データ生成用のヘルパー関数
const createNotification = (
  id: string,
  type: NotificationType,
  priority: NotificationPriority,
  title: string,
  message: string,
  isRead: boolean,
  daysAgo: number,
  hour: number = 9,
  minute: number = 0,
  actionUrl?: string,
  metadata?: { [key: string]: any }
): Notification => {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  createdAt.setHours(hour, minute, 0, 0); // 秒とミリ秒も固定

  return {
    id,
    type,
    priority,
    title,
    message,
    isRead,
    createdAt,
    actionUrl,
    metadata
  };
};

// モック通知データ（15件） - 内部的に時系列でソート済み
const unsortedNotifications: Notification[] = [
  createNotification(
    'notif-1',
    'task_deadline',
    'high',
    'タスクの期限が近づいています',
    'ユーザー認証機能の実装の期限まで残り2日です',
    false,
    0,
    14,
    30,
    '/dashboard/task-1',
    { taskId: 'task-1', projectId: 'project-1' }
  ),
  createNotification(
    'notif-2',
    'task_assigned',
    'medium',
    '新しいタスクが割り当てられました',
    '田中さんからダッシュボード画面の不具合修正が割り当てられました',
    false,
    0,
    13,
    15,
    '/dashboard/task-4',
    { taskId: 'task-4', projectId: 'project-1', userId: 'user-2' }
  ),
  createNotification(
    'notif-3',
    'task_completed',
    'low',
    'タスクが完了しました',
    '佐藤さんがタスク管理画面のUIデザインを完了しました',
    false,
    0,
    11,
    45,
    '/dashboard/task-2',
    { taskId: 'task-2', projectId: 'project-1', userId: 'user-2' }
  ),
  createNotification(
    'notif-4',
    'mention',
    'medium',
    'コメントでメンションされました',
    '鈴木さんがプロジェクト作成機能の実装についてあなたをメンションしました',
    true,
    1,
    16,
    20,
    '/dashboard/task-6',
    { taskId: 'task-6', projectId: 'project-1', userId: 'user-3' }
  ),
  createNotification(
    'notif-5',
    'project_update',
    'medium',
    'プロジェクトが更新されました',
    'Webアプリケーション開発プロジェクトの設定が変更されました',
    true,
    1,
    10,
    0,
    '/projects/project-1',
    { projectId: 'project-1' }
  ),
  createNotification(
    'notif-6',
    'system',
    'low',
    'システムメンテナンスのお知らせ',
    '2024年2月25日 2:00-4:00にシステムメンテナンスを実施します',
    true,
    2,
    9,
    30,
    undefined,
    { maintenanceDate: '2024-02-25T02:00:00Z' }
  ),
  createNotification(
    'notif-7',
    'task_deadline',
    'medium',
    'タスクの期限が近づいています',
    'データベースのパフォーマンス最適化の期限まで残り5日です',
    true,
    2,
    15,
    30,
    '/dashboard/task-3',
    { taskId: 'task-3', projectId: 'project-2' }
  ),
  createNotification(
    'notif-8',
    'task_assigned',
    'high',
    '緊急タスクが割り当てられました',
    '山田さんからセキュリティ監査の実施が緊急タスクとして割り当てられました',
    true,
    3,
    8,
    45,
    '/dashboard/task-10',
    { taskId: 'task-10', projectId: 'project-2', userId: 'user-1' }
  ),
  createNotification(
    'notif-9',
    'task_completed',
    'low',
    'サブタスクが完了しました',
    'APIエンドポイントの設計が完了しました',
    true,
    3,
    17,
    0,
    '/dashboard/task-1',
    { taskId: 'task-1', subtaskId: 'subtask-1', projectId: 'project-1' }
  ),
  createNotification(
    'notif-10',
    'mention',
    'medium',
    'タスクのコメントでメンションされました',
    '佐藤さんがモバイル対応の改善について質問しています',
    true,
    4,
    12,
    15,
    '/dashboard/task-7',
    { taskId: 'task-7', projectId: 'project-3', userId: 'user-2' }
  ),
  createNotification(
    'notif-11',
    'project_update',
    'low',
    'プロジェクトメンバーが追加されました',
    'APIドキュメント作成プロジェクトに新しいメンバーが参加しました',
    true,
    4,
    18,
    30,
    '/projects/project-2',
    { projectId: 'project-2', newMemberId: 'user-4' }
  ),
  createNotification(
    'notif-12',
    'system',
    'medium',
    'アップデートのお知らせ',
    'タスク管理機能に新しい機能が追加されました',
    true,
    5,
    10,
    0,
    '/updates',
    { version: '1.2.0' }
  ),
  createNotification(
    'notif-13',
    'task_deadline',
    'high',
    '期限を過ぎたタスクがあります',
    'データエクスポート機能の期限が過ぎています',
    true,
    6,
    16,
    45,
    '/dashboard/task-11',
    { taskId: 'task-11', projectId: 'project-3', overdue: true }
  ),
  createNotification(
    'notif-14',
    'task_completed',
    'low',
    'プロジェクトのタスクが完了しました',
    'ダークモードの実装がすべて完了しました',
    true,
    6,
    14,
    20,
    '/dashboard/task-12',
    { taskId: 'task-12', projectId: 'project-1' }
  ),
  createNotification(
    'notif-15',
    'mention',
    'low',
    'プロジェクトの議論でメンションされました',
    '来週のリリース計画について意見を求められています',
    true,
    7,
    11,
    30,
    '/projects/project-1/discussions',
    { projectId: 'project-1', discussionId: 'disc-1' }
  )
];

// 時系列順（新しいものが先）にソートしたmockデータをエクスポート
export const mockNotifications: Notification[] = unsortedNotifications
  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

// 通知統計の計算用ヘルパー関数
export const getNotificationStats = (notifications: Notification[] = mockNotifications) => {
  const total = notifications.length;
  const unread = notifications.filter(notification => !notification.isRead).length;
  const read = notifications.filter(notification => notification.isRead).length;
  
  return {
    total,
    unread,
    read,
    unreadRate: total > 0 ? Math.round((unread / total) * 100) : 0
  };
};

// 優先度別の統計
export const getNotificationPriorityStats = (notifications: Notification[] = mockNotifications) => {
  const high = notifications.filter(notification => notification.priority === 'high').length;
  const medium = notifications.filter(notification => notification.priority === 'medium').length;
  const low = notifications.filter(notification => notification.priority === 'low').length;
  
  return { high, medium, low };
};

// タイプ別の統計
export const getNotificationTypeStats = (notifications: Notification[] = mockNotifications) => {
  const taskDeadline = notifications.filter(notification => notification.type === 'task_deadline').length;
  const taskAssigned = notifications.filter(notification => notification.type === 'task_assigned').length;
  const taskCompleted = notifications.filter(notification => notification.type === 'task_completed').length;
  const mention = notifications.filter(notification => notification.type === 'mention').length;
  const projectUpdate = notifications.filter(notification => notification.type === 'project_update').length;
  const system = notifications.filter(notification => notification.type === 'system').length;
  
  return {
    taskDeadline,
    taskAssigned,
    taskCompleted,
    mention,
    projectUpdate,
    system
  };
};

// 未読通知のみを取得
export const getUnreadNotifications = (notifications: Notification[] = mockNotifications) => {
  return notifications.filter(notification => !notification.isRead);
};

// 最新の通知を取得（指定した件数）
export const getRecentNotifications = (count: number = 5, notifications: Notification[] = mockNotifications) => {
  return notifications
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, count);
};

// 特定のタイプの通知を取得
export const getNotificationsByType = (type: NotificationType, notifications: Notification[] = mockNotifications) => {
  return notifications.filter(notification => notification.type === type);
};

// 特定の優先度の通知を取得
export const getNotificationsByPriority = (priority: NotificationPriority, notifications: Notification[] = mockNotifications) => {
  return notifications.filter(notification => notification.priority === priority);
};