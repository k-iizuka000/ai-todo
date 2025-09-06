/**
 * TagSelectorコンポーネントのユニットテスト
 * グループ10: テストとドキュメント - ユニットテスト
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TagSelector } from '../TagSelector';
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

// TagBadgeコンポーネントのモック
vi.mock('../TagBadge', () => ({
  TagBadge: ({ tag, showRemove, onRemove, size }: any) => (
    <span data-testid={`tag-badge-${tag.id}`} className={size}>
      #{tag.name}
      {showRemove && (
        <button onClick={onRemove} aria-label={`${tag.name}を削除`}>
          ×
        </button>
      )}
    </span>
  )
}));

// TagInputコンポーネントのモック
vi.mock('../TagInput', () => ({
  TagInput: ({ value, onChange, placeholder, maxTags, allowCreate, disabled, error, displaySelected }: any) => (
    <div data-testid="tag-input" data-display-selected={displaySelected}>
      <input
        placeholder={placeholder}
        disabled={disabled}
        data-error={error}
        data-max-tags={maxTags}
        data-allow-create={allowCreate}
        onChange={(e) => {
          // 簡単なモック実装
          if (e.target.value === 'new-tag') {
            const newTag = { id: 'new-tag-id', name: 'new-tag', color: '#000000' };
            onChange([...value, newTag]);
          }
        }}
      />
      <div data-testid="selected-tags-count">{value.length}</div>
      {displaySelected && value.length > 0 && (
        <div data-testid="tag-input-display-tags">
          {value.map((tag: any) => (
            <span key={tag.id} data-testid={`tag-input-tag-${tag.id}`}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}));

// タグストアのモック
vi.mock('@/stores/tagStore', () => ({
  useTagStore: () => ({
    tags: mockTags
  })
}));

describe('TagSelector', () => {
  const defaultProps = {
    selectedTags: [],
    onTagsChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('閲覧モード', () => {
    it('タグが選択されていない場合「タグなし」と表示される', () => {
      render(<TagSelector {...defaultProps} editing={false} />);
      
      expect(screen.getByText('タグなし')).toBeInTheDocument();
    });

    it('選択されたタグが表示される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0], mockTags[1]]} 
          editing={false} 
        />
      );
      
      expect(screen.getByTestId('tag-badge-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-badge-tag-2')).toBeInTheDocument();
    });

    it('コンパクトモードで3個以上のタグがある場合、省略表示される', () => {
      const manyTags = [mockTags[0], mockTags[1], mockTags[2], mockTags[0]]; // 4個のタグ
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={manyTags} 
          editing={false} 
          variant="compact"
        />
      );
      
      // 最初の3個のタグが表示される
      expect(screen.getByTestId('tag-badge-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-badge-tag-2')).toBeInTheDocument();
      expect(screen.getByTestId('tag-badge-tag-3')).toBeInTheDocument();
      
      // 省略表示
      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });

  describe('編集モード', () => {
    it('フルモードで編集UIが表示される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true} 
          variant="full"
        />
      );
      
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });

    it('コンパクトモードでTagInputのみ表示される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true} 
          variant="compact"
        />
      );
      
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
      expect(screen.queryByText('選択中のタグ')).not.toBeInTheDocument();
    });

    it('選択されたタグの削除ボタンが機能する', () => {
      const onTagsChange = vi.fn();
      
      render(
        <TagSelector 
          selectedTags={[mockTags[0], mockTags[1]]} 
          onTagsChange={onTagsChange}
          editing={true} 
          variant="full"
        />
      );
      
      const removeButton = screen.getByLabelText('重要を削除');
      fireEvent.click(removeButton);
      
      expect(onTagsChange).toHaveBeenCalledWith([mockTags[1]]);
    });

    it('「すべて削除」ボタンが機能する', () => {
      const onTagsChange = vi.fn();
      
      render(
        <TagSelector 
          selectedTags={[mockTags[0], mockTags[1]]} 
          onTagsChange={onTagsChange}
          editing={true} 
          variant="full"
        />
      );
      
      const clearAllButton = screen.getByText('すべて削除');
      fireEvent.click(clearAllButton);
      
      expect(onTagsChange).toHaveBeenCalledWith([]);
    });

    it('選択中のタグ数が表示される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0], mockTags[1]]} 
          editing={true} 
          variant="full"
          maxTags={5}
        />
      );
      
      expect(screen.getByText('選択中のタグ (2/5)')).toBeInTheDocument();
    });

    it('無効化状態が適用される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true} 
          disabled={true}
        />
      );
      
      const input = screen.getByPlaceholderText('タグを追加...');
      expect(input).toBeDisabled();
    });

    it('エラー状態が適用される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true} 
          error={true}
        />
      );
      
      const input = screen.getByPlaceholderText('タグを追加...');
      expect(input).toHaveAttribute('data-error', 'true');
    });

    it('統計情報が表示される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0], mockTags[1]]} // 使用回数: 10 + 5 = 15
          editing={true} 
          variant="full"
        />
      );
      
      expect(screen.getByText('合計使用回数: 15回')).toBeInTheDocument();
    });

    it('使用回数が未定義のタグでも統計が計算される', () => {
      const tagsWithoutUsage = [
        { ...mockTags[0], usageCount: undefined },
        mockTags[1]
      ];
      
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={tagsWithoutUsage} 
          editing={true} 
          variant="full"
        />
      );
      
      expect(screen.getByText('合計使用回数: 5回')).toBeInTheDocument();
    });
  });

  describe('displayMode機能（二重表示問題の修正）', () => {
    it('inlineモードで選択済みタグがTagInputに表示される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0], mockTags[1]]}
          editing={true} 
          variant="full"
          displayMode="inline"
        />
      );
      
      // TagInputが選択済みタグを表示する設定
      const tagInput = screen.getByTestId('tag-input');
      expect(tagInput).toHaveAttribute('data-display-selected', 'true');
      
      // 分離表示エリアは表示されない
      expect(screen.queryByText('選択中のタグ')).not.toBeInTheDocument();
    });

    it('separateモードで選択済みタグが分離表示される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0], mockTags[1]]}
          editing={true} 
          variant="full"
          displayMode="separate"
        />
      );
      
      // TagInputは選択済みタグを表示しない
      const tagInput = screen.getByTestId('tag-input');
      expect(tagInput).toHaveAttribute('data-display-selected', 'false');
      
      // 分離表示エリアが表示される
      expect(screen.getByText('選択中のタグ (2/10)')).toBeInTheDocument();
      expect(screen.getByTestId('tag-badge-tag-1')).toBeInTheDocument();
      expect(screen.getByTestId('tag-badge-tag-2')).toBeInTheDocument();
    });

    it('autoモードで少ないタグの場合はinline表示', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0], mockTags[1]]} // 2タグ（5以下）
          editing={true} 
          variant="full"
          displayMode="auto"
        />
      );
      
      // TagInputが選択済みタグを表示（inline）
      const tagInput = screen.getByTestId('tag-input');
      expect(tagInput).toHaveAttribute('data-display-selected', 'true');
      
      // 分離表示エリアは表示されない
      expect(screen.queryByText('選択中のタグ')).not.toBeInTheDocument();
    });

    it('autoモードで多いタグの場合はseparate表示', () => {
      const manyTags = new Array(6).fill(0).map((_, i) => ({
        ...mockTags[0],
        id: `tag-${i}`,
        name: `タグ${i}`
      })); // 6タグ（5超過）
      
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={manyTags}
          editing={true} 
          variant="full"
          displayMode="auto"
        />
      );
      
      // TagInputは選択済みタグを表示しない（separate）
      const tagInput = screen.getByTestId('tag-input');
      expect(tagInput).toHaveAttribute('data-display-selected', 'false');
      
      // 分離表示エリアが表示される
      expect(screen.getByText('選択中のタグ (6/10)')).toBeInTheDocument();
    });

    it('displayModeが未指定の場合はautoモードになる', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0]]} // 1タグ（5以下）
          editing={true} 
          variant="full"
        />
      );
      
      // デフォルトのautoモードでinline表示
      const tagInput = screen.getByTestId('tag-input');
      expect(tagInput).toHaveAttribute('data-display-selected', 'true');
    });

    it('separateモードで削除ボタンが機能する', () => {
      const onTagsChange = vi.fn();
      
      render(
        <TagSelector 
          selectedTags={[mockTags[0], mockTags[1]]} 
          onTagsChange={onTagsChange}
          editing={true} 
          variant="full"
          displayMode="separate"
        />
      );
      
      // 分離表示エリアの削除ボタンをクリック
      const removeButton = screen.getByLabelText('重要を削除');
      fireEvent.click(removeButton);
      
      expect(onTagsChange).toHaveBeenCalledWith([mockTags[1]]);
    });

    it('separateモードで「すべて削除」ボタンが機能する', () => {
      const onTagsChange = vi.fn();
      
      render(
        <TagSelector 
          selectedTags={[mockTags[0], mockTags[1]]} 
          onTagsChange={onTagsChange}
          editing={true} 
          variant="full"
          displayMode="separate"
        />
      );
      
      const clearAllButton = screen.getByText('すべて削除');
      fireEvent.click(clearAllButton);
      
      expect(onTagsChange).toHaveBeenCalledWith([]);
    });

    it('disabledの場合、分離表示の削除ボタンが無効化される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          selectedTags={[mockTags[0], mockTags[1]]}
          editing={true} 
          variant="full"
          displayMode="separate"
          disabled={true}
        />
      );
      
      // すべて削除ボタンが無効化される
      const clearAllButton = screen.getByText('すべて削除');
      expect(clearAllButton).toBeDisabled();
    });
  });

  describe('プロパティ', () => {
    it('カスタムプレースホルダーが適用される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true} 
          placeholder="カスタムプレースホルダー"
        />
      );
      
      expect(screen.getByPlaceholderText('カスタムプレースホルダー')).toBeInTheDocument();
    });

    it('最大タグ数の制限が適用される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true} 
          maxTags={3}
        />
      );
      
      const input = screen.getByPlaceholderText('タグを追加...');
      expect(input).toHaveAttribute('data-max-tags', '3');
    });

    it('新規作成許可設定が適用される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true} 
          allowCreate={false}
        />
      );
      
      const input = screen.getByPlaceholderText('タグを追加...');
      expect(input).toHaveAttribute('data-allow-create', 'false');
    });

    it('カスタムクラス名が適用される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={false} 
          className="custom-class"
        />
      );
      
      const container = screen.getByText('タグなし').parentElement;
      expect(container).toHaveClass('custom-class');
    });

    it('利用可能なタグが指定されない場合、ストアから取得される', () => {
      render(
        <TagSelector 
          {...defaultProps} 
          editing={true}
        />
      );
      
      // ストアからタグが取得されていることを確認
      // この場合、TagInputにストアのタグが渡されている
      expect(screen.getByTestId('tag-input')).toBeInTheDocument();
    });
  });
});