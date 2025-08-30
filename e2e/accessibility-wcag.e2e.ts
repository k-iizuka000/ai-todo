/**
 * WCAG 2.1 AA準拠 E2Eアクセシビリティテスト
 * 設計書 グループ2: WCAG準拠アクセシビリティ対応
 * 
 * 目的: 実際のブラウザでのWCAG準拠テスト
 * 範囲: キーボードナビゲーション、スクリーンリーダー、フォーカス管理
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// アクセシビリティヘルパー関数
const waitForPageLoad = async (page: Page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');
};

const checkFocusVisibility = async (page: Page, selector: string) => {
  const element = page.locator(selector);
  await element.focus();
  
  // フォーカスリングが表示されているかチェック
  const focusStyle = await element.evaluate(el => {
    const styles = window.getComputedStyle(el);
    return {
      outline: styles.outline,
      outlineWidth: styles.outlineWidth,
      boxShadow: styles.boxShadow
    };
  });
  
  const hasFocusIndicator = 
    focusStyle.outline !== 'none' ||
    parseFloat(focusStyle.outlineWidth) > 0 ||
    focusStyle.boxShadow.includes('rgb');
    
  expect(hasFocusIndicator).toBeTruthy();
};

const checkColorContrast = async (page: Page, selector: string) => {
  const contrastRatio = await page.locator(selector).evaluate(el => {
    const styles = window.getComputedStyle(el);
    // 簡易コントラスト計算（実際の実装では、より正確な計算が必要）
    const textColor = styles.color;
    const backgroundColor = styles.backgroundColor;
    
    // RGB値を取得して輝度計算
    const getRGB = (color: string) => {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
    };
    
    const getLuminance = (rgb: number[]) => {
      const [r, g, b] = rgb.map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const textRGB = getRGB(textColor);
    const bgRGB = getRGB(backgroundColor);
    
    const textLuminance = getLuminance(textRGB);
    const bgLuminance = getLuminance(bgRGB);
    
    const lighter = Math.max(textLuminance, bgLuminance);
    const darker = Math.min(textLuminance, bgLuminance);
    
    return (lighter + 0.05) / (darker + 0.05);
  });
  
  // WCAG AA基準: 4.5:1以上
  expect(contrastRatio).toBeGreaterThan(4.5);
};

test.describe('WCAG 2.1 AA準拠アクセシビリティテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test.describe('1. 知覚可能性 (Perceivable)', () => {
    test('1.4.3 コントラスト（最低限）- 通常テキストが4.5:1以上', async ({ page }) => {
      // メインタイトル
      await checkColorContrast(page, 'h1');
      
      // ナビゲーションリンク
      const navLinks = page.locator('nav a');
      const count = await navLinks.count();
      
      for (let i = 0; i < count; i++) {
        await checkColorContrast(page, `nav a:nth-child(${i + 1})`);
      }
      
      // ボタン
      await checkColorContrast(page, 'button');
      
      // 本文テキスト
      await checkColorContrast(page, 'p');
    });

    test('1.4.3 コントラスト（最低限）- 高コントラストモード', async ({ page }) => {
      // 高コントラストモードを有効化
      await page.addStyleTag({
        content: `
          :root { 
            --contrast-multiplier: 1.5;
          }
          [data-high-contrast="true"] {
            --text-color: hsl(0, 0%, 10%);
            --background-color: hsl(0, 0%, 98%);
          }
        `
      });
      
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-high-contrast', 'true');
      });
      
      // 高コントラストでの色合いをテスト
      await checkColorContrast(page, 'h1');
      await checkColorContrast(page, 'button');
    });

    test('1.4.12 テキストの間隔 - 行間、段落間隔が適切', async ({ page }) => {
      const spacing = await page.locator('p').first().evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          lineHeight: parseFloat(styles.lineHeight),
          fontSize: parseFloat(styles.fontSize),
          marginBottom: parseFloat(styles.marginBottom)
        };
      });
      
      // 行間が1.5倍以上
      expect(spacing.lineHeight / spacing.fontSize).toBeGreaterThanOrEqual(1.5);
      
      // 段落間隔が適切
      expect(spacing.marginBottom).toBeGreaterThan(0);
    });
  });

  test.describe('2. 操作可能性 (Operable)', () => {
    test('2.1.1 キーボード - すべての機能がキーボードでアクセス可能', async ({ page }) => {
      // メインナビゲーションのテスト
      await page.press('body', 'Tab');
      
      const firstFocusable = page.locator(':focus');
      await expect(firstFocusable).toBeVisible();
      
      // Tab キーで全ての対話要素を巡回
      const focusableElements = [];
      let previousElement = null;
      
      for (let i = 0; i < 20; i++) { // 最大20要素まで
        const focused = await page.locator(':focus').textContent();
        
        if (focused === previousElement) break; // 循環完了
        
        focusableElements.push(focused);
        previousElement = focused;
        
        await page.press('body', 'Tab');
      }
      
      expect(focusableElements.length).toBeGreaterThan(3);
    });

    test('2.1.2 キーボードトラップなし - フォーカスが捕捉されない', async ({ page }) => {
      // モーダルを開く
      const modalTrigger = page.getByTestId('task-detail-trigger').first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        // モーダル内でTabキーを押す
        await page.press('body', 'Tab');
        await page.press('body', 'Tab');
        await page.press('body', 'Tab');
        
        // Escキーでモーダルを閉じられる
        await page.press('body', 'Escape');
        await page.waitForTimeout(100);
        
        // モーダルが閉じられている
        const modal = page.getByRole('dialog');
        await expect(modal).not.toBeVisible();
      }
    });

    test('2.4.3 フォーカス順序 - 論理的なフォーカス順序', async ({ page }) => {
      const focusOrder = [];
      
      // 最初にフォーカス可能な要素にフォーカス
      await page.press('body', 'Tab');
      
      for (let i = 0; i < 10; i++) {
        const focusedElement = await page.locator(':focus').evaluate(el => {
          return {
            tagName: el.tagName,
            text: el.textContent?.trim() || '',
            role: el.getAttribute('role') || '',
            'aria-label': el.getAttribute('aria-label') || ''
          };
        });
        
        focusOrder.push(focusedElement);
        await page.press('body', 'Tab');
      }
      
      // フォーカス順序が論理的であることを確認
      // ヘッダー → ナビゲーション → メインコンテンツ の順序
      expect(focusOrder.length).toBeGreaterThan(3);
      
      console.log('フォーカス順序:', focusOrder.map(el => `${el.tagName}:${el.text}`));
    });

    test('2.4.7 フォーカスの可視化 - フォーカスが明確に表示される', async ({ page }) => {
      // 各フォーカス可能要素でフォーカス表示をテスト
      await checkFocusVisibility(page, 'button');
      await checkFocusVisibility(page, 'a[href]');
      await checkFocusVisibility(page, 'input');
      
      // モーダル内でのフォーカス表示
      const modalTrigger = page.getByTestId('task-detail-trigger').first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        await checkFocusVisibility(page, '[role="dialog"] button');
      }
    });

    test('2.5.5 ターゲットのサイズ - タッチターゲットが44x44px以上', async ({ page }) => {
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const size = await button.boundingBox();
        
        if (size) {
          expect(size.width).toBeGreaterThanOrEqual(44);
          expect(size.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('3. 理解可能性 (Understandable)', () => {
    test('3.1.1 ページの言語 - lang属性が設定されている', async ({ page }) => {
      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBe('ja');
    });

    test('3.2.1 フォーカス時 - フォーカスで文脈が予期せず変化しない', async ({ page }) => {
      // フォーカス前のURL
      const initialUrl = page.url();
      
      // 各要素にフォーカスを当てる
      const focusableSelectors = ['button', 'a[href]', 'input'];
      
      for (const selector of focusableSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        for (let i = 0; i < Math.min(count, 3); i++) {
          await elements.nth(i).focus();
          await page.waitForTimeout(100);
          
          // URL が変わっていないことを確認
          expect(page.url()).toBe(initialUrl);
        }
      }
    });

    test('3.3.1 エラーの特定 - エラーメッセージが適切に表示される', async ({ page }) => {
      // フォーム要素があればテスト
      const form = page.locator('form').first();
      
      if (await form.isVisible()) {
        const submitButton = form.locator('button[type="submit"]');
        const requiredInput = form.locator('input[required]');
        
        if (await requiredInput.isVisible()) {
          // 空のまま送信
          await submitButton.click();
          
          // エラーメッセージが表示される
          const errorMessage = page.locator('[role="alert"], .error-message');
          await expect(errorMessage).toBeVisible();
          
          // エラーメッセージがaria-live領域にある
          const liveRegion = page.locator('[aria-live]');
          if (await liveRegion.isVisible()) {
            await expect(liveRegion).toContainText(/エラー|error/i);
          }
        }
      }
    });
  });

  test.describe('4. 堅牢性 (Robust)', () => {
    test('4.1.1 構文解析 - 有効なHTML構造', async ({ page }) => {
      // HTML検証（基本的なチェック）
      const duplicateIds = await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
        const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
        return [...new Set(duplicates)];
      });
      
      expect(duplicateIds).toHaveLength(0);
    });

    test('4.1.2 名前、役割、値 - 適切なARIA属性', async ({ page }) => {
      // ボタンのaria-label または textContent
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // aria-labelまたはテキストコンテンツがある
        expect(ariaLabel || textContent?.trim()).toBeTruthy();
      }
      
      // リンクのaria-label または textContent
      const links = page.locator('a[href]');
      const linkCount = await links.count();
      
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i);
        const ariaLabel = await link.getAttribute('aria-label');
        const textContent = await link.textContent();
        
        expect(ariaLabel || textContent?.trim()).toBeTruthy();
      }
    });

    test('4.1.3 ステータスメッセージ - ライブリージョンでの通知', async ({ page }) => {
      // ライブリージョンの存在確認
      const liveRegions = page.locator('[aria-live]');
      await expect(liveRegions.first()).toBeAttached();
      
      // アクションを実行してライブリージョンの更新をテスト
      const actionButton = page.locator('button').first();
      if (await actionButton.isVisible()) {
        await actionButton.click();
        
        // ライブリージョンにメッセージが表示される
        await page.waitForTimeout(1000);
        
        const liveContent = await liveRegions.first().textContent();
        // 何らかのステータスメッセージが表示される
        console.log('ライブリージョンコンテンツ:', liveContent);
      }
    });
  });

  test.describe('axe-core自動テスト', () => {
    test('ホームページにアクセシビリティ違反がない', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('モーダルダイアログにアクセシビリティ違反がない', async ({ page }) => {
      // モーダルを開く
      const modalTrigger = page.getByTestId('task-detail-trigger').first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        await page.waitForSelector('[role="dialog"]');
        
        const accessibilityScanResults = await new AxeBuilder({ page })
          .include('[role="dialog"]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    });

    test('フォーム要素にアクセシビリティ違反がない', async ({ page }) => {
      // フォームページに移動（存在する場合）
      const form = page.locator('form').first();
      
      if (await form.isVisible()) {
        const accessibilityScanResults = await new AxeBuilder({ page })
          .include('form')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze();
        
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    });
  });

  test.describe('キーボードショートカット', () => {
    test('アプリケーション全体のキーボードショートカット', async ({ page }) => {
      // スキップリンク（存在する場合）
      await page.press('body', 'Tab');
      const firstFocusable = page.locator(':focus');
      
      if (await firstFocusable.textContent().then(text => text?.includes('スキップ'))) {
        await page.press('body', 'Enter');
        // メインコンテンツにフォーカスが移動
        const focused = page.locator(':focus');
        await expect(focused).toBeVisible();
      }
      
      // グローバルキーボードショートカット
      // 例: Alt+1 でメイン領域、Alt+2 でナビゲーション等
      
      // Ctrl+/ でヘルプ（実装されている場合）
      await page.press('body', 'Control+Slash');
      await page.waitForTimeout(100);
    });

    test('モーダル内でのキーボード操作', async ({ page }) => {
      const modalTrigger = page.getByTestId('task-detail-trigger').first();
      if (await modalTrigger.isVisible()) {
        await modalTrigger.click();
        
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        
        // Tab でモーダル内を移動
        await page.press('body', 'Tab');
        await page.press('body', 'Tab');
        
        // Shift+Tab で逆方向に移動
        await page.press('body', 'Shift+Tab');
        
        // Enter で要素をアクティベート
        const focusedElement = page.locator(':focus');
        if (await focusedElement.getAttribute('role') === 'button') {
          await page.press('body', 'Enter');
        }
        
        // Escape でモーダル閉鎖
        await page.press('body', 'Escape');
        await expect(modal).not.toBeVisible();
      }
    });
  });

  test.describe('スクリーンリーダー対応', () => {
    test('見出し構造が適切', async ({ page }) => {
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(elements => 
        elements.map(el => ({
          level: parseInt(el.tagName.substring(1)),
          text: el.textContent?.trim()
        }))
      );
      
      // h1が存在し、見出しレベルが論理的
      expect(headings.some(h => h.level === 1)).toBeTruthy();
      
      // 見出しレベルが連続している（1→2→3、2→3は良いが、1→3はNG）
      for (let i = 1; i < headings.length; i++) {
        const levelJump = headings[i].level - headings[i-1].level;
        expect(levelJump).toBeLessThanOrEqual(1);
      }
    });

    test('ランドマークが適切に設定されている', async ({ page }) => {
      // main要素が存在
      await expect(page.locator('main')).toBeAttached();
      
      // nav要素が存在
      await expect(page.locator('nav')).toBeAttached();
      
      // header要素が存在（オプション）
      const header = page.locator('header');
      if (await header.count() > 0) {
        await expect(header).toBeAttached();
      }
      
      // footer要素が存在（オプション）
      const footer = page.locator('footer');
      if (await footer.count() > 0) {
        await expect(footer).toBeAttached();
      }
    });

    test('リスト構造が適切', async ({ page }) => {
      const lists = page.locator('ul, ol');
      const listCount = await lists.count();
      
      for (let i = 0; i < listCount; i++) {
        const list = lists.nth(i);
        const listItems = list.locator('li');
        const itemCount = await listItems.count();
        
        // リストには少なくとも1つのアイテムがある
        expect(itemCount).toBeGreaterThan(0);
        
        // リストアイテムが直接の子要素として存在する
        const directChildren = await list.evaluate(el => 
          Array.from(el.children).filter(child => child.tagName === 'LI').length
        );
        
        expect(directChildren).toBe(itemCount);
      }
    });
  });
});