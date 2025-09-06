/**
 * エラーバウンダリコンポーネント
 * Reactコンポーネントツリー内でJavaScriptエラーをキャッチし、
 * フォールバックUIを表示する
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { logger, logError, logSecurityEvent } from '@/lib/logger';
import { getSecureErrorLog } from '@/lib/api/errors';
import { useConnectionStore, useConnectionStatus, useConnectionError } from '@/stores/connectionStore';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  useApiConnectionFallback?: boolean; // API接続エラー用フォールバックを使用するかどうか
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
 * API接続エラー専用のフォールバックコンポーネント
 */
const ApiConnectionErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const connectionStatus = useConnectionStatus();
  const connectionError = useConnectionError();
  const { setReconnecting, setConnected } = useConnectionStore();

  const isConnectionError = (error: Error) => {
    const message = error.message?.toLowerCase() || '';
    return message.includes('connection') || 
           message.includes('network') || 
           message.includes('failed to fetch') ||
           message.includes('refused') ||
           message.includes('timeout');
  };

  const handleRetryConnection = async () => {
    try {
      setReconnecting(1);
      
      // APIヘルスチェックを試行
      const response = await fetch('/api/health', { 
        method: 'GET',
        timeout: 5000 
      } as any);
      
      if (response.ok) {
        setConnected();
        resetError();
      } else {
        throw new Error('API health check failed');
      }
    } catch (retryError) {
      console.error('Connection retry failed:', retryError);
      // エラー状態を維持
    }
  };

  if (!isConnectionError(error)) {
    return <DefaultErrorFallback error={error} resetError={resetError} />;
  }

  return (
    <Card className="p-8 max-w-lg mx-auto mt-8 border-red-200">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          {connectionStatus === 'offline' ? (
            <WifiOff className="h-12 w-12 text-red-500" />
          ) : connectionStatus === 'reconnecting' ? (
            <RefreshCw className="h-12 w-12 text-yellow-500 animate-spin" />
          ) : (
            <Wifi className="h-12 w-12 text-green-500" />
          )}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            API接続エラー
          </h2>
          <p className="text-sm text-gray-600">
            {connectionStatus === 'reconnecting' 
              ? 'サーバーへの接続を試行中です...'
              : 'サーバーとの接続に問題が発生しました。ネットワーク接続を確認してから再試行してください。'
            }
          </p>
        </div>

        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
          <p className="text-sm font-medium text-red-800">接続状態: {connectionStatus}</p>
          {connectionError && (
            <p className="text-xs text-red-600 mt-1">{connectionError.message}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={handleRetryConnection}
            disabled={connectionStatus === 'reconnecting'}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {connectionStatus === 'reconnecting' ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            接続を再試行
          </Button>
          
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            ページを再読み込み
          </Button>
        </div>

        <div className="text-xs text-gray-500">
          問題が継続する場合は、管理者にお問い合わせください。
        </div>
      </div>
    </Card>
  );
};

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
    // 統合ログシステムを使用したセキュアなエラーログ
    const secureErrorLog = getSecureErrorLog(error);
    const errorContext = {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary',
      feature: 'global_error_boundary',
      timestamp: new Date().toISOString(),
      ...secureErrorLog
    };
    
    logger.error('ErrorBoundary caught an error', errorContext, error);
    
    // セキュリティ関連エラーの検出
    if (this.isSecurityRelatedError(error)) {
      logSecurityEvent('Potential security-related error in ErrorBoundary', 'high', {
        errorName: error.name,
        errorMessage: error.message,
        componentStack: errorInfo.componentStack
      });
    }
    
    // 外部コールバックがあれば呼び出し
    this.props.onError?.(error, errorInfo);
  }
  
  /**
   * セキュリティ関連のエラーかどうかを判定
   */
  private isSecurityRelatedError(error: Error): boolean {
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    
    const securityKeywords = [
      'xss', 'script injection', 'eval', 'dangerouslySetInnerHTML',
      'unauthorized', 'forbidden', 'csrf', 'cors', 'content security policy'
    ];
    
    return securityKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // API接続エラー用フォールバックが有効でカスタムフォールバックが指定されていない場合
      const FallbackComponent = 
        this.props.useApiConnectionFallback && !this.props.fallback 
          ? ApiConnectionErrorFallback 
          : this.props.fallback || DefaultErrorFallback;
      
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
    // 統合ログシステムを使用
    const context = {
      source: 'useErrorHandler',
      additionalInfo: errorInfo,
      timestamp: new Date().toISOString()
    };
    
    logError(error, context);
    
    // パフォーマンス関連のエラー追跡
    if (error.message?.includes('timeout') || error.message?.includes('performance')) {
      logger.warn('Performance-related error detected', {
        category: 'performance',
        errorMessage: error.message,
        ...context
      });
    }
    
    // 開発環境での詳細ログ（統合ロガーを使用）
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Error Handler Details', {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        additionalInfo: errorInfo
      });
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