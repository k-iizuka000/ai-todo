/**
 * エラーバウンダリコンポーネント
 * Reactコンポーネントツリー内でJavaScriptエラーをキャッチし、
 * フォールバックUIを表示する
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * デフォルトのエラーフォールバックコンポーネント
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <Card className="p-8 max-w-lg mx-auto mt-8">
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          予期しないエラーが発生しました
        </h2>
        <p className="text-sm text-gray-600">
          アプリケーションの実行中にエラーが発生しました。
          ページを再読み込みするか、しばらく時間をおいてからお試しください。
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
          onClick={() => window.location.reload()}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          ページを再読み込み
        </Button>
      </div>
    </div>
  </Card>
);

/**
 * エラーバウンダリクラスコンポーネント
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ログ出力
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 外部コールバックがあれば呼び出し
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * カスタムフックとしてのエラーバウンダリ
 * 関数コンポーネントでエラー境界を使用するためのフック
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Manual error handling:', error);
    
    // 本来はエラーレポーティングサービスに送信
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Details');
      console.error('Error:', error);
      console.error('Additional Info:', errorInfo);
      console.error('Stack:', error.stack);
      console.groupEnd();
    }
  }, []);

  return handleError;
};

/**
 * 高階コンポーネント（HOC）としてのエラーバウンダリ
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<ErrorFallbackProps>
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} ref={ref} />
    </ErrorBoundary>
  ));

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};