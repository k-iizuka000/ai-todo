import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Input, 
  Badge,
  StatusBadge,
  PriorityBadge,
  ArchivedTasksSection
} from '@/components/ui';
import { Plus, Search, Filter, Columns, List, X } from 'lucide-react';
import { TagBadge } from '@/components/tag/TagBadge';
import { useTagStore } from '@/stores/tagStore';
import { useTaskStore } from '@/stores/taskStore';
import type { Task, TaskStatus, TaskDetail, CreateTaskInput } from '@/types/task';
import { Tag } from '@/types/tag';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import TaskDetailView from '@/components/task/TaskDetailView';
import { TaskCreateModal } from '@/components/task/TaskCreateModal';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { mockTasks, mockTags } from '@/mock/tasks';
import { mockTodayTasks, getTaskDetail } from '@/mock/taskDetails';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'AND' | 'OR'>('OR');
  const [showTagFilter, setShowTagFilter] = useState(false);
  
  // タグストアから利用可能なタグを取得
  const { tags: availableTags } = useTagStore();
  
  // タスクストア - 通常のパターンを使用
  const { tasks: tasksFromStore, addTask, isLoading, error } = useTaskStore();
  
  // URLからタスクページの種類を判定
  const pageType = location.pathname.includes('/today') ? 'today' : 
                   location.pathname.includes('/important') ? 'important' :
                   location.pathname.includes('/completed') ? 'completed' : 'all';
  
  // URLクエリパラメータからタグフィルターを初期化
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const tagParam = searchParams.get('tags');
      const modeParam = searchParams.get('tagMode');
      
      // タグIDのバリデーション
      const tagIds = tagParam 
        ? tagParam.split(',').filter(id => id && typeof id === 'string' && id.startsWith('tag-'))
        : [];
      
      // モードのバリデーション
      const mode = (modeParam === 'AND' || modeParam === 'OR') ? modeParam : 'OR';
      
      if (tagIds.length > 0) {
        setSelectedTags(tagIds);
        setTagFilterMode(mode);
        setShowTagFilter(true);
      }
    } catch (error) {
      console.warn('Failed to parse URL parameters for tag filters:', error);
      // エラー時はデフォルト状態に戻す
      setSelectedTags([]);
      setTagFilterMode('OR');
      setShowTagFilter(false);
    }
  }, [location.search]);
  
  // タグフィルタリング機能の実装（パフォーマンス最適化）
  const filterTasksByTags = useCallback((tasks: Task[], tagIds: string[], mode: 'AND' | 'OR'): Task[] => {
    if (tagIds.length === 0) return tasks;
    
    // 大量タグ選択時のパフォーマンス最適化: SetでO(1)検索
    const tagIdSet = new Set(tagIds);
    
    return tasks.filter(task => {
      // タスクのタグIDを事前にSetに変換してO(1)検索を可能にする
      const taskTagIdSet = new Set(task.tags.map(tag => tag.id));
      
      if (mode === 'AND') {
        // すべてのタグが含まれること（早期リターンでパフォーマンス向上）
        for (const tagId of tagIdSet) {
          if (!taskTagIdSet.has(tagId)) {
            return false;
          }
        }
        return true;
      } else {
        // いずれかのタグが含まれること（早期リターンでパフォーマンス向上）
        for (const tagId of tagIdSet) {
          if (taskTagIdSet.has(tagId)) {
            return true;
          }
        }
        return false;
      }
    });
  }, []);
  
  // 検索機能の実装
  const filterTasksBySearch = useCallback((tasks: Task[], query: string): Task[] => {
    if (!query.trim()) return tasks;
    
    const lowerQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery) ||
      task.tags.some(tag => tag.name.toLowerCase().includes(lowerQuery))
    );
  }, []);
  
  // ページタイプに基づくタスク取得をメモ化（パフォーマンス最適化）
  const baseTasksByPage = useMemo(() => {
    const allTasks = tasksFromStore.length > 0 ? tasksFromStore : mockTasks; // フォールバック
    
    switch (pageType) {
      case 'today':
        // 今日のタスク: 今日が期限のもの、または今日作成されたもの
        const today = new Date().toISOString().split('T')[0];
        return allTasks.filter(task => 
          (task.dueDate && task.dueDate.startsWith(today)) ||
          (task.createdAt && task.createdAt.startsWith(today))
        );
      case 'important':
        return allTasks.filter(task => task.priority === 'urgent' || task.priority === 'high');
      case 'completed':
        return allTasks.filter(task => task.status === 'done');
      default:
        return allTasks;
    }
  }, [pageType, tasksFromStore]);

  // アクティブタスクのみを抽出（設計書2.2: activeTasksOnlyのメモ化実装）
  const activeTasksOnly = useMemo(() => 
    baseTasksByPage.filter(task => task.status !== 'archived'),
    [baseTasksByPage]
  );

  // 表示するタスクを決定（メモ化とパフォーマンス最適化）
  const displayTasks = useMemo(() => {
    let tasks = activeTasksOnly;
    
    // フィルターが設定されていない場合は早期リターン
    if (selectedTags.length === 0 && !searchQuery.trim()) {
      return tasks;
    }
    
    // タグフィルタリングを適用
    if (selectedTags.length > 0) {
      tasks = filterTasksByTags(tasks, selectedTags, tagFilterMode);
    }
    
    // 検索フィルタリングを適用
    if (searchQuery.trim()) {
      tasks = filterTasksBySearch(tasks, searchQuery);
    }
    
    return tasks;
  }, [activeTasksOnly, selectedTags, tagFilterMode, searchQuery, filterTasksByTags, filterTasksBySearch]);

  // アーカイブセクション用のタスクを取得（baseTasksByPageを再利用）
  const allTasksForArchived = useMemo(() => {
    let tasks = baseTasksByPage;
    
    // アーカイブタスクにもフィルターを適用
    if (selectedTags.length > 0) {
      tasks = filterTasksByTags(tasks, selectedTags, tagFilterMode);
    }
    
    if (searchQuery.trim()) {
      tasks = filterTasksBySearch(tasks, searchQuery);
    }
    
    return tasks;
  }, [baseTasksByPage, selectedTags, tagFilterMode, searchQuery, filterTasksByTags, filterTasksBySearch]);
  
  // ページタイトルを決定
  const getPageTitle = (): string => {
    switch (pageType) {
      case 'today':
        return '今日のタスク';
      case 'important':
        return '重要なタスク';
      case 'completed':
        return '完了済みタスク';
      default:
        return 'ダッシュボード';
    }
  };

  // URLパラメータからタスク詳細を表示する効果
  useEffect(() => {
    let isMounted = true; // メモリリーク防止用のフラグ
    
    const pathParts = location.pathname.split('/');
    const taskId = pathParts[pathParts.length - 1];
    
    // taskIdがUUID形式の場合、タスク詳細を表示
    if (taskId && taskId.startsWith('task-')) {
      const taskDetail = getTaskDetail(taskId);
      if (taskDetail && !showTaskDetailModal && isMounted) {
        setSelectedTask(taskDetail);
        setShowTaskDetailModal(true);
      }
    } else if (showTaskDetailModal && !taskId.startsWith('task-') && isMounted) {
      // URLにタスクIDがない場合はモーダルを閉じる
      setShowTaskDetailModal(false);
      setSelectedTask(null);
    }
    
    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [location.pathname, showTaskDetailModal]);

  const handleTaskMove = (_taskId: string, _newStatus: TaskStatus) => {
    // TODO: タスクのステータス更新処理
  };

  const handleTaskClick = (task: Task) => {
    console.log('Task clicked:', task.id, task.title);
    
    let taskDetail = getTaskDetail(task.id);
    
    // フォールバック: TaskDetailが見つからない場合、Taskから基本的なTaskDetailを作成
    if (!taskDetail) {
      console.log('TaskDetail not found, converting from Task:', task);
      taskDetail = {
        ...task,
        comments: [],
        attachments: [],
        history: [],
        childTasks: []
      };
    }
    
    console.log('Opening modal with TaskDetail:', taskDetail);
    setSelectedTask(taskDetail);
    setShowTaskDetailModal(true);
    
    // URLを更新してタスク詳細表示を反映
    const currentPath = location.pathname;
    const newPath = currentPath.endsWith('/') ? `${currentPath}${task.id}` : `${currentPath}/${task.id}`;
    navigate(newPath, { replace: true });
  };

  const handleTaskCreate = async (task: CreateTaskInput) => {
    try {
      console.log('新しいタスクを作成:', task);
      addTask(task);
      console.log('タスク作成完了:', task);
      setShowCreateModal(false);
      // Note: taskStore will automatically update the display
    } catch (error) {
      console.error('タスク作成エラー:', error);
    }
  };

  const handleAddTask = (_status: TaskStatus) => {
    setShowCreateModal(true);
    // TODO: 指定ステータスでのタスク作成
  };

  const handleTaskUpdate = (_taskId: string, _updates: Partial<Task>) => {
    // TODO: タスクの更新処理（Mockの場合はログ出力のみ）
  };

  const handleSubtaskToggle = (_subtaskId: string, _completed: boolean) => {
    // TODO: サブタスクの完了状態切り替え
  };

  const handleSubtaskAdd = (_title: string) => {
    // TODO: サブタスクの追加
  };

  const handleSubtaskDelete = (_subtaskId: string) => {
    // TODO: サブタスクの削除
  };

  const handleTaskDelete = (_taskId: string) => {
    // TODO: タスクの削除
    setShowTaskDetailModal(false);
    setSelectedTask(null);
  };

  const handleCloseTaskDetail = () => {
    // 状態を強制的にリセット
    setShowTaskDetailModal(false);
    setSelectedTask(null);
    
    // URLからタスクIDを削除して元のページに戻る
    const pathParts = location.pathname.split('/');
    if (pathParts[pathParts.length - 1].startsWith('task-')) {
      const newPath = pathParts.slice(0, -1).join('/');
      navigate(newPath, { replace: true });
    }
  };
  
  // タグフィルター関連のハンドラー
  const handleTagSelect = useCallback((tagId: string) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // URLクエリパラメータを更新
      const searchParams = new URLSearchParams(location.search);
      if (newTags.length > 0) {
        searchParams.set('tags', newTags.join(','));
        searchParams.set('tagMode', tagFilterMode);
      } else {
        searchParams.delete('tags');
        searchParams.delete('tagMode');
      }
      
      const newSearch = searchParams.toString();
      const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
      navigate(newUrl, { replace: true });
      
      return newTags;
    });
  }, [location.pathname, location.search, navigate, tagFilterMode]);
  
  const handleTagFilterModeChange = useCallback((mode: 'AND' | 'OR') => {
    setTagFilterMode(mode);
    
    if (selectedTags.length > 0) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('tagMode', mode);
      
      const newSearch = searchParams.toString();
      const newUrl = `${location.pathname}?${newSearch}`;
      navigate(newUrl, { replace: true });
    }
  }, [selectedTags.length, location.pathname, location.search, navigate]);
  
  const handleClearTagFilters = useCallback(() => {
    setSelectedTags([]);
    setShowTagFilter(false);
    
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('tags');
    searchParams.delete('tagMode');
    
    const newSearch = searchParams.toString();
    const newUrl = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    navigate(newUrl, { replace: true });
  }, [location.pathname, location.search, navigate]);
  
  // プロジェクトクリック時のハンドラー（グループ4: Phase 3指摘事項対応）
  const handleProjectClick = useCallback((projectId: string) => {
    // プロジェクトページに遷移するか、プロジェクト詳細を表示する
    // 現在の実装では、プロジェクト管理ページに遷移
    navigate(`/projects/${projectId}`);
  }, [navigate]);
  
  // 選択中タグの表示用データ
  const selectedTagsData = useMemo(() => 
    selectedTags.map(tagId => mockTags.find(tag => tag.id === tagId)).filter(Boolean) as Tag[],
    [selectedTags]
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
        <div className="flex gap-2">
          {/* 表示モード切り替え */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新しいタスク
          </Button>
        </div>
      </div>

      {/* 検索とフィルター */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="タスクを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="タスクを検索"
              role="searchbox"
            />
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => setShowTagFilter(!showTagFilter)}
          aria-expanded={showTagFilter}
          aria-controls="tag-filter-panel"
          aria-label={`タグフィルター${selectedTags.length > 0 ? `（${selectedTags.length}件選択中）` : ''}`}
        >
          <Filter className="h-4 w-4 mr-2" />
          タグフィルター
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* タグフィルター */}
      {showTagFilter && (
        <div id="tag-filter-panel" className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6" role="region" aria-label="タグフィルターパネル">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">タグで絞り込み</h3>
            <div className="flex items-center gap-2" role="radiogroup" aria-label="タグフィルターモード">
              <div className="flex items-center gap-1">
                <input
                  type="radio"
                  id="tag-mode-or"
                  name="tag-mode"
                  value="OR"
                  checked={tagFilterMode === 'OR'}
                  onChange={() => handleTagFilterModeChange('OR')}
                  className="text-blue-600"
                  aria-describedby="tag-mode-or-desc"
                />
                <label htmlFor="tag-mode-or" className="text-sm">いずれか</label>
                <span id="tag-mode-or-desc" className="sr-only">選択されたタグのいずれかが含まれるタスクを表示</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="radio"
                  id="tag-mode-and"
                  name="tag-mode"
                  value="AND"
                  checked={tagFilterMode === 'AND'}
                  onChange={() => handleTagFilterModeChange('AND')}
                  className="text-blue-600"
                  aria-describedby="tag-mode-and-desc"
                />
                <label htmlFor="tag-mode-and" className="text-sm">すべて</label>
                <span id="tag-mode-and-desc" className="sr-only">選択されたタグがすべて含まれるタスクを表示</span>
              </div>
              {selectedTags.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearTagFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                  クリア
                </Button>
              )}
            </div>
          </div>
          
          {/* 選択中のタグ */}
          {selectedTagsData.length > 0 && (
            <div className="mb-3" role="region" aria-label="選択中のタグ">
              <div className="text-xs text-gray-600 mb-2" id="selected-tags-label">選択中:</div>
              <div className="flex flex-wrap gap-2" role="list" aria-labelledby="selected-tags-label">
                {selectedTagsData.map((tag) => (
                  <div key={tag.id} role="listitem">
                    <TagBadge
                      tag={tag}
                      size="sm"
                      showRemove={true}
                      onRemove={() => handleTagSelect(tag.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 利用可能なタグ */}
          <div role="region" aria-label="利用可能なタグ">
            <div className="text-xs text-gray-600 mb-2" id="available-tags-label">利用可能なタグ:</div>
            <div className="flex flex-wrap gap-2" role="list" aria-labelledby="available-tags-label">
              {availableTags
                .filter(tag => !selectedTags.includes(tag.id))
                .map((tag) => (
                  <div key={tag.id} role="listitem">
                    <TagBadge
                      tag={tag}
                      size="sm"
                      onClick={() => handleTagSelect(tag.id)}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* コンテンツエリア */}
      <div className="flex-1 min-h-0">
        {viewMode === 'kanban' ? (
          <>
            <KanbanBoard
              tasks={displayTasks}
              onTaskMove={handleTaskMove}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
              onTagClick={handleTagSelect}
              onProjectClick={handleProjectClick}
              className="h-[calc(100vh-20rem)]"
            />
            {/* 設計書2.1: カンバンビューにアーカイブセクションを追加 */}
            <div className="mt-6">
              <ArchivedTasksSection
                tasks={allTasksForArchived}
                storageKey="dashboard-kanban"
                onTaskClick={handleTaskClick}
                onTagSelect={handleTagSelect}
                onProjectClick={handleProjectClick}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              {displayTasks.map((task) => (
                <Card key={task.id} variant="interactive" onClick={() => handleTaskClick(task)}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <div className="flex gap-2">
                        <StatusBadge status={task.status} />
                        <PriorityBadge priority={task.priority} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-3">{task.description}</p>
                    <div className="flex items-center gap-2">
                      {task.tags.map((tag) => (
                        <TagBadge 
                          key={tag.id} 
                          tag={tag} 
                          size="sm"
                          onClick={() => handleTagSelect(tag.id)}
                        />
                      ))}
                      {task.dueDate && (
                        <span className="text-sm text-muted-foreground ml-auto">
                          期限: {task.dueDate.toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {/* リストビューのアーカイブセクション */}
            <div className="mt-6">
              <ArchivedTasksSection
                tasks={allTasksForArchived}
                storageKey="dashboard-list"
                onTaskClick={handleTaskClick}
                onTagSelect={handleTagSelect}
                onProjectClick={handleProjectClick}
              />
            </div>
          </>
        )}
      </div>

      {/* 新規タスク作成モーダル */}
      <TaskCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onTaskCreate={handleTaskCreate}
      />

      {/* タスク詳細モーダル */}
      <TaskDetailModal
        isOpen={showTaskDetailModal}
        onClose={handleCloseTaskDetail}
        task={selectedTask}
        editable={true}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        availableTags={availableTags}
        onProjectClick={handleProjectClick}
      />
    </div>
  );
};

export default Dashboard;