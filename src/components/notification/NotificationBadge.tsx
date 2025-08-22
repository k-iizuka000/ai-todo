/**
 * 通知数バッジコンポーネント - グループ2実装（設計書準拠）
 * 
 * 実装のポイント:
 * - 未読通知数の動的表示
 * - 未読数が0の場合は非表示
 * - 未読数が99を超える場合は「99+」表示
 * - アクセシビリティ考慮（aria-label追加）
 * - サイズバリエーション対応（sm, md, lg）
 */

import React from 'react';

export interface NotificationBadgeProps {
  /** 未読通知数 */
  count: number;
  /** サイズバリエーション */
  size?: 'sm' | 'md' | 'lg';
  /** 最大表示数（これを超えると「+」表示） */
  maxCount?: number;
  /** 追加のクラス名 */
  className?: string;
  /** 表示位置の調整（ベルアイコン等に重ねて表示する場合） */
  position?: 'absolute' | 'relative';
}

const NotificationBadgeComponent: React.FC<NotificationBadgeProps> = ({
  count,
  size = 'md',
  maxCount = 99,
  className = '',
  position = 'absolute'
}) => {
  // 未読数が0の場合は表示しない
  if (count <= 0) {
    return null;
  }

  // サイズクラスの定義（設計書準拠）
  const sizeClasses = {
    sm: 'min-w-[16px] h-4 text-xs px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
    lg: 'min-w-[24px] h-6 text-sm px-2'
  };

  // 位置調整クラス
  const positionClasses = {
    absolute: 'absolute -top-1 -right-1',
    relative: 'relative'
  };

  // 表示する数値の決定
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  // アクセシビリティラベル
  const ariaLabel = count === 1 
    ? '1件の未読通知があります' 
    : `${count}件の未読通知があります`;

  return (
    <span
      className={`
        ${positionClasses[position]}
        ${sizeClasses[size]}
        bg-red-500 text-white rounded-full font-medium
        flex items-center justify-center
        ring-2 ring-white
        ${className}
      `.trim()}
      aria-label={ariaLabel}
      title={ariaLabel}
      role="status"
    >
      {displayCount}
    </span>
  );
};

// メモ化の比較関数
const arePropsEqual = (
  prevProps: NotificationBadgeProps, 
  nextProps: NotificationBadgeProps
): boolean => {
  return (
    prevProps.count === nextProps.count &&
    prevProps.size === nextProps.size &&
    prevProps.maxCount === nextProps.maxCount &&
    prevProps.className === nextProps.className &&
    prevProps.position === nextProps.position
  );
};

export const NotificationBadge = React.memo(NotificationBadgeComponent, arePropsEqual);
NotificationBadge.displayName = 'NotificationBadge';