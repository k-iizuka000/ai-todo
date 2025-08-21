import React from 'react';
import { ScheduleItem } from '@/types/schedule';
import ScheduleItemCard from './ScheduleItemCard';

interface ScheduleItemCompactProps {
  item: ScheduleItem;
  onClick?: () => void;
  onStatusChange?: (status: ScheduleItem['status']) => void;
  isSelected?: boolean;
  className?: string;
}

const ScheduleItemCompact: React.FC<ScheduleItemCompactProps> = ({
  item,
  onClick,
  onStatusChange,
  isSelected = false,
  className = ''
}) => {
  return (
    <ScheduleItemCard
      item={item}
      view="compact"
      onClick={onClick}
      onStatusChange={onStatusChange}
      isSelected={isSelected}
      showProgress={true}
      showActions={false}
      className={className}
    />
  );
};

export default ScheduleItemCompact;