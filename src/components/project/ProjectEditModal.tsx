import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, WifiOff } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UpdateProjectInput, ProjectPriority, ProjectWithFullDetails, ProjectStatus } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateProject: (id: string, projectData: UpdateProjectInput) => Promise<void>;
  project: ProjectWithFullDetails;
}

const priorityOptions: { value: ProjectPriority; label: string; color: string }[] = [
  { value: 'LOW' as ProjectPriority, label: '低', color: 'bg-blue-500' },
  { value: 'MEDIUM' as ProjectPriority, label: '中', color: 'bg-yellow-500' },
  { value: 'HIGH' as ProjectPriority, label: '高', color: 'bg-orange-500' },
  { value: 'CRITICAL' as ProjectPriority, label: '緊急', color: 'bg-red-500' },
];

const statusOptions: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'PLANNING', label: '計画中', color: 'bg-gray-500' },
  { value: 'ACTIVE', label: 'アクティブ', color: 'bg-green-500' },
  { value: 'ON_HOLD', label: '保留中', color: 'bg-yellow-500' },
  { value: 'COMPLETED', label: '完了', color: 'bg-blue-500' },
  { value: 'CANCELLED', label: 'キャンセル', color: 'bg-red-500' },
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
 * プロジェクト編集モーダル
 */
export const ProjectEditModal: React.FC<ProjectEditModalProps> = ({
  open,
  onOpenChange,
  onUpdateProject,
  project,
}) => {
  const [formData, setFormData] = useState<UpdateProjectInput>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);

  // プロジェクトデータが変更されたときにフォームデータを初期化
  useEffect(() => {
    if (project && open) {
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority,
        color: project.color,
        icon: project.icon || null,
        startDate: project.startDate,
        endDate: project.endDate,
        deadline: project.deadline,
        budget: project.budget,
        tagIds: [], // タグは後でプロジェクト管理システムに統合時に対応
      });
      setErrors({});
      setServerError(null);
      setNetworkError(false);
    }
  }, [project, open]);

  const handleInputChange = (field: keyof UpdateProjectInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'プロジェクト名は必須です';
    }

    if (formData.name && formData.name.trim().length > 100) {
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
      // 必須フィールドのname
      if (!formData.name?.trim()) {
        setErrors({ name: 'プロジェクト名は必須です' });
        return;
      }

      const projectData: UpdateProjectInput = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
      };

      await onUpdateProject(project.id, projectData);
      handleClose();
    } catch (error: any) {
      console.error('Project update failed:', error);
      
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
      setServerError(error?.message || 'プロジェクトの更新に失敗しました。');
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
    
    setCurrentTag('');
    setErrors({});
    setServerError(null);
    setNetworkError(false);
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const formatDateForInput = (date?: Date | null): string => {
    if (!date) return '';
    return date instanceof Date ? date.toISOString().split('T')[0] : '';
  };

  const parseInputDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    return new Date(dateString);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="プロジェクトを編集"
      description={`「${project?.name || ''}」の詳細を編集します`}
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
            <span>{isSubmitting ? '更新中...' : '更新'}</span>
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
              value={formData.name || ''}
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

        {/* ステータスと優先度 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">ステータス</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleInputChange('status', option.value)}
                  disabled={isSubmitting}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm border transition-colors flex items-center space-x-2',
                    formData.status === option.value
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
            <label className="block text-sm font-medium mb-2">優先度</label>
            <div className="flex flex-wrap gap-2">
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
        </div>

        {/* カラーとアイコン */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* 日程 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-2">締切日</label>
            <Input
              type="date"
              value={formatDateForInput(formData.deadline)}
              onChange={(e) => handleInputChange('deadline', parseInputDate(e.target.value))}
            />
          </div>
        </div>

        {/* 予算 */}
        <div>
          <label className="block text-sm font-medium mb-2">予算</label>
          <Input
            type="number"
            value={formData.budget || ''}
            onChange={(e) => handleInputChange('budget', e.target.value ? Number(e.target.value) : null)}
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
      </div>
    </Modal>
  );
};