/**
 * タスク詳細モーダル - レイジーローディング対応
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 */

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { TaskDetail } from '../../types/task';
import { Tag } from '../../types/tag';
import { Spinner } from '../ui/loading';

// エラーバウンダリコンポーネント
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('タスク詳細の読み込みに失敗しました:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center p-8"
          style={{ width: 'min(95vw, 72rem)', height: '90vh', maxHeight: '90vh' }}
          data-testid="task-detail-error"
        >
          <div className="text-center space-y-4">
            <div className="text-red-500 text-2xl">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              読み込みエラー
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              タスク詳細の読み込み中にエラーが発生しました。
            </p>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// レイジーローディング対応コンポーネント
const LazyTaskDetailView = lazy(() => import('./TaskDetailView'));

const LazyTaskDetailTabs = lazy(() => 
  import('./TaskDetailTabs').then(module => ({ 
    default: module.TaskDetailTabs 
  }))
);

export interface TaskDetailModalProps {
  /** モーダルの開閉状態 */
  isOpen: boolean;
  /** モーダルを閉じる関数 */
  onClose: () => void;
  /** 表示するタスク */
  task: TaskDetail | null;
  /** 編集可能かどうか */
  editable?: boolean;
  /** タスク更新時のコールバック */
  onTaskUpdate?: (taskId: string, updates: Partial<TaskDetail>) => void;
  /** タスク削除時のコールバック */
  onTaskDelete?: (taskId: string) => void;
  /** 利用可能なタグ */
  availableTags?: Tag[];
  /** プロジェクトクリック時のコールバック */
  onProjectClick?: (projectId: string) => void;
  /** サブタスク追加時のコールバック */
  onSubtaskAdd?: (title: string) => void;
  /** サブタスクステータス変更時のコールバック */
  onSubtaskToggle?: (subtaskId: string, completed: boolean) => void;
  /** サブタスク削除時のコールバック */
  onSubtaskDelete?: (subtaskId: string) => void;
}

/**
 * レイジーローディング対応のタスク詳細モーダル
 * Core Web Vitals最適化のためのコード分割を実装
 */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  task,
  editable = false,
  onTaskUpdate,
  onTaskDelete,
  availableTags = [],
  onProjectClick,
  onSubtaskAdd,
  onSubtaskToggle,
  onSubtaskDelete
}) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  // フォーカス管理: モーダル開閉時の処理
  useEffect(() => {
    if (isOpen) {
      // モーダル開時: 現在のフォーカス要素を保存
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      // モーダル閉時: 前のフォーカス要素に復元
      if (previousFocusRef.current) {
        // 小さな遅延でフォーカスを復元（DOM更新完了後）
        requestAnimationFrame(() => {
          previousFocusRef.current?.focus();
          previousFocusRef.current = null;
        });
      }
    }
  }, [isOpen]);
  
  if (!task) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()} data-testid="task-detail-modal-root">
      <Dialog.Portal>
        {/* オーバーレイ */}
        <Dialog.Overlay 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200" 
          onClick={() => {
            console.log('Overlay clicked directly');
            onClose();
          }}
          data-testid="task-detail-overlay"
        />
        
        {/* モーダルコンテンツ */}
        <Dialog.Content 
          className="fixed inset-0 flex items-center justify-center z-50 bg-transparent"
          onInteractOutside={(event) => {
            // クリックアウトサイドでモーダルを閉じる
            console.log('onInteractOutside triggered', event);
            onClose();
          }}
          onEscapeKeyDown={() => {
            // Escapeキーでのみ閉じる
            onClose();
          }}
          data-testid="task-detail-content"
          forceMount
        >
          {/* アクセシビリティ用の隠しタイトル/説明（Radix推奨のVisuallyHiddenで包む） */}
          <VisuallyHidden>
            <Dialog.Title>
              タスク詳細: {task.title}
            </Dialog.Title>
          </VisuallyHidden>
          <VisuallyHidden>
            <Dialog.Description>
              タスクの詳細情報を表示しています。Escキーで閉じられます。
            </Dialog.Description>
          </VisuallyHidden>

          {/* エラーバウンダリでラップされたSuspenseでレイジーローディング対応 */}
          <LazyLoadErrorBoundary>
            <Suspense 
              fallback={
                <div 
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center"
                  style={{ width: 'min(95vw, 72rem)', height: '90vh', maxHeight: '90vh' }}
                  data-testid="task-detail-loading"
                >
                  <div className="text-center">
                    <Spinner size="lg" />
                    <p className="mt-4 text-sm text-gray-500">タスク詳細を読み込んでいます...</p>
                  </div>
                </div>
              }
            >
              <div 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
                style={{ width: 'min(95vw, 72rem)', height: '90vh', maxHeight: '90vh' }}
              >
                <LazyTaskDetailView
                  task={task}
                  editable={editable}
                  onTaskUpdate={onTaskUpdate}
                  onTaskDelete={onTaskDelete}
                  onClose={onClose}
                  availableTags={availableTags}
                  onProjectClick={onProjectClick}
                  onSubtaskAdd={onSubtaskAdd}
                  onSubtaskToggle={onSubtaskToggle}
                  onSubtaskDelete={onSubtaskDelete}
                  enableA11y={true}
                  data-testid="task-detail-view"
                />
              </div>
            </Suspense>
          </LazyLoadErrorBoundary>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default TaskDetailModal;
