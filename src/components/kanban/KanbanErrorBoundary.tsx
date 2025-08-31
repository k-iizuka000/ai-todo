/**
 * Kanban専用エラーバウンダリコンポーネント
 * Issue #026 Group 3 Task 3.1: KanbanBoardエラーバウンダリの特化実装
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Task } from '@/types/task';
import { TaskDataIntegrityChecker } from '@/utils/taskDataIntegrity';
import { trackValidationCall } from '@/utils/typeGuards';

// エラー情報の型定義
interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  timestamp: number;
  attemptedRecovery: boolean;
  recoverySuccess: boolean;
  lastTasks: Task[] | null;
}

// コンポーネントのProps型定義
interface KanbanErrorBoundaryProps {
  /** 子コンポーネント */
  children: ReactNode;
  /** エラー時のコールバック */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** リカバリ試行時のコールバック */
  onRecoveryAttempt?: () => void;
  /** リカバリ成功時のコールバック */
  onRecoverySuccess?: () => void;
  /** デバッグモード（開発環境での詳細情報表示） */
  enableDebugMode?: boolean;
  /** カスタムフォールバックUI */
  fallbackComponent?: React.ComponentType<{
    error: Error;
    retry: () => void;
    errorId: string;
  }>;
}

// 自動リカバリー機能のためのデータ整合性チェッカー
const integrityChecker = new TaskDataIntegrityChecker();

/**
 * Kanban専用エラーバウンダリコンポーネント
 * 
 * 機能:
 * - React Error Boundariesを使用したエラーキャッチ
 * - ユーザーフレンドリーなエラーUI表示
 * - 自動リカバリー機能
 * - 開発者向け詳細デバッグ情報
 * - タスクデータの整合性チェックと修復
 */
export class KanbanErrorBoundary extends Component<KanbanErrorBoundaryProps, ErrorState> {
  private retryCount = 0;
  private maxRetryAttempts = 3;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: KanbanErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      timestamp: 0,
      attemptedRecovery: false,
      recoverySuccess: false,
      lastTasks: null,
    };
  }

  /**
   * エラーをキャッチしてstate更新
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorState> {
    const errorId = `kanban-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      timestamp: Date.now(),
      attemptedRecovery: false,
      recoverySuccess: false,
    };
  }

  /**
   * エラー詳細情報の取得と外部通知
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // バリデーション呼び出し追跡
    trackValidationCall('KanbanErrorBoundary.componentDidCatch', 'error', Date.now());

    this.setState({
      errorInfo,
    });

    // 外部コールバック呼び出し
    try {
      this.props.onError?.(error, errorInfo);
    } catch (callbackError) {
      console.error('Error in onError callback:', callbackError);
    }

    // エラー詳細のコンソール出力
    this.logErrorDetails(error, errorInfo);

    // 自動リカバリの試行
    this.attemptAutoRecovery();
  }

  /**
   * エラー詳細のログ出力
   */
  private logErrorDetails(error: Error, errorInfo: ErrorInfo): void {
    const { errorId, timestamp } = this.state;
    
    console.group(`🚨 Kanban Error Boundary - ${errorId}`);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Timestamp:', new Date(timestamp).toISOString());
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('Error Stack:', error.stack);
    console.groupEnd();

    // 開発環境での詳細情報
    if (this.props.enableDebugMode || process.env.NODE_ENV === 'development') {
      console.group('🔧 Debug Information');
      console.log('Props:', this.props);
      console.log('State:', this.state);
      console.log('Retry Count:', this.retryCount);
      console.groupEnd();
    }
  }

  /**
   * 自動リカバリの試行
   */
  private attemptAutoRecovery(): void {
    if (this.state.attemptedRecovery || this.retryCount >= this.maxRetryAttempts) {
      return;
    }

    this.setState({ attemptedRecovery: true });
    this.props.onRecoveryAttempt?.();

    // タスクデータの整合性チェックと修復
    this.performDataIntegrityRecovery().catch(error => {
      console.error('Error in data integrity recovery:', error);
    });

    // 2秒後にリセットを試行
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, 2000);
  }

  /**
   * データ整合性を使用した復旧処理
   */
  private async performDataIntegrityRecovery(): Promise<void> {
    try {
      // ローカルストレージからの最後の既知の良好な状態を復元
      const savedTasks = localStorage.getItem('kanban-backup-tasks');
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks) as Task[];
        
        // データ整合性チェック
        const integrityReport = await integrityChecker.checkIntegrity(tasks, { enableAutoFix: true });
        
        if (integrityReport.qualityScore >= 70) {
          // 自動修復が既に適用されているため、元のタスクをそのまま使用
          const repairedTasks = tasks;
          this.setState({ lastTasks: repairedTasks });
          
          console.log('🔧 Data integrity recovery successful:', {
            originalTaskCount: tasks.length,
            repairedTaskCount: repairedTasks.length,
            qualityScore: integrityReport.qualityScore,
          });
        }
      }
    } catch (recoveryError) {
      console.error('Error during data integrity recovery:', recoveryError);
    }
  }

  /**
   * エラーのリセットとリトライ
   */
  private handleRetry = (): void => {
    this.retryCount++;
    
    try {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        timestamp: 0,
        attemptedRecovery: false,
        recoverySuccess: true,
        lastTasks: null,
      });

      this.props.onRecoverySuccess?.();
      
      console.log('🎯 Kanban Error Boundary recovery successful');
    } catch (error) {
      console.error('Error during retry:', error);
      this.setState({ recoverySuccess: false });
    }
  };

  /**
   * 手動リトライハンドラー
   */
  private handleManualRetry = (): void => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
    
    this.retryCount = 0; // 手動リトライの場合はカウントをリセット
    this.handleRetry();
  };

  /**
   * コンポーネントのアンマウント時のクリーンアップ
   */
  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // カスタムフォールバックコンポーネントが指定されている場合
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error}
            retry={this.handleManualRetry}
            errorId={this.state.errorId}
          />
        );
      }

      // デフォルトのエラーUI
      return this.renderDefaultErrorUI();
    }

    return this.props.children;
  }

  /**
   * デフォルトのエラーUIレンダリング
   */
  private renderDefaultErrorUI(): ReactNode {
    const { error, errorId, timestamp, attemptedRecovery, recoverySuccess } = this.state;
    const { enableDebugMode } = this.props;
    const isDebugMode = enableDebugMode || process.env.NODE_ENV === 'development';

    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="max-w-md w-full bg-white rounded-lg border border-red-200 shadow-lg">
          {/* エラーヘッダー */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  カンバンボードでエラーが発生しました
                </h3>
                <p className="text-sm text-gray-600">
                  一時的な問題が発生している可能性があります。
                </p>
              </div>
            </div>
          </div>

          {/* エラー詳細とアクション */}
          <div className="p-6">
            {/* ユーザーフレンドリーなエラーメッセージ */}
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                {this.getUserFriendlyMessage(error)}
              </p>
              
              {/* リカバリ状況の表示 */}
              {attemptedRecovery && (
                <div className={`text-xs p-2 rounded ${
                  recoverySuccess 
                    ? 'bg-green-50 text-green-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {recoverySuccess ? '✅ 自動復旧を試行中...' : '🔄 復旧を試行しています...'}
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="space-y-2">
              <button
                onClick={this.handleManualRetry}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                再試行
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-md transition-colors"
              >
                ページを再読み込み
              </button>
            </div>

            {/* デバッグ情報（開発環境のみ） */}
            {isDebugMode && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  🔧 開発者向け情報
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded border overflow-auto max-h-32">
                  <div className="space-y-1">
                    <div><strong>Error ID:</strong> {errorId}</div>
                    <div><strong>Timestamp:</strong> {new Date(timestamp).toLocaleString()}</div>
                    <div><strong>Retry Count:</strong> {this.retryCount}/{this.maxRetryAttempts}</div>
                    <div><strong>Error Message:</strong> {error?.message}</div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="text-xs mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  /**
   * ユーザーフレンドリーなエラーメッセージの生成
   */
  private getUserFriendlyMessage(error: Error | null): string {
    if (!error) return 'エラーの詳細を取得できませんでした。';

    const message = error.message.toLowerCase();
    
    // よくあるエラーパターンに対するユーザーフレンドリーなメッセージ
    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワーク接続に問題がある可能性があります。インターネット接続をご確認ください。';
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'アクセス権限に問題があります。ページを再読み込みしてください。';
    }
    
    if (message.includes('out of memory') || message.includes('memory')) {
      return 'メモリ不足が発生しました。他のタブやアプリケーションを閉じてお試しください。';
    }
    
    if (message.includes('timeout')) {
      return '処理がタイムアウトしました。再試行してください。';
    }
    
    if (message.includes('undefined') || message.includes('null')) {
      return 'データの読み込みで問題が発生しました。ページを再読み込みしてください。';
    }

    // デフォルトメッセージ
    return 'アプリケーションで予期しない問題が発生しました。';
  }
}

/**
 * Kanban Error Boundaryのユーティリティ関数
 */
export const withKanbanErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<KanbanErrorBoundaryProps>
): React.ComponentType<P> => {
  return (props: P) => (
    <KanbanErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </KanbanErrorBoundary>
  );
};