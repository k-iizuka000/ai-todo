/**
 * カンバンボード専用のエラーフォールバックコンポーネント
 */

import React from 'react';
import { AlertTriangle, RefreshCw, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorFallbackProps } from '../common/ErrorBoundary';

/**
 * カンバンボードのエラー表示コンポーネント
 */
export const KanbanErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const isDragError = error.message.includes('drag') || error.message.includes('drop');
  const isDataError = error.message.includes('task') || error.message.includes('data');

  return (
    <div className="h-full flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-md mx-auto">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {isDragError ? (
              <FileX className="h-12 w-12 text-orange-500" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-red-500" />
            )}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {isDragError 
                ? 'ドラッグ&ドロップでエラーが発生しました'
                : isDataError 
                  ? 'タスクデータの処理でエラーが発生しました'
                  : 'カンバンボードでエラーが発生しました'
              }
            </h2>
            <p className="text-sm text-gray-600">
              {isDragError
                ? 'タスクの移動中に問題が発生しました。ページを再読み込みしてください。'
                : isDataError
                  ? 'タスクデータの読み込みまたは更新に失敗しました。'
                  : '予期しない問題が発生しました。再試行してください。'
              }
            </p>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-50 p-3 rounded-lg text-left">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  開発者向けエラー詳細
                </summary>
                <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                  {error.name}: {error.message}
                  {error.stack && (
                    <>
                      {'\n\n'}
                      {error.stack}
                    </>
                  )}
                </pre>
              </details>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={resetError}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              カンバンを再読み込み
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              ページを更新
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>問題が継続する場合は:</p>
            <ul className="text-left">
              <li>• ブラウザのキャッシュをクリアしてください</li>
              <li>• ブラウザを最新バージョンに更新してください</li>
              <li>• 管理者にお問い合わせください</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};