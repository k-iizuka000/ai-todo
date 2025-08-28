/**
 * Schedule Store Migration Helper
 * 旧ScheduleStoreから新HybridStoreへの段階的移行をサポート
 */

import { useScheduleStore } from './scheduleStore';
import { useScheduleStoreHybrid } from './scheduleStoreHybrid';

interface MigrationConfig {
  useHybridStore: boolean;
  fallbackToMock: boolean;
  enableCaching: boolean;
}

const defaultConfig: MigrationConfig = {
  useHybridStore: process.env.NODE_ENV === 'development' ? false : true, // 開発時はmock、本番はDB
  fallbackToMock: true,
  enableCaching: true
};

/**
 * 統合スケジュールストアフック
 * 環境に応じて適切なストアを選択
 */
export const useScheduleStoreMigrated = (config: Partial<MigrationConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  if (finalConfig.useHybridStore) {
    // Hybrid Store（DB統合版）を使用
    return useScheduleStoreHybrid();
  } else {
    // 従来のMock Storeを使用
    return useScheduleStore();
  }
};

/**
 * 現在のスケジュール取得フック（移行対応版）
 */
export const useCurrentScheduleMigrated = (config?: Partial<MigrationConfig>) => {
  const store = useScheduleStoreMigrated(config);
  return store.getCurrentSchedule();
};

/**
 * 統計情報取得フック（移行対応版）
 */
export const useScheduleStatisticsMigrated = (date?: Date, config?: Partial<MigrationConfig>) => {
  const store = useScheduleStoreMigrated(config);
  return store.getStatistics(date || store.currentDate);
};

/**
 * 未スケジュールタスク取得フック（移行対応版）
 */
export const useUnscheduledTasksMigrated = (config?: Partial<MigrationConfig>) => {
  const store = useScheduleStoreMigrated(config);
  return store.getUnscheduledTasks();
};

/**
 * 環境変数に基づくストア選択
 */
export const getScheduleStoreType = (): 'mock' | 'hybrid' => {
  // 環境変数でストアタイプを指定可能
  const storeType = process.env.VITE_SCHEDULE_STORE_TYPE;
  
  if (storeType === 'hybrid') return 'hybrid';
  if (storeType === 'mock') return 'mock';
  
  // デフォルト: 開発時はmock、本番はhybrid
  return process.env.NODE_ENV === 'development' ? 'mock' : 'hybrid';
};

/**
 * 旧ストアから新ストアへの自動移行
 */
export const migrateScheduleStore = async () => {
  const storeType = getScheduleStoreType();
  
  if (storeType === 'hybrid') {
    console.log('🔄 Migrating to Hybrid Schedule Store...');
    
    // 旧ストアからデータを取得（必要に応じて）
    const oldStore = useScheduleStore.getState();
    const newStore = useScheduleStoreHybrid.getState();
    
    // 必要に応じてビューセッティングを移行
    if (oldStore.viewSettings && oldStore.currentDate) {
      newStore.setViewSettings(oldStore.viewSettings);
      newStore.setCurrentDate(oldStore.currentDate);
    }
    
    console.log('✅ Migration to Hybrid Store completed');
  }
};

/**
 * 開発者向けストア切り替えユーティリティ
 */
export const switchScheduleStoreType = (type: 'mock' | 'hybrid') => {
  if (process.env.NODE_ENV === 'development') {
    localStorage.setItem('VITE_SCHEDULE_STORE_TYPE', type);
    console.log(`🔧 Schedule store switched to: ${type}`);
    console.log('🔄 Reload the page to apply changes');
  } else {
    console.warn('⚠️ Store switching is only available in development mode');
  }
};

// 開発時のグローバルユーティリティ
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as any).switchScheduleStore = switchScheduleStoreType;
  console.log('🛠️ Development mode: Use switchScheduleStore("mock" | "hybrid") to switch stores');
}

/**
 * Feature Flag for Schedule Store Migration
 */
export const ScheduleStoreFeatureFlags = {
  // DB統合機能の有効/無効
  DB_INTEGRATION: process.env.VITE_ENABLE_SCHEDULE_DB === 'true',
  
  // キャッシュ機能の有効/無効
  CACHING: process.env.VITE_ENABLE_SCHEDULE_CACHE !== 'false',
  
  // 外部カレンダー統合の有効/無効
  EXTERNAL_CALENDAR: process.env.VITE_ENABLE_EXTERNAL_CALENDAR === 'true',
  
  // AI提案機能の有効/無効
  AI_SUGGESTIONS: process.env.VITE_ENABLE_AI_SUGGESTIONS === 'true',
  
  // コンフリクト検知の有効/無効
  CONFLICT_DETECTION: process.env.VITE_ENABLE_CONFLICT_DETECTION !== 'false'
};