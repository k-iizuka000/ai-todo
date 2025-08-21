import React from 'react';

interface TimeGridHeaderProps {
  date: Date;
  className?: string;
}

const TimeGridHeader: React.FC<TimeGridHeaderProps> = ({ date, className = '' }) => {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className={`border-b border-gray-200 bg-white dark:bg-gray-800 p-4 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {formatDate(date)}
      </h2>
    </div>
  );
};

export default TimeGridHeader;