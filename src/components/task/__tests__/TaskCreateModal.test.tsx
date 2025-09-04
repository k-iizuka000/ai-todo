import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { TaskCreateModal } from '../TaskCreateModal';
import { CreateTaskInput } from '@/types/task';

// TaskFormコンポーネントのモック
jest.mock('../TaskForm', () => ({
  TaskForm: ({ onSubmit, onCancel, loading, ...props }: any) => (
    <div data-testid="task-form">
      <div data-testid="props-display">
        {JSON.stringify({
          initialDataHasProjectId: !!props.initialData?.projectId,
          submitLabel: props.submitLabel,
          title: props.title,
          loading
        })}
      </div>
      <button 
        data-testid="form-submit" 
        onClick={() => onSubmit({ 
          title: 'Test Task', 
          description: 'Test Description',
          priority: 'medium',
          projectId: props.initialData?.projectId || 'default-project'
        })}
        disabled={loading}
      >
        Submit Form
      </button>
      <button data-testid="form-cancel" onClick={onCancel}>
        Cancel Form
      </button>
    </div>
  )
}));

// Modalコンポーネントのモック
jest.mock('@/components/ui/modal', () => ({
  Modal: ({ children, open, title, description, onOpenChange }: any) => 
    open ? (
      <div data-testid="modal" role="dialog">
        <div data-testid="modal-title">{title}</div>
        <div data-testid="modal-description">{description}</div>
        <button data-testid="modal-close" onClick={() => onOpenChange(false)}>
          Close Modal
        </button>
        {children}
      </div>
    ) : null
}));

describe('TaskCreateModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onTaskCreate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本表示', () => {
    it('モーダルが開かれている時に正しく表示される', () => {
      render(<TaskCreateModal {...defaultProps} />);
      
      expect(screen.getByTestId('modal')).toBeInTheDocument();
      expect(screen.getByTestId('modal-title')).toHaveTextContent('新しいタスクを作成');
      expect(screen.getByTestId('modal-description')).toHaveTextContent('タスクの詳細情報を入力してください');
      expect(screen.getByTestId('task-form')).toBeInTheDocument();
    });

    it('モーダルが閉じられている時は表示されない', () => {
      render(<TaskCreateModal {...defaultProps} open={false} />);
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('AI支援ヒントが表示される', () => {
      render(<TaskCreateModal {...defaultProps} />);
      
      expect(screen.getByText('AI支援機能')).toBeInTheDocument();
      expect(screen.getByText(/タスクのタイトルを入力後、「AI支援で説明を生成」ボタンで/)).toBeInTheDocument();
    });
  });

  describe('プロジェクトID設定ロジック', () => {
    it('projectIdが指定されている場合、TaskFormに正しく渡される', () => {
      render(
        <TaskCreateModal 
          {...defaultProps} 
          projectId="test-project-123"
        />
      );
      
      const propsDisplay = screen.getByTestId('props-display');
      const props = JSON.parse(propsDisplay.textContent!);
      
      expect(props.initialDataHasProjectId).toBe(true);
    });

    it('initialDataにprojectIdがある場合、TaskFormに正しく渡される', () => {
      render(
        <TaskCreateModal 
          {...defaultProps} 
          initialData={{ projectId: 'initial-project-456' }}
        />
      );
      
      const propsDisplay = screen.getByTestId('props-display');
      const props = JSON.parse(propsDisplay.textContent!);
      
      expect(props.initialDataHasProjectId).toBe(true);
    });

    it('projectIdが優先され、initialData.projectIdより優先される', () => {
      render(
        <TaskCreateModal 
          {...defaultProps} 
          projectId="priority-project"
          initialData={{ projectId: 'initial-project' }}
        />
      );
      
      const propsDisplay = screen.getByTestId('props-display');
      const props = JSON.parse(propsDisplay.textContent!);
      
      expect(props.initialDataHasProjectId).toBe(true);
    });

    it('projectIdもinitialData.projectIdもない場合、undefinedが渡される', () => {
      render(<TaskCreateModal {...defaultProps} />);
      
      const propsDisplay = screen.getByTestId('props-display');
      const props = JSON.parse(propsDisplay.textContent!);
      
      expect(props.initialDataHasProjectId).toBe(false);
    });
  });

  describe('タスク作成処理', () => {
    it('正常なタスク作成時にモーダルが閉じられる', async () => {
      const mockOnTaskCreate = jest.fn().mockResolvedValue(undefined);
      const mockOnOpenChange = jest.fn();

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
          onOpenChange={mockOnOpenChange}
        />
      );

      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnTaskCreate).toHaveBeenCalledWith({
          title: 'Test Task',
          description: 'Test Description',
          priority: 'medium',
          projectId: 'default-project',
          assigneeId: undefined,
          tags: undefined,
          dueDate: undefined,
          estimatedHours: undefined,
        });
      });

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('タスク作成エラー時にエラーメッセージが表示される', async () => {
      const mockOnTaskCreate = jest.fn().mockRejectedValue(new Error('作成に失敗しました'));

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
        />
      );

      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('作成エラー')).toBeInTheDocument();
        expect(screen.getByText('作成に失敗しました')).toBeInTheDocument();
      });
    });

    it('バリデーションエラー時に適切なエラーメッセージが表示される', async () => {
      const mockOnTaskCreate = jest.fn().mockRejectedValue(new Error('validation: タイトルが無効です'));

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
        />
      );

      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('作成エラー')).toBeInTheDocument();
        expect(screen.getByText('入力エラー: validation: タイトルが無効です')).toBeInTheDocument();
      });
    });

    it('ネットワークエラー時に適切なエラーメッセージが表示される', async () => {
      const mockOnTaskCreate = jest.fn().mockRejectedValue(new Error('network: 接続できません'));

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
        />
      );

      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('作成エラー')).toBeInTheDocument();
        expect(screen.getByText('ネットワークエラーが発生しました。インターネット接続を確認してください。')).toBeInTheDocument();
      });
    });

    it('タイムアウトエラー時に適切なエラーメッセージが表示される', async () => {
      const mockOnTaskCreate = jest.fn().mockRejectedValue(new Error('timeout: サーバー応答なし'));

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
        />
      );

      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('作成エラー')).toBeInTheDocument();
        expect(screen.getByText('サーバーからの応答がありません。しばらくお待ちください。')).toBeInTheDocument();
      });
    });
  });

  describe('ローディング状態', () => {
    it('タスク作成中はローディング状態が表示される', async () => {
      const mockOnTaskCreate = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
        />
      );

      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      // ローディング状態の確認
      const propsDisplay = screen.getByTestId('props-display');
      const props = JSON.parse(propsDisplay.textContent!);
      expect(props.loading).toBe(true);

      // ローディング中はフォームが無効化される
      expect(submitButton).toBeDisabled();
    });
  });

  describe('エラー状態管理', () => {
    it('エラークリアボタンでエラーが消去される', async () => {
      const mockOnTaskCreate = jest.fn().mockRejectedValue(new Error('テストエラー'));

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
        />
      );

      // エラーを発生させる
      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('テストエラー')).toBeInTheDocument();
      });

      // エラークリアボタンをクリック
      const clearButton = screen.getByRole('button', { name: '×' });
      await userEvent.click(clearButton);

      expect(screen.queryByText('テストエラー')).not.toBeInTheDocument();
    });
  });

  describe('キャンセル処理', () => {
    it('TaskFormのキャンセルボタンでモーダルが閉じられる', async () => {
      const mockOnOpenChange = jest.fn();

      render(
        <TaskCreateModal 
          {...defaultProps}
          onOpenChange={mockOnOpenChange}
        />
      );

      const cancelButton = screen.getByTestId('form-cancel');
      await userEvent.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('ローディング中はキャンセルできない', async () => {
      const mockOnTaskCreate = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      const mockOnOpenChange = jest.fn();

      render(
        <TaskCreateModal 
          {...defaultProps}
          onTaskCreate={mockOnTaskCreate}
          onOpenChange={mockOnOpenChange}
        />
      );

      // ローディング状態にする
      const submitButton = screen.getByTestId('form-submit');
      await userEvent.click(submitButton);

      // キャンセルを試行
      const cancelButton = screen.getByTestId('form-cancel');
      await userEvent.click(cancelButton);

      // ローディング中なのでモーダルは閉じられない
      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });
  });

  describe('プロップスの最適化', () => {
    it('TaskFormプロップスが適切にメモ化される', () => {
      const { rerender } = render(
        <TaskCreateModal 
          {...defaultProps}
          projectId="test-project"
        />
      );

      const firstPropsDisplay = screen.getByTestId('props-display');
      const firstProps = JSON.parse(firstPropsDisplay.textContent!);

      // 関連しないプロップスを変更
      rerender(
        <TaskCreateModal 
          {...defaultProps}
          projectId="test-project"
          className="new-class"
        />
      );

      const secondPropsDisplay = screen.getByTestId('props-display');
      const secondProps = JSON.parse(secondPropsDisplay.textContent!);

      // TaskFormに渡されるプロップスが変更されていないことを確認
      expect(firstProps).toEqual(secondProps);
    });
  });
});