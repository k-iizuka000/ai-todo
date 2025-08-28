/**
 * タスク機能専用のエラーバウンダリコンポーネント
 * Task CRUD操作、フィルタリング、並び替え等の専用エラーハンドリング
 */

import React from 'react';
import { AlertTriangle, RefreshCw, CheckSquare, Database, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBoundary, ErrorFallbackProps } from '@/components/common/ErrorBoundary';
import { logger, logError, logSecurityEvent } from '@/lib/logger';
import { getSecureErrorLog } from '@/lib/api/errors';

/**
 * タスクエラーの種類を判定するヘルパー関数
 */
const getTaskErrorType = (error: Error) => {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  if (message.includes('crud') || message.includes('create') || message.includes('update') || message.includes('delete')) {
    return 'crud';
  }
  if (message.includes('filter') || message.includes('sort') || message.includes('search')) {
    return 'filter';
  }
  if (message.includes('database') || message.includes('prisma') || message.includes('sql')) {
    return 'database';
  }
  if (message.includes('validation') || message.includes('schema') || message.includes('zod')) {
    return 'validation';
  }
  if (message.includes('subtask') || stack.includes('subtask')) {
    return 'subtask';
  }
  return 'general';
};

/**
 * エラーアイコンを取得するヘルパー関数
 */
const getErrorIcon = (errorType: string) => {
  switch (errorType) {
    case 'crud':
      return <CheckSquare className="h-12 w-12 text-blue-500" />;
    case 'filter':
      return <Filter className="h-12 w-12 text-yellow-500" />;
    case 'database':
      return <Database className="h-12 w-12 text-red-500" />;
    case 'validation':
      return <AlertTriangle className="h-12 w-12 text-orange-500" />;
    case 'subtask':
      return <CheckSquare className="h-12 w-12 text-purple-500" />;
    default:
      return <AlertTriangle className="h-12 w-12 text-red-500" />;
  }
};

/**
 * エラーメッセージとアドバイスを取得するヘルパー関数
 */
const getErrorContent = (errorType: string) => {
  switch (errorType) {
    case 'crud':
      return {
        title: 'タスクの保存・更新でエラーが発生しました',
        description: 'タスクの作成、編集、削除操作中に問題が発生しました。データベース接続またはデータ検証に問題がある可能性があります。',
        advice: [
          '• 入力データを確認してください',
          '• インターネット接続を確認してください', 
          '• しばらく時間を置いてから再試行してください'
        ]
      };
    case 'filter':
      return {
        title: 'タスクフィルタ・検索でエラーが発生しました',
        description: 'タスクの絞り込み、検索、並び替え機能でエラーが発生しました。',
        advice: [
          '• フィルタ条件をリセットしてください',
          '• 検索キーワードを変更してください',
          '• ページを再読み込みしてください'
        ]
      };
    case 'database':
      return {
        title: 'データベース接続エラーが発生しました',
        description: 'タスクデータベースとの通信に失敗しました。サーバーまたはネットワークに問題がある可能性があります。',
        advice: [
          '• ネットワーク接続を確認してください',
          '• サーバーの状態を確認してください',
          '• 管理者にお問い合わせください'
        ]
      };
    case 'validation':
      return {
        title: 'タスクデータの検証エラーが発生しました',
        description: 'タスクのデータ形式または必須項目に問題があります。',
        advice: [
          '• 必須フィールドを確認してください',
          '• 日付形式を確認してください',
          '• データの形式を確認してください'
        ]
      };
    case 'subtask':
      return {
        title: 'サブタスク操作でエラーが発生しました',
        description: 'サブタスクの追加、編集、削除操作中に問題が発生しました。',
        advice: [
          '• サブタスクの階層制限を確認してください',
          '• 親タスクの状態を確認してください',
          '• タスクを再読み込みしてください'
        ]
      };
    default:
      return {
        title: 'タスク機能でエラーが発生しました',
        description: 'タスク管理機能の処理中に予期しないエラーが発生しました。',
        advice: [
          '• ページを再読み込みしてください',
          '• ブラウザのキャッシュをクリアしてください',
          '• 問題が継続する場合は管理者にお問い合わせください'
        ]
      };
  }
};

/**
 * タスク機能専用のエラーフォールバックコンポーネント
 */
const TaskErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const errorType = getTaskErrorType(error);
  const errorIcon = getErrorIcon(errorType);
  const errorContent = getErrorContent(errorType);

  // 統合ログシステムを使用したエラーログ
  React.useEffect(() => {
    const secureErrorLog = getSecureErrorLog(error);
    const taskErrorContext = {
      feature: 'task',
      component: 'TaskErrorBoundary',
      errorType,
      userInterface: 'fallback_ui_displayed',
      ...secureErrorLog
    };
    
    logger.error('Task Error Boundary activated', taskErrorContext, error);
    
    // タスク関連のセキュリティイベントの検出
    if (errorType === 'validation' || errorType === 'database') {
      logSecurityEvent('Task data integrity issue detected', 'medium', {
        errorType,
        errorMessage: error.message
      });
    }
    
    // パフォーマンス関連のメトリクス
    logger.info('Task Error Boundary Performance Impact', {
      category: 'performance',
      feature: 'task',
      errorType,
      fallbackRendered: true,
      timestamp: new Date().toISOString()
    });
  }, [error, errorType]);

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="p-8 max-w-lg mx-auto">
        <div className="text-center space-y-4">
          {/* エラーアイコン */}
          <div className="flex justify-center">
            {errorIcon}
          </div>
          
          {/* エラーメッセージ */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              {errorContent.title}
            </h2>
            <p className="text-sm text-gray-600">
              {errorContent.description}
            </p>
          </div>

          {/* 解決方法のアドバイス */}
          <div className="bg-blue-50 p-4 rounded-lg text-left">
            <h3 className="text-sm font-medium text-blue-900 mb-2">解決方法:</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              {errorContent.advice.map((advice, index) => (
                <li key={index}>{advice}</li>
              ))}
            </ul>
          </div>

          {/* 開発環境でのみエラー詳細表示 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <details className="text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  開発者向けエラー詳細
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="text-xs">
                    <strong>Error Type:</strong> {errorType}
                  </div>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                    {error.name}: {error.message}
                    {error.stack && (
                      <>
                        {'\n\n'}
                        {error.stack}
                      </>
                    )}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => {
                // ユーザーアクションをログ
                logger.info('User action: Reset task error boundary', {
                  category: 'user_action',
                  feature: 'task',
                  action: 'reset_error_boundary',
                  errorType
                });
                resetError();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              タスクを再読み込み
            </Button>
            
            <Button
              onClick={() => {
                // ユーザーアクションをログ
                logger.info('User action: Return to dashboard from task error', {
                  category: 'user_action',
                  feature: 'task',
                  action: 'return_to_dashboard',
                  errorType
                });
                window.location.href = '/';
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              ダッシュボードに戻る
            </Button>
            
            <Button
              onClick={() => {
                // ユーザーアクションをログ
                logger.warn('User action: Force page reload from task error', {
                  category: 'user_action',
                  feature: 'task',
                  action: 'force_page_reload',
                  errorType,
                  impact: 'potential_data_loss'
                });
                window.location.reload();
              }}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              ページを更新
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

/**
 * タスク機能専用のエラーバウンダリ
 */
interface TaskErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const TaskErrorBoundary: React.FC<TaskErrorBoundaryProps> = ({ 
  children, 
  onError 
}) => {
  const handleTaskError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorType = getTaskErrorType(error);
    const secureErrorLog = getSecureErrorLog(error);
    
    // 統合ログシステムを使用したタスクエラーログ
    const taskErrorContext = {
      feature: 'task',
      component: 'TaskErrorBoundary',
      errorType,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'task_specific',
      ...secureErrorLog
    };

    logger.error('Task Error Boundary caught error', taskErrorContext, error);
    
    // タスクエラータイプ別の専用ログ
    switch (errorType) {
      case 'crud':
        logger.warn('Task CRUD operation failed', {
          category: 'data_integrity',
          feature: 'task',
          operation: 'crud',
          impact: 'user_data_loss_risk'
        });
        break;
      case 'database':
        logSecurityEvent('Task database error - potential data exposure risk', 'high', {
          errorType: 'database',
          feature: 'task'
        });
        break;
      case 'validation':
        logger.info('Task validation error - data integrity protected', {
          category: 'data_validation',
          feature: 'task',
          result: 'rejected_invalid_data'
        });
        break;
    }
    
    // パフォーマンスメトリクス
    const performanceTimer = logger.startPerformanceTimer('TaskErrorBoundary.handleError');
    
    // エラー追跡サービスに送信（本番環境の場合）
    if (process.env.NODE_ENV === 'production') {
      // 統合ログシステムが外部サービスへの送信を処理
      logger.info('Task error reported to external service', {
        category: 'error_reporting',
        feature: 'task',
        errorType,
        reported: true
      });
    }
    
    // 外部コールバックがあれば呼び出し
    onError?.(error, errorInfo);
    
    performanceTimer(); // パフォーマンス計測終了
  };

  return (
    <ErrorBoundary fallback={TaskErrorFallback} onError={handleTaskError}>
      {children}
    </ErrorBoundary>
  );
};

/**
 * HOCとしてタスクコンポーネントをラップするヘルパー
 */
export const withTaskErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <TaskErrorBoundary>
      <Component {...props} ref={ref} />
    </TaskErrorBoundary>
  ));

  WrappedComponent.displayName = `withTaskErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default TaskErrorBoundary;