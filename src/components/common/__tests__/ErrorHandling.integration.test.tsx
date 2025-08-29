/**
 * エラーハンドリング基盤統合テスト
 * 設計書のエラーハンドリング戦略に基づく包括的テスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// テスト対象のコンポーネント
import { ErrorBoundary } from '../ErrorBoundary';
import { TaskErrorBoundary } from '../../task/TaskErrorBoundary';
import { ProjectErrorBoundary } from '../../project/ProjectErrorBoundary';

// API エラーハンドリング
import { 
  ApiError, 
  NetworkError, 
  ValidationError,
  BusinessError,
  TimeoutError,
  apiClient,
  handleApiError,
  getErrorMessage,
  isRetryableError 
} from '../../../lib/api';

// ロガー
import { logger, LogLevel, createLogger } from '../../../lib/logger';

// テスト用コンポーネント（エラーを発生させる）
const ThrowingComponent: React.FC<{ errorType: string }> = ({ errorType }) => {
  switch (errorType) {
    case 'api':
      throw new ApiError(500, 'SERVER_ERROR', 'Internal server error');
    case 'network':
      throw new NetworkError('Network connection failed');
    case 'validation':
      throw new ValidationError('Validation failed', { email: ['Invalid format'] });
    case 'business':
      throw new BusinessError('BUSINESS_RULE', 'Business rule violation');
    case 'timeout':
      throw new TimeoutError(5000);
    case 'generic':
      throw new Error('Generic error');
    default:
      return <div>No error</div>;
  }
};

// テスト用タスクコンポーネント
const TaskComponent: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('Task CRUD operation failed');
  }
  return <div>Task component working</div>;
};

// テスト用プロジェクトコンポーネント
const ProjectComponent: React.FC<{ shouldError: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('Project member management failed');
  }
  return <div>Project component working</div>;
};

// モックのfetch関数
const mockFetch = vi.fn();

describe('エラーハンドリング基盤統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    
    // コンソールメソッドをモック（テスト出力を綺麗にする）
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('React Error Boundary', () => {
    it('汎用エラー境界が正常に動作する', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent errorType="generic" />
        </ErrorBoundary>
      );

      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });

    it('エラーリセット機能が動作する', async () => {
      const TestComponent = () => {
        const [shouldError, setShouldError] = React.useState(true);
        
        React.useEffect(() => {
          const timer = setTimeout(() => setShouldError(false), 100);
          return () => clearTimeout(timer);
        }, []);

        return shouldError ? <ThrowingComponent errorType="generic" /> : <div>Recovered</div>;
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
      
      const resetButton = screen.getByText('再試行');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('Recovered')).toBeInTheDocument();
      });
    });

    it('Task専用エラー境界がタスクエラーを適切に処理する', () => {
      render(
        <TaskErrorBoundary>
          <TaskComponent shouldError={true} />
        </TaskErrorBoundary>
      );

      expect(screen.getByText('タスクの保存・更新でエラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('タスクを再読み込み')).toBeInTheDocument();
    });

    it('Project専用エラー境界がプロジェクトエラーを適切に処理する', () => {
      render(
        <ProjectErrorBoundary>
          <ProjectComponent shouldError={true} />
        </ProjectErrorBoundary>
      );

      expect(screen.getByText('プロジェクトメンバー管理でエラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('プロジェクトを再読み込み')).toBeInTheDocument();
    });
  });

  describe('API エラーハンドリング', () => {
    it('APIエラーが適切に分類される', () => {
      const apiError = new ApiError(400, 'VALIDATION_ERROR', 'Bad request');
      expect(apiError.userMessage).toBe('入力データに問題があります。内容を確認してください。');
      expect(apiError.isRetryable).toBe(false);
    });

    it('ネットワークエラーがリトライ可能として判定される', () => {
      const networkError = new NetworkError('Connection failed');
      expect(networkError.isRetryable).toBe(true);
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('タイムアウトエラーが適切に処理される', () => {
      const timeoutError = new TimeoutError(5000);
      expect(timeoutError.message).toBe('リクエストがタイムアウトしました (5000ms)');
      expect(timeoutError.isRetryable).toBe(true);
    });

    it('バリデーションエラーのフィールドエラーが取得できる', () => {
      const validationError = new ValidationError('Validation failed', {
        email: ['Invalid format', 'Required'],
        password: ['Too short']
      });
      
      expect(validationError.fieldErrors.email).toEqual(['Invalid format', 'Required']);
      expect(validationError.fieldErrors.password).toEqual(['Too short']);
    });

    it('エラーメッセージが適切にユーザーフレンドリーになる', () => {
      const apiError = new ApiError(401, 'UNAUTHORIZED', 'Unauthorized access');
      const networkError = new NetworkError();
      const genericError = new Error('Unknown error');

      expect(getErrorMessage(apiError)).toBe('ログインが必要です。再度ログインしてください。');
      expect(getErrorMessage(networkError)).toBe('ネットワークエラーが発生しました');
      expect(getErrorMessage(genericError)).toBe('Unknown error');
    });
  });

  describe('API リトライ機能', () => {
    it('リトライ可能エラーで自動リトライが実行される', async () => {
      let attemptCount = 0;
      mockFetch
        .mockImplementationOnce(() => {
          attemptCount++;
          return Promise.reject(new Error('Network error'));
        })
        .mockImplementationOnce(() => {
          attemptCount++;
          return Promise.reject(new Error('Network error'));
        })
        .mockImplementationOnce(() => {
          attemptCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: 'success' })
          });
        });

      try {
        await apiClient.get('/test', { 
          retry: { 
            maxRetries: 2, 
            initialDelay: 10,
            enableJitter: false 
          }
        });
      } catch (error) {
        // リトライ後の結果を確認
      }

      expect(attemptCount).toBe(3); // 初回 + 2回リトライ
    });

    it('リトライ不可能エラーで即座に失敗する', async () => {
      mockFetch.mockRejectedValue(new ApiError(400, 'BAD_REQUEST', 'Bad request'));

      await expect(
        apiClient.get('/test', { 
          retry: { maxRetries: 2, initialDelay: 10 }
        })
      ).rejects.toThrow('Bad request');

      expect(mockFetch).toHaveBeenCalledTimes(1); // リトライしない
    });
  });

  describe('構造化ログ', () => {
    it('ログレベル別の出力が正常に動作する', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      
      logger.setLevel(LogLevel.ERROR);
      logger.info('Info message'); // 出力されない
      logger.error('Error message'); // 出力される

      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('コンテキスト情報が正しく記録される', () => {
      const consoleSpy = vi.spyOn(console, 'info');
      
      logger.setContext('requestId', 'req-123');
      logger.setContext('feature', 'task');
      logger.info('Test message', { operation: 'create' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message'),
        expect.objectContaining({ 
          requestId: 'req-123',
          feature: 'task',
          operation: 'create'
        }),
        expect.any(Object)
      );
    });

    it('機能別ロガーが独立したコンテキストを持つ', () => {
      const taskLogger = createLogger('task', 'TaskList');
      const projectLogger = createLogger('project', 'ProjectCard');

      const consoleSpy = vi.spyOn(console, 'info');

      taskLogger.info('Task operation');
      projectLogger.info('Project operation');

      expect(consoleSpy).toHaveBeenNthCalledWith(1,
        expect.stringContaining('Task operation'),
        expect.objectContaining({ feature: 'task', component: 'TaskList' }),
        expect.any(Object)
      );

      expect(consoleSpy).toHaveBeenNthCalledWith(2,
        expect.stringContaining('Project operation'),
        expect.objectContaining({ feature: 'project', component: 'ProjectCard' }),
        expect.any(Object)
      );
    });
  });

  describe('統合エラーハンドリングフロー', () => {
    it('API → ErrorBoundary → Log の統合フローが正常に動作する', async () => {
      const onError = vi.fn();
      const loggerSpy = vi.spyOn(logger, 'error');

      // API呼び出しが失敗するコンポーネント
      const ApiComponent = () => {
        React.useEffect(() => {
          handleApiError(new ApiError(500, 'SERVER_ERROR', 'Server failed'));
        }, []);
        return <div>API Component</div>;
      };

      render(
        <ErrorBoundary onError={onError}>
          <ApiComponent />
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(loggerSpy).toHaveBeenCalledWith(
          'API Error occurred',
          expect.objectContaining({
            status: 500,
            code: 'SERVER_ERROR',
            message: 'Server failed'
          }),
          expect.any(ApiError)
        );
      });
    });

    it('多層エラーハンドリングが正常に動作する', () => {
      const outerOnError = vi.fn();
      const innerOnError = vi.fn();

      render(
        <ErrorBoundary onError={outerOnError}>
          <TaskErrorBoundary onError={innerOnError}>
            <TaskComponent shouldError={true} />
          </TaskErrorBoundary>
        </ErrorBoundary>
      );

      // 内側のErrorBoundaryでキャッチされる
      expect(screen.getByText('タスクの保存・更新でエラーが発生しました')).toBeInTheDocument();
      expect(innerOnError).toHaveBeenCalled();
      expect(outerOnError).not.toHaveBeenCalled();
    });
  });

  describe('エラー回復とユーザビリティ', () => {
    it('エラー状態からの回復操作が正常に動作する', async () => {
      const RecoveryComponent = () => {
        const [hasError, setHasError] = React.useState(true);
        
        const triggerError = () => setHasError(true);
        const recover = () => setHasError(false);

        if (hasError) {
          throw new Error('Recoverable error');
        }

        return (
          <div>
            <div>Component recovered</div>
            <button onClick={triggerError}>Trigger Error</button>
          </div>
        );
      };

      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <RecoveryComponent />
        </ErrorBoundary>
      );

      // エラー状態を確認
      expect(screen.getByText('予期しないエラーが発生しました')).toBeInTheDocument();
      
      // 回復操作
      const resetButton = screen.getByText('再試行');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByText('Component recovered')).toBeInTheDocument();
      });
    });
  });
});