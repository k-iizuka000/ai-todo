/**
 * プロジェクトバッジコンポーネント - グループ2実装（Phase 3レビュー反映）
 * 
 * 実装のポイント:
 * - プロジェクト情報を視覚的に分かりやすく表示
 * - 背景色をプロジェクトのcolorプロパティから動的に設定
 * - テキスト色は背景色の明度に応じて自動調整
 * - サイズバリエーション（sm, md, lg）をpropsで指定可能
 * - プロジェクト未設定時の表示オプション（showEmptyState, emptyStateText）
 * - アクセシビリティ考慮（適切なtabIndex設定）
 * - カラーコントラスト自動調整機能の長期的改善準備
 */

import React from 'react';
import { useProjectStore } from '../../stores/projectStore';

export interface ProjectBadgeProps {
  /** 表示するプロジェクトID */
  projectId?: string;
  /** サイズバリエーション */
  size?: 'sm' | 'md' | 'lg';
  /** アイコンの表示 */
  showIcon?: boolean;
  /** プロジェクト名の表示 */
  showName?: boolean;
  /** クリック時のコールバック */
  onClick?: () => void;
  /** 表示バリアント */
  variant?: 'default' | 'compact' | 'icon-only';
  /** プロジェクト未設定時の表示 */
  showEmptyState?: boolean;
  /** プロジェクト未設定時のテキスト */
  emptyStateText?: string;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 色の明度を計算してテキスト色を決定
 * 設計書準拠: 背景色の明度に応じて白/黒のテキスト色を自動選択
 * Phase 3指摘事項: カラーコントラスト自動調整機能の基礎実装
 */
const getTextColor = (backgroundColor: string): string => {
  // #RRGGBB形式のカラーコードから明度を計算
  const hex = backgroundColor.replace('#', '');
  if (hex.length !== 6) return '#000000'; // 不正な形式の場合は黒
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 相対輝度計算（WCAG基準）- Phase 3指摘事項対応
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  // コントラスト比を考慮した閾値設定（将来的な改善ポイント）
  return brightness > 155 ? '#000000' : '#FFFFFF';
};

/**
 * 将来的なカラーコントラスト改善のための予約関数
 * Phase 3指摘事項: 長期的改善準備
 */
const getOptimalTextColor = (backgroundColor: string): string => {
  // TODO: WCAG AA基準（4.5:1）を満たすコントラスト比計算の実装
  // 現時点では既存のgetTextColor関数を使用
  return getTextColor(backgroundColor);
};

/**
 * サイズに対応するCSSクラスを取得
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  const sizeClasses: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };
  return sizeClasses[size];
}

/**
 * バリアント別の表示設定を取得
 */
function getDisplaySettings(
  variant: 'default' | 'compact' | 'icon-only',
  showIcon: boolean,
  showName: boolean
): { displayIcon: boolean; displayName: boolean } {
  switch (variant) {
    case 'icon-only':
      return { displayIcon: true, displayName: false };
    case 'compact':
      return { displayIcon: showIcon, displayName: false };
    case 'default':
    default:
      return { displayIcon: showIcon, displayName: showName };
  }
}

export const ProjectBadge: React.FC<ProjectBadgeProps> = React.memo(({
  projectId,
  size = 'md',
  showIcon = true,
  showName = true,
  onClick,
  variant = 'default',
  showEmptyState = false,
  emptyStateText = '（プロジェクト無し）',
  className = ''
}) => {
  // 🔧 修正: Zustandストアから直接プロジェクトデータを取得（即時反映対応）
  const project = useProjectStore(state => {
    console.log('[ProjectBadge] Selector called with projectId:', projectId);
    if (!projectId) {
      console.log('[ProjectBadge] No projectId provided');
      return null;
    }
    
    try {
      const rawProject = state.getProjectById(projectId);
      if (!rawProject) {
        console.log('[ProjectBadge] Project not found for ID:', projectId);
        return null;
      }
      
      const result = {
        id: rawProject.id || '',
        name: rawProject.name || 'Unnamed Project',
        color: rawProject.color || '#3B82F6',
        icon: rawProject.icon,
        status: rawProject.status || 'PLANNING'
      };
      
      console.log('[ProjectBadge] Project data processed:', result);
      return result;
    } catch (error) {
      console.error('Failed to get project display data:', error, { projectId });
      return null;
    }
  }); // 🎯 修正完了: プロジェクト状態の変更を直接監視し即座に更新

  // クリック可能かどうかの判定
  const isClickable = Boolean(onClick);

  // イベントハンドラー（早期リターン前に定義）
  const handleClick = React.useCallback(() => {
    if (isClickable && onClick) {
      onClick();
    }
  }, [isClickable, onClick]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && isClickable && onClick) {
      e.preventDefault();
      onClick();
    }
  }, [isClickable, onClick]);

  // プロジェクト未設定時の表示制御
  if (!project) {
    if (!showEmptyState) {
      return null;
    }
    
    return (
      <span
        className={`inline-flex items-center rounded-full bg-gray-100 text-gray-600 ${getSizeClasses(size)} ${className}`}
        title={emptyStateText}
        aria-label={emptyStateText}
      >
        <span className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
        {emptyStateText}
      </span>
    );
  }

  // サイズクラスの取得
  const sizeClasses = getSizeClasses(size);
  
  // バリアント別の表示設定
  const { displayIcon, displayName } = getDisplaySettings(variant, showIcon, showName);
  
  // 色の計算（設計書準拠: 背景色をプロジェクトのcolorプロパティから動的に設定）
  const textColor = getOptimalTextColor(project.color);
  const backgroundColor = project.color;

  // ベースクラス
  const baseClasses = `
    inline-flex items-center rounded-full font-medium
    ${sizeClasses}
    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
    ${className}
  `.trim();

  // インタラクションクラス（設計書準拠: hover時のエフェクト追加）
  const interactionClasses = isClickable 
    ? 'transition-all duration-200 hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
    : '';

  return (
    <span
      className={`${baseClasses} ${interactionClasses}`}
      style={{
        backgroundColor,
        color: textColor,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={`プロジェクト: ${project.name}`}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : -1} // Phase 3指摘事項: アクセシビリティ改善
      aria-label={`プロジェクト ${project.name}`}
    >
      {displayIcon && project.icon && (
        <span className="mr-1" aria-hidden="true">
          {project.icon}
        </span>
      )}
      {displayName && (
        <span className="truncate">
          {project.name}
        </span>
      )}
    </span>
  );
});

ProjectBadge.displayName = 'ProjectBadge';