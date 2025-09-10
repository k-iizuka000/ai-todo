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
import { Calendar, Clock, Loader2 } from 'lucide-react'
import { createDateFromFormInput } from '../../utils/dateUtils'
import { validateTaskForm, isValidationClean, type ValidationErrors, type TaskFormData } from '../../utils/validationUtils'
import { validateSelectorInput } from '../../utils/selectorUtils'

// 型定義はutils/validationUtils.tsからインポートされます

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
  { value: 'LOW', label: '低', color: 'bg-priority-low' },
  { value: 'MEDIUM', label: '中', color: 'bg-priority-medium' },
  { value: 'HIGH', label: '高', color: 'bg-priority-high' },
  { value: 'URGENT', label: '緊急', color: 'bg-priority-urgent' },
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
  // プロジェクトストアからプロジェクトデータを取得（projects一覧も追加）
  const { projects, getProjectById } = useProjectStore()
  // フォームデータ
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    estimatedHours: '',
    tags: [],
    projectId: undefined,
  })

  // バリデーションエラー
  const [errors, setErrors] = useState<ValidationErrors>({})
  
  // リアルタイムバリデーション状態
  const [isFormValid, setIsFormValid] = useState(false)

  // 初期データの設定
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'MEDIUM',
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: initialData.estimatedHours?.toString() || '',
        tags: initialData.tags || [],
        projectId: initialData.projectId,
      })
    }
  }, [initialData])

  // フォーム入力変更時のリアルタイムバリデーション
  useEffect(() => {
    // タイトルが入力されている場合のみバリデーションを実行
    if (formData.title.trim().length > 0) {
      const newErrors = validateTaskForm(formData)
      setErrors(newErrors)
      setIsFormValid(Object.keys(newErrors).length === 0)
    } else {
      // タイトルが空の場合は、他のエラーをクリアし、フォームを無効にする
      setErrors({})
      setIsFormValid(false)
    }
  }, [formData])

  // バリデーション関数（セレクター検証を含む）
  const validateForm = useCallback((): boolean => {
    const newErrors = validateTaskForm(formData)
    
    // プロジェクトセレクターの検証
    const projectValidation = validateSelectorInput({
      required: false,
      selectedItems: formData.projectId ? 1 : 0,
      type: 'project'
    });
    
    if (!projectValidation.isValid) {
      newErrors.projectId = projectValidation.errors;
    }
    
    // タグセレクターの検証
    const tagValidation = validateSelectorInput({
      required: false,
      maxItems: 10,
      selectedItems: formData.tags.length,
      type: 'tag'
    });
    
    if (!tagValidation.isValid) {
      newErrors.tags = tagValidation.errors;
    }
    
    setErrors(newErrors)
    return isValidationClean(newErrors)
  }, [formData])

  // フォーム送信処理（安全な日付処理を使用）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: CreateTaskInput | UpdateTaskInput = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      dueDate: createDateFromFormInput(formData.dueDate),
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
  }

  // タグ変更処理
  const handleTagsChange = useCallback((newTags: Tag[]) => {
    handleFieldChange('tags', newTags)
  }, [handleFieldChange])

  return (
    <form onSubmit={handleSubmit} className="task-modal-content space-y-6">
      <h2 className="text-xl font-semibold mb-6">{title}</h2>
      
      {/* タイトル */}
      <FormField
        label="タイトル"
        required
        error={errors.title?.[0]}
        className="task-modal-field"
      >
        <Input
          value={formData.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          placeholder="タスクのタイトルを入力..."
          variant={errors.title ? 'error' : 'default'}
          maxLength={100}
          className="task-form-input"
        />
      </FormField>

      {/* 説明 */}
      <FormField
        label="説明"
        error={errors.description?.[0]}
        hint="詳細な説明を入力してください（任意）"
        className="task-modal-field"
      >
        <div className="space-y-2">
          <Textarea
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="タスクの詳細な説明を入力..."
            rows={4}
            variant={errors.description ? 'error' : 'default'}
            maxLength={1000}
            className="task-form-textarea"
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
          projects={projects}
          selectedProject={formData.projectId ? getProjectById(formData.projectId) : undefined}
          selectedProjectId={formData.projectId}
          onProjectSelect={(project: Project | null) => 
            handleFieldChange('projectId', project ? project.id : undefined)
          }
          onProjectIdSelect={(projectId: string | null) =>
            handleFieldChange('projectId', projectId || undefined)
          }
          allowClear={true}
          allowNone={true}
          noneLabel="プロジェクトなし"
          className="w-full"
          disabled={loading}
          isLoading={loading}
          error={errors.projectId?.[0]}
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
        hint="登録済みのタグから選択してください（最大10個）"
      >
        <TagSelector
          selectedTags={formData.tags}
          availableTags={tags}
          maxTags={10}
          allowCreate={false}  // 新規作成を無効化
          onTagsChange={handleTagsChange}
          editing={true}
          mode="dropdown"
          placeholder="タグを選択..."
          displayMode="auto"
          disabled={loading}
          error={!!errors.tags}
          className="w-full"
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
          disabled={loading || !isFormValid}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              送信中...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  )
}