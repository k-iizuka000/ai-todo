/**
 * プロジェクト管理画面 E2E テスト
 * グループ8: 統合テスト・バリデーション
 */

import { test, expect } from '@playwright/test'

test.describe('プロジェクト管理画面 - DB統合E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
  })

  test('プロジェクト一覧の表示とDB取得確認', async ({ page }) => {
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible()
    await expect(page.locator('text=Test Project')).toBeVisible()
    
    const projectCard = page.locator('[data-testid="project-card"]').first()
    await expect(projectCard.locator('[data-testid="project-name"]')).toBeVisible()
    await expect(projectCard.locator('[data-testid="project-status"]')).toBeVisible()
  })

  test('新しいプロジェクトの作成（DBへの保存確認）', async ({ page }) => {
    await page.click('[data-testid="create-project-button"]')
    await expect(page.locator('[data-testid="project-create-modal"]')).toBeVisible()

    await page.fill('[data-testid="project-name-input"]', '新しいE2Eプロジェクト')
    await page.fill('[data-testid="project-description-input"]', 'Playwrightで作成')
    await page.selectOption('[data-testid="project-status-select"]', 'ACTIVE')

    await page.click('[data-testid="save-project-button"]')
    await expect(page.locator('[data-testid="project-create-modal"]')).not.toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=新しいE2Eプロジェクト')).toBeVisible()
  })

  test('プロジェクト統計情報のDB集計確認', async ({ page }) => {
    const projectCard = page.locator('text=Test Project').locator('..').first()
    await projectCard.click()

    await expect(page.locator('[data-testid="project-stats-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="total-tasks-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="completed-tasks-count"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-progress-bar"]')).toBeVisible()
  })

  test('プロジェクトメンバー管理のDB操作確認', async ({ page }) => {
    const projectCard = page.locator('text=Test Project').locator('..').first()
    await projectCard.click()

    await page.click('[data-testid="manage-members-tab"]')
    await expect(page.locator('[data-testid="members-list"]')).toBeVisible()

    // メンバー追加
    await page.click('[data-testid="add-member-button"]')
    await page.fill('[data-testid="member-email-input"]', 'member@example.com')
    await page.click('[data-testid="add-member-confirm"]')

    await expect(page.locator('text=member@example.com')).toBeVisible()
  })
})