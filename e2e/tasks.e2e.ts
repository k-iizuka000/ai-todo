/**
 * タスク管理画面 E2E テスト
 * グループ8: 統合テスト・バリデーション
 * 
 * レビュー指摘事項対応:
 * - Critical Issue 1: 真のEnd-to-Endテスト実装
 * - Major Issue 2: 全画面DB統合確認機能
 */

import { test, expect } from '@playwright/test'

test.describe('タスク管理画面 - DB統合E2E', () => {
  test.beforeEach(async ({ page }) => {
    // タスク管理画面にナビゲート
    await page.goto('/tasks')
    
    // ページの読み込み完了を待機
    await page.waitForLoadState('networkidle')
  })

  test('タスク一覧の表示とDB取得確認', async ({ page }) => {
    // タスク一覧が表示されることを確認
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible()

    // DBから取得したテストデータが表示されることを確認
    await expect(page.locator('text=E2Eテスト用タスク')).toBeVisible()

    // タスクカードの基本要素が表示されることを確認
    const taskCard = page.locator('[data-testid="task-card"]').first()
    await expect(taskCard.locator('[data-testid="task-title"]')).toBeVisible()
    await expect(taskCard.locator('[data-testid="task-status"]')).toBeVisible()
    await expect(taskCard.locator('[data-testid="task-priority"]')).toBeVisible()
  })

  test('新しいタスクの作成（DBへの保存確認）', async ({ page }) => {
    // タスク作成ボタンをクリック
    await page.click('[data-testid="create-task-button"]')

    // タスク作成モーダルが開くことを確認
    await expect(page.locator('[data-testid="task-create-modal"]')).toBeVisible()

    // タスク情報を入力
    await page.fill('[data-testid="task-title-input"]', '新しいE2Eテストタスク')
    await page.fill('[data-testid="task-description-input"]', 'Playwrightで作成されたタスク')
    await page.selectOption('[data-testid="task-priority-select"]', 'MEDIUM')

    // 保存ボタンをクリック
    await page.click('[data-testid="save-task-button"]')

    // モーダルが閉じることを確認
    await expect(page.locator('[data-testid="task-create-modal"]')).not.toBeVisible()

    // 新しいタスクが一覧に表示されることを確認（DBから再取得）
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=新しいE2Eテストタスク')).toBeVisible()
  })

  test('タスクの編集とDB更新確認', async ({ page }) => {
    // 既存のタスクを選択
    const taskCard = page.locator('text=E2Eテスト用タスク').locator('..').first()
    await taskCard.click()

    // タスク詳細/編集画面が開くことを確認
    await expect(page.locator('[data-testid="task-detail-modal"]')).toBeVisible()

    // 編集モードに切り替え
    await page.click('[data-testid="edit-task-button"]')

    // タスク情報を編集
    await page.fill('[data-testid="task-title-input"]', '更新されたE2Eテストタスク')
    await page.selectOption('[data-testid="task-status-select"]', 'IN_PROGRESS')

    // 保存ボタンをクリック
    await page.click('[data-testid="save-task-button"]')

    // 変更が反映されることを確認
    await expect(page.locator('text=更新されたE2Eテストタスク')).toBeVisible()
    await expect(page.locator('[data-testid="task-status"]')).toContainText('進行中')

    // ページリロードで永続化確認
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=更新されたE2Eテストタスク')).toBeVisible()
  })

  test('タスクの削除とDB反映確認', async ({ page }) => {
    // 削除対象のタスクを特定
    const taskCard = page.locator('text=更新されたE2Eテストタスク').locator('..').first()
    
    // 削除ボタンをクリック
    await taskCard.locator('[data-testid="delete-task-button"]').click()

    // 削除確認ダイアログが表示されることを確認
    await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible()

    // 削除を確定
    await page.click('[data-testid="confirm-delete-button"]')

    // タスクが一覧から消えることを確認
    await expect(page.locator('text=更新されたE2Eテストタスク')).not.toBeVisible()

    // ページリロードで永続化確認
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=更新されたE2Eテストタスク')).not.toBeVisible()
  })

  test('タスクフィルタリング機能のDB連携確認', async ({ page }) => {
    // 複数のタスクが存在することを前提
    await expect(page.locator('[data-testid="task-card"]')).toHaveCount(1, { timeout: 10000 })

    // ステータスフィルターを開く
    await page.click('[data-testid="status-filter-button"]')

    // 「進行中」のみをフィルター
    await page.click('[data-testid="filter-in-progress"]')

    // フィルター結果が正しくDBから取得されることを確認
    await page.waitForResponse(response => response.url().includes('/api/v1/tasks'))
    
    // フィルター結果の表示確認
    const visibleTasks = page.locator('[data-testid="task-card"]:visible')
    await expect(visibleTasks).toHaveCount(0) // 現在進行中のタスクがない場合
  })

  test('タスクの検索機能とDB検索確認', async ({ page }) => {
    // 検索ボックスに入力
    await page.fill('[data-testid="task-search-input"]', 'E2E')

    // 検索API呼び出しを待機
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/tasks') && 
      response.url().includes('search=E2E')
    )

    // 検索結果が表示されることを確認
    await expect(page.locator('text=E2Eテスト用タスク')).toBeVisible()

    // 検索条件に一致しないタスクは表示されないことを確認
    await page.fill('[data-testid="task-search-input"]', '存在しないタスク')
    await page.waitForResponse(response => response.url().includes('/api/v1/tasks'))
    await expect(page.locator('[data-testid="task-card"]')).toHaveCount(0)
  })

  test('パフォーマンステスト - 画面表示時間2秒以内', async ({ page }) => {
    const startTime = Date.now()
    
    // タスク画面に移動
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    
    // タスク一覧が表示されるまでの時間を測定
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible()
    
    const loadTime = Date.now() - startTime
    console.log(`タスク画面表示時間: ${loadTime}ms`)
    
    // 設計書要件: 画面表示時間2秒以内
    expect(loadTime).toBeLessThan(2000)
  })

  test('レスポンシブ対応確認', async ({ page }) => {
    // モバイル画面サイズに変更
    await page.setViewportSize({ width: 375, height: 667 })

    // タスク一覧が適切に表示されることを確認
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible()

    // モバイル用のハンバーガーメニューが表示されることを確認
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()

    // タブレット画面サイズに変更
    await page.setViewportSize({ width: 768, height: 1024 })

    // タスク一覧が適切に表示されることを確認
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible()
  })
})