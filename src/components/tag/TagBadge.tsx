/**
 * タグバッジコンポーネント - グループ2実装（設計書準拠）
 * 
 * 実装のポイント:
 * - 背景色をタグのcolorプロパティから動的に設定
 * - テキスト色は背景色の明度に応じて自動調整
 * - サイズバリエーション（sm, md, lg）をpropsで指定可能
 * - 削除ボタン（×）の表示オプション
 * - hover時のエフェクト追加
 * - アクセシビリティ考慮（aria-label追加）
 */

import React from 'react';
import { Tag } from '../../types/tag';

export interface TagBadgeProps {
  /** 表示するタグ */
  tag: Tag;
  /** サイズバリエーション */
  size?: 'sm' | 'md' | 'lg';
  /** 削除ボタンの表示 */
  showRemove?: boolean;
  /** 削除時のコールバック */
  onRemove?: () => void;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** クリック可能かどうか */
  clickable?: boolean;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 色の明度を計算してテキスト色を決定
 * 設計書準拠: 背景色の明度に応じて白/黒のテキスト色を自動選択
 */
const getTextColor = (backgroundColor?: string): string => {
  // デフォルトカラーまたはundefinedの場合
  if (!backgroundColor) return '#000000';
  
  // #RRGGBB形式のカラーコードから明度を計算
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return '#000000'; // 不正な形式の場合は黒
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 相対輝度計算（WCAG基準）
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155 ? '#000000' : '#FFFFFF';
};

export const TagBadge: React.FC<TagBadgeProps> = React.memo(({
  tag,
  size = 'md',
  showRemove = false,
  onRemove,
  onClick,
  clickable = true,
  className = ''
}) => {
  // サイズクラスの定義（設計書準拠）
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  // 色の計算（設計書準拠: 背景色をタグのcolorプロパティから動的に設定）
  // デフォルトカラーを設定（タグのcolorがundefinedの場合）
  const backgroundColor = tag.color || '#9CA3AF'; // gray-400
  const textColor = getTextColor(backgroundColor);

  // ベースクラス
  const baseClasses = `
    inline-flex items-center rounded-full font-medium
    ${sizeClasses[size]}
    ${clickable && onClick ? 'cursor-pointer' : 'cursor-default'}
    ${className}
  `.trim();

  // インタラクションクラス（設計書準拠: hover時のエフェクト追加）
  const interactionClasses = clickable && onClick 
    ? 'transition-all duration-200 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
    : '';

  const handleClick = React.useCallback(() => {
    if (clickable && onClick) {
      onClick();
    }
  }, [clickable, onClick]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && clickable && onClick) {
      e.preventDefault();
      onClick();
    }
  }, [clickable, onClick]);

  return (
    <span
      className={`${baseClasses} ${interactionClasses}`}
      style={{
        backgroundColor,
        color: textColor,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={`タグ: ${tag.name}${tag.usageCount ? ` (${tag.usageCount}回使用)` : ''}`}
      role={clickable && onClick ? "button" : undefined}
      tabIndex={clickable && onClick ? 0 : undefined}
      aria-label={`タグ ${tag.name}${tag.usageCount ? `, ${tag.usageCount}回使用` : ''}`}
    >
      #{tag.name}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-red-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          aria-label={`タグ ${tag.name} を削除`}
          type="button"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
});

TagBadge.displayName = 'TagBadge';