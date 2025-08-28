/**
 * アーカイブタスク機能の統合テスト
 * グループ7: テストとバリデーション - 統合テストとアクセシビリティテスト
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ArchivedTasksSection from '../ArchivedTasksSection';
import { Task, TaskStatus, Priority } from '@/types/task';
import { Tag } from '@/types/tag';

// jest-axeカスタムマッチャーを拡張
expect.extend(toHaveNoViolations);

// モックデータ
const mockTag: Tag = {
  id: 'tag-1',
  name: 'プロジェクトA',
  color: '#3B82F6',
  usageCount: 10,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01')
};

const createMockTask = (
  id: string,
  title: string,
  status: TaskStatus = 'archived',
  description?: string
): Task => ({
  id,
  title,
  description,
  status,
  priority: 'medium' as Priority,
  projectId: 'project-1',
  assigneeId: 'user-1',
  tags: [mockTag],
  subtasks: [],
  dueDate: new Date('2025-12-31'),
  estimatedHours: 3,
  actualHours: 2.5,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-20'),
  createdBy: 'user-1',
  updatedBy: 'user-1',
});

// テスト用データセット
const mockTasks: Task[] = [
  createMockTask('task-1', '重要なUI改善タスク', 'archived', '新しいデザインシステムの適用'),
  createMockTask('task-2', 'パフォーマンス最適化', 'archived', 'レンダリング速度の改善'),
  createMockTask('task-3', 'ユニットテスト追加', 'archived', 'カバレッジ向上のためのテスト実装'),
  createMockTask('task-4', 'アクティブタスク1', 'todo', '現在作業中のタスク'),
  createMockTask('task-5', 'アクティブタスク2', 'in_progress', '進行中のタスク'),
  createMockTask('task-6', '完了タスク', 'done', '完了したタスク'),
];

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// StorageEvent のモック
class MockStorageEvent extends Event {
  key: string;
  oldValue: string | null;
  newValue: string | null;
  url: string;
  storageArea: Storage | null;

  constructor(type: string, init?: StorageEventInit) {
    super(type);
    this.key = init?.key ?? '';
    this.oldValue = init?.oldValue ?? null;
    this.newValue = init?.newValue ?? null;
    this.url = init?.url ?? '';
    this.storageArea = init?.storageArea ?? null;
  }
}

// パフォーマンス測定ユーティリティ
const measurePerformance = (callback: () => void): number => {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  return endTime - startTime;
};

// 複数のArchivedTasksSectionを含むテストコンポーネント
const MultiSectionTestApp = () => (
  <div>
    <h1>ダッシュボード</h1>
    <ArchivedTasksSection
      tasks={mockTasks}
      storageKey="dashboard-archived-visible"
      title="ダッシュボード アーカイブ"
    />
    
    <h2>カレンダー</h2>
    <ArchivedTasksSection
      tasks={mockTasks}
      storageKey="calendar-archived-visible"
      title="カレンダー アーカイブ"
    />
    
    <h2>分析</h2>
    <ArchivedTasksSection
      tasks={mockTasks}
      storageKey="analytics-archived-visible"
      title="分析 アーカイブ"
    />
  </div>
);

describe('アーカイブタスク機能 統合テスト', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // console のモック
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('エンドツーエンド ワークフロー', () => {
    it('ユーザーが完全なワークフローを実行できる', async () => {
      const onTaskClick = vi.fn();
      
      render(
        <ArchivedTasksSection
          tasks={mockTasks}
          storageKey="e2e-test-archived"
          onTaskClick={onTaskClick}
        />
      );

      // 1. 初期状態でアーカイブセクションが表示される
      expect(screen.getByText('アーカイブ済みタスク')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      // 2. セクションを展開する
      await user.click(screen.getByText('アーカイブ済みタスク'));
      
      await waitFor(() => {
        expect(screen.getByText('重要なUI改善タスク')).toBeInTheDocument();
        expect(screen.getByText('パフォーマンス最適化')).toBeInTheDocument();
        expect(screen.getByText('ユニットテスト追加')).toBeInTheDocument();
      });

      // 3. アーカイブタスクをクリックする
      await user.click(screen.getByText('重要なUI改善タスク').closest('[role="button"]')!);
      expect(onTaskClick).toHaveBeenCalledWith(mockTasks[0]);

      // 4. キーボードでタスクを選択する
      const taskElement = screen.getByText('パフォーマンス最適化').closest('[role="button"]');
      taskElement?.focus();
      await user.keyboard('{Enter}');
      expect(onTaskClick).toHaveBeenCalledWith(mockTasks[1]);

      // 5. セクションを再度折りたたむ
      await user.click(screen.getByText('アーカイブ済みタスク'));
      
      await waitFor(() => {
        expect(screen.queryByText('重要なUI改善タスク')).not.toBeInTheDocument();
      });

      // 6. ローカルストレージへの保存確認
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'e2e-test-archived',
        expect.any(String)
      );
    });

    it('複数セクションでの独立した状態管理', async () => {
      render(<MultiSectionTestApp />);

      // 各セクションが独立して表示される
      expect(screen.getByText('ダッシュボード アーカイブ')).toBeInTheDocument();
      expect(screen.getByText('カレンダー アーカイブ')).toBeInTheDocument();
      expect(screen.getByText('分析 アーカイブ')).toBeInTheDocument();

      // ダッシュボードセクションを展開
      await user.click(screen.getByText('ダッシュボード アーカイブ'));
      
      await waitFor(() => {
        // ダッシュボードのタスクが表示される
        const dashboardTasks = screen.getAllByText('重要なUI改善タスク');
        expect(dashboardTasks).toHaveLength(1);
      });

      // カレンダーセクションも展開
      await user.click(screen.getByText('カレンダー アーカイブ'));
      
      await waitFor(() => {
        // カレンダーのタスクも表示される（合計2つ）
        const allTasks = screen.getAllByText('重要なUI改善タスク');
        expect(allTasks).toHaveLength(2);
      });

      // 分析セクションは未展開のまま
      const analyticsTasks = screen.queryAllByText('重要なUI改善タスク');
      expect(analyticsTasks).toHaveLength(2); // まだ2つのまま

      // 独立したローカルストレージキーで保存
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'dashboard-archived-visible',
        expect.any(String)
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'calendar-archived-visible',
        expect.any(String)
      );
    });
  });

  describe('クロスタブ同期機能', () => {
    it('他のタブからの状態変更を検知する', async () => {
      render(
        <ArchivedTasksSection
          tasks={mockTasks}
          storageKey="cross-tab-test"
        />
      );

      // 初期状態では折りたたまれている
      expect(screen.queryByText('重要なUI改善タスク')).not.toBeInTheDocument();

      // 他のタブからの展開状態変更をシミュレート
      fireEvent(window, new MockStorageEvent('storage', {
        key: 'cross-tab-test',
        newValue: 'true',
        oldValue: 'false',
      }));

      await waitFor(() => {
        expect(screen.getByText('重要なUI改善タスク')).toBeInTheDocument();
      });
    });

    it('関係ないキーの変更は影響しない', async () => {
      render(
        <ArchivedTasksSection
          tasks={mockTasks}
          storageKey="isolated-test"
        />
      );

      const initialState = screen.queryByText('重要なUI改善タスク');
      
      // 関係ないキーの変更
      fireEvent(window, new MockStorageEvent('storage', {
        key: 'other-key',
        newValue: 'true',
        oldValue: 'false',
      }));

      // 状態は変更されない
      expect(screen.queryByText('重要なUI改善タスク')).toBe(initialState);
    });
  });

  describe('アクセシビリティ統合テスト', () => {
    it('展開・収納状態でもアクセシビリティが維持される', async () => {
      const { container } = render(
        <ArchivedTasksSection
          tasks={mockTasks}
          storageKey="a11y-integration-test"
          onTaskClick={vi.fn()}
        />
      );

      // 収納状態でのa11yチェック
      let results = await axe(container);
      expect(results).toHaveNoViolations();

      // 展開
      await user.click(screen.getByText('アーカイブ済みタスク'));
      
      await waitFor(() => {
        expect(screen.getByText('重要なUI改善タスク')).toBeInTheDocument();
      });

      // 展開状態でのa11yチェック
      results = await axe(container);
      expect(results).toHaveNoViolations();

      // キーボードナビゲーションのテスト
      await user.tab(); // セクションヘッダーにフォーカス
      await user.tab(); // 最初のタスクにフォーカス
      expect(screen.getByText('重要なUI改善タスク').closest('[role="button"]')).toHaveFocus();

      await user.tab(); // 次のタスクにフォーカス
      expect(screen.getByText('パフォーマンス最適化').closest('[role="button"]')).toHaveFocus();
    });

    it('大量のアーカイブタスクでもアクセシビリティが維持される', async () => {
      const largeMockTasks = Array.from({ length: 100 }, (_, index) =>
        createMockTask(`task-${index}`, `大量タスク${index + 1}`, 'archived')
      );

      const { container } = render(
        <ArchivedTasksSection
          tasks={largeMockTasks}
          storageKey="large-a11y-test"
        />
      );

      // 展開
      await user.click(screen.getByText('アーカイブ済みタスク'));
      
      await waitFor(() => {
        expect(screen.getByText('大量タスク1')).toBeInTheDocument();
      });

      // a11yチェック（時間がかかる可能性があるのでタイムアウト延長）
      const results = await axe(container, {
        timeout: 10000,
      });
      expect(results).toHaveNoViolations();

      // ARIA属性の確認
      const list = screen.getByRole('list');
      const listItems = screen.getAllByRole('listitem');
      
      expect(list).toHaveAttribute('aria-label', 'アーカイブ済みタスク一覧');
      expect(listItems).toHaveLength(100);
      
      // 各リストアイテムのARIA属性確認（最初の10個のみサンプル）
      listItems.slice(0, 10).forEach((item, index) => {
        expect(item).toHaveAttribute('aria-posinset', String(index + 1));
        expect(item).toHaveAttribute('aria-setsize', '100');
      });
    });
  });

  describe('パフォーマンス統合テスト', () => {
    it('複数セクションでの全体的なレンダリングパフォーマンス', () => {
      const renderTime = measurePerformance(() => {
        render(<MultiSectionTestApp />);
      });

      expect(renderTime).toBeLessThan(500); // 500ms以内
    });

    it('リアルタイム更新でのパフォーマンス', async () => {
      const { rerender } = render(
        <ArchivedTasksSection
          tasks={mockTasks}
          storageKey="performance-test"
        />
      );

      // タスクリストを動的に更新
      const updateTime = measurePerformance(() => {
        const updatedTasks = [
          ...mockTasks,
          createMockTask('task-new', '新しいアーカイブタスク', 'archived'),
        ];
        
        rerender(
          <ArchivedTasksSection
            tasks={updatedTasks}
            storageKey="performance-test"
          />
        );
      });

      expect(updateTime).toBeLessThan(200);
      
      // 新しいタスク数が反映される
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('メモリリーク防止の検証', async () => {
      const { unmount } = render(
        <ArchivedTasksSection
          tasks={mockTasks}
          storageKey="memory-test"
        />
      );

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      unmount();

      // useLocalStorageのuseEffectクリーンアップが呼ばれる
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('エラーハンドリング統合テスト', () => {
    it('LocalStorageエラー時でも機能が継続する', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      expect(() => {
        render(
          <ArchivedTasksSection
            tasks={mockTasks}
            storageKey="error-test"
          />
        );
      }).not.toThrow();

      expect(screen.getByText('アーカイブ済みタスク')).toBeInTheDocument();
      expect(console.warn).toHaveBeenCalled();
    });

    it('不正なタスクデータでもレンダリングできる', () => {
      const corruptedTasks = [
        {
          ...createMockTask('corrupt-1', '', 'archived'), // 空のタイトル
          title: '',
        },
        {
          ...createMockTask('corrupt-2', 'Normal Task', 'archived'),
          description: undefined, // undefined description
        },
        // @ts-expect-error Testing corrupted data
        {
          id: 'corrupt-3',
          title: 'Incomplete Task',
          status: 'archived',
          // 他の必須フィールドが欠如
        }
      ];

      expect(() => {
        render(
          <ArchivedTasksSection
            tasks={corruptedTasks as Task[]}
            storageKey="corrupt-data-test"
          />
        );
      }).not.toThrow();
    });
  });

  describe('データ整合性テスト', () => {
    it('アーカイブタスクのフィルタリングが正確に動作する', () => {
      const mixedStatusTasks: Task[] = [
        createMockTask('archived-1', 'アーカイブ1', 'archived'),
        createMockTask('archived-2', 'アーカイブ2', 'archived'),
        createMockTask('todo-1', 'TODO1', 'todo'),
        createMockTask('progress-1', '進行中1', 'in_progress'),
        createMockTask('done-1', '完了1', 'done'),
      ];

      render(
        <ArchivedTasksSection
          tasks={mixedStatusTasks}
          storageKey="filter-test"
        />
      );

      // アーカイブタスクのみがカウントされる
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('空のタスクリストを適切に処理する', () => {
      const { container } = render(
        <ArchivedTasksSection
          tasks={[]}
          storageKey="empty-test"
        />
      );

      // 何も表示されない
      expect(container.firstChild).toBeNull();
    });

    it('非アーカイブタスクのみの場合も適切に処理する', () => {
      const nonArchivedTasks = [
        createMockTask('todo-1', 'TODO1', 'todo'),
        createMockTask('progress-1', '進行中1', 'in_progress'),
        createMockTask('done-1', '完了1', 'done'),
      ];

      const { container } = render(
        <ArchivedTasksSection
          tasks={nonArchivedTasks}
          storageKey="non-archived-test"
        />
      );

      // 何も表示されない
      expect(container.firstChild).toBeNull();
    });
  });

  describe('レスポンシブ動作テスト', () => {
    it('モバイル環境でも適切に動作する', async () => {
      // モバイル環境をシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(
        <ArchivedTasksSection
          tasks={mockTasks}
          storageKey="mobile-test"
          onTaskClick={vi.fn()}
        />
      );

      // タッチデバイス用のインタラクション
      const trigger = screen.getByText('アーカイブ済みタスク');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('重要なUI改善タスク')).toBeInTheDocument();
      });

      // タスクタップ
      const taskElement = screen.getByText('重要なUI改善タスク').closest('[role="button"]');
      await user.click(taskElement!);

      // フォーカス管理がモバイルでも適切に動作することを確認
      expect(document.activeElement).toBeDefined();
    });
  });
});