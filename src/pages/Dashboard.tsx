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
import { useProjectStore } from '@/stores/projectStore';
import { useKanbanTasks } from '@/hooks/useKanbanTasks';
import { useTaskActions } from '@/hooks/useTaskActions';
import type { Task, TaskStatus, TaskDetail, CreateTaskInput } from '@/types/task';
import { Tag } from '@/types/tag';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { TaskCreateModal } from '@/components/task/TaskCreateModal';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';

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
  const { tags: availableTags, initialize: initializeTagStore } = useTagStore();
  
  // タスクストア - 通常のパターンを使用（Archive用の基本データ取得）
  const { tasks: tasksFromStore, addTask, updateTask, error, clearError, initializeStore, isInitialized, isLoading } = useTaskStore();
  
  // プロジェクトストア - プロジェクト情報の管理
  const { projects, loadProjects, isLoading: projectsLoading } = useProjectStore();
  
  // タスク操作フック
  const { removeTask } = useTaskActions();
  
  // URLからタスクページの種類を判定
  const pageType = location.pathname.includes('/today') ? 'today' : 
                   location.pathname.includes('/important') ? 'important' :
                   location.pathname.includes('/completed') ? 'completed' : 'all';
  
  // URLクエリパラメータからタグフィルターを初期化 - 設計書適合版
  useEffect(() => {
    let isMounted = true;
    
    try {
      const searchParams = new URLSearchParams(location.search);
      const tagParam = searchParams.get('tags');
      const modeParam = searchParams.get('tagMode');
      
      // タグIDのバリデーション - より詳細なチェック
      const tagIds = tagParam 
        ? tagParam.split(',').filter(id => {
            if (!id || typeof id !== 'string') return false;
            if (!id.startsWith('tag-')) return false;
            // 追加: タグIDの長さと形式チェック
            return id.length > 4 && /^tag-[a-zA-Z0-9-_]+$/.test(id);
          })
        : [];
      
      // モードのバリデーション - より厳密なチェック
      const mode = (modeParam === 'AND' || modeParam === 'OR') ? modeParam : 'OR';
      
      // 状態更新前のマウント確認
      if (isMounted) {
        if (tagIds.length > 0) {
          setSelectedTags(tagIds);
          setTagFilterMode(mode);
          setShowTagFilter(true);
        } else {
          // パラメータが無効または空の場合はクリア
          setSelectedTags([]);
          setTagFilterMode('OR');
          setShowTagFilter(false);
        }
      }
    } catch (error) {
      if (isMounted) {
        console.warn('Failed to parse URL parameters for tag filters:', error);
        // エラー時はデフォルト状態に戻す
        setSelectedTags([]);
        setTagFilterMode('OR');
        setShowTagFilter(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [location.search]);

  // タスクストアの初期化処理
  useEffect(() => {
    let isMounted = true;

    // まだ初期化されていない場合のみ実行
    if (!isInitialized) {
      const initializeTasks = async () => {
        try {
          await initializeStore();
        } catch (error) {
          if (isMounted) {
            console.error('[Dashboard] Failed to initialize task store:', error);
          }
        }
      };

      initializeTasks();
    }

    return () => {
      isMounted = false;
    };
  }, [isInitialized, initializeStore]);
  
  // プロジェクトストアの初期化処理
  useEffect(() => {
    let isMounted = true;

    const initializeProjects = async () => {
      try {
        await loadProjects();
      } catch (error) {
        if (isMounted) {
          console.error('[Dashboard] Failed to initialize project store:', error);
        }
      }
    };

    // プロジェクトが存在しない、または空の場合に初期化
    if (projects.length === 0 && !projectsLoading) {
      initializeProjects();
    }

    return () => {
      isMounted = false;
    };
  }, [projects.length, projectsLoading, loadProjects]);

  // タグストアの初期化処理
  useEffect(() => {
    let isMounted = true;

    const initializeTags = async () => {
      try {
        await initializeTagStore();
      } catch (error) {
        if (isMounted) {
          console.error('[Dashboard] Failed to initialize tag store:', error);
        }
      }
    };

    // タグが存在しない場合に初期化
    if (availableTags.length === 0) {
      initializeTags();
    }

    return () => {
      isMounted = false;
    };
  }, [availableTags.length, initializeTagStore]);
  
  // リストビュー用のフィルタリング済みタスク（KanbanBoardと同じロジック）
  const { tasks: filteredTasksForList } = useKanbanTasks({
    searchQuery,
    selectedTags,
    tagFilterMode,
    pageType
  });
  
  // ArchivedTasksSection用のタスクデータ（モックフォールバック削除）
  const archivedTasksForDisplay = useMemo(() => {
    // サーバがcreatedAt DESCで返せない場合はクライアントでソートを強制
    return [...tasksFromStore].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime(); // DESC: 新しい順
    });
  }, [tasksFromStore]);
  
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
    
    // taskIdが有効な場合（CUID/ULID形式など）、タスク詳細を表示
    const fixedPaths = ['today', 'important', 'completed', 'demo', 'dashboard'];
    const isValidTaskId = taskId && 
      /^[a-zA-Z0-9]{10,}$/.test(taskId) && 
      !fixedPaths.includes(taskId);
    
    if (isValidTaskId) {
      const task = tasksFromStore.find(t => t.id === taskId);
      if (task && !showTaskDetailModal && isMounted) {
        // TaskからTaskDetailを作成
        const taskDetail: TaskDetail = {
          ...task,
          subtasks: [], // 現在の実装ではサブタスクは空配列
          comments: [], // 現在の実装ではコメントは空配列
          attachments: [], // 現在の実装では添付ファイルは空配列
        };
        setSelectedTask(taskDetail);
        setShowTaskDetailModal(true);
      }
    } else if (showTaskDetailModal && !isValidTaskId && isMounted) {
      // URLにタスクIDがない場合はモーダルを閉じる
      setShowTaskDetailModal(false);
      setSelectedTask(null);
    }
    
    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [location.pathname, tasksFromStore]);

  // 設計書対応: KanbanBoardが直接状態管理するため、handleTaskMoveは不要
  // タスク移動処理はuseTaskActions内のmoveTaskで処理される

  const handleTaskClick = useCallback((task: Task) => {
    // AbortControllerを使用した中断可能な処理に変更
    const abortController = new AbortController();
    let isOperationActive = true;
    
    try {
      
      // 早期中断チェック
      if (abortController.signal.aborted || !isOperationActive) {
        return;
      }
      
      // TaskからTaskDetailを作成
      let taskDetail: TaskDetail = {
        ...task,
        subtasks: [], // 現在の実装ではサブタスクは空配列
        comments: [], // 現在の実装ではコメントは空配列
        attachments: [], // 現在の実装では添付ファイルは空配列
      };
      
      // SessionStorageから一時保存されたサブタスクを復元
      const storageKey = `tempSubtasks_${task.id}`;
      const savedSubtasks = sessionStorage.getItem(storageKey);
      let existingChildTasks = [];
      
      if (savedSubtasks) {
        try {
          existingChildTasks = JSON.parse(savedSubtasks);
          // 日付オブジェクトを復元
          existingChildTasks = existingChildTasks.map((subtask: any) => ({
            ...subtask,
            createdAt: new Date(subtask.createdAt),
            updatedAt: new Date(subtask.updatedAt)
          }));
        } catch (error) {
          console.warn('Failed to parse saved subtasks:', error);
          existingChildTasks = [];
        }
      }
      
      // 復元したサブタスクをtaskDetailに追加
      taskDetail = {
        ...taskDetail,
        childTasks: existingChildTasks
      };
      
      // 状態更新前の中断確認
      if (!abortController.signal.aborted && isOperationActive && taskDetail) {
        setSelectedTask(taskDetail);
        setShowTaskDetailModal(true);
        
        // URLを更新してタスク詳細表示を反映
        const pathParts = location.pathname.split('/').filter(p => p); // 空文字列を除去
        
        // パスの構造を判定
        let newPath: string;
        
        if (pathParts.length === 1 && pathParts[0] === 'dashboard') {
          // /dashboard -> /dashboard/{taskId}
          newPath = `/dashboard/${task.id}`;
        } else if (pathParts.length === 2 && pathParts[0] === 'dashboard') {
          // /dashboard/{something} を判定
          const secondPart = pathParts[1];
          const fixedPaths = ['today', 'important', 'completed', 'demo'];
          const isTaskId = /^[a-zA-Z0-9]{10,}$/.test(secondPart) && !fixedPaths.includes(secondPart);
          if (isTaskId) {
            // /dashboard/{taskId} -> /dashboard/{newTaskId} (置き換え)
            newPath = `/dashboard/${task.id}`;
          } else {
            // /dashboard/today, /dashboard/demo など -> そのまま追加
            newPath = `/dashboard/${secondPart}/${task.id}`;
          }
        } else if (pathParts.length === 3 && pathParts[0] === 'dashboard') {
          // /dashboard/today/{taskId} -> /dashboard/today/{newTaskId} (置き換え)
          newPath = `/dashboard/${pathParts[1]}/${task.id}`;
        } else {
          // その他の場合は /dashboard/{taskId} にフォールバック
          newPath = `/dashboard/${task.id}`;
        }
        
        navigate(newPath, { replace: true });
      }
    } catch (error) {
      if (!abortController.signal.aborted && isOperationActive) {
        console.error('Error in handleTaskClick:', error);
      }
    } finally {
      isOperationActive = false;
    }
  }, [location.pathname, navigate]);

  const handleTaskCreate = useCallback(async (task: CreateTaskInput) => {
    const abortController = new AbortController();
    let isMounted = true;
    
    try {
      
      // 実行前の状態確認
      if (!isMounted || abortController.signal.aborted) {
        return;
      }
      
      clearError(); // useTaskStoreのclearError関数を使用
      
      // API呼び出し前の再確認
      if (isMounted && !abortController.signal.aborted) {
        await addTask(task);
        
        // 完了後の状態更新前確認
        if (isMounted && !abortController.signal.aborted) {
          setShowCreateModal(false);
        }
      }
    } catch (error) {
      if (isMounted && !abortController.signal.aborted) {
        console.error('タスク作成エラー:', error);
        // addTask内でuseTaskStoreのerror状態が自動設定されるため、
        // ここでの明示的なエラー設定は不要
        // モーダルは閉じずにユーザーに再試行の機会を提供
      }
    } finally {
      isMounted = false;
    }
  }, [addTask, clearError]);
  
  // handleTaskCreateの動的isMounted管理用useEffect
  useEffect(() => {
    return () => {
      // コンポーネントアンマウント時の強制クリーンアップ
      // handleTaskCreate内のisMountedフラグは関数スコープで管理されるため
      // ここでは追加のクリーンアップ処理は不要
    };
  }, []);

  const handleAddTask = useCallback((_status: TaskStatus) => {
    setShowCreateModal(true);
  }, []);

  // TaskDetailModalで使用されるハンドラー群 - タスクストア更新でカンバンボードにも反映
  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      // タスクストアを更新（カンバンボードにも反映される）
      await updateTask(taskId, updates);
      
      // モーダルの状態も更新
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Task update failed:', error);
      // エラー時でもモーダルは更新して一貫性を保つ
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
      }
    }
  }, [selectedTask]);

  const handleSubtaskToggle = useCallback(async (subtaskId: string, completed: boolean) => {
    // サブタスクステータスをローカル状態とストアに永続化
    if (selectedTask) {
      const updatedChildTasks = selectedTask.childTasks?.map(subtask => 
        subtask.id === subtaskId 
          ? { ...subtask, status: (completed ? 'DONE' : 'TODO') as TaskStatus, updatedAt: new Date() }
          : subtask
      ) || [];
      
      // ローカル状態更新（即座に反映）
      const updatedTask = { 
        ...selectedTask, 
        childTasks: updatedChildTasks
      };
      setSelectedTask(updatedTask);
      
      // SessionStorageに一時保存
      const storageKey = `tempSubtasks_${selectedTask.id}`;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(updatedChildTasks));
      } catch (error) {
        console.warn('Failed to save subtasks to sessionStorage:', error);
      }
      
      try {
        // タスクストアへも反映（Mock環境のためタイムスタンプのみ更新）
        await updateTask(selectedTask.id, {});
      } catch (error) {
        console.error('[Dashboard] サブタスクステータス更新のストア更新エラー:', error);
        // エラー時もローカル状態は維持
      }
    }
  }, [selectedTask, updateTask]);

  const handleSubtaskAdd = useCallback(async (title: string) => {
    // サブタスクをローカル状態とストアに永続化
    if (selectedTask && title.trim()) {
      const newSubtask: Task = {
        id: `subtask-${Date.now()}`,
        title: title.trim(),
        description: '',
        status: 'TODO' as const,
        priority: 'MEDIUM' as const,
        projectId: selectedTask.projectId || 'no-project',
        assigneeId: selectedTask.assigneeId || 'current-user',
        tags: [],
        subtasks: [],
        estimatedHours: 0,
        actualHours: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user',
        updatedBy: 'current-user'
      };
      const updatedChildTasks = [...(selectedTask.childTasks || []), newSubtask];
      
      // ローカル状態更新（即座に反映）
      const updatedTask = { 
        ...selectedTask, 
        childTasks: updatedChildTasks
      };
      setSelectedTask(updatedTask);
      
      // SessionStorageに一時保存
      const storageKey = `tempSubtasks_${selectedTask.id}`;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(updatedChildTasks));
      } catch (error) {
        console.warn('Failed to save subtasks to sessionStorage:', error);
      }
      
      try {
        // タスクストアへも反映（Mock環境のためタイムスタンプのみ更新）
        await updateTask(selectedTask.id, {});
      } catch (error) {
        console.error('[Dashboard] サブタスク追加のストア更新エラー:', error);
        // エラー時もローカル状態は維持
      }
    }
  }, [selectedTask, updateTask]);

  const handleSubtaskDelete = useCallback(async (subtaskId: string) => {
    // サブタスクをローカル状態とストアから削除
    if (selectedTask) {
      const updatedChildTasks = selectedTask.childTasks?.filter(subtask => subtask.id !== subtaskId) || [];
      
      // ローカル状態更新（即座に反映）
      const updatedTask = { 
        ...selectedTask, 
        childTasks: updatedChildTasks
      };
      setSelectedTask(updatedTask);
      
      // SessionStorageに一時保存
      const storageKey = `tempSubtasks_${selectedTask.id}`;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(updatedChildTasks));
      } catch (error) {
        console.warn('Failed to save subtasks to sessionStorage:', error);
      }
      
      try {
        // タスクストアへも反映（Mock環境のためタイムスタンプのみ更新）
        await updateTask(selectedTask.id, {});
      } catch (error) {
        console.error('[Dashboard] サブタスク削除のストア更新エラー:', error);
        // エラー時もローカル状態は維持
      }
    }
  }, [selectedTask, updateTask]);

  const handleTaskDelete = useCallback(async (taskId: string) => {
    try {
      // API経由でタスクを削除
      await removeTask(taskId);
      
      // 削除成功後にモーダルを閉じてダッシュボードにリダイレクト
      setShowTaskDetailModal(false);
      setSelectedTask(null);
      
      // 削除されたタスクのURLから /dashboard にリダイレクト
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('[Dashboard] タスク削除に失敗:', error);
      // エラーが発生しても一旦モーダルは閉じる（useTaskActionsでエラーハンドリング済み）
      setShowTaskDetailModal(false);
      setSelectedTask(null);
    }
  }, [removeTask, navigate]);

  const handleCloseTaskDetail = useCallback(() => {
    console.log('🔧 Debug: handleCloseTaskDetail が呼ばれました');
    console.log('🔧 Debug: 現在の showTaskDetailModal:', showTaskDetailModal);
    
    // 状態を強制的にリセット
    setShowTaskDetailModal(false);
    setSelectedTask(null);
    
    console.log('🔧 Debug: setShowTaskDetailModal(false) を実行しました');
    
    // URLからタスクIDを削除して元のページに戻る
    const pathParts = location.pathname.split('/');
    const lastPathPart = pathParts[pathParts.length - 1];
    const isTaskIdInUrl = lastPathPart && (lastPathPart.startsWith('task-') || /^\d+$/.test(lastPathPart));
    
    if (isTaskIdInUrl) {
      const newPath = pathParts.slice(0, -1).join('/');
      console.log('🔧 Debug: URL navigation:', newPath);
      navigate(newPath, { replace: true });
    }
  }, [location.pathname, navigate]);
  
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
    selectedTags.map(tagId => availableTags.find(tag => tag.id === tagId)).filter(Boolean) as Tag[],
    [selectedTags, availableTags]
  );

  return (
    <div className="p-6" data-testid="dashboard-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground" data-testid="dashboard-title">{getPageTitle()}</h1>
        <div className="flex gap-2">
          {/* 表示モード切り替え */}
          <div className="flex border rounded-lg p-1" data-testid="view-mode-toggle">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="view-mode-list"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              data-testid="view-mode-kanban"
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowCreateModal(true)} data-testid="create-task-button">
            <Plus className="h-4 w-4 mr-2" />
            新しいタスク
          </Button>
        </div>
      </div>

      {/* 検索とフィルター */}
      <div className="flex gap-4 mb-6" data-testid="search-filter-section">
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
              name="タスクを検索"
              data-testid="search-input"
            />
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => setShowTagFilter(!showTagFilter)}
          aria-expanded={showTagFilter}
          aria-controls="tag-filter-panel"
          aria-label={`タグフィルター${selectedTags.length > 0 ? `（${selectedTags.length}件選択中）` : ''}`}
          data-testid="tag-filter-toggle"
        >
          <Filter className="h-4 w-4 mr-2" />
          タグフィルター
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-2" data-testid="tag-filter-count">
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* タグフィルター */}
      {showTagFilter && (
        <div id="tag-filter-panel" className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6" role="region" aria-label="タグフィルターパネル" data-testid="tag-filter-panel">
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
                  data-testid="clear-tag-filters"
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
            {/* ローディング状態 */}
            {isLoading && !isInitialized && (
              <div className="text-center text-muted-foreground py-8" role="status" aria-live="polite" data-testid="loading-message">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span>タスクを読み込み中...</span>
                </div>
              </div>
            )}
            
            {/* 検索結果なし */}
            {filteredTasksForList.length === 0 && searchQuery.trim() && !isLoading && (
              <div className="text-center text-muted-foreground py-8" role="status" aria-live="polite" data-testid="no-results-message">
                検索結果が見つかりません
              </div>
            )}
            
            {/* 空のタスクリスト */}
            {filteredTasksForList.length === 0 && !searchQuery.trim() && !isLoading && isInitialized && (
              <div className="text-center text-muted-foreground py-8" role="status" aria-live="polite" data-testid="empty-tasks-message">
                タスクがありません。新しいタスクを作成してください。
              </div>
            )}
            
            {/* KanbanBoard - ローディング中でない場合のみ表示 */}
            {!isLoading && (
              <KanbanBoard
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
              onTagClick={handleTagSelect}
              onProjectClick={handleProjectClick}
              className="h-[calc(100vh-20rem)]"
              filters={{
                searchQuery,
                selectedTags,
                tagFilterMode,
                pageType
              }}
              data-testid="kanban-board"
            />
            )}
            {/* 設計書2.1: カンバンビューにアーカイブセクションを追加 */}
            <div className="mt-6">
              <ArchivedTasksSection
                tasks={archivedTasksForDisplay}
                storageKey="dashboard-kanban"
                onTaskClick={handleTaskClick}
                onTagSelect={handleTagSelect}
                onProjectClick={handleProjectClick}
              />
            </div>
          </>
        ) : (
          <>
            {filteredTasksForList.length === 0 && searchQuery.trim() && (
              <div className="text-center text-muted-foreground py-8" role="status" aria-live="polite">
                検索結果が見つかりません
              </div>
            )}
            <div className="space-y-4" data-testid="task-list">
              {filteredTasksForList.map((task) => (
                <Card key={task.id} variant="interactive" onClick={() => handleTaskClick(task)} data-testid={`task-card-${task.id}`}>
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
                tasks={archivedTasksForDisplay}
                storageKey="dashboard-list"
                onTaskClick={handleTaskClick}
                onTagSelect={handleTagSelect}
                onProjectClick={handleProjectClick}
              />
            </div>
          </>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50" role="alert" data-testid="error-notification">
          <div className="flex items-center justify-between">
            <span data-testid="error-message">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2 text-white hover:bg-red-600"
              data-testid="error-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 新規タスク作成モーダル */}
      <TaskCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onTaskCreate={handleTaskCreate}
        data-testid="task-create-modal"
      />

      {/* タスク詳細モーダル */}
      <TaskDetailModal
        key={`task-detail-${selectedTask?.id}`}
        isOpen={showTaskDetailModal}
        onClose={handleCloseTaskDetail}
        task={selectedTask}
        editable={true}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        availableTags={availableTags}
        onProjectClick={handleProjectClick}
        onSubtaskAdd={handleSubtaskAdd}
        onSubtaskToggle={handleSubtaskToggle}
        onSubtaskDelete={handleSubtaskDelete}
        data-testid="task-detail-modal"
      />
    </div>
  );
};

export default Dashboard;