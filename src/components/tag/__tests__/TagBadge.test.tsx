/**
 * TagBadgeコンポーネントのユニットテスト
 * グループ10: テストとドキュメント - ユニットテスト
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TagBadge } from '../TagBadge';
import { Tag } from '../../../types/tag';

// モックタグデータ
const mockTag: Tag = {
  id: 'tag-1',
  name: 'テストタグ',
  color: '#3B82F6',
  usageCount: 5,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01')
};

describe('TagBadge', () => {
  it('タグ名が正しく表示される', () => {
    render(<TagBadge tag={mockTag} />);
    
    expect(screen.getByText('#テストタグ')).toBeInTheDocument();
  });

  it('指定された色が背景色として適用される', () => {
    render(<TagBadge tag={mockTag} />);
    
    const badge = screen.getByText('#テストタグ');
    expect(badge).toHaveStyle({ backgroundColor: '#3B82F6' });
  });

  it('サイズバリエーションが正しく適用される', () => {
    const { rerender } = render(<TagBadge tag={mockTag} size="sm" />);
    
    let badge = screen.getByText('#テストタグ');
    expect(badge).toHaveClass('text-xs', 'px-2', 'py-1');

    rerender(<TagBadge tag={mockTag} size="lg" />);
    badge = screen.getByText('#テストタグ');
    expect(badge).toHaveClass('text-base', 'px-4', 'py-2');
  });

  it('削除ボタンが表示され、クリック時にonRemoveが呼ばれる', () => {
    const onRemove = vi.fn();
    render(<TagBadge tag={mockTag} showRemove onRemove={onRemove} />);
    
    const removeButton = screen.getByRole('button', { name: `タグ ${mockTag.name} を削除` });
    expect(removeButton).toBeInTheDocument();
    
    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalled();
  });

  it('背景色の明度に応じてテキスト色が自動調整される', () => {
    const darkTag = { ...mockTag, color: '#1F2937' }; // 暗い色
    const { rerender } = render(<TagBadge tag={darkTag} />);
    
    let badge = screen.getByText('#テストタグ');
    expect(badge).toHaveStyle({ color: '#FFFFFF' }); // 白テキスト

    const lightTag = { ...mockTag, color: '#F3F4F6' }; // 明るい色
    rerender(<TagBadge tag={lightTag} />);
    badge = screen.getByText('#テストタグ');
    expect(badge).toHaveStyle({ color: '#000000' }); // 黒テキスト
  });

  it('アクセシビリティ属性が適切に設定される', () => {
    render(<TagBadge tag={mockTag} />);
    
    const badge = screen.getByText('#テストタグ');
    expect(badge).toHaveAttribute('aria-label', 'タグ テストタグ, 5回使用');
    expect(badge).toHaveAttribute('title', 'タグ: テストタグ (5回使用)');
  });

  it('クリック可能な場合にhover時のエフェクトが適用される', () => {
    const onClick = vi.fn();
    render(<TagBadge tag={mockTag} onClick={onClick} />);
    
    const badge = screen.getByText('#テストタグ');
    expect(badge).toHaveClass('transition-all', 'duration-200', 'hover:scale-105', 'hover:shadow-md');
    expect(badge).toHaveAttribute('role', 'button');
    expect(badge).toHaveAttribute('tabIndex', '0');
  });
});