import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus, X, Search, Loader2 } from 'lucide-react';
import { Tag } from '../../types/tag';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TagBadge } from './TagBadge';
import { cn } from '../../lib/utils';
import { useTagStore } from '../../stores/tagStore';

interface TagDropdownProps {
  /** 選択中のタグ */
  selectedTags: Tag[];
  /** タグ選択時のコールバック */
  onTagsChange: (tags: Tag[]) => void;
  /** プレースホルダー */
  placeholder?: string;
  /** 最大選択可能数 */
  maxTags?: number;
  /** 新規タグ作成が可能かどうか */
  allowCreate?: boolean;
  /** 無効化状態 */
  disabled?: boolean;
  /** エラー状態 */
  error?: boolean;
  /** CSSクラス名 */
  className?: string;
  /** ローディング状態 */
  isLoading?: boolean;
  /** 新規タグ作成コールバック */
  onCreateTag?: () => void;
}

export const TagDropdown: React.FC<TagDropdownProps> = ({
  selectedTags,
  onTagsChange,
  placeholder = "タグを選択",
  maxTags = 10,
  allowCreate = false, // デフォルトで新規作成を無効化
  disabled = false,
  error = false,
  className = "",
  isLoading = false,
  onCreateTag
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { tags, getFilteredTags, addTag } = useTagStore();

  // 表示テキストの生成
  const displayText = useMemo(() => {
    if (selectedTags.length === 0) {
      return placeholder;
    } else if (selectedTags.length === 1) {
      return selectedTags[0].name;
    } else {
      return `${selectedTags.length}個のタグを選択`;
    }
  }, [selectedTags, placeholder]);

  // フィルタリングされたタグ
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      // 検索クエリがない場合は、使用頻度順で表示
      return [...tags].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
    }
    return getFilteredTags({ search: searchQuery });
  }, [tags, searchQuery, getFilteredTags]);

  // タグ選択のハンドル
  const handleTagSelect = useCallback((tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    
    if (isSelected) {
      // 既に選択されている場合は削除
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      // 未選択の場合は追加（最大数チェック）
      if (selectedTags.length < maxTags) {
        onTagsChange([...selectedTags, tag]);
        // ドロップダウンを閉じない（複数選択を可能にする）
      }
    }
  }, [selectedTags, onTagsChange, maxTags]);

  // 新規タグ作成
  const handleCreateNewTag = useCallback(async () => {
    if (!searchQuery.trim() || !allowCreate) return;
    
    try {
      const newTag = await addTag({ 
        name: searchQuery.trim(),
        color: '#3B82F6' // デフォルト色
      });
      
      // 新しく作成したタグを自動的に選択
      if (selectedTags.length < maxTags) {
        onTagsChange([...selectedTags, newTag]);
      }
      
      setSearchQuery('');
      setIsOpen(false);
    } catch (error) {
      console.error('新規タグ作成エラー:', error);
    }
  }, [searchQuery, allowCreate, addTag, selectedTags, onTagsChange, maxTags]);

  // ドロップダウンを開いたときに検索入力にフォーカス
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // 選択されたタグをクリアする
  const handleClearAll = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onTagsChange([]);
  }, [onTagsChange]);

  return (
    <div className={cn('relative w-full', className)}>
      {/* セレクタボタン */}
      <Button
        type="button"
        variant="outline"
        className={cn(
          'w-full justify-between h-auto p-3',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500'
        )}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-blue-500 flex-shrink-0" />
              <span className="text-blue-600">読み込み中...</span>
            </>
          ) : selectedTags.length > 0 ? (
            <>
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {selectedTags.length <= 2 ? (
                  // 2個以下の場合はタグバッジを表示
                  <div className="flex items-center space-x-1 flex-1 min-w-0">
                    {selectedTags.slice(0, 2).map(tag => (
                      <TagBadge key={tag.id} tag={tag} size="xs" />
                    ))}
                  </div>
                ) : (
                  // 3個以上の場合は個数表示
                  <span className="text-foreground">{displayText}</span>
                )}
              </div>
              {selectedTags.length > 0 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearAll();
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  title="すべてクリア"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{displayText}</span>
          )}
        </div>
        
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform flex-shrink-0',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {/* ドロップダウンメニュー */}
      {isOpen && !disabled && !isLoading && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-80 overflow-hidden" data-combobox>
            
            {/* ヘッダー部分（検索と閉じるボタン） */}
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">タグを選択</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                  title="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="タグを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            <div className="max-h-48 overflow-auto">
              {/* 新規タグ作成ボタン */}
              {allowCreate && searchQuery.trim() && 
               !filteredTags.some(tag => tag.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateNewTag();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center space-x-2 border-b border-border"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">
                    「{searchQuery.trim()}」を新規作成
                  </span>
                </button>
              )}

              {/* タグリスト */}
              {filteredTags.length > 0 ? (
                filteredTags.map(tag => {
                  const isSelected = selectedTags.some(t => t.id === tag.id);
                  const isDisabled = !isSelected && selectedTags.length >= maxTags;
                  
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!isDisabled) handleTagSelect(tag);
                      }}
                      disabled={isDisabled}
                      className={cn(
                        'w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors flex items-center space-x-2',
                        isSelected && 'bg-muted/30',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Check className={cn(
                        'h-4 w-4 flex-shrink-0',
                        isSelected ? 'text-primary' : 'text-transparent'
                      )} />
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <TagBadge tag={tag} size="xs" />
                        {tag.usageCount && tag.usageCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({tag.usageCount}回使用)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : searchQuery.trim() ? (
                <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                  「{searchQuery}」に一致するタグが見つかりません
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                  タグがまだ作成されていません
                </div>
              )}
            </div>

            {/* 選択状況の表示 */}
            {selectedTags.length > 0 && (
              <div className="p-3 border-t border-border bg-muted/20">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{selectedTags.length}/{maxTags}個選択中</span>
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClearAll();
                      }}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      すべてクリア
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
