import React from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// バリデーションエラーの型（TaskFormから参照）
export interface ValidationErrors {
  title?: string[]
  description?: string[]
  priority?: string[]
  dueDate?: string[]
  estimatedHours?: string[]
  tags?: string[]
  [key: string]: string[] | undefined
}

// メッセージの種類
export type MessageType = 'error' | 'warning' | 'info' | 'success'

// 個別のメッセージプロパティ
export interface ValidationMessage {
  type: MessageType
  field?: string
  message: string
}

// バリデーションメッセージコンポーネントのプロパティ
export interface ValidationMessagesProps {
  errors?: ValidationErrors
  messages?: ValidationMessage[]
  className?: string
  showFieldLabels?: boolean
  maxMessagesPerField?: number
}

// フィールドラベルのマッピング
const FIELD_LABELS: Record<string, string> = {
  title: 'タイトル',
  description: '説明',
  priority: '優先度',
  dueDate: '期日',
  estimatedHours: '見積時間',
  tags: 'タグ',
  projectId: 'プロジェクト',
  assigneeId: '担当者',
  subtasks: 'サブタスク',
}

// メッセージタイプに対応するアイコンとスタイル
const MESSAGE_CONFIG: Record<MessageType, {
  icon: React.ElementType
  className: string
  bgClassName: string
  iconClassName: string
}> = {
  error: {
    icon: AlertCircle,
    className: 'text-destructive border-destructive/20 bg-destructive/5',
    bgClassName: 'bg-destructive/10',
    iconClassName: 'text-destructive',
  },
  warning: {
    icon: AlertCircle,
    className: 'text-yellow-600 border-yellow-200 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-800 dark:bg-yellow-900/10',
    bgClassName: 'bg-yellow-100 dark:bg-yellow-900/20',
    iconClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    className: 'text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-900/10',
    bgClassName: 'bg-blue-100 dark:bg-blue-900/20',
    iconClassName: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    icon: CheckCircle,
    className: 'text-green-600 border-green-200 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-900/10',
    bgClassName: 'bg-green-100 dark:bg-green-900/20',
    iconClassName: 'text-green-600 dark:text-green-400',
  },
}

/**
 * 個別のバリデーションメッセージを表示するコンポーネント
 */
export const ValidationMessageItem: React.FC<{
  message: ValidationMessage
  showFieldLabel?: boolean
  className?: string
}> = ({ message, showFieldLabel = false, className }) => {
  const config = MESSAGE_CONFIG[message.type]
  const Icon = config.icon
  const fieldLabel = message.field ? FIELD_LABELS[message.field] : null

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-3 rounded-md border text-sm',
        config.className,
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.iconClassName)} />
      <div className="flex-1">
        {showFieldLabel && fieldLabel && (
          <span className="font-medium">{fieldLabel}: </span>
        )}
        <span>{message.message}</span>
      </div>
    </div>
  )
}

/**
 * バリデーションメッセージを一覧表示するコンポーネント
 */
export const ValidationMessages: React.FC<ValidationMessagesProps> = ({
  errors = {},
  messages = [],
  className,
  showFieldLabels = true,
  maxMessagesPerField = 3,
}) => {
  // エラーオブジェクトからメッセージ配列に変換
  const errorMessages: ValidationMessage[] = Object.entries(errors).flatMap(
    ([field, fieldErrors]) => 
      (fieldErrors || [])
        .slice(0, maxMessagesPerField)
        .map(message => ({
          type: 'error' as MessageType,
          field,
          message,
        }))
  )

  // すべてのメッセージを統合
  const allMessages = [...errorMessages, ...messages]

  // メッセージがない場合は何も表示しない
  if (allMessages.length === 0) {
    return null
  }

  // メッセージを種類別にソート（error > warning > info > success）
  const sortedMessages = allMessages.sort((a, b) => {
    const priority = { error: 0, warning: 1, info: 2, success: 3 }
    return priority[a.type] - priority[b.type]
  })

  return (
    <div className={cn('space-y-2', className)} role="alert">
      {sortedMessages.map((message, index) => (
        <ValidationMessageItem
          key={`${message.field || 'general'}-${index}`}
          message={message}
          showFieldLabel={showFieldLabels}
        />
      ))}
    </div>
  )
}

/**
 * フィールド固有のバリデーションメッセージを表示するコンポーネント
 */
export interface FieldValidationProps {
  field: string
  errors?: ValidationErrors
  messages?: ValidationMessage[]
  className?: string
  showIcon?: boolean
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
  field,
  errors = {},
  messages = [],
  className,
  showIcon = true,
}) => {
  const fieldErrors = errors[field] || []
  const fieldMessages = messages.filter(m => m.field === field)
  
  const allMessages = [
    ...fieldErrors.map(message => ({ type: 'error' as MessageType, field, message })),
    ...fieldMessages,
  ]

  if (allMessages.length === 0) {
    return null
  }

  return (
    <div className={cn('mt-1', className)}>
      {allMessages.map((message, index) => {
        const config = MESSAGE_CONFIG[message.type]
        const Icon = config.icon

        return (
          <div
            key={index}
            className={cn(
              'flex items-start gap-1 text-xs',
              config.iconClassName
            )}
            role="alert"
            aria-live="polite"
          >
            {showIcon && <Icon className="h-3 w-3 mt-0.5 flex-shrink-0" />}
            <span>{message.message}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * フォーム全体のバリデーション状態を表示するサマリーコンポーネント
 */
export interface ValidationSummaryProps {
  errors?: ValidationErrors
  messages?: ValidationMessage[]
  className?: string
  title?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors = {},
  messages = [],
  className,
  title = 'フォームの確認事項',
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)
  
  const errorCount = Object.values(errors).reduce((total, fieldErrors) => 
    total + (fieldErrors?.length || 0), 0
  )
  const totalMessages = errorCount + messages.length

  if (totalMessages === 0) {
    return null
  }

  const content = (
    <ValidationMessages
      errors={errors}
      messages={messages}
      showFieldLabels={true}
      className="space-y-1"
    />
  )

  if (collapsible) {
    return (
      <div className={cn('border rounded-lg', className)}>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <span className="font-medium text-sm">
            {title} ({totalMessages}件)
          </span>
          <span className={cn('transition-transform', isExpanded && 'rotate-180')}>
            ▼
          </span>
        </button>
        {isExpanded && (
          <div className="p-3 border-t">
            {content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="font-medium text-sm">{title}</h3>
      {content}
    </div>
  )
}

export default ValidationMessages