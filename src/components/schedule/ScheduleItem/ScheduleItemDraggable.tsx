import React, { useState } from 'react';
import { ScheduleItem, ScheduleDragData } from '@/types/schedule';
import ScheduleItemCard from './ScheduleItemCard';

interface ScheduleItemDraggableProps {
  item: ScheduleItem;
  view: 'full' | 'compact' | 'mini';
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: ScheduleItem['status']) => void;
  onDragStart?: (data: ScheduleDragData) => void;
  onDragEnd?: () => void;
  isSelected?: boolean;
  className?: string;
}

const ScheduleItemDraggable: React.FC<ScheduleItemDraggableProps> = ({
  item,
  view,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  onDragStart,
  onDragEnd,
  isSelected = false,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (item.isLocked) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    
    const dragData: ScheduleDragData = {
      itemId: item.id,
      sourceBlockId: item.timeBlockId,
      dragType: 'move'
    };
    
    // ドラッグデータを設定
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // ドラッグ画像をカスタマイズ（オプション）
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.8';
    dragImage.style.transform = 'rotate(5deg)';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // クリーンアップのためにdragImageを後で削除
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
    
    onDragStart?.(dragData);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (item.isLocked) return;
    e.preventDefault();
  };

  return (
    <div
      className={`${className} ${item.isLocked ? 'cursor-default' : 'cursor-move'}`}
      title={item.isLocked ? 'このアイテムは固定されています' : 'ドラッグして移動'}
    >
      <ScheduleItemCard
        item={item}
        view={view}
        onClick={onClick}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        isDragging={isDragging}
        isSelected={isSelected}
        showProgress={true}
        showActions={view === 'full'}
      />
      
      {/* ロックアイコン */}
      {item.isLocked && (
        <div className="absolute top-2 right-2 text-gray-400">
          <svg
            className="h-4 w-4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <circle cx="12" cy="7" r="4" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ScheduleItemDraggable;