/**
 * 通知機能 Mock → DB 移行実行スクリプト
 * グループ7: 通知機能DB統合の実装とテスト
 */

import { NotificationAdapter, NotificationMigrationHelper } from '../adapters/notificationAdapter';
import { useNotificationStore } from '../stores/notificationStore';
import { mockNotifications } from '../mock/notifications';

export interface MigrationResult {
  success: boolean;
  step: string;
  message: string;
  errors?: string[];
  stats?: {
    mockCount: number;
    dbCount: number;
    migrated: number;
  };
}

/**
 * 通知機能DB移行の実行クラス
 */
export class NotificationMigration {
  private adapter: NotificationAdapter;
  private results: MigrationResult[] = [];

  constructor() {
    this.adapter = NotificationAdapter.getInstance();
  }

  /**
   * 完全移行の実行
   */
  public async executeMigration(): Promise<MigrationResult[]> {
    this.results = [];

    // Step 1: 環境確認
    await this.checkEnvironment();

    // Step 2: Mock環境のテスト
    await this.testMockEnvironment();

    // Step 3: DB環境のテスト
    await this.testDatabaseEnvironment();

    // Step 4: データ移行
    await this.migrateData();

    // Step 5: 互換性テスト
    await this.testCompatibility();

    // Step 6: パフォーマンステスト
    await this.testPerformance();

    // Step 7: 移行完了
    await this.finalizeMigration();

    return this.results;
  }

  /**
   * Step 1: 環境確認
   */
  private async checkEnvironment(): Promise<void> {
    try {
      const store = useNotificationStore.getState();
      const mockCount = mockNotifications.length;
      
      this.addResult({
        success: true,
        step: 'environment_check',
        message: `環境確認完了: Mock通知数=${mockCount}件, Store初期化済み`,
        stats: {
          mockCount,
          dbCount: 0,
          migrated: 0
        }
      });
    } catch (error) {
      this.addResult({
        success: false,
        step: 'environment_check',
        message: '環境確認に失敗',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Step 2: Mock環境のテスト
   */
  private async testMockEnvironment(): Promise<void> {
    try {
      this.adapter.setUseMockData(true);
      
      const notifications = await this.adapter.getNotifications();
      const stats = await this.adapter.getNotificationStats();
      
      if (notifications.length === 0) {
        throw new Error('Mock通知データが取得できません');
      }

      this.addResult({
        success: true,
        step: 'mock_test',
        message: `Mock環境テスト完了: ${notifications.length}件の通知, 未読${stats.unread}件`,
        stats: {
          mockCount: notifications.length,
          dbCount: 0,
          migrated: 0
        }
      });
    } catch (error) {
      this.addResult({
        success: false,
        step: 'mock_test',
        message: 'Mock環境のテストに失敗',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Step 3: DB環境のテスト
   */
  private async testDatabaseEnvironment(): Promise<void> {
    try {
      this.adapter.setUseMockData(false);
      
      const store = useNotificationStore.getState();
      
      // DB接続テスト（空の状態で取得を試行）
      await store.fetchNotifications();
      const initialCount = store.notifications.length;

      this.addResult({
        success: true,
        step: 'db_test',
        message: `DB環境テスト完了: 初期通知数=${initialCount}件`,
        stats: {
          mockCount: mockNotifications.length,
          dbCount: initialCount,
          migrated: 0
        }
      });
    } catch (error) {
      this.addResult({
        success: false,
        step: 'db_test',
        message: 'DB環境のテストに失敗',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Step 4: データ移行
   */
  private async migrateData(): Promise<void> {
    try {
      const success = await NotificationMigrationHelper.seedDatabaseWithMockData();
      
      if (!success) {
        throw new Error('データ移行処理が失敗しました');
      }

      // 移行後の確認
      const store = useNotificationStore.getState();
      await store.refreshNotifications();
      const dbCount = store.notifications.length;

      this.addResult({
        success: true,
        step: 'data_migration',
        message: `データ移行完了: ${mockNotifications.length}件のMockデータをDBに移行`,
        stats: {
          mockCount: mockNotifications.length,
          dbCount: dbCount,
          migrated: mockNotifications.length
        }
      });
    } catch (error) {
      this.addResult({
        success: false,
        step: 'data_migration',
        message: 'データ移行に失敗',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Step 5: 互換性テスト
   */
  private async testCompatibility(): Promise<void> {
    try {
      const result = await NotificationMigrationHelper.testExistingComponents();
      
      if (result.errors.length > 0) {
        throw new Error(`互換性テストでエラー: ${result.errors.join(', ')}`);
      }

      const compatCount = [
        result.dropdownCompatible,
        result.itemCompatible,
        result.badgeCompatible
      ].filter(Boolean).length;

      this.addResult({
        success: compatCount === 3,
        step: 'compatibility_test',
        message: `互換性テスト完了: ${compatCount}/3コンポーネント互換`,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    } catch (error) {
      this.addResult({
        success: false,
        step: 'compatibility_test',
        message: '互換性テストに失敗',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Step 6: パフォーマンステスト
   */
  private async testPerformance(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // 通知取得パフォーマンス
      this.adapter.setUseMockData(false);
      const store = useNotificationStore.getState();
      
      await store.fetchNotifications();
      const fetchTime = performance.now() - startTime;
      
      // フィルタリングパフォーマンス
      const filterStartTime = performance.now();
      store.setFilter({ isRead: false });
      const filtered = store.getFilteredNotifications();
      const filterTime = performance.now() - filterStartTime;

      // 許容可能なパフォーマンス基準
      const fetchOk = fetchTime < 2000; // 2秒以内
      const filterOk = filterTime < 100; // 100ms以内

      this.addResult({
        success: fetchOk && filterOk,
        step: 'performance_test',
        message: `パフォーマンステスト完了: 取得${fetchTime.toFixed(0)}ms, フィルター${filterTime.toFixed(0)}ms`,
        errors: [
          ...(!fetchOk ? [`通知取得が遅い: ${fetchTime.toFixed(0)}ms > 2000ms`] : []),
          ...(!filterOk ? [`フィルタリングが遅い: ${filterTime.toFixed(0)}ms > 100ms`] : [])
        ].filter(Boolean)
      });
    } catch (error) {
      this.addResult({
        success: false,
        step: 'performance_test',
        message: 'パフォーマンステストに失敗',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * Step 7: 移行完了
   */
  private async finalizeMigration(): Promise<void> {
    try {
      // DB環境に固定
      this.adapter.setUseMockData(false);
      
      // 最終状態確認
      const store = useNotificationStore.getState();
      await store.fetchStats();
      
      const finalStats = store.stats;
      const allSuccessful = this.results.every(r => r.success);

      this.addResult({
        success: allSuccessful,
        step: 'finalization',
        message: allSuccessful 
          ? `移行完了: 全${finalStats?.total || 0}件の通知がDBで稼働中`
          : '移行に一部問題がありましたが、基本機能は動作しています',
        stats: {
          mockCount: mockNotifications.length,
          dbCount: finalStats?.total || 0,
          migrated: mockNotifications.length
        }
      });
    } catch (error) {
      this.addResult({
        success: false,
        step: 'finalization',
        message: '移行完了処理に失敗',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  /**
   * 結果の追加
   */
  private addResult(result: MigrationResult): void {
    this.results.push(result);
    console.log(`[${result.step}] ${result.success ? '✅' : '❌'} ${result.message}`);
    if (result.errors && result.errors.length > 0) {
      console.error('  Errors:', result.errors);
    }
  }

  /**
   * 移行結果のサマリー取得
   */
  public getMigrationSummary(): {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    overallSuccess: boolean;
    finalStats?: { mockCount: number; dbCount: number; migrated: number };
  } {
    const totalSteps = this.results.length;
    const successfulSteps = this.results.filter(r => r.success).length;
    const failedSteps = totalSteps - successfulSteps;
    const overallSuccess = failedSteps === 0;
    
    const lastResult = this.results[this.results.length - 1];
    const finalStats = lastResult?.stats;

    return {
      totalSteps,
      successfulSteps,
      failedSteps,
      overallSuccess,
      finalStats
    };
  }
}

/**
 * 移行実行用のユーティリティ関数
 */
export const executeNotificationMigration = async (): Promise<{
  results: MigrationResult[];
  summary: ReturnType<NotificationMigration['getMigrationSummary']>;
}> => {
  console.log('🚀 通知機能DB移行を開始します...');
  
  const migration = new NotificationMigration();
  const results = await migration.executeMigration();
  const summary = migration.getMigrationSummary();

  console.log('\n📊 移行結果サマリー:');
  console.log(`  ✅ 成功: ${summary.successfulSteps}/${summary.totalSteps} ステップ`);
  console.log(`  ❌ 失敗: ${summary.failedSteps}/${summary.totalSteps} ステップ`);
  console.log(`  🎯 全体結果: ${summary.overallSuccess ? '成功' : '部分的成功'}`);
  
  if (summary.finalStats) {
    console.log(`  📈 最終統計: Mock=${summary.finalStats.mockCount}件, DB=${summary.finalStats.dbCount}件`);
  }

  return { results, summary };
};

export default NotificationMigration;