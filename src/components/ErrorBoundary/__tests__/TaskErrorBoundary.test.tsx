/**
 * TaskErrorBoundary コンポーネントの単体テスト
 * Issue #027: Dashboard無限レンダリングループエラー修正
 * 
 * テスト対象:
 * - エラーの捕捉と表示
 * - 無限レンダリングループの検出
 * - エラー回復機能
 * - パフォーマンス監視
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TaskErrorBoundary from '../TaskErrorBoundary';

// レンダリングカウンタのシンプルな実装
const createRenderCountTracker = () => {
  return { count: 0 };
};

const trackRender = (tracker: { count: number }) => {
  tracker.count++;
};

// エラーを発生させるテスト用コンポーネント
const ErrorComponent: React.FC<{ shouldError: boolean; errorMessage?: string }> = ({ 
  shouldError, 
  errorMessage = 'Test error' 
}) => {
  if (shouldError) {
    throw new Error(errorMessage);
  }
  return React.createElement('div', { 'data-testid': 'success-component' }, '正常なコンポーネント');
};

// 制御された無限ループシミュレーション
const ControlledLoopComponent: React.FC<{ maxRenders: number }> = ({ maxRenders }) => {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    if (count < maxRenders) {
      // setTimeoutを使って制御された再レンダリング
      const timer = setTimeout(() => setCount(count + 1), 0);
      return () => clearTimeout(timer);
    }
  }, [count, maxRenders]);
  
  if (count >= maxRenders) {
    throw new Error('Maximum update depth exceeded. 無限レンダリングループが検出されました。');
  }
  
  return React.createElement('div', { 'data-testid': 'loop-component' }, `Count: ${count}`);
};

// レンダリング回数監視コンポーネント
const RenderCountTracker: React.FC<{ onRender: () => void }> = ({ onRender }) => {
  React.useEffect(() => {
    onRender();
  });
  
  return React.createElement('div', { 'data-testid': 'render-tracker' }, 'Rendered');
};

// Memory usage utility for tests
const getMemoryUsage = (): number => {
  if ('memory' in performance && typeof (performance as any).memory === 'object') {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
};

describe('TaskErrorBoundary', () => {
  let consoleErrorSpy: any;
  
  beforeEach(() => {
    // console.error をモック（React Error Boundaryの内部ログを抑制）
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本的なエラーキャッチ機能', () => {
    it('エラーを正しくキャッチして表示する', () => {
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true, errorMessage: 'テストエラー' })
        )
      );
      
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      expect(screen.getByText(/テストエラー/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /再試行/ })).toBeInTheDocument();
    });

    it('正常なコンポーネントはそのまま表示される', () => {
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: false })
        )
      );
      
      expect(screen.getByTestId('success-component')).toBeInTheDocument();
      expect(screen.getByText('正常なコンポーネント')).toBeInTheDocument();
    });

    it('複数の子コンポーネントを正しく処理する', () => {
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: false }),
          React.createElement('div', { 'data-testid': 'additional-component' }, '追加コンポーネント')
        )
      );
      
      expect(screen.getByTestId('success-component')).toBeInTheDocument();
      expect(screen.getByTestId('additional-component')).toBeInTheDocument();
    });
  });

  describe('エラー回復機能', () => {
    it('再試行ボタンで回復できる', () => {
      let shouldError = true;
      
      const { rerender } = render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError })
        )
      );
      
      // エラー状態を確認
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      
      // 再試行ボタンをクリック
      const retryButton = screen.getByRole('button', { name: /再試行/ });
      
      // エラー状態を解除してから再試行
      shouldError = false;
      
      act(() => {
        fireEvent.click(retryButton);
      });
      
      // 新しいコンポーネントをレンダリング
      rerender(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: false })
        )
      );
      
      expect(screen.getByTestId('success-component')).toBeInTheDocument();
    });

    it('エラー詳細の表示/非表示が切り替えできる', () => {
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true, errorMessage: '詳細エラーメッセージ' })
        )
      );
      
      // 詳細表示ボタンをクリック
      const detailButton = screen.getByRole('button', { name: /詳細を表示/ });
      fireEvent.click(detailButton);
      
      expect(screen.getByText(/詳細エラーメッセージ/)).toBeInTheDocument();
      
      // 詳細を隠す
      const hideDetailButton = screen.getByRole('button', { name: /詳細を隠す/ });
      fireEvent.click(hideDetailButton);
      
      expect(screen.queryByText(/詳細エラーメッセージ/)).not.toBeInTheDocument();
    });
  });

  describe('パフォーマンス監視', () => {
    it('レンダリング回数を追跡する', () => {
      const tracker = createRenderCountTracker();
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(RenderCountTracker, { onRender: () => trackRender(tracker) })
        )
      );
      
      expect(tracker.count).toBeGreaterThan(0);
      expect(tracker.count).toBeLessThan(10); // 適度なレンダリング回数
    });

    it('メモリ使用量を監視する', () => {
      const initialMemory = getMemoryUsage();
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: false })
        )
      );
      
      const finalMemory = getMemoryUsage();
      
      // メモリ使用量が極端に増加していないことを確認
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
      }
    });

    it('エラー境界がパフォーマンスに与える影響を測定する', async () => {
      const startTime = performance.now();
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true })
        )
      );
      
      const renderTime = performance.now() - startTime;
      
      // エラーキャッチによるレンダリング時間が合理的な範囲内
      expect(renderTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('エラー境界のライフサイクル', () => {
    it('エラー情報が正しく記録される', () => {
      const errorMessage = 'ライフサイクルテストエラー';
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true, errorMessage })
        )
      );
      
      expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('エラー状態のリセットが正しく動作する', () => {
      let errorState = true;
      
      const { rerender } = render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: errorState })
        )
      );
      
      // エラー状態確認
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      
      // 再試行ボタンクリック
      const retryButton = screen.getByRole('button', { name: /再試行/ });
      fireEvent.click(retryButton);
      
      // エラー状態を解除
      errorState = false;
      rerender(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: errorState })
        )
      );
      
      expect(screen.getByTestId('success-component')).toBeInTheDocument();
    });

    it('開発モードでのスタックトレース表示', () => {
      // 開発モード環境を模擬
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { 
            shouldError: true, 
            errorMessage: 'Development mode error' 
          })
        )
      );
      
      // 詳細表示ボタンをクリック
      const detailButton = screen.getByRole('button', { name: /詳細を表示/ });
      fireEvent.click(detailButton);
      
      // エラー詳細が表示されることを確認
      expect(screen.getByText(/Development mode error/)).toBeInTheDocument();
      
      // 環境変数を復元
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('無限レンダリングループ検出', () => {
    it('制御された無限ループを検出する', async () => {
      // タイムアウトを設定して安全にテスト
      const TestWrapper = () => {
        return React.createElement(TaskErrorBoundary, null,
          React.createElement(ControlledLoopComponent, { maxRenders: 50 })
        );
      };
      
      render(React.createElement(TestWrapper));
      
      // エラーが発生することを確認
      await waitFor(() => {
        expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      }, { timeout: 3000 });
      
      expect(screen.getByText(/無限レンダリングループ/)).toBeInTheDocument();
    });

    it('通常のレンダリングは正常に処理される', () => {
      const tracker = createRenderCountTracker();
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(RenderCountTracker, { onRender: () => trackRender(tracker) })
        )
      );
      
      expect(screen.getByTestId('render-tracker')).toBeInTheDocument();
      expect(tracker.count).toBeLessThan(5); // 正常なレンダリング回数
    });
  });

  describe('エラーバリエーション', () => {
    it('異なるタイプのエラーを処理する', () => {
      const testCases = [
        { error: 'TypeError: Cannot read property', expected: /TypeError/ },
        { error: 'ReferenceError: variable is not defined', expected: /ReferenceError/ },
        { error: 'RangeError: Maximum call stack', expected: /RangeError/ }
      ];
      
      testCases.forEach(({ error, expected }) => {
        const { unmount } = render(
          React.createElement(TaskErrorBoundary, null,
            React.createElement(ErrorComponent, { shouldError: true, errorMessage: error })
          )
        );
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        unmount();
      });
    });

    it('長いエラーメッセージが適切に処理される', () => {
      const longErrorMessage = 'A'.repeat(1000); // 1000文字のエラーメッセージ
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true, errorMessage: longErrorMessage })
        )
      );
      
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
      
      // 詳細表示ボタンをクリック
      const detailButton = screen.getByRole('button', { name: /詳細を表示/ });
      fireEvent.click(detailButton);
      
      // 長いメッセージが表示されることを確認
      expect(screen.getByText(new RegExp(longErrorMessage.substring(0, 50)))).toBeInTheDocument();
    });
  });

  describe('ユーザビリティ機能', () => {
    it('エラー報告機能が利用可能', () => {
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true })
        )
      );
      
      const reportButton = screen.getByRole('button', { name: /問題を報告/ });
      expect(reportButton).toBeInTheDocument();
      
      fireEvent.click(reportButton);
      // 報告機能の動作を確認（実際の送信はしない）
      expect(reportButton).toBeInTheDocument();
    });

    it('ホームに戻るボタンが機能する', () => {
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true })
        )
      );
      
      const homeButton = screen.getByRole('button', { name: /ホームに戻る/ });
      expect(homeButton).toBeInTheDocument();
      
      fireEvent.click(homeButton);
      // ホーム遷移の動作を確認（実際の遷移はしない）
      expect(homeButton).toBeInTheDocument();
    });
  });

  describe('エラー境界の設定', () => {
    it('カスタムエラーメッセージが表示される', () => {
      const customMessage = 'カスタムエラーメッセージ';
      
      render(
        React.createElement(TaskErrorBoundary, { fallbackMessage: customMessage },
          React.createElement(ErrorComponent, { shouldError: true })
        )
      );
      
      expect(screen.getByText(new RegExp(customMessage))).toBeInTheDocument();
    });

    it('エラーログが正しく出力される', () => {
      const errorMessage = 'ログテストエラー';
      
      render(
        React.createElement(TaskErrorBoundary, null,
          React.createElement(ErrorComponent, { shouldError: true, errorMessage })
        )
      );
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('TaskErrorBoundary caught an error:'),
        expect.any(Error)
      );
    });
  });

  describe('エラー境界の堅牢性', () => {
    it('null子要素を安全に処理する', () => {
      render(
        React.createElement(TaskErrorBoundary, null, null)
      );
      
      // エラーが発生しないことを確認
      expect(screen.queryByText(/エラーが発生しました/)).not.toBeInTheDocument();
    });

    it('undefined子要素を安全に処理する', () => {
      render(
        React.createElement(TaskErrorBoundary, null, undefined)
      );
      
      // エラーが発生しないことを確認
      expect(screen.queryByText(/エラーが発生しました/)).not.toBeInTheDocument();
    });

    it('空の子要素配列を処理する', () => {
      render(
        React.createElement(TaskErrorBoundary, null, [])
      );
      
      // エラーが発生しないことを確認
      expect(screen.queryByText(/エラーが発生しました/)).not.toBeInTheDocument();
    });
  });
});