/**
 * Playwright グローバルティアダウン
 * グループ8: 統合テスト・バリデーション
 */

import { FullConfig } from '@playwright/test'
import { PrismaClient } from '@prisma/client'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 E2E テストのグローバルティアダウンを開始...')

  // テスト用データベースのクリーンアップ
  await cleanupTestDatabase()

  console.log('✅ E2E テストのグローバルティアダウン完了')
}

/**
 * テスト用データベースのクリーンアップ
 */
async function cleanupTestDatabase() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ai_todo_test'
  })

  try {
    await prisma.$connect()

    // テスト環境でのみクリーンアップを実行
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
      console.log('🗑️ テスト用データクリーンアップ完了')
    }
    
  } catch (error) {
    console.error('❌ データベースクリーンアップエラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

export default globalTeardown