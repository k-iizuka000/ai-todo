/**
 * TagCreateModalコンポーネントのユニットテスト
 * グループ10: テストとドキュメント - ユニットテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TagCreateModal } from '../TagCreateModal';

// モックストア
const mockTagStore = {
  tags: [
    { id: 'tag-1', name: '既存タグ', color: '#3B82F6' }
  ],
  addTag: vi.fn(),
  isLoading: false,
  error: null
};

vi.mock('../../../stores/tagStore', () => ({
  useTagStore: () => mockTagStore
}));

describe('TagCreateModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('モーダルが開いている時に表示される', () => {
    render(<TagCreateModal {...defaultProps} />);
    
    expect(screen.getByText('新しいタグを作成')).toBeInTheDocument();
    expect(screen.getByLabelText('タグ名')).toBeInTheDocument();
    expect(screen.getByLabelText('色を選択')).toBeInTheDocument();
  });

  it('モーダルが閉じている時は表示されない', () => {
    render(<TagCreateModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('新しいタグを作成')).not.toBeInTheDocument();
  });

  it('タグ名の入力ができる', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const input = screen.getByLabelText('タグ名');
    await user.type(input, 'テストタグ');
    
    expect(input).toHaveValue('テストタグ');
  });

  it('プリセットカラーが選択できる', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const colorButton = screen.getByLabelText('色を選択: #EF4444');
    await user.click(colorButton);
    
    expect(colorButton).toHaveClass('ring-2', 'ring-gray-500');
  });

  it('カスタムカラーが入力できる', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const colorInput = screen.getByLabelText('カスタムカラー');
    await user.clear(colorInput);
    await user.type(colorInput, '#FF5733');
    
    expect(colorInput).toHaveValue('#FF5733');
  });

  it('無効なカラーコードでエラーが表示される', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const colorInput = screen.getByLabelText('カスタムカラー');
    await user.clear(colorInput);
    await user.type(colorInput, 'invalid-color');
    
    await waitFor(() => {
      expect(screen.getByText('有効なカラーコードを入力してください')).toBeInTheDocument();
    });
  });

  it('重複したタグ名でエラーが表示される', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const input = screen.getByLabelText('タグ名');
    await user.type(input, '既存タグ');
    
    await waitFor(() => {
      expect(screen.getByText('このタグ名は既に使用されています')).toBeInTheDocument();
    });
  });

  it('文字数制限のバリデーション', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const input = screen.getByLabelText('タグ名');
    const longText = 'a'.repeat(31); // 30文字を超える
    
    await user.type(input, longText);
    
    await waitFor(() => {
      expect(screen.getByText('タグ名は30文字以内で入力してください')).toBeInTheDocument();
    });
  });

  it('有効な入力でタグが作成される', async () => {
    const user = userEvent.setup();
    mockTagStore.addTag.mockResolvedValue(undefined);
    
    render(<TagCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('タグ名');
    await user.type(nameInput, '新しいタグ');
    
    const colorButton = screen.getByLabelText('色を選択: #3B82F6');
    await user.click(colorButton);
    
    const createButton = screen.getByText('作成');
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockTagStore.addTag).toHaveBeenCalledWith({
        name: '新しいタグ',
        color: '#3B82F6'
      });
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('キャンセルボタンでモーダルが閉じる', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const cancelButton = screen.getByText('キャンセル');
    await user.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('Escキーでモーダルが閉じる', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    await user.keyboard('{Escape}');
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('プレビュー表示が正しく動作する', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const nameInput = screen.getByLabelText('タグ名');
    await user.type(nameInput, 'プレビュータグ');
    
    const colorButton = screen.getByLabelText('色を選択: #10B981');
    await user.click(colorButton);
    
    const preview = screen.getByText('プレビュー:');
    expect(preview.nextElementSibling).toHaveTextContent('プレビュータグ');
    expect(preview.nextElementSibling).toHaveStyle({ backgroundColor: '#10B981' });
  });

  it('ローディング状態が表示される', () => {
    mockTagStore.isLoading = true;
    render(<TagCreateModal {...defaultProps} />);
    
    const createButton = screen.getByText('作成中...');
    expect(createButton).toBeDisabled();
  });

  it('エラー状態が表示される', () => {
    mockTagStore.error = 'サーバーエラーが発生しました';
    render(<TagCreateModal {...defaultProps} />);
    
    expect(screen.getByText('サーバーエラーが発生しました')).toBeInTheDocument();
  });

  it('必須フィールドの検証', async () => {
    const user = userEvent.setup();
    render(<TagCreateModal {...defaultProps} />);
    
    const createButton = screen.getByText('作成');
    await user.click(createButton);
    
    expect(screen.getByText('タグ名を入力してください')).toBeInTheDocument();
    expect(createButton).toBeDisabled();
  });

  // Issue 040対応: API統合に関するテストケース
  describe('Issue 040: API統合対応', () => {
    it('タグ作成成功時にAPIから返されたIDでonSuccessが呼ばれる', async () => {
      const user = userEvent.setup();
      const mockNewTag = {
        id: 'api-generated-id-123',
        name: '新しいタグ',
        color: '#3B82F6'
      };
      
      mockTagStore.addTag.mockResolvedValue(mockNewTag);
      
      render(<TagCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('タグ名');
      await user.type(nameInput, '新しいタグ');
      
      const createButton = screen.getByText('作成');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('api-generated-id-123');
      });
    });

    it('addTagがundefinedを返す場合もエラーにならない', async () => {
      const user = userEvent.setup();
      mockTagStore.addTag.mockResolvedValue(undefined);
      
      render(<TagCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('タグ名');
      await user.type(nameInput, 'テストタグ');
      
      const createButton = screen.getByText('作成');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalledWith('unknown');
      });
    });

    it('API統合対応でエラーハンドリングが改善される', async () => {
      const user = userEvent.setup();
      const mockApiError = {
        code: 'HTTP_409',
        message: 'タグ名が既に存在します',
        status: 409
      };
      
      mockTagStore.addTag.mockRejectedValue(mockApiError);
      
      render(<TagCreateModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('タグ名');
      await user.type(nameInput, '重複タグ');
      
      const createButton = screen.getByText('作成');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(mockTagStore.addTag).toHaveBeenCalledWith({
          name: '重複タグ',
          color: '#3B82F6'
        });
      });
    });
  });
});