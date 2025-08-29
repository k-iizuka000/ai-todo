/**
 * UI Components Library
 * すべてのUIコンポーネントの統一エクスポート
 */

// Button components
export {
  Button,
  buttonVariants,
  type ButtonProps,
} from './button'

// Card components
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
} from './card'

// Input components
export {
  Input,
  Label,
  Textarea,
  FormField,
  inputVariants,
  type InputProps,
  type LabelProps,
  type TextareaProps,
  type FormFieldProps,
} from './input'

// Modal/Dialog components
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
  type DialogContentProps,
  type ModalProps,
} from './modal'

// Badge components
export {
  Badge,
  StatusBadge,
  PriorityBadge,
  badgeVariants,
  getStatusBadgeVariant,
  getPriorityBadgeVariant,
  type BadgeProps,
  type StatusBadgeProps,
  type PriorityBadgeProps,
} from './badge'

// Dropdown components
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  SimpleDropdown,
  type DropdownOption,
  type SimpleDropdownProps,
} from './dropdown'

// Loading components
export {
  Spinner,
  LoadingDots,
  Skeleton,
  LoadingState,
  ProgressBar,
  TaskSkeleton,
  spinnerVariants,
  skeletonVariants,
  type SpinnerProps,
  type LoadingDotsProps,
  type SkeletonProps,
  type LoadingStateProps,
  type ProgressBarProps,
} from './loading'

// Accordion components
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './Accordion'

// Archived Tasks Section
export {
  ArchivedTasksSection,
} from './ArchivedTasksSection'

// Performance Optimization Components
export {
  LazyImage,
  type LazyImageProps,
} from './LazyImage'

export {
  PerformanceOptimizer,
  type PerformanceOptimizerProps,
} from './PerformanceOptimizer'