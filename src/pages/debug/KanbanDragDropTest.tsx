/**
 * Issue 033: ドラッグ&ドロップ機能検証専用ページ
 * 目的: モックデータを用いたドラッグ&ドロップ機能の動作確認環境
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Task, TaskStatus } from '@/types/task';
import { useTaskActions } from '@/hooks/useTaskActions';
import { 
  dragTestTasks, 
  getTasksByStatus, 
  testCases,
  logDragOperation,
  generateTestTask,
  createTestScenario 
} from '@/data/mockTasksForDragTest';

/**
 * デバッグ情報の型定義
 */
interface DebugInfo {
  dragCount: number;
  lastDragOperation: string;
  apiCallLogs: string[];
  performanceMetrics: PerformanceMetrics;
}

interface PerformanceMetrics {
  dragStartTime: number;
  dragEndTime: number;
  duration: number;
  averageDragTime: number;
  successfulDrags: number;
  failedDrags: number;
}

/**
 * ドラッグ&ドロップ機能検証専用コンポーネント
 * 
 * 機能:
 * - 固定モックデータを使用したドラッグ&ドロップテスト環境
 * - リアルタイムログ記録とパフォーマンス測定
 * - 視覚的フィードバックの確認
 * - デバッグ情報の表示とエクスポート
 * - 各種テストシナリオの実行
 */
export const KanbanDragDropTest: React.FC = () => {
  // ===== 状態管理 =====
  const [tasks, setTasks] = useState<Task[]>(dragTestTasks);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    dragCount: 0,
    lastDragOperation: 'なし',
    apiCallLogs: [],
    performanceMetrics: {
      dragStartTime: 0,
      dragEndTime: 0,
      duration: 0,
      averageDragTime: 0,
      successfulDrags: 0,
      failedDrags: 0
    }
  });
  const [isLogging, setIsLogging] = useState<boolean>(true);
  const [selectedTestCase, setSelectedTestCase] = useState<string>('basic-drag-test');
  const [isDebugPanelExpanded, setIsDebugPanelExpanded] = useState<boolean>(true);
  const [dragStartTime, setDragStartTime] = useState<number>(0);

  // 既存のuseTaskActionsフックを活用（moveTask機能を統合）
  const { moveTask, isLoading, error, clearError } = useTaskActions();

  // ===== 計算プロパティ =====
  const tasksByStatus = useMemo(() => getTasksByStatus(tasks), [tasks]);
  const selectedTestCaseData = useMemo(() => 
    testCases.find(tc => tc.id === selectedTestCase), 
    [selectedTestCase]
  );

  // ===== イベントハンドラー =====

  /**
   * タスククリック時の処理
   * @param task クリックされたタスク
   */
  const handleTaskClick = useCallback((task: Task) => {
    if (isLogging) {
      logOperation('Task clicked', task);
      logDragOperation('TASK_CLICK', task, { timestamp: Date.now() });
    }
  }, [isLogging]);

  /**
   * タスク追加時の処理
   * @param status 追加先のステータス
   */
  const handleAddTask = useCallback((status: TaskStatus) => {
    if (isLogging) {
      const newTask = generateTestTask({ status });
      setTasks(prev => [...prev, newTask]);
      logOperation('Task added', newTask, { targetStatus: status });
      logDragOperation('TASK_ADD', newTask, { status });
    }
  }, [isLogging]);

  /**
   * 操作ログの記録
   * @param operation 操作名
   * @param task 対象タスク
   * @param details 詳細情報
   */
  const logOperation = useCallback((operation: string, task?: Task | null, details?: any) => {
    if (!isLogging) return;

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${operation}${task ? ` - ${task.title}` : ''}${details ? ` | ${JSON.stringify(details)}` : ''}`;

    setDebugInfo(prev => ({
      ...prev,
      lastDragOperation: operation,
      apiCallLogs: [...prev.apiCallLogs.slice(-99), logEntry] // 最新100件を保持
    }));
  }, [isLogging]);

  /**
   * ドラッグ開始時のハンドラー
   * @param event ドラッグ開始イベント
   */
  const handleDragStart = useCallback((event: any) => {
    const startTime = performance.now();
    setDragStartTime(startTime);
    
    const task = tasks.find(t => t.id === event.active.id);
    if (task && isLogging) {
      logOperation('Drag started', task, {
        taskId: event.active.id,
        startTime,
        fromStatus: task.status
      });
      
      // デバッグ情報の更新
      setDebugInfo(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          dragStartTime: startTime
        }
      }));
    }
  }, [tasks, isLogging, dragStartTime]);

  /**
   * ドラッグ終了時のハンドラー
   * @param event ドラッグ終了イベント
   */
  const handleDragEnd = useCallback(async (event: any) => {
    const endTime = performance.now();
    const duration = endTime - dragStartTime;
    let success = false;
    
    try {
      if (!event.over) {
        logOperation('Drag cancelled', null, { duration, reason: 'No valid drop target' });
        handleDragError('INVALID_DROP_TARGET', { event, duration });
        return;
      }
      
      const taskId = event.active.id as string;
      const newStatus = event.over.id as TaskStatus;
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        logOperation('Drag failed', null, { taskId, error: 'Task not found' });
        return;
      }
      
      if (task.status === newStatus) {
        logOperation('Drag completed (same status)', task, { duration, status: newStatus });
        success = true;
        return;
      }
      
      // API呼び出し前のログ
      logOperation('Moving task via API', task, { 
        fromStatus: task.status, 
        toStatus: newStatus 
      });
      
      // moveTask API呼び出し
      await moveTask(taskId, newStatus);
      
      // タスクの状態を更新
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      success = true;
      logOperation('Task moved successfully', task, { 
        fromStatus: task.status, 
        toStatus: newStatus, 
        duration 
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logOperation('Task move failed', null, { error: errorMessage, duration });
      handleDragError('API_ERROR', { error: err, duration });
    } finally {
      // パフォーマンス測定の更新
      updatePerformanceMetrics(duration, success);
    }
  }, [tasks, moveTask, dragStartTime, isLogging]);

  /**
   * パフォーマンス測定の更新
   * @param duration ドラッグ時間
   * @param success 成功フラグ
   */
  const updatePerformanceMetrics = useCallback((duration: number, success: boolean) => {
    setDebugInfo(prev => {
      const newSuccessful = success ? prev.performanceMetrics.successfulDrags + 1 : prev.performanceMetrics.successfulDrags;
      const newFailed = success ? prev.performanceMetrics.failedDrags : prev.performanceMetrics.failedDrags + 1;
      const totalDrags = newSuccessful + newFailed;
      const newAverage = totalDrags > 0 ? 
        (prev.performanceMetrics.averageDragTime * (totalDrags - 1) + duration) / totalDrags : 
        duration;

      return {
        ...prev,
        dragCount: prev.dragCount + 1,
        performanceMetrics: {
          ...prev.performanceMetrics,
          dragEndTime: performance.now(),
          duration,
          averageDragTime: newAverage,
          successfulDrags: newSuccessful,
          failedDrags: newFailed
        }
      };
    });
  }, []);

  /**
   * エラーハンドリング
   * @param errorType エラータイプ
   * @param details 詳細情報
   */
  const handleDragError = useCallback((errorType: string, details: any) => {
    const errorHandlers = {
      'DRAG_INTERRUPTED': () => {
        logOperation('ドラッグ操作が中断されました', null, details);
        // タスクを元の位置に戻す処理は不要（状態は変更されていない）
      },
      'INVALID_DROP_TARGET': () => {
        logOperation('無効なドロップ位置です', null, details);
        // ドロップを無効化し、元の位置に戻す処理は自動的に処理される
      },
      'MOCK_DATA_LOAD_ERROR': () => {
        logOperation('テストデータの読み込みに失敗しました', null, details);
        // フォールバックデータを使用する処理
        setTasks(dragTestTasks);
      },
      'PERFORMANCE_API_UNAVAILABLE': () => {
        console.warn('performance.now() が利用できません。Date.now()を使用します');
        // Date.now()を代替手段として使用（既にfallbackは実装済み）
      },
      'API_ERROR': () => {
        logOperation('API呼び出しエラー', null, details);
        // エラー情報をデバッグパネルに表示
      }
    };

    const handler = errorHandlers[errorType as keyof typeof errorHandlers];
    if (handler) handler();
  }, [logOperation]);

  /**
   * ログのクリア
   */
  const clearLogs = useCallback(() => {
    setDebugInfo(prev => ({
      ...prev,
      apiCallLogs: []
    }));
    clearError();
    console.clear();
  }, [clearError]);

  /**
   * テストのリセット
   */
  const resetTest = useCallback(() => {
    setTasks(dragTestTasks);
    setDebugInfo({
      dragCount: 0,
      lastDragOperation: 'なし',
      apiCallLogs: [],
      performanceMetrics: {
        dragStartTime: 0,
        dragEndTime: 0,
        duration: 0,
        averageDragTime: 0,
        successfulDrags: 0,
        failedDrags: 0
      }
    });
    clearError();
    logOperation('Test reset completed');
  }, [clearError]);

  /**
   * テストシナリオの変更
   * @param scenarioType シナリオタイプ
   */
  const changeTestScenario = useCallback((scenarioType: 'basic' | 'complex' | 'edge') => {
    const scenarioTasks = createTestScenario(scenarioType);
    setTasks(scenarioTasks);
    logOperation(`Test scenario changed to: ${scenarioType}`, null, { taskCount: scenarioTasks.length });
  }, []);

  /**
   * テスト結果のエクスポート
   */
  const exportTestResults = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      testCase: selectedTestCaseData,
      debugInfo,
      tasks: tasks.length,
      tasksByStatus: {
        todo: tasksByStatus.todo.length,
        in_progress: tasksByStatus.in_progress.length,
        done: tasksByStatus.done.length
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drag-drop-test-results-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logOperation('Test results exported');
  }, [debugInfo, tasks.length, tasksByStatus, selectedTestCaseData]);

  // ===== ライフサイクル =====
  useEffect(() => {
    // 初期化時のログ
    logOperation('KanbanDragDropTest component initialized', null, {
      totalTasks: dragTestTasks.length,
      testCasesAvailable: testCases.length
    });

    // クリーンアップ
    return () => {
      logOperation('KanbanDragDropTest component unmounting');
    };
  }, []);

  // ===== レンダリング =====
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              🧪 Issue 033: ドラッグ&ドロップテスト
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              モックデータを用いたドラッグ&ドロップ機能の検証環境
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>タスク総数: {tasks.length}件</span>
            <span>•</span>
            <span>ドラッグ回数: {debugInfo.dragCount}回</span>
            <span>•</span>
            <span className={isLogging ? 'text-green-600' : 'text-red-600'}>
              ログ記録: {isLogging ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* コントロールパネル */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* テストシナリオ選択 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">シナリオ:</label>
            <select
              value={selectedTestCase}
              onChange={(e) => setSelectedTestCase(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {testCases.map(testCase => (
                <option key={testCase.id} value={testCase.id}>
                  {testCase.name}
                </option>
              ))}
            </select>
          </div>

          {/* クイックシナリオ変更ボタン */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">クイック:</span>
            <button
              onClick={() => changeTestScenario('basic')}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              基本
            </button>
            <button
              onClick={() => changeTestScenario('complex')}
              className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              複合
            </button>
            <button
              onClick={() => changeTestScenario('edge')}
              className="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              エッジ
            </button>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            {/* ログ記録切り替え */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isLogging}
                onChange={(e) => setIsLogging(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              ログ記録
            </label>

            {/* 操作ボタン */}
            <button
              onClick={clearLogs}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              ログクリア
            </button>
            <button
              onClick={resetTest}
              className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              テストリセット
            </button>
            <button
              onClick={exportTestResults}
              className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              結果エクスポート
            </button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* カンバンボード（メインエリア） */}
        <div className="flex-1 min-h-0">
          {/* 注意: KanbanBoardコンポーネントは内部的にuseKanbanTasksを使用してタスクを取得するため、 */}
          {/* 独自のモックデータを使用する場合は、DndContext でラップしたカスタム実装が必要です */}
          <div className="h-full p-6">
            <div className="text-center text-orange-600 bg-orange-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-2">🚧 実装中の機能</h3>
              <p className="text-sm">
                KanbanBoardコンポーネントは内部的にuseKanbanTasksからタスクデータを取得するため、
                モックデータを使用したテストには専用の実装が必要です。
              </p>
              <p className="text-sm mt-2">
                現在のモックデータ: {tasks.length}件のタスク
              </p>
              <div className="flex justify-center gap-4 mt-2 text-xs">
                <span>Todo: {tasksByStatus.todo.length}件</span>
                <span>Progress: {tasksByStatus.in_progress.length}件</span>
                <span>Done: {tasksByStatus.done.length}件</span>
              </div>
            </div>
            
            {/* 暫定的なタスク表示（ドラッグ&ドロップ機能付き） */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* TODO カラム */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-4">To Do ({tasksByStatus.todo.length})</h3>
                <div className="space-y-3">
                  {tasksByStatus.todo.map(task => (
                    <div
                      key={task.id}
                      className="bg-gray-50 p-3 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1">{task.title}</div>
                      <div className="text-xs text-gray-500">Priority: {task.priority}</div>
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map(tag => (
                            <span key={tag.id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* IN PROGRESS カラム */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-4">In Progress ({tasksByStatus.in_progress.length})</h3>
                <div className="space-y-3">
                  {tasksByStatus.in_progress.map(task => (
                    <div
                      key={task.id}
                      className="bg-yellow-50 p-3 rounded border cursor-pointer hover:bg-yellow-100 transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1">{task.title}</div>
                      <div className="text-xs text-gray-500">Priority: {task.priority}</div>
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map(tag => (
                            <span key={tag.id} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* DONE カラム */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-4">Done ({tasksByStatus.done.length})</h3>
                <div className="space-y-3">
                  {tasksByStatus.done.map(task => (
                    <div
                      key={task.id}
                      className="bg-green-50 p-3 rounded border cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="font-medium text-sm text-gray-900 mb-1">{task.title}</div>
                      <div className="text-xs text-gray-500">Priority: {task.priority}</div>
                      {task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {task.tags.map(tag => (
                            <span key={tag.id} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-500">
              ⚠️ 注意: 現在はクリックのみ対応。ドラッグ&ドロップ機能は今後実装予定です。
            </div>
          </div>
        </div>

        {/* デバッグ情報パネル */}
        <div className={`${isDebugPanelExpanded ? 'lg:w-80' : 'lg:w-12'} transition-all duration-300 bg-white border-l border-gray-200 flex flex-col`}>
          {/* パネルヘッダー */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            {isDebugPanelExpanded && (
              <h3 className="text-lg font-medium text-gray-900">デバッグ情報</h3>
            )}
            <button
              onClick={() => setIsDebugPanelExpanded(!isDebugPanelExpanded)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title={isDebugPanelExpanded ? '折りたたむ' : '展開する'}
            >
              {isDebugPanelExpanded ? '⏴' : '⏵'}
            </button>
          </div>

          {/* パネル内容 */}
          {isDebugPanelExpanded && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* 基本統計 */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">基本統計</h4>
                  <div className="text-xs space-y-1 text-gray-600">
                    <div>ドラッグ回数: <span className="font-mono font-medium">{debugInfo.dragCount}</span></div>
                    <div>最終操作: <span className="font-mono text-xs">{debugInfo.lastDragOperation}</span></div>
                    <div>成功/失敗: <span className="font-mono font-medium text-green-600">{debugInfo.performanceMetrics.successfulDrags}</span>/<span className="font-mono font-medium text-red-600">{debugInfo.performanceMetrics.failedDrags}</span></div>
                  </div>
                </div>

                {/* パフォーマンスメトリクス */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">パフォーマンス</h4>
                  <div className="text-xs space-y-1 text-blue-600">
                    <div>平均ドラッグ時間: <span className="font-mono font-medium">{debugInfo.performanceMetrics.averageDragTime.toFixed(2)}ms</span></div>
                    <div>最終実行時間: <span className="font-mono font-medium">{debugInfo.performanceMetrics.duration.toFixed(2)}ms</span></div>
                  </div>
                </div>

                {/* タスク分布 */}
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-700 mb-2">タスク分布</h4>
                  <div className="text-xs space-y-1 text-green-600">
                    <div>Todo: <span className="font-mono font-medium">{tasksByStatus.todo.length}件</span></div>
                    <div>In Progress: <span className="font-mono font-medium">{tasksByStatus.in_progress.length}件</span></div>
                    <div>Done: <span className="font-mono font-medium">{tasksByStatus.done.length}件</span></div>
                  </div>
                </div>

                {/* 選択中のテストケース */}
                <div className="bg-purple-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-purple-700 mb-2">テストケース</h4>
                  <div className="text-xs text-purple-600">
                    <div className="font-medium">{selectedTestCaseData?.name || 'なし'}</div>
                    <div className="mt-1 text-purple-500">{selectedTestCaseData?.description || 'なし'}</div>
                    <div className="mt-2 text-purple-400">
                      期待動作: {selectedTestCaseData?.expectedBehavior || 'なし'}
                    </div>
                  </div>
                </div>

                {/* API呼び出しログ */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">API呼び出しログ</h4>
                  <div className="max-h-40 overflow-y-auto">
                    {debugInfo.apiCallLogs.length === 0 ? (
                      <div className="text-xs text-gray-400 italic">ログはありません</div>
                    ) : (
                      <div className="space-y-1">
                        {debugInfo.apiCallLogs.slice(-10).map((log, index) => (
                          <div key={index} className="text-xs font-mono text-gray-600 break-all">
                            {log}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};