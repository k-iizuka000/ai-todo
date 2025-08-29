/**
 * 通知機能 E2E テスト
 * グループ8: 統合テスト・バリデーション
 */

import { test, expect } from '@playwright/test'

test.describe('通知機能 - DB統合E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')
  })

  test('通知一覧のDB取得確認', async ({ page }) => {
    await expect(page.locator('[data-testid="notification-list"]')).toBeVisible()
    
    // 通知アイテムの基本要素確認
    const notificationItem = page.locator('[data-testid="notification-item"]').first()
    if (await notificationItem.count() > 0) {
      await expect(notificationItem.locator('[data-testid="notification-title"]')).toBeVisible()
      await expect(notificationItem.locator('[data-testid="notification-timestamp"]')).toBeVisible()
      await expect(notificationItem.locator('[data-testid="notification-read-status"]')).toBeVisible()
    }
  })

  test('通知フィルタリング機能の実装確認', async ({ page }) => {
    // 未読フィルター
    await page.click('[data-testid="filter-unread-button"]')
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/notifications') && 
      response.url().includes('read=false')
    )

    // 既読フィルター
    await page.click('[data-testid="filter-read-button"]')
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/notifications') && 
      response.url().includes('read=true')
    )

    // 全て表示
    await page.click('[data-testid="filter-all-button"]')
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/notifications') && 
      !response.url().includes('read=')
    )
  })

  test('通知の既読管理とDB操作確認', async ({ page }) => {
    // 未読通知をクリックして既読にする
    const unreadNotification = page.locator('[data-testid="notification-item"][data-read="false"]').first()
    
    if (await unreadNotification.count() > 0) {
      await unreadNotification.click()
      
      // 既読API呼び出し確認
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/notifications') && 
        response.request().method() === 'PATCH'
      )

      // 既読状態に変更されることを確認
      await expect(unreadNotification).toHaveAttribute('data-read', 'true')
    }
  })

  test('通知設定画面のDB統合確認', async ({ page }) => {
    await page.click('[data-testid="notification-settings-button"]')
    await expect(page.locator('[data-testid="notification-settings-modal"]')).toBeVisible()

    // 通知設定の変更とDB保存
    await page.check('[data-testid="email-notifications-checkbox"]')
    await page.check('[data-testid="task-due-notifications-checkbox"]')
    await page.click('[data-testid="save-settings-button"]')

    // 設定保存API確認
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/user/notification-settings')
    )

    await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible()
  })

  test('リアルタイム通知受信テスト', async ({ page }) => {
    // WebSocket接続確認
    await page.evaluate(() => {
      // リアルタイム通知のテスト
      window.dispatchEvent(new CustomEvent('test-notification', {
        detail: {
          id: 'test-notification-1',
          title: 'テスト通知',
          message: 'E2Eテストからの通知',
          type: 'info'
        }
      }))
    })

    // 新しい通知がリアルタイムで表示されることを確認
    await expect(page.locator('text=テスト通知')).toBeVisible({ timeout: 5000 })
  })
})