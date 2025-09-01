/**
 * データ整合性監視フック
 * Issue #026 Group 1 Task 1.2
 * 
 * 目的:
 * - リアルタイムでのデータ整合性監視
 * - 型安全性の確保
 * - データ不整合の早期検出とアラート
 * - 自動修復機能の提供
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Task, TaskStatus } from '@/types/task';
import { Tag } from '@/types/tag';
import { isValidTask, isTag, isTaskStatus, TypeGuardError, getTypeInfo } from '@/utils/typeGuards';
import { useTaskStore } from '@/stores/taskStore';

/**
 * データ整合性問題の種類
 */
export type IntegrityIssueType = 
  | 'INVALID_TASK_STRUCTURE'
  | 'INVALID_TAG_REFERENCE'
  | 'INCONSISTENT_STATUS'
  | 'DUPLICATE_ID'
  | 'ORPHANED_SUBTASK'
  | 'TIMESTAMP_ANOMALY'
  | 'CIRCULAR_DEPENDENCY'
  | 'MEMORY_LEAK'
  | 'TYPE_VIOLATION';

/**
 * データ整合性問題の詳細情報
 */
export interface IntegrityIssue {
  /** 問題のID */
  id: string;
  /** 問題の種類 */
  type: IntegrityIssueType;
  /** 問題の重要度 */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** 問題の説明 */
  description: string;
  /** 影響を受けるタスクID */
  affectedTaskId?: string;
  /** 問題のあるフィールド */
  field?: string;
  /** 期待値 */
  expected?: any;
  /** 実際の値 */
  actual?: any;
  /** 検出時刻 */
  detectedAt: Date;
  /** 自動修復可能かどうか */
  autoFixable: boolean;
  /** 修復のための推奨アクション */
  recommendedAction?: string;
}

/**
 * データ整合性統計
 */
export interface IntegrityStats {
  /** 検査済みタスク数 */
  tasksChecked: number;
  /** 検出された問題数 */
  issuesFound: number;
  /** 自動修復された問題数 */
  autoFixedIssues: number;
  /** 重要度別問題数 */
  issuesBySeverity: Record<IntegrityIssue['severity'], number>;
  /** 最後の検査時刻 */
  lastCheckTime: Date;
  /** 検査にかかった時間（ミリ秒） */
  checkDuration: number;
  /** データ品質スコア (0-100) */
  qualityScore: number;
}

/**
 * 監視設定
 */
export interface MonitoringConfig {
  /** 自動修復を有効にするか */
  enableAutoFix: boolean;
  /** 検査間隔（ミリ秒） */
  checkInterval: number;
  /** アラートレベル */
  alertLevel: IntegrityIssue['severity'];
  /** 詳細ログを有効にするか */
  enableDetailedLogging: boolean;
  /** メモリリーク検出を有効にするか */
  enableMemoryLeakDetection: boolean;
}

const defaultConfig: MonitoringConfig = {
  enableAutoFix: true,
  checkInterval: 5000, // 5秒
  alertLevel: 'MEDIUM',
  enableDetailedLogging: false,
  enableMemoryLeakDetection: true
};

/**
 * データ整合性監視フック
 * 
 * @param config 監視設定
 * @returns データ整合性監視の結果と制御関数
 */
export const useDataIntegrityMonitor = (config: Partial<MonitoringConfig> = {}) => {
  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  
  // Zustandストアから全タスクを取得
  const tasks = useTaskStore(state => state.tasks);
  const { updateTask, deleteTask } = useTaskStore();
  
  // 状態管理
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stats, setStats] = useState<IntegrityStats>({
    tasksChecked: 0,
    issuesFound: 0,
    autoFixedIssues: 0,
    issuesBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    lastCheckTime: new Date(),
    checkDuration: 0,
    qualityScore: 100
  });
  
  // 内部状態管理用Ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const checksPerformedRef = useRef(0);
  const issueHistoryRef = useRef<IntegrityIssue[]>([]);
  const memoryUsageRef = useRef<{ timestamp: number; heapUsed: number }[]>([]);
  
  /**
   * タスクの基本構造検証
   */
  const validateTaskStructure = useCallback((task: any): IntegrityIssue[] => {
    const issues: IntegrityIssue[] = [];
    
    try {
      if (!isValidTask(task)) {
        issues.push({
          id: `structure_${task?.id || 'unknown'}_${Date.now()}`,
          type: 'INVALID_TASK_STRUCTURE',
          severity: 'CRITICAL',
          description: `タスクの基本構造が無効です: ${getTypeInfo(task)}`,
          affectedTaskId: task?.id,
          expected: 'Valid Task object',
          actual: getTypeInfo(task),
          detectedAt: new Date(),
          autoFixable: false,
          recommendedAction: 'データを手動で確認し、有効な形式に修正してください'
        });
      }
    } catch (error) {
      issues.push({
        id: `validation_error_${task?.id || 'unknown'}_${Date.now()}`,
        type: 'TYPE_VIOLATION',
        severity: 'HIGH',
        description: `型検証中にエラーが発生: ${error instanceof Error ? error.message : String(error)}`,
        affectedTaskId: task?.id,
        detectedAt: new Date(),
        autoFixable: false
      });
    }
    
    return issues;
  }, []);
  
  /**
   * タグ参照の整合性検証（null安全版）
   */
  const validateTagReferences = useCallback((task: any): IntegrityIssue[] => {
    const issues: IntegrityIssue[] = [];
    
    // nullやundefinedタスクを安全に処理
    if (!task || typeof task !== 'object') {
      return issues;
    }
    
    if (!Array.isArray(task.tags)) {
      issues.push({
        id: `tags_not_array_${task.id || 'unknown'}_${Date.now()}`,
        type: 'INVALID_TAG_REFERENCE',
        severity: 'HIGH',
        description: 'タスクのtagsプロパティが配列ではありません',
        affectedTaskId: task.id,
        field: 'tags',
        expected: 'Array',
        actual: getTypeInfo(task.tags),
        detectedAt: new Date(),
        autoFixable: true,
        recommendedAction: 'tagsを空配列で初期化'
      });
      return issues;
    }
    
    task.tags.forEach((tag: any, index: number) => {
      if (!isTag(tag)) {
        issues.push({
          id: `invalid_tag_${task.id || 'unknown'}_${index}_${Date.now()}`,
          type: 'INVALID_TAG_REFERENCE',
          severity: 'MEDIUM',
          description: `無効なタグオブジェクト（インデックス: ${index}）`,
          affectedTaskId: task.id,
          field: `tags[${index}]`,
          expected: 'Valid Tag object',
          actual: getTypeInfo(tag),
          detectedAt: new Date(),
          autoFixable: true,
          recommendedAction: '無効なタグを削除'
        });
      }
    });
    
    return issues;
  }, []);
  
  /**
   * タイムスタンプ異常の検証（null安全版）
   */
  const validateTimestamps = useCallback((task: any): IntegrityIssue[] => {
    const issues: IntegrityIssue[] = [];
    
    // nullやundefinedタスクを安全に処理
    if (!task || typeof task !== 'object') {
      return issues;
    }
    
    if (!(task.createdAt instanceof Date) || isNaN(task.createdAt.getTime())) {
      issues.push({
        id: `invalid_created_at_${task.id || 'unknown'}_${Date.now()}`,
        type: 'TIMESTAMP_ANOMALY',
        severity: 'HIGH',
        description: 'createdAtが無効な日付です',
        affectedTaskId: task.id,
        field: 'createdAt',
        expected: 'Valid Date',
        actual: getTypeInfo(task.createdAt),
        detectedAt: new Date(),
        autoFixable: true,
        recommendedAction: '現在時刻で初期化'
      });
    }
    
    if (!(task.updatedAt instanceof Date) || isNaN(task.updatedAt.getTime())) {
      issues.push({
        id: `invalid_updated_at_${task.id || 'unknown'}_${Date.now()}`,
        type: 'TIMESTAMP_ANOMALY',
        severity: 'HIGH',
        description: 'updatedAtが無効な日付です',
        affectedTaskId: task.id,
        field: 'updatedAt',
        expected: 'Valid Date',
        actual: getTypeInfo(task.updatedAt),
        detectedAt: new Date(),
        autoFixable: true,
        recommendedAction: '現在時刻で初期化'
      });
    }
    
    // createdAt > updatedAt のチェック
    if (task.createdAt instanceof Date && task.updatedAt instanceof Date &&
        task.createdAt.getTime() > task.updatedAt.getTime()) {
      issues.push({
        id: `timestamp_order_${task.id || 'unknown'}_${Date.now()}`,
        type: 'TIMESTAMP_ANOMALY',
        severity: 'MEDIUM',
        description: 'createdAtがupdatedAtより新しい時刻になっています',
        affectedTaskId: task.id,
        expected: 'createdAt <= updatedAt',
        actual: `createdAt: ${task.createdAt.toISOString()}, updatedAt: ${task.updatedAt.toISOString()}`,
        detectedAt: new Date(),
        autoFixable: true,
        recommendedAction: 'updatedAtをcreatedAtと同じ時刻に設定'
      });
    }
    
    return issues;
  }, []);
  
  /**
   * 重複IDの検証（null安全版）
   */
  const validateDuplicateIds = useCallback((tasks: any[]): IntegrityIssue[] => {
    const issues: IntegrityIssue[] = [];
    const idCounts = new Map<string, number>();
    
    // null/undefinedタスクを安全にフィルタリング
    const validTasks = tasks.filter(task => task && typeof task === 'object');
    
    validTasks.forEach(task => {
      if (typeof task.id !== 'string' || !task.id.trim()) {
        issues.push({
          id: `empty_id_${Date.now()}_${Math.random()}`,
          type: 'DUPLICATE_ID',
          severity: 'CRITICAL',
          description: 'タスクIDが空または無効です',
          affectedTaskId: task.id,
          field: 'id',
          expected: 'Non-empty string',
          actual: getTypeInfo(task.id),
          detectedAt: new Date(),
          autoFixable: false,
          recommendedAction: '一意のIDを生成して設定'
        });
        return;
      }
      
      const currentCount = idCounts.get(task.id) || 0;
      idCounts.set(task.id, currentCount + 1);
    });
    
    idCounts.forEach((count, id) => {
      if (count > 1) {
        issues.push({
          id: `duplicate_id_${id}_${Date.now()}`,
          type: 'DUPLICATE_ID',
          severity: 'CRITICAL',
          description: `重複するタスクID: ${id} (${count}件)`,
          affectedTaskId: id,
          field: 'id',
          expected: 'Unique ID',
          actual: `${count} duplicates`,
          detectedAt: new Date(),
          autoFixable: false,
          recommendedAction: '重複タスクを削除または新しいIDを生成'
        });
      }
    });
    
    return issues;
  }, []);
  
  /**
   * メモリリーク検出
   */
  const detectMemoryLeaks = useCallback((): IntegrityIssue[] => {
    const issues: IntegrityIssue[] = [];
    
    if (!finalConfig.enableMemoryLeakDetection) {
      return issues;
    }
    
    if ('memory' in performance && typeof (performance as any).memory === 'object') {
      const memory = (performance as any).memory;
      const currentUsage = {
        timestamp: Date.now(),
        heapUsed: memory.usedJSHeapSize
      };
      
      memoryUsageRef.current.push(currentUsage);
      
      // 最新10件の記録を保持
      if (memoryUsageRef.current.length > 10) {
        memoryUsageRef.current = memoryUsageRef.current.slice(-10);
      }
      
      // メモリ使用量が継続的に増加している場合
      if (memoryUsageRef.current.length >= 5) {
        const recent = memoryUsageRef.current.slice(-5);
        const isIncreasing = recent.every((reading, index) => 
          index === 0 || reading.heapUsed > recent[index - 1].heapUsed
        );
        
        if (isIncreasing) {
          const increaseRate = (recent[4].heapUsed - recent[0].heapUsed) / 
            (recent[4].timestamp - recent[0].timestamp) * 1000; // per second
          
          if (increaseRate > 1024 * 1024) { // 1MB/s以上の増加
            issues.push({
              id: `memory_leak_${Date.now()}`,
              type: 'MEMORY_LEAK',
              severity: 'HIGH',
              description: `メモリリークの可能性を検出（増加率: ${(increaseRate / 1024 / 1024).toFixed(2)} MB/s）`,
              detectedAt: new Date(),
              autoFixable: false,
              recommendedAction: 'メモリ使用量を継続監視し、不要な参照を削除'
            });
          }
        }
      }
    }
    
    return issues;
  }, [finalConfig.enableMemoryLeakDetection]);
  
  /**
   * 自動修復機能
   */
  const autoFixIssue = useCallback(async (issue: IntegrityIssue): Promise<boolean> => {
    if (!finalConfig.enableAutoFix || !issue.autoFixable || !issue.affectedTaskId) {
      return false;
    }
    
    try {
      const task = tasks.find(t => t && t.id === issue.affectedTaskId);
      if (!task) {
        return false;
      }
      
      let fixedTask = { ...task };
      let fixed = false;
      
      switch (issue.type) {
        case 'INVALID_TAG_REFERENCE':
          if (issue.field === 'tags') {
            fixedTask.tags = [];
            fixed = true;
          } else if (issue.field?.startsWith('tags[')) {
            // 無効なタグを削除
            fixedTask.tags = task.tags.filter(tag => isTag(tag));
            fixed = true;
          }
          break;
          
        case 'TIMESTAMP_ANOMALY':
          const now = new Date();
          if (issue.field === 'createdAt') {
            fixedTask.createdAt = now;
            fixed = true;
          } else if (issue.field === 'updatedAt') {
            fixedTask.updatedAt = now;
            fixed = true;
          } else if (issue.description.includes('createdAtがupdatedAtより新しい')) {
            fixedTask.updatedAt = task.createdAt;
            fixed = true;
          }
          break;
          
        default:
          break;
      }
      
      if (fixed) {
        await updateTask(fixedTask.id, fixedTask);
        return true;
      }
    } catch (error) {
      console.error('自動修復中にエラーが発生:', error);
    }
    
    return false;
  }, [finalConfig.enableAutoFix, tasks, updateTask]);
  
  /**
   * 包括的なデータ整合性チェック（null安全版）
   */
  const performIntegrityCheck = useCallback(async (): Promise<IntegrityStats> => {
    const startTime = Date.now();
    let allIssues: IntegrityIssue[] = [];
    
    if (finalConfig.enableDetailedLogging) {
      console.log('🔍 データ整合性チェック開始:', new Date().toISOString());
    }
    
    // null/undefinedタスクを安全にフィルタリング
    const safeTasks = tasks.filter(task => task !== null && task !== undefined);
    
    // 各タスクに対する検証
    for (const task of safeTasks) {
      const taskIssues = [
        ...validateTaskStructure(task),
        ...validateTagReferences(task),
        ...validateTimestamps(task)
      ];
      allIssues = allIssues.concat(taskIssues);
    }
    
    // 全体に対する検証（原配列を使用してnull/undefinedも検出）
    allIssues = allIssues.concat(validateDuplicateIds(tasks));
    allIssues = allIssues.concat(detectMemoryLeaks());
    
    // 自動修復
    let autoFixedCount = 0;
    if (finalConfig.enableAutoFix) {
      for (const issue of allIssues) {
        if (issue.autoFixable) {
          const fixed = await autoFixIssue(issue);
          if (fixed) {
            autoFixedCount++;
          }
        }
      }
    }
    
    // 自動修復されなかった問題のみを記録
    const remainingIssues = allIssues.filter(issue => !issue.autoFixable || !finalConfig.enableAutoFix);
    
    // 統計情報の計算
    const issuesBySeverity = remainingIssues.reduce((acc, issue) => {
      acc[issue.severity]++;
      return acc;
    }, { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 });
    
    const qualityScore = Math.max(0, Math.min(100, 
      100 - (issuesBySeverity.CRITICAL * 25 + issuesBySeverity.HIGH * 10 + 
             issuesBySeverity.MEDIUM * 5 + issuesBySeverity.LOW * 1)
    ));
    
    const newStats: IntegrityStats = {
      tasksChecked: safeTasks.length, // 有効なタスクのみカウント
      issuesFound: allIssues.length,
      autoFixedIssues: autoFixedCount,
      issuesBySeverity,
      lastCheckTime: new Date(),
      checkDuration: Date.now() - startTime,
      qualityScore
    };
    
    setIssues(remainingIssues);
    setStats(newStats);
    
    // 履歴に記録（最新100件を保持）
    issueHistoryRef.current = [...issueHistoryRef.current, ...remainingIssues].slice(-100);
    checksPerformedRef.current++;
    
    // 重要な問題があればアラートを出力
    const criticalIssues = remainingIssues.filter(issue => {
      switch (finalConfig.alertLevel) {
        case 'CRITICAL': return issue.severity === 'CRITICAL';
        case 'HIGH': return ['CRITICAL', 'HIGH'].includes(issue.severity);
        case 'MEDIUM': return ['CRITICAL', 'HIGH', 'MEDIUM'].includes(issue.severity);
        case 'LOW': return true;
        default: return false;
      }
    });
    
    if (criticalIssues.length > 0) {
      console.warn('🚨 データ整合性の問題を検出:', criticalIssues);
    }
    
    if (finalConfig.enableDetailedLogging) {
      console.log('✅ データ整合性チェック完了:', {
        ...newStats,
        duration: `${newStats.checkDuration}ms`
      });
    }
    
    return newStats;
  }, [tasks, finalConfig, validateTaskStructure, validateTagReferences, 
      validateTimestamps, validateDuplicateIds, detectMemoryLeaks, autoFixIssue]);
  
  /**
   * 監視開始
   */
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // 初回チェック実行
    performIntegrityCheck();
    
    // 定期チェック開始
    intervalRef.current = setInterval(() => {
      performIntegrityCheck();
    }, finalConfig.checkInterval);
    
    if (finalConfig.enableDetailedLogging) {
      console.log('📊 データ整合性監視開始');
    }
  }, [isMonitoring, finalConfig.checkInterval, finalConfig.enableDetailedLogging, performIntegrityCheck]);
  
  /**
   * 監視停止
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;
    
    setIsMonitoring(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (finalConfig.enableDetailedLogging) {
      console.log('⏹️ データ整合性監視停止');
    }
  }, [isMonitoring, finalConfig.enableDetailedLogging]);
  
  /**
   * 手動チェック実行
   */
  const runManualCheck = useCallback(async () => {
    return await performIntegrityCheck();
  }, [performIntegrityCheck]);
  
  /**
   * 問題の手動修復
   */
  const fixIssue = useCallback(async (issueId: string): Promise<boolean> => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) {
      return false;
    }
    
    const fixed = await autoFixIssue(issue);
    if (fixed) {
      // 修復された問題を削除
      setIssues(prev => prev.filter(i => i.id !== issueId));
      setStats(prev => ({
        ...prev,
        autoFixedIssues: prev.autoFixedIssues + 1
      }));
    }
    
    return fixed;
  }, [issues, autoFixIssue]);
  
  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  return {
    // 状態
    issues,
    isMonitoring,
    stats,
    config: finalConfig,
    
    // 制御関数
    startMonitoring,
    stopMonitoring,
    runManualCheck,
    fixIssue,
    
    // ユーティリティ
    checksPerformed: checksPerformedRef.current,
    issueHistory: issueHistoryRef.current
  };
};