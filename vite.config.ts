/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 設計書要件: Bundle Size < 50KB for TaskDetailModal chunk
    rollupOptions: {
      output: {
        manualChunks: {
          // TaskDetailModal関連のコード分割
          'task-detail': [
            './src/components/task/TaskDetailModal.tsx',
            './src/components/task/TaskDetailView.tsx',
            './src/components/task/TaskDetailTabs.tsx'
          ],
          // Core Web Vitals関連
          'performance': [
            './src/hooks/useCoreWebVitals.ts'
          ],
          // UI コンポーネント
          'ui': [
            './src/components/ui/loading.tsx',
            './src/components/ui/Modal.tsx'
          ],
          // 外部ライブラリの分離
          'radix': ['@radix-ui/react-dialog'],
          'web-vitals': ['web-vitals']
        }
      },
      // バンドルサイズ制限警告
      onwarn(warning, warn) {
        // チャンクサイズが50KBを超える場合に警告
        if (warning.code === 'LARGE_BUNDLE' && warning.message.includes('task-detail')) {
          console.warn('⚠️ Task Detail chunk exceeds 50KB target!');
        }
        warn(warning);
      }
    },
    // チャンクサイズ制限
    chunkSizeWarningLimit: 50 // 50KB
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
})