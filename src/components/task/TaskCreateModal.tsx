import React, { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { CreateTaskInput, UpdateTaskInput } from '@/types/task'
import { TaskForm } from './TaskForm'
import { Plus, Sparkles } from 'lucide-react'

export interface TaskCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreate: (task: CreateTaskInput) => Promise<void>
  projectId?: string
  initialData?: Partial<CreateTaskInput>
  className?: string
}

/**
 * 新規タスク作成モーダルコンポーネント
 * 
 * 機能:
 * - TaskFormを使用したタスク作成フォーム
 * - AI支援機能のプレースホルダ
 * - バリデーションとエラーハンドリング
 * - レスポンシブデザイン
 */
export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  open,
  onOpenChange,
  onTaskCreate,
  projectId,
  initialData,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フォーム送信処理
  const handleSubmit = useCallback(async (formData: CreateTaskInput | UpdateTaskInput) => {
    setIsLoading(true)
    setError(null)

    try {
      // プロジェクトIDが指定されている場合は追加
      const taskData: CreateTaskInput = {
        title: formData.title || '',
        description: formData.description,
        priority: formData.priority,
        projectId: projectId || formData.projectId,
        assigneeId: formData.assigneeId,
        tags: formData.tags,
        dueDate: formData.dueDate,
        estimatedHours: formData.estimatedHours,
      }

      await onTaskCreate(taskData)
      
      // 成功時はモーダルを閉じる
      onOpenChange(false)
    } catch (err) {
      console.error('タスク作成エラー:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'タスクの作成に失敗しました。再度お試しください。'
      )
    } finally {
      setIsLoading(false)
    }
  }, [onTaskCreate, projectId, onOpenChange])

  // モーダルを閉じる処理
  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false)
      setError(null)
    }
  }, [isLoading, onOpenChange])

  // エラーをクリア
  const clearError = () => setError(null)

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      className={className}
      title="新しいタスクを作成"
      description="タスクの詳細情報を入力してください"
    >
      <div className="space-y-4">
        {/* エラー表示 */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <div className="bg-destructive text-destructive-foreground rounded-full p-1">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-destructive">作成エラー</h4>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-destructive hover:text-destructive/80"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* AI支援ヒント */}
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-md p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                AI支援機能
              </h4>
              <p className="text-xs text-purple-700 dark:text-purple-200 mt-1">
                タスクのタイトルを入力後、「AI支援で説明を生成」ボタンで詳細な説明を自動生成できます。
                また、内容に基づいて適切なタグも提案します。
              </p>
            </div>
          </div>
        </div>

        {/* メインフォーム */}
        <TaskForm
          initialData={projectId || initialData?.projectId ? { ...initialData, projectId: projectId || initialData?.projectId } : initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="タスクを作成"
          title=""
          loading={isLoading}
        />
      </div>
    </Modal>
  )
}

/**
 * タスク作成ボタンコンポーネント
 * TaskCreateModalと組み合わせて使用
 */
export interface TaskCreateButtonProps {
  onTaskCreate: (task: CreateTaskInput) => Promise<void>
  projectId?: string
  initialData?: Partial<CreateTaskInput>
  children?: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  disabled?: boolean
}

export const TaskCreateButton: React.FC<TaskCreateButtonProps> = ({
  onTaskCreate,
  projectId,
  initialData,
  children,
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className={className}
      >
        {children || (
          <>
            <Plus className="h-4 w-4 mr-2" />
            新しいタスク
          </>
        )}
      </Button>

      <TaskCreateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onTaskCreate={onTaskCreate}
        projectId={projectId}
        initialData={initialData}
      />
    </>
  )
}

/**
 * クイックタスク作成フォーム
 * モーダルを使わず、インラインでタスクを作成
 */
export interface QuickTaskCreateProps {
  onTaskCreate: (task: CreateTaskInput) => Promise<void>
  projectId?: string
  placeholder?: string
  className?: string
}

export const QuickTaskCreate: React.FC<QuickTaskCreateProps> = ({
  onTaskCreate,
  projectId,
  placeholder = "新しいタスクを入力してEnterで作成...",
  className,
}) => {
  const [title, setTitle] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim() || isLoading) return

    setIsLoading(true)
    try {
      const taskData: CreateTaskInput = {
        title: title.trim(),
        projectId,
        priority: 'medium',
      }

      await onTaskCreate(taskData)
      setTitle('') // 成功時にフォームをクリア
    } catch (error) {
      console.error('クイックタスク作成エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          maxLength={100}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || isLoading}
          loading={isLoading}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

export default TaskCreateModal