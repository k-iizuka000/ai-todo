/**
 * タグ同期用カスタムフック
 * Issue 040: API統合によるリアルタイム更新対応
 */

import { useEffect, useCallback } from 'react';
import { useTagStore } from '@/stores/tagStore';

interface UseTagSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

export const useTagSync = (options: UseTagSyncOptions = {}) => {
  const { autoSync = true, syncInterval = 30000 } = options; // 30秒間隔
  
  const { 
    initialize, 
    isApiModeEnabled, 
    isLoading, 
    error 
  } = useTagStore();
  
  // 手動同期関数
  const syncTags = useCallback(async () => {
    if (isApiModeEnabled()) {
      try {
        await initialize();
      } catch (error) {
        console.error('Tag sync failed:', error);
      }
    }
  }, [initialize, isApiModeEnabled]);
  
  // 自動同期の設定
  useEffect(() => {
    if (autoSync && isApiModeEnabled()) {
      const interval = setInterval(syncTags, syncInterval);
      return () => clearInterval(interval);
    }
  }, [autoSync, syncTags, syncInterval, isApiModeEnabled]);
  
  // 初期同期
  useEffect(() => {
    if (isApiModeEnabled()) {
      syncTags();
    }
  }, [syncTags, isApiModeEnabled]);
  
  return {
    syncTags,
    isLoading,
    error,
    isApiMode: isApiModeEnabled()
  };
};