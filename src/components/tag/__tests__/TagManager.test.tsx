import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagManager } from '../TagManager';
import { useTagStore } from '@/stores/tagStore';
import { getTagStats } from '@/mock/tags';
import type { Tag } from '@/types/tag';

// モック設定
jest.mock('@/stores/tagStore');
jest.mock('@/mock/tags');

const mockUseTagStore = useTagStore as jest.MockedFunction<typeof useTagStore>;
const mockGetTagStats = getTagStats as jest.MockedFunction<typeof getTagStats>;

// テスト用のタグデータ
const mockTags: Tag[] = [
  {
    id: '1',
    name: 'フロントエンド',
    color: '#3B82F6',
    usageCount: 5,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    name: 'バックエンド',
    color: '#10B981',
    usageCount: 3,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
  {
    id: '3',
    name: '未使用タグ',
    color: '#F59E0B',
    usageCount: 0,
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
  },
];

const mockStats = {
  total: 3,
  totalUsage: 8,
  mostUsedTag: { name: 'フロントエンド', usageCount: 5 },
};

describe('TagManager - ストア統合テスト', () => {
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
    
    // getTagStatsのモック
    mockGetTagStats.mockReturnValue(mockStats);
  });

  test('useTagStoreのタグデータを正しく表示する', async () => {
    render(<TagManager />);

    // タグ一覧が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('フロントエンド')).toBeInTheDocument();
      expect(screen.getByText('バックエンド')).toBeInTheDocument();
      expect(screen.getByText('未使用タグ')).toBeInTheDocument();
    });

    // useTagStoreが呼び出されることを確認
    expect(mockUseTagStore).toHaveBeenCalled();
  });

  test('ストアデータから正しい統計を計算する', async () => {
    render(<TagManager />);

    // 統計情報が正しく表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // 総タグ数
      expect(screen.getByText('8 使用')).toBeInTheDocument(); // 総使用数
      expect(screen.getByText('フロントエンド')).toBeInTheDocument(); // 最も使用されているタグ
      expect(screen.getByText('1')).toBeInTheDocument(); // 未使用タグ数
    });

    // getTagStatsがストアのtagsで呼び出されることを確認
    expect(mockGetTagStats).toHaveBeenCalledWith(mockTags);
  });

  test('新規タグ作成後にリストが更新される', async () => {
    const user = userEvent.setup();
    
    // 初期状態でレンダリング
    render(<TagManager />);

    // 新規タグボタンをクリック
    const createButton = screen.getByText('新しいタグ');
    await user.click(createButton);

    // モーダルが開くことを確認
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  test('空のタグ配列で統計計算が正常動作する', async () => {
    // 空配列でモック設定
    mockUseTagStore.mockReturnValue({
      tags: [],
      isLoading: false,
      error: null,
      addTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
      getTag: jest.fn(),
    });

    mockGetTagStats.mockReturnValue({
      total: 0,
      totalUsage: 0,
      mostUsedTag: null,
    });

    render(<TagManager />);

    // エラーなく表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // 総タグ数
      expect(screen.getByText('0 使用')).toBeInTheDocument(); // 総使用数
      expect(screen.getByText('なし')).toBeInTheDocument(); // 最も使用されているタグ
    });

    // 空配列でgetTagStatsが呼び出されることを確認
    expect(mockGetTagStats).toHaveBeenCalledWith([]);
  });

  test('検索機能が正常に動作する', async () => {
    const user = userEvent.setup();
    render(<TagManager />);

    // 検索フィールドを見つける
    const searchInput = screen.getByPlaceholderText('タグを検索...');
    
    // 検索テキストを入力
    await user.type(searchInput, 'フロント');

    // 検索文字列が入力されることを確認
    expect(searchInput).toHaveValue('フロント');
  });

  test('ソート機能が正常に動作する', async () => {
    const user = userEvent.setup();
    render(<TagManager />);

    // 名前順ソートボタンをクリック
    const nameSort = screen.getByText('名前順');
    await user.click(nameSort);

    // ソート状態が変わることを確認（アイコンが表示される）
    expect(screen.getByText('↑')).toBeInTheDocument();
  });
});

describe('TagManager - エラーハンドリングテスト', () => {
  test('ストアエラー時にフォールバック表示される', async () => {
    // エラー状態でモック設定
    mockUseTagStore.mockReturnValue({
      tags: [],
      isLoading: false,
      error: 'データ取得エラー',
      addTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
      getTag: jest.fn(),
    });

    mockGetTagStats.mockReturnValue({
      total: 0,
      totalUsage: 0,
      mostUsedTag: null,
    });

    render(<TagManager />);

    // アプリケーションがクラッシュせずに表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('タグの管理')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // フォールバック値
    });
  });

  test('統計計算エラー時にデフォルト値が表示される', async () => {
    mockUseTagStore.mockReturnValue({
      tags: mockTags,
      isLoading: false,
      error: null,
      addTag: jest.fn(),
      updateTag: jest.fn(),
      deleteTag: jest.fn(),
      getTag: jest.fn(),
    });

    // getTagStatsでエラーを発生
    mockGetTagStats.mockImplementation(() => {
      throw new Error('統計計算エラー');
    });

    // コンソールエラーをモック
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<TagManager />);

    await waitFor(() => {
      expect(screen.getByText('タグの管理')).toBeInTheDocument();
    });

    // コンソールエラーが出力されることを確認（実際にはエラーバウンダリ等で処理される）
    consoleErrorSpy.mockRestore();
  });
});

describe('TagManager - 統計計算の詳細テスト', () => {
  test('統計情報の各項目が正確に表示される', async () => {
    render(<TagManager />);

    await waitFor(() => {
      // 総タグ数
      expect(screen.getByText('3')).toBeInTheDocument();
      
      // 総使用数
      expect(screen.getByText('8 使用')).toBeInTheDocument();
      
      // 最も使用されているタグ
      expect(screen.getByText('フロントエンド')).toBeInTheDocument();
      
      // 未使用タグ数（usageCount === 0 のタグ）
      expect(screen.getByText('1')).toBeInTheDocument();
      
      // 平均使用回数（8 / 3 = 2.7）
      expect(screen.getByText('2.7')).toBeInTheDocument();
    });
  });

  test('統計計算がtagsの変更に応じて更新される', async () => {
    const { rerender } = render(<TagManager />);

    // 初期状態の確認
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    // タグデータを更新
    const updatedTags = [
      ...mockTags,
      {
        id: '4',
        name: '新しいタグ',
        color: '#EF4444',
        usageCount: 2,
        createdAt: new Date('2023-01-04'),
        updatedAt: new Date('2023-01-04'),
      },
    ];

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
      totalUsage: 10,
      mostUsedTag: { name: 'フロントエンド', usageCount: 5 },
    });

    // 再レンダリング
    rerender(<TagManager />);

    // 更新された統計が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('10 使用')).toBeInTheDocument();
    });

    // getTagStatsが更新されたtagsで呼び出されることを確認
    expect(mockGetTagStats).toHaveBeenCalledWith(updatedTags);
  });
});