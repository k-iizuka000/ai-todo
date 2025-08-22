/**
 * TagListコンポーネントのユニットテスト
 * グループ10: テストとドキュメント - ユニットテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagList } from '../TagList';
import { Tag } from '../../../types/tag';

// モックタグデータ
const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: '重要',
    color: '#EF4444',
    usageCount: 10,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01')
  },
  {
    id: 'tag-2',
    name: '緊急',
    color: '#F59E0B',
    usageCount: 5,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02')
  },
  {
    id: 'tag-3',
    name: '作業中',
    color: '#10B981',
    usageCount: 15,
    createdAt: new Date('2025-01-03'),
    updatedAt: new Date('2025-01-03')
  }
];

// TagItemコンポーネントのモック
jest.mock('../TagItem', () => ({
  TagItem: ({ tag, onClick, onEdit, onDelete, isSelected }: any) => (
    <div data-testid={`tag-item-${tag.id}`}>
      <span>{tag.name}</span>
      <span>使用回数: {tag.usageCount}</span>
      {onClick && <button onClick={() => onClick(tag)}>クリック</button>}
      {onEdit && <button onClick={() => onEdit(tag)}>編集</button>}
      {onDelete && <button onClick={() => onDelete(tag)}>削除</button>}
      {isSelected && <span>選択中</span>}
    </div>
  )
}));

// useDebounceフックのモック
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string, delay: number) => value
}));

describe('TagList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('タグ一覧が正しく表示される', () => {
    render(<TagList tags={mockTags} />);
    
    expect(screen.getByTestId('tag-item-tag-1')).toBeInTheDocument();
    expect(screen.getByTestId('tag-item-tag-2')).toBeInTheDocument();
    expect(screen.getByTestId('tag-item-tag-3')).toBeInTheDocument();
    
    expect(screen.getByText('重要')).toBeInTheDocument();
    expect(screen.getByText('緊急')).toBeInTheDocument();
    expect(screen.getByText('作業中')).toBeInTheDocument();
  });

  it('空の状態が正しく表示される', () => {
    render(<TagList tags={[]} />);
    
    expect(screen.getByText('タグがありません')).toBeInTheDocument();
  });

  it('カスタム空メッセージが表示される', () => {
    render(<TagList tags={[]} emptyMessage="カスタムメッセージ" />);
    
    expect(screen.getByText('カスタムメッセージ')).toBeInTheDocument();
  });

  it('検索機能が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<TagList tags={mockTags} />);
    
    const searchInput = screen.getByPlaceholderText('タグを検索...');
    await user.type(searchInput, '重要');
    
    // デバウンス処理があるので一瞬待つ
    await waitFor(() => {
      expect(screen.getByTestId('tag-item-tag-1')).toBeInTheDocument();
      expect(screen.queryByTestId('tag-item-tag-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tag-item-tag-3')).not.toBeInTheDocument();
    });
  });

  it('検索結果が見つからない場合のメッセージが表示される', async () => {
    const user = userEvent.setup();
    render(<TagList tags={mockTags} />);
    
    const searchInput = screen.getByPlaceholderText('タグを検索...');
    await user.type(searchInput, '存在しないタグ');
    
    await waitFor(() => {
      expect(screen.getByText('「存在しないタグ」に一致するタグが見つかりませんでした')).toBeInTheDocument();
    });
  });

  it('名前でソートが正しく動作する', async () => {
    const user = userEvent.setup();
    render(<TagList tags={mockTags} />);
    
    const nameSort = screen.getByText('名前');
    await user.click(nameSort);
    
    // ソートボタンがアクティブになることを確認
    expect(nameSort).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('使用回数でソートが正しく動作する', async () => {
    const user = userEvent.setup();
    render(<TagList tags={mockTags} />);
    
    const usageCountSort = screen.getByText('使用回数');
    await user.click(usageCountSort);
    
    expect(usageCountSort).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('作成日でソートが正しく動作する', async () => {
    const user = userEvent.setup();
    render(<TagList tags={mockTags} />);
    
    const createdAtSort = screen.getByText('作成日');
    await user.click(createdAtSort);
    
    expect(createdAtSort).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('同じソートボタンを2回押すと昇順→降順に切り替わる', async () => {
    const user = userEvent.setup();
    render(<TagList tags={mockTags} />);
    
    const nameSort = screen.getByText('名前');
    
    // 1回目のクリック（昇順）
    await user.click(nameSort);
    expect(screen.getByText('名前 ↑')).toBeInTheDocument();
    
    // 2回目のクリック（降順）
    await user.click(nameSort);
    expect(screen.getByText('名前 ↓')).toBeInTheDocument();
  });

  it('タグクリック時にonTagClickが呼ばれる', async () => {
    const user = userEvent.setup();
    const onTagClick = jest.fn();
    render(<TagList tags={mockTags} onTagClick={onTagClick} />);
    
    const clickButton = screen.getAllByText('クリック')[0];
    await user.click(clickButton);
    
    expect(onTagClick).toHaveBeenCalledWith(mockTags[0]);
  });

  it('タグ編集時にonTagEditが呼ばれる', async () => {
    const user = userEvent.setup();
    const onTagEdit = jest.fn();
    render(<TagList tags={mockTags} onTagEdit={onTagEdit} />);
    
    const editButton = screen.getAllByText('編集')[0];
    await user.click(editButton);
    
    expect(onTagEdit).toHaveBeenCalledWith(mockTags[0]);
  });

  it('タグ削除時にonTagDeleteが呼ばれる', async () => {
    const user = userEvent.setup();
    const onTagDelete = jest.fn();
    render(<TagList tags={mockTags} onTagDelete={onTagDelete} />);
    
    const deleteButton = screen.getAllByText('削除')[0];
    await user.click(deleteButton);
    
    expect(onTagDelete).toHaveBeenCalledWith(mockTags[0]);
  });

  it('選択されたタグが正しく表示される', () => {
    render(<TagList tags={mockTags} selectedTagIds={['tag-1', 'tag-3']} />);
    
    expect(screen.getAllByText('選択中')).toHaveLength(2);
  });

  it('フィルターが非表示にできる', () => {
    render(<TagList tags={mockTags} showFilter={false} />);
    
    expect(screen.queryByPlaceholderText('タグを検索...')).not.toBeInTheDocument();
    expect(screen.queryByText('並び替え:')).not.toBeInTheDocument();
  });

  it('フィルター変更時にonFilterChangeが呼ばれる', async () => {
    const user = userEvent.setup();
    const onFilterChange = jest.fn();
    render(<TagList tags={mockTags} onFilterChange={onFilterChange} />);
    
    const searchInput = screen.getByPlaceholderText('タグを検索...');
    await user.type(searchInput, '重要');
    
    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({
        search: '重要'
      });
    });
  });

  it('結果数が正しく表示される', () => {
    render(<TagList tags={mockTags} />);
    
    expect(screen.getByText('3 / 3 件のタグを表示')).toBeInTheDocument();
  });
});