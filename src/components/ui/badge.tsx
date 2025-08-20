import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import type { TaskStatus, Priority } from "@/types/task"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Task status variants
        todo: "border-transparent bg-status-todo text-white",
        "in-progress": "border-transparent bg-status-in-progress text-white",
        done: "border-transparent bg-status-done text-white",
        archived: "border-transparent bg-status-archived text-white",
        // Priority variants
        low: "border-transparent bg-priority-low text-white",
        medium: "border-transparent bg-priority-medium text-white",
        high: "border-transparent bg-priority-high text-white",
        urgent: "border-transparent bg-priority-urgent text-white",
        critical: "border-transparent bg-priority-critical text-white animate-pulse",
        // Outline variants for status
        "todo-outline": "border-status-todo text-status-todo bg-status-todo/10",
        "in-progress-outline": "border-status-in-progress text-status-in-progress bg-status-in-progress/10",
        "done-outline": "border-status-done text-status-done bg-status-done/10",
        "archived-outline": "border-status-archived text-status-archived bg-status-archived/10",
        // Outline variants for priority
        "low-outline": "border-priority-low text-priority-low bg-priority-low/10",
        "medium-outline": "border-priority-medium text-priority-medium bg-priority-medium/10",
        "high-outline": "border-priority-high text-priority-high bg-priority-high/10",
        "urgent-outline": "border-priority-urgent text-priority-urgent bg-priority-urgent/10",
        "critical-outline": "border-priority-critical text-priority-critical bg-priority-critical/10 animate-pulse",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        icon: "w-6 h-6 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  removable?: boolean
  onRemove?: () => void
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, removable = false, onRemove, children, ...props }, ref) => {
    return (
      <div
        className={cn(badgeVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        {children}
        {removable && onRemove && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemove()
            }}
            className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-white/20"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span className="sr-only">Remove</span>
          </button>
        )}
      </div>
    )
  }
)
Badge.displayName = "Badge"

// Utility function to get badge variant from task status
export function getStatusBadgeVariant(status: TaskStatus): VariantProps<typeof badgeVariants>['variant'] {
  const statusMap: Record<TaskStatus, VariantProps<typeof badgeVariants>['variant']> = {
    todo: 'todo',
    in_progress: 'in-progress',
    done: 'done',
    archived: 'archived',
  }
  return statusMap[status]
}

// Utility function to get badge variant from priority
export function getPriorityBadgeVariant(priority: Priority): VariantProps<typeof badgeVariants>['variant'] {
  const priorityMap: Record<Priority, VariantProps<typeof badgeVariants>['variant']> = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
    critical: 'critical',
  }
  return priorityMap[priority]
}

// Status Badge component
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: TaskStatus
  outline?: boolean
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, outline = false, ...props }) => {
  const variant = outline 
    ? `${getStatusBadgeVariant(status)}-outline` as VariantProps<typeof badgeVariants>['variant']
    : getStatusBadgeVariant(status)
  
  return (
    <Badge variant={variant} {...props}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

// Priority Badge component
export interface PriorityBadgeProps extends Omit<BadgeProps, 'variant'> {
  priority: Priority
  outline?: boolean
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, outline = false, ...props }) => {
  const variant = outline
    ? `${getPriorityBadgeVariant(priority)}-outline` as VariantProps<typeof badgeVariants>['variant']
    : getPriorityBadgeVariant(priority)
  
  return (
    <Badge variant={variant} {...props}>
      {priority}
    </Badge>
  )
}

export { Badge, StatusBadge, PriorityBadge, badgeVariants }