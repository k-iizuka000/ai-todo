/**
 * タグ編集モーダルコンポーネント
 * 設計書グループ3: タグ編集機能
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, FormField } from '@/components/ui/input';
import { ColorPicker } from './ColorPicker';
import { TagBadge } from './TagBadge';
import { useTagStore } from '@/stores/tagStore';
import { useDebounce } from '@/hooks/useDebounce';
import { validateTagData, sanitizeTagName } from '@/utils/tagValidation';
import { Tag, UpdateTagInput } from '@/types/tag';
import { AlertTriangle } from 'lucide-react';

interface TagEditModalProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** モーダルの開閉制御 */
  onOpenChange: (open: boolean) => void;
  /** 編集対象のタグ */
  tag: Tag | null;
  /** タグ更新成功時のコールバック */
  onSuccess?: (tagId: string) => void;
}

/**
 * タグ編集モーダルコンポーネント
 */
export const TagEditModal = React.memo<TagEditModalProps>(({
  open,
  onOpenChange,
  tag,
  onSuccess
}) => {
  // ストアからデータと関数を取得
  const { tags, updateTag, isLoading, error } = useTagStore();
  
  // フォーム状態
  const [formData, setFormData] = useState<UpdateTagInput>({
    name: '',
    color: ''
  });
  
  // バリデーション状態
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // デバウンス処理（500ms）
  const debouncedName = useDebounce(formData.name || '', 500);
  
  // タグが変更された時にフォームを初期化
  useEffect(() => {
    if (open && tag) {
      setFormData({
        name: tag.name,
        color: tag.color
      });
      setValidationErrors([]);
    }
  }, [open, tag]);

  // モーダルが閉じられた時に状態をリセット
  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        color: ''
      });
      setValidationErrors([]);
    }
  }, [open]);
  
  // 使用回数を取得（簡易版：将来的にはタスクストアから取得）
  const usageCount = useMemo(() => {
    return tag?.usageCount || 0;
  }, [tag]);
  
  // 使用中タグかどうかの判定
  const isTagInUse = useMemo(() => {
    return usageCount > 0;
  }, [usageCount]);
  
  // バリデーション（デバウンス後）
  const validation = useMemo(() => {
    if (!debouncedName || !formData.color) return { isValid: true, errors: [] };
    return validateTagData(debouncedName, formData.color, tags, tag?.id);
  }, [debouncedName, formData.color, tags, tag?.id]);
  
  // バリデーションエラーの更新
  useEffect(() => {
    setValidationErrors(validation.errors);
  }, [validation.errors]);
  
  // 変更があるかどうかの判定
  const hasChanges = useMemo(() => {
    if (!tag) return false;
    return formData.name !== tag.name || formData.color !== tag.color;
  }, [formData, tag]);
  
  // タグ名変更ハンドラー
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      name: value
    }));
  }, []);
  
  // カラー変更ハンドラー
  const handleColorChange = useCallback((color: string) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  }, []);
  
  // フォーム送信ハンドラー
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tag || !formData.name || !formData.color) return;
    
    // 最終バリデーション
    const finalValidation = validateTagData(formData.name, formData.color, tags, tag.id);
    if (!finalValidation.isValid) {
      setValidationErrors(finalValidation.errors);
      return;
    }
    
    try {
      // タグ名をサニタイズ
      const sanitizedData: UpdateTagInput = {
        name: sanitizeTagName(formData.name),
        color: formData.color
      };
      
      // タグを更新
      await updateTag(tag.id, sanitizedData);
      
      // 成功時の処理
      onSuccess?.(tag.id);
      onOpenChange(false);
    } catch (err) {
      console.error('タグ更新エラー:', err);
    }
  }, [formData, tag, tags, updateTag, onSuccess, onOpenChange]);
  
  // キャンセルハンドラー
  const handleCancel = useCallback(() => {
    // 元の状態に復元
    if (tag) {
      setFormData({
        name: tag.name,
        color: tag.color
      });
    } else {
      setFormData({
        name: '',
        color: ''
      });
    }
    setValidationErrors([]);
    onOpenChange(false);
  }, [onOpenChange, tag]);
  
  // フォームが有効かどうか
  const isFormValid = useMemo(() => {
    return formData.name && 
           formData.name.trim().length > 0 && 
           validation.isValid && 
           validationErrors.length === 0 &&
           hasChanges;
  }, [formData.name, validation.isValid, validationErrors, hasChanges]);
  
  // プレビュー用のサニタイズされたタグ名
  const previewTagName = useMemo(() => {
    return sanitizeTagName(formData.name || '') || tag?.name || 'サンプル';
  }, [formData.name, tag?.name]);
  
  // タグが存在しない場合
  if (!tag) {
    return null;
  }
  
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="タグを編集"
      description={`「${tag.name}」タグの設定を変更します`}
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid="tag-edit-cancel"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            data-testid="tag-edit-submit"
          >
            更新
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6" data-testid="tag-edit-form">
        {/* 使用中タグの警告 */}
        {isTagInUse && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  使用中のタグです
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  このタグは現在 {usageCount} 個のタスクで使用されています。
                  変更内容は使用中のタスクにも反映されます。
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* タグ名入力 */}
        <FormField
          label="タグ名"
          required
          error={validationErrors.find(err => err.includes('タグ名'))}
        >
          <Input
            type="text"
            value={formData.name || ''}
            onChange={handleNameChange}
            placeholder="タグ名を入力してください"
            maxLength={30}
            disabled={isLoading}
            variant={validationErrors.some(err => err.includes('タグ名')) ? 'error' : 'default'}
            data-testid="tag-edit-name-input"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {(formData.name || '').length}/30 文字
          </p>
        </FormField>
        
        {/* カラーピッカー */}
        <ColorPicker
          value={formData.color || ''}
          onChange={handleColorChange}
          label="タグカラー"
          required
          disabled={isLoading}
          error={validationErrors.find(err => err.includes('カラー'))}
        />
        
        {/* プレビュー（変更前と変更後） */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            プレビュー
          </label>
          <div className="space-y-3">
            {/* 変更前 */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">変更前</p>
              <div className="p-3 bg-muted rounded-lg">
                <TagBadge
                  tag={tag}
                  size="md"
                  clickable={false}
                />
              </div>
            </div>
            
            {/* 変更後（変更がある場合のみ） */}
            {hasChanges && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">変更後</p>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <TagBadge
                    tag={{
                      id: 'preview',
                      name: previewTagName,
                      color: formData.color || tag.color,
                    }}
                    size="md"
                    clickable={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* エラーメッセージ表示 */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        
        {/* バリデーションエラー表示 */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <ul className="text-sm text-destructive space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>・{error}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* 変更がない場合の案内 */}
        {!hasChanges && formData.name && formData.color && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-600">
              変更内容がありません。タグ名またはカラーを変更してください。
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
});

TagEditModal.displayName = 'TagEditModal';
