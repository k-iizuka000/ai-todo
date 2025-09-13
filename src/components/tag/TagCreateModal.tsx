/**
 * タグ作成モーダルコンポーネント
 * 設計書グループ3: タグ作成・編集機能
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
import { TAG_PRESET_COLORS, CreateTagInput } from '@/types/tag';
import { isApiError, getErrorMessage } from '@/utils/tagApi';

interface TagCreateModalProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** モーダルの開閉制御 */
  onOpenChange: (open: boolean) => void;
  /** タグ作成成功時のコールバック */
  onSuccess?: (tagId: string) => void;
  /** 初期値（新規タグ作成提案用） */
  initialName?: string;
  /** 初期カラー */
  initialColor?: string;
}

/**
 * タグ作成モーダルコンポーネント
 */
export const TagCreateModal = React.memo<TagCreateModalProps>(({
  open,
  onOpenChange,
  onSuccess,
  initialName = '',
  initialColor = TAG_PRESET_COLORS[0]
}) => {
  // ストアからデータと関数を取得
  const { tags, addTag, isLoading, error } = useTagStore();
  
  // フォーム状態
  const [formData, setFormData] = useState<CreateTagInput>({
    name: initialName,
    color: initialColor
  });
  
  // バリデーション状態
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  // デバウンス処理（500ms）
  const debouncedName = useDebounce(formData.name, 500);
  
  // 初期値が変更された時にフォームを更新
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialName,
        color: initialColor
      });
      setValidationErrors([]);
    }
  }, [open, initialName, initialColor]);
  
  // バリデーション（デバウンス後）
  const validation = useMemo(() => {
    if (!debouncedName) return { isValid: true, errors: [] };
    return validateTagData(debouncedName, formData.color, tags);
  }, [debouncedName, formData.color, tags]);
  
  // バリデーションエラーの更新
  useEffect(() => {
    setValidationErrors(validation.errors);
  }, [validation.errors]);
  
  // フォームリセット関数の共通化
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      color: TAG_PRESET_COLORS[0]
    });
    setValidationErrors([]);
  }, []);
  
  // テスタビリティの向上: console.errorの条件付き実行
  const logError = useCallback((error: unknown) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('タグ作成エラー:', error);
    }
  }, []);
  
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
    
    // 最終バリデーション
    const finalValidation = validateTagData(formData.name, formData.color, tags);
    if (!finalValidation.isValid) {
      setValidationErrors(finalValidation.errors);
      return;
    }
    
    try {
      // タグ名をサニタイズ
      const sanitizedData: CreateTagInput = {
        name: sanitizeTagName(formData.name),
        color: formData.color
      };
      
      // タグを作成
      const newTag = await addTag(sanitizedData);
      
      // 成功時の処理
      onSuccess?.(newTag?.id || 'unknown');
      onOpenChange(false);
      
      // フォームをリセット
      resetForm();
    } catch (err) {
      logError(err);
      // APIエラーの場合はより詳細なメッセージを表示
      if (isApiError(err)) {
        setValidationErrors([getErrorMessage(err)]);
      } else {
        // 想定外エラー時の処理を追加
        setValidationErrors(['タグの作成中に予期しないエラーが発生しました']);
      }
    }
  }, [formData, tags, addTag, onSuccess, onOpenChange, resetForm, logError]);
  
  // キャンセルハンドラー
  const handleCancel = useCallback(() => {
    onOpenChange(false);
    resetForm();
  }, [onOpenChange, resetForm]);
  
  // フォームが有効かどうか
  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0 && 
           validation.isValid && 
           validationErrors.length === 0;
  }, [formData.name, validation.isValid, validationErrors]);
  
  // プレビュー用のサニタイズされたタグ名
  const previewTagName = useMemo(() => {
    return sanitizeTagName(formData.name) || 'サンプル';
  }, [formData.name]);
  
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="新しいタグを作成"
      description="タスクの整理に使用するタグを作成します"
      size="md"
      footer={
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            data-testid="tag-create-cancel"
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            data-testid="tag-create-submit"
          >
            作成
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6" data-testid="tag-create-form">
        {/* タグ名入力 */}
        <FormField
          label="タグ名"
          required
          error={validationErrors.find(err => err.includes('タグ名'))}
        >
          <Input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="タグ名を入力してください"
            maxLength={30}
            disabled={isLoading}
            variant={validationErrors.some(err => err.includes('タグ名')) ? 'error' : 'default'}
            data-testid="tag-create-name-input"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.name.length}/30 文字
          </p>
        </FormField>
        
        {/* カラーピッカー */}
        <ColorPicker
          value={formData.color}
          onChange={handleColorChange}
          label="タグカラー"
          required
          disabled={isLoading}
          error={validationErrors.find(err => err.includes('カラー'))}
        />
        
        {/* プレビュー */}
        <div>
          <label className="text-sm font-medium mb-2 block">
            プレビュー
          </label>
          <div className="p-4 bg-muted rounded-lg">
            <TagBadge
              tag={{
                id: 'preview',
                name: previewTagName,
                color: formData.color,
              }}
              size="md"
              clickable={false}
            />
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
      </form>
    </Modal>
  );
});

TagCreateModal.displayName = 'TagCreateModal';
