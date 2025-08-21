import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScheduleItem, WorkingHours, ScheduleDragData } from '@/types/schedule';
import TimeGridHeader from './TimeGridHeader';
import TimeGridRow from './TimeGridRow';

interface TimeGridProps {
  date: Date;
  timeRange: { start: string; end: string };
  timeInterval?: number; // 分単位（デフォルト: 60）
  scheduleItems: ScheduleItem[];
  workingHours: WorkingHours;
  onTimeSlotClick?: (time: string) => void;
  onItemClick?: (item: ScheduleItem) => void;
  onItemDrop?: (data: ScheduleDragData) => void;
  onItemResize?: (itemId: string, newStart: string, newEnd: string) => void;
  showCurrentTime?: boolean;
  gridLines?: 'none' | 'hour' | 'half-hour' | 'quarter';
  className?: string;
}

const TimeGrid: React.FC<TimeGridProps> = ({
  date,
  timeRange,
  timeInterval = 60,
  scheduleItems,
  workingHours,
  onTimeSlotClick,
  onItemClick,
  onItemDrop,
  onItemResize,
  showCurrentTime = true,
  gridLines = 'hour',
  className = ''
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // 現在時刻を更新
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 1分ごとに更新

    return () => clearInterval(interval);
  }, []);

  // 時間範囲から時間配列を生成（メモ化）
  const hours = useMemo((): number[] => {
    const startHour = parseInt(timeRange.start.split(':')[0]);
    const endHour = parseInt(timeRange.end.split(':')[0]);
    const hoursArray: number[] = [];
    
    for (let hour = startHour; hour < endHour; hour++) {
      hoursArray.push(hour);
    }
    
    return hoursArray;
  }, [timeRange.start, timeRange.end]);

  // 稼働時間内かどうかを判定（メモ化）
  const isWorkingHour = useCallback((hour: number): boolean => {
    const workStart = parseInt(workingHours.startTime.split(':')[0]);
    const workEnd = parseInt(workingHours.endTime.split(':')[0]);
    return hour >= workStart && hour < workEnd;
  }, [workingHours.startTime, workingHours.endTime]);

  // 休憩時間かどうかを判定（メモ化）
  const isBreakTime = useCallback((hour: number): boolean => {
    return workingHours.breakTimes.some(breakTime => {
      const breakStart = parseInt(breakTime.startTime.split(':')[0]);
      const breakEnd = parseInt(breakTime.endTime.split(':')[0]);
      return hour >= breakStart && hour < breakEnd;
    });
  }, [workingHours.breakTimes]);

  // 時間スロットクリック処理（メモ化）
  const handleTimeSlotClick = useCallback((time: string) => {
    onTimeSlotClick?.(time);
  }, [onTimeSlotClick]);

  // アイテムクリック処理（メモ化）
  const handleItemClick = useCallback((item: ScheduleItem) => {
    onItemClick?.(item);
  }, [onItemClick]);

  // ドラッグ開始処理（メモ化）
  const handleDragStart = useCallback((e: React.DragEvent, item: ScheduleItem) => {
    setDraggedItem(item.id);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      itemId: item.id,
      sourceBlockId: item.timeBlockId,
      dragType: 'move'
    }));
  }, []);

  // ドロップ処理（メモ化）
  const handleDrop = useCallback((e: React.DragEvent, targetHour: number) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const targetTime = `${targetHour.toString().padStart(2, '0')}:00`;
      
      // ドラッグされたアイテムの情報を取得
      const draggedItemData = scheduleItems.find(item => item.id === data.itemId);
      if (!draggedItemData) return;
      
      const duration = draggedItemData.duration;
      const endHour = targetHour + Math.ceil(duration / 60);
      const endTime = `${endHour.toString().padStart(2, '0')}:00`;
      
      const dropData: ScheduleDragData = {
        itemId: data.itemId,
        sourceBlockId: data.sourceBlockId,
        targetBlockId: `block-${date.toISOString().split('T')[0]}-${targetHour}`,
        startTime: targetTime,
        endTime: endTime,
        dragType: 'move'
      };
      
      onItemDrop?.(dropData);
    } catch (error) {
      console.error('Drop処理エラー:', error);
    } finally {
      setDraggedItem(null);
    }
  }, [scheduleItems, date, onItemDrop]);

  // ドラッグオーバー処理（メモ化）
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // グリッドラインのスタイル（メモ化）
  const getRowClassName = useCallback((hour: number): string => {
    let className = 'relative';
    
    if (isWorkingHour(hour)) {
      className += ' bg-white dark:bg-gray-800';
    } else {
      className += ' bg-gray-50 dark:bg-gray-900';
    }
    
    if (isBreakTime(hour)) {
      className += ' bg-green-50 dark:bg-green-900/20';
    }
    
    return className;
  }, [isWorkingHour, isBreakTime]);

  return (
    <div className={`bg-white dark:bg-gray-800 border rounded-lg overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <TimeGridHeader date={date} />
      
      {/* スクロール可能なグリッドエリア */}
      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
        {hours.map((hour) => (
          <div
            key={hour}
            className={getRowClassName(hour)}
            onDrop={(e) => handleDrop(e, hour)}
            onDragOver={handleDragOver}
          >
            <TimeGridRow
              hour={hour}
              scheduleItems={scheduleItems}
              onTimeSlotClick={handleTimeSlotClick}
              onItemClick={handleItemClick}
              showCurrentTime={showCurrentTime}
              currentTime={currentTime}
            />
            
            {/* ハーフアワーライン */}
            {gridLines === 'half-hour' && (
              <div className="absolute left-14 right-0 top-8 h-px bg-gray-100 dark:bg-gray-700" />
            )}
            
            {/* クォーターライン */}
            {gridLines === 'quarter' && (
              <>
                <div className="absolute left-14 right-0 top-4 h-px bg-gray-100 dark:bg-gray-700 opacity-50" />
                <div className="absolute left-14 right-0 top-8 h-px bg-gray-100 dark:bg-gray-700" />
                <div className="absolute left-14 right-0 top-12 h-px bg-gray-100 dark:bg-gray-700 opacity-50" />
              </>
            )}
          </div>
        ))}
      </div>
      
      {/* ドラッグ中のオーバーレイ */}
      {draggedItem && (
        <div className="absolute inset-0 bg-blue-500/10 pointer-events-none z-30" />
      )}
    </div>
  );
};

// カスタム比較関数
const arePropsEqual = (prevProps: TimeGridProps, nextProps: TimeGridProps) => {
  return (
    prevProps.date.getTime() === nextProps.date.getTime() &&
    prevProps.timeRange.start === nextProps.timeRange.start &&
    prevProps.timeRange.end === nextProps.timeRange.end &&
    prevProps.timeInterval === nextProps.timeInterval &&
    prevProps.scheduleItems === nextProps.scheduleItems &&
    prevProps.workingHours === nextProps.workingHours &&
    prevProps.showCurrentTime === nextProps.showCurrentTime &&
    prevProps.gridLines === nextProps.gridLines &&
    prevProps.className === nextProps.className
  );
};

// メモ化されたコンポーネント
const MemoizedTimeGrid = React.memo(TimeGrid, arePropsEqual);

MemoizedTimeGrid.displayName = 'TimeGrid';

export default MemoizedTimeGrid;