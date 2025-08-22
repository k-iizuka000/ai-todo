import React, { useState, useCallback, useMemo } from 'react';
import { Search, Plus, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { TagList } from './TagList';
import { TagCreateModal } from './TagCreateModal';
import { TagEditModal } from './TagEditModal';
import { mockTags, getTagStats } from '@/mock/tags';
import type { Tag, TagFilter } from '@/types/tag';

export interface TagManagerProps {
  className?: string;
}

/**
 * タグ管理のメインコンポーネント
 * タグの一覧表示、検索、フィルタリング、統計表示を行う
 */
export const TagManager = React.memo<TagManagerProps>(({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usageCount' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // フィルター設定をメモ化
  const filter = useMemo<TagFilter>(() => ({
    search: searchQuery,
    sortBy,
    sortOrder,
  }), [searchQuery, sortBy, sortOrder]);

  // 統計情報の計算
  const stats = useMemo(() => {
    const tagStats = getTagStats(mockTags);
    const unusedTags = mockTags.filter(tag => (tag.usageCount || 0) === 0).length;
    
    return {
      totalTags: tagStats.total,
      totalUsage: tagStats.totalUsage,
      mostUsedTag: tagStats.mostUsedTag?.name || 'なし',
      unusedTags,
    };
  }, []);

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
  const handleConfirmDelete = useCallback(() => {
    if (selectedTag) {
      // TODO: タグストアから削除処理を実装
      console.log('削除するタグ:', selectedTag.id);
      setShowDeleteConfirm(false);
      setSelectedTag(null);
    }
  }, [selectedTag]);

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
  const handleBulkDelete = useCallback(() => {
    if (selectedTags.length > 0) {
      // TODO: 一括削除処理を実装
      console.log('一括削除するタグ:', selectedTags);
      setSelectedTags([]);
      setShowBulkActions(false);
    }
  }, [selectedTags]);

  return (
    <div className={`space-y-6 ${className}`}>
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
                {(stats.totalUsage / stats.totalTags).toFixed(1)}
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
            tags={mockTags}
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
          // TODO: 作成されたタグをリストに反映
        }}
      />

      {/* タグ編集モーダル */}
      <TagEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        tag={selectedTag}
        onSuccess={(tagId) => {
          console.log('タグが更新されました:', tagId);
          // TODO: 更新されたタグをリストに反映
          setSelectedTag(null);
        }}
      />

      {/* 削除確認モーダル */}
      <Modal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="タグの削除"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            タグ「{selectedTag?.name}」を削除しますか？
          </p>
          {selectedTag?.usageCount && selectedTag.usageCount > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-sm text-orange-800">
                ⚠️ このタグは {selectedTag.usageCount} 個のタスクで使用されています。
                削除すると、これらのタスクからタグが除去されます。
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirm(false);
                setSelectedTag(null);
              }}
            >
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
            >
              削除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

TagManager.displayName = 'TagManager';

export default TagManager;