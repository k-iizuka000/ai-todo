/**
 * スケジュール画面 E2E テスト
 * グループ8: 統合テスト・バリデーション
 */

import { test, expect } from '@playwright/test'

test.describe('スケジュール画面 - DB統合E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/schedule')
    await page.waitForLoadState('networkidle')
  })

  test('スケジュール情報のDB取得確認', async ({ page }) => {
    await expect(page.locator('[data-testid="schedule-calendar"]')).toBeVisible()
    await expect(page.locator('[data-testid="daily-schedule"]')).toBeVisible()
    
    // 今日の日付のスケジュールが表示されることを確認
    const today = new Date().toISOString().split('T')[0]
    await expect(page.locator(`[data-date="${today}"]`)).toBeVisible()
  })

  test('スケジュールアイテムの作成とDB保存確認', async ({ page }) => {
    // 時間スロットをクリックして新規アイテム作成
    await page.click('[data-testid="time-slot-09-00"]')
    await expect(page.locator('[data-testid="schedule-item-modal"]')).toBeVisible()

    await page.fill('[data-testid="item-title-input"]', 'E2E会議')
    await page.fill('[data-testid="item-start-time"]', '09:00')
    await page.fill('[data-testid="item-end-time"]', '10:00')
    await page.selectOption('[data-testid="item-type-select"]', 'MEETING')

    await page.click('[data-testid="save-schedule-item-button"]')
    
    // スケジュールアイテムが表示されることを確認
    await expect(page.locator('text=E2E会議')).toBeVisible()

    // ページリロードで永続化確認
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=E2E会議')).toBeVisible()
  })

  test('稼働時間集計機能のDB実装確認', async ({ page }) => {
    await expect(page.locator('[data-testid="working-hours-summary"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-hours-today"]')).toBeVisible()
    await expect(page.locator('[data-testid="break-hours-today"]')).toBeVisible()
    
    // 週間集計の確認
    await page.click('[data-testid="weekly-view-tab"]')
    await expect(page.locator('[data-testid="weekly-hours-chart"]')).toBeVisible()
  })

  test('カレンダー表示のDB対応確認', async ({ page }) => {
    // 月表示
    await page.click('[data-testid="month-view-button"]')
    await expect(page.locator('[data-testid="calendar-month-view"]')).toBeVisible()

    // 週表示
    await page.click('[data-testid="week-view-button"]')
    await expect(page.locator('[data-testid="calendar-week-view"]')).toBeVisible()

    // 日表示
    await page.click('[data-testid="day-view-button"]')
    await expect(page.locator('[data-testid="calendar-day-view"]')).toBeVisible()
  })
})