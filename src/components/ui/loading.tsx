import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Spinner component
const spinnerVariants = cva(
  "animate-spin rounded-full border-solid border-current border-r-transparent",
  {
    variants: {
      size: {
        xs: "h-3 w-3 border-[1px]",
        sm: "h-4 w-4 border-[1.5px]",
        default: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-[2.5px]",
        xl: "h-12 w-12 border-4",
      },
      variant: {
        default: "text-primary",
        muted: "text-muted-foreground",
        white: "text-white",
        destructive: "text-destructive",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, ...props }, ref) => (
    <div
      className={cn(spinnerVariants({ size, variant }), className)}
      ref={ref}
      role="status"
      aria-label="Loading"
      {...props}
    />
  )
)
Spinner.displayName = "Spinner"

// Dots Loading component
const dotsVariants = cva(
  "flex space-x-1",
  {
    variants: {
      size: {
        sm: "space-x-0.5",
        default: "space-x-1",
        lg: "space-x-1.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const dotVariants = cva(
  "rounded-full bg-current animate-pulse",
  {
    variants: {
      size: {
        sm: "h-1 w-1",
        default: "h-2 w-2",
        lg: "h-3 w-3",
      },
      variant: {
        default: "text-primary",
        muted: "text-muted-foreground",
        white: "text-white",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface LoadingDotsProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dotsVariants>,
    VariantProps<typeof dotVariants> {}

const LoadingDots = React.forwardRef<HTMLDivElement, LoadingDotsProps>(
  ({ className, size, variant, ...props }, ref) => (
    <div
      className={cn(dotsVariants({ size }), className)}
      ref={ref}
      role="status"
      aria-label="Loading"
      {...props}
    >
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(dotVariants({ size, variant }))}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: "1.4s",
          }}
        />
      ))}
    </div>
  )
)
LoadingDots.displayName = "LoadingDots"

// Skeleton component
const skeletonVariants = cva(
  "animate-pulse rounded-md bg-muted",
  {
    variants: {
      variant: {
        default: "bg-muted",
        light: "bg-muted/50",
        shimmer: "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-[shimmer_1.5s_ease-in-out_infinite]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        className={cn(skeletonVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

// Loading State component - for full screen or container loading
export interface LoadingStateProps {
  size?: VariantProps<typeof spinnerVariants>['size']
  variant?: VariantProps<typeof spinnerVariants>['variant']
  message?: string
  fullScreen?: boolean
  overlay?: boolean
  className?: string
}

const LoadingState: React.FC<LoadingStateProps> = ({
  size = "lg",
  variant = "default",
  message = "Loading...",
  fullScreen = false,
  overlay = false,
  className,
}) => {
  const containerClasses = cn(
    "flex flex-col items-center justify-center gap-4",
    fullScreen && "fixed inset-0 z-50",
    overlay && "bg-background/80 backdrop-blur-sm",
    !fullScreen && "py-8",
    className
  )

  return (
    <div className={containerClasses}>
      <Spinner size={size} variant={variant} />
      {message && (
        <p className={cn(
          "text-sm",
          variant === "white" ? "text-white" : "text-muted-foreground"
        )}>
          {message}
        </p>
      )}
    </div>
  )
}

// Progress Bar component
export interface ProgressBarProps {
  value: number // 0-100
  className?: string
  showValue?: boolean
  variant?: 'default' | 'success' | 'warning' | 'error'
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className,
  showValue = false,
  variant = 'default'
}) => {
  const clampedValue = Math.min(100, Math.max(0, value))
  
  const variantClasses = {
    default: "bg-primary",
    success: "bg-status-done",
    warning: "bg-priority-medium",
    error: "bg-destructive"
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between items-center mb-1">
        {showValue && (
          <span className="text-sm text-muted-foreground">
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300 ease-out",
            variantClasses[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  )
}

// Task Loading Skeleton - specific for task items
const TaskSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("p-4 border rounded-lg", className)}>
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <Skeleton className="h-3 w-1/2" />
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  </div>
)

// Default Loading component for backward compatibility
const Loading = LoadingState

export {
  Spinner,
  LoadingDots,
  Skeleton,
  LoadingState,
  Loading, // Add this export for backward compatibility
  ProgressBar,
  TaskSkeleton,
  spinnerVariants,
  skeletonVariants,
}