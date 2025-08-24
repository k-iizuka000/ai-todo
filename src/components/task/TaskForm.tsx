import React, { useState, useEffect, useCallback } from 'react'
import { Input, Textarea, FormField } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CreateTaskInput, UpdateTaskInput, Priority } from '@/types/task'
import { Tag } from '@/types/tag'
import { ValidationMessages } from './ValidationMessages'
import { TagSelector } from '@/components/tag/TagSelector'
import { useTagStore } from '@/stores/tagStore'
import { ProjectSelector } from '@/components/project/ProjectSelector'
import { useProjectStore } from '@/stores/projectStore'
import { Project } from '@/types/project'
import { Calendar, Clock } from 'lucide-react'

// フォーム用のバリデーションエラー型
export interface ValidationErrors {
  title?: string[]
  description?: string[]
  priority?: string[]
  dueDate?: string[]
  estimatedHours?: string[]
  tags?: string[]
  projectId?: string[]
  [key: string]: string[] | undefined
}

// フォームデータの型
export interface TaskFormData {
  title: string
  description: string
  priority: Priority
  dueDate: string
  estimatedHours: string
  tags: Tag[]
  projectId?: string
}

export interface TaskFormProps {
  initialData?: CreateTaskInput | UpdateTaskInput
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  title: string
  loading?: boolean
}

// 優先度オプション
const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; color: string }> = [
  { value: 'low', label: '低', color: 'bg-priority-low' },
  { value: 'medium', label: '中', color: 'bg-priority-medium' },
  { value: 'high', label: '高', color: 'bg-priority-high' },
  { value: 'urgent', label: '緊急', color: 'bg-priority-urgent' },
]


export const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = '作成',
  title,
  loading = false,
}) => {
  // タグストアからタグデータを取得
  const { tags } = useTagStore()
  // プロジェクトストアからプロジェクトデータを取得
  const { getProjectById } = useProjectStore()
  // フォームデータ
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedHours: '',
    tags: [],
    projectId: undefined,
  })

  // バリデーションエラー
  const [errors, setErrors] = useState<ValidationErrors>({})

  // 初期データの設定
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: initialData.estimatedHours?.toString() || '',
        tags: initialData.tags || [],
        projectId: initialData.projectId,
      })
    }
  }, [initialData])

  // バリデーション関数
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {}

    // タイトルのバリデーション
    if (!formData.title.trim()) {
      newErrors.title = ['タイトルは必須です']
    } else if (formData.title.length > 100) {
      newErrors.title = ['タイトルは100文字以内で入力してください']
    }

    // 説明のバリデーション
    if (formData.description.length > 1000) {
      newErrors.description = ['説明は1000文字以内で入力してください']
    }

    // 期日のバリデーション
    if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
      newErrors.dueDate = ['期日は今日以降の日付を指定してください']
    }

    // 見積時間のバリデーション
    if (formData.estimatedHours) {
      const hours = parseFloat(formData.estimatedHours)
      if (isNaN(hours) || hours < 0) {
        newErrors.estimatedHours = ['正の数値を入力してください']
      } else if (hours > 1000) {
        newErrors.estimatedHours = ['見積時間は1000時間以内で入力してください']
      }
    }

    // タグ数のバリデーション
    if (formData.tags.length > 10) {
      newErrors.tags = ['タグは10個以内で設定してください']
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: CreateTaskInput | UpdateTaskInput = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      tags: formData.tags,
      projectId: formData.projectId,
    }

    try {
      await onSubmit(submitData)
    } catch (error) {
      console.error('フォーム送信エラー:', error)
    }
  }

  // フィールド値変更ハンドラー
  const handleFieldChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  // タグ変更処理
  const handleTagsChange = useCallback((newTags: Tag[]) => {
    handleFieldChange('tags', newTags)
  }, [handleFieldChange])


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold mb-6">{title}</h2>
      
      {/* タイトル */}
      <FormField
        label="タイトル"
        required
        error={errors.title?.[0]}
      >
        <Input
          value={formData.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="タスクのタイトルを入力..."
          variant={errors.title ? 'error' : 'default'}
          maxLength={100}
        />
      </FormField>

      {/* 説明 */}
      <FormField
        label="説明"
        error={errors.description?.[0]}
        hint="詳細な説明を入力してください（任意）"
      >
        <div className="space-y-2">
          <Textarea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="タスクの詳細な説明を入力..."
            rows={4}
            variant={errors.description ? 'error' : 'default'}
            maxLength={1000}
          />
        </div>
      </FormField>

      {/* 優先度 */}
      <FormField
        label="優先度"
        error={errors.priority?.[0]}
      >
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={formData.priority === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFieldChange('priority', option.value)}
              className={`flex items-center gap-2 ${
                formData.priority === option.value ? option.color : ''
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${option.color}`} />
              {option.label}
            </Button>
          ))}
        </div>
      </FormField>

      {/* プロジェクト */}
      <FormField
        label="プロジェクト"
        error={errors.projectId?.[0]}
      >
        <ProjectSelector
          selectedProject={formData.projectId ? getProjectById(formData.projectId) : undefined}
          onProjectSelect={(project: Project | null) => 
            handleFieldChange('projectId', project ? project.id : undefined)
          }
          allowClear={true}
          className="w-full"
          disabled={loading}
        />
      </FormField>

      {/* 期日と見積時間 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="期日"
          error={errors.dueDate?.[0]}
        >
          <div className="relative">
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleFieldChange('dueDate', e.target.value)}
              variant={errors.dueDate ? 'error' : 'default'}
              className="pl-10"
            />
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </FormField>

        <FormField
          label="見積時間"
          error={errors.estimatedHours?.[0]}
          hint="時間単位で入力"
        >
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              min="0"
              max="1000"
              value={formData.estimatedHours}
              onChange={(e) => handleFieldChange('estimatedHours', e.target.value)}
              placeholder="0.0"
              variant={errors.estimatedHours ? 'error' : 'default'}
              className="pl-10"
            />
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </FormField>
      </div>

      {/* タグ */}
      <FormField
        label="タグ"
        error={errors.tags?.[0]}
        hint="タグを選択または新規作成してください（最大10個）"
      >
        <TagSelector
          selectedTags={formData.tags}
          availableTags={tags}
          maxTags={10}
          allowCreate={true}
          onTagsChange={handleTagsChange}
          editing={true}
          placeholder="タグを追加..."
        />
      </FormField>

      {/* バリデーションメッセージ */}
      <ValidationMessages errors={errors} />

      {/* フォームアクション */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={loading || Object.keys(errors).length > 0}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}