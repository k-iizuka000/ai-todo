import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { 
  isClickOutsideExcluding, 
  DEFAULT_MODAL_EXCLUDE_SELECTORS,
  elementMatchesAnySelector 
} from "@/utils/eventUtils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  {
    variants: {
      size: {
        default: "max-w-lg max-h-[90vh]",
        sm: "max-w-sm max-h-[85vh]",
        md: "max-w-md max-h-[90vh]",
        lg: "max-w-2xl max-h-[90vh]",
        xl: "max-w-4xl max-h-[95vh]",
        full: "max-w-[95vw] max-h-[95vh]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, size, children, onPointerDownOutside, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        dialogContentVariants({ size, className }),
        "overflow-y-auto overflow-x-hidden"
      )}
      onPointerDownOutside={onPointerDownOutside || ((event) => {
        const originalEvent = event.detail.originalEvent;
        const target = originalEvent.target as HTMLElement;
        // スクロールバーのクリックは無視
        if (originalEvent.offsetX > target.clientWidth || 
            originalEvent.offsetY > target.clientHeight) {
          event.preventDefault();
        }
      })}
      aria-describedby={props["aria-describedby"]}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// Convenience Modal component for easier usage
export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  size?: VariantProps<typeof dialogContentVariants>['size']
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  /** Additional CSS selectors to exclude from click-outside detection */
  excludeSelectors?: string[]
  /** Whether to use default exclude selectors for common form elements */
  useDefaultExcludeSelectors?: boolean
}

const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  size,
  children,
  footer,
  className,
  excludeSelectors = [],
  useDefaultExcludeSelectors = true,
}) => {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();
  
  // Combine default and custom exclude selectors
  const allExcludeSelectors = React.useMemo(() => {
    const selectors = [...excludeSelectors];
    if (useDefaultExcludeSelectors) {
      selectors.unshift(...DEFAULT_MODAL_EXCLUDE_SELECTORS);
    }
    return selectors;
  }, [excludeSelectors, useDefaultExcludeSelectors]);
  
  // Enhanced click outside handler
  const handlePointerDownOutside = React.useCallback((event: CustomEvent) => {
    const originalEvent = event.detail.originalEvent as PointerEvent;
    const target = originalEvent.target as HTMLElement;
    
    // Skip if no content ref
    if (!contentRef.current) {
      return;
    }
    
    // Handle scrollbar clicks (existing logic)
    if (originalEvent.offsetX > target.clientWidth || 
        originalEvent.offsetY > target.clientHeight) {
      event.preventDefault();
      return;
    }
    
    // Check if click should be excluded using our enhanced logic
    if (!isClickOutsideExcluding(originalEvent, contentRef.current, allExcludeSelectors)) {
      event.preventDefault();
    }
  }, [allExcludeSelectors]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={contentRef}
        size={size} 
        className={cn("flex flex-col", className)}
        onPointerDownOutside={handlePointerDownOutside}
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        {/* 固定ヘッダー（アクセシビリティ: Title/Description を常に提供） */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle id={titleId} className={title ? undefined : "sr-only"}>
            {title || "ダイアログ"}
          </DialogTitle>
          {description !== undefined ? (
            <DialogDescription id={descId}>{description}</DialogDescription>
          ) : (
            // 説明がない場合も要素を提供（視覚的には非表示）
            <DialogDescription id={descId} className="sr-only">説明</DialogDescription>
          )}
        </DialogHeader>
        
        {/* スクロール可能なボディ - DialogContentレベルでスクロール管理するため内部スクロールを削除 */}
        <div className="flex-1 py-4">
          {children}
        </div>
        
        {/* 固定フッター */}
        {footer && (
          <DialogFooter className="flex-shrink-0">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Modal,
  dialogContentVariants,
}
