import React, { useState } from 'react';
import { Tag, Save, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CreateProjectInput, ProjectPriority } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (projectData: CreateProjectInput) => void;
}

const priorityOptions: { value: ProjectPriority; label: string; color: string }[] = [
  { value: 'low', label: '低', color: 'bg-blue-500' },
  { value: 'medium', label: '中', color: 'bg-yellow-500' },
  { value: 'high', label: '高', color: 'bg-orange-500' },
  { value: 'critical', label: '緊急', color: 'bg-red-500' },
];

const colorOptions = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
];

const iconOptions = [
  '📋', '🛒', '📱', '📊', '🔄', '💻', '🎨', '📚', '🏠', '🔧',
  '📈', '💡', '🎯', '🚀', '📝', '🎮', '📊', '⚡', '🌟', '🔥',
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
    priority: 'medium',
    color: colorOptions[0],
    icon: iconOptions[0],
    tags: [],
  });
  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const handleSubmit = () => {
    if (!validateForm()) return;

    const projectData: CreateProjectInput = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
    };

    onCreateProject(projectData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      color: colorOptions[0],
      icon: iconOptions[0],
      tags: [],
    });
    setCurrentTag('');
    setErrors({});
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
    >
      <div className="space-y-6">
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
                errors.description && 'border-red-500'
              )}
              rows={3}
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
                  className={cn(
                    'px-3 py-2 rounded-md text-sm border transition-colors flex items-center space-x-2',
                    formData.priority === option.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted'
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
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
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
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1"
            />
            <Button onClick={handleAddTag} variant="outline" size="sm">
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

      {/* フッター */}
      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="outline" onClick={handleClose}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} className="flex items-center space-x-2">
          <Save className="h-4 w-4" />
          <span>作成</span>
        </Button>
      </div>
    </Modal>
  );
};