/**
 * タスク詳細モーダル - レイジーローディング対応
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 */

import React, { Suspense, lazy, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TaskDetail } from '../../types/task';
import { Tag } from '../../types/tag';
import { Spinner } from '../ui/loading';

// レイジーローディング対応コンポーネント
const LazyTaskDetailView = lazy(() => 
  import('./TaskDetailView').then(module => ({ 
    default: module.default 
  }))
);

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
  onProjectClick
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
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* オーバーレイ */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200" />
        
        {/* モーダルコンテンツ */}
        <Dialog.Content 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-6xl h-[90vh] z-50 animate-in fade-in zoom-in-95 duration-200"
          aria-labelledby="task-detail-title"
          aria-describedby="task-detail-description"
          onInteractOutside={(e) => {
            // クリックアウトサイドでは閉じない（アクセシビリティ向上）
            e.preventDefault();
          }}
          onEscapeKeyDown={() => {
            // Escapeキーでのみ閉じる
            onClose();
          }}
        >
          {/* アクセシビリティ用の隠しタイトル */}
          <Dialog.Title id="task-detail-title" className="sr-only">
            タスク詳細: {task.title}
          </Dialog.Title>
          <Dialog.Description id="task-detail-description" className="sr-only">
            タスクの詳細情報を表示しています。Escキーで閉じられます。
          </Dialog.Description>

          {/* Suspenseでレイジーローディングをラップ */}
          <Suspense 
            fallback={
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-full flex items-center justify-center">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="mt-4 text-sm text-gray-500">タスク詳細を読み込んでいます...</p>
                </div>
              </div>
            }
          >
            <LazyTaskDetailView
              task={task}
              editable={editable}
              onTaskUpdate={onTaskUpdate}
              onTaskDelete={onTaskDelete}
              onClose={onClose}
              availableTags={availableTags}
              onProjectClick={onProjectClick}
              enableA11y={true}
            />
          </Suspense>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default TaskDetailModal;