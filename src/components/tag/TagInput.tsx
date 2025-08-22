/**
 * TagInputコンポーネント - ベストプラクティス実装
 * グループ4: タグ選択コンポーネント
 * 
 * 設計書の要件:
 * - テキスト入力でタグ検索
 * - オートコンプリート機能
 * - 複数タグの連続入力対応
 * - Enter/Tabキーでタグ確定
 * - Backspaceで最後のタグ削除
 * - デバウンス（500ms）でAPI呼び出し最適化
 * - 候補表示は最大10件
 * - フォーカス管理
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, KeyboardEvent } from 'react';
import { Tag } from '../../types/tag';
import { useDebounce } from '../../hooks/useDebounce';
import { useTagStore } from '../../stores/tagStore';
import { validateTagName } from '../../utils/tagValidation';
import { TagBadge } from './TagBadge';

interface TagInputProps {
  /** 現在選択されているタグ */
  value: Tag[];
  /** タグ変更時のコールバック */
  onChange: (tags: Tag[]) => void;
  /** プレースホルダーテキスト */
  placeholder?: string;
  /** 最大タグ数 */
  maxTags?: number;
  /** 新規タグ作成を許可するか */
  allowCreate?: boolean;
  /** 無効化状態 */
  disabled?: boolean;
  /** エラー状態 */
  error?: boolean;
  /** CSSクラス名 */
  className?: string;
}

export const TagInput = React.memo<TagInputProps>(({
  value,
  onChange,
  placeholder = "タグを追加...",
  maxTags = 10,
  allowCreate = true,
  disabled = false,
  error = false,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  
  // タグストアから利用可能なタグを取得
  const { tags, getFilteredTags, getTopUsedTags, addTag } = useTagStore();
  
  // デバウンス処理（500ms）
  const debouncedSearch = useDebounce(inputValue, 500);
  
  // タグ追加処理（イミュータブル）
  const handleAddTag = useCallback((tag: Tag) => {
    if (value.length >= maxTags) return;
    if (value.some(t => t.id === tag.id)) return;
    
    // イミュータブルな更新
    onChange([...value, tag]);
    setInputValue('');
    setSelectedIndex(-1);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [value, onChange, maxTags]);
  
  // タグ削除処理（イミュータブル）
  const handleRemoveTag = useCallback((tagId: string) => {
    onChange(value.filter(tag => tag.id !== tagId));
  }, [value, onChange]);
  
  // 新規タグ作成処理
  const handleCreateNewTag = useCallback(async () => {
    if (!inputValue.trim() || !allowCreate) return;
    
    const tagName = inputValue.trim();
    
    // バリデーション実行
    const validation = validateTagName(tagName, tags);
    if (!validation.isValid) {
      setValidationError(validation.errors[0]);
      return;
    }
    
    // エラーをクリア
    setValidationError(null);
    
    // 既存タグとの重複チェック（バリデーションで確認済みですが、念のため）
    const existingTag = tags.find(tag => 
      tag.name.toLowerCase() === tagName.toLowerCase()
    );
    
    if (existingTag) {
      handleAddTag(existingTag);
      return;
    }
    
    try {
      // 新規タグ作成
      const newTag: Tag = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: tagName,
        color: '#3B82F6', // デフォルトの青色
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // ストアに追加
      await addTag({
        name: newTag.name,
        color: newTag.color
      });
      
      // 選択リストに追加
      handleAddTag(newTag);
    } catch (error) {
      setValidationError('タグの作成に失敗しました。もう一度お試しください。');
    }
  }, [inputValue, allowCreate, tags, handleAddTag, addTag]);
  
  // メモ化された表示タグリスト
  const displayTags = useMemo(() => 
    value.slice(0, maxTags), [value, maxTags]
  );
  
  // 候補表示用のフィルタリング
  const filteredSuggestions = useMemo(() => {
    if (!debouncedSearch.trim()) {
      // 検索文字列がない場合は最近使用したタグを表示
      return getTopUsedTags(10).filter(tag => 
        !value.some(selected => selected.id === tag.id)
      );
    }
    
    // 検索文字列がある場合はフィルタリング
    const filtered = getFilteredTags({
      search: debouncedSearch,
      sortBy: 'usageCount',
      sortOrder: 'desc'
    }).filter(tag => 
      !value.some(selected => selected.id === tag.id)
    );
    
    return filtered.slice(0, 10); // 最大10件
  }, [debouncedSearch, value, getFilteredTags, getTopUsedTags]);
  
  // 候補の更新
  useEffect(() => {
    setSuggestions(filteredSuggestions);
    setSelectedIndex(-1);
  }, [filteredSuggestions]);
  
  // 入力値変更時にエラーをクリア
  useEffect(() => {
    if (validationError && inputValue.trim()) {
      setValidationError(null);
    }
  }, [inputValue, validationError]);
  
  // キーボードナビゲーション
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleAddTag(suggestions[selectedIndex]);
        } else if (allowCreate && inputValue.trim()) {
          handleCreateNewTag();
        }
        break;
        
      case 'Tab':
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          e.preventDefault();
          handleAddTag(suggestions[selectedIndex]);
        } else if (allowCreate && inputValue.trim()) {
          e.preventDefault();
          handleCreateNewTag();
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
        
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
        
      case 'Backspace':
        if (!inputValue && value.length > 0) {
          // 入力文字列が空の場合、最後のタグを削除
          const lastTag = value[value.length - 1];
          handleRemoveTag(lastTag.id);
        }
        break;
    }
  }, [selectedIndex, suggestions, inputValue, value, allowCreate, handleAddTag, handleCreateNewTag, handleRemoveTag]);
  
  // フォーカス管理
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);
  
  // 新規作成候補の表示判定
  const shouldShowCreateOption = useMemo(() => {
    if (!allowCreate || !inputValue.trim()) return false;
    
    const exactMatch = suggestions.some(tag => 
      tag.name.toLowerCase() === inputValue.toLowerCase()
    );
    
    return !exactMatch;
  }, [allowCreate, inputValue, suggestions]);
  
  // 入力フィールドのプレースホルダー
  const effectivePlaceholder = useMemo(() => {
    if (disabled) return "無効";
    if (value.length >= maxTags) return `最大${maxTags}個まで`;
    return placeholder;
  }, [disabled, value.length, maxTags, placeholder]);
  
  // CSS クラス名の組み立て
  const hasError = error || !!validationError;
  const inputClassName = `
    w-full px-3 py-2 border rounded-md transition-colors
    ${hasError 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
    }
    ${disabled 
      ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed' 
      : 'bg-white dark:bg-gray-700'
    }
    text-gray-900 dark:text-gray-100
    focus:ring-2 focus:outline-none
    ${className}
  `.trim();
  
  return (
    <div className="relative">
      {/* 選択済みタグ */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {displayTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              size="sm"
              showRemove={!disabled}
              onRemove={() => handleRemoveTag(tag.id)}
              className="animate-in fade-in-0 duration-200"
            />
          ))}
          {value.length > maxTags && (
            <span className="px-2 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
              +{value.length - maxTags}個
            </span>
          )}
        </div>
      )}

      {/* 入力フィールド */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => {
            // 少し遅延させてクリックイベントを処理
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          disabled={disabled || value.length >= maxTags}
          className={inputClassName}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
          aria-owns="tag-suggestions"
          aria-activedescendant={
            selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined
          }
        />

        {/* 候補ドロップダウン */}
        {showSuggestions && (inputValue || suggestions.length > 0) && (
          <div 
            id="tag-suggestions"
            className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
            role="listbox"
          >
            {/* 既存タグの候補 */}
            {suggestions.map((tag, index) => (
              <button
                key={tag.id}
                ref={(el) => (suggestionRefs.current[index] = el)}
                onClick={() => handleAddTag(tag)}
                className={`
                  w-full px-3 py-2 text-left flex items-center gap-2 transition-colors
                  ${selectedIndex === index 
                    ? 'bg-blue-100 dark:bg-blue-900' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                  }
                `}
                role="option"
                aria-selected={selectedIndex === index}
                id={`suggestion-${index}`}
              >
                <TagBadge tag={tag} size="sm" />
                {tag.usageCount && tag.usageCount > 0 && (
                  <span className="ml-auto text-xs text-gray-500">
                    {tag.usageCount}回使用
                  </span>
                )}
              </button>
            ))}

            {/* 新規作成オプション */}
            {shouldShowCreateOption && (
              <button
                ref={(el) => (suggestionRefs.current[suggestions.length] = el)}
                onClick={handleCreateNewTag}
                className={`
                  w-full px-3 py-2 text-left transition-colors
                  ${selectedIndex === suggestions.length 
                    ? 'bg-blue-100 dark:bg-blue-900' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                  }
                  text-blue-600 dark:text-blue-400 border-t border-gray-200 dark:border-gray-600
                `}
                role="option"
                aria-selected={selectedIndex === suggestions.length}
                id={`suggestion-${suggestions.length}`}
              >
                <span className="font-medium">+ 新しいタグ「{inputValue}」を作成</span>
              </button>
            )}

            {/* 結果なし */}
            {suggestions.length === 0 && !shouldShowCreateOption && (
              <div className="px-3 py-2 text-gray-500 text-sm">
                {inputValue ? '該当するタグがありません' : 'タグを入力してください'}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* エラーメッセージ */}
      {validationError && (
        <div className="mt-1 text-sm text-red-600 dark:text-red-400">
          {validationError}
        </div>
      )}
    </div>
  );
});

TagInput.displayName = 'TagInput';