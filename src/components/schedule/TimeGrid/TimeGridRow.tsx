import React, { useRef, useCallback } from 'react';
import { ScheduleItem } from '@/types/schedule';
import { ScheduleItemCard } from '@/components/schedule/ScheduleItem';

interface TimeGridRowProps {
  hour: number;
  scheduleItems: ScheduleItem[];
  onTimeSlotClick?: (time: string) => void;
  onItemClick?: (item: ScheduleItem) => void;
  showCurrentTime?: boolean;
  currentTime?: Date;
  className?: string;
}

const TimeGridRow: React.FC<TimeGridRowProps> = ({
  hour,
  scheduleItems,
  onTimeSlotClick,
  onItemClick,
  showCurrentTime = true,
  currentTime = new Date(),
  className = ''
}) => {
  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
  const isCurrentHour = showCurrentTime && currentTime.getHours() === hour;
  
  // この時間帯のスケジュールアイテムをフィルター
  const itemsInThisHour = scheduleItems.filter(item => {
    const itemHour = parseInt(item.startTime.split(':')[0]);
    return itemHour === hour;
  });

  const timeSlotRef = useRef<HTMLDivElement>(null);

  const handleTimeSlotClick = useCallback(() => {
    onTimeSlotClick?.(timeStr);
  }, [onTimeSlotClick, timeStr]);

  const handleTimeSlotKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTimeSlotClick();
    }
  }, [handleTimeSlotClick]);

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, item: ScheduleItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onItemClick?.(item);
    }
  }, [onItemClick]);

  const getItemStyle = (item: ScheduleItem) => {
    const startMinutes = parseInt(item.startTime.split(':')[1]);
    const topOffset = (startMinutes / 60) * 100;
    const height = (item.duration / 60) * 100;
    
    return {
      position: 'absolute' as const,
      top: `${topOffset}%`,
      left: '60px',
      right: '8px',
      height: `${Math.min(height, 100 - topOffset)}%`,
      backgroundColor: item.color,
      color: 'white',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '12px',
      cursor: 'pointer',
      zIndex: 10,
      opacity: item.status === 'completed' ? 0.7 : 1,
      border: item.status === 'in_progress' ? '2px solid #ffffff' : 'none',
      minHeight: '24px'
    };
  };

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, item: ScheduleItem, direction: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    
    // 基本的なリサイズハンドラー（詳細実装は今回は省略）
    console.log(`Resize ${direction} for item ${item.id}`);
  }, []);

  const getStatusIcon = (status: ScheduleItem['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '⏳';
      case 'postponed':
        return '⏸';
      case 'cancelled':
        return '✗';
      default:
        return '';
    }
  };

  return (
    <div className={`relative border-b border-gray-100 dark:border-gray-700 ${className}`}>
      <div className="flex h-16">
        {/* 時間表示 */}
        <div className="w-14 flex items-start justify-end pr-2 pt-1 border-r border-gray-100 dark:border-gray-700">
          <span 
            className={`text-sm font-medium ${
              isCurrentHour 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
            id={`time-label-${hour}`}
          >
            {timeStr}
          </span>
        </div>
        
        {/* スケジュール表示エリア */}
        <div 
          ref={timeSlotRef}
          className="flex-1 relative cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          onClick={handleTimeSlotClick}
          onKeyDown={handleTimeSlotKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`${timeStr}の時間スロット。クリックまたはEnterキーでスケジュールを追加`}
          aria-describedby={`time-label-${hour}`}
        >
          {/* 現在時刻のライン */}
          {isCurrentHour && showCurrentTime && (
            <div 
              className="absolute left-0 right-0 h-0.5 bg-red-500 z-20"
              style={{
                top: `${(currentTime.getMinutes() / 60) * 100}%`
              }}
              aria-label={`現在時刻: ${currentTime.toLocaleTimeString()}`}
              role="presentation"
            >
              <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
          )}
          
          {/* スケジュールアイテム */}
          {itemsInThisHour.map((item) => (
            <div
              key={item.id}
              style={getItemStyle(item)}
              onClick={(e) => {
                e.stopPropagation();
                onItemClick?.(item);
              }}
              onKeyDown={(e) => handleItemKeyDown(e, item)}
              className="group hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-white focus:ring-inset"
              title={`${item.title} (${item.startTime} - ${item.endTime})`}
              tabIndex={0}
              role="button"
              aria-label={`スケジュール: ${item.title}, ${item.startTime}から${item.endTime}, ステータス: ${item.status}, 優先度: ${item.priority}`}
              aria-describedby={`schedule-item-${item.id}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                  itemId: item.id,
                  sourceBlockId: item.timeBlockId,
                  dragType: 'move'
                }));
              }}
            >
              <div className="flex items-center justify-between" id={`schedule-item-${item.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span 
                      className="text-xs font-medium"
                      aria-hidden="true"
                    >
                      {getStatusIcon(item.status)}
                    </span>
                    <span 
                      className="text-xs font-medium truncate"
                      aria-label={item.title}
                    >
                      {item.title}
                    </span>
                  </div>
                  <div 
                    className="text-xs opacity-80"
                    aria-label={`時間: ${item.startTime}から${item.endTime}`}
                  >
                    {item.startTime} - {item.endTime}
                  </div>
                </div>
                
                {/* 優先度インジケーター */}
                {(item.priority === 'high' || item.priority === 'urgent' || item.priority === 'critical') && (
                  <div className="flex-shrink-0">
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        item.priority === 'critical' ? 'bg-red-200' :
                        item.priority === 'urgent' ? 'bg-orange-200' :
                        'bg-yellow-200'
                      }`} 
                      aria-label={`優先度: ${item.priority}`}
                      role="img"
                    />
                  </div>
                )}
              </div>
              
              {/* プログレスバー */}
              {item.completionRate !== undefined && item.completionRate > 0 && (
                <div 
                  className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={item.completionRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`進捗: ${item.completionRate}%`}
                >
                  <div 
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${item.completionRate}%` }}
                  />
                </div>
              )}
              
              {/* リサイズハンドル */}
              <div 
                className="absolute top-0 left-0 right-0 h-1 cursor-n-resize opacity-0 group-hover:opacity-100 bg-white/50"
                onMouseDown={(e) => handleResizeMouseDown(e, item, 'top')}
                title="上端をドラッグしてリサイズ"
              />
              <div 
                className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize opacity-0 group-hover:opacity-100 bg-white/50"
                onMouseDown={(e) => handleResizeMouseDown(e, item, 'bottom')}
                title="下端をドラッグしてリサイズ"
              />
            </div>
          ))}
          
          {/* 空の時間スロットのヒント */}
          {itemsInThisHour.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-50 transition-opacity">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                クリックしてスケジュールを追加
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeGridRow;