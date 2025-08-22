/**
 * サブタスクフィルターコンポーネント
 * サブタスクの絞り込み機能を提供
 */

import React, { useState } from 'react';
import { TaskStatus, Priority } from '../../types/task';

export interface SubtaskFilterOptions {
  status?: TaskStatus[];
  priority?: Priority[];
  parentTaskIds?: string[];
  search?: string;
  completedOnly?: boolean;
  incompleteOnly?: boolean;
}

interface SubtaskFiltersProps {
  filters: SubtaskFilterOptions;
  onFiltersChange: (filters: SubtaskFilterOptions) => void;
  availableParentTasks?: Array<{ id: string; title: string }>;
  className?: string;
}

export const SubtaskFilters: React.FC<SubtaskFiltersProps> = ({
  filters,
  onFiltersChange,
  availableParentTasks = [],
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // ステータスフィルターの変更
  const handleStatusChange = (status: TaskStatus, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status);
    
    onFiltersChange({
      ...filters,
      status: newStatuses.length > 0 ? newStatuses : undefined
    });
  };

  // 優先度フィルターの変更
  const handlePriorityChange = (priority: Priority, checked: boolean) => {
    const currentPriorities = filters.priority || [];
    const newPriorities = checked
      ? [...currentPriorities, priority]
      : currentPriorities.filter(p => p !== priority);
    
    onFiltersChange({
      ...filters,
      priority: newPriorities.length > 0 ? newPriorities : undefined
    });
  };

  // 親タスクフィルターの変更
  const handleParentTaskChange = (taskId: string, checked: boolean) => {
    const currentParentTaskIds = filters.parentTaskIds || [];
    const newParentTaskIds = checked
      ? [...currentParentTaskIds, taskId]
      : currentParentTaskIds.filter(id => id !== taskId);
    
    onFiltersChange({
      ...filters,
      parentTaskIds: newParentTaskIds.length > 0 ? newParentTaskIds : undefined
    });
  };

  // 検索フィルターの変更
  const handleSearchChange = (search: string) => {
    onFiltersChange({
      ...filters,
      search: search.trim() || undefined
    });
  };

  // 完了状態フィルターの変更
  const handleCompletionFilterChange = (type: 'completed' | 'incomplete' | 'all') => {
    const updates: Partial<SubtaskFilterOptions> = {};
    
    switch (type) {
      case 'completed':
        updates.completedOnly = true;
        updates.incompleteOnly = false;
        break;
      case 'incomplete':
        updates.completedOnly = false;
        updates.incompleteOnly = true;
        break;
      case 'all':
        updates.completedOnly = false;
        updates.incompleteOnly = false;
        break;
    }
    
    onFiltersChange({ ...filters, ...updates });
  };

  // フィルターをクリア
  const handleClearFilters = () => {
    onFiltersChange({});
  };

  // アクティブなフィルターの数を計算
  const activeFiltersCount = [
    filters.status?.length || 0,
    filters.priority?.length || 0,
    filters.parentTaskIds?.length || 0,
    filters.search ? 1 : 0,
    filters.completedOnly ? 1 : 0,
    filters.incompleteOnly ? 1 : 0,
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* フィルターヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">フィルター</h3>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFiltersCount}
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title={isExpanded ? '折りたたむ' : '展開する'}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 検索フィルター（常に表示） */}
      <div className="px-4 py-3">
        <input
          type="text"
          placeholder="サブタスクを検索..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* 展開可能なフィルター */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 完了状態フィルター */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">完了状態</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleCompletionFilterChange('all')}
                className={`px-3 py-1 text-xs rounded ${
                  !filters.completedOnly && !filters.incompleteOnly
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => handleCompletionFilterChange('completed')}
                className={`px-3 py-1 text-xs rounded ${
                  filters.completedOnly
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                完了のみ
              </button>
              <button
                onClick={() => handleCompletionFilterChange('incomplete')}
                className={`px-3 py-1 text-xs rounded ${
                  filters.incompleteOnly
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                未完了のみ
              </button>
            </div>
          </div>

          {/* ステータスフィルター */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">ステータス</label>
            <div className="space-y-1">
              {(['todo', 'in_progress', 'done'] as TaskStatus[]).map(status => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status) || false}
                    onChange={(e) => handleStatusChange(status, e.target.checked)}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-xs text-gray-700">
                    {status === 'todo' && '未着手'}
                    {status === 'in_progress' && '進行中'}
                    {status === 'done' && '完了'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 優先度フィルター */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">優先度（親タスク）</label>
            <div className="space-y-1">
              {(['low', 'medium', 'high', 'urgent', 'critical'] as Priority[]).map(priority => (
                <label key={priority} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.priority?.includes(priority) || false}
                    onChange={(e) => handlePriorityChange(priority, e.target.checked)}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-xs text-gray-700">
                    {priority === 'low' && '低'}
                    {priority === 'medium' && '中'}
                    {priority === 'high' && '高'}
                    {priority === 'urgent' && '緊急'}
                    {priority === 'critical' && '最重要'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 親タスクフィルター */}
          {availableParentTasks.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">親タスク</label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableParentTasks.map(task => (
                  <label key={task.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.parentTaskIds?.includes(task.id) || false}
                      onChange={(e) => handleParentTaskChange(task.id, e.target.checked)}
                      className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-xs text-gray-700 truncate" title={task.title}>
                      {task.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* クリアボタン */}
          {activeFiltersCount > 0 && (
            <button
              onClick={handleClearFilters}
              className="w-full px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              フィルターをクリア
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SubtaskFilters;