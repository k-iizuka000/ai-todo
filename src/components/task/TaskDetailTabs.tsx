/**
 * タスク詳細のタブコンポーネント
 */

import React, { useState } from 'react';
import { Button, Input, Badge } from '@/components/ui';
import { Plus, MessageCircle, Trash2 } from 'lucide-react';
import type { TaskDetail, TaskComment, ExtendedSubtask } from '@/types/task';
import { useTaskStore } from '../../stores/taskStore';

interface TaskDetailTabsProps {
  task: TaskDetail;
  activeTab: 'subtasks' | 'comments' | 'history';
  onTabChange: (tab: 'subtasks' | 'comments' | 'history') => void;
  onUpdate?: (updates: Partial<TaskDetail>) => void;
}

export const TaskDetailTabs: React.FC<TaskDetailTabsProps> = ({
  task,
  activeTab,
  onTabChange,
  onUpdate
}) => {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  
  // Zustandストアからサブタスク管理機能を取得
  const { addSubtask } = useTaskStore();
  
  // ExtendedSubtaskとしてサブタスクを取得
  const extendedSubtasks = (task.subtasks as unknown as ExtendedSubtask[]) || [];

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    
    // Zustandストアを使用してサブタスクを追加
    addSubtask(task.id, {
      title: newSubtaskTitle,
      description: '',
      priority: 'medium'
    });
    
    setNewSubtaskTitle('');
    setIsAddingSubtask(false);
  };

  const handleSubtaskStatusToggle = (subtaskId: string) => {
    // ExtendedSubtaskのステータス更新はTaskDetailView側で処理
    // ここでは依存関係のため、簡単な切り替えだけ実装
    const subtask = extendedSubtasks.find(s => s.id === subtaskId);
    if (!subtask) return;
    
    // ステータスをサイクルさせる
    const newStatus = 
      subtask.status === 'todo' ? 'in_progress' :
      subtask.status === 'in_progress' ? 'done' :
      'todo';
      
    // TaskDetailを通じて更新するためのユーティリティ関数
    const updatedSubtasks = extendedSubtasks.map(s => 
      s.id === subtaskId 
        ? { ...s, status: newStatus, completed: newStatus === 'done' }
        : s
    );
    
    onUpdate?.({ 
      subtasks: updatedSubtasks as unknown as TaskDetail['subtasks']
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = extendedSubtasks.filter(subtask => subtask.id !== subtaskId);
    onUpdate?.({ 
      subtasks: updatedSubtasks as unknown as TaskDetail['subtasks']
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      taskId: task.id,
      userId: 'current-user',
      userName: 'Current User',
      content: newComment,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedComments = [...task.comments, comment];
    onUpdate?.({ comments: updatedComments });
    
    setNewComment('');
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return '📝';
      case 'status_changed':
        return '🔄';
      case 'priority_changed':
        return '⚠️';
      case 'comment_added':
        return '💬';
      case 'subtask_added':
        return '➕';
      default:
        return '📋';
    }
  };

  const getActionText = (action: string, changes: Record<string, any>) => {
    switch (action) {
      case 'created':
        return 'タスクを作成しました';
      case 'status_changed':
        return `ステータスを「${changes.from}」から「${changes.to}」に変更しました`;
      case 'priority_changed':
        return `優先度を「${changes.from}」から「${changes.to}」に変更しました`;
      case 'comment_added':
        return 'コメントを追加しました';
      case 'subtask_added':
        return `サブタスク「${changes.subtaskTitle}」を追加しました`;
      default:
        return 'アクションを実行しました';
    }
  };

  const completedSubtasks = extendedSubtasks.filter(subtask => subtask.status === 'done').length;
  const totalSubtasks = extendedSubtasks.length;

  return (
    <div className="w-96 flex flex-col border-l bg-gray-50 dark:bg-gray-800">
      {/* タブヘッダー */}
      <div className="flex border-b bg-white dark:bg-gray-900">
        <button
          onClick={() => onTabChange('subtasks')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'subtasks'
              ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          サブタスク ({totalSubtasks})
        </button>
        <button
          onClick={() => onTabChange('comments')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'comments'
              ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          コメント ({task.comments.length})
        </button>
        <button
          onClick={() => onTabChange('history')}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          履歴
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'subtasks' && (
          <div className="space-y-4">
            {/* 進捗表示 */}
            {totalSubtasks > 0 && (
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">進捗</span>
                  <span className="text-sm text-gray-600">
                    {completedSubtasks}/{totalSubtasks} 完了
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* サブタスク一覧 */}
            <div className="space-y-2">
              {extendedSubtasks.map((subtask) => (
                <div key={subtask.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <button
                    onClick={() => handleSubtaskStatusToggle(subtask.id)}
                    className={`w-4 h-4 border-2 rounded flex items-center justify-center text-xs font-bold ${
                      subtask.status === 'done' 
                        ? 'bg-green-500 border-green-500 text-white'
                        : subtask.status === 'in_progress'
                        ? 'bg-yellow-500 border-yellow-500 text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {subtask.status === 'done' ? '✓' : 
                     subtask.status === 'in_progress' ? '○' : ''}
                  </button>
                  <div className="flex-1">
                    <span
                      className={`text-sm ${
                        subtask.status === 'done'
                          ? 'line-through text-gray-500'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {subtask.title}
                    </span>
                    {subtask.description && (
                      <p className="text-xs text-gray-500 mt-1">{subtask.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {subtask.priority !== 'medium' && (
                        <Badge 
                          variant={subtask.priority === 'high' || subtask.priority === 'urgent' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {subtask.priority}
                        </Badge>
                      )}
                      {subtask.dueDate && (
                        <span className="text-xs text-gray-500">
                          {subtask.dueDate.toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    className="p-1 h-6 w-6 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* サブタスク追加 */}
            <div className="space-y-2">
              {isAddingSubtask ? (
                <div className="space-y-2">
                  <Input
                    placeholder="サブタスクのタイトルを入力..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSubtask();
                      if (e.key === 'Escape') {
                        setIsAddingSubtask(false);
                        setNewSubtaskTitle('');
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddSubtask}>
                      追加
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingSubtask(false);
                        setNewSubtaskTitle('');
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={() => setIsAddingSubtask(true)}
                  className="w-full justify-start text-gray-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  サブタスクを追加
                </Button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* コメント一覧 */}
            <div className="space-y-3">
              {task.comments.map((comment) => (
                <div key={comment.id} className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {comment.userName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium">{comment.userName}</span>
                    <span className="text-xs text-gray-500">
                      {comment.createdAt.toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>

            {/* コメント追加 */}
            <div className="space-y-2">
              <textarea
                placeholder="コメントを入力..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                コメントを追加
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {task.history.map((entry) => (
              <div key={entry.id} className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getActionIcon(entry.action)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{entry.userName}</span>
                      <span className="text-xs text-gray-500">
                        {entry.timestamp.toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {getActionText(entry.action, entry.changes)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};