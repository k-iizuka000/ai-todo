/**
 * タスク詳細モーダル - 基本版
 * 設計書 グループ1: 基本モーダル実装
 * 
 * 目的: Radix UI Dialogを使用したシンプルで確実に動作するモーダル
 * 特徴: アクセシビリティ内蔵、フォーカス管理、WCAG 2.1 AA準拠
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { TaskDetail } from '../../types/task';
import { Tag } from '../../types/tag';
import TaskDetailViewSimple from './TaskDetailView.simple';

export interface TaskDetailModalBasicProps {
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
 * 基本的なタスク詳細モーダル
 * 
 * 設計方針:
 * - Radix UI Dialogでアクセシビリティを自動処理
 * - フォーカストラップとキーボードナビゲーション内蔵
 * - 高度な機能（レイジーローディング等）は除外
 * - パフォーマンス要件: 初期表示500ms以内
 */
export const TaskDetailModalBasic: React.FC<TaskDetailModalBasicProps> = ({
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
  const [isAnimating, setIsAnimating] = useState(false);
  
  // フォーカス管理: WCAG 2.1 AA準拠
  useEffect(() => {
    if (isOpen) {
      // モーダル開時: 現在のフォーカス要素を保存
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (!isOpen && previousFocusRef.current) {
      // モーダル閉時: 前のフォーカス要素に復元（アニメーション完了後）
      const timeoutId = setTimeout(() => {
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      }, 200); // アニメーション時間と同期

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // モーダル閉じるハンドラー（アニメーション対応）
  const handleClose = useCallback(() => {
    setIsAnimating(true);
    
    // アニメーション時間後に実際のクローズ処理
    setTimeout(() => {
      onClose();
      setIsAnimating(false);
    }, 150);
  }, [onClose]);

  // キーボードショートカット対応
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        handleClose();
        break;
      default:
        break;
    }
  }, [isOpen, handleClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!task) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        {/* オーバーレイ - アクセシビリティ対応 */}
        <Dialog.Overlay 
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-200 ${
            isAnimating ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden="true"
        />
        
        {/* モーダルコンテンツ */}
        <Dialog.Content 
          className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                      w-[95vw] max-w-4xl h-[85vh] z-50 
                      transition-all duration-200 ease-out ${
                        isAnimating 
                          ? 'opacity-0 scale-95' 
                          : 'opacity-100 scale-100'
                      }`}
          aria-labelledby="task-detail-title-basic"
          aria-describedby="task-detail-description-basic"
          onInteractOutside={(e) => {
            // アクセシビリティ向上: クリックアウトサイドでは閉じない
            // 意図しない操作を防止し、Escapeキーでの明示的なクローズを推奨
            e.preventDefault();
          }}
          onEscapeKeyDown={handleClose}
        >
          {/* アクセシビリティ用の隠しタイトルと説明（常に提供） */}
          <Dialog.Title id="task-detail-title-basic" className="sr-only">
            タスク詳細: {task.title}
          </Dialog.Title>
          <Dialog.Description id="task-detail-description-basic" className="sr-only">
            タスクの詳細情報を表示しています。Escapeキーで閉じられます。
          </Dialog.Description>

          {/* シンプルなタスク詳細ビュー */}
          <TaskDetailViewSimple
            task={task}
            editable={editable}
            onTaskUpdate={onTaskUpdate}
            onTaskDelete={(taskId) => {
              // 削除後はモーダルを閉じる
              onTaskDelete?.(taskId);
              handleClose();
            }}
            onClose={handleClose}
            availableTags={availableTags}
            onProjectClick={onProjectClick}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/**
 * カスタムフック: タスク詳細モーダルの状態管理
 * 
 * モーダル表示に特化した効率的な状態管理を提供
 * 設計書 グループ3: 状態管理最適化 の実装基盤
 */
export const useTaskDetailModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<TaskDetail | null>(null);

  const openModal = useCallback((task: TaskDetail) => {
    setCurrentTask(task);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // DOM更新完了後にタスク情報をクリア
    setTimeout(() => {
      setCurrentTask(null);
    }, 200);
  }, []);

  return {
    isOpen,
    currentTask,
    openModal,
    closeModal
  };
};

export default TaskDetailModalBasic;
