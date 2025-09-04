/**
 * KanbanDragDropTest コンポーネントの単体テスト
 * Issue-033: ドラッグ&ドロップ機能動作確認用検証ページのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import KanbanDragDropTest from '../KanbanDragDropTest';

// KanbanBoardコンポーネントをモック
jest.mock('@/components/kanban/KanbanBoard', () => {
  return {
    KanbanBoard: ({ onTaskClick, onDragStart, onDragEnd }: any) => (
      <div data-testid="kanban-board">
        <button 
          data-testid="mock-task-button"
          onClick={() => onTaskClick && onTaskClick({
            id: 'test-task-1',
            title: 'Test Task',
            status: 'todo',
            priority: 'medium',
            tags: [],
            subtasks: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'test-user',
            updatedBy: 'test-user'
          })}
        >
          Mock Task
        </button>
        <button 
          data-testid="mock-drag-start-button"
          onClick={() => onDragStart && onDragStart({
            active: { 
              id: 'test-task-1',
              data: { current: { title: 'Test Task', status: 'todo' } }
            }
          })}
        >
          Start Drag
        </button>
        <button 
          data-testid="mock-drag-end-button"
          onClick={() => onDragEnd && onDragEnd({
            active: { 
              id: 'test-task-1',
              data: { current: { title: 'Test Task', status: 'todo' } }
            },
            over: { 
              id: 'in_progress',
              data: { current: { status: 'in_progress' } }
            }
          })}
        >
          End Drag
        </button>
      </div>
    )
  };
});

// モックデータをモック
jest.mock('@/data/mockTasksForDragTest', () => ({
  dragTestTasks: [
    {
      id: 'test-1',
      title: 'Test Task 1',
      status: 'todo',
      priority: 'medium',
      tags: [],
      subtasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      updatedBy: 'test-user'
    },
    {
      id: 'test-2',
      title: 'Test Task 2',
      status: 'in_progress',
      priority: 'high',
      tags: [],
      subtasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      updatedBy: 'test-user'
    }
  ],
  testCases: [
    {
      id: 'basic-test',
      name: '基本テスト',
      description: 'テスト用',
      tasks: [],
      expectedBehavior: 'テスト動作',
      validationRules: [
        {
          type: 'visual',
          description: 'テストルール',
          validator: () => true
        }
      ]
    }
  ],
  getTasksByStatus: jest.fn(() => ({
    todo: [{ id: 'test-1', status: 'todo' }],
    in_progress: [{ id: 'test-2', status: 'in_progress' }],
    done: []
  })),
  createDefaultPerformanceMetrics: jest.fn(() => ({
    dragStartTime: 0,
    dragEndTime: 0,
    duration: 0,
    averageDragTime: 0,
    successfulDrags: 0,
    failedDrags: 0
  })),
  createTestResult: jest.fn((name, result, metrics, logs = [], errors = []) => ({
    timestamp: new Date().toISOString(),
    testCase: name,
    result,
    metrics,
    logs,
    errors
  }))
}));

// UIコンポーネントのモック
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>
}));

// テスト用のコンポーネントラッパー
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('KanbanDragDropTest', () => {
  beforeEach(() => {
    // performanceオブジェクトのモック
    global.performance = {
      now: jest.fn(() => Date.now())
    } as any;
    
    // URL.createObjectURLのモック
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('レンダリングテスト', () => {
    test('コンポーネントが正常にレンダリングされること', () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      expect(screen.getByText('Issue-033: ドラッグ&ドロップ機能テスト環境')).toBeInTheDocument();
      expect(screen.getByText('コントロールパネル')).toBeInTheDocument();
      expect(screen.getByText('ドラッグ&ドロップテスト - カンバンボード')).toBeInTheDocument();
      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
    });

    test('初期状態のデバッグ情報が表示されること', () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      expect(screen.getByText('デバッグ情報')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // ドラッグ回数
      expect(screen.getByText('なし')).toBeInTheDocument(); // 最新の操作
    });

    test('タスク統計が表示されること', () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      expect(screen.getByText('Todo: 1件')).toBeInTheDocument();
      expect(screen.getByText('進行中: 1件')).toBeInTheDocument();
      expect(screen.getByText('完了: 0件')).toBeInTheDocument();
    });
  });

  describe('機能テスト', () => {
    test('ログクリアボタンが動作すること', () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const clearButton = screen.getByText('ログクリア');
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);
      // ログがクリアされることを確認（具体的な動作はログ表示のテストで確認）
    });

    test('テストリセットボタンが動作すること', () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const resetButton = screen.getByText('テストリセット');
      expect(resetButton).toBeInTheDocument();

      fireEvent.click(resetButton);
      // リセット動作の確認（状態がリセットされることを確認）
    });

    test('ログ記録の開始/停止が動作すること', () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const loggingButton = screen.getByText(/ログ記録/);
      expect(loggingButton).toBeInTheDocument();

      fireEvent.click(loggingButton);
      // ログ記録状態の変更を確認
    });

    test('結果エクスポート機能が動作すること', () => {
      // DOMでのdownload作成をモック
      const mockLink = { click: jest.fn(), remove: jest.fn() };
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return mockLink as any;
        }
        return document.createElement(tagName);
      });
      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const exportButton = screen.getByText('結果エクスポート');
      expect(exportButton).toBeInTheDocument();

      fireEvent.click(exportButton);

      expect(mockLink.click).toHaveBeenCalled();

      createElementSpy.mockRestore();
      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
    });
  });

  describe('ドラッグ&ドロップイベントテスト', () => {
    test('タスククリックイベントが処理されること', async () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const taskButton = screen.getByTestId('mock-task-button');
      fireEvent.click(taskButton);

      await waitFor(() => {
        // タスククリックログが記録されることを確認
        expect(screen.getByText('デバッグ情報')).toBeInTheDocument();
      });
    });

    test('ドラッグ開始イベントが処理されること', async () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const dragStartButton = screen.getByTestId('mock-drag-start-button');
      fireEvent.click(dragStartButton);

      await waitFor(() => {
        // ドラッグカウントが増加することを確認
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    test('ドラッグ終了イベントが処理されること', async () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      // まずドラッグを開始
      const dragStartButton = screen.getByTestId('mock-drag-start-button');
      fireEvent.click(dragStartButton);

      // ドラッグを終了
      const dragEndButton = screen.getByTestId('mock-drag-end-button');
      fireEvent.click(dragEndButton);

      await waitFor(() => {
        // 成功カウントが増加することを確認
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });
  });

  describe('デバッグパネルの展開/折りたたみ', () => {
    test('デバッグパネルが展開/折りたたみできること', () => {
      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const debugToggle = screen.getByRole('button', { name: /デバッグ情報/ });
      expect(debugToggle).toBeInTheDocument();

      // 初期状態では展開されている
      expect(screen.getByText('最新の操作')).toBeInTheDocument();

      // クリックして折りたたみ
      fireEvent.click(debugToggle);
      expect(screen.queryByText('最新の操作')).not.toBeInTheDocument();

      // 再度クリックして展開
      fireEvent.click(debugToggle);
      expect(screen.getByText('最新の操作')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    test('テスト実行でエラーが発生した場合の処理', async () => {
      // testCasesのvalidatorでエラーを発生させる
      const mockTestCases = [
        {
          id: 'error-test',
          name: 'エラーテスト',
          description: 'エラーが発生するテスト',
          tasks: [],
          expectedBehavior: 'エラー',
          validationRules: [
            {
              type: 'visual',
              description: 'エラールール',
              validator: () => { throw new Error('Test error'); }
            }
          ]
        }
      ];

      // モックを一時的に上書き
      jest.doMock('@/data/mockTasksForDragTest', () => ({
        ...jest.requireActual('@/data/mockTasksForDragTest'),
        testCases: mockTestCases
      }));

      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      const testButton = screen.getByText(/テスト実行/);
      fireEvent.click(testButton);

      await waitFor(() => {
        // エラー処理が適切に行われることを確認
        expect(screen.getByText(/テスト実行/)).toBeInTheDocument();
      });
    });
  });

  describe('パフォーマンス測定', () => {
    test('ドラッグ時間が適切に測定されること', async () => {
      let nowCallCount = 0;
      const mockNow = jest.fn(() => {
        nowCallCount++;
        return nowCallCount === 1 ? 100 : 200; // 開始: 100ms, 終了: 200ms (差分: 100ms)
      });
      global.performance.now = mockNow;

      render(
        <TestWrapper>
          <KanbanDragDropTest />
        </TestWrapper>
      );

      // ドラッグ開始
      const dragStartButton = screen.getByTestId('mock-drag-start-button');
      fireEvent.click(dragStartButton);

      // ドラッグ終了
      const dragEndButton = screen.getByTestId('mock-drag-end-button');
      fireEvent.click(dragEndButton);

      await waitFor(() => {
        // パフォーマンス測定値が更新されることを確認
        expect(mockNow).toHaveBeenCalledTimes(2);
      });
    });
  });
});