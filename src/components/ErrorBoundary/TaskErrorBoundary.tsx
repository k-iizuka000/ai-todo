/**
 * Task Error Boundary
 * タスク関連のエラー処理とフォールバック UI
 */

import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class TaskErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Task Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mb-6">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                タスクの読み込みに失敗しました
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                一時的な問題が発生している可能性があります。しばらく後にもう一度お試しください。
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 p-3 bg-gray-100 rounded text-left text-xs">
                  <summary className="font-mono cursor-pointer">
                    Error Details (Dev Mode)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {this.state.error?.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
            
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Fallback component for API errors
export const TaskApiErrorFallback: React.FC<{
  error: Error;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <AlertCircle className="h-5 w-5 text-red-400" />
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-red-800">
          データの取得に失敗しました
        </h3>
        <p className="mt-1 text-sm text-red-700">
          {error.message || 'ネットワークエラーが発生しました'}
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={onRetry}
            className="bg-red-100 px-3 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            再試行
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Network error fallback
export const NetworkErrorFallback: React.FC<{
  onRetry: () => void;
}> = ({ onRetry }) => (
  <div className="min-h-[300px] flex items-center justify-center">
    <div className="text-center">
      <div className="text-6xl mb-4">📡</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        ネットワークに接続できません
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        インターネット接続を確認して、もう一度お試しください
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        再接続
      </button>
    </div>
  </div>
);

// Loading error fallback
export const LoadingErrorFallback: React.FC<{
  error: Error;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 my-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <AlertCircle className="h-5 w-5 text-yellow-400" />
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-yellow-800">
          読み込み中にエラーが発生しました
        </h3>
        <p className="mt-1 text-sm text-yellow-700">
          {error.message}
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={onRetry}
            className="bg-yellow-100 px-3 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            再読み込み
          </button>
        </div>
      </div>
    </div>
  </div>
);