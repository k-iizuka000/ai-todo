/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { ExecSyncOptions } from 'child_process'

/**
 * 環境変数バリデーション設定
 * Issue 047: 環境変数設定の自動検証機能
 */
const ENV_VALIDATION_CONFIG = {
  scope: 'frontend',
  command: 'node scripts/env-validator.cjs',
  enabledModes: ['development']
} as const;

/**
 * 環境変数検証を実行する関数
 * Issue 047: 環境変数設定の自動検証機能
 */
async function validateEnvironmentVariables() {
  try {
    // Node.jsのchildProcessを使用してバリデーターを実行（型安全性向上）
    const { execSync }: { execSync: (command: string, options?: ExecSyncOptions) => Buffer } = await import('child_process');
    
    // フロントエンドスコープで環境変数バリデーションを実行
    const command = `${ENV_VALIDATION_CONFIG.command} --scope=${ENV_VALIDATION_CONFIG.scope}`;
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('✅ Environment validation passed');
    return true;
  } catch (error) {
    console.error('🔴 Environment validation failed');
    console.error('Please fix your environment configuration before continuing.');
    process.exit(1);
  }
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // 環境変数検証をビルドプロセスに統合
  // 設定で指定されたモードでのみ実行（productionでは外部で実行済み前提）
  if (ENV_VALIDATION_CONFIG.enabledModes.includes(mode as any)) {
    await validateEnvironmentVariables();
  }
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: true, // ネットワークからのアクセス許可
      strictPort: true, // ポート5173が使用できない場合は失敗させる
      proxy: {
        '/api': {
          target: 'http://api-layer:3003',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      css: true,
      typecheck: {
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
      },
    },
  };
})