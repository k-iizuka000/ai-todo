/**
 * ArchivedTasksSection コンポーネント
 * Issue 015: Archived Tasks Toggle Functionality - グループ6 パフォーマンス最適化とA11y
 * 
 * 設計仕様:
 * - Accordionコンポーネントを使用したアーカイブタスク専用セクション
 * - ローカルストレージによる開閉状態の永続化
 * - カスタムタスク表示機能（renderTask）
 * - WCAG 2.1 AA準拠のアクセシビリティ
 * - React.memoによるパフォーマンス最適化
 * - Lazy renderingによる遅延読み込み
 * - Virtual scrolling（1000件以上対応）
 * - キーボードナビゲーション（Tab, Enter, Space, Arrow Keys）
 */

import * as React from "react"
import { Archive } from "lucide-react"
import { cn } from "@/lib/utils"
import { Task } from "@/types/task"
import { useLocalStorage } from "@/hooks/useLocalStorage"
import { safeGetTime } from "@/utils/dateUtils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./Accordion"
import { usePerformanceMonitor, PerformanceMonitor } from "./PerformanceMonitor"

// ========================================
// Type Definitions
// ========================================

export interface ArchivedTasksSectionProps {
  /** アーカイブされたタスクの配列 */
  tasks: Task[]
  /** ローカルストレージで状態を保存する際のキー */
  storageKey: string
  /** タスククリック時のハンドラー */
  onTaskClick?: (task: Task) => void
  /** タグ選択時のハンドラー - グループ2: タグ表示コンポーネントとの整合性 */
  onTagSelect?: (tagId: string) => void
  /** プロジェクトクリック時のハンドラー - グループ4: プロジェクト管理コンポーネントとの整合性 */
  onProjectClick?: (projectId: string) => void
  /** カスタムタスク表示関数。未指定の場合はデフォルトの表示を使用 */
  renderTask?: (task: Task) => React.ReactNode
  /** 追加のCSSクラス */
  className?: string
  /** セクションタイトルのカスタマイズ */
  title?: string
  /** 空の場合のメッセージ */
  emptyMessage?: string
  /** セクションが無効かどうか */
  disabled?: boolean
  /** Virtual scrolling開始する最小タスク数（デフォルト: 100） */
  virtualScrollingThreshold?: number
  /** Virtual scrollingの最大表示高さ（デフォルト: 400px） */
  maxHeight?: number
}

/**
 * ArchivedTasksSection用のカスタム比較関数
 * Task配列の深い比較と日付フィールドの型安全な比較を行い、React.memoでの比較エラーを防ぐ
 */
const areArchivedTasksSectionPropsEqual = (prevProps: ArchivedTasksSectionProps, nextProps: ArchivedTasksSectionProps): boolean => {
  // 基本プロパティの比較
  if (prevProps.storageKey !== nextProps.storageKey ||
      prevProps.className !== nextProps.className ||
      prevProps.title !== nextProps.title ||
      prevProps.emptyMessage !== nextProps.emptyMessage ||
      prevProps.disabled !== nextProps.disabled ||
      prevProps.virtualScrollingThreshold !== nextProps.virtualScrollingThreshold ||
      prevProps.maxHeight !== nextProps.maxHeight ||
      prevProps.onTaskClick !== nextProps.onTaskClick ||
      prevProps.onTagSelect !== nextProps.onTagSelect ||
      prevProps.onProjectClick !== nextProps.onProjectClick ||
      prevProps.renderTask !== nextProps.renderTask) {
    return false;
  }

  // tasks配列の比較
  const prevTasks = prevProps.tasks || [];
  const nextTasks = nextProps.tasks || [];
  if (prevTasks.length !== nextTasks.length) {
    return false;
  }

  // 各タスクの深い比較
  for (let i = 0; i < prevTasks.length; i++) {
    const prevTask = prevTasks[i];
    const nextTask = nextTasks[i];
    
    if (!prevTask || !nextTask) {
      return false;
    }

    // タスクの基本フィールド比較
    if (prevTask.id !== nextTask.id ||
        prevTask.title !== nextTask.title ||
        prevTask.description !== nextTask.description ||
        prevTask.status !== nextTask.status ||
        prevTask.priority !== nextTask.priority ||
        prevTask.projectId !== nextTask.projectId ||
        prevTask.assigneeId !== nextTask.assigneeId ||
        prevTask.estimatedHours !== nextTask.estimatedHours ||
        prevTask.actualHours !== nextTask.actualHours ||
        prevTask.createdBy !== nextTask.createdBy ||
        prevTask.updatedBy !== nextTask.updatedBy) {
      return false;
    }

    // 日付フィールドの型安全な比較
    const prevDueTime = safeGetTime(prevTask.dueDate);
    const nextDueTime = safeGetTime(nextTask.dueDate);
    const prevCreatedTime = safeGetTime(prevTask.createdAt);
    const nextCreatedTime = safeGetTime(nextTask.createdAt);
    const prevUpdatedTime = safeGetTime(prevTask.updatedAt);
    const nextUpdatedTime = safeGetTime(nextTask.updatedAt);
    const prevArchivedTime = safeGetTime(prevTask.archivedAt);
    const nextArchivedTime = safeGetTime(nextTask.archivedAt);

    if (prevDueTime !== nextDueTime ||
        prevCreatedTime !== nextCreatedTime ||
        prevUpdatedTime !== nextUpdatedTime ||
        prevArchivedTime !== nextArchivedTime) {
      return false;
    }

    // タグ配列の比較
    const prevTags = prevTask.tags || [];
    const nextTags = nextTask.tags || [];
    if (prevTags.length !== nextTags.length) {
      return false;
    }
    for (let j = 0; j < prevTags.length; j++) {
      const prevTag = prevTags[j];
      const nextTag = nextTags[j];
      if (!prevTag || !nextTag ||
          prevTag.id !== nextTag.id ||
          prevTag.name !== nextTag.name ||
          prevTag.color !== nextTag.color) {
        return false;
      }
    }

    // サブタスク配列の比較
    const prevSubtasks = prevTask.subtasks || [];
    const nextSubtasks = nextTask.subtasks || [];
    if (prevSubtasks.length !== nextSubtasks.length) {
      return false;
    }
    for (let j = 0; j < prevSubtasks.length; j++) {
      const prevSubtask = prevSubtasks[j];
      const nextSubtask = nextSubtasks[j];
      if (!prevSubtask || !nextSubtask ||
          prevSubtask.id !== nextSubtask.id ||
          prevSubtask.title !== nextSubtask.title ||
          prevSubtask.completed !== nextSubtask.completed) {
        return false;
      }
    }

    // scheduleInfo の比較
    const prevSchedule = prevTask.scheduleInfo;
    const nextSchedule = nextTask.scheduleInfo;
    if (prevSchedule && nextSchedule) {
      if (prevSchedule.startDate !== nextSchedule.startDate ||
          prevSchedule.endDate !== nextSchedule.endDate) {
        return false;
      }
    } else if (prevSchedule || nextSchedule) {
      return false;
    }
  }

  return true;
};

// ========================================
// Virtual Scrolling Implementation
// ========================================

/**
 * VirtualScrollContainer用のカスタム比較関数
 * Task配列の深い比較と日付フィールドの型安全な比較を行い、React.memoでの比較エラーを防ぐ
 */
const areVirtualScrollPropsEqual = (
  prevProps: {
    items: Task[];
    itemHeight: number;
    maxHeight: number;
    renderItem: (task: Task, index: number) => React.ReactNode;
    onItemClick?: (task: Task) => void;
  },
  nextProps: {
    items: Task[];
    itemHeight: number;
    maxHeight: number;
    renderItem: (task: Task, index: number) => React.ReactNode;
    onItemClick?: (task: Task) => void;
  }
): boolean => {
  // 基本プロパティの比較
  if (prevProps.itemHeight !== nextProps.itemHeight ||
      prevProps.maxHeight !== nextProps.maxHeight ||
      prevProps.renderItem !== nextProps.renderItem ||
      prevProps.onItemClick !== nextProps.onItemClick) {
    return false;
  }

  // items配列の比較（ArchivedTasksSectionと同じロジック）
  const prevItems = prevProps.items || [];
  const nextItems = nextProps.items || [];
  if (prevItems.length !== nextItems.length) {
    return false;
  }

  // 各タスクの深い比較
  for (let i = 0; i < prevItems.length; i++) {
    const prevTask = prevItems[i];
    const nextTask = nextItems[i];
    
    if (!prevTask || !nextTask) {
      return false;
    }

    // タスクの基本フィールド比較
    if (prevTask.id !== nextTask.id ||
        prevTask.title !== nextTask.title ||
        prevTask.description !== nextTask.description ||
        prevTask.status !== nextTask.status ||
        prevTask.priority !== nextTask.priority ||
        prevTask.projectId !== nextTask.projectId ||
        prevTask.assigneeId !== nextTask.assigneeId ||
        prevTask.estimatedHours !== nextTask.estimatedHours ||
        prevTask.actualHours !== nextTask.actualHours ||
        prevTask.createdBy !== nextTask.createdBy ||
        prevTask.updatedBy !== nextTask.updatedBy) {
      return false;
    }

    // 日付フィールドの型安全な比較
    const prevDueTime = safeGetTime(prevTask.dueDate);
    const nextDueTime = safeGetTime(nextTask.dueDate);
    const prevCreatedTime = safeGetTime(prevTask.createdAt);
    const nextCreatedTime = safeGetTime(nextTask.createdAt);
    const prevUpdatedTime = safeGetTime(prevTask.updatedAt);
    const nextUpdatedTime = safeGetTime(nextTask.updatedAt);
    const prevArchivedTime = safeGetTime(prevTask.archivedAt);
    const nextArchivedTime = safeGetTime(nextTask.archivedAt);

    if (prevDueTime !== nextDueTime ||
        prevCreatedTime !== nextCreatedTime ||
        prevUpdatedTime !== nextUpdatedTime ||
        prevArchivedTime !== nextArchivedTime) {
      return false;
    }
  }

  return true;
};

/**
 * Virtual scrollingコンポーネント - キーボードナビゲーション対応
 * パフォーマンス最適化: 1000件以上のタスクに対応
 */
const VirtualScrollContainer: React.FC<{
  items: Task[]
  itemHeight: number
  maxHeight: number
  renderItem: (task: Task, index: number) => React.ReactNode
  onItemClick?: (task: Task) => void
}> = React.memo(({ items, itemHeight, maxHeight, renderItem, onItemClick }) => {
  const [scrollTop, setScrollTop] = React.useState(0)
  const [focusedIndex, setFocusedIndex] = React.useState(0)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  // 表示可能なアイテムの計算
  const visibleCount = Math.ceil(maxHeight / itemHeight) + 2 // バッファを含む
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(startIndex + visibleCount, items.length)
  
  const visibleItems = React.useMemo(() => 
    items.slice(startIndex, endIndex),
    [items, startIndex, endIndex]
  )
  
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight
  
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // キーボードナビゲーション実装（Tab, Enter, Space, Arrow Keys対応）
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
      case 'PageDown':
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + visibleCount, items.length - 1))
        break
      case 'PageUp':
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - visibleCount, 0))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (onItemClick && items[focusedIndex]) {
          onItemClick(items[focusedIndex])
        }
        break
    }
  }, [items, visibleCount, focusedIndex, onItemClick])

  // フォーカスされたアイテムを表示範囲内にスクロール
  React.useEffect(() => {
    if (containerRef.current) {
      const focusedTop = focusedIndex * itemHeight
      const focusedBottom = focusedTop + itemHeight
      const currentScrollTop = containerRef.current.scrollTop
      const scrollBottom = currentScrollTop + maxHeight

      if (focusedTop < currentScrollTop) {
        // 上方向にスクロール
        containerRef.current.scrollTop = focusedTop
      } else if (focusedBottom > scrollBottom) {
        // 下方向にスクロール
        containerRef.current.scrollTop = focusedBottom - maxHeight
      }
    }
  }, [focusedIndex, itemHeight, maxHeight])
  
  return (
    <div
      ref={containerRef}
      style={{ height: `${Math.min(maxHeight, totalHeight)}px`, overflowY: 'auto' }}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      className="border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      role="listbox"
      aria-label={`アーカイブされたタスク一覧 (${items.length}件中 ${visibleItems.length}件表示)`}
      aria-activedescendant={`virtual-item-${focusedIndex}`}
      tabIndex={0}
    >
      <div 
        style={{ height: `${totalHeight}px`, position: 'relative' }}
        aria-live="polite"
      >
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              id={`virtual-item-${startIndex + index}`}
              style={{ height: `${itemHeight}px` }}
              role="option"
              aria-setsize={items.length}
              aria-posinset={startIndex + index + 1}
              aria-selected={startIndex + index === focusedIndex}
              className={startIndex + index === focusedIndex ? 'bg-blue-50 dark:bg-blue-900' : ''}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}, areVirtualScrollPropsEqual)
VirtualScrollContainer.displayName = "VirtualScrollContainer"

// ========================================
// Default Task Renderer
// ========================================

/**
 * DefaultTaskRenderer用のカスタム比較関数
 * Task型の日付フィールドの型安全な比較を行い、React.memoでの比較エラーを防ぐ
 */
const areDefaultTaskRendererPropsEqual = (
  prevProps: {
    task: Task;
    onClick?: () => void;
    isFocused?: boolean;
  },
  nextProps: {
    task: Task;
    onClick?: () => void;
    isFocused?: boolean;
  }
): boolean => {
  // 基本プロパティの比較
  if (prevProps.onClick !== nextProps.onClick ||
      prevProps.isFocused !== nextProps.isFocused) {
    return false;
  }

  const prevTask = prevProps.task;
  const nextTask = nextProps.task;

  // タスクの基本フィールド比較
  if (prevTask.id !== nextTask.id ||
      prevTask.title !== nextTask.title ||
      prevTask.description !== nextTask.description ||
      prevTask.status !== nextTask.status ||
      prevTask.priority !== nextTask.priority ||
      prevTask.projectId !== nextTask.projectId ||
      prevTask.assigneeId !== nextTask.assigneeId ||
      prevTask.estimatedHours !== nextTask.estimatedHours ||
      prevTask.actualHours !== nextTask.actualHours ||
      prevTask.createdBy !== nextTask.createdBy ||
      prevTask.updatedBy !== nextTask.updatedBy) {
    return false;
  }

  // 日付フィールドの型安全な比較
  const prevDueTime = safeGetTime(prevTask.dueDate);
  const nextDueTime = safeGetTime(nextTask.dueDate);
  const prevCreatedTime = safeGetTime(prevTask.createdAt);
  const nextCreatedTime = safeGetTime(nextTask.createdAt);
  const prevUpdatedTime = safeGetTime(prevTask.updatedAt);
  const nextUpdatedTime = safeGetTime(nextTask.updatedAt);
  const prevArchivedTime = safeGetTime(prevTask.archivedAt);
  const nextArchivedTime = safeGetTime(nextTask.archivedAt);

  if (prevDueTime !== nextDueTime ||
      prevCreatedTime !== nextCreatedTime ||
      prevUpdatedTime !== nextUpdatedTime ||
      prevArchivedTime !== nextArchivedTime) {
    return false;
  }

  return true;
};

/**
 * デフォルトのタスク表示コンポーネント
 * WCAG 2.1 AA準拠のアクセシビリティ実装
 * キーボードナビゲーション対応（Tab, Enter, Space）
 */
const DefaultTaskRenderer: React.FC<{
  task: Task
  onClick?: () => void
  isFocused?: boolean
}> = React.memo(({ task, onClick, isFocused = false }) => {
  const handleClick = React.useCallback(() => {
    onClick?.()
  }, [onClick])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }, [handleClick])

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-md border",
        "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700",
        "transition-colors duration-200",
        // WCAG 2.1 AA準拠: フォーカス管理とコントラスト比
        onClick && [
          "cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500",
          "focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
          "hover:shadow-sm hover:border-blue-300 dark:hover:border-blue-600",
          // ハイコントラストモード対応
          "forced-colors:border-[ButtonBorder] forced-colors:focus:ring-[Highlight]"
        ],
        // フォーカス状態の視覚的表示
        isFocused && [
          "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900",
          "border-blue-300 dark:border-blue-600"
        ]
      )}
      onClick={handleClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      // WCAG 2.1 AA準拠: アクセシブルな名前とディスクリプション
      aria-label={onClick ? `タスク「${task.title}」を詳細表示` : undefined}
      aria-describedby={task.description ? `task-desc-${task.id}` : undefined}
    >
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {task.title}
        </h4>
        {task.description && (
          <p 
            id={`task-desc-${task.id}`}
            className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1"
          >
            {task.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200">
            {task.priority}
          </span>
          {task.dueDate && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              期限: {new Date(task.dueDate).toLocaleDateString('ja-JP')}
            </span>
          )}
        </div>
      </div>
      <Archive className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" aria-hidden="true" />
    </div>
  )
}, areDefaultTaskRendererPropsEqual)
DefaultTaskRenderer.displayName = "DefaultTaskRenderer"

// ========================================
// Main Component
// ========================================

/**
 * ArchivedTasksSection Component
 * アーカイブされたタスクを表示するセクション
 * グループ6: パフォーマンス最適化とA11y対応
 */
export const ArchivedTasksSection = React.memo<ArchivedTasksSectionProps>(({
  tasks,
  storageKey,
  onTaskClick,
  onTagSelect,
  onProjectClick,
  renderTask,
  className,
  title = "アーカイブ済みタスク",
  emptyMessage = "アーカイブされたタスクはありません",
  disabled = false,
  virtualScrollingThreshold = 100,
  maxHeight = 400,
}) => {
  // パフォーマンス監視（開発環境のみ）
  const { measureInteraction } = usePerformanceMonitor(
    `ArchivedTasksSection-${storageKey}`,
    false // Vite環境変数の型定義がないため一時的に無効化
  )

  // ローカルストレージによる開閉状態の永続化
  const [isExpanded, setIsExpanded] = useLocalStorage<boolean>(
    `archived-section-${storageKey}`,
    false
  )

  // アーカイブタスクのフィルタリング（パフォーマンス最適化）
  const archivedTasks = React.useMemo(() => 
    tasks.filter(task => task.status === 'archived'),
    [tasks]
  )

  // タスククリック処理（パフォーマンス監視付き）
  const handleTaskClick = React.useCallback((task: Task) => {
    if (disabled || !onTaskClick) return
    
    const endMeasure = measureInteraction('task-click')
    onTaskClick(task)
    endMeasure()
  }, [disabled, onTaskClick, measureInteraction])

  // Virtual scrollingを使用するかの判定
  const useVirtualScrolling = archivedTasks.length >= virtualScrollingThreshold

  // Virtual scrolling用のアイテムレンダラー
  const renderVirtualItem = React.useCallback((task: Task) => {
    return renderTask ? (
      renderTask(task)
    ) : (
      <DefaultTaskRenderer
        key={task.id}
        task={task}
        onClick={() => handleTaskClick(task)}
      />
    )
  }, [renderTask, handleTaskClick])

  // アーカイブタスクが空の場合は何も表示しない
  if (archivedTasks.length === 0) {
    return null
  }

  const accordionValue = isExpanded ? 'archived' : ''

  // パフォーマンス監視付きでレンダリング
  return (
    <PerformanceMonitor
      componentName={`ArchivedTasksSection-${storageKey}`}
      enabled={false}
    >
      <div className={cn("space-y-2", className)}>
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={(value) => {
            const endMeasure = measureInteraction('accordion-toggle')
            setIsExpanded(value === 'archived')
            endMeasure()
          }}
        >
          <AccordionItem value="archived" disabled={disabled}>
            <AccordionTrigger
              className={cn(
                "text-left",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label={`${title} - ${archivedTasks.length}件のタスク - Enter または Space で展開/折りたたみ`}
            >
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-gray-500" aria-hidden="true" />
                <span className="font-medium">
                  {title}
                </span>
                <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {archivedTasks.length}
                </span>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="pt-2">
              {archivedTasks.length === 0 ? (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <Archive className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              ) : (
                // パフォーマンス最適化: lazy rendering - アコーディオンが展開されているときのみレンダリング
                isExpanded && (
                  useVirtualScrolling ? (
                    // Virtual scrolling: 大量のタスクに対応（キーボードナビゲーション付き）
                    <div>
                      <p className="text-xs text-gray-500 mb-2">
                        キーボードナビゲーション: ↑↓で選択、Enter/Spaceで開く、Home/End/PageUp/PageDownで移動
                      </p>
                      <VirtualScrollContainer
                        items={archivedTasks}
                        itemHeight={80} // タスクカードの推定高さ
                        maxHeight={maxHeight}
                        renderItem={renderVirtualItem}
                        onItemClick={handleTaskClick}
                      />
                    </div>
                  ) : (
                    // 通常のレンダリング - WCAG 2.1 AA準拠
                    <div 
                      className="space-y-2" 
                      role="list" 
                      aria-label={`アーカイブされたタスク一覧 (${archivedTasks.length}件) - Tabで各タスクに移動`}
                    >
                      {archivedTasks.map((task, index) => (
                        <div 
                          key={task.id} 
                          role="listitem"
                          aria-setsize={archivedTasks.length}
                          aria-posinset={index + 1}
                        >
                          {renderTask ? (
                            renderTask(task)
                          ) : (
                            <DefaultTaskRenderer
                              task={task}
                              onClick={() => handleTaskClick(task)}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )
                )
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </PerformanceMonitor>
  )
}, areArchivedTasksSectionPropsEqual)
ArchivedTasksSection.displayName = "ArchivedTasksSection"

// ========================================
// Exports
// ========================================

export { DefaultTaskRenderer }