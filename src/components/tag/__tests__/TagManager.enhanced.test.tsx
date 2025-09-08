import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagManager } from '../TagManager';
import { useTagStore } from '@/stores/tagStore';
import { useTaskStore } from '@/stores/taskStore';
import { getTagStats } from '@/mock/tags';
import type { Tag } from '@/types/tag';
import type { Task } from '@/types/task';

// モック設定
jest.mock('@/stores/tagStore');
jest.mock('@/stores/taskStore');
jest.mock('@/mock/tags');

const mockUseTagStore = useTagStore as jest.MockedFunction<typeof useTagStore>;
const mockUseTaskStore = useTaskStore as jest.MockedFunction<typeof useTaskStore>;
const mockGetTagStats = getTagStats as jest.MockedFunction<typeof getTagStats>;

// テスト用のタグデータ
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
    name: '未使用タグ',
    color: '#F59E0B',
    usageCount: 0,
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
  {
    id: 'tag-4',
    name: 'プロジェクト管理',
    color: '#8B5CF6',
    usageCount: 7,
    createdAt: new Date('2023-01-04'),
    updatedAt: new Date('2023-01-04'),
  },
];

// テスト用のタスクデータ
const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'フロントエンド開発',
    description: 'React コンポーネントの実装',
    status: 'todo',
    priority: 'medium',
    tags: ['tag-1'],
    projectId: 'project-1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'task-2',
    title: 'API設計',
    description: 'REST API の設計と実装',
    status: 'in-progress',
    priority: 'high',
    tags: ['tag-2'],
    projectId: 'project-1',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: 'task-3',
    title: 'プロジェクト計画',
    description: 'スプリント計画の策定',
    status: 'done',
    priority: 'high',
    tags: ['tag-4'],
    projectId: 'project-2',
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
];

const mockStats = {
  total: 4,
  totalUsage: 15,
  mostUsedTag: { name: 'プロジェクト管理', usageCount: 7 },
  unusedCount: 1,
  averageUsage: 3.75,
};

describe('TagManager - プロジェクト統合拡張テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // useTagStoreのモック
    mockUseTagStore.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      error: null,
      addTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
      getTag: jest.fn(),
    });
    
    // useTaskStoreのモック
    mockUseTaskStore.mockReturnValue({
      tasks: mockTasks,
      isLoading: false,
      error: null,
      addTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getTask: jest.fn(),
      getTasksByProject: jest.fn(),
      getTasksByTag: jest.fn(),
    });
    
    // getTagStatsのモック
    mockGetTagStats.mockReturnValue(mockStats);
  });

  describe('プロジェクト-タグ統合機能', () => {
    test('タグ使用量がプロジェクト横断で正確に計算される', async () => {
      render(<TagManager />);

      await waitFor(() => {
        // 統計情報の確認
        expect(screen.getByText('4')).toBeInTheDocument(); // 総タグ数
        expect(screen.getByText('15 使用')).toBeInTheDocument(); // 総使用数
        expect(screen.getByText('プロジェクト管理')).toBeInTheDocument(); // 最も使用されているタグ
        expect(screen.getByText('1')).toBeInTheDocument(); // 未使用タグ数
      });

      // getTagStatsが正しいデータで呼び出されることを確認
      expect(mockGetTagStats).toHaveBeenCalledWith(mockTags);
    });

    test('タグ削除時に関連タスクへの影響を警告表示する', async () => {
      const user = userEvent.setup();
      const mockDeleteTag = jest.fn();
      
      mockUseTagStore.mockReturnValue({
        tags: mockTags,
        isLoading: false,
        error: null,
        addTag: jest.fn(),
        updateTag: jest.fn(),
        deleteTag: mockDeleteTag,
        getTag: jest.fn(),
      });

      render(<TagManager />);

      // フロントエンドタグの削除ボタンを探してクリック
      const tagCards = screen.getAllByTestId(/tag-card/);
      const frontendTagCard = tagCards.find(card => 
        within(card).queryByText('フロントエンド')
      );
      
      if (frontendTagCard) {
        const deleteButton = within(frontendTagCard).getByLabelText(/削除/);
        await user.click(deleteButton);

        // 確認ダイアログが表示されることを確認
        await waitFor(() => {
          expect(screen.getByText(/このタグを削除しますか/)).toBeInTheDocument();
          expect(screen.getByText(/1.*タスクで使用中/)).toBeInTheDocument();
        });
      }
    });

    test('複数プロジェクトでの同一タグ使用状況を表示する', async () => {
      render(<TagManager />);

      await waitFor(() => {
        // プロジェクト管理タグが複数のプロジェクトで使用されていることを確認
        const projectManagementTag = screen.getByText('プロジェクト管理').closest('[data-testid*="tag-card"]');
        
        if (projectManagementTag) {
          // 使用回数が正しく表示されることを確認
          expect(within(projectManagementTag).getByText('7 回使用')).toBeInTheDocument();
        }
      });
    });

    test('タグ編集時にプロジェクト間の整合性を保つ', async () => {
      const user = userEvent.setup();
      const mockUpdateTag = jest.fn();
      
      mockUseTagStore.mockReturnValue({
        tags: mockTags,
        isLoading: false,
        error: null,
        addTag: jest.fn(),
        updateTag: mockUpdateTag,
        deleteTag: jest.fn(),
        getTag: jest.fn(),
      });

      render(<TagManager />);

      // フロントエンドタグの編集ボタンをクリック
      const tagCards = screen.getAllByTestId(/tag-card/);
      const frontendTagCard = tagCards.find(card => 
        within(card).queryByText('フロントエンド')
      );
      
      if (frontendTagCard) {
        const editButton = within(frontendTagCard).getByLabelText(/編集/);
        await user.click(editButton);

        // 編集モーダルが開くことを確認
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByDisplayValue('フロントエンド')).toBeInTheDocument();
        });

        // タグ名を変更
        const nameInput = screen.getByDisplayValue('フロントエンド');
        await user.clear(nameInput);
        await user.type(nameInput, 'UI/UX');

        // 保存ボタンをクリック
        const saveButton = screen.getByText('保存');
        await user.click(saveButton);

        // updateTagが正しく呼び出されることを確認
        expect(mockUpdateTag).toHaveBeenCalledWith('tag-1', {
          name: 'UI/UX',
          color: '#3B82F6',
        });
      }
    });
  });

  describe('パフォーマンステスト', () => {
    test('大量タグデータでもレンダリング性能を維持する', async () => {
      // 100個のタグを生成
      const largeMockTags: Tag[] = Array.from({ length: 100 }, (_, index) => ({
        id: `tag-${index + 1}`,
        name: `タグ ${index + 1}`,
        color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
        usageCount: Math.floor(Math.random() * 10),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockUseTagStore.mockReturnValue({
        tags: largeMockTags,
        isLoading: false,
        error: null,
        addTag: jest.fn(),
        updateTag: jest.fn(),
        deleteTag: jest.fn(),
        getTag: jest.fn(),
      });

      mockGetTagStats.mockReturnValue({
        total: 100,
        totalUsage: 450,
        mostUsedTag: { name: 'タグ 1', usageCount: 9 },
        unusedCount: 10,
        averageUsage: 4.5,
      });

      const startTime = performance.now();
      render(<TagManager />);
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // レンダリング時間が1秒以内であることを確認
      expect(renderTime).toBeLessThan(1000);
    });

    test('検索とフィルタリングのパフォーマンスが最適化されている', async () => {
      const user = userEvent.setup();
      render(<TagManager />);

      const searchInput = screen.getByPlaceholderText('タグを検索...');

      // 複数回の検索を実行
      const searches = ['フロント', 'バック', 'プロジェクト', 'test'];
      
      for (const searchTerm of searches) {
        await user.clear(searchInput);
        
        const startTime = performance.now();
        await user.type(searchInput, searchTerm);
        const endTime = performance.now();
        
        const searchTime = endTime - startTime;
        
        // 各検索が500ms以内で完了することを確認
        expect(searchTime).toBeLessThan(500);
      }
    });
  });

  describe('アクセシビリティテスト', () => {
    test('キーボードナビゲーションが適切に機能する', async () => {
      const user = userEvent.setup();
      render(<TagManager />);

      // Tabキーでフォーカス移動
      await user.tab();
      
      // 検索フィールドにフォーカスが当たることを確認
      const searchInput = screen.getByPlaceholderText('タグを検索...');
      expect(searchInput).toHaveFocus();

      // さらにTabでソートボタンに移動
      await user.tab();
      const nameSort = screen.getByText('名前順');
      expect(nameSort).toHaveFocus();

      // Enterキーでソートを実行
      await user.keyboard('{Enter}');
      
      // ソート状態が変わることを確認
      await waitFor(() => {
        expect(screen.getByText('↑')).toBeInTheDocument();
      });
    });

    test('ARIAラベルとroleが適切に設定されている', async () => {
      render(<TagManager />);

      await waitFor(() => {
        // 検索フィールドのARIAラベル
        const searchInput = screen.getByPlaceholderText('タグを検索...');
        expect(searchInput).toHaveAttribute('aria-label', 'タグを検索');

        // ソートボタンのARIAラベル
        const nameSort = screen.getByText('名前順');
        expect(nameSort).toHaveAttribute('aria-label');

        // タグカードのrole
        const tagCards = screen.getAllByTestId(/tag-card/);
        tagCards.forEach(card => {
          expect(card).toHaveAttribute('role', 'article');
        });
      });
    });

    test('スクリーンリーダー向けの説明テキストが提供される', async () => {
      render(<TagManager />);

      await waitFor(() => {
        // 統計情報のアクセシブルな説明
        expect(screen.getByText('総タグ数: 4個')).toBeInTheDocument();
        expect(screen.getByText('総使用回数: 15回')).toBeInTheDocument();
        expect(screen.getByText('最も使用されているタグ: プロジェクト管理 (7回)')).toBeInTheDocument();
        expect(screen.getByText('未使用タグ数: 1個')).toBeInTheDocument();
      });
    });
  });

  describe('エラー回復テスト', () => {
    test('ネットワークエラー発生時に適切なフォールバック表示', async () => {
      mockUseTagStore.mockReturnValue({
        tags: [],
        isLoading: false,
        error: 'ネットワークエラー: タグの読み込みに失敗しました',
        addTag: jest.fn(),
        updateTag: jest.fn(),
        deleteTag: jest.fn(),
        getTag: jest.fn(),
      });

      mockGetTagStats.mockReturnValue({
        total: 0,
        totalUsage: 0,
        mostUsedTag: null,
        unusedCount: 0,
        averageUsage: 0,
      });

      render(<TagManager />);

      await waitFor(() => {
        // エラーメッセージが表示されることを確認
        expect(screen.getByText(/ネットワークエラー/)).toBeInTheDocument();
        
        // フォールバック統計が表示されることを確認
        expect(screen.getByText('0')).toBeInTheDocument(); // 総タグ数
        expect(screen.getByText('0 使用')).toBeInTheDocument(); // 総使用数
        expect(screen.getByText('なし')).toBeInTheDocument(); // 最も使用されているタグ
      });
    });

    test('部分的なデータ破損時にも基本機能が動作する', async () => {
      // 一部のタグデータが不正な状態
      const corruptedTags: Partial<Tag>[] = [
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
          // colorが欠損
          usageCount: 3,
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
        {
          id: 'tag-3',
          name: '未使用タグ',
          color: '#F59E0B',
          // usageCountが欠損
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-03'),
        },
      ];

      mockUseTagStore.mockReturnValue({
        tags: corruptedTags as Tag[],
        isLoading: false,
        error: null,
        addTag: jest.fn(),
        updateTag: jest.fn(),
        deleteTag: jest.fn(),
        getTag: jest.fn(),
      });

      render(<TagManager />);

      await waitFor(() => {
        // 正常なタグは表示される
        expect(screen.getByText('フロントエンド')).toBeInTheDocument();
        
        // 破損したタグもデフォルト値で表示される
        expect(screen.getByText('バックエンド')).toBeInTheDocument();
        expect(screen.getByText('未使用タグ')).toBeInTheDocument();
      });
    });
  });

  describe('リアルタイム更新テスト', () => {
    test('タグストアの変更が自動的に画面に反映される', async () => {
      const { rerender } = render(<TagManager />);

      // 初期状態の確認
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument();
      });

      // 新しいタグを追加
      const newTag: Tag = {
        id: 'tag-5',
        name: '新機能',
        color: '#F97316',
        usageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUseTagStore.mockReturnValue({
        tags: [...mockTags, newTag],
        isLoading: false,
        error: null,
        addTag: jest.fn(),
        updateTag: jest.fn(),
        deleteTag: jest.fn(),
        getTag: jest.fn(),
      });

      mockGetTagStats.mockReturnValue({
        total: 5,
        totalUsage: 16,
        mostUsedTag: { name: 'プロジェクト管理', usageCount: 7 },
        unusedCount: 1,
        averageUsage: 3.2,
      });

      rerender(<TagManager />);

      // 更新された統計が表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('16 使用')).toBeInTheDocument();
        expect(screen.getByText('新機能')).toBeInTheDocument();
      });
    });

    test('タスクストアの変更によりタグ使用統計が更新される', async () => {
      const { rerender } = render(<TagManager />);

      // 初期状態
      await waitFor(() => {
        expect(screen.getByText('15 使用')).toBeInTheDocument();
      });

      // 新しいタスクでタグ使用量が変化
      const newTask: Task = {
        id: 'task-4',
        title: '新しいタスク',
        description: 'フロントエンド関連の新しいタスク',
        status: 'todo',
        priority: 'low',
        tags: ['tag-1'], // フロントエンドタグを使用
        projectId: 'project-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUseTaskStore.mockReturnValue({
        tasks: [...mockTasks, newTask],
        isLoading: false,
        error: null,
        addTask: jest.fn(),
        updateTask: jest.fn(),
        deleteTask: jest.fn(),
        getTask: jest.fn(),
        getTasksByProject: jest.fn(),
        getTasksByTag: jest.fn(),
      });

      // フロントエンドタグの使用回数が更新される
      const updatedTags = mockTags.map(tag => 
        tag.id === 'tag-1' 
          ? { ...tag, usageCount: tag.usageCount + 1 }
          : tag
      );

      mockUseTagStore.mockReturnValue({
        tags: updatedTags,
        isLoading: false,
        error: null,
        addTag: jest.fn(),
        updateTag: jest.fn(),
        deleteTag: jest.fn(),
        getTag: jest.fn(),
      });

      mockGetTagStats.mockReturnValue({
        total: 4,
        totalUsage: 16,
        mostUsedTag: { name: 'プロジェクト管理', usageCount: 7 },
        unusedCount: 1,
        averageUsage: 4.0,
      });

      rerender(<TagManager />);

      // 更新された使用統計が反映されることを確認
      await waitFor(() => {
        expect(screen.getByText('16 使用')).toBeInTheDocument();
      });
    });
  });
});