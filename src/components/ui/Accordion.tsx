/**
 * Accordion汎用コンポーネント
 * Issue 015: Archived Tasks Toggle Functionality - グループ1
 * 
 * 設計仕様:
 * - コンポジション設計パターン（Compound Components）
 * - ARIA属性完全対応（WCAG 2.1 AA準拠）
 * - CSS transitionsによる滑らかなアニメーション
 * - React.memoによるパフォーマンス最適化
 * - TypeScript strict mode対応
 */

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ========================================
// Context for Accordion State Management
// ========================================

interface AccordionContextValue {
  type: 'single' | 'multiple'
  collapsible: boolean
  value: string | string[]
  onValueChange: (value: string | string[]) => void
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null)

const useAccordion = () => {
  const context = React.useContext(AccordionContext)
  if (!context) {
    throw new Error("Accordion components must be used within Accordion")
  }
  return context
}

// ========================================
// Accordion Item Context
// ========================================

interface AccordionItemContextValue {
  value: string
  disabled?: boolean
  isOpen: boolean
}

const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null)

const useAccordionItem = () => {
  const context = React.useContext(AccordionItemContext)
  if (!context) {
    throw new Error("AccordionTrigger and AccordionContent must be used within AccordionItem")
  }
  return context
}

// ========================================
// Type Definitions
// ========================================

export interface AccordionProps {
  type?: 'single' | 'multiple'
  collapsible?: boolean
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (value: string | string[]) => void
  className?: string
  children: React.ReactNode
}

export interface AccordionItemProps {
  value: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

export interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string
  children: React.ReactNode
}

export interface AccordionContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  children: React.ReactNode
}

// ========================================
// Variant Definitions
// ========================================

const accordionTriggerVariants = cva(
  "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
  {
    variants: {
      variant: {
        default: "text-sm",
        large: "text-base py-6"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const accordionContentVariants = cva(
  "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
  {
    variants: {
      variant: {
        default: "pb-4 pt-0",
        padded: "pb-4 pt-0 px-4"
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AccordionTriggerVariantProps
  extends VariantProps<typeof accordionTriggerVariants> {}

export interface AccordionContentVariantProps
  extends VariantProps<typeof accordionContentVariants> {}

// ========================================
// Main Accordion Component
// ========================================

/**
 * Accordion Root Component
 * 複数のAccordionItemを管理するコンテナー
 */
export const Accordion = React.memo(React.forwardRef<
  HTMLDivElement,
  AccordionProps
>(({ 
  type = 'single',
  collapsible = false,
  defaultValue,
  value: controlledValue,
  onValueChange,
  className,
  children,
  ...props 
}, ref) => {
  // 非制御コンポーネント対応
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue ?? (type === 'multiple' ? [] : '')
  )

  const value = controlledValue ?? internalValue
  const handleValueChange = onValueChange ?? setInternalValue

  const contextValue = React.useMemo<AccordionContextValue>(() => ({
    type,
    collapsible,
    value,
    onValueChange: handleValueChange,
  }), [type, collapsible, value, handleValueChange])

  return (
    <AccordionContext.Provider value={contextValue}>
      <div
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  )
}))
Accordion.displayName = "Accordion"

// ========================================
// Accordion Item Component
// ========================================

/**
 * AccordionItem Component
 * 単一のアコーディオンセクションを表現
 */
export const AccordionItem = React.memo(React.forwardRef<
  HTMLDivElement,
  AccordionItemProps
>(({ value, disabled = false, className, children, ...props }, ref) => {
  const { value: accordionValue, type } = useAccordion()

  const isOpen = React.useMemo(() => {
    if (type === 'multiple') {
      return Array.isArray(accordionValue) && accordionValue.includes(value)
    }
    return accordionValue === value
  }, [accordionValue, value, type])

  const contextValue = React.useMemo<AccordionItemContextValue>(() => ({
    value,
    disabled,
    isOpen,
  }), [value, disabled, isOpen])

  return (
    <AccordionItemContext.Provider value={contextValue}>
      <div
        ref={ref}
        data-state={isOpen ? "open" : "closed"}
        data-disabled={disabled ? "" : undefined}
        className={cn("border-b", className)}
        {...props}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}))
AccordionItem.displayName = "AccordionItem"

// ========================================
// Accordion Trigger Component
// ========================================

/**
 * AccordionTrigger Component
 * クリック可能なヘッダー部分
 */
export const AccordionTrigger = React.memo(React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps & AccordionTriggerVariantProps
>(({ className, variant, children, ...props }, ref) => {
  const { type, collapsible, value: accordionValue, onValueChange } = useAccordion()
  const { value, disabled, isOpen } = useAccordionItem()

  const handleClick = React.useCallback(() => {
    if (disabled) return

    if (type === 'multiple') {
      const currentValue = Array.isArray(accordionValue) ? accordionValue : []
      if (isOpen) {
        // 現在のアイテムを削除
        onValueChange(currentValue.filter(v => v !== value))
      } else {
        // 現在のアイテムを追加
        onValueChange([...currentValue, value])
      }
    } else {
      // single type
      if (isOpen && collapsible) {
        onValueChange('')
      } else if (!isOpen) {
        onValueChange(value)
      }
    }
  }, [disabled, type, accordionValue, onValueChange, isOpen, value, collapsible])

  const triggerId = `accordion-trigger-${value}`
  const contentId = `accordion-content-${value}`

  return (
    <button
      ref={ref}
      type="button"
      id={triggerId}
      className={cn(accordionTriggerVariants({ variant }), className)}
      data-state={isOpen ? "open" : "closed"}
      disabled={disabled}
      aria-expanded={isOpen}
      aria-controls={contentId}
      onClick={handleClick}
      {...props}
    >
      {children}
      <ChevronDown 
        className="h-4 w-4 shrink-0 transition-transform duration-200" 
        aria-hidden="true"
      />
    </button>
  )
}))
AccordionTrigger.displayName = "AccordionTrigger"

// ========================================
// Accordion Content Component
// ========================================

/**
 * AccordionContent Component
 * 展開可能なコンテンツ部分
 */
export const AccordionContent = React.memo(React.forwardRef<
  HTMLDivElement,
  AccordionContentProps & AccordionContentVariantProps
>(({ className, variant, children, ...props }, ref) => {
  const { value, isOpen } = useAccordionItem()
  
  const contentId = `accordion-content-${value}`
  const triggerId = `accordion-trigger-${value}`

  return (
    <div
      ref={ref}
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      data-state={isOpen ? "open" : "closed"}
      className={cn(accordionContentVariants({ variant }), className)}
      hidden={!isOpen}
      {...props}
    >
      {children}
    </div>
  )
}))
AccordionContent.displayName = "AccordionContent"

// ========================================
// Exports
// ========================================

export {
  accordionTriggerVariants,
  accordionContentVariants,
}