import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ScheduleItem, 
  WorkingHours, 
  ScheduleDragData, 
  ExtendedScheduleDragData, 
  TimeSlot,
  isValidExtendedScheduleDragData,
  isUnscheduledTaskDragData,
  isScheduleItemDragData
} from '@/types/schedule';
import { useScheduleStore } from '@/stores/scheduleStore';
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

// 終了時間を計算する関数
const calculateEndTime = (startHour: number, estimatedTimeMinutes: number): string => {
  const startMinutes = startHour * 60;
  const endMinutes = startMinutes + estimatedTimeMinutes;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
};

const TimeGrid: React.FC<TimeGridProps> = ({
  date,
  timeRange,
  scheduleItems,
  workingHours,
  onTimeSlotClick,
  onItemClick,
  onItemDrop,
  showCurrentTime = true,
  gridLines = 'hour',
  className = ''
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  // スケジュールストアを取得
  const scheduleStore = useScheduleStore();

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

  // ドラッグ開始処理（メモ化） - 将来的に使用予定
  // const handleDragStart = useCallback((e: React.DragEvent, item: ScheduleItem) => {
  //   setDraggedItem(item.id);
  //   e.dataTransfer.setData('text/plain', JSON.stringify({
  //     itemId: item.id,
  //     sourceBlockId: item.timeBlockId,
  //     dragType: 'move'
  //   }));
  // }, []);

  // ドロップ処理（メモ化）
  const handleDrop = useCallback(async (e: React.DragEvent, targetHour: number) => {
    e.preventDefault();
    
    try {
      const rawData = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      
      if (!rawData) {
        throw new Error('ドラッグデータが見つかりませんでした');
      }

      const parsedData = JSON.parse(rawData);
      
      // 型ガード関数を使用したデータ検証
      if (!isValidExtendedScheduleDragData(parsedData)) {
        throw new Error('無効なドラッグデータ形式です');
      }

      const data = parsedData as ExtendedScheduleDragData;
      
      if (isUnscheduledTaskDragData(data)) {
        // 未スケジュールタスクからのドロップ
        const targetTime = `${targetHour.toString().padStart(2, '0')}:00`;
        const endTime = calculateEndTime(targetHour, data.taskData.estimatedTime);
        
        const timeSlot: TimeSlot = {
          date: date,
          startTime: targetTime,
          endTime: endTime,
          availability: 'busy'
        };
        
        await scheduleStore.createScheduleFromTask(data.taskData, timeSlot);
        
        // 成功メッセージ
        console.log(`タスク「${data.taskData.title}」を${targetTime}にスケジュールしました`);
      } else if (isScheduleItemDragData(data)) {
        // 既存のスケジュールアイテムの移動
        const targetTime = `${targetHour.toString().padStart(2, '0')}:00`;
        
        // ドラッグされたアイテムの情報を取得
        const draggedItemData = scheduleItems.find(item => item.id === data.itemId);
        if (!draggedItemData) {
          throw new Error('ドラッグされたスケジュールアイテムが見つかりません');
        }
        
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
        
        await onItemDrop?.(dropData);
        
        // 成功メッセージ
        console.log(`スケジュール「${draggedItemData.title}」を${targetTime}に移動しました`);
      } else {
        throw new Error('サポートされていないドラッグ操作です');
      }
    } catch (error) {
      console.error('ドロップ処理エラー:', error);
      
      // エラーメッセージを表示する処理（トースト通知等）
      const errorMessage = error instanceof Error ? error.message : 'スケジュール配置に失敗しました';
      
      // 今後の拡張でtoast通知を実装する際のための準備
      // showErrorToast?.(errorMessage);
      
      // 一時的にconsole.errorでエラー情報を出力
      console.error('ユーザー向けエラー:', errorMessage);
    } finally {
      setDraggedItem(null);
    }
  }, [scheduleItems, date, onItemDrop, scheduleStore]);

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