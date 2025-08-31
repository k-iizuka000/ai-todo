/**
 * KanbanErrorBoundary用フックベースのユーティリティ
 * Issue #026 Group 3 Task 3.4: 自動リカバリー機能とGroup 1監視基盤の統合
 */

import { useCallback, useRef } from 'react';
import { useDataIntegrityMonitor } from '@/hooks/useDataIntegrityMonitor';
import { TaskDataIntegrityChecker } from '@/utils/taskDataIntegrity';
import { trackValidationCall } from '@/utils/typeGuards';

/**
 * KanbanErrorBoundaryと連携するフック
 */
export const useKanbanErrorRecovery = () => {
  const integrityChecker = useRef(new TaskDataIntegrityChecker()).current;
  
  // Group 1の監視基盤を活用
  const {
    issues: monitoringResults,
    runManualCheck: performIntegrityCheck,
    fixIssue: repairIntegrityIssues,
    isMonitoring: isMonitoringActive,
    startMonitoring,
    stopMonitoring
  } = useDataIntegrityMonitor();

  // データバックアップの実行
  const backupCurrentData = useCallback(async () => {
    try {
      trackValidationCall('KanbanErrorRecovery.backupCurrentData', 'info', Date.now());
      
      // 現在のストアデータを取得してバックアップ
      const currentTasks = (window as any).__TASK_STORE_DATA__ || [];
      
      if (currentTasks.length > 0) {
        const backupData = {
          timestamp: Date.now(),
          tasks: currentTasks,
          version: '1.0.0'
        };
        
        localStorage.setItem('kanban-error-backup', JSON.stringify(backupData));
        console.log('🔄 Kanban data backup created:', {
          taskCount: currentTasks.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error creating data backup:', error);
    }
  }, []);

  // エラー発生時の自動復旧処理
  const performAutoRecovery = useCallback(async () => {
    try {
      trackValidationCall('KanbanErrorRecovery.performAutoRecovery', 'recovery', Date.now());
      
      console.log('🔧 Starting automatic error recovery...');
      
      // 1. Group 1監視基盤による整合性チェック
      performIntegrityCheck();
      
      if (monitoringResults.length > 0) {
        console.log('🔍 Integrity issues detected:', monitoringResults);
        
        // 2. 自動修復可能な問題を修正
        for (const issue of monitoringResults) {
          if (issue.autoFixable) {
            try {
              await repairIntegrityIssues(issue.id);
              console.log('🔧 Fixed issue:', issue.id);
            } catch (fixError) {
              console.error('Failed to fix issue:', issue.id, fixError);
            }
          }
        }
      }
      
      // 3. バックアップからの復元試行
      const backupData = localStorage.getItem('kanban-error-backup');
      if (backupData) {
        try {
          const backup = JSON.parse(backupData);
          const backupAge = Date.now() - backup.timestamp;
          
          // 5分以内のバックアップのみ使用
          if (backupAge < 5 * 60 * 1000 && backup.tasks) {
            console.log('🔄 Restoring from backup:', {
              age: Math.round(backupAge / 1000) + 's',
              taskCount: backup.tasks.length
            });
            
            // データ整合性チェック
            const integrityReport = await integrityChecker.checkIntegrity(backup.tasks, { enableAutoFix: true });
            
            if (integrityReport.qualityScore >= 70) {
              const repairedTasks = backup.tasks;
              return {
                success: true,
                restoredTasks: repairedTasks,
                integrityScore: integrityReport.qualityScore,
                source: 'backup'
              };
            }
          }
        } catch (backupError) {
          console.error('Error restoring from backup:', backupError);
        }
      }
      
      // 4. 最小限の安全な状態を作成
      console.log('🎯 Creating minimal safe state...');
      return {
        success: true,
        restoredTasks: [],
        integrityScore: 100,
        source: 'minimal'
      };
      
    } catch (error) {
      console.error('Error during auto recovery:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [performIntegrityCheck, repairIntegrityIssues, integrityChecker]);

  // 予防的バックアップの開始
  const startPreventiveBackup = useCallback(() => {
    const backupInterval = setInterval(() => {
      backupCurrentData();
    }, 30000); // 30秒ごとにバックアップ

    // 監視も開始
    if (!isMonitoringActive) {
      startMonitoring();
    }

    return () => {
      clearInterval(backupInterval);
      stopMonitoring();
    };
  }, [backupCurrentData, isMonitoringActive, startMonitoring, stopMonitoring]);

  // エラー検知状況の取得
  const getErrorStatus = useCallback(() => {
    return {
      monitoringResults,
      hasIntegrityIssues: monitoringResults.length > 0,
      isMonitoringActive,
      lastBackupTime: localStorage.getItem('kanban-error-backup') 
        ? JSON.parse(localStorage.getItem('kanban-error-backup')!).timestamp 
        : null
    };
  }, [monitoringResults, isMonitoringActive]);

  return {
    performAutoRecovery,
    backupCurrentData,
    startPreventiveBackup,
    getErrorStatus,
    monitoringResults,
    isMonitoringActive
  };
};