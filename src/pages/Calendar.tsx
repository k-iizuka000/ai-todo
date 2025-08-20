import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Button, 
  Badge,
  StatusBadge,
  PriorityBadge,
  Input
} from '@/components/ui';
import { ChevronLeft, ChevronRight, Plus, List, Calendar as CalendarIcon, Filter, Search } from 'lucide-react';
import type { Task } from '@/types/task';
import type { CalendarEvent, CalendarView, CalendarFilter } from '@/types/calendar';
import { 
  allCalendarEvents, 
  getTodaysEvents, 
  getThisWeeksEvents, 
  getMonthEvents,
  defaultCalendarView,
  defaultCalendarFilter 
} from '@/mock/calendarData';

// カレンダー表示用の日付ユーティリティ
const getDaysInMonth = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // 月の最初の週の空白日を計算
  const firstDayOfWeek = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDayOfWeek);
  
  // カレンダーに表示する全ての日付を生成（6週分）
  const days: Date[] = [];
  const currentDate = new Date(startDate);
  
  for (let i = 0; i < 42; i++) {
    days.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDate(date) === formatDate(today);
};

const isSameMonth = (date: Date, targetMonth: Date): boolean => {
  return date.getMonth() === targetMonth.getMonth() && 
         date.getFullYear() === targetMonth.getFullYear();
};

const Calendar: React.FC = () => {
  const [calendarView, setCalendarView] = useState<CalendarView>(defaultCalendarView);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>(defaultCalendarFilter);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 現在の月の日付を取得
  const calendarDays = getDaysInMonth(calendarView.currentDate.getFullYear(), calendarView.currentDate.getMonth());
  
  // イベントを日付ごとに分類
  const eventsByDate = allCalendarEvents.reduce((acc: Record<string, CalendarEvent[]>, event) => {
    const dateKey = formatDate(event.start);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {});
  
  // 現在の月のイベント
  const monthEvents = getMonthEvents(calendarView.currentDate);
  
  // フィルタリングされたイベント
  const filteredEvents = monthEvents.filter(event => {
    if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (!filter.showCompleted && event.status === 'done') {
      return false;
    }
    if (filter.priorities && filter.priorities.length > 0 && !filter.priorities.includes(event.priority)) {
      return false;
    }
    return true;
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(calendarView.currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCalendarView({ ...calendarView, currentDate: newDate });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setCalendarView({ ...calendarView, selectedDate: date });
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return eventsByDate[formatDate(date)] || [];
  };

  const handleToday = () => {
    const today = new Date();
    setCalendarView({ ...calendarView, currentDate: today, selectedDate: today });
    setSelectedDate(today);
  };

  const handleFilterChange = (newFilter: Partial<CalendarFilter>) => {
    setFilter({ ...filter, ...newFilter });
  };

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ];

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 期限が近いイベントを取得（7日以内）
  const getUpcomingEvents = (): CalendarEvent[] => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return filteredEvents.filter(event => {
      if (event.status === 'done') return false;
      const eventDate = new Date(event.start);
      return eventDate >= today && eventDate <= nextWeek;
    }).sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  };

  const upcomingEvents = getUpcomingEvents();
  
  // 期限切れのイベントを取得
  const getOverdueEvents = (): CalendarEvent[] => {
    const today = new Date();
    return filteredEvents.filter(event => {
      if (event.status === 'done') return false;
      return new Date(event.start) < today;
    }).sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
  };

  const overdueEvents = getOverdueEvents();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">カレンダー</h1>
        <div className="flex gap-2">
          {/* 表示モード切り替え */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button>
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
              placeholder="イベントを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterChange({ showCompleted: !filter.showCompleted })}
            className={filter.showCompleted ? 'bg-primary/10' : ''}
          >
            完了済みを表示
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            フィルター
          </Button>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">今日の予定</h3>
          <p className="text-2xl font-bold text-blue-600">{getTodaysEvents().length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">今週の予定</h3>
          <p className="text-2xl font-bold text-green-600">{getThisWeeksEvents().length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">期限間近</h3>
          <p className="text-2xl font-bold text-yellow-600">{upcomingEvents.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">期限切れ</h3>
          <p className="text-2xl font-bold text-red-600">{overdueEvents.length}</p>
        </div>
      </div>

      {viewMode === 'month' ? (
        <div className="space-y-6">
          {/* 月ナビゲーション */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-xl">
                  {calendarView.currentDate.getFullYear()}年{monthNames[calendarView.currentDate.getMonth()]}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
              >
                今日
              </Button>
            </CardHeader>
            <CardContent>
              {/* カレンダーグリッド */}
              <div className="grid grid-cols-7 gap-1">
                {/* 曜日ヘッダー */}
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="p-2 text-center text-sm font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
                
                {/* 日付セル */}
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentMonth = isSameMonth(day, calendarView.currentDate);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[80px] p-1 border rounded-md cursor-pointer transition-colors
                        ${isCurrentMonth ? 'bg-background' : 'bg-muted/30'}
                        ${isTodayDate ? 'bg-primary/10 border-primary' : 'border-border'}
                        ${selectedDate && formatDate(selectedDate) === formatDate(day) ? 'ring-2 ring-primary' : ''}
                        hover:bg-muted/50
                      `}
                      onClick={() => handleDateClick(day)}
                    >
                      <div className={`
                        text-sm font-medium mb-1
                        ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}
                        ${isTodayDate ? 'text-primary font-bold' : ''}
                      `}>
                        {day.getDate()}
                      </div>
                      
                      {/* イベント表示 */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded truncate"
                            style={{
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                              borderLeft: `3px solid ${event.color}`
                            }}
                            title={event.title}
                          >
                            {event.allDay ? event.title : `${event.start.getHours()}:${String(event.start.getMinutes()).padStart(2, '0')} ${event.title}`}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground">
                            +{dayEvents.length - 2} 件
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 選択された日付の詳細 */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })} のタスク
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getEventsForDate(selectedDate).length > 0 ? (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: event.color }}
                            />
                            <h4 className="font-medium">{event.title}</h4>
                          </div>
                          {!event.allDay && (
                            <p className="text-sm text-muted-foreground">
                              {event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - 
                              {event.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <StatusBadge status={event.status} />
                          <PriorityBadge priority={event.priority} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    この日にイベントはありません
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // リスト表示
        <div className="space-y-6">
          {/* 今後7日間のイベント */}
          <Card>
            <CardHeader>
              <CardTitle>今後7日間の予定</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.color }}
                          />
                          <h4 className="font-medium">{event.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            {event.start.toLocaleDateString('ja-JP')}
                            {!event.allDay && ` ${event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {Math.ceil((new Date(event.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}日後
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <StatusBadge status={event.status} />
                        <PriorityBadge priority={event.priority} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  今後7日間に予定のあるイベントはありません
                </p>
              )}
            </CardContent>
          </Card>

          {/* 期限の過ぎたイベント */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">期限切れのイベント</CardTitle>
            </CardHeader>
            <CardContent>
              {overdueEvents.length > 0 ? (
                <div className="space-y-4">
                  {overdueEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.color }}
                          />
                          <h4 className="font-medium text-red-800 dark:text-red-400">{event.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-red-600 dark:text-red-400">
                            期限: {event.start.toLocaleDateString('ja-JP')}
                            {!event.allDay && ` ${event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            {Math.abs(Math.ceil((new Date(event.start).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}日遅れ
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <StatusBadge status={event.status} />
                        <PriorityBadge priority={event.priority} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  期限切れのイベントはありません
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Calendar;