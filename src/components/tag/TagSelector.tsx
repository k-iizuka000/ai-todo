/**
 * タグセレクターコンポーネント - グループ4実装
 * 
 * 設計書の要件:
 * - 複数タグ選択UI
 * - ドロップダウン形式の選択
 * - 選択済みタグの表示
 * - タグの検索機能
 * - 新規タグ作成オプション
 * - React.useCallbackでパフォーマンス最適化
 * - キーボード操作対応（矢印キー、Enter）
 * - アクセシビリティ（role="combobox"）
 */

import React, { useCallback, useMemo } from 'react';
import { Tag } from '../../types/tag';
import { TagBadge } from './TagBadge';
import { TagInput } from './TagInput';
import { useTagStore } from '../../stores/tagStore';

interface TagSelectorProps {
  /** 選択中のタグ */
  selectedTags: Tag[];
  /** 利用可能なタグ（指定しない場合はストアから取得） */
  availableTags?: Tag[];
  /** 最大選択可能数 */
  maxTags?: number;
  /** 新規タグ作成が可能かどうか */
  allowCreate?: boolean;
  /** タグ選択時のコールバック */
  onTagsChange: (tags: Tag[]) => void;
  /** 編集モードかどうか */
  editing?: boolean;
  /** プレースホルダー */
  placeholder?: string;
  /** 表示モード: 'compact' | 'full' */
  variant?: 'compact' | 'full';
  /** 無効化状態 */
  disabled?: boolean;
  /** エラー状態 */
  error?: boolean;
  /** CSSクラス名 */
  className?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = React.memo(({
  selectedTags,
  availableTags, // eslint-disable-line @typescript-eslint/no-unused-vars
  maxTags = 10,
  allowCreate = true, // eslint-disable-line @typescript-eslint/no-unused-vars
  onTagsChange,
  editing = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  placeholder = "タグを追加...", // eslint-disable-line @typescript-eslint/no-unused-vars
  variant = 'full', // eslint-disable-line @typescript-eslint/no-unused-vars
  disabled = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  error = false, // eslint-disable-line @typescript-eslint/no-unused-vars
  className = ""
}) => {
  // タグストアから利用可能なタグを取得（propsで指定されない場合）
  const { tags: storeTags } = useTagStore(); // eslint-disable-line @typescript-eslint/no-unused-vars

  // タグ削除処理（メモ化）
  const handleRemoveTag = useCallback((tagId: string) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  }, [selectedTags, onTagsChange]);

  // 表示用のタグリスト（メモ化）
  const displayTags = useMemo(() => {
    if (variant === 'compact' && selectedTags.length > 3) {
      return selectedTags.slice(0, 3);
    }
    return selectedTags;
  }, [selectedTags, variant]);

  // 省略されたタグ数
  const hiddenTagsCount = useMemo(() => {
    if (variant === 'compact' && selectedTags.length > 3) {
      return selectedTags.length - 3;
    }
    return 0;
  }, [selectedTags.length, variant]);

  // 閲覧モード
  if (!editing) {
    return (
      <div className={`tag-selector-readonly ${className}`}>
        {selectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {displayTags.map(tag => (
              <TagBadge key={tag.id} tag={tag} size="sm" />
            ))}
            {hiddenTagsCount > 0 && (
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                title={`他${hiddenTagsCount}個のタグ: ${selectedTags.slice(3).map(t => t.name).join(', ')}`}
              >
                +{hiddenTagsCount}
              </span>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">タグなし</p>
        )}
      </div>
    );
  }

  // 編集モード - variant に応じた表示
  if (variant === 'compact') {
    // コンパクトモード: TagInputを使用
    return (
      <div className={`tag-selector-compact ${className}`}>
        <TagInput
          value={selectedTags}
          onChange={onTagsChange}
          placeholder={placeholder}
          maxTags={maxTags}
          allowCreate={allowCreate}
          disabled={disabled}
          error={error}
        />
      </div>
    );
  }

  // フルモード: 従来の表示方式
  return (
    <div className={`tag-selector-full ${className}`}>
      {/* 選択済みタグの表示 */}
      {selectedTags.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              選択中のタグ ({selectedTags.length}/{maxTags})
            </span>
            {selectedTags.length > 0 && (
              <button
                onClick={() => onTagsChange([])}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                disabled={disabled}
              >
                すべて削除
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tag => (
              <TagBadge
                key={tag.id}
                tag={tag}
                size="sm"
                showRemove={!disabled}
                onRemove={() => handleRemoveTag(tag.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* タグ入力 */}
      <div>
        <TagInput
          value={selectedTags}
          onChange={onTagsChange}
          placeholder={placeholder}
          maxTags={maxTags}
          allowCreate={allowCreate}
          disabled={disabled}
          error={error}
        />
      </div>

      {/* 統計情報の表示（オプション） */}
      {selectedTags.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          合計使用回数: {selectedTags.reduce((total, tag) => total + (tag.usageCount || 0), 0)}回
        </div>
      )}
    </div>
  );
});

TagSelector.displayName = 'TagSelector';