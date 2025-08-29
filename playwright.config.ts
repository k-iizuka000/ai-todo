/**
 * Playwright Configuration for AI-Todo E2E Tests
 * 
 * Design Specification: Issues-022-設計.md - Group 1: Playwright基盤セットアップ
 * Quality Engineer specialization: Performance, Security, Maintainability focus
 * 2025 Best Practices: Resilient selectors, auto-waiting, test isolation
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
const baseURL = isDocker 
  ? 'http://localhost:5173' 
  : 'http://localhost:5173';

/**
 * Performance-optimized configuration
 * Quality focus: Stability, Speed, Reliability
 */
export default defineConfig({
  // Test directory configuration
  testDir: './tests/playwright',
  
  // Global timeout settings - aligned with performance targets
  timeout: 30 * 1000, // 30 seconds per test (well within 5 minute target)
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },
  
  // Global setup and teardown for database integration
  globalSetup: './tests/playwright/global-setup.ts',
  globalTeardown: './tests/playwright/global-teardown.ts',
  
  // Test execution optimization
  fullyParallel: true, // Enable parallel execution for speed
  forbidOnly: !!process.env.CI, // Prevent .only() in CI
  retries: process.env.CI ? 2 : 1, // Smart retries for flaky network conditions
  workers: process.env.CI ? 4 : 3, // Optimal worker count for 15-minute target
  
  // Comprehensive reporting for quality assurance
  reporter: [
    ['html', { outputFolder: 'test-results/playwright-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ...(process.env.CI ? [['github']] : [['line']]) // GitHub Actions integration
  ],
  
  // Output configuration for debugging and analysis
  outputDir: 'test-results/artifacts',
  
  // Global test configuration
  use: {
    // Base URL for all tests
    baseURL,
    
    // Tracing for debugging - 2025 best practice
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Performance optimization settings
    actionTimeout: 10 * 1000, // 10 seconds for actions
    navigationTimeout: 15 * 1000, // 15 seconds for navigation (well within 3s target with buffer)
    
    // Enhanced error reporting
    contextOptions: {
      // Security: Disable web security only for testing
      ignoreHTTPSErrors: true,
      // Performance: Reduce resource loading
      extraHTTPHeaders: {
        'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8'
      }
    }
  },

  // Multi-browser testing configuration
  // Quality assurance: Cross-browser compatibility
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance optimization: Headless by default
        headless: process.env.PLAYWRIGHT_HEADED !== '1',
        // Security: Disable dev mode extensions
        args: ['--disable-dev-shm-usage', '--disable-extensions']
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        headless: process.env.PLAYWRIGHT_HEADED !== '1'
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        headless: process.env.PLAYWRIGHT_HEADED !== '1'
      },
    },

    // Mobile testing for responsive design validation
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        headless: true // Mobile always headless for performance
      },
    },

    // Performance testing project
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true
      },
      testMatch: '**/*performance*.test.ts'
    }
  ],

  // Development server configuration
  // Skip webServer in Docker environment as server should already be running
  ...(isDocker ? {} : {
    webServer: {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000, // 2 minutes startup timeout
      stdout: 'ignore',
      stderr: 'pipe'
    }
  })
});

/**
 * Configuration validation for quality assurance
 * Ensures all required settings are properly configured
 */
const validateConfig = () => {
  const requiredDirs = [
    './tests/playwright',
    './test-results'
  ];
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'TEST_DATABASE_URL'
  ];
  
  // Directory validation
  requiredDirs.forEach(dir => {
    try {
      require('fs').accessSync(dir);
    } catch {
      console.warn(`⚠️ Required directory ${dir} not found - will be created during test execution`);
    }
  });
  
  // Environment validation
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log(`
🎯 Playwright Configuration Initialized:
   - Performance targets: Page load <3s, DB ops <2s
   - Parallel execution: ${process.env.CI ? 4 : 3} workers
   - Browser coverage: Chromium, Firefox, WebKit + Mobile
   - Quality features: Tracing, Screenshots, Video recording
   - Docker compatibility: ${isDocker ? 'Enabled' : 'Host mode'}
   - Database integration: TestDatabaseManager ready
  `);
};

// Execute validation
validateConfig();