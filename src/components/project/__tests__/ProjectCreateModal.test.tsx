/**
 * ProjectCreateModal 単体テスト
 * 設計書要件に従った完全テスト実装
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProjectCreateModal } from '../ProjectCreateModal';
import { CreateProjectInput, ProjectPriority } from '@/types/project';

// モック
vi.mock('@/lib/logger');

// テスト用データ
const mockCreateProjectInput: CreateProjectInput = {
  name: 'テストプロジェクト',
  description: 'テスト用のプロジェクトです',
  priority: 'HIGH' as ProjectPriority,
  color: '#3B82F6',
  icon: '📋',
  tags: ['テスト', '開発'],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  budget: 100000
};

describe('ProjectCreateModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onCreateProject: vi.fn().mockResolvedValue(undefined),
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
      render(<ProjectCreateModal {...defaultProps} />);
      
      expect(screen.getByText('新規プロジェクト作成')).toBeInTheDocument();
      expect(screen.getByText('新しいプロジェクトの詳細を入力してください')).toBeInTheDocument();
      expect(screen.getByLabelText(/プロジェクト名/)).toBeInTheDocument();
      expect(screen.getByLabelText('説明')).toBeInTheDocument();
      expect(screen.getByText('作成')).toBeInTheDocument();
      expect(screen.getByText('キャンセル')).toBeInTheDocument();
    });

    it('デフォルト値が正しく設定される', () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/) as HTMLInputElement;
      const descriptionTextarea = screen.getByLabelText('説明') as HTMLTextAreaElement;
      
      expect(nameInput.value).toBe('');
      expect(descriptionTextarea.value).toBe('');
      
      // デフォルト優先度が「中」に設定されているかチェック
      const mediumPriorityButton = screen.getByText('中');
      expect(mediumPriorityButton).toHaveClass('bg-primary');
    });

    it('モーダルが閉じている場合は表示されない', () => {
      render(<ProjectCreateModal {...defaultProps} open={false} />);
      
      expect(screen.queryByText('新規プロジェクト作成')).not.toBeInTheDocument();
    });
  });

  describe('フォーム入力', () => {
    it('プロジェクト名を入力できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      expect(nameInput).toHaveValue('テストプロジェクト');
    });

    it('説明を入力できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const descriptionTextarea = screen.getByLabelText('説明');
      await user.type(descriptionTextarea, 'プロジェクトの説明');
      
      expect(descriptionTextarea).toHaveValue('プロジェクトの説明');
    });

    it('優先度を選択できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const highPriorityButton = screen.getByText('高');
      await user.click(highPriorityButton);
      
      expect(highPriorityButton).toHaveClass('bg-primary');
    });

    it('カラーを選択できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const colorButtons = screen.getAllByRole('button').filter(
        button => button.style.backgroundColor
      );
      
      await user.click(colorButtons[1]); // 2番目のカラーを選択
      
      expect(colorButtons[1]).toHaveClass('scale-110');
    });

    it('アイコンを選択できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const iconButtons = screen.getAllByText('🛒');
      if (iconButtons.length > 0) {
        await user.click(iconButtons[0]);
        expect(iconButtons[0].parentElement).toHaveClass('border-primary');
      }
    });

    it('開始日を設定できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const startDateInput = screen.getByLabelText('開始日');
      await user.type(startDateInput, '2024-01-01');
      
      expect(startDateInput).toHaveValue('2024-01-01');
    });

    it('終了予定日を設定できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const endDateInput = screen.getByLabelText('終了予定日');
      await user.type(endDateInput, '2024-12-31');
      
      expect(endDateInput).toHaveValue('2024-12-31');
    });

    it('予算を入力できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const budgetInput = screen.getByLabelText('予算');
      await user.type(budgetInput, '100000');
      
      expect(budgetInput).toHaveValue(100000);
    });
  });

  describe('タグ機能', () => {
    it('タグを追加できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('タグを入力');
      const addTagButton = screen.getByRole('button', { name: '' }); // Tagアイコンボタン
      
      await user.type(tagInput, 'テストタグ');
      await user.click(addTagButton);
      
      expect(screen.getByText('テストタグ ×')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('Enterキーでタグを追加できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('タグを入力');
      
      await user.type(tagInput, 'Enterタグ{enter}');
      
      expect(screen.getByText('Enterタグ ×')).toBeInTheDocument();
      expect(tagInput).toHaveValue('');
    });

    it('重複タグは追加されない', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('タグを入力');
      const addTagButton = screen.getByRole('button', { name: '' });
      
      // 同じタグを2回追加
      await user.type(tagInput, '重複タグ');
      await user.click(addTagButton);
      await user.type(tagInput, '重複タグ');
      await user.click(addTagButton);
      
      const duplicateTags = screen.getAllByText('重複タグ ×');
      expect(duplicateTags).toHaveLength(1);
    });

    it('タグをクリックして削除できる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('タグを入力');
      const addTagButton = screen.getByRole('button', { name: '' });
      
      await user.type(tagInput, '削除テストタグ');
      await user.click(addTagButton);
      
      const tagBadge = screen.getByText('削除テストタグ ×');
      await user.click(tagBadge);
      
      expect(screen.queryByText('削除テストタグ ×')).not.toBeInTheDocument();
    });

    it('空白のみのタグは追加されない', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const tagInput = screen.getByPlaceholderText('タグを入力');
      const addTagButton = screen.getByRole('button', { name: '' });
      
      await user.type(tagInput, '   ');
      await user.click(addTagButton);
      
      expect(screen.queryByText('×')).not.toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    it('プロジェクト名が必須であることを検証する', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名は必須です')).toBeInTheDocument();
      });
      
      expect(defaultProps.onCreateProject).not.toHaveBeenCalled();
    });

    it('プロジェクト名の文字数制限を検証する', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const longName = 'あ'.repeat(101); // 101文字
      
      await user.type(nameInput, longName);
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名は100文字以内で入力してください')).toBeInTheDocument();
      });
    });

    it('説明の文字数制限を検証する', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const descriptionTextarea = screen.getByLabelText('説明');
      const longDescription = 'あ'.repeat(501); // 501文字
      
      await user.type(nameInput, 'テストプロジェクト');
      await user.type(descriptionTextarea, longDescription);
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('説明は500文字以内で入力してください')).toBeInTheDocument();
      });
    });

    it('予算が負の値の場合にエラーを表示する', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const budgetInput = screen.getByLabelText('予算');
      
      await user.type(nameInput, 'テストプロジェクト');
      await user.clear(budgetInput);
      await user.type(budgetInput, '-100');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('予算は0以上で入力してください')).toBeInTheDocument();
      });
    });

    it('入力エラーがある項目の入力時にエラーがクリアされる', async () => {
      render(<ProjectCreateModal {...defaultProps} />);
      
      // まずエラーを表示させる
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名は必須です')).toBeInTheDocument();
      });
      
      // プロジェクト名を入力してエラーがクリアされることを確認
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テスト');
      
      expect(screen.queryByText('プロジェクト名は必須です')).not.toBeInTheDocument();
    });
  });

  describe('プロジェクト作成処理', () => {
    it('有効な入力でプロジェクトが作成される', async () => {
      const onCreateProject = vi.fn().mockResolvedValue(undefined);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      // フォームに入力
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const descriptionTextarea = screen.getByLabelText('説明');
      
      await user.type(nameInput, 'テストプロジェクト');
      await user.type(descriptionTextarea, 'テスト説明');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onCreateProject).toHaveBeenCalledWith({
          name: 'テストプロジェクト',
          description: 'テスト説明',
          priority: 'MEDIUM',
          color: '#3B82F6',
          icon: '📋',
          tags: []
        });
      });
    });

    it('プロジェクト作成中はローディング状態になる', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onCreateProject = vi.fn().mockReturnValue(promise);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      // ローディング状態の確認
      expect(screen.getByText('作成中...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('キャンセル')).toBeDisabled();
      
      // プロミスを解決してローディング状態を終了
      act(() => {
        resolvePromise!();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('作成中...')).not.toBeInTheDocument();
      });
    });

    it('作成成功後にモーダルが閉じられる', async () => {
      const onOpenChange = vi.fn();
      const onCreateProject = vi.fn().mockResolvedValue(undefined);
      
      render(
        <ProjectCreateModal 
          {...defaultProps} 
          onOpenChange={onOpenChange}
          onCreateProject={onCreateProject}
        />
      );
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onCreateProject).toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('作成成功後にフォームがリセットされる', async () => {
      const onCreateProject = vi.fn().mockResolvedValue(undefined);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      // フォームに入力
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      const descriptionTextarea = screen.getByLabelText('説明');
      
      await user.type(nameInput, 'テストプロジェクト');
      await user.type(descriptionTextarea, 'テスト説明');
      
      // タグを追加
      const tagInput = screen.getByPlaceholderText('タグを入力');
      await user.type(tagInput, 'テストタグ{enter}');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(onCreateProject).toHaveBeenCalled();
      });
      
      // モーダルを再表示してフォームがリセットされていることを確認
      expect(nameInput).toHaveValue('');
      expect(descriptionTextarea).toHaveValue('');
      expect(screen.queryByText('テストタグ ×')).not.toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('一般的なエラーメッセージを表示する', async () => {
      const onCreateProject = vi.fn().mockRejectedValue(new Error('作成エラー'));
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('作成エラー')).toBeInTheDocument();
      });
    });

    it('ネットワークエラーを正しく処理する', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      const onCreateProject = vi.fn().mockRejectedValue(networkError);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
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
      const onCreateProject = vi.fn().mockRejectedValue(validationError);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, '重複プロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('プロジェクト名が重複しています')).toBeInTheDocument();
      });
    });

    it('認証エラー(401)を処理する', async () => {
      const authError = { status: 401 };
      const onCreateProject = vi.fn().mockRejectedValue(authError);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('認証が必要です。ログインしてください。')).toBeInTheDocument();
      });
    });

    it('サーバーエラー(500)を処理する', async () => {
      const serverError = { status: 500 };
      const onCreateProject = vi.fn().mockRejectedValue(serverError);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('サーバーエラーが発生しました。しばらく後に再試行してください。')).toBeInTheDocument();
      });
    });

    it('ネットワークエラーの再試行機能が動作する', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      const onCreateProject = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(undefined);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('ネットワーク接続に問題があります。接続を確認して再試行してください。')).toBeInTheDocument();
      });
      
      // 再試行ボタンをクリック
      const retryButton = screen.getByText('再試行');
      await user.click(retryButton);
      
      await waitFor(() => {
        expect(onCreateProject).toHaveBeenCalledTimes(2);
      });
    });

    it('エラーメッセージを閉じることができる', async () => {
      const onCreateProject = vi.fn().mockRejectedValue(new Error('テストエラー'));
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
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
      
      render(<ProjectCreateModal {...defaultProps} onOpenChange={onOpenChange} />);
      
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('送信中はモーダルを閉じることができない', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onCreateProject = vi.fn().mockReturnValue(promise);
      const onOpenChange = vi.fn();
      
      render(
        <ProjectCreateModal 
          {...defaultProps} 
          onCreateProject={onCreateProject}
          onOpenChange={onOpenChange}
        />
      );
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
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

    it('モーダルクローズ時にフォームがリセットされる', async () => {
      const onOpenChange = vi.fn();
      
      render(<ProjectCreateModal {...defaultProps} onOpenChange={onOpenChange} />);
      
      // フォームに入力
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      // タグを追加
      const tagInput = screen.getByPlaceholderText('タグを入力');
      await user.type(tagInput, 'テストタグ{enter}');
      
      const cancelButton = screen.getByText('キャンセル');
      await user.click(cancelButton);
      
      expect(onOpenChange).toHaveBeenCalledWith(false);
      
      // フォームがリセットされていることを確認
      expect(nameInput).toHaveValue('');
      expect(screen.queryByText('テストタグ ×')).not.toBeInTheDocument();
    });
  });

  describe('入力項目の無効化', () => {
    it('送信中は全ての入力項目が無効になる', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      const onCreateProject = vi.fn().mockReturnValue(promise);
      
      render(<ProjectCreateModal {...defaultProps} onCreateProject={onCreateProject} />);
      
      const nameInput = screen.getByLabelText(/プロジェクト名/);
      await user.type(nameInput, 'テストプロジェクト');
      
      const submitButton = screen.getByText('作成');
      await user.click(submitButton);
      
      // 入力項目が無効化されていることを確認
      expect(nameInput).toBeDisabled();
      expect(screen.getByLabelText('説明')).toBeDisabled();
      
      // プロミスを解決
      act(() => {
        resolvePromise!();
      });
      
      await waitFor(() => {
        expect(nameInput).not.toBeDisabled();
      });
    });
  });
});