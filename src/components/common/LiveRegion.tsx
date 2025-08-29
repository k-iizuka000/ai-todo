/**
 * スクリーンリーダー用ライブリージョンコンポーネント
 * 
 * WCAG 2.1 AA準拠のアクセシビリティ機能：
 * - aria-live リージョンによるスクリーンリーダー通知
 * - 適切な優先度設定（polite/assertive）
 * - 視覚的に隠されつつスクリーンリーダーからは読み上げ可能
 */

import React from 'react';

export interface LiveRegionProps {
  /** アナウンスするメッセージ */
  message: string;
  /** アナウンスの優先度 */
  priority?: 'polite' | 'assertive';
  /** カスタムクラス名 */
  className?: string;
  /** テスト用のdata-testid */
  'data-testid'?: string;
}

/**
 * スクリーンリーダー専用のライブリージョン
 * 視覚的には見えないが、内容が変更されるとスクリーンリーダーで読み上げられる
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  priority = 'polite',
  className = '',
  'data-testid': testId
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      className={`sr-only ${className}`}
      data-testid={testId}
      role="status"
    >
      {message}
    </div>
  );
};

/**
 * assertive（即座に読み上げ）用のライブリージョン
 */
export const AssertiveLiveRegion: React.FC<Omit<LiveRegionProps, 'priority'>> = (props) => (
  <LiveRegion {...props} priority="assertive" />
);

/**
 * polite（礼儀正しい読み上げ）用のライブリージョン
 */
export const PoliteLiveRegion: React.FC<Omit<LiveRegionProps, 'priority'>> = (props) => (
  <LiveRegion {...props} priority="polite" />
);

export default LiveRegion;