/**
 * Hooksのエクスポート
 */

// 既存のhooks
export { useTasks } from './useTasks';
export { useProjects } from './useProjects';
export { useLocalStorage } from './useLocalStorage';
export { useDebounce } from './useDebounce';
export { useErrorHandler } from './useErrorHandler';
export { useOptimisticTasks } from './useOptimisticTasks';
export { useProjectPermissions } from './useProjectPermissions';
export { useNotificationActions } from './useNotificationActions';
export { useNotificationFilter } from './useNotificationFilter';
export { useNotificationRealtime } from './useNotificationRealtime';

// 新しいレスポンシブ・UX hooks
export { 
  useResponsiveLayout, 
  useResponsiveRender, 
  useResponsiveValue,
  breakpoints 
} from './useResponsiveLayout';
export { useSwipeGesture, usePullToRefresh } from './useSwipeGesture';
export { 
  useValueAnimation, 
  useSpringAnimation, 
  useResponsiveAnimation, 
  usePageTransition, 
  useAnimationOptimization 
} from './useAnimations';

// アクセシビリティ関連hooks
export { useFocusManagement } from './useFocusManagement';
export type { FocusManagementOptions } from './useFocusManagement';

// 設計書対応: グループ1状態管理アーキテクチャ修正
export { useKanbanTasks } from './useKanbanTasks';
export { useTaskActions } from './useTaskActions';