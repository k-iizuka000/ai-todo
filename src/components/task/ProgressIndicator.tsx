/**
 * プログレスインジケーター - タスクやサブタスクの進捗を表示
 */

import React from 'react';

interface ProgressIndicatorProps {
  /** 完了数 */
  completed: number;
  /** 総数 */
  total: number;
  /** 表示サイズ（デフォルト: medium） */
  size?: 'small' | 'medium' | 'large';
  /** カスタムクラス */
  className?: string;
  /** パーセント表示を非表示にするか */
  hidePercentage?: boolean;
  /** ラベル表示 */
  label?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  completed,
  total,
  size = 'medium',
  className = '',
  hidePercentage = false,
  label
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const sizeClasses = {
    small: 'h-2',
    medium: 'h-3',
    large: 'h-4'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || !hidePercentage) && (
        <div className={`flex justify-between items-center mb-1 ${textSizeClasses[size]}`}>
          {label && (
            <span className="text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {!hidePercentage && (
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {completed}/{total} ({percentage}%)
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`bg-gradient-to-r from-blue-500 to-blue-600 ${sizeClasses[size]} rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {size === 'large' && (
        <div className={`mt-2 flex justify-between ${textSizeClasses[size]} text-gray-600 dark:text-gray-400`}>
          <span>進捗: {completed}件完了</span>
          <span>残り: {total - completed}件</span>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;