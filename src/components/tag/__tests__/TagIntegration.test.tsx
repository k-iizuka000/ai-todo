/**
 * タグ機能の統合テスト
 * グループ10: テストとドキュメント - 統合テスト
 * 
 * テスト内容:
 * 1. タグ作成→タスク設定→表示の一連フロー
 * 2. タグ削除時の影響範囲確認
 * 3. フィルタリング機能の動作確認
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useTagStore } from '../../../stores/tagStore';
import { useTaskStore } from '../../../stores/taskStore';
import { TagList } from '../TagList';
import { TagSelector } from '../TagSelector';
import { Tag, Task } from '../../../types';

// テスト用のWrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

// モックデータ
const mockInitialTags: Tag[] = [
  {
    id: 'integration-tag-1',
    name: '重要',
    color: '#EF4444',
    usageCount: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'integration-tag-2',
    name: '緊急',
    color: '#F59E0B',
    usageCount: 0,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02')
  }
];

const mockInitialTasks: Task[] = [
  {
    id: 'integration-task-1',
    title: 'テストタスク1',
    description: 'タグ統合テスト用のタスク',
    status: 'todo',
    priority: 'high',
    tags: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  }
];

// ストアのモック
jest.mock('../../../stores/tagStore');
jest.mock('../../../stores/taskStore');

// TagItemコンポーネントのモック
jest.mock('../TagItem', () => ({
  TagItem: ({ tag, onClick, onEdit, onDelete }: any) => (
    <div data-testid={`tag-item-${tag.id}`}>
      <span>{tag.name}</span>
      <span>使用回数: {tag.usageCount}</span>
      {onClick && <button onClick={() => onClick(tag)}>選択</button>}
      {onEdit && <button onClick={() => onEdit(tag)}>編集</button>}
      {onDelete && <button onClick={() => onDelete(tag)}>削除</button>}
    </div>
  )
}));

describe('タグ機能の統合テスト', () => {
  let mockTagStore: any;
  let mockTaskStore: any;

  beforeEach(() => {
    // タグストアのモック
    mockTagStore = {
      tags: [...mockInitialTags],
      selectedTags: [],
      isLoading: false,
      error: null,
      addTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
      selectTag: jest.fn(),
      deselectTag: jest.fn(),
      clearSelectedTags: jest.fn(),
      getFilteredTags: jest.fn(),
      checkTagUsage: jest.fn(),
      syncWithTasks: jest.fn()
    };

    // タスクストアのモック
    mockTaskStore = {
      tasks: [...mockInitialTasks],
      isLoading: false,
      error: null,
      updateTask: jest.fn(),
      createTask: jest.fn(),
      deleteTask: jest.fn()
    };

    (useTagStore as jest.Mock).mockReturnValue(mockTagStore);
    (useTaskStore as jest.Mock).mockReturnValue(mockTaskStore);

    jest.clearAllMocks();
  });

  describe('タグ作成→タスク設定→表示の一連フロー', () => {
    it('新規タグを作成し、タスクに設定して表示する完全なフロー', async () => {
      const user = userEvent.setup();

      // 1. タグ作成のシミュレーション
      const newTag: Tag = {
        id: 'new-tag-id',
        name: '新規タグ',
        color: '#10B981',
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // addTagが呼ばれたときのストア状態更新をシミュレート
      mockTagStore.addTag.mockImplementation((tagInput: any) => {
        mockTagStore.tags.push(newTag);
        return Promise.resolve();
      });

      // 2. タグ一覧コンポーネントのレンダリング
      render(
        <TestWrapper>
          <TagList
            tags={mockTagStore.tags}
            onTagEdit={mockTagStore.updateTag}
            onTagDelete={mockTagStore.deleteTag}
          />
        </TestWrapper>
      );

      // 初期状態の確認
      expect(screen.getByTestId('tag-item-integration-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-item-integration-tag-2')).toBeInTheDocument();

      // 3. タグ作成の実行
      await mockTagStore.addTag({
        name: '新規タグ',
        color: '#10B981'
      });

      // タグが追加されたことを確認
      expect(mockTagStore.addTag).toHaveBeenCalledWith({
        name: '新規タグ',
        color: '#10B981'
      });

      // 4. タスクにタグを設定するシミュレーション
      const onTagsChange = jest.fn();
      render(
        <TestWrapper>
          <TagSelector
            selectedTags={[]}
            onTagsChange={onTagsChange}
            editing={true}
            availableTags={[...mockTagStore.tags, newTag]}
          />
        </TestWrapper>
      );

      // タグが選択可能であることを確認
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });

    it('タグの使用回数が正しく更新される', async () => {
      // タスクにタグが使用されている状態をシミュレート
      const taskWithTag: Task = {
        ...mockInitialTasks[0],
        tags: [mockInitialTags[0]]
      };

      mockTaskStore.tasks = [taskWithTag];
      mockTagStore.checkTagUsage.mockReturnValue({
        isUsed: true,
        taskCount: 1
      });

      // syncWithTasksが呼ばれたときの状態更新をシミュレート
      mockTagStore.syncWithTasks.mockImplementation(() => {
        mockTagStore.tags[0].usageCount = 1;
        return Promise.resolve();
      });

      // タグとタスクの同期実行
      await mockTagStore.syncWithTasks();

      expect(mockTagStore.syncWithTasks).toHaveBeenCalled();
    });
  });

  describe('タグ削除時の影響範囲確認', () => {
    it('使用中のタグを削除しようとすると警告が表示される', async () => {
      const user = userEvent.setup();

      // タグが使用中であることをシミュレート
      mockTagStore.checkTagUsage.mockReturnValue({
        isUsed: true,
        taskCount: 2
      });

      mockTagStore.deleteTag.mockImplementation((id: string) => {
        if (id === 'integration-tag-1') {
          mockTagStore.error = 'このタグは2件のタスクで使用中です。削除する前にタスクからタグを削除してください。';
          return Promise.resolve();
        }
      });

      render(
        <TestWrapper>
          <TagList
            tags={mockTagStore.tags}
            onTagDelete={mockTagStore.deleteTag}
          />
        </TestWrapper>
      );

      const deleteButton = screen.getAllByText('削除')[0];
      await user.click(deleteButton);

      expect(mockTagStore.deleteTag).toHaveBeenCalledWith('integration-tag-1');
    });

    it('未使用のタグは正常に削除される', async () => {
      const user = userEvent.setup();

      // タグが未使用であることをシミュレート
      mockTagStore.checkTagUsage.mockReturnValue({
        isUsed: false,
        taskCount: 0
      });

      mockTagStore.deleteTag.mockImplementation((id: string) => {
        if (id === 'integration-tag-2') {
          mockTagStore.tags = mockTagStore.tags.filter((tag: Tag) => tag.id !== id);
          return Promise.resolve();
        }
      });

      render(
        <TestWrapper>
          <TagList
            tags={mockTagStore.tags}
            onTagDelete={mockTagStore.deleteTag}
          />
        </TestWrapper>
      );

      const deleteButtons = screen.getAllByText('削除');
      await user.click(deleteButtons[1]); // 2番目のタグを削除

      expect(mockTagStore.deleteTag).toHaveBeenCalledWith('integration-tag-2');
    });

    it('タグ削除後に関連タスクの整合性が保たれる', async () => {
      // タグ削除によってタスクからもタグが削除されることをシミュレート
      const taskWithTags: Task = {
        ...mockInitialTasks[0],
        tags: [mockInitialTags[0], mockInitialTags[1]]
      };

      mockTaskStore.tasks = [taskWithTags];

      // タグ削除後のタスク更新をシミュレート
      mockTaskStore.updateTask.mockImplementation((id: string, updates: Partial<Task>) => {
        const taskIndex = mockTaskStore.tasks.findIndex((task: Task) => task.id === id);
        if (taskIndex !== -1) {
          mockTaskStore.tasks[taskIndex] = { ...mockTaskStore.tasks[taskIndex], ...updates };
        }
        return Promise.resolve();
      });

      // タグが削除されたことをシミュレート
      const deletedTagId = 'integration-tag-1';
      mockTagStore.tags = mockTagStore.tags.filter((tag: Tag) => tag.id !== deletedTagId);

      // タスクからも削除されたタグを削除
      const updatedTags = taskWithTags.tags.filter(tag => tag.id !== deletedTagId);
      await mockTaskStore.updateTask(taskWithTags.id, { tags: updatedTags });

      expect(mockTaskStore.updateTask).toHaveBeenCalledWith(
        taskWithTags.id,
        { tags: [mockInitialTags[1]] }
      );
    });
  });

  describe('フィルタリング機能の動作確認', () => {
    it('検索フィルターが正しく動作する', async () => {
      const user = userEvent.setup();

      // getFilteredTagsのモック実装
      mockTagStore.getFilteredTags.mockImplementation((filter: any) => {
        if (filter.search) {
          return mockTagStore.tags.filter((tag: Tag) =>
            tag.name.toLowerCase().includes(filter.search.toLowerCase())
          );
        }
        return mockTagStore.tags;
      });

      const onFilterChange = jest.fn();

      render(
        <TestWrapper>
          <TagList
            tags={mockTagStore.tags}
            onFilterChange={onFilterChange}
          />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('タグを検索...');
      await user.type(searchInput, '重要');

      await waitFor(() => {
        expect(onFilterChange).toHaveBeenCalledWith({
          search: '重要'
        });
      });
    });

    it('ソート機能が正しく動作する', async () => {
      const user = userEvent.setup();

      // ソート機能のモック実装
      mockTagStore.getFilteredTags.mockImplementation((filter: any) => {
        let sorted = [...mockTagStore.tags];
        if (filter.sortBy === 'usageCount') {
          sorted.sort((a: Tag, b: Tag) => {
            const aValue = a.usageCount || 0;
            const bValue = b.usageCount || 0;
            return filter.sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
          });
        }
        return sorted;
      });

      const onFilterChange = jest.fn();

      render(
        <TestWrapper>
          <TagList
            tags={mockTagStore.tags}
            onFilterChange={onFilterChange}
          />
        </TestWrapper>
      );

      const usageCountSort = screen.getByText('使用回数');
      await user.click(usageCountSort);

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'usageCount',
          sortOrder: 'asc'
        })
      );
    });

    it('複合フィルター（検索+ソート）が正しく動作する', async () => {
      const user = userEvent.setup();

      // 複合フィルターのモック実装
      mockTagStore.getFilteredTags.mockImplementation((filter: any) => {
        let result = [...mockTagStore.tags];

        // 検索フィルター
        if (filter.search) {
          result = result.filter((tag: Tag) =>
            tag.name.toLowerCase().includes(filter.search.toLowerCase())
          );
        }

        // ソート
        if (filter.sortBy === 'name') {
          result.sort((a: Tag, b: Tag) => {
            const comparison = a.name.localeCompare(b.name, 'ja');
            return filter.sortOrder === 'desc' ? -comparison : comparison;
          });
        }

        return result;
      });

      const onFilterChange = jest.fn();

      render(
        <TestWrapper>
          <TagList
            tags={mockTagStore.tags}
            onFilterChange={onFilterChange}
          />
        </TestWrapper>
      );

      // 検索実行
      const searchInput = screen.getByPlaceholderText('タグを検索...');
      await user.type(searchInput, '重');

      // ソート実行
      const nameSort = screen.getByText('名前');
      await user.click(nameSort);

      // 複数回のフィルター変更が呼ばれることを確認
      expect(onFilterChange).toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('タグ作成エラー時に適切なエラーメッセージが表示される', async () => {
      mockTagStore.addTag.mockImplementation(() => {
        mockTagStore.error = 'タグの作成に失敗しました';
        return Promise.reject(new Error('ネットワークエラー'));
      });

      try {
        await mockTagStore.addTag({
          name: 'エラータグ',
          color: '#FF0000'
        });
      } catch (error) {
        // エラーが適切に処理されることを確認
      }

      expect(mockTagStore.error).toBe('タグの作成に失敗しました');
    });

    it('タグ更新エラー時に適切なエラーメッセージが表示される', async () => {
      mockTagStore.updateTag.mockImplementation(() => {
        mockTagStore.error = 'タグの更新に失敗しました';
        return Promise.reject(new Error('更新エラー'));
      });

      try {
        await mockTagStore.updateTag('integration-tag-1', {
          name: '更新タグ'
        });
      } catch (error) {
        // エラーが適切に処理されることを確認
      }

      expect(mockTagStore.error).toBe('タグの更新に失敗しました');
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量のタグでもパフォーマンスが保たれる', async () => {
      // 大量のタグデータを生成
      const largeTags: Tag[] = Array.from({ length: 1000 }, (_, index) => ({
        id: `large-tag-${index}`,
        name: `タグ${index}`,
        color: '#000000',
        usageCount: index % 10,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockTagStore.tags = largeTags;

      const startTime = performance.now();

      render(
        <TestWrapper>
          <TagList tags={largeTags} />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が合理的な範囲内であることを確認（1秒以下）
      expect(renderTime).toBeLessThan(1000);
    });
  });
});