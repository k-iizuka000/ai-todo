/**
 * TagListコンポーネント - グループ2実装（設計書準拠）
 * 
 * 実装のポイント:
 * - React.memoで不要な再レンダリング防止
 * - デバウンス（500ms）で検索処理最適化
 * - グリッドレイアウトで表示
 * - ソート機能（名前、使用回数、作成日）
 * - 検索フィルター機能
 * - 空状態の表示
 * - 仮想スクロール（大量タグ対応）は必要に応じて実装
 */

import React from 'react';
import { TagItem } from './TagItem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { useTagStore } from '@/stores/tagStore';
import { useTagSync } from '@/hooks/useTagSync';
import type { Tag, TagFilter } from '@/types/tag';

/**
 * TagListコンポーネントのProps
 */
export interface TagListProps {
  tags?: Tag[]; // オプショナルに変更（ストア直接参照時）
  selectedTagIds?: string[];
  onTagClick?: (tag: Tag) => void;
  onTagEdit?: (tag: Tag) => void;
  onTagDelete?: (tag: Tag) => void;
  filter?: TagFilter;
  onFilterChange?: (filter: TagFilter) => void;
  showFilter?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * タグ一覧をグリッドレイアウトで表示するコンポーネント
 * 設計書準拠: ソート機能、検索フィルター機能、空状態の表示を含む
 */
const TagList = React.memo<TagListProps>(({
  tags: propsTags,
  selectedTagIds = [],
  onTagClick,
  onTagEdit,
  onTagDelete,
  filter = {},
  onFilterChange,
  showFilter = true,
  emptyMessage = 'タグがありません',
  className,
}) => {
  // Issue 040対応: ストアからの直接データ参照
  const tagStore = useTagStore();
  
  // Issue 040対応: リアルタイム更新の仕組み追加
  const { syncTags, isLoading: syncLoading, error: syncError } = useTagSync({
    autoSync: window.location.pathname.includes('/tags') || window.location.pathname.includes('/tag'),
    syncInterval: 30000 // 30秒間隔
  });
  
  // Props経由のタグデータとストア直接参照のタグデータを統合
  const tagsFromStore = tagStore.tags;
  const isLoading = tagStore.isLoading || syncLoading;
  const error = tagStore.error || syncError;
  
  // Props > Store の優先順でデータを選択
  const tags = propsTags || tagsFromStore;
  const [localFilter, setLocalFilter] = React.useState<TagFilter>(filter);
  const [searchInput, setSearchInput] = React.useState<string>(filter.search || '');

  // 設計書準拠: デバウンス（500ms）で検索処理最適化
  const debouncedSearch = useDebounce(searchInput, 500);

  // デバウンスされた検索値でフィルターを更新
  React.useEffect(() => {
    const updatedFilter = { ...localFilter, search: debouncedSearch };
    setLocalFilter(updatedFilter);
    onFilterChange?.(updatedFilter);
  }, [debouncedSearch]); // localFilterとonFilterChangeを依存配列から除去（無限ループ防止）

  // フィルターの更新（設計書準拠: イミュータブルな更新）
  const updateFilter = React.useCallback((newFilter: Partial<TagFilter>) => {
    const updatedFilter = { ...localFilter, ...newFilter };
    setLocalFilter(updatedFilter);
    onFilterChange?.(updatedFilter);
  }, [localFilter, onFilterChange]);

  // 検索条件の変更処理（設計書準拠: デバウンス対応）
  const handleSearchChange = React.useCallback((search: string) => {
    setSearchInput(search);
  }, []);

  // ソート条件の変更処理
  const handleSortChange = React.useCallback((sortBy: TagFilter['sortBy']) => {
    const currentSortBy = localFilter.sortBy;
    const currentOrder = localFilter.sortOrder || 'asc';
    
    // 同じカラムの場合は昇順/降順を切り替え
    const newOrder = sortBy === currentSortBy && currentOrder === 'asc' ? 'desc' : 'asc';
    
    updateFilter({ sortBy, sortOrder: newOrder });
  }, [localFilter, updateFilter]);

  // タグのフィルタリングとソート（設計書準拠: useMemoでパフォーマンス最適化）
  const filteredAndSortedTags = React.useMemo(() => {
    if (!tags || !Array.isArray(tags)) return [];
    let result = [...tags];

    // 検索フィルタリング（設計書準拠: 部分一致検索）
    if (localFilter.search) {
      const searchTerm = localFilter.search.toLowerCase().trim();
      result = result.filter(tag =>
        tag.name.toLowerCase().includes(searchTerm)
      );
    }

    // ソート（設計書準拠: 名前、使用回数、作成日）
    if (localFilter.sortBy) {
      const { sortBy, sortOrder = 'asc' } = localFilter;
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name, 'ja');
            break;
          case 'usageCount':
            comparison = (a.usageCount || 0) - (b.usageCount || 0);
            break;
          case 'createdAt':
            comparison = (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
            break;
          default:
            return 0;
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [tags, localFilter]);

  // ソートボタンのスタイル
  const getSortButtonStyle = (sortBy: TagFilter['sortBy']) => {
    const isActive = localFilter.sortBy === sortBy;
    
    return cn(
      'text-xs px-2 py-1 rounded transition-colors',
      isActive
        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        : 'bg-muted text-muted-foreground hover:bg-muted/80'
    );
  };

  // ソートインジケータ
  const getSortIndicator = (sortBy: TagFilter['sortBy']) => {
    if (localFilter.sortBy !== sortBy) return null;
    return localFilter.sortOrder === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* フィルター・ソートコントロール */}
      {showFilter && (
        <div className="space-y-3">
          {/* 検索バー（設計書準拠: デバウンス対応） */}
          <div className="flex-1">
            <Input
              type="text"
              placeholder="タグを検索..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full"
            />
          </div>

          {/* ソートボタン */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">並び替え:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSortChange('name')}
              className={getSortButtonStyle('name')}
            >
              名前{getSortIndicator('name')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSortChange('usageCount')}
              className={getSortButtonStyle('usageCount')}
            >
              使用回数{getSortIndicator('usageCount')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSortChange('createdAt')}
              className={getSortButtonStyle('createdAt')}
            >
              作成日{getSortIndicator('createdAt')}
            </Button>
          </div>
        </div>
      )}

      {/* ローディング状態の表示 */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label="loading"></div>
          <span className="ml-2 text-muted-foreground">読み込み中...</span>
        </div>
      )}

      {/* エラー状態の表示 */}
      {error && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-red-500 mb-2">⚠️ エラーが発生しました</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => tagStore.initialize()}
            className="mt-3"
          >
            再読み込み
          </Button>
        </div>
      )}

      {/* タグ一覧 */}
      {!isLoading && !error && filteredAndSortedTags.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAndSortedTags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              onClick={onTagClick}
              onEdit={onTagEdit}
              onDelete={onTagDelete}
              isSelected={selectedTagIds.includes(tag.id)}
            />
          ))}
        </div>
      ) : (
        // 空状態の表示
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            {emptyMessage}
          </h3>
          {localFilter.search && (
            <p className="text-sm text-muted-foreground/80">
              「{localFilter.search}」に一致するタグが見つかりませんでした
            </p>
          )}
        </div>
      )}

      {/* 結果数の表示 */}
      {showFilter && tags && tags.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          {filteredAndSortedTags.length} / {tags.length} 件のタグを表示
        </div>
      )}
    </div>
  );
});

TagList.displayName = 'TagList';

export { TagList };