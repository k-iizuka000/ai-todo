/**
 * Playwright E2E テスト設定
 * グループ8: 統合テスト・バリデーション
 * 
 * レビュー指摘事項対応:
 * - Critical Issue 1: 真のEnd-to-Endテスト不足の解決
 * - ブラウザ環境での実際のDB統合テスト実装
 */

import { defineConfig, devices } from '@playwright/test'

/**
 * テスト環境設定
 */
const TEST_PORT = process.env.VITE_TEST_PORT || '3000'
const API_PORT = process.env.API_PORT || '3001'

export default defineConfig({
  // テストディレクトリ
  testDir: './e2e',
  
  // 並行実行設定（DB統合テストのため制限）
  fullyParallel: false,
  workers: 1, // DB競合を避けるため1つずつ実行
  
  // テスト失敗時のリトライ（CI環境でのみ）
  retries: process.env.CI ? 2 : 0,
  
  // レポーター設定
  reporter: [
    ['html', { outputDir: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['junit', { outputFile: 'playwright-results.xml' }]
  ],
  
  // グローバル設定
  use: {
    // ベースURL（開発サーバー）
    baseURL: `http://localhost:${TEST_PORT}`,
    
    // トレース設定（失敗時のみ）
    trace: 'on-first-retry',
    
    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',
    
    // ビデオ録画（失敗時のみ）
    video: 'retain-on-failure',
    
    // タイムアウト設定
    actionTimeout: 10000, // 10秒
    navigationTimeout: 30000, // 30秒
    
    // 待機設定
    waitForConsecutiveMessage: 500,
    
    // API設定
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  // プロジェクト設定（ブラウザ別）
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // ローカルストレージ、セッションストレージを有効
        storageState: undefined
      },
    },

    // タブレット・モバイル対応確認
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 13'],
        storageState: undefined
      },
    },
    
    // アクセシビリティ専用テスト
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: undefined
      },
      testMatch: '**/accessibility.e2e.ts'
    }
  ],

  // テストサーバー設定
  webServer: [
    {
      // フロントエンドサーバー
      command: 'npm run dev',
      port: parseInt(TEST_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2分
      env: {
        NODE_ENV: 'test',
        VITE_API_URL: `http://localhost:${API_PORT}`,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ai_todo_test'
      }
    },
    {
      // バックエンドサーバー
      command: 'cd server && npm run dev',
      port: parseInt(API_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000, // 1分
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ai_todo_test',
        PORT: API_PORT
      }
    }
  ],

  // グローバルセットアップ・ティアダウン
  globalSetup: './e2e/global.setup.ts',
  globalTeardown: './e2e/global.teardown.ts',

  // テストタイムアウト
  timeout: 60 * 1000, // 1分

  // 期待値のタイムアウト
  expect: {
    timeout: 10 * 1000, // 10秒
  },
})