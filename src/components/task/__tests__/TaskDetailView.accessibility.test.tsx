/**
 * TaskDetailView アクセシビリティテスト
 * グループ3: アクセシビリティ対応（WCAG 2.1 AA）
 * @axe-core/reactを使用したWCAG 2.1 AA準拠テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TaskDetailView from '../TaskDetailView';
import { TaskDetail, Priority, TaskStatus } from '../../../types/task';
import { Tag } from '../../../types/tag';

// jest-axeのカスタムマッチャーを追加
expect.extend(toHaveNoViolations);

// テスト用のモックデータ
const mockTask: TaskDetail = {
  id: 'task-1',
  title: 'テストタスク',
  description: 'これは詳細なタスク説明です。\n複数行の説明も含まれています。',
  status: 'in_progress' as TaskStatus,
  priority: 'high' as Priority,
  tags: [
    { id: 'tag-1', name: 'フロントエンド', color: '#3b82f6' },
    { id: 'tag-2', name: '緊急', color: '#ef4444' }
  ],
  projectId: 'project-1',
  dueDate: new Date('2025-09-15T10:00:00Z'),
  estimatedHours: 8,
  actualHours: 5,
  attachments: [
    {
      id: 'attachment-1',
      fileName: 'design.pdf',
      fileSize: 1024000,
      uploadedAt: new Date('2025-08-25T14:30:00Z')
    }
  ],
  createdAt: new Date('2025-08-01T09:00:00Z'),
  updatedAt: new Date('2025-08-29T16:45:00Z'),
  subtasks: [],
  comments: [],
  activities: []
};

const mockAvailableTags: Tag[] = [
  { id: 'tag-1', name: 'フロントエンド', color: '#3b82f6' },
  { id: 'tag-2', name: '緊急', color: '#ef4444' },
  { id: 'tag-3', name: 'バックエンド', color: '#10b981' },
];

// テストユーティリティ
const renderTaskDetailView = (props: Partial<React.ComponentProps<typeof TaskDetailView>> = {}) => {
  const defaultProps = {
    task: mockTask,
    editable: true,
    availableTags: mockAvailableTags,
    enableA11y: true,
    onTaskUpdate: jest.fn(),
    onTaskDelete: jest.fn(),
    onClose: jest.fn(),
    onProjectClick: jest.fn(),
    onTaskNavigate: jest.fn(),
  };

  return render(<TaskDetailView {...defaultProps} {...props} />);
};

describe('TaskDetailView - WCAG 2.1 AA準拠テスト', () => {
  beforeEach(() => {
    // セットアップ処理
    jest.clearAllMocks();
  });

  describe('基本的なアクセシビリティ準拠', () => {
    test('WCAG 2.1 AA準拠（基本状態）', async () => {
      const { container } = renderTaskDetailView();
      
      // axe-coreによるアクセシビリティチェック
      const results = await axe(container, {
        rules: {
          // WCAG 2.1 AA 準拠ルールを有効化
          'wcag2a': { enabled: true },
          'wcag2aa': { enabled: true },
          'wcag21aa': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });

    test('WCAG 2.1 AA準拠（編集モード）', async () => {
      const { container } = renderTaskDetailView();
      
      // 編集モードに切り替え
      const editButton = screen.getByRole('button', { name: /タスクを編集/i });
      fireEvent.click(editButton);
      
      // 編集モードのアクセシビリティチェック
      const results = await axe(container, {
        rules: {
          'wcag2a': { enabled: true },
          'wcag2aa': { enabled: true },
          'wcag21aa': { enabled: true },
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('セマンティックHTML構造', () => {
    test('適切なランドマーク役割が存在する', () => {
      renderTaskDetailView();
      
      // メインダイアログ
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // グループ要素
      expect(screen.getByRole('group', { name: /タスクの状態情報/i })).toBeInTheDocument();
    });

    test('見出し階層が適切に構成されている', () => {
      renderTaskDetailView();
      
      // H1見出しが存在
      const mainHeading = screen.getByRole('heading', { level: 1 });
      expect(mainHeading).toBeInTheDocument();
      expect(mainHeading).toHaveTextContent(mockTask.title);
    });

    test('ARIA属性が適切に設定されている', () => {
      renderTaskDetailView();
      
      const dialog = screen.getByRole('dialog');
      
      // ダイアログのARIA属性
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
      
      // ラベル参照の確認
      const labelId = dialog.getAttribute('aria-labelledby');
      const descId = dialog.getAttribute('aria-describedby');
      
      expect(document.getElementById(labelId!)).toBeInTheDocument();
      expect(document.getElementById(descId!)).toBeInTheDocument();
    });
  });

  describe('キーボードナビゲーション', () => {
    test('Tab順序が論理的である', async () => {
      const user = userEvent.setup();
      renderTaskDetailView();
      
      // 最初のフォーカス可能要素を特定
      const editButton = screen.getByRole('button', { name: /タスクを編集/i });
      const deleteButton = screen.getByRole('button', { name: /タスクを削除/i });
      const closeButton = screen.getByRole('button', { name: /タスク詳細を閉じる/i });
      
      // Tab移動のテスト
      editButton.focus();
      expect(editButton).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(deleteButton).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(closeButton).toHaveFocus();
    });

    test('Escapeキーでモーダルが閉じられる', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderTaskDetailView({ onClose });
      
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('Ctrl+Eで編集モードが切り替わる', async () => {
      const user = userEvent.setup();
      renderTaskDetailView();
      
      // 編集モード切り替え
      await user.keyboard('{Control>}e{/Control}');
      
      // 編集フィールドが表示される
      expect(screen.getByDisplayValue(mockTask.title)).toBeInTheDocument();
    });

    test('Ctrl+Sで保存される（編集モード時）', async () => {
      const user = userEvent.setup();
      const onTaskUpdate = jest.fn();
      renderTaskDetailView({ onTaskUpdate });
      
      // 編集モードに切り替え
      await user.keyboard('{Control>}e{/Control}');
      
      // タイトル変更
      const titleInput = screen.getByDisplayValue(mockTask.title);
      await user.clear(titleInput);
      await user.type(titleInput, '更新されたタスクタイトル');
      
      // 保存
      await user.keyboard('{Control>}s{/Control}');
      
      expect(onTaskUpdate).toHaveBeenCalledWith(mockTask.id, expect.objectContaining({
        title: '更新されたタスクタイトル'
      }));
    });

    test('矢印キーでタスクナビゲーションが動作する', async () => {
      const user = userEvent.setup();
      const onTaskNavigate = jest.fn();
      renderTaskDetailView({ onTaskNavigate });
      
      // 左矢印キー（前のタスク）
      await user.keyboard('{ArrowLeft}');
      expect(onTaskNavigate).toHaveBeenCalledWith('prev');
      
      // 右矢印キー（次のタスク）
      await user.keyboard('{ArrowRight}');
      expect(onTaskNavigate).toHaveBeenCalledWith('next');
    });
  });

  describe('フォーカス管理', () => {
    test('モーダル内でフォーカスがトラップされる', async () => {
      const user = userEvent.setup();
      renderTaskDetailView();
      
      // 最後のフォーカス可能要素を取得
      const closeButton = screen.getByRole('button', { name: /タスク詳細を閉じる/i });
      closeButton.focus();
      
      // 通常のTab（最後の要素から最初の要素へ）
      await user.keyboard('{Tab}');
      
      // 最初のフォーカス可能要素（編集ボタン）にフォーカスが移る
      const editButton = screen.getByRole('button', { name: /タスクを編集/i });
      expect(editButton).toHaveFocus();
      
      // Shift+Tab（最初の要素から最後の要素へ）
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(closeButton).toHaveFocus();
    });

    test('編集モード終了時に適切にフォーカスが復元される', async () => {
      const user = userEvent.setup();
      renderTaskDetailView();
      
      const editButton = screen.getByRole('button', { name: /タスクを編集/i });
      editButton.focus();
      
      // 編集モード開始
      await user.click(editButton);
      
      // キャンセル
      const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
      await user.click(cancelButton);
      
      // 編集ボタンにフォーカスが復元される
      expect(editButton).toHaveFocus();
    });
  });

  describe('スクリーンリーダー対応', () => {
    test('ライブリージョンが適切に実装されている', () => {
      renderTaskDetailView();
      
      // ライブリージョンの存在確認
      const liveRegion = screen.getByTestId('task-detail-announcement');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('role', 'status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
      expect(liveRegion).toHaveClass('sr-only');
    });

    test('状態変更時にアナウンスされる', async () => {
      const user = userEvent.setup();
      renderTaskDetailView();
      
      // 編集モードに切り替え
      const editButton = screen.getByRole('button', { name: /タスクを編集/i });
      await user.click(editButton);
      
      // アナウンスが表示される
      await waitFor(() => {
        const liveRegion = screen.getByTestId('task-detail-announcement');
        expect(liveRegion).toHaveTextContent(/編集モードに切り替わりました/i);
      });
    });

    test('隠しヘルプテキストが提供されている', () => {
      renderTaskDetailView();
      
      // スクリーンリーダー用の説明文
      const helpText = screen.getByText(/タスクの詳細情報を表示しています/i);
      expect(helpText).toBeInTheDocument();
      expect(helpText).toHaveClass('sr-only');
    });
  });

  describe('色覚異常者対応', () => {
    test('色だけに依存しない情報伝達', () => {
      renderTaskDetailView();
      
      // ステータスバッジ（色以外にもテキストラベルがある）
      const statusBadge = screen.getByLabelText(/ステータス: 進行中/i);
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveTextContent('進行中');
      
      // 優先度バッジ
      const priorityBadge = screen.getByLabelText(/優先度: 高/i);
      expect(priorityBadge).toBeInTheDocument();
      expect(priorityBadge).toHaveTextContent('優先度: 高');
    });

    test('十分なコントラスト比が確保されている', async () => {
      const { container } = renderTaskDetailView();
      
      // axe-coreのcolor-contrastルールでチェック
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
      
      expect(results).toHaveNoViolations();
    });
  });

  describe('エラーハンドリング', () => {
    test('フォームバリデーションエラーが適切にアナウンスされる', async () => {
      const user = userEvent.setup();
      renderTaskDetailView();
      
      // 編集モードに切り替え
      await user.keyboard('{Control>}e{/Control}');
      
      // タイトルを空にして保存
      const titleInput = screen.getByDisplayValue(mockTask.title);
      await user.clear(titleInput);
      await user.keyboard('{Control>}s{/Control}');
      
      // エラーアナウンス確認
      await waitFor(() => {
        const liveRegion = screen.getByTestId('task-detail-announcement');
        expect(liveRegion).toHaveTextContent(/エラー: タスクタイトルは必須です/i);
      });
    });
  });

  describe('レスポンシブ対応のアクセシビリティ', () => {
    test('モバイル表示でもアクセシビリティが保たれる', async () => {
      // モバイルビューポートサイズを設定
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = renderTaskDetailView();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

// パフォーマンステスト（アクセシビリティ関連）
describe('TaskDetailView - アクセシビリティパフォーマンス', () => {
  test('アナウンス機能が過度に頻繁に実行されない', async () => {
    const user = userEvent.setup();
    renderTaskDetailView();
    
    const editButton = screen.getByRole('button', { name: /タスクを編集/i });
    
    // 短時間で複数回クリック
    await user.click(editButton);
    await user.click(editButton);
    await user.click(editButton);
    
    // アナウンスが重複しないことを確認
    const liveRegion = screen.getByTestId('task-detail-announcement');
    
    // 最後のアナウンスのみが残っている
    await waitFor(() => {
      expect(liveRegion.textContent).toMatch(/表示モードに切り替わりました/i);
    });
  });

  test('フォーカス管理が効率的に動作する', () => {
    const { rerender } = renderTaskDetailView();
    
    // 初期フォーカス設定時間を測定
    const startTime = performance.now();
    
    rerender(<TaskDetailView {...renderTaskDetailView().container.props} />);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // フォーカス設定が100ms以内に完了することを確認
    expect(duration).toBeLessThan(100);
  });
});