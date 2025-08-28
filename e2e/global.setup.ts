/**
 * Playwright グローバルセットアップ
 * グループ8: 統合テスト・バリデーション
 */

import { chromium, FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

async function globalSetup(config: FullConfig) {
  console.log('🚀 E2E テストのグローバルセットアップを開始...')

  // テスト用データベースの初期化
  await setupTestDatabase()

  // テスト用ブラウザのウォームアップ
  const browser = await chromium.launch()
  await browser.close()

  console.log('✅ E2E テストのグローバルセットアップ完了')
}

/**
 * テスト用データベースのセットアップ
 */
async function setupTestDatabase() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ai_todo_test'
  })

  try {
    // データベース接続確認
    await prisma.$connect()
    console.log('📊 テスト用データベース接続確認完了')

    // 既存データをクリア（テスト用データベースのみ）
    if (process.env.NODE_ENV === 'test') {
      await prisma.notification.deleteMany()
      await prisma.scheduleItem.deleteMany()
      await prisma.schedule.deleteMany()
      await prisma.taskTag.deleteMany()
      await prisma.tag.deleteMany()
      await prisma.subtask.deleteMany()
      await prisma.task.deleteMany()
      await prisma.projectMember.deleteMany()
      await prisma.project.deleteMany()
      await prisma.user.deleteMany()
      console.log('🗑️ テスト用データベースクリア完了')
    }

    // テスト用基本データの投入
    await seedTestData(prisma)
    
  } catch (error) {
    console.error('❌ データベースセットアップエラー:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * テスト用基本データの投入
 */
async function seedTestData(prisma: PrismaClient) {
  // テスト用ユーザー作成
  const testUser = await prisma.user.create({
    data: {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User'
    }
  })

  // テスト用プロジェクト作成
  const testProject = await prisma.project.create({
    data: {
      id: 'test-project-1',
      name: 'Test Project',
      description: 'E2Eテスト用プロジェクト',
      status: 'ACTIVE',
      color: '#3B82F6'
    }
  })

  // テスト用タスク作成
  await prisma.task.create({
    data: {
      id: 'test-task-1',
      title: 'E2Eテスト用タスク',
      description: 'Playwrightで自動テスト',
      status: 'TODO',
      priority: 'HIGH',
      projectId: testProject.id,
      assigneeId: testUser.id
    }
  })

  // テスト用スケジュール作成
  const testSchedule = await prisma.schedule.create({
    data: {
      id: 'test-schedule-1',
      userId: testUser.id,
      date: new Date('2025-08-28'),
      totalHours: 8,
      workingHours: 0,
      breakHours: 0
    }
  })

  console.log('📝 テスト用基本データ投入完了')
}

export default globalSetup