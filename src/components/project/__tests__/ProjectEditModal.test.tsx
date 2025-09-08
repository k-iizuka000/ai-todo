/**
 * ProjectEditModal 単体テスト
 * 設計書要件に従った完全テスト実装
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProjectEditModal } from '../ProjectEditModal';
import { UpdateProjectInput, ProjectPriority, ProjectStatus, ProjectWithFullDetails } from '@/types/project';

// モック
vi.mock('@/lib/logger');

// テスト用データ
const mockProject: ProjectWithFullDetails = {
  id: 'test-project-1',
  name: 'テストプロジェクト',
  description: 'テスト用のプロジェクトです',
  status: 'ACTIVE' as ProjectStatus,
  priority: 'HIGH' as ProjectPriority,
  color: '#3B82F6',
  icon: '📊',
  ownerId: 'user-1',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  deadline: new Date('2024-11-30'),
  budget: 100000,
  isArchived: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  owner: {
    id: 'user-1',
    email: 'test@example.com',
    profile: {
      displayName: 'テストユーザー',
      firstName: 'テスト',
      lastName: 'ユーザー',
      avatar: null
    }
  },
  members: [],
  tags: [],
  tasks: { total: 0, completed: 0 },
  progress: 0,
  memberCount: 0,
  tagCount: 0
};

describe('ProjectEditModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onUpdateProject: vi.fn().mockResolvedValue(undefined),
    project: mockProject,
  };

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // ネットワーク状態をオンラインに設定
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期表示', () => {
    it('モーダルが正しく表示される', () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      expect(screen.getByText('プロジェクトを編集')).toBeInTheDocument();
      expect(screen.getByText('「テストプロジェクト」の詳細を編集します')).toBeInTheDocument();
      expect(screen.getByLabelText(/プロジェクト名/)).toBeInTheDocument();
      expect(screen.getByLabelText('説明')).toBeInTheDocument();
      expect(screen.getByText('更新')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    it('プロジェクトデータがフォームに正しく設定される', () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/) as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('説明') as HTMLTextAreaElement;
      const budgetInput = screen.getByLabelText('予算') as HTMLInputElement;
      
      expect(nameInput.value).toBe('テストプロジェクト');
      expect(descriptionTextarea.value).toBe('テスト用のプロジェクトです');
      expect(budgetInput.value).toBe('100000');
      
      // ステータスと優先度が正しく選択されているかチェック
      const activeStatusButton = screen.getByText('アクティブ');
      const highPriorityButton = screen.getByText('高');
      
      expect(activeStatusButton).toHaveClass('bg-primary');
      expect(highPriorityButton).toHaveClass('bg-primary');
    });

    it('モーダルが閉じている場合は表示されない', () => {
      render(<ProjectEditModal {...defaultProps} open={false} />);
      
      expect(screen.queryByText('プロジェクトを編集')).not.toBeInTheDocument();
    });

    it('日付フィールドが正しい形式で表示される', () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const startDateInput = screen.getByLabelText('開始日') as HTMLInputElement;
      const endDateInput = screen.getByLabelText('終了予定日') as HTMLInputElement;
      const deadlineInput = screen.getByLabelText('締切日') as HTMLInputElement;
      
      expect(startDateInput.value).toBe('2024-01-01');
      expect(endDateInput.value).toBe('2024-12-31');
      expect(deadlineInput.value).toBe('2024-11-30');
    });
  });

  describe('フォーム入力', () => {
    it('プロジェクト名を変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.clear(nameInput);
      await user.type(nameInput, '更新されたプロジェクト');
      
      expect(nameInput).toHaveValue('更新されたプロジェクト');
    });

    it('説明を変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const descriptionTextarea = screen.getByLabelText('説明');
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, '更新された説明');
      
      expect(descriptionTextarea).toHaveValue('更新された説明');
    });

    it('ステータスを変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const completedStatusButton = screen.getByText('完了');
      await user.click(completedStatusButton);
      
      expect(completedStatusButton).toHaveClass('bg-primary');
      
      // 以前に選択されていたステータスが非選択になることを確認
      const activeStatusButton = screen.getByText('アクティブ');
      expect(activeStatusButton).not.toHaveClass('bg-primary');
    });

    it('優先度を変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const criticalPriorityButton = screen.getByText('緊急');
      await user.click(criticalPriorityButton);
      
      expect(criticalPriorityButton).toHaveClass('bg-primary');
      
      // 以前に選択されていた優先度が非選択になることを確認
      const highPriorityButton = screen.getByText('高');
      expect(highPriorityButton).not.toHaveClass('bg-primary');
    });

    it('カラーを変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const colorButtons = screen.getAllByRole('button').filter(
        button => button.style.backgroundColor
      );
      
      // 異なるカラーを選択
      const newColorButton = colorButtons.find(button => 
        button.style.backgroundColor !== 'rgb(59, 130, 246)' // #3B82F6
      );
      
      if (newColorButton) {
        await user.click(newColorButton);
        expect(newColorButton).toHaveClass('scale-110');
      }
    });

    it('アイコンを変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const iconButtons = screen.getAllByText('🛒');
      if (iconButtons.length > 0) {
        await user.click(iconButtons[0]);
        expect(iconButtons[0].parentElement).toHaveClass('border-primary');
      }
    });

    it('開始日を変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const startDateInput = screen.getByLabelText('開始日');
      await user.clear(startDateInput);
      await user.type(startDateInput, '2024-02-01');
      
      expect(startDateInput).toHaveValue('2024-02-01');
    });

    it('終了予定日を変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const endDateInput = screen.getByLabelText('終了予定日');
      await user.clear(endDateInput);
      await user.type(endDateInput, '2024-11-30');
      
      expect(endDateInput).toHaveValue('2024-11-30');
    });

    it('締切日を変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const deadlineInput = screen.getByLabelText('締切日');
      await user.clear(deadlineInput);
      await user.type(deadlineInput, '2024-10-31');
      
      expect(deadlineInput).toHaveValue('2024-10-31');
    });

    it('予算を変更できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const budgetInput = screen.getByLabelText('予算');
      await user.clear(budgetInput);
      await user.type(budgetInput, '200000');
      
      expect(budgetInput).toHaveValue(200000);
    });
  });

  describe('バリデーション', () => {
    it('プロジェクト名が必須であることを検証する', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.clear(nameInput);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名は必須です')).toBeInTheDocument();
      });
      
      expect(defaultProps.onUpdateProject).not.toHaveBeenCalled();
    });

    it('プロジェクト名の文字数制限を検証する', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const longName = 'あ'.repeat(101); // 101文字
      
      await user.clear(nameInput);
      await user.type(nameInput, longName);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名は100文字以内で入力してください')).toBeInTheDocument();
      });
    });

    it('説明の文字数制限を検証する', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const descriptionTextarea = screen.getByLabelText('説明');
      const longDescription = 'あ'.repeat(501); // 501文字
      
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, longDescription);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('説明は500文字以内で入力してください')).toBeInTheDocument();
      });
    });

    it('予算が負の値の場合にエラーを表示する', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const budgetInput = screen.getByLabelText('予算');
      await user.clear(budgetInput);
      await user.type(budgetInput, '-100');
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('予算は0以上で入力してください')).toBeInTheDocument();
      });
    });

    it('入力エラーがある項目の入力時にエラーがクリアされる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.clear(nameInput);
      
      // まずエラーを表示させる
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名は必須です')).toBeInTheDocument();
      });
      
      // プロジェクト名を入力してエラーがクリアされることを確認
      await user.type(nameInput, 'テスト');
      
      expect(screen.queryByText('プロジェクト名は必須です')).not.toBeInTheDocument();
    });
  });

  describe('プロジェクト更新処理', () => {
    it('有効な入力でプロジェクトが更新される', async () => {
      const onUpdateProject = vi.fn().mockResolvedValue(undefined);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      // フォームを変更
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.clear(nameInput);
      await user.type(nameInput, '更新されたプロジェクト');
      
      const descriptionTextarea = screen.getByLabelText('説明');
      await user.clear(descriptionTextarea);
      await user.type(descriptionTextarea, '更新された説明');
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onUpdateProject).toHaveBeenCalledWith('test-project-1', {
          name: '更新されたプロジェクト',
          description: '更新された説明',
          status: 'ACTIVE',
          priority: 'HIGH',
          color: '#3B82F6',
          icon: '📊',
          startDate: mockProject.startDate,
          endDate: mockProject.endDate,
          deadline: mockProject.deadline,
          budget: 100000,
          tagIds: []
        });
      });
    });

    it('プロジェクト更新中はローディング状態になる', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onUpdateProject = vi.fn().mockReturnValue(promise);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      // ローディング状態の確認
      expect(screen.getByText('更新中...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('キャンセル')).toBeDisabled();
      
      // プロミスを解決してローディング状態を終了
      act(() => {
        resolvePromise!();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('更新中...')).not.toBeInTheDocument();
      });
    });

    it('更新成功後にモーダルが閉じられる', async () => {
      const onOpenChange = vi.fn();
      const onUpdateProject = vi.fn().mockResolvedValue(undefined);
      
      render(
        <ProjectEditModal 
          {...defaultProps} 
          onOpenChange={onOpenChange}
          onUpdateProject={onUpdateProject}
        />
      );
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onUpdateProject).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('プロジェクトデータが変更されたときにフォームが再初期化される', () => {
      const newProject = {
        ...mockProject,
        id: 'test-project-2',
        name: '新しいプロジェクト',
        description: '新しい説明',
      };

      const { rerender } = render(<ProjectEditModal {...defaultProps} />);
      
      // 初期状態を確認
      expect(screen.getByDisplayValue('テストプロジェクト')).toBeInTheDocument();
      
      // プロジェクトを変更して再レンダリング
      rerender(<ProjectEditModal {...defaultProps} project={newProject} />);
      
      // 新しいプロジェクトデータが設定されていることを確認
      expect(screen.getByDisplayValue('新しいプロジェクト')).toBeInTheDocument();
      expect(screen.getByDisplayValue('新しい説明')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('一般的なエラーメッセージを表示する', async () => {
      const onUpdateProject = vi.fn().mockRejectedValue(new Error('更新エラー'));
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('更新エラー')).toBeInTheDocument();
      });
    });

    it('ネットワークエラーを正しく処理する', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      const onUpdateProject = vi.fn().mockRejectedValue(networkError);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('ネットワーク接続に問題があります。接続を確認して再試行してください。')).toBeInTheDocument();
      });
    });

    it('サーバーバリデーションエラーを処理する', async () => {
      const validationError = {
        status: 400,
        data: {
          errors: {
            name: ['プロジェクト名が重複しています']
          }
        }
      };
      const onUpdateProject = vi.fn().mockRejectedValue(validationError);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名が重複しています')).toBeInTheDocument();
      });
    });

    it('認証エラー(401)を処理する', async () => {
      const authError = { status: 401 };
      const onUpdateProject = vi.fn().mockRejectedValue(authError);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('認証が必要です。ログインしてください。')).toBeInTheDocument();
      });
    });

    it('サーバーエラー(500)を処理する', async () => {
      const serverError = { status: 500 };
      const onUpdateProject = vi.fn().mockRejectedValue(serverError);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('サーバーエラーが発生しました。しばらく後に再試行してください。')).toBeInTheDocument();
      });
    });

    it('ネットワークエラーの再試行機能が動作する', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      const onUpdateProject = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(undefined);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('ネットワーク接続に問題があります。接続を確認して再試行してください。')).toBeInTheDocument();
      });
      
      // 再試行ボタンをクリック
      const retryButton = screen.getByText('再試行');
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(onUpdateProject).toHaveBeenCalledTimes(2);
      });
    });

    it('エラーメッセージを閉じることができる', async () => {
      const onUpdateProject = vi.fn().mockRejectedValue(new Error('テストエラー'));
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('テストエラー')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByText('閉じる');
      await user.click(closeButton);
      
      expect(screen.queryByText('テストエラー')).not.toBeInTheDocument();
    });
  });

  describe('モーダル操作', () => {
    it('キャンセルボタンでモーダルが閉じられる', async () => {
      const onOpenChange = vi.fn();
      
      render(<ProjectEditModal {...defaultProps} onOpenChange={onOpenChange} />);
      
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('送信中はモーダルを閉じることができない', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onUpdateProject = vi.fn().mockReturnValue(promise);
      const onOpenChange = vi.fn();
      
      render(
        <ProjectEditModal 
          {...defaultProps} 
          onUpdateProject={onUpdateProject}
          onOpenChange={onOpenChange}
        />
      );
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      // キャンセルボタンがdisabledになっていることを確認
      const cancelButton = screen.getByText('キャンセル');
      expect(cancelButton).toBeDisabled();
      
      // プロミスを解決
      act(() => {
        resolvePromise!();
      });
      
      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('入力項目の無効化', () => {
    it('送信中は全ての入力項目が無効になる', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onUpdateProject = vi.fn().mockReturnValue(promise);
      
      render(<ProjectEditModal {...defaultProps} onUpdateProject={onUpdateProject} />);
      
      const submitButton = screen.getByText('更新');
      await user.click(submitButton);
      
      // 入力項目が無効化されていることを確認
      expect(screen.getByLabelText(/プロジェクト名/)).toBeDisabled();
      expect(screen.getByLabelText('説明')).toBeDisabled();
      
      // プロミスを解決
      act(() => {
        resolvePromise!();
      });
      
      await waitFor(() => {
        expect(screen.getByLabelText(/プロジェクト名/)).not.toBeDisabled();
      });
    });
  });

  describe('日付処理', () => {
    it('null日付が正しく処理される', () => {
      const projectWithNullDates = {
        ...mockProject,
        startDate: null,
        endDate: null,
        deadline: null
      };

      render(<ProjectEditModal {...defaultProps} project={projectWithNullDates} />);
      
      const startDateInput = screen.getByLabelText('開始日') as HTMLInputElement;
      const endDateInput = screen.getByLabelText('終了予定日') as HTMLInputElement;
      const deadlineInput = screen.getByLabelText('締切日') as HTMLInputElement;
      
      expect(startDateInput.value).toBe('');
      expect(endDateInput.value).toBe('');
      expect(deadlineInput.value).toBe('');
    });

    it('日付を削除できる', async () => {
      render(<ProjectEditModal {...defaultProps} />);
      
      const startDateInput = screen.getByLabelText('開始日');
      await user.clear(startDateInput);
      
      expect(startDateInput).toHaveValue('');
    });
  });
});