import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Loading } from '@/components/ui/loading';
import TagManager from '@/components/tag/TagManager';

/**
 * タグ管理ページ
 * MainLayoutでラップされ、TagManagerコンポーネントを配置
 */
const TagManagement: React.FC = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              エラーが発生しました
            </h2>
            <p className="text-muted-foreground">
              タグ管理画面の読み込み中にエラーが発生しました。
              ページを再読み込みしてください。
            </p>
          </div>
        </div>
      }
    >
      <Suspense 
        fallback={
          <div className="p-6">
            <Loading />
          </div>
        }
      >
        <div className="container mx-auto p-6">
          <TagManager />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default TagManagement;