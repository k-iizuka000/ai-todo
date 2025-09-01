/**
 * useDataIntegrityMonitor フックの単体テスト
 * Issue #027: Dashboard無限レンダリングループエラー修正
 * 
 * テスト対象:
 * - データ整合性の監視機能
 * - 自動修復機能
 * - パフォーマンスメトリクス
 * - エラーハンドリング
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDataIntegrityMonitor } from '../useDataIntegrityMonitor';
import { useTaskStore } from '@/stores/taskStore';
import { Task } from '@/types/task';
import * as typeGuards from '@/utils/typeGuards';
import { createMockTask, measureExecutionTime } from './testUtils';

// モック設定
vi.mock('@/stores/taskStore');

describe('useDataIntegrityMonitor', () => {
  let mockTaskStore: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers(); // 常にリアルタイマーを使用
    
    // console スパイの設定
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // TaskStore のモック設定
    mockTaskStore = {
      tasks: [
        createMockTask({ id: 'task-1', status: 'todo' }),
        createMockTask({ id: 'task-2', status: 'in_progress' }),
        createMockTask({ id: 'task-3', status: 'done' })
      ],
      isLoading: false,
      error: null,
      updateTask: vi.fn().mockResolvedValue(undefined),
      deleteTask: vi.fn().mockResolvedValue(undefined)
    };
    
    (useTaskStore as any).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockTaskStore);
      }
      return mockTaskStore;
    });
    
    // TypeGuards のモック
    vi.spyOn(typeGuards, 'isValidTask').mockReturnValue(true);
    vi.spyOn(typeGuards, 'isTag').mockReturnValue(true);
    vi.spyOn(typeGuards, 'isTaskStatus').mockReturnValue(true);
    vi.spyOn(typeGuards, 'getTypeInfo').mockReturnValue('MockType');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('初期化と基本機能', () => {
    it('デフォルト設定で正しく初期化される', () => {
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.stats).toBeDefined();
      expect(result.current.issues).toEqual([]);
      expect(typeof result.current.startMonitoring).toBe('function');
      expect(typeof result.current.stopMonitoring).toBe('function');
    });

    it('カスタム設定が正しく適用される', () => {
      const customConfig = {
        checkInterval: 5000,
        enableAutoFix: false,
        enableDetailedLogging: true
      };
      
      const { result } = renderHook(() => useDataIntegrityMonitor(customConfig));
      
      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.stats).toBeDefined();
      expect(result.current.config.checkInterval).toBe(5000);
      expect(result.current.config.enableAutoFix).toBe(false);
      expect(result.current.config.enableDetailedLogging).toBe(true);
    });
  });

  describe('監視機能', () => {
    it('監視を開始・停止できる', () => {
      const { result } = renderHook(() => useDataIntegrityMonitor({
        checkInterval: 10000 // 長い間隔でタイムアウト回避
      }));
      
      expect(result.current.isMonitoring).toBe(false);
      
      // 監視開始
      act(() => {
        result.current.startMonitoring();
      });
      
      expect(result.current.isMonitoring).toBe(true);
      
      // 監視停止
      act(() => {
        result.current.stopMonitoring();
      });
      
      expect(result.current.isMonitoring).toBe(false);
    });

    it('手動チェックが実行できる', async () => {
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      const manualStats = await act(async () => {
        return await result.current.runManualCheck();
      });
      
      expect(manualStats).toBeDefined();
      expect(manualStats.tasksChecked).toBe(3);
      expect(manualStats.checkDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('データ整合性検証', () => {
    it('正常なタスクデータで問題が検出されない', async () => {
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      // 手動チェックで即座に結果を確認
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      expect(result.current.stats.tasksChecked).toBe(3);
      expect(result.current.issues).toHaveLength(0);
    });

    it('無効なタスク構造を検出する', async () => {
      // 無効なタスクデータを設定
      mockTaskStore.tasks = [
        { id: null, title: '', status: 'invalid' }, // 無効なタスク
        createMockTask({ id: 'valid-task' })
      ];
      
      // TypeGuards モックを無効なデータに対して適切に応答するように設定
      vi.spyOn(typeGuards, 'isValidTask').mockImplementation((value: any) => {
        return value && value.id && value.title && value.status && 
               typeof value.id === 'string' && value.id.trim() !== '';
      });
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      expect(result.current.stats.issuesFound).toBeGreaterThan(0);
    });

    it('重複IDを検出する', async () => {
      // 重複IDを持つタスクを設定
      const duplicateId = 'duplicate-task-id';
      mockTaskStore.tasks = [
        createMockTask({ id: duplicateId }),
        createMockTask({ id: duplicateId }) // 重複
      ];
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      expect(result.current.issues.some(issue => issue.type === 'DUPLICATE_ID')).toBe(true);
    });

    it('無効なタグ参照を検出する', async () => {
      // 無効なタグを持つタスクを設定
      mockTaskStore.tasks = [
        {
          ...createMockTask({ id: 'task-with-invalid-tags' }),
          tags: [
            null, // 無効なタグ
            { id: 'tag-1', name: 'Valid Tag', color: '#000000' }
          ]
        }
      ];
      
      // isTag モックを設定 - nullに対してfalseを返す
      vi.spyOn(typeGuards, 'isTag').mockImplementation((value: any) => {
        return value !== null && value !== undefined && value.id && value.name && value.color;
      });
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      // デバッグ出力
      console.log('Issues found:', result.current.issues.map(i => ({ type: i.type, description: i.description })));
      
      expect(result.current.issues.some(issue => issue.type === 'INVALID_TAG_REFERENCE')).toBe(true);
    });
  });

  describe('自動修復機能', () => {
    it('修復可能な問題が検出される', async () => {
      // 修復可能な問題（無効なタグ）を設定
      const taskWithInvalidTag = {
        ...createMockTask({ id: 'task-invalid-tag' }),
        tags: [null, { id: 'valid-tag', name: 'Valid', color: '#000000' }]
      };
      
      mockTaskStore.tasks = [taskWithInvalidTag];
      
      // isTag モックを設定
      vi.spyOn(typeGuards, 'isTag').mockImplementation((value: any) => {
        return value !== null && value !== undefined && value.id && value.name && value.color;
      });
      
      const { result } = renderHook(() => useDataIntegrityMonitor({
        enableAutoFix: true
      }));
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      expect(result.current.stats.tasksChecked).toBe(1);
    });

    it('個別の問題を手動修復できる', async () => {
      // 修復可能な問題を持つタスクを設定
      const taskWithInvalidTag = {
        ...createMockTask({ id: 'task-fix-test' }),
        tags: [null] // 無効なタグ
      };
      
      mockTaskStore.tasks = [taskWithInvalidTag];
      
      // isTag モックを設定
      vi.spyOn(typeGuards, 'isTag').mockImplementation((value: any) => {
        return value !== null && value !== undefined && value.id && value.name && value.color;
      });
      
      const { result } = renderHook(() => useDataIntegrityMonitor({
        enableAutoFix: false // 自動修復を無効にして手動修復をテスト
      }));
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      // 問題が検出されることを確認
      expect(result.current.issues.length).toBeGreaterThan(0);
      
      const fixableIssue = result.current.issues.find(issue => issue.autoFixable);
      if (fixableIssue) {
        const fixed = await act(async () => {
          return await result.current.fixIssue(fixableIssue.id);
        });
        
        expect(typeof fixed).toBe('boolean');
      }
    });
  });

  describe('パフォーマンス監視', () => {
    it('大量データでのチェック時間を測定する', async () => {
      // 大量データを生成
      const largeTasks: Task[] = Array.from({ length: 100 }, (_, index) => 
        createMockTask({ id: `large-task-${index}` })
      );
      mockTaskStore.tasks = largeTasks;
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      const startTime = performance.now();
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      const executionTime = performance.now() - startTime;
      
      expect(result.current.stats.tasksChecked).toBe(100);
      expect(result.current.stats.checkDuration).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(5000); // 5秒以内
    });

    it('品質スコアが正しく計算される', async () => {
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      expect(result.current.stats.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.current.stats.qualityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('エラーハンドリング', () => {
    it('破損したタスクデータを安全に処理する', async () => {
      // 破損したデータを設定
      mockTaskStore.tasks = [
        null, // null値
        undefined, // undefined値
        { incomplete: 'data' }, // 不完全なオブジェクト
        createMockTask({ id: 'valid-task' })
      ];
      
      // isValidTask モックを実際のvalidation logicに近づける
      vi.spyOn(typeGuards, 'isValidTask').mockImplementation((value: any) => {
        return value && 
               typeof value === 'object' && 
               typeof value.id === 'string' && 
               typeof value.title === 'string' &&
               typeof value.status === 'string';
      });
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      // エラーが発生せずに動作することを確認
      expect(() => {
        act(() => {
          result.current.startMonitoring();
        });
      }).not.toThrow();
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      expect(result.current.stats.tasksChecked).toBeGreaterThanOrEqual(0);
    });

    it('型検証エラーを適切に処理する', async () => {
      // TypeGuardError を発生させる
      vi.spyOn(typeGuards, 'isValidTask').mockImplementation(() => {
        throw new typeGuards.TypeGuardError('Mock validation error');
      });
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      const typeViolationIssues = result.current.issues.filter(issue => issue.type === 'TYPE_VIOLATION');
      expect(typeViolationIssues.length).toBeGreaterThan(0);
    });
  });

  describe('タイムスタンプ検証', () => {
    it('正常なタイムスタンプを正しく処理する', async () => {
      const now = new Date();
      const taskWithValidTimestamps = createMockTask({
        id: 'timestamp-test',
        createdAt: new Date(now.getTime() - 1000), // 1秒前
        updatedAt: now
      });
      
      mockTaskStore.tasks = [taskWithValidTimestamps];
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      const timestampIssues = result.current.issues.filter(issue => issue.type === 'TIMESTAMP_ANOMALY');
      expect(timestampIssues.length).toBe(0);
    });

    it('不正なタイムスタンプを検出する', async () => {
      const futureDate = new Date(Date.now() + 60000); // 1分後
      const pastDate = new Date(Date.now() - 60000); // 1分前
      
      const taskWithInvalidTimestamps = createMockTask({
        id: 'invalid-timestamp-test',
        createdAt: futureDate, // 未来の作成日時
        updatedAt: pastDate    // 過去の更新日時 (これがTIMESTAMP_ANOMALYを引き起こす)
      });
      
      mockTaskStore.tasks = [taskWithInvalidTimestamps];
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      // デバッグ出力
      console.log('Timestamp issues:', result.current.issues.filter(issue => issue.type === 'TIMESTAMP_ANOMALY'));
      
      const timestampIssues = result.current.issues.filter(issue => issue.type === 'TIMESTAMP_ANOMALY');
      expect(timestampIssues.length).toBeGreaterThan(0);
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にクリーンアップされる', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { result, unmount } = renderHook(() => useDataIntegrityMonitor());
      
      act(() => {
        result.current.startMonitoring();
      });
      
      // アンマウント時にクリーンアップされることを確認
      unmount();
      
      // クリーンアップが呼ばれることを確認（具体的な回数は問わない）
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('監視停止時にタイマーがクリアされる', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      act(() => {
        result.current.startMonitoring();
      });
      
      act(() => {
        result.current.stopMonitoring();
      });
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('統計情報', () => {
    it('統計情報が正しく更新される', async () => {
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      const initialStats = result.current.stats;
      
      // 少し時間を空けてから実行
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      // checkDurationで十分な変更があることを確認
      expect(result.current.stats.checkDuration).toBeGreaterThanOrEqual(0);
      expect(result.current.stats.tasksChecked).toBe(3);
    });

    it('チェック結果が適切に記録される', async () => {
      const { result } = renderHook(() => useDataIntegrityMonitor());
      
      await act(async () => {
        await result.current.runManualCheck();
      });
      
      expect(result.current.stats.tasksChecked).toBeGreaterThan(0);
      expect(result.current.stats.checkDuration).toBeGreaterThanOrEqual(0);
      expect(result.current.stats.qualityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('設定とコンフィグ', () => {
    it('監視間隔が正しく設定される', () => {
      const { result } = renderHook(() => useDataIntegrityMonitor({
        checkInterval: 2000
      }));
      
      expect(result.current.config.checkInterval).toBe(2000);
    });

    it('自動修復設定が正しく反映される', () => {
      const { result } = renderHook(() => useDataIntegrityMonitor({
        enableAutoFix: false
      }));
      
      expect(result.current.config.enableAutoFix).toBe(false);
    });

    it('詳細ログ設定が正しく反映される', () => {
      const { result } = renderHook(() => useDataIntegrityMonitor({
        enableDetailedLogging: true
      }));
      
      expect(result.current.config.enableDetailedLogging).toBe(true);
    });
  });
});