import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { TagList } from './TagList';
import { TagCreateModal } from './TagCreateModal';
import { TagEditModal } from './TagEditModal';
import { TagDeleteConfirmModal } from './TagDeleteConfirmModal';
import { useTagStore } from '@/stores/tagStore';
import type { Tag, TagFilter } from '@/types/tag';

export interface TagManagerProps {
  className?: string;
}

/**
 * タグ管理のメインコンポーネント
 * タグの一覧表示、検索、フィルタリング、統計表示を行う
 */
export const TagManager = React.memo<TagManagerProps>(({ className }) => {
  // ストアからタグデータを取得（エラーハンドリング対応）
  const { tags, error, isLoading, deleteTag, initialize, getTagRelatedTaskCount } = useTagStore();
  // エラー時は空配列をフォールバックとして使用
  const safeTags = error ? [] : tags;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usageCount' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // 初期データ読み込み
  useEffect(() => {
    if (tags.length === 0 && !isLoading) {
      initialize();
    }
  }, [tags.length, isLoading, initialize]);

  // フィルター設定をメモ化
  const filter = useMemo<TagFilter>(() => ({
    search: searchQuery,
    sortBy,
    sortOrder,
  }), [searchQuery, sortBy, sortOrder]);

  // 統計情報の計算（エラーハンドリング対応）
  const stats = useMemo(() => {
    try {
      // タグ統計を直接計算
      const totalTags = safeTags.length;
      const totalUsage = safeTags.reduce((sum, tag) => sum + (tag.usageCount || 0), 0);
      const unusedTags = safeTags.filter(tag => (tag.usageCount || 0) === 0).length;
      
      // 最も使用されているタグを見つける
      const mostUsedTag = safeTags.reduce((max, tag) => {
        if (!max || (tag.usageCount || 0) > (max.usageCount || 0)) {
          return tag;
        }
        return max;
      }, null as Tag | null);
      
      return {
        totalTags,
        totalUsage,
        mostUsedTag: mostUsedTag?.name || 'なし',
        unusedTags,
      };
    } catch (error) {
      console.error('統計計算エラー:', error);
      return {
        totalTags: 0,
        totalUsage: 0,
        mostUsedTag: 'なし',
        unusedTags: 0,
      };
    }
  }, [safeTags]);

  // 新規タグ作成ハンドラー
  const handleCreateTag = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  // タグ編集ハンドラー
  const handleEditTag = useCallback((tag: Tag) => {
    setSelectedTag(tag);
    setShowEditModal(true);
  }, []);

  // タグ削除ハンドラー
  const handleDeleteTag = useCallback((tag: Tag) => {
    setSelectedTag(tag);
    setShowDeleteConfirm(true);
  }, []);

  // 削除確認ハンドラー
  const handleConfirmDelete = useCallback(async (tagId: string) => {
    try {
      await deleteTag(tagId);
      console.log('削除完了:', tagId);
      setShowDeleteConfirm(false);
      setSelectedTag(null);
    } catch (error) {
      console.error('削除失敗:', error);
      // エラーハンドリングはTagStore内で行われるため、UIリセットのみ
      throw error; // モーダルに表示するためにエラーを再スロー
    }
  }, [deleteTag]);

  // ソート変更ハンドラー
  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // 全選択/全解除ハンドラー
  const handleSelectAll = useCallback(() => {
    // TODO: 表示中の全タグを取得して設定
    setSelectedTags([]);
  }, []);

  // 一括削除ハンドラー
  const handleBulkDelete = useCallback(async () => {
    if (selectedTags.length > 0) {
      try {
        // 複数のタグを並行削除
        await Promise.all(selectedTags.map(tagId => deleteTag(tagId)));
        console.log('一括削除完了:', selectedTags);
        setSelectedTags([]);
        setShowBulkActions(false);
      } catch (error) {
        console.error('一括削除エラー:', error);
        // エラーハンドリングはTagStore内で行われるため、選択状態のリセットのみ
        setSelectedTags([]);
        setShowBulkActions(false);
      }
    }
  }, [selectedTags, deleteTag]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-800 dark:text-red-200 flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => initialize()}
              disabled={isLoading}
            >
              再試行
            </Button>
          </div>
        </div>
      )}

      {/* ヘッダー部分 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">タグの管理</h1>
          <p className="text-muted-foreground">
            タグの作成、編集、削除、統計情報の確認ができます
          </p>
        </div>
        <div className="flex gap-2">
          {selectedTags.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowBulkActions(!showBulkActions)}
            >
              <MoreVertical className="h-4 w-4 mr-2" />
              一括操作 ({selectedTags.length})
            </Button>
          )}
          <Button onClick={handleCreateTag}>
            <Plus className="h-4 w-4 mr-2" />
            新しいタグ
          </Button>
        </div>
      </div>

      {/* 統計情報カード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">総タグ数</p>
                <p className="text-2xl font-bold">{stats.totalTags}</p>
              </div>
              <Badge variant="secondary">{stats.totalUsage} 使用</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">最も使用されているタグ</p>
              <p className="text-lg font-semibold">{stats.mostUsedTag}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">未使用のタグ</p>
              <p className="text-2xl font-bold text-orange-600">{stats.unusedTags}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">平均使用回数</p>
              <p className="text-2xl font-bold">
                {stats.totalTags > 0 ? (stats.totalUsage / stats.totalTags).toFixed(1) : '0.0'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 検索・フィルター部分 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="タグを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSortChange('name')}
            className={sortBy === 'name' ? 'bg-secondary' : ''}
          >
            名前順
            {sortBy === 'name' && (
              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSortChange('usageCount')}
            className={sortBy === 'usageCount' ? 'bg-secondary' : ''}
          >
            使用回数順
            {sortBy === 'usageCount' && (
              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSortChange('createdAt')}
            className={sortBy === 'createdAt' ? 'bg-secondary' : ''}
          >
            作成日順
            {sortBy === 'createdAt' && (
              <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </Button>
        </div>
      </div>

      {/* 一括操作パネル */}
      {showBulkActions && selectedTags.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-orange-800">
                {selectedTags.length} 個のタグが選択されています
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSelectAll}
                >
                  全選択解除
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  選択したタグを削除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* タグ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>タグ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <TagList
            tags={safeTags}
            filter={filter}
            selectedTagIds={selectedTags}
            onTagEdit={handleEditTag}
            onTagDelete={handleDeleteTag}
            showFilter={false}
            className="min-h-[400px]"
          />
        </CardContent>
      </Card>

      {/* タグ作成モーダル */}
      <TagCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(tagId) => {
          console.log('タグが作成されました:', tagId);
          // TagStoreが自動的にリストを更新するため、明示的な反映処理は不要
          setShowCreateModal(false);
        }}
      />

      {/* タグ編集モーダル */}
      <TagEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        tag={selectedTag}
        onSuccess={(tagId) => {
          console.log('タグが更新されました:', tagId);
          // TagStoreが自動的にリストを更新するため、明示的な反映処理は不要
          setShowEditModal(false);
          setSelectedTag(null);
        }}
      />

      {/* 削除確認モーダル */}
      {selectedTag && (
        <TagDeleteConfirmModal
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          onConfirm={handleConfirmDelete}
          tag={selectedTag}
          relatedTaskCount={getTagRelatedTaskCount(selectedTag.id)}
        />
      )}
    </div>
  );
});

TagManager.displayName = 'TagManager';

export default TagManager;