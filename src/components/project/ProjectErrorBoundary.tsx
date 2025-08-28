/**
 * プロジェクト機能専用のエラーバウンダリコンポーネント
 * Project CRUD操作、メンバー管理、統計情報等の専用エラーハンドリング
 */

import React from 'react';
import { AlertTriangle, RefreshCw, FolderOpen, Users, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBoundary, ErrorFallbackProps } from '@/components/common/ErrorBoundary';

/**
 * プロジェクトエラーの種類を判定するヘルパー関数
 */
const getProjectErrorType = (error: Error) => {
  const message = error.message.toLowerCase();
  
  if (message.includes('member') || message.includes('permission') || message.includes('access')) {
    return 'member';
  }
  if (message.includes('statistics') || message.includes('analytics') || message.includes('chart')) {
    return 'statistics';
  }
  if (message.includes('settings') || message.includes('config') || message.includes('preference')) {
    return 'settings';
  }
  if (message.includes('crud') || message.includes('create') || message.includes('update') || message.includes('delete')) {
    return 'crud';
  }
  if (message.includes('database') || message.includes('prisma') || message.includes('sql')) {
    return 'database';
  }
  if (message.includes('validation') || message.includes('schema') || message.includes('zod')) {
    return 'validation';
  }
  return 'general';
};

/**
 * エラーアイコンを取得するヘルパー関数
 */
const getErrorIcon = (errorType: string) => {
  switch (errorType) {
    case 'member':
      return <Users className="h-12 w-12 text-blue-500" />;
    case 'statistics':
      return <BarChart3 className="h-12 w-12 text-green-500" />;
    case 'settings':
      return <Settings className="h-12 w-12 text-gray-500" />;
    case 'crud':
      return <FolderOpen className="h-12 w-12 text-blue-500" />;
    case 'database':
      return <AlertTriangle className="h-12 w-12 text-red-500" />;
    case 'validation':
      return <AlertTriangle className="h-12 w-12 text-orange-500" />;
    default:
      return <FolderOpen className="h-12 w-12 text-gray-500" />;
  }
};

/**
 * エラーメッセージとアドバイスを取得するヘルパー関数
 */
const getErrorContent = (errorType: string) => {
  switch (errorType) {
    case 'member':
      return {
        title: 'プロジェクトメンバー管理でエラーが発生しました',
        description: 'メンバーの追加、削除、権限変更操作中に問題が発生しました。権限設定やデータベース接続に問題がある可能性があります。',
        advice: [
          '• メンバーの権限設定を確認してください',
          '• 招待メールアドレスの形式を確認してください',
          '• 管理者権限を持っているか確認してください'
        ]
      };
    case 'statistics':
      return {
        title: 'プロジェクト統計情報でエラーが発生しました',
        description: 'プロジェクトの進捗、統計、チャート表示機能でエラーが発生しました。',
        advice: [
          '• データの読み込み完了を待ってください',
          '• 日付範囲の設定を確認してください',
          '• グラフの表示設定を確認してください'
        ]
      };
    case 'settings':
      return {
        title: 'プロジェクト設定でエラーが発生しました',
        description: 'プロジェクトの設定変更、環境設定操作中に問題が発生しました。',
        advice: [
          '• 設定値の形式を確認してください',
          '• 必須項目が入力されているか確認してください',
          '• 変更権限があるか確認してください'
        ]
      };
    case 'crud':
      return {
        title: 'プロジェクトの保存・更新でエラーが発生しました',
        description: 'プロジェクトの作成、編集、削除操作中に問題が発生しました。データベース接続またはデータ検証に問題がある可能性があります。',
        advice: [
          '• プロジェクト名を確認してください',
          '• 期限設定を確認してください',
          '• インターネット接続を確認してください'
        ]
      };
    case 'database':
      return {
        title: 'データベース接続エラーが発生しました',
        description: 'プロジェクトデータベースとの通信に失敗しました。サーバーまたはネットワークに問題がある可能性があります。',
        advice: [
          '• ネットワーク接続を確認してください',
          '• サーバーの状態を確認してください',
          '• 管理者にお問い合わせください'
        ]
      };
    case 'validation':
      return {
        title: 'プロジェクトデータの検証エラーが発生しました',
        description: 'プロジェクトのデータ形式または必須項目に問題があります。',
        advice: [
          '• 必須フィールドを確認してください',
          '• プロジェクト名の文字数制限を確認してください',
          '• 日付形式を確認してください'
        ]
      };
    default:
      return {
        title: 'プロジェクト機能でエラーが発生しました',
        description: 'プロジェクト管理機能の処理中に予期しないエラーが発生しました。',
        advice: [
          '• ページを再読み込みしてください',
          '• ブラウザのキャッシュをクリアしてください',
          '• 問題が継続する場合は管理者にお問い合わせください'
        ]
      };
  }
};

/**
 * プロジェクト機能専用のエラーフォールバックコンポーネント
 */
const ProjectErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const errorType = getProjectErrorType(error);
  const errorIcon = getErrorIcon(errorType);
  const errorContent = getErrorContent(errorType);

  // エラーログ（開発環境のみ詳細表示）
  const logProjectError = () => {
    console.group('🔴 Project Error Details');
    console.error('Error Type:', errorType);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    console.error('Timestamp:', new Date().toISOString());
    console.groupEnd();
  };

  React.useEffect(() => {
    logProjectError();
  }, []);

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
              onClick={resetError}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              プロジェクトを再読み込み
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              ダッシュボードに戻る
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
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
 * プロジェクト機能専用のエラーバウンダリ
 */
interface ProjectErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const ProjectErrorBoundary: React.FC<ProjectErrorBoundaryProps> = ({ 
  children, 
  onError 
}) => {
  const handleProjectError = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorType = getProjectErrorType(error);
    
    // プロジェクト専用のエラーログ（構造化）
    const projectErrorLog = {
      feature: 'project',
      errorType,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('Project Error Boundary:', projectErrorLog);
    
    // エラー追跡サービスに送信（本番環境の場合）
    if (process.env.NODE_ENV === 'production') {
      // ここで外部エラー追跡サービス（Sentry, LogRocket等）にレポート
      // window.errorTracker?.captureException(error, { 
      //   contexts: { projectError: projectErrorLog }
      // });
    }
    
    // 外部コールバックがあれば呼び出し
    onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary fallback={ProjectErrorFallback} onError={handleProjectError}>
      {children}
    </ErrorBoundary>
  );
};

/**
 * HOCとしてプロジェクトコンポーネントをラップするヘルパー
 */
export const withProjectErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <ProjectErrorBoundary>
      <Component {...props} ref={ref} />
    </ProjectErrorBoundary>
  ));

  WrappedComponent.displayName = `withProjectErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default ProjectErrorBoundary;