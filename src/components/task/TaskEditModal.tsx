import React, { useState, useCallback, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { UpdateTaskInput, Task, TaskStatus } from '@/types/task'
import { TaskForm } from './TaskForm'
import { Edit, Archive, Trash2, Copy, History, ExternalLink } from 'lucide-react'

export interface TaskEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  onTaskUpdate: (taskId: string, updates: UpdateTaskInput) => Promise<void>
  onTaskDelete?: (taskId: string) => Promise<void>
  onTaskDuplicate?: (task: Task) => Promise<void>
  className?: string
  showAdvancedActions?: boolean
}

/**
 * タスク編集モーダルコンポーネント
 * 
 * 機能:
 * - TaskFormを使用したタスク編集フォーム
 * - タスクの削除、複製、アーカイブ機能
 * - タスク履歴表示（プレースホルダ）
 * - AI支援による編集提案（プレースホルダ）
 * - バリデーションとエラーハンドリング
 */
export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  open,
  onOpenChange,
  task,
  onTaskUpdate,
  onTaskDelete,
  onTaskDuplicate,
  className,
  showAdvancedActions = true,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'edit' | 'history' | 'advanced'>('edit')

  // タスクデータを初期データとして設定
  const [initialData, setInitialData] = useState<UpdateTaskInput>({})

  useEffect(() => {
    if (task) {
      setInitialData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        tags: task.tags,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours,
        status: task.status,
      })
    }
  }, [task])

  // フォーム送信処理
  const handleSubmit = useCallback(async (formData: UpdateTaskInput) => {
    setIsLoading(true)
    setError(null)

    try {
      await onTaskUpdate(task.id, formData)
      
      // 成功時はモーダルを閉じる
      onOpenChange(false)
    } catch (err) {
      console.error('タスク更新エラー:', err)
      setError(
        err instanceof Error 
          ? err.message 
          : 'タスクの更新に失敗しました。再度お試しください。'
      )
    } finally {
      setIsLoading(false)
    }
  }, [onTaskUpdate, task.id, onOpenChange])

  // モーダルを閉じる処理
  const handleCancel = useCallback(() => {
    if (!isLoading) {
      onOpenChange(false)
      setError(null)
    }
  }, [isLoading, onOpenChange])

  // タスク削除処理
  const handleDelete = async () => {
    if (!onTaskDelete) return
    
    const confirmed = window.confirm(
      `タスク「${task.title}」を削除してもよろしいですか？\nこの操作は元に戻すことができません。`
    )
    
    if (!confirmed) return

    setIsLoading(true)
    try {
      await onTaskDelete(task.id)
      onOpenChange(false)
    } catch (err) {
      console.error('タスク削除エラー:', err)
      setError('タスクの削除に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  // タスク複製処理
  const handleDuplicate = async () => {
    if (!onTaskDuplicate) return

    setIsLoading(true)
    try {
      await onTaskDuplicate(task)
      onOpenChange(false)
    } catch (err) {
      console.error('タスク複製エラー:', err)
      setError('タスクの複製に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }

  // タスクアーカイブ処理
  const handleArchive = async () => {
    const newStatus: TaskStatus = task.status === 'archived' ? 'todo' : 'archived'
    const action = newStatus === 'archived' ? 'アーカイブ' : 'アーカイブ解除'
    
    setIsLoading(true)
    try {
      await onTaskUpdate(task.id, { status: newStatus })
      onOpenChange(false)
    } catch (err) {
      console.error(`タスク${action}エラー:`, err)
      setError(`タスクの${action}に失敗しました。`)
    } finally {
      setIsLoading(false)
    }
  }

  // エラーをクリア
  const clearError = () => setError(null)


  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      className={className}
      title={`タスクを編集 - ${task?.title}`}
      description={`作成日: ${task?.createdAt ? new Date(task.createdAt).toLocaleDateString('ja-JP') : '不明'}`}
    >
      <div className="space-y-4">
        {/* タブナビゲーション */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'edit'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit className="h-4 w-4 inline mr-2" />
            編集
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="h-4 w-4 inline mr-2" />
            履歴
          </button>
          {showAdvancedActions && (
            <button
              type="button"
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'advanced'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              詳細操作
            </button>
          )}
        </div>

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
                  <h4 className="text-sm font-medium text-destructive">操作エラー</h4>
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

        {/* タブコンテンツ */}
        {activeTab === 'edit' && (
          <TaskForm
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitLabel="更新"
            title=""
            isEdit={true}
            loading={isLoading}
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="font-medium">タスク履歴</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {/* ダミーの履歴データ */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">タスクが作成されました</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(task.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {task.createdBy}によって作成
                  </p>
                </div>
              </div>
              
              {task.updatedAt !== task.createdAt && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">タスクが更新されました</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.updatedAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.updatedBy}によって更新
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                詳細な履歴機能は今後のアップデートで提供予定です
              </p>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && showAdvancedActions && (
          <div className="space-y-4">
            <h3 className="font-medium">詳細操作</h3>
            
            <div className="grid gap-3">
              {/* 複製ボタン */}
              {onTaskDuplicate && (
                <Button
                  variant="outline"
                  onClick={handleDuplicate}
                  disabled={isLoading}
                  className="justify-start"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  タスクを複製
                </Button>
              )}

              {/* アーカイブボタン */}
              <Button
                variant="outline"
                onClick={handleArchive}
                disabled={isLoading}
                className="justify-start"
              >
                <Archive className="h-4 w-4 mr-2" />
                {task.status === 'archived' ? 'アーカイブ解除' : 'アーカイブ'}
              </Button>

              {/* 外部リンクボタン（プレースホルダ） */}
              <Button
                variant="outline"
                disabled={true}
                className="justify-start opacity-50"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                関連リンクを開く（開発中）
              </Button>

              {/* 削除ボタン */}
              {onTaskDelete && (
                <div className="border-t pt-3 mt-4">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="w-full justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    タスクを削除
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    この操作は元に戻すことができません
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

/**
 * タスク編集ボタンコンポーネント
 * TaskEditModalと組み合わせて使用
 */
export interface TaskEditButtonProps {
  task: Task
  onTaskUpdate: (taskId: string, updates: UpdateTaskInput) => Promise<void>
  onTaskDelete?: (taskId: string) => Promise<void>
  onTaskDuplicate?: (task: Task) => Promise<void>
  children?: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  disabled?: boolean
  showAdvancedActions?: boolean
}

export const TaskEditButton: React.FC<TaskEditButtonProps> = ({
  task,
  onTaskUpdate,
  onTaskDelete,
  onTaskDuplicate,
  children,
  variant = 'ghost',
  size = 'sm',
  className,
  disabled = false,
  showAdvancedActions = true,
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
        {children || <Edit className="h-4 w-4" />}
      </Button>

      <TaskEditModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        task={task}
        onTaskUpdate={onTaskUpdate}
        onTaskDelete={onTaskDelete}
        onTaskDuplicate={onTaskDuplicate}
        showAdvancedActions={showAdvancedActions}
      />
    </>
  )
}

export default TaskEditModal