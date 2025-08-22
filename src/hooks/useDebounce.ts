/**
 * useDebounceフック - API呼び出し最適化のための遅延実行
 * 設計書グループ4: TagInputコンポーネント用
 */

import { useState, useEffect } from 'react';

/**
 * 入力値をデバウンス処理して返すフック
 * @param value デバウンス対象の値
 * @param delay 遅延時間（ミリ秒）- 設計書に従い500msを推奨
 * @returns デバウンス処理された値
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 指定された遅延後に値を更新
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // クリーンアップ - 新しい値が来た場合は前のタイマーをキャンセル
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}