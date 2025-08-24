import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge,
  Modal,
  Input
} from '@/components/ui';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Filter,
  Settings,
  BarChart3,
  Clock,
  AlertCircle
} from 'lucide-react';
import { TimeGrid } from '@/components/schedule/TimeGrid';
import { ScheduleItemCard } from '@/components/schedule/ScheduleItem';
import { 
  useScheduleStore, 
  useCurrentSchedule, 
  useScheduleStatistics, 
  useUnscheduledTasks 
} from '@/stores/scheduleStore';
import { ScheduleItem, CreateScheduleItemRequest, ExtendedScheduleDragData, UnscheduledTaskData } from '@/types/schedule';

const DailyScheduleView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newItemTime, setNewItemTime] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // ストアから状態とアクションを取得
  const {
    currentDate,
    viewSettings,
    loading,
    error,
    setCurrentDate,
    fetchSchedule,
    createScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    handleDrop,
    clearError
  } = useScheduleStore();

  const currentSchedule = useCurrentSchedule();
  const statistics = useScheduleStatistics();
  const unscheduledTasks = useUnscheduledTasks();

  // 日付ナビゲーション（メモ化）- TDZ問題を避けるため最初に定義
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  }, [currentDate, setCurrentDate]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, [setCurrentDate]);

  // URLパラメータから日付を取得
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        setCurrentDate(date);
      }
    }
  }, [searchParams, setCurrentDate]);

  // 現在の日付をURLに反映
  useEffect(() => {
    const dateString = currentDate.toISOString().split('T')[0];
    setSearchParams({ date: dateString });
  }, [currentDate, setSearchParams]);

  // スケジュールデータを取得
  useEffect(() => {
    fetchSchedule(currentDate);
  }, [currentDate, fetchSchedule]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N で新規作成
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsCreateModalOpen(true);
      }
      // 左矢印で前の日
      if (e.key === 'ArrowLeft' && (!e.target || (e.target as HTMLElement).tagName !== 'INPUT')) {
        navigateDate('prev');
      }
      // 右矢印で次の日
      if (e.key === 'ArrowRight' && (!e.target || (e.target as HTMLElement).tagName !== 'INPUT')) {
        navigateDate('next');
      }
      // T で今日に移動
      if (e.key === 't' || e.key === 'T') {
        goToToday();
      }
      // S でサイドバー切り替え
      if (e.key === 's' || e.key === 'S') {
        setShowSidebar(!showSidebar);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigateDate, goToToday, showSidebar]);

  // 時間スロットクリック処理（メモ化）
  const handleTimeSlotClick = useCallback((time: string) => {
    setNewItemTime(time);
    setIsCreateModalOpen(true);
  }, []);

  // アイテムクリック処理（メモ化）
  const handleItemClick = useCallback((item: ScheduleItem) => {
    setSelectedItemId(item.id);
  }, []);

  // ステータス変更処理（メモ化）
  const handleStatusChange = useCallback(async (itemId: string, status: ScheduleItem['status']) => {
    await updateScheduleItem(itemId, { status });
  }, [updateScheduleItem]);

  // アイテム削除処理（メモ化）
  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (confirm('このスケジュールアイテムを削除しますか？')) {
      await deleteScheduleItem(itemId);
      setSelectedItemId(null);
    }
  }, [deleteScheduleItem]);

  // スケジュール作成処理（メモ化）
  const handleCreateScheduleItem = useCallback(async (data: {
    title: string;
    type: ScheduleItem['type'];
    startTime: string;
    duration: number;
  }) => {
    const startHour = parseInt(data.startTime.split(':')[0]);
    const endHour = startHour + Math.ceil(data.duration / 60);
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    const createRequest: CreateScheduleItemRequest = {
      date: currentDate,
      type: data.type,
      title: data.title,
      startTime: data.startTime,
      endTime: endTime,
      priority: 'medium'
    };

    await createScheduleItem(createRequest);
    setIsCreateModalOpen(false);
  }, [currentDate, createScheduleItem]);

  // 未スケジュールタスクのドラッグ開始処理（メモ化）
  const handleUnscheduledDragStart = useCallback((
    e: React.DragEvent,
    task: UnscheduledTaskData
  ) => {
    const dragData: ExtendedScheduleDragData = {
      itemId: '',  // 新規作成のため空
      sourceBlockId: '',
      sourceType: 'unscheduled',
      taskData: task,
      dragType: 'move'
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';
    
    // ドラッグ画像をカスタマイズ
    const dragPreview = document.createElement('div');
    dragPreview.innerHTML = `
      <div style="
        background: #dbeafe;
        border: 2px solid #3b82f6;
        border-radius: 8px;
        padding: 8px;
        font-size: 14px;
        color: #1e40af;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        max-width: 200px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">
        📋 ${task.title} (${task.estimatedTime}分)
      </div>
    `;
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px';
    document.body.appendChild(dragPreview);
    
    e.dataTransfer.setDragImage(dragPreview, 10, 10);
    
    // ドラッグ画像要素を少し遅らせて削除
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
    
    // ドラッグ中のビジュアルフィードバック
    setDraggingTaskId(task.id);
  }, []);

  // ドラッグ終了処理（メモ化）
  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null);
  }, []);

  // 選択されたアイテムを取得（メモ化）
  const selectedItem = useMemo(() => 
    selectedItemId && currentSchedule?.scheduleItems.find(
      item => item.id === selectedItemId
    ), [selectedItemId, currentSchedule?.scheduleItems]
  );

  // WorkingHoursのデフォルト値（メモ化）
  const defaultWorkingHours = useMemo(() => ({
    startTime: '09:00',
    endTime: '18:00',
    breakTimes: [],
    totalAvailable: 480
  }), []);

  // エラーハンドリング
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearError}
                >
                  再試行
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white dark:bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              日時スケジュール
            </h1>
            
            {/* 日付ナビゲーション */}
            <nav className="flex items-center space-x-2" aria-label="日付ナビゲーション">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
                aria-label="前の日"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div 
                className="px-3 py-2 text-sm font-medium"
                aria-live="polite"
                aria-label={`選択中の日付: ${currentDate.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}`}
              >
                {currentDate.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
                aria-label="次の日"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                aria-label="今日に移動"
              >
                今日
              </Button>
            </nav>
          </div>
          
          {/* アクションボタン */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              統計
            </Button>
            
            <Button
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              フィルター
            </Button>
            
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              新しいスケジュール
            </Button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex overflow-hidden" role="main">
        {/* メインエリア */}
        <section className="flex-1 flex flex-col" aria-label="スケジュールグリッド">
          {loading ? (
            <div className="flex-1 flex items-center justify-center" role="status" aria-label="スケジュール読み込み中">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="sr-only">スケジュールを読み込んでいます...</span>
            </div>
          ) : (
            <div className="flex-1 p-6">
              <TimeGrid
                date={currentDate}
                timeRange={viewSettings.timeRange}
                scheduleItems={currentSchedule?.scheduleItems || []}
                workingHours={currentSchedule?.workingHours || defaultWorkingHours}
                onTimeSlotClick={handleTimeSlotClick}
                onItemClick={handleItemClick}
                onItemDrop={handleDrop}
                showCurrentTime={true}
                className="h-full"
              />
            </div>
          )}
        </section>

        {/* サイドバー */}
        {showSidebar && (
          <aside className="w-80 border-l border-gray-200 bg-gray-50 dark:bg-gray-900 flex flex-col" aria-label="統計と未スケジュールタスク">
            {/* 統計 */}
            <section className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                本日の統計
              </h3>
              <div className="space-y-3" role="list" aria-label="統計情報">
                <div className="flex justify-between" role="listitem">
                  <span className="text-sm text-gray-600 dark:text-gray-400">予定</span>
                  <span className="text-sm font-medium" aria-label={`予定数: ${statistics.totalTasks}件`}>{statistics.totalTasks}件</span>
                </div>
                <div className="flex justify-between" role="listitem">
                  <span className="text-sm text-gray-600 dark:text-gray-400">完了</span>
                  <span className="text-sm font-medium text-green-600" aria-label={`完了数: ${statistics.completedTasks}件`}>{statistics.completedTasks}件</span>
                </div>
                <div className="flex justify-between" role="listitem">
                  <span className="text-sm text-gray-600 dark:text-gray-400">稼働率</span>
                  <span className="text-sm font-medium" aria-label={`稼働率: ${statistics.utilizationRate}パーセント`}>{statistics.utilizationRate}%</span>
                </div>
                <div className="flex justify-between" role="listitem">
                  <span className="text-sm text-gray-600 dark:text-gray-400">進捗</span>
                  <span className="text-sm font-medium" aria-label={`進捗: ${statistics.completionRate}パーセント`}>{statistics.completionRate}%</span>
                </div>
              </div>
            </section>

            {/* 未スケジュールタスク */}
            <section className="flex-1 p-4 overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                未スケジュール
              </h3>
              <div className="space-y-2" role="list" aria-label="未スケジュールタスク一覧">
                {unscheduledTasks.map((task) => (
                  <div
                    key={task.id}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`未スケジュールタスク: ${task.title}, 推定時間 ${task.estimatedTime}分, 優先度 ${task.priority}`}
                    aria-describedby={`task-description-${task.id}`}
                    draggable
                    onDragStart={(e) => handleUnscheduledDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    onKeyDown={(e) => {
                      // キーボード操作でもドラッグを開始可能にする（将来的な拡張）
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        // 現在はログのみ（将来的にはキーボードでのドラッグ開始を実装）
                        console.log(`タスク「${task.title}」が選択されました`);
                      }
                    }}
                    className={`
                      relative p-3 bg-white dark:bg-gray-800 border rounded-lg cursor-grab active:cursor-grabbing
                      hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      transition-all duration-200 transform hover:scale-[1.02]
                      ${draggingTaskId === task.id 
                        ? 'opacity-50 scale-95 shadow-xl border-blue-500' 
                        : 'hover:shadow-sm'
                      }
                      ${task.priority === 'high' || task.priority === 'urgent' || task.priority === 'critical'
                        ? 'border-l-4 border-l-orange-500'
                        : 'border-l-4 border-l-gray-200 dark:border-l-gray-700'
                      }
                    `}
                  >
                    {/* ドラッグインジケーター */}
                    <div className="absolute top-2 left-2 opacity-30 group-hover:opacity-60 transition-opacity">
                      <div className="flex flex-col gap-0.5">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                      </div>
                    </div>

                    <div className="ml-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {task.title}
                          </h4>
                          {task.type === 'subtask' && (
                            <div className="text-xs text-gray-500 dark:text-gray-400" title="サブタスク">
                              ↳
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            size="sm"
                            className={`
                              ${task.priority === 'high' || task.priority === 'urgent' || task.priority === 'critical'
                                ? 'border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-600 dark:text-orange-300'
                                : 'border-gray-300 text-gray-700'
                              }
                            `}
                          >
                            ⏱ {task.estimatedTime}分
                          </Badge>
                        </div>
                      </div>
                      
                      {task.description && (
                        <p 
                          id={`task-description-${task.id}`}
                          className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2"
                        >
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          {task.tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" size="sm" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* 優先度インジケーター */}
                        {(task.priority === 'high' || task.priority === 'urgent' || task.priority === 'critical') && (
                          <div className="flex items-center gap-1">
                            <div 
                              className={`w-2 h-2 rounded-full ${
                                task.priority === 'critical' ? 'bg-red-500' :
                                task.priority === 'urgent' ? 'bg-orange-500' :
                                'bg-yellow-500'
                              }`}
                              title={`優先度: ${task.priority}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ドラッグ中のオーバーレイ */}
                    {draggingTaskId === task.id && (
                      <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/50 rounded-lg pointer-events-none opacity-30" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        )}
      </main>

      {/* 新規作成モーダル */}
      {isCreateModalOpen && (
        <CreateScheduleModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateScheduleItem}
          defaultStartTime={newItemTime}
        />
      )}

      {/* アイテム詳細モーダル */}
      {selectedItem && (
        <ScheduleItemDetailModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItemId(null)}
          onStatusChange={(status) => handleStatusChange(selectedItem.id, status)}
          onDelete={() => handleDeleteItem(selectedItem.id)}
        />
      )}
    </div>
  );
};

// 新規作成モーダル
interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    type: ScheduleItem['type'];
    startTime: string;
    duration: number;
  }) => void;
  defaultStartTime: string;
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultStartTime
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleItem['type']>('task');
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [duration, setDuration] = useState(60);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit({ title: title.trim(), type, startTime, duration });
      setTitle('');
      setType('task');
      setDuration(60);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="新しいスケジュール">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="スケジュールのタイトルを入力"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            種類
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ScheduleItem['type'])}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="task">タスク</option>
            <option value="meeting">会議</option>
            <option value="break">休憩</option>
            <option value="personal">個人</option>
            <option value="focus">集中</option>
            <option value="review">レビュー</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始時刻
            </label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              時間（分）
            </label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              min="15"
              step="15"
              required
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit">
            作成
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// アイテム詳細モーダル
interface ScheduleItemDetailModalProps {
  item: ScheduleItem;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (status: ScheduleItem['status']) => void;
  onDelete: () => void;
}

const ScheduleItemDetailModal: React.FC<ScheduleItemDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onStatusChange,
  onDelete
}) => {
  return (
    <Modal open={isOpen} onClose={onClose} title="スケジュール詳細">
      <div className="space-y-4">
        <ScheduleItemCard
          item={item}
          view="full"
          onStatusChange={onStatusChange}
          onDelete={onDelete}
          showProgress={true}
          showActions={true}
        />
      </div>
    </Modal>
  );
};

export default DailyScheduleView;