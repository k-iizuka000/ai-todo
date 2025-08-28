import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Query Clientの設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // デフォルトのstaleTime（データが古くなるまでの時間）
      staleTime: 5 * 60 * 1000, // 5分
      // デフォルトのcacheTime（キャッシュが削除されるまでの時間）
      cacheTime: 10 * 60 * 1000, // 10分
      // エラー時のリトライ設定
      retry: (failureCount, error) => {
        // 401, 403エラーはリトライしない
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status;
          if (status === 401 || status === 403) {
            return false;
          }
        }
        // その他のエラーは最大3回までリトライ
        return failureCount < 3;
      },
      // リトライ間隔（指数バックオフ）
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // バックグラウンドでの自動リフェッチを無効化
      refetchOnWindowFocus: false,
      // ネットワーク復旧時の自動リフェッチを有効化
      refetchOnReconnect: true,
    },
    mutations: {
      // ミューテーションのリトライ設定
      retry: (failureCount, error) => {
        // POST/PUT/DELETEは基本的にリトライしない
        return false;
      },
      // エラー時のグローバルハンドリング
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * React QueryとToastの統合プロバイダー
 */
export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* Toast通知 */}
      <Toaster
        position="top-right"
        toastOptions={{
          // デフォルトの表示時間
          duration: 4000,
          // スタイル設定
          style: {
            background: '#363636',
            color: '#fff',
          },
          // 成功メッセージのスタイル
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          // エラーメッセージのスタイル
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          // 読み込み中メッセージのスタイル
          loading: {
            duration: Infinity,
          },
        }}
      />
      
      {/* React Query DevTools（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
};

export default QueryProvider;