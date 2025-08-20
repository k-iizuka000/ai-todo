import React, { useState, useEffect, useCallback } from 'react'
import { Input, Textarea, FormField } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CreateTaskInput, UpdateTaskInput, Priority, Tag } from '@/types/task'
import { ValidationMessages } from './ValidationMessages'
import { Calendar, Clock, Tag as TagIcon } from 'lucide-react'

// フォーム用のバリデーションエラー型
export interface ValidationErrors {
  title?: string[]
  description?: string[]
  priority?: string[]
  dueDate?: string[]
  estimatedHours?: string[]
  tags?: string[]
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

// デフォルトのタグ候補（実際の実装では外部から取得）
const SUGGESTED_TAGS: Tag[] = [
  { id: '1', name: 'バグ修正', color: 'red' },
  { id: '2', name: '新機能', color: 'blue' },
  { id: '3', name: 'ドキュメント', color: 'green' },
  { id: '4', name: 'レビュー', color: 'yellow' },
  { id: '5', name: 'テスト', color: 'purple' },
]

export const TaskForm: React.FC<TaskFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = '作成',
  title,
  loading = false,
}) => {
  // フォームデータ
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedHours: '',
    tags: [],
  })

  // バリデーションエラー
  const [errors, setErrors] = useState<ValidationErrors>({})
  
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

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

  // タグ追加処理
  const handleAddTag = (tagName: string) => {
    const trimmedName = tagName.trim()
    if (!trimmedName) return

    // 既存のタグと重複チェック
    if (formData.tags.some(tag => tag.name === trimmedName)) {
      return
    }

    const newTag: Tag = {
      id: Date.now().toString(),
      name: trimmedName,
      color: 'gray',
    }

    handleFieldChange('tags', [...formData.tags, newTag])
    setTagInput('')
  }

  // タグ削除処理
  const handleRemoveTag = (tagId: string) => {
    handleFieldChange('tags', formData.tags.filter(tag => tag.id !== tagId))
  }


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
        hint="Enterキーで追加できます"
      >
        <div className="space-y-3">
          {/* 既存のタグ表示 */}
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* タグ入力 */}
          <div className="relative">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTag(tagInput)
                }
              }}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
              placeholder="新しいタグを入力..."
              className="pl-10"
            />
            <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {/* タグ候補表示 */}
          {showTagSuggestions && (
            <Card className="absolute z-10 w-full mt-1 p-2 shadow-lg">
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_TAGS.filter(tag => 
                  !formData.tags.some(existing => existing.name === tag.name)
                ).map((tag) => (
                  <Button
                    key={tag.id}
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => handleAddTag(tag.name)}
                  >
                    {tag.name}
                  </Button>
                ))}
              </div>
            </Card>
          )}
        </div>
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