/**
 * アクセシビリティ統合テスト
 * 設計書 グループ2: WCAG準拠アクセシビリティ対応
 * 
 * 目的: WCAG 2.1 AA準拠の自動テスト
 * テスト範囲: フォーカス管理、キーボードナビゲーション、ARIA属性、コントラスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';

import { AccessibilityProvider } from '../../providers/AccessibilityProvider';
import { AccessibleLiveRegion, useLiveRegion } from '../AccessibleLiveRegion';
import { ModalContent, useAccessibleModal } from '../../../hooks/useAccessibleModal';
import { useKeyboardNavigation } from '../../../hooks/useKeyboardNavigation';

// jest-axe のマッチャーを追加
expect.extend(toHaveNoViolations);

// テスト用コンポーネント
const TestKeyboardNavigation: React.FC<{ items: string[] }> = ({ items }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const keyboardNav = useKeyboardNavigation(containerRef, {
    enableArrowKeys: true,
    enableEnterKey: true,
    enableEscapeKey: true
  });

  return (
    <div ref={containerRef} role="listbox" aria-label="テストリスト">
      {items.map((item, index) => (
        <div
          key={index}
          role="option"
          tabIndex={0}
          aria-selected="false"
          className="p-2 focus:bg-blue-100"
        >
          {item}
        </div>
      ))}
    </div>
  );
};

const TestModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const modalHook = useAccessibleModal(isOpen, {
    title: 'テストモーダル',
    description: 'これはテスト用のモーダルです',
    onClose
  });

  return (
    <ModalContent
      isOpen={isOpen}
      title="テストモーダル"
      description="これはテスト用のモーダルです"
      modalHook={modalHook}
    >
      <button>モーダル内ボタン1</button>
      <input type="text" placeholder="テストインプット" />
      <button>モーダル内ボタン2</button>
    </ModalContent>
  );
};

const TestLiveRegion: React.FC = () => {
  const { announce, LiveRegion } = useLiveRegion();
  
  return (
    <div>
      <button onClick={() => announce('テストメッセージ', 'polite')}>
        アナウンス
      </button>
      <button onClick={() => announce('緊急メッセージ', 'assertive')}>
        緊急アナウンス
      </button>
      <LiveRegion data-testid="test-live-region" />
    </div>
  );
};

describe('WCAG 2.1 AA準拠アクセシビリティテスト', () => {
  describe('AccessibilityProvider', () => {
    test('初期設定が正しく適用される', () => {
      render(
        <AccessibilityProvider initialConfig={{ highContrast: true }}>
          <div>テストコンテンツ</div>
        </AccessibilityProvider>
      );

      // data-high-contrast属性が設定される
      expect(document.documentElement).toHaveAttribute('data-high-contrast', 'true');
    });

    test('設定変更が正しく反映される', async () => {
      const TestComponent = () => {
        const { config, updateConfig } = React.useContext(AccessibilityProvider as any);
        
        return (
          <div>
            <button onClick={() => updateConfig({ reducedMotion: true })}>
              モーション削減
            </button>
            <div data-testid="config">{JSON.stringify(config)}</div>
          </div>
        );
      };

      render(
        <AccessibilityProvider>
          <TestComponent />
        </AccessibilityProvider>
      );

      const button = screen.getByText('モーション削減');
      fireEvent.click(button);

      await waitFor(() => {
        expect(document.documentElement).toHaveAttribute('data-reduced-motion', 'true');
      });
    });

    test('prefers-reduced-motionメディアクエリに対応する', () => {
      // メディアクエリをモック
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <AccessibilityProvider>
          <div>テストコンテンツ</div>
        </AccessibilityProvider>
      );

      expect(document.documentElement).toHaveAttribute('data-reduced-motion', 'true');
    });
  });

  describe('フォーカス管理（WCAG 2.4.3, 2.4.7）', () => {
    test('Tab キーでのフォーカス循環が正しく動作する', async () => {
      const user = userEvent.setup();
      
      render(
        <AccessibilityProvider>
          <div>
            <button>ボタン1</button>
            <input type="text" placeholder="インプット" />
            <button>ボタン2</button>
          </div>
        </AccessibilityProvider>
      );

      const button1 = screen.getByText('ボタン1');
      const input = screen.getByPlaceholderText('インプット');
      const button2 = screen.getByText('ボタン2');

      // 最初の要素にフォーカス
      button1.focus();
      expect(button1).toHaveFocus();

      // Tab でインプットに移動
      await user.tab();
      expect(input).toHaveFocus();

      // Tab でボタン2に移動
      await user.tab();
      expect(button2).toHaveFocus();
    });

    test('フォーカストラップが正しく動作する', async () => {
      const user = userEvent.setup();
      let isOpen = false;
      const setIsOpen = jest.fn((value) => { isOpen = value; });

      const { rerender } = render(
        <AccessibilityProvider>
          <TestModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </AccessibilityProvider>
      );

      // モーダルを開く
      isOpen = true;
      rerender(
        <AccessibilityProvider>
          <TestModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </AccessibilityProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // モーダル内でフォーカスが循環することを確認
      const button1 = screen.getByText('モーダル内ボタン1');
      const input = screen.getByPlaceholderText('テストインプット');
      const button2 = screen.getByText('モーダル内ボタン2');
      const closeButton = screen.getByText('閉じる');

      // Tab でフォーカス移動
      await user.tab();
      expect(button1).toHaveFocus();

      await user.tab();
      expect(input).toHaveFocus();

      await user.tab();
      expect(button2).toHaveFocus();

      await user.tab();
      expect(closeButton).toHaveFocus();

      // 最後の要素から最初の要素に戻る
      await user.tab();
      expect(button1).toHaveFocus();
    });
  });

  describe('キーボードナビゲーション（WCAG 2.1.1）', () => {
    test('矢印キーによるナビゲーションが動作する', async () => {
      const user = userEvent.setup();
      const items = ['アイテム1', 'アイテム2', 'アイテム3'];
      
      render(
        <AccessibilityProvider>
          <TestKeyboardNavigation items={items} />
        </AccessibilityProvider>
      );

      const listbox = screen.getByRole('listbox');
      const options = screen.getAllByRole('option');

      // 最初の要素にフォーカス
      options[0].focus();
      expect(options[0]).toHaveFocus();

      // ArrowDown で次の要素に移動
      fireEvent.keyDown(listbox, { key: 'ArrowDown' });
      await waitFor(() => expect(options[1]).toHaveFocus());

      // ArrowUp で前の要素に移動
      fireEvent.keyDown(listbox, { key: 'ArrowUp' });
      await waitFor(() => expect(options[0]).toHaveFocus());

      // End で最後の要素に移動
      fireEvent.keyDown(listbox, { key: 'End' });
      await waitFor(() => expect(options[2]).toHaveFocus());

      // Home で最初の要素に移動
      fireEvent.keyDown(listbox, { key: 'Home' });
      await waitFor(() => expect(options[0]).toHaveFocus());
    });

    test('Enter キーでの要素アクティベーションが動作する', async () => {
      const clickHandler = jest.fn();
      
      render(
        <AccessibilityProvider>
          <div role="button" tabIndex={0} onClick={clickHandler}>
            クリック可能要素
          </div>
        </AccessibilityProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      // Enter キーでクリック
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(clickHandler).toHaveBeenCalled();
    });

    test('Escape キーでの操作キャンセルが動作する', async () => {
      const closeHandler = jest.fn();
      let isOpen = true;
      
      const { rerender } = render(
        <AccessibilityProvider>
          <TestModal isOpen={isOpen} onClose={closeHandler} />
        </AccessibilityProvider>
      );

      const modal = screen.getByRole('dialog');
      
      // Escape キーでモーダル閉鎖
      fireEvent.keyDown(modal, { key: 'Escape' });
      expect(closeHandler).toHaveBeenCalled();
    });
  });

  describe('ARIA属性とスクリーンリーダー対応（WCAG 4.1.2, 4.1.3）', () => {
    test('モーダルに適切なARIA属性が設定される', () => {
      render(
        <AccessibilityProvider>
          <TestModal isOpen={true} onClose={jest.fn()} />
        </AccessibilityProvider>
      );

      const modal = screen.getByRole('dialog');
      
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
      expect(modal).toHaveAttribute('role', 'dialog');
    });

    test('リストアイテムに適切なARIA属性が設定される', () => {
      render(
        <AccessibilityProvider>
          <TestKeyboardNavigation items={['アイテム1', 'アイテム2']} />
        </AccessibilityProvider>
      );

      const listbox = screen.getByRole('listbox');
      const options = screen.getAllByRole('option');

      expect(listbox).toHaveAttribute('aria-label');
      
      options.forEach((option, index) => {
        expect(option).toHaveAttribute('aria-posinset', (index + 1).toString());
        expect(option).toHaveAttribute('aria-setsize', options.length.toString());
      });
    });

    test('ライブリージョンが正しく動作する', async () => {
      render(
        <AccessibilityProvider>
          <TestLiveRegion />
        </AccessibilityProvider>
      );

      const politeButton = screen.getByText('アナウンス');
      const assertiveButton = screen.getByText('緊急アナウンス');
      const liveRegion = screen.getByTestId('test-live-region');

      // polite アナウンス
      fireEvent.click(politeButton);
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('テストメッセージ');
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      });

      // assertive アナウンス
      fireEvent.click(assertiveButton);
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('緊急メッセージ');
        expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
      });
    });
  });

  describe('コントラスト比とカラー（WCAG 1.4.3）', () => {
    test('高コントラストモードが適用される', () => {
      render(
        <AccessibilityProvider initialConfig={{ highContrast: true }}>
          <div className="text-gray-600">テストテキスト</div>
        </AccessibilityProvider>
      );

      expect(document.documentElement).toHaveAttribute('data-high-contrast', 'true');
      
      // CSS変数が設定されている
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--contrast-multiplier')).toBe('1.5');
    });

    test('ステータス色が高コントラストで適切に表示される', () => {
      render(
        <AccessibilityProvider initialConfig={{ highContrast: true }}>
          <div className="status-todo">TODO</div>
          <div className="status-in-progress">進行中</div>
          <div className="status-done">完了</div>
        </AccessibilityProvider>
      );

      // 高コントラスト用のdata属性が設定されている
      expect(document.documentElement).toHaveAttribute('data-high-contrast', 'true');
    });
  });

  describe('WCAG axe-core 自動テスト', () => {
    test('アクセシビリティ違反がない', async () => {
      const { container } = render(
        <AccessibilityProvider>
          <div>
            <h1>メインタイトル</h1>
            <nav aria-label="メインナビゲーション">
              <ul>
                <li><a href="#section1">セクション1</a></li>
                <li><a href="#section2">セクション2</a></li>
              </ul>
            </nav>
            <main>
              <section id="section1">
                <h2>セクション1</h2>
                <p>コンテンツ</p>
                <button>アクション</button>
              </section>
              <section id="section2">
                <h2>セクション2</h2>
                <form>
                  <label htmlFor="email">メールアドレス</label>
                  <input id="email" type="email" required />
                  <button type="submit">送信</button>
                </form>
              </section>
            </main>
          </div>
        </AccessibilityProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('モーダルダイアログにアクセシビリティ違反がない', async () => {
      const { container } = render(
        <AccessibilityProvider>
          <TestModal isOpen={true} onClose={jest.fn()} />
        </AccessibilityProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('フォーム要素にアクセシビリティ違反がない', async () => {
      const { container } = render(
        <AccessibilityProvider>
          <form>
            <fieldset>
              <legend>ユーザー情報</legend>
              
              <div>
                <label htmlFor="name">名前 *</label>
                <input id="name" type="text" required aria-describedby="name-help" />
                <div id="name-help">フルネームを入力してください</div>
              </div>
              
              <div>
                <label htmlFor="email">メール</label>
                <input id="email" type="email" />
              </div>
              
              <div role="radiogroup" aria-labelledby="gender-label">
                <div id="gender-label">性別</div>
                <label>
                  <input type="radio" name="gender" value="male" />
                  男性
                </label>
                <label>
                  <input type="radio" name="gender" value="female" />
                  女性
                </label>
              </div>
              
              <div>
                <label>
                  <input type="checkbox" />
                  利用規約に同意します
                </label>
              </div>
              
              <button type="submit">送信</button>
            </fieldset>
          </form>
        </AccessibilityProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('パフォーマンスと応答性', () => {
    test('大量要素のキーボードナビゲーションが快適', async () => {
      const user = userEvent.setup();
      const items = Array.from({ length: 100 }, (_, i) => `アイテム${i + 1}`);
      
      const start = performance.now();
      
      render(
        <AccessibilityProvider>
          <TestKeyboardNavigation items={items} />
        </AccessibilityProvider>
      );

      const options = screen.getAllByRole('option');
      options[0].focus();

      // 10回の矢印キー操作
      for (let i = 0; i < 10; i++) {
        fireEvent.keyDown(options[i], { key: 'ArrowDown' });
      }

      const end = performance.now();
      
      // 100ms以内で完了することを確認
      expect(end - start).toBeLessThan(100);
    });

    test('フォーカス管理のメモリリークがない', () => {
      const { unmount } = render(
        <AccessibilityProvider>
          <TestKeyboardNavigation items={['test']} />
        </AccessibilityProvider>
      );

      // イベントリスナーがクリーンアップされることを確認
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      unmount();

      // 追加したイベントリスナーが適切に削除される
      expect(removeEventListenerSpy).toHaveBeenCalled();
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});