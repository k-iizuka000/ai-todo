import React, { useState } from 'react';
import { Tag, Save, AlertCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateProjectInput, ProjectPriority } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (projectData: CreateProjectInput) => Promise<void>;
}

const priorityOptions: { value: ProjectPriority; label: string; color: string }[] = [
  { value: 'LOW' as ProjectPriority, label: '低', color: 'bg-blue-500' },
  { value: 'MEDIUM' as ProjectPriority, label: '中', color: 'bg-yellow-500' },
  { value: 'HIGH' as ProjectPriority, label: '高', color: 'bg-orange-500' },
  { value: 'CRITICAL' as ProjectPriority, label: '緊急', color: 'bg-red-500' },
];

const colorOptions = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
];

const iconOptions = [
  '📋', '🛒', '📱', '📊', '🔄', '💻', '🎨', '📚', '🏠', '🔧',
  '📈', '💡', '🎯', '🚀', '📝', '🎮', '📉', '⚡', '🌟', '🔥',
];

/**
 * 新規プロジェクト作成モーダル
 */
export const ProjectCreateModal: React.FC<ProjectCreateModalProps> = ({
  open,
  onOpenChange,
  onCreateProject,
}) => {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    priority: 'MEDIUM' as ProjectPriority,
    color: colorOptions[0],
    icon: iconOptions[0],
    tags: [],
  });
  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);

  const handleInputChange = (field: keyof CreateProjectInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'プロジェクト名は必須です';
    }

    if (formData.name.trim().length > 100) {
      newErrors.name = 'プロジェクト名は100文字以内で入力してください';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = '説明は500文字以内で入力してください';
    }

    if (formData.budget && formData.budget < 0) {
      newErrors.budget = '予算は0以上で入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    setServerError(null);
    setNetworkError(false);
    
    try {
      const projectData: CreateProjectInput = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      };

      await onCreateProject(projectData);
      handleClose();
    } catch (error: any) {
      console.error('Project creation failed:', error);
      
      // ネットワークエラーの判定
      if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
        setNetworkError(true);
        return;
      }
      
      // サーバーバリデーションエラー (400 Bad Request)
      if (error?.status === 400 && error?.data?.errors) {
        const validationErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.data.errors)) {
          if (Array.isArray(messages) && messages.length > 0) {
            validationErrors[field] = messages[0];
          }
        }
        setErrors(validationErrors);
        return;
      }
      
      // 認証エラー (401 Unauthorized)
      if (error?.status === 401) {
        setServerError('認証が必要です。ログインしてください。');
        return;
      }
      
      // その他のサーバーエラー
      if (error?.status >= 500) {
        setServerError('サーバーエラーが発生しました。しばらく後に再試行してください。');
        return;
      }
      
      // 一般的なエラー
      setServerError(error?.message || 'プロジェクトの作成に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRetrySubmit = () => {
    setNetworkError(false);
    setServerError(null);
    handleSubmit();
  };

  const handleClose = () => {
    if (isSubmitting) return; // 送信中は閉じられない
    
    setFormData({
      name: '',
      description: '',
      priority: 'MEDIUM' as ProjectPriority,
      color: colorOptions[0],
      icon: iconOptions[0],
      tags: [],
    });
    setCurrentTag('');
    setErrors({});
    setServerError(null);
    setNetworkError(false);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseInputDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    return new Date(dateString);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="新規プロジェクト作成"
      description="新しいプロジェクトの詳細を入力してください"
      size="lg"
      footer={
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSubmitting ? '作成中...' : '作成'}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* サーバーエラー表示 */}
        {serverError && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-sm text-red-800 dark:text-red-200">{serverError}</p>
            </div>
            <button 
              onClick={() => setServerError(null)}
              className="mt-2 text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
            >
              閉じる
            </button>
          </div>
        )}
        
        {/* ネットワークエラー表示 */}
        {networkError && (
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-orange-800 dark:text-orange-200">
                ネットワーク接続に問題があります。接続を確認して再試行してください。
              </p>
            </div>
            <div className="mt-2 flex space-x-2">
              <button 
                onClick={handleRetrySubmit}
                className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded border border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-900/30"
                disabled={isSubmitting}
              >
                {isSubmitting ? '再試行中...' : '再試行'}
              </button>
              <button 
                onClick={() => setNetworkError(false)}
                className="text-xs text-orange-600 dark:text-orange-400 underline hover:no-underline"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
        {/* 基本情報 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              プロジェクト名 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="プロジェクト名を入力"
              className={cn(errors.name && 'border-red-500')}
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">説明</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="プロジェクトの説明を入力"
              className={cn(
                'w-full px-3 py-2 border border-border rounded-md resize-none',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                errors.description && 'border-red-500',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
              rows={3}
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                {errors.description}
              </p>
            )}
          </div>
        </div>

        {/* 優先度とカラー */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">優先度</label>
            <div className="flex space-x-2">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleInputChange('priority', option.value)}
                  disabled={isSubmitting}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm border transition-colors flex items-center space-x-2',
                    formData.priority === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full', option.color)} />
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">カラー</label>
            <div className="flex flex-wrap gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => handleInputChange('color', color)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    formData.color === color
                      ? 'border-gray-800 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* アイコン */}
        <div>
          <label className="block text-sm font-medium mb-2">アイコン</label>
          <div className="flex flex-wrap gap-2">
            {iconOptions.map((icon) => (
              <button
                key={icon}
                onClick={() => handleInputChange('icon', icon)}
                className={cn(
                  'w-10 h-10 rounded-md border transition-all flex items-center justify-center text-lg',
                  formData.icon === icon
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted'
                )}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* 日程 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">開始日</label>
            <Input
              type="date"
              value={formatDateForInput(formData.startDate)}
              onChange={(e) => handleInputChange('startDate', parseInputDate(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">終了予定日</label>
            <Input
              type="date"
              value={formatDateForInput(formData.endDate)}
              onChange={(e) => handleInputChange('endDate', parseInputDate(e.target.value))}
            />
          </div>
        </div>

        {/* 予算 */}
        <div>
          <label className="block text-sm font-medium mb-2">予算</label>
          <Input
            type="number"
            value={formData.budget || ''}
            onChange={(e) => handleInputChange('budget', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="予算を入力（円）"
            className={cn(errors.budget && 'border-red-500')}
          />
          {errors.budget && (
            <p className="text-red-500 text-xs mt-1 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1" />
              {errors.budget}
            </p>
          )}
        </div>

        {/* タグ */}
        <div>
          <label className="block text-sm font-medium mb-2">タグ</label>
          <div className="flex space-x-2 mb-2">
            <Input
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              placeholder="タグを入力"
              onKeyPress={(e) => e.key === 'Enter' && !isSubmitting && handleAddTag()}
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button 
              onClick={handleAddTag} 
              variant="outline" 
              size="sm"
              disabled={isSubmitting || !currentTag.trim()}
            >
              <Tag className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};