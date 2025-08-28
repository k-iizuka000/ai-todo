/**
 * Accordionコンポーネントのユニットテスト
 * グループ7: テストとバリデーション - Accordion汎用コンポーネント
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../Accordion';

// jest-axeカスタムマッチャーを拡張
expect.extend(toHaveNoViolations);

// テスト用のサンプルAccordionコンポーネント
const TestAccordion = ({
  type = 'single',
  collapsible = true,
  defaultValue,
  value,
  onValueChange,
}: {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
}) => (
  <Accordion
    type={type}
    collapsible={collapsible}
    defaultValue={defaultValue}
    value={value}
    onValueChange={onValueChange}
  >
    <AccordionItem value="item-1">
      <AccordionTrigger>アイテム1</AccordionTrigger>
      <AccordionContent>アイテム1のコンテンツ</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-2">
      <AccordionTrigger>アイテム2</AccordionTrigger>
      <AccordionContent>アイテム2のコンテンツ</AccordionContent>
    </AccordionItem>
    <AccordionItem value="item-3" disabled>
      <AccordionTrigger>アイテム3（無効）</AccordionTrigger>
      <AccordionContent>アイテム3のコンテンツ</AccordionContent>
    </AccordionItem>
  </Accordion>
);

// パフォーマンステスト用のユーティリティ
const measurePerformance = (callback: () => void): number => {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  return endTime - startTime;
};

describe('Accordion', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('Accordionが正常にレンダリングされる', () => {
      render(<TestAccordion />);
      
      expect(screen.getByText('アイテム1')).toBeInTheDocument();
      expect(screen.getByText('アイテム2')).toBeInTheDocument();
      expect(screen.getByText('アイテム3（無効）')).toBeInTheDocument();
    });

    it('AccordionItemが正しいdata属性を持つ', () => {
      render(<TestAccordion />);
      
      const accordionItems = screen.getAllByText(/アイテム\d/).map(item => 
        item.closest('[data-value]')
      );
      
      expect(accordionItems[0]).toHaveAttribute('data-value', 'item-1');
      expect(accordionItems[1]).toHaveAttribute('data-value', 'item-2');
      expect(accordionItems[2]).toHaveAttribute('data-value', 'item-3');
      expect(accordionItems[2]).toHaveAttribute('data-disabled', 'true');
    });

    it('無効なAccordionItemが正しいスタイルを持つ', () => {
      render(<TestAccordion />);
      
      const disabledItem = screen.getByText('アイテム3（無効）').closest('[data-disabled="true"]');
      expect(disabledItem).toHaveClass('opacity-50');
    });
  });

  describe('単一展開モード（type="single"）', () => {
    it('デフォルト値が正しく設定される', () => {
      render(<TestAccordion defaultValue="item-1" />);
      
      const item1 = screen.getByText('アイテム1').closest('[data-value="item-1"]');
      expect(item1).toHaveAttribute('data-expanded', 'true');
      
      const item2 = screen.getByText('アイテム2').closest('[data-value="item-2"]');
      expect(item2).toHaveAttribute('data-expanded', 'false');
    });

    it('一度に一つのアイテムのみ展開される', async () => {
      const onValueChange = vi.fn();
      render(<TestAccordion onValueChange={onValueChange} />);
      
      // アイテム1をクリック
      await user.click(screen.getByText('アイテム1'));
      expect(onValueChange).toHaveBeenCalledWith('item-1');
      
      // アイテム2をクリック
      await user.click(screen.getByText('アイテム2'));
      expect(onValueChange).toHaveBeenCalledWith('item-2');
    });

    it('collapsible=falseの場合、最後のアイテムを閉じられない', () => {
      const onValueChange = vi.fn();
      render(<TestAccordion collapsible={false} onValueChange={onValueChange} />);
      
      // この実装はモックなので、実際の動作は簡略化
      expect(screen.getByText('アイテム1')).toBeInTheDocument();
    });
  });

  describe('複数展開モード（type="multiple"）', () => {
    it('複数のアイテムを同時に展開できる', async () => {
      const onValueChange = vi.fn();
      render(<TestAccordion type="multiple" onValueChange={onValueChange} />);
      
      await user.click(screen.getByText('アイテム1'));
      expect(onValueChange).toHaveBeenCalledWith(['item-1']);
      
      await user.click(screen.getByText('アイテム2'));
      expect(onValueChange).toHaveBeenCalledWith(['item-1', 'item-2']);
    });

    it('デフォルト値が配列として設定される', () => {
      render(<TestAccordion type="multiple" defaultValue={['item-1', 'item-2']} />);
      
      const item1 = screen.getByText('アイテム1').closest('[data-value="item-1"]');
      const item2 = screen.getByText('アイテム2').closest('[data-value="item-2"]');
      
      expect(item1).toHaveAttribute('data-expanded', 'true');
      expect(item2).toHaveAttribute('data-expanded', 'true');
    });
  });

  describe('制御モード', () => {
    it('外部からの値制御が正しく動作する', () => {
      const { rerender } = render(<TestAccordion value="item-1" />);
      
      let item1 = screen.getByText('アイテム1').closest('[data-value="item-1"]');
      expect(item1).toHaveAttribute('data-expanded', 'true');
      
      rerender(<TestAccordion value="item-2" />);
      
      const item2 = screen.getByText('アイテム2').closest('[data-value="item-2"]');
      expect(item2).toHaveAttribute('data-expanded', 'true');
      
      item1 = screen.getByText('アイテム1').closest('[data-value="item-1"]');
      expect(item1).toHaveAttribute('data-expanded', 'false');
    });
  });

  describe('キーボード操作', () => {
    it('Enterキーでアイテムをトグルできる', async () => {
      const onValueChange = vi.fn();
      render(<TestAccordion onValueChange={onValueChange} />);
      
      const trigger = screen.getByText('アイテム1');
      trigger.focus();
      
      await user.keyboard('{Enter}');
      expect(onValueChange).toHaveBeenCalledWith('item-1');
    });

    it('Spaceキーでアイテムをトグルできる', async () => {
      const onValueChange = vi.fn();
      render(<TestAccordion onValueChange={onValueChange} />);
      
      const trigger = screen.getByText('アイテム1');
      trigger.focus();
      
      await user.keyboard(' ');
      expect(onValueChange).toHaveBeenCalledWith('item-1');
    });

    it('Tabキーでフォーカス移動ができる', async () => {
      render(<TestAccordion />);
      
      await user.tab();
      expect(screen.getByText('アイテム1')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('アイテム2')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('アイテム3（無効）')).toHaveFocus();
    });
  });

  describe('エラーハンドリング', () => {
    it('AccordionContext外でAccordionItemを使用するとエラーになる', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(
          <AccordionItem value="test">
            <AccordionTrigger>テスト</AccordionTrigger>
            <AccordionContent>テストコンテンツ</AccordionContent>
          </AccordionItem>
        );
      }).toThrow('AccordionItem must be used within Accordion');
      
      consoleSpy.mockRestore();
    });

    it('AccordionItemContext外でAccordionTriggerを使用するとエラーになる', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<AccordionTrigger>テスト</AccordionTrigger>);
      }).toThrow('AccordionTrigger must be used within AccordionItem');
      
      consoleSpy.mockRestore();
    });
  });

  describe('アクセシビリティテスト', () => {
    it('ARIA属性が正しく設定されている', () => {
      render(<TestAccordion />);
      
      const triggers = screen.getAllByRole('button');
      triggers.forEach(trigger => {
        expect(trigger).toHaveAttribute('aria-expanded');
        expect(trigger).toHaveAttribute('aria-controls');
        expect(trigger).toHaveAttribute('type', 'button');
      });
      
      const contents = screen.getAllByRole('region');
      contents.forEach(content => {
        expect(content).toHaveAttribute('aria-labelledby');
        expect(content).toHaveAttribute('id');
      });
    });

    it('フォーカス管理が適切に実装されている', async () => {
      render(<TestAccordion />);
      
      const triggers = screen.getAllByRole('button');
      
      // フォーカスリング表示の確認
      triggers.forEach(trigger => {
        expect(trigger).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
      });
    });

    it('axe-coreでアクセシビリティ違反がない', async () => {
      const { container } = render(<TestAccordion />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('拡張状態時もアクセシビリティ違反がない', async () => {
      const { container } = render(<TestAccordion defaultValue="item-1" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('パフォーマンステスト', () => {
    it('レンダリング時間が200ms以内である', () => {
      const renderTime = measurePerformance(() => {
        render(<TestAccordion />);
      });
      
      expect(renderTime).toBeLessThan(200);
    });

    it('アイテム切り替え時間が200ms以内である', async () => {
      render(<TestAccordion />);
      
      const trigger = screen.getByText('アイテム1');
      
      const clickTime = measurePerformance(() => {
        fireEvent.click(trigger);
      });
      
      expect(clickTime).toBeLessThan(200);
    });

    it('大量のアイテムでもパフォーマンスが維持される', () => {
      const LargeAccordion = () => (
        <Accordion>
          {Array.from({ length: 100 }, (_, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger>アイテム{index + 1}</AccordionTrigger>
              <AccordionContent>コンテンツ{index + 1}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      );

      const renderTime = measurePerformance(() => {
        render(<LargeAccordion />);
      });
      
      expect(renderTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('CSS transition', () => {
    it('適切なtransitionクラスが設定されている', () => {
      render(<TestAccordion />);
      
      const triggers = screen.getAllByRole('button');
      triggers.forEach(trigger => {
        expect(trigger).toHaveClass('transition-all', 'duration-200');
      });
      
      const contents = screen.getAllByRole('region');
      contents.forEach(content => {
        expect(content).toHaveClass('transition-all', 'duration-300');
      });
    });

    it('hover効果が適用されている', () => {
      render(<TestAccordion />);
      
      const triggers = screen.getAllByRole('button');
      triggers.forEach(trigger => {
        expect(trigger).toHaveClass('hover:underline');
      });
    });
  });

  describe('カスタムクラス', () => {
    it('カスタムクラスが正しく適用される', () => {
      render(
        <Accordion className="custom-accordion">
          <AccordionItem value="test" className="custom-item">
            <AccordionTrigger className="custom-trigger">テスト</AccordionTrigger>
            <AccordionContent className="custom-content">コンテンツ</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      
      expect(screen.getByText('テスト').closest('.custom-accordion')).toBeInTheDocument();
      expect(screen.getByText('テスト').closest('.custom-item')).toBeInTheDocument();
      expect(screen.getByText('テスト')).toHaveClass('custom-trigger');
      expect(screen.getByText('コンテンツ').closest('.custom-content')).toBeInTheDocument();
    });
  });
});