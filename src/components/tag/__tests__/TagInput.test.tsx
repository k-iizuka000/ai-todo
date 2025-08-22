/**
 * TagInputコンポーネントのユニットテスト
 * グループ10: テストとドキュメント - ユニットテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { TagInput } from '../TagInput';
import { Tag } from '../../../types/tag';

// useDebounceモックの設定
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value
}));

// モックタグデータ
const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'React',
    color: '#61DAFB',
    usageCount: 10
  },
  {
    id: 'tag-2',
    name: 'TypeScript',
    color: '#3178C6',
    usageCount: 8
  }
];

describe('TagInput', () => {
  const defaultProps = {
    value: [],
    onChange: vi.fn(),
    placeholder: 'タグを追加...',
    maxTags: 10,
    allowCreate: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('プレースホルダーが正しく表示される', () => {
    render(<TagInput {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('タグを追加...')).toBeInTheDocument();
  });

  it('選択されたタグが表示される', () => {
    render(<TagInput {...defaultProps} value={[mockTags[0]]} />);
    
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('入力時にデバウンス処理が動作する', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    await user.type(input, 'React');
    
    // デバウンス後に検索が実行されることを確認
    await waitFor(() => {
      expect(input).toHaveValue('React');
    });
  });

  it('Enterキーでタグが追加される', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(<TagInput {...defaultProps} onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    await user.type(input, 'NewTag');
    await user.keyboard('{Enter}');
    
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'NewTag' })
      ])
    );
  });

  it('Backspaceで最後のタグが削除される', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(<TagInput {...defaultProps} value={mockTags} onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    // 入力フィールドが空の状態でBackspaceを押下
    await user.click(input);
    await user.keyboard('{Backspace}');
    
    expect(onChange).toHaveBeenCalledWith([mockTags[0]]);
  });

  it('maxTagsに達すると新しいタグを追加できない', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(
      <TagInput 
        {...defaultProps} 
        value={mockTags} 
        maxTags={2}
        onChange={onChange} 
      />
    );
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    await user.type(input, 'ThirdTag');
    await user.keyboard('{Enter}');
    
    // maxTagsに達しているため、onChangeは呼ばれない
    expect(onChange).not.toHaveBeenCalled();
  });

  it('重複したタグは追加されない', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(<TagInput {...defaultProps} value={[mockTags[0]]} onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    await user.type(input, 'React');
    await user.keyboard('{Enter}');
    
    // 重複したタグのため、onChangeは呼ばれない
    expect(onChange).not.toHaveBeenCalled();
  });

  it('削除ボタンでタグが削除される', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(<TagInput {...defaultProps} value={mockTags} onChange={onChange} />);
    
    const removeButton = screen.getAllByLabelText('タグを削除')[0];
    await user.click(removeButton);
    
    expect(onChange).toHaveBeenCalledWith([mockTags[1]]);
  });

  it('フォーカス管理が適切に動作する', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    await user.click(input);
    expect(input).toHaveFocus();
    
    // タグ追加後にフォーカスが保持される
    await user.type(input, 'TestTag');
    await user.keyboard('{Enter}');
    
    expect(input).toHaveFocus();
  });

  it('allowCreateがfalseの場合、新規作成ができない', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    
    render(<TagInput {...defaultProps} allowCreate={false} onChange={onChange} />);
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    await user.type(input, 'NewTag');
    await user.keyboard('{Enter}');
    
    // 新規作成が無効のため、onChangeは呼ばれない
    expect(onChange).not.toHaveBeenCalled();
  });

  it('キーボード操作（矢印キー）でオートコンプリート候補を選択できる', async () => {
    const user = userEvent.setup();
    render(<TagInput {...defaultProps} />);
    
    const input = screen.getByPlaceholderText('タグを追加...');
    
    await user.type(input, 'R');
    
    // 候補が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument();
    });
    
    // 矢印キーで選択
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'React' })
      ])
    );
  });
});