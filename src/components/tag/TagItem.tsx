/**
 * TagItemコンポーネント - グループ2実装（設計書準拠）
 * 
 * 実装のポイント:
 * - カード形式でタグ情報を表示
 * - タグ名、色、使用回数を表示
 * - 編集・削除ボタンを配置
 * - クリック時のハイライト効果
 * - 削除前の確認ダイアログ（設計書準拠）
 * - React.memoでパフォーマンス最適化
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TagBadge } from './TagBadge';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types/tag';

export interface TagItemProps {
  tag: Tag;
  onClick?: (tag: Tag) => void;
  onEdit?: (tag: Tag) => void;
  onDelete?: (tag: Tag) => void;
  isSelected?: boolean;
  className?: string;
  showConfirmDialog?: boolean; // 削除確認ダイアログの表示設定
}

const TagItem = React.memo<TagItemProps>(({
  tag,
  onClick,
  onEdit,
  onDelete,
  isSelected = false,
  className,
  showConfirmDialog = true,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleClick = React.useCallback(() => {
    if (onClick) {
      onClick(tag);
    }
  }, [onClick, tag]);

  const handleEdit = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(tag);
    }
  }, [onEdit, tag]);

  // 設計書準拠: 削除前の確認ダイアログ
  const handleDeleteClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (showConfirmDialog) {
      setShowDeleteConfirm(true);
    } else {
      onDelete?.(tag);
    }
  }, [showConfirmDialog, onDelete, tag]);

  const handleDeleteConfirm = React.useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete?.(tag);
  }, [onDelete, tag]);

  const handleDeleteCancel = React.useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const formatUsageCount = (count?: number): string => {
    if (count === undefined || count === 0) return '未使用';
    return `${count}回使用`;
  };

  return (
    <Card
      className={cn(
        'p-4 transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:scale-[1.02]',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50/50',
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`タグ: ${tag.name}, ${formatUsageCount(tag.usageCount)}`}
    >
      <div className="flex items-start justify-between gap-3">
        
        {/* タグ情報エリア */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <TagBadge tag={tag} size="md" />
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground truncate">
              カラー: {tag.color.toUpperCase()}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatUsageCount(tag.usageCount)}
            </p>
            {tag.createdAt && (
              <p className="text-xs text-muted-foreground">
                作成日: {new Date(tag.createdAt).toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>
        </div>

        {/* アクションボタンエリア */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-8 w-8 p-0 hover:bg-muted"
              aria-label={`${tag.name}を編集`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              aria-label={`${tag.name}を削除`}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          )}
        </div>
      </div>

      {/* ホバー時のハイライト効果 */}
      <div
        className={cn(
          'absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none',
          'bg-gradient-to-r from-transparent via-white/5 to-transparent',
          'opacity-0 hover:opacity-100'
        )}
        style={{
          background: isSelected
            ? `linear-gradient(45deg, ${tag.color}10, transparent, ${tag.color}10)`
            : undefined,
        }}
      />

      {/* 設計書準拠: 削除前の確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">タグの削除</h3>
            <p className="text-muted-foreground mb-4">
              タグ「{tag.name}」を削除しますか？
              {tag.usageCount && tag.usageCount > 0 && (
                <span className="block mt-1 text-destructive text-sm">
                  このタグは {tag.usageCount} 回使用されています。
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
});

TagItem.displayName = 'TagItem';

export { TagItem };