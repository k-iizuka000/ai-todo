/**
 * サブタスクリスト - サブタスクの一覧表示と操作
 */

import React, { useState } from 'react';
import { Subtask } from '../../types/task';
import ProgressIndicator from './ProgressIndicator';

interface SubTaskListProps {
  /** サブタスクリスト */
  subtasks: Subtask[];
  /** サブタスク完了状態変更時のコールバック */
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  /** サブタスク削除時のコールバック */
  onSubtaskDelete?: (subtaskId: string) => void;
  /** サブタスク追加時のコールバック */
  onSubtaskAdd?: (title: string) => void;
  /** 編集可能かどうか */
  editable?: boolean;
  /** 折り畳み可能かどうか */
  collapsible?: boolean;
  /** 初期状態で折り畳まれているか */
  initialCollapsed?: boolean;
}

const SubTaskList: React.FC<SubTaskListProps> = ({
  subtasks,
  onSubtaskToggle,
  onSubtaskDelete,
  onSubtaskAdd,
  editable = false,
  collapsible = false,
  initialCollapsed = false
}) => {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const completedCount = subtasks.filter(subtask => subtask.completed).length;
  const totalCount = subtasks.length;

  const handleSubtaskToggle = (subtaskId: string, completed: boolean) => {
    onSubtaskToggle?.(subtaskId, completed);
  };

  const handleSubtaskDelete = (subtaskId: string) => {
    if (window.confirm('このサブタスクを削除しますか？')) {
      onSubtaskDelete?.(subtaskId);
    }
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onSubtaskAdd?.(newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setIsAddingSubtask(false);
      setNewSubtaskTitle('');
    }
  };

  if (subtasks.length === 0 && !editable) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* ヘッダー */}
      <div 
        className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${
          collapsible ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' : ''
        }`}
        onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {collapsible && (
              <button
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={collapsed ? '展開' : '折りたたみ'}
              >
                <svg
                  className={`w-4 h-4 transform transition-transform ${collapsed ? '' : 'rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              サブタスク ({completedCount}/{totalCount})
            </h3>
          </div>
          
          {editable && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingSubtask(true);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              + 追加
            </button>
          )}
        </div>

        {/* プログレスバー */}
        {totalCount > 0 && (
          <div className="mt-2">
            <ProgressIndicator
              completed={completedCount}
              total={totalCount}
              size="small"
              hidePercentage={true}
            />
          </div>
        )}
      </div>

      {/* コンテンツ */}
      {!collapsed && (
        <div className="p-4">
          {/* サブタスクリスト */}
          {subtasks.length > 0 ? (
            <div className="space-y-2">
              {subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <button
                    onClick={() => handleSubtaskToggle(subtask.id, !subtask.completed)}
                    className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      subtask.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                    }`}
                    disabled={!editable}
                  >
                    {subtask.completed && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  
                  <span
                    className={`flex-1 text-sm ${
                      subtask.completed
                        ? 'line-through text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {subtask.title}
                  </span>
                  
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(subtask.updatedAt).toLocaleDateString()}
                  </span>
                  
                  {editable && (
                    <button
                      onClick={() => handleSubtaskDelete(subtask.id)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                      aria-label="削除"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : editable ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              サブタスクがありません。「+ 追加」ボタンから追加してください。
            </p>
          ) : null}

          {/* 新しいサブタスク追加 */}
          {isAddingSubtask && (
            <div className="mt-3 flex items-center space-x-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="サブタスクのタイトルを入力"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setIsAddingSubtask(false);
                  setNewSubtaskTitle('');
                }}
                className="px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubTaskList;