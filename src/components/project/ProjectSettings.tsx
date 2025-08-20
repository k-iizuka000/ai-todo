import React, { useState } from 'react';
import { Save, Archive, Trash2, Users, Calendar, AlertCircle, Settings, Info } from 'lucide-react';
import { Project, UpdateProjectInput, ProjectStatus, ProjectPriority } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProjectSettingsProps {
  project: Project;
  onUpdateProject: (id: string, updates: UpdateProjectInput) => void;
  onArchiveProject?: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  className?: string;
}

const statusOptions: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'planning', label: '計画中', color: 'text-blue-600 bg-blue-50' },
  { value: 'active', label: 'アクティブ', color: 'text-green-600 bg-green-50' },
  { value: 'on_hold', label: '保留中', color: 'text-yellow-600 bg-yellow-50' },
  { value: 'completed', label: '完了', color: 'text-gray-600 bg-gray-50' },
  { value: 'cancelled', label: 'キャンセル', color: 'text-red-600 bg-red-50' },
];

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
 * プロジェクト設定画面
 */
export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  project,
  onUpdateProject,
  onArchiveProject,
  onDeleteProject,
  className,
}) => {
  const [formData, setFormData] = useState<UpdateProjectInput>({
    name: project.name,
    description: project.description || '',
    status: project.status,
    priority: project.priority,
    color: project.color,
    icon: project.icon,
    startDate: project.startDate,
    endDate: project.endDate,
    deadline: project.deadline,
    budget: project.budget,
    tags: [...project.tags],
  });

  const [currentTag, setCurrentTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: keyof UpdateProjectInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
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
      setHasChanges(true);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
    setHasChanges(true);
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

  const handleSave = () => {
    if (!validateForm()) return;

    const updates: UpdateProjectInput = {
      ...formData,
      name: formData.name?.trim(),
      description: formData.description?.trim() || undefined,
    };

    onUpdateProject(project.id, updates);
    setHasChanges(false);
  };

  const formatDateForInput = (date?: Date): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseInputDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    return new Date(dateString);
  };

  const formatCurrency = (amount?: number): string => {
    if (!amount) return '未設定';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">プロジェクト設定</h2>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>保存</span>
          </Button>
        )}
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">基本情報</CardTitle>
          <CardDescription>プロジェクトの基本的な情報を管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              プロジェクト名 <span className="text-red-500">*</span>
            </label>
            <Input
              value={formData.name || ''}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">ステータス</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('status', option.value)}
                    className={cn(
                      'px-3 py-1 rounded-md text-sm border transition-colors',
                      formData.status === option.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {option.label}
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
                    className={cn(
                      'px-3 py-1 rounded-md text-sm border transition-colors flex items-center space-x-2',
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
          </div>
        </CardContent>
      </Card>

      {/* 外観設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">外観設定</CardTitle>
          <CardDescription>プロジェクトの見た目をカスタマイズします</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
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
        </CardContent>
      </Card>

      {/* 日程・予算 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">日程・予算</CardTitle>
          <CardDescription>プロジェクトのスケジュールと予算を管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <p className="text-xs text-muted-foreground mt-1">
              現在の予算: {formatCurrency(project.budget)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* タグ管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">タグ管理</CardTitle>
          <CardDescription>プロジェクトを分類するためのタグを管理します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              placeholder="新しいタグを入力"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1"
            />
            <Button onClick={handleAddTag} variant="outline" size="sm">
              追加
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags?.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleRemoveTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
            {(!formData.tags || formData.tags.length === 0) && (
              <p className="text-muted-foreground text-sm">タグが設定されていません</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* プロジェクト情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>プロジェクト情報</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">メンバー数:</span>
                <span>{project.members.length}名</span>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">作成日:</span>
                <span>{project.createdAt.toLocaleDateString('ja-JP')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">更新日:</span>
                <span>{project.updatedAt.toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium">プロジェクトID:</span>
                <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {project.id}
                </span>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium">オーナー:</span>
                <span>{project.ownerId}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">アーカイブ:</span>
                <span>{project.isArchived ? 'はい' : 'いいえ'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 危険操作 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">危険操作</CardTitle>
          <CardDescription>
            これらの操作は取り消すことができません。慎重に行ってください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {onArchiveProject && (
              <Button
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                onClick={() => onArchiveProject(project.id)}
              >
                <Archive className="h-4 w-4 mr-2" />
                アーカイブ
              </Button>
            )}
            {onDeleteProject && (
              <Button
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => onDeleteProject(project.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};