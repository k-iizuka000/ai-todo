/**
 * スケジュール機能専用のエラーバウンダリコンポーネント
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBoundary, ErrorFallbackProps } from '@/components/common/ErrorBoundary';

/**
 * スケジュール専用のエラーフォールバックコンポーネント
 */
const ScheduleErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <div className="h-full flex items-center justify-center p-6">
    <Card className="p-8 max-w-lg mx-auto">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <Calendar className="h-12 w-12 text-gray-300" />
            <AlertTriangle className="h-6 w-6 text-red-500 absolute -top-1 -right-1" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            スケジュール機能でエラーが発生しました
          </h2>
          <p className="text-sm text-gray-600">
            日時スケジュール機能の読み込み中にエラーが発生しました。
            再試行するか、カレンダーページに戻ってお試しください。
          </p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <details className="text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
              エラー詳細
            </summary>
            <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-all">
              {error.name}: {error.message}
              {process.env.NODE_ENV === 'development' && error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={resetError}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            再試行
          </Button>
          
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            カレンダーに戻る
          </Button>
          
          <Button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            ページを再読み込み
          </Button>
        </div>
      </div>
    </Card>
  </div>
);

/**
 * スケジュール機能専用のエラーバウンダリ
 */
interface ScheduleErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const ScheduleErrorBoundary: React.FC<ScheduleErrorBoundaryProps> = ({ 
  children, 
  onError 
}) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // スケジュール専用のエラーログ
    console.error('Schedule Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });
    
    // 外部コールバックがあれば呼び出し
    onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary fallback={ScheduleErrorFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

export default ScheduleErrorBoundary;