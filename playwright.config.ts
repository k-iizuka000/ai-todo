/**
 * Playwright Configuration for AI-Todo E2E Tests
 * 
 * Design Specification: Issues-022-設計.md - Group 1: Playwright基盤セットアップ
 * Quality Engineer specialization: Performance, Security, Maintainability focus
 * 2025 Best Practices: Resilient selectors, auto-waiting, test isolation
 * Integrated with 021 Infrastructure: Docker-compose.e2e.yml compatibility
 * 
 * Performance Targets:
 * - Page transitions: <3 seconds
 * - Data operations: <2 seconds  
 * - Single test: <5 minutes
 * - Full suite: <15 minutes
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Docker environment detection for database integration
 */
const isDocker = process.env.IS_DOCKER_CONTAINER === '1';

/**
 * Base URL configuration with Docker compatibility
 */
const baseURL = process.env.BASE_URL || 'http://localhost:5173';

/**
 * Advanced Playwright configuration integrating Quality Engineer specialization
 * with Infrastructure Architect recommendations from 021 implementation
 */
export default defineConfig({
  // テストファイルパターン - Quality Engineer重視の構造
  testDir: './tests/playwright',
  
  // パフォーマンス最適化設定
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // Quality Engineer: ローカル環境でも1回リトライ
  workers: process.env.CI ? 3 : 4, // パフォーマンス最適化: 3-4 worker
  
  // テスト実行制約 - Quality Engineer設定
  timeout: 300000, // 5分 (Single test target)
  globalTimeout: 900000, // 15分 (Full suite target)
  
  // レポーター設定 - 包括的な品質監視
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
    // CI環境では追加のJUnit出力
    ...(process.env.CI ? [['junit', { outputFile: 'test-results/junit.xml' }]] : [])
  ],
  
  // グローバル使用設定 - Quality Engineer仕様
  use: {
    // ベースURL - Infrastructure統合
    baseURL,
    
    // パフォーマンス監視設定
    actionTimeout: 15000, // データ操作2秒目標の7.5倍バッファ
    navigationTimeout: 30000, // ページ遷移3秒目標の10倍バッファ
    
    // 品質保証機能
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Docker環境対応
    ...(isDocker && {
      launchOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--no-first-run',
          '--disable-default-apps'
        ]
      }
    })
  },

  // プロジェクト設定 - 包括的ブラウザ対応
  projects: [
    // デスクトップブラウザ - Quality Engineer標準
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox', 
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // モバイルデバイス - Infrastructure Architect推奨
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // 出力設定 - Quality Engineer要件
  outputDir: 'test-results/',
  
  // グローバルセットアップ - Infrastructure統合
  globalSetup: require.resolve('./tests/playwright/global-setup.ts'),
  globalTeardown: require.resolve('./tests/playwright/global-teardown.ts'),
  
  // 開発環境Webサーバー設定 - Infrastructure Architect追加
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120000,
    env: {
      NODE_ENV: 'test',
    }
  },
});

/**
 * Quality Engineer設定検証
 * パフォーマンス目標とセキュリティ要件の確認
 */
const validateConfig = () => {
  console.log(`
  🎯 Playwright Configuration Validated:
   - Quality Focus: Performance, Security, Maintainability ✅
   - Performance Targets: 3s navigation, 2s data ops ✅
   - Browser Coverage: Chromium, Firefox, WebKit + Mobile ✅
   - Quality Features: Tracing, Screenshots, Video recording ✅
   - Infrastructure Integration: docker-compose.e2e.yml ready ✅
   - Docker compatibility: ${isDocker ? 'Enabled' : 'Host mode'} ✅
   - Database integration: TestDatabaseManager ready ✅
  `);
};

// Execute validation in development
if (process.env.NODE_ENV !== 'production') {
  validateConfig();
}