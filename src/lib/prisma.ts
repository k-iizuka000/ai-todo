/**
 * Prisma Client設定ファイル
 * Connection pooling最適化とエラーハンドリングを実装
 */

import { PrismaClient } from '@prisma/client'

// グローバル型定義の拡張
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

/**
 * Prisma Client設定オプション
 * 設計書のConnection pooling最適化要件に基づく
 */
const prismaClientOptions = {
  // ログ設定（開発環境でのデバッグ用）
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] as const
    : ['error'] as const,
  
  // エラーフォーマット設定
  errorFormat: 'pretty' as const,
  
  // データソース設定
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
}

/**
 * Connection Pool設定
 */
const connectionPoolConfig = {
  // 最大接続数
  connectionLimit: parseInt(process.env.DB_POOL_MAX || '20'),
  
  // 最小接続数
  poolSize: parseInt(process.env.DB_POOL_MIN || '2'),
  
  // アイドルタイムアウト（ミリ秒）
  idleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '10000'),
  
  // 接続タイムアウト（ミリ秒）
  connectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
}

/**
 * Prisma Client インスタンス作成関数
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient(prismaClientOptions)
  
  // 接続時の設定
  client.$on('beforeExit', async () => {
    console.log('Prisma Client disconnecting...')
  })
  
  return client
}

/**
 * 本番環境での接続プール最適化
 * 開発環境では毎回新しいインスタンスを作成（ホットリロード対応）
 */
export const prisma = (() => {
  if (process.env.NODE_ENV === 'production') {
    // 本番環境: シングルトンパターン
    return createPrismaClient()
  } else {
    // 開発環境: グローバル変数を使用してホットリロード対応
    if (!global.prisma) {
      global.prisma = createPrismaClient()
    }
    return global.prisma
  }
})()

/**
 * データベース接続テスト関数
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

/**
 * データベース切断関数
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect()
    console.log('✅ Database disconnected successfully')
  } catch (error) {
    console.error('❌ Database disconnection error:', error)
  }
}

/**
 * ヘルスチェック関数
 * API endpoints で使用
 */
export async function healthCheck(): Promise<{
  database: boolean
  timestamp: string
  connectionCount?: number
}> {
  try {
    // 簡単なクエリでデータベースの生存確認
    await prisma.$queryRaw`SELECT 1`
    
    // 接続数の取得（PostgreSQL specific）
    const connectionInfo = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
    `
    
    return {
      database: true,
      timestamp: new Date().toISOString(),
      connectionCount: Number(connectionInfo[0]?.count || 0)
    }
  } catch (error) {
    console.error('Health check failed:', error)
    return {
      database: false,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * トランザクション実行ヘルパー
 * 型安全なトランザクション処理
 */
export async function executeTransaction<T>(
  callback: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback, {
    // トランザクションタイムアウト: 10秒
    timeout: 10000,
    
    // 分離レベル: Read Committed (デフォルト)
    isolationLevel: 'ReadCommitted'
  })
}

/**
 * バッチ操作のヘルパー関数
 * パフォーマンス最適化のため
 */
export const batchOperations = {
  /**
   * バッチ作成
   */
  async createMany<T extends Record<string, any>>(
    model: keyof typeof prisma,
    data: T[]
  ) {
    // @ts-ignore - Dynamic model access
    return prisma[model].createMany({
      data,
      skipDuplicates: true
    })
  },

  /**
   * バッチ更新
   */
  async updateMany<T extends Record<string, any>>(
    model: keyof typeof prisma,
    where: any,
    data: Partial<T>
  ) {
    // @ts-ignore - Dynamic model access  
    return prisma[model].updateMany({
      where,
      data
    })
  },

  /**
   * バッチ削除
   */
  async deleteMany(
    model: keyof typeof prisma,
    where: any
  ) {
    // @ts-ignore - Dynamic model access
    return prisma[model].deleteMany({ where })
  }
}

// デフォルトエクスポート
export default prisma

// 型定義のエクスポート
export type { 
  User, 
  Task, 
  Project, 
  Tag,
  TaskStatus,
  Priority,
  ProjectStatus,
  ProjectPriority 
} from '@prisma/client'