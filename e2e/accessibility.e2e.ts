/**
 * アクセシビリティ E2E テスト
 * グループ8: 統合テスト・バリデーション
 * 
 * 設計書要件: WCAG 2.1 AA準拠
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('アクセシビリティテスト - WCAG 2.1 AA準拠', () => {
  
  test('タスク管理画面のアクセシビリティ検証', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
    
    // キーボードナビゲーション確認
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="create-task-button"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    const taskCard = page.locator('[data-testid="task-card"]').first()
    if (await taskCard.count() > 0) {
      await expect(taskCard).toBeFocused()
    }
  })

  test('プロジェクト管理画面のアクセシビリティ検証', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // スクリーンリーダー対応確認
    await expect(page.locator('[aria-label*="プロジェクト一覧"]')).toBeVisible()
    await expect(page.locator('[role="main"]')).toBeVisible()
  })

  test('スケジュール画面のアクセシビリティ検証', async ({ page }) => {
    await page.goto('/schedule')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // カレンダーのアクセシビリティ確認
    await expect(page.locator('[role="grid"]')).toBeVisible()
    await expect(page.locator('[aria-label*="カレンダー"]')).toBeVisible()
  })

  test('通知画面のアクセシビリティ検証', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // ライブリージョンの確認（通知用）
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })

  test('色覚異常者対応確認', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    // 色だけに依存しない情報伝達の確認
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible()

    // ハイコントラストモードの確認
    await page.addStyleTag({
      content: `
        * {
          filter: contrast(150%) !important;
        }
      `
    })

    await expect(page.locator('[data-testid="task-card"]').first()).toBeVisible()
  })

  test('フォーカス管理とキーボードナビゲーション', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    // タブオーダーの確認
    const focusableElements = [
      '[data-testid="create-task-button"]',
      '[data-testid="task-search-input"]',
      '[data-testid="status-filter-button"]',
    ]

    for (const selector of focusableElements) {
      await page.keyboard.press('Tab')
      const element = page.locator(selector)
      if (await element.count() > 0) {
        await expect(element).toBeFocused()
      }
    }

    // Escキーでモーダルを閉じられることを確認
    await page.click('[data-testid="create-task-button"]')
    await expect(page.locator('[data-testid="task-create-modal"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="task-create-modal"]')).not.toBeVisible()
  })

  test('ARIA属性とセマンティックHTML確認', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    // 適切なARIA属性の確認
    await expect(page.locator('[role="main"]')).toBeVisible()
    await expect(page.locator('[role="banner"]')).toBeVisible()
    await expect(page.locator('[role="navigation"]')).toBeVisible()

    // ランドマークの確認
    const landmarks = await page.locator('[role="main"], [role="banner"], [role="navigation"], [role="complementary"], [role="contentinfo"]')
    expect(await landmarks.count()).toBeGreaterThan(0)

    // ヘディング構造の確認
    const headings = await page.locator('h1, h2, h3, h4, h5, h6')
    expect(await headings.count()).toBeGreaterThan(0)

    // 最初のh1が存在することを確認
    await expect(page.locator('h1').first()).toBeVisible()
  })
})