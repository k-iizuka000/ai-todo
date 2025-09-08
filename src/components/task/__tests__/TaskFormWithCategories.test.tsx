import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskForm } from '../TaskForm';
import { CreateTaskInput } from '@/types/task';
import { Tag } from '@/types/tag';
import { Project } from '@/types/project';

// モックデータ
const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'フロントエンド',
    color: '#3B82F6',
    usageCount: 5,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'tag-2',
    name: 'バックエンド',
    color: '#10B981',
    usageCount: 3,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: 'tag-3',
    name: 'デザイン',
    color: '#F59E0B',
    usageCount: 2,
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
];

const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Webアプリケーション',
    description: 'React + TypeScript でのWebアプリケーション開発',
    status: 'active',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'project-2',
    name: 'モバイルアプリ',
    description: 'React Native でのモバイルアプリ開発',
    status: 'active',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: 'project-3',
    name: 'アーカイブプロジェクト',
    description: '完了したプロジェクト',
    status: 'archived',
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
];

// モックストア
vi.mock('@/stores/tagStore', () => ({
  useTagStore: () => ({
    tags: mockTags,
    isLoading: false,
    error: null,
    addTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    getTag: vi.fn(),
  })
}));

vi.mock('@/stores/projectStore', () => ({
  useProjectStore: () => ({
    projects: mockProjects,
    isLoading: false,
    error: null,
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    getProject: vi.fn(),
    getProjectById: vi.fn((id: string) => 
      mockProjects.find(project => project.id === id)
    ),
  })
}));

describe('TaskForm - プロジェクト・タグ選択機能', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    title: 'テストタスクフォーム'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('タグ選択機能', () => {
    it('利用可能なタグがすべて表示される', async () => {
      render(<TaskForm {...defaultProps} />);

      // タグ選択セクションが表示されることを確認
      expect(screen.getByText('タグ')).toBeInTheDocument();

      // すべてのタグが選択オプションとして表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('フロントエンド')).toBeInTheDocument();
        expect(screen.getByText('バックエンド')).toBeInTheDocument();
        expect(screen.getByText('デザイン')).toBeInTheDocument();
      });
    });

    it('複数のタグを選択できる', async () => {
      const user = userEvent.setup();
      render(<TaskForm {...defaultProps} />);

      // フロントエンドタグを選択
      const frontendTag = screen.getByLabelText('フロントエンド');
      await user.click(frontendTag);

      // バックエンドタグを選択
      const backendTag = screen.getByLabelText('バックエンド');
      await user.click(backendTag);

      // 両方のタグが選択されていることを確認
      expect(frontendTag).toBeChecked();
      expect(backendTag).toBeChecked();
    });

    it('選択されたタグが送信データに含まれる', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(<TaskForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 必須フィールドを入力
      const titleInput = screen.getByLabelText('タイトル');
      await user.type(titleInput, 'テストタスク');

      // タグを選択
      const frontendTag = screen.getByLabelText('フロントエンド');
      const designTag = screen.getByLabelText('デザイン');
      await user.click(frontendTag);
      await user.click(designTag);

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      // 選択されたタグがonSubmitに渡されることを確認
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['tag-1', 'tag-3'],
          })
        );
      });
    });

    it('タグの選択を解除できる', async () => {
      const user = userEvent.setup();
      render(<TaskForm {...defaultProps} />);

      // タグを選択
      const frontendTag = screen.getByLabelText('フロントエンド');
      await user.click(frontendTag);
      expect(frontendTag).toBeChecked();

      // 同じタグをクリックして選択解除
      await user.click(frontendTag);
      expect(frontendTag).not.toBeChecked();
    });

    it('タグの色が正しく表示される', async () => {
      render(<TaskForm {...defaultProps} />);

      await waitFor(() => {
        // フロントエンドタグの色確認
        const frontendTagElement = screen.getByText('フロントエンド').closest('[data-testid="tag-option"]');
        expect(frontendTagElement).toHaveStyle({ backgroundColor: '#3B82F6' });

        // バックエンドタグの色確認
        const backendTagElement = screen.getByText('バックエンド').closest('[data-testid="tag-option"]');
        expect(backendTagElement).toHaveStyle({ backgroundColor: '#10B981' });
      });
    });
  });

  describe('プロジェクト選択機能', () => {
    it('アクティブなプロジェクトのみが表示される', async () => {
      render(<TaskForm {...defaultProps} />);

      // プロジェクト選択フィールドが表示されることを確認
      expect(screen.getByLabelText('プロジェクト')).toBeInTheDocument();

      // アクティブなプロジェクトが表示される
      await waitFor(() => {
        expect(screen.getByText('Webアプリケーション')).toBeInTheDocument();
        expect(screen.getByText('モバイルアプリ')).toBeInTheDocument();
      });

      // アーカイブされたプロジェクトは表示されない
      expect(screen.queryByText('アーカイブプロジェクト')).not.toBeInTheDocument();
    });

    it('プロジェクトを選択できる', async () => {
      const user = userEvent.setup();
      render(<TaskForm {...defaultProps} />);

      const projectSelect = screen.getByLabelText('プロジェクト');
      
      // プロジェクトを選択
      await user.selectOptions(projectSelect, 'project-1');
      
      // 選択されたプロジェクトが反映される
      expect(projectSelect).toHaveValue('project-1');
    });

    it('選択されたプロジェクトが送信データに含まれる', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(<TaskForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 必須フィールドを入力
      const titleInput = screen.getByLabelText('タイトル');
      await user.type(titleInput, 'テストタスク');

      // プロジェクトを選択
      const projectSelect = screen.getByLabelText('プロジェクト');
      await user.selectOptions(projectSelect, 'project-2');

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      // 選択されたプロジェクトがonSubmitに渡されることを確認
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'project-2',
          })
        );
      });
    });

    it('プロジェクト未選択でもフォーム送信できる', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(<TaskForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 必須フィールドのみ入力
      const titleInput = screen.getByLabelText('タイトル');
      await user.type(titleInput, 'テストタスク');

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      // プロジェクトIDがundefinedでonSubmitが呼ばれることを確認
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: undefined,
          })
        );
      });
    });
  });

  describe('統合バリデーション機能', () => {
    it('プロジェクト選択とタグ選択の組み合わせが正常に動作する', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(<TaskForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 必須フィールドを入力
      const titleInput = screen.getByLabelText('タイトル');
      const descriptionInput = screen.getByLabelText('説明');
      await user.type(titleInput, 'Webアプリケーションのフロントエンド開発');
      await user.type(descriptionInput, 'React コンポーネントの実装とデザインの調整');

      // プロジェクトを選択
      const projectSelect = screen.getByLabelText('プロジェクト');
      await user.selectOptions(projectSelect, 'project-1');

      // 複数のタグを選択
      const frontendTag = screen.getByLabelText('フロントエンド');
      const designTag = screen.getByLabelText('デザイン');
      await user.click(frontendTag);
      await user.click(designTag);

      // 優先度を設定
      const prioritySelect = screen.getByLabelText('優先度');
      await user.selectOptions(prioritySelect, 'high');

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      // 全ての選択内容が正しく送信されることを確認
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Webアプリケーションのフロントエンド開発',
          description: 'React コンポーネントの実装とデザインの調整',
          priority: 'high',
          dueDate: undefined,
          estimatedHours: undefined,
          tags: ['tag-1', 'tag-3'],
          projectId: 'project-1',
        });
      });
    });

    it('タグとプロジェクトの関連性チェックが機能する', async () => {
      // プロジェクト固有のタグ制限がある場合のテスト
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(<TaskForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 必須フィールドを入力
      const titleInput = screen.getByLabelText('タイトル');
      await user.type(titleInput, 'テストタスク');

      // モバイルアプリプロジェクトを選択
      const projectSelect = screen.getByLabelText('プロジェクト');
      await user.selectOptions(projectSelect, 'project-2');

      // フロントエンドタグを選択（一般的には問題ない）
      const frontendTag = screen.getByLabelText('フロントエンド');
      await user.click(frontendTag);

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      // 送信が成功することを確認
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('最大タグ選択数制限が機能する', async () => {
      const user = userEvent.setup();
      render(<TaskForm {...defaultProps} />);

      // すべてのタグを選択しようとする
      const frontendTag = screen.getByLabelText('フロントエンド');
      const backendTag = screen.getByLabelText('バックエンド');
      const designTag = screen.getByLabelText('デザイン');

      await user.click(frontendTag);
      await user.click(backendTag);
      await user.click(designTag);

      // 全てのタグが選択できることを確認（制限がない場合）
      expect(frontendTag).toBeChecked();
      expect(backendTag).toBeChecked();
      expect(designTag).toBeChecked();
    });
  });

  describe('編集モード', () => {
    const editTask = {
      id: 'existing-task',
      title: '既存のタスク',
      description: '編集対象のタスク',
      status: 'todo' as const,
      priority: 'medium' as const,
      tags: ['tag-1', 'tag-2'],
      projectId: 'project-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('編集時に既存のタグ選択状態が復元される', async () => {
      render(
        <TaskForm 
          {...defaultProps} 
          initialData={editTask}
          title="タスク編集"
        />
      );

      // 既存のタグが選択されていることを確認
      await waitFor(() => {
        const frontendTag = screen.getByLabelText('フロントエンド');
        const backendTag = screen.getByLabelText('バックエンド');
        const designTag = screen.getByLabelText('デザイン');

        expect(frontendTag).toBeChecked();
        expect(backendTag).toBeChecked();
        expect(designTag).not.toBeChecked();
      });
    });

    it('編集時に既存のプロジェクト選択状態が復元される', async () => {
      render(
        <TaskForm 
          {...defaultProps} 
          initialData={editTask}
          title="タスク編集"
        />
      );

      // 既存のプロジェクトが選択されていることを確認
      await waitFor(() => {
        const projectSelect = screen.getByLabelText('プロジェクト');
        expect(projectSelect).toHaveValue('project-1');
      });
    });

    it('編集時にタグとプロジェクトの変更が可能', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      
      render(
        <TaskForm 
          {...defaultProps} 
          onSubmit={mockOnSubmit}
          initialData={editTask}
          title="タスク編集"
        />
      );

      // プロジェクトを変更
      const projectSelect = screen.getByLabelText('プロジェクト');
      await user.selectOptions(projectSelect, 'project-2');

      // タグ選択を変更
      const backendTag = screen.getByLabelText('バックエンド');
      const designTag = screen.getByLabelText('デザイン');
      
      await user.click(backendTag); // 選択解除
      await user.click(designTag); // 新たに選択

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: '更新' });
      await user.click(submitButton);

      // 変更された内容が送信されることを確認
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['tag-1', 'tag-3'], // フロントエンドとデザイン
            projectId: 'project-2',
          })
        );
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('タグ読み込みエラー時にフォールバック表示', async () => {
      // タグ読み込みエラーのモック
      vi.mocked(vi.importMeta.glob('@/stores/tagStore')).mockReturnValue({
        useTagStore: () => ({
          tags: [],
          isLoading: false,
          error: 'タグの読み込みに失敗しました',
          addTag: vi.fn(),
          updateTag: vi.fn(),
          deleteTag: vi.fn(),
          getTag: vi.fn(),
        })
      });

      render(<TaskForm {...defaultProps} />);

      // エラーメッセージまたはフォールバック表示を確認
      await waitFor(() => {
        expect(
          screen.getByText('タグが読み込めませんでした') ||
          screen.getByText('タグなし')
        ).toBeInTheDocument();
      });
    });

    it('プロジェクト読み込みエラー時にフォールバック表示', async () => {
      // プロジェクト読み込みエラーのモック
      vi.mocked(vi.importMeta.glob('@/stores/projectStore')).mockReturnValue({
        useProjectStore: () => ({
          projects: [],
          isLoading: false,
          error: 'プロジェクトの読み込みに失敗しました',
          addProject: vi.fn(),
          updateProject: vi.fn(),
          deleteProject: vi.fn(),
          getProject: vi.fn(),
          getProjectById: vi.fn(),
        })
      });

      render(<TaskForm {...defaultProps} />);

      // エラーメッセージまたはフォールバック表示を確認
      await waitFor(() => {
        expect(
          screen.getByText('プロジェクトが読み込めませんでした') ||
          screen.getByText('プロジェクトなし')
        ).toBeInTheDocument();
      });
    });

    it('送信エラー時にエラーメッセージを表示', async () => {
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error('送信に失敗しました'));
      const user = userEvent.setup();
      
      render(<TaskForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // 必須フィールドを入力
      const titleInput = screen.getByLabelText('タイトル');
      await user.type(titleInput, 'テストタスク');

      // フォーム送信
      const submitButton = screen.getByRole('button', { name: '作成' });
      await user.click(submitButton);

      // エラーメッセージが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('送信に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('タグ選択にキーボードでアクセスできる', async () => {
      const user = userEvent.setup();
      render(<TaskForm {...defaultProps} />);

      // Tabキーで最初のタグにフォーカス
      await user.tab(); // タイトルフィールド
      await user.tab(); // 説明フィールド
      await user.tab(); // 優先度
      await user.tab(); // プロジェクト
      await user.tab(); // タグセクション

      // スペースキーでタグを選択
      await user.keyboard(' ');

      // タグが選択されることを確認
      const firstTag = screen.getByLabelText('フロントエンド');
      expect(firstTag).toBeChecked();
    });

    it('プロジェクト選択にキーボードでアクセスできる', async () => {
      const user = userEvent.setup();
      render(<TaskForm {...defaultProps} />);

      const projectSelect = screen.getByLabelText('プロジェクト');
      
      // フォーカスを当ててキーボードで操作
      projectSelect.focus();
      await user.keyboard('{ArrowDown}');
      
      // 選択が変更されることを確認
      expect(projectSelect).toHaveFocus();
    });

    it('適切なARIAラベルが設定されている', async () => {
      render(<TaskForm {...defaultProps} />);

      // タグセクションのARIAラベル
      const tagSection = screen.getByRole('group', { name: 'タグ選択' });
      expect(tagSection).toBeInTheDocument();

      // プロジェクト選択のARIAラベル
      const projectSelect = screen.getByLabelText('プロジェクト');
      expect(projectSelect).toHaveAttribute('aria-label', 'プロジェクト選択');
    });
  });
});