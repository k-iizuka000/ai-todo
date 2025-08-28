/**
 * ArchivedTasksSectionコンポーネントのユニットテスト
 * グループ7: テストとバリデーション - アーカイブタスク専用セクション
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
  name: 'テストタグ',
  color: '#3B82F6',
  usageCount: 5,
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
  estimatedHours: 2,
  actualHours: 1.5,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-15'),
  createdBy: 'user-1',
  updatedBy: 'user-1',
});

const mockArchivedTasks: Task[] = [
  createMockTask('task-1', 'アーカイブタスク1', 'archived', 'アーカイブされたタスクの説明1'),
  createMockTask('task-2', 'アーカイブタスク2', 'archived', 'アーカイブされたタスクの説明2'),
  createMockTask('task-3', 'アーカイブタスク3', 'archived'),
];

const mockMixedTasks: Task[] = [
  ...mockArchivedTasks,
  createMockTask('task-4', 'アクティブタスク1', 'todo'),
  createMockTask('task-5', 'アクティブタスク2', 'in_progress'),
  createMockTask('task-6', '完了タスク1', 'done'),
];

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// パフォーマンステスト用のユーティリティ
const measurePerformance = (callback: () => void): number => {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  return endTime - startTime;
};

describe('ArchivedTasksSection', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本レンダリング', () => {
    it('アーカイブタスクが存在する場合に正常にレンダリングされる', () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      expect(screen.getByTestId('archived-tasks-section')).toBeInTheDocument();
      expect(screen.getByText('アーカイブ済みタスク')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // タスクカウント
    });

    it('アーカイブタスクが存在しない場合は何も表示されない', () => {
      const { container } = render(
        <ArchivedTasksSection
          tasks={[createMockTask('task-1', 'アクティブタスク', 'todo')]}
          storageKey="test-archived-visible"
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('混在タスクからアーカイブタスクのみフィルタリングされる', () => {
      render(
        <ArchivedTasksSection
          tasks={mockMixedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      expect(screen.getByText('3')).toBeInTheDocument(); // アーカイブタスクのみカウント
    });

    it('カスタムタイトルが表示される', () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
          title="カスタムアーカイブ"
        />
      );
      
      expect(screen.getByText('カスタムアーカイブ')).toBeInTheDocument();
    });
  });

  describe('ローカルストレージ統合', () => {
    it('初期状態でローカルストレージから値を読み込む', () => {
      localStorageMock.getItem.mockReturnValue('true');
      
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-archived-visible');
    });

    it('展開状態の変更がローカルストレージに保存される', async () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const trigger = screen.getByText('アーカイブ済みタスク');
      await user.click(trigger);
      
      // useLocalStorageフックによりlocalStorage.setItemが呼ばれる
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });
  });

  describe('アコーディオン操作', () => {
    it('トリガークリックで展開・収納が切り替わる', async () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const trigger = screen.getByText('アーカイブ済みタスク');
      
      // 初期状態では収納されている
      expect(screen.queryByText('アーカイブタスク1')).not.toBeInTheDocument();
      
      // クリックして展開
      await user.click(trigger);
      
      await waitFor(() => {
        expect(screen.getByText('アーカイブタスク1')).toBeInTheDocument();
        expect(screen.getByText('アーカイブタスク2')).toBeInTheDocument();
        expect(screen.getByText('アーカイブタスク3')).toBeInTheDocument();
      });
    });

    it('キーボード操作で展開・収納が切り替わる', async () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const trigger = screen.getByText('アーカイブ済みタスク');
      trigger.focus();
      
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('アーカイブタスク1')).toBeInTheDocument();
      });
    });
  });

  describe('タスク表示', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('true'); // 展開状態
    });

    it('デフォルトのタスクアイテムが正しく表示される', () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      expect(screen.getByText('アーカイブタスク1')).toBeInTheDocument();
      expect(screen.getByText('アーカイブされたタスクの説明1')).toBeInTheDocument();
      expect(screen.getByText('アーカイブ済み')).toBeInTheDocument();
      expect(screen.getByText('期限: 2025/12/31')).toBeInTheDocument();
    });

    it('説明がないタスクでも正常に表示される', () => {
      render(
        <ArchivedTasksSection
          tasks={[createMockTask('task-3', 'アーカイブタスク3', 'archived')]}
          storageKey="test-archived-visible"
        />
      );
      
      expect(screen.getByText('アーカイブタスク3')).toBeInTheDocument();
      expect(screen.queryByText('アーカイブされたタスクの説明3')).not.toBeInTheDocument();
    });

    it('期限がないタスクでも正常に表示される', () => {
      const taskWithoutDueDate = {
        ...createMockTask('task-no-due', 'タスク期限なし', 'archived'),
        dueDate: undefined,
      };
      
      render(
        <ArchivedTasksSection
          tasks={[taskWithoutDueDate]}
          storageKey="test-archived-visible"
        />
      );
      
      expect(screen.getByText('タスク期限なし')).toBeInTheDocument();
      expect(screen.queryByText(/期限:/)).not.toBeInTheDocument();
    });
  });

  describe('カスタムレンダラー', () => {
    it('カスタムrenderTask関数が使用される', () => {
      const customRenderTask = vi.fn((task: Task) => (
        <div key={task.id} data-testid={`custom-task-${task.id}`}>
          カスタム: {task.title}
        </div>
      ));
      
      localStorageMock.getItem.mockReturnValue('true'); // 展開状態
      
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
          renderTask={customRenderTask}
        />
      );
      
      expect(customRenderTask).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId('custom-task-task-1')).toBeInTheDocument();
      expect(screen.getByText('カスタム: アーカイブタスク1')).toBeInTheDocument();
    });
  });

  describe('タスククリック処理', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('true'); // 展開状態
    });

    it('onTaskClickが設定されている場合にクリック可能になる', async () => {
      const onTaskClick = vi.fn();
      
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
          onTaskClick={onTaskClick}
        />
      );
      
      const taskElement = screen.getByText('アーカイブタスク1').closest('[role="button"]');
      expect(taskElement).toBeInTheDocument();
      expect(taskElement).toHaveAttribute('tabIndex', '0');
      
      await user.click(taskElement!);
      expect(onTaskClick).toHaveBeenCalledWith(mockArchivedTasks[0]);
    });

    it('キーボード操作でもタスククリックが発動する', async () => {
      const onTaskClick = vi.fn();
      
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
          onTaskClick={onTaskClick}
        />
      );
      
      const taskElement = screen.getByText('アーカイブタスク1').closest('[role="button"]');
      taskElement?.focus();
      
      await user.keyboard('{Enter}');
      expect(onTaskClick).toHaveBeenCalledWith(mockArchivedTasks[0]);
      
      await user.keyboard(' ');
      expect(onTaskClick).toHaveBeenCalledTimes(2);
    });

    it('onTaskClickが設定されていない場合はクリック不可', () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const taskElement = screen.getByText('アーカイブタスク1').closest('div');
      expect(taskElement).not.toHaveAttribute('role', 'button');
      expect(taskElement).not.toHaveAttribute('tabIndex');
    });
  });

  describe('アクセシビリティテスト', () => {
    it('適切なARIA属性が設定されている', () => {
      localStorageMock.getItem.mockReturnValue('true');
      
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const list = screen.getByRole('list', { name: 'アーカイブ済みタスク一覧' });
      expect(list).toBeInTheDocument();
      
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(3);
      
      listItems.forEach((item, index) => {
        expect(item).toHaveAttribute('aria-posinset', String(index + 1));
        expect(item).toHaveAttribute('aria-setsize', '3');
      });
      
      const countLabel = screen.getByLabelText('3件のアーカイブタスク');
      expect(countLabel).toBeInTheDocument();
    });

    it('axe-coreでアクセシビリティ違反がない（収納状態）', async () => {
      const { container } = render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('axe-coreでアクセシビリティ違反がない（展開状態）', async () => {
      localStorageMock.getItem.mockReturnValue('true');
      
      const { container } = render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('クリック可能なタスクにアクセシビリティ属性が付与される', () => {
      localStorageMock.getItem.mockReturnValue('true');
      const onTaskClick = vi.fn();
      
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
          onTaskClick={onTaskClick}
        />
      );
      
      const clickableTask = screen.getByText('アーカイブタスク1').closest('[role="button"]');
      expect(clickableTask).toHaveAttribute('tabIndex', '0');
      expect(clickableTask).toHaveClass('cursor-pointer');
    });
  });

  describe('パフォーマンステスト', () => {
    it('初期レンダリング時間が200ms以内である', () => {
      const renderTime = measurePerformance(() => {
        render(
          <ArchivedTasksSection
            tasks={mockArchivedTasks}
            storageKey="test-archived-visible"
          />
        );
      });
      
      expect(renderTime).toBeLessThan(200);
    });

    it('展開/収納切り替え時間が200ms以内である', async () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      const trigger = screen.getByText('アーカイブ済みタスク');
      
      const toggleTime = measurePerformance(() => {
        fireEvent.click(trigger);
      });
      
      expect(toggleTime).toBeLessThan(200);
    });

    it('大量のアーカイブタスクでもパフォーマンスが維持される', () => {
      const largeMockTasks = Array.from({ length: 1000 }, (_, index) =>
        createMockTask(`task-${index}`, `大量タスク${index + 1}`, 'archived')
      );
      
      const renderTime = measurePerformance(() => {
        render(
          <ArchivedTasksSection
            tasks={largeMockTasks}
            storageKey="test-archived-visible"
          />
        );
      });
      
      expect(renderTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('メモ化とパフォーマンス最適化', () => {
    it('useMemoによるアーカイブタスクフィルタリングの最適化', () => {
      const { rerender } = render(
        <ArchivedTasksSection
          tasks={mockMixedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      // タスクリストが変更されない場合、再計算されない
      rerender(
        <ArchivedTasksSection
          tasks={mockMixedTasks}
          storageKey="test-archived-visible"
          title="変更されたタイトル"
        />
      );
      
      expect(screen.getByText('3')).toBeInTheDocument(); // カウントは変わらない
    });
  });

  describe('CSS クラスとスタイリング', () => {
    it('カスタムクラスが正しく適用される', () => {
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
          className="custom-archived-section"
        />
      );
      
      const section = screen.getByTestId('archived-tasks-section');
      expect(section).toHaveClass('custom-archived-section');
    });

    it('デフォルトスタイルが適用されている', () => {
      localStorageMock.getItem.mockReturnValue('true');
      
      render(
        <ArchivedTasksSection
          tasks={mockArchivedTasks}
          storageKey="test-archived-visible"
        />
      );
      
      // タスクアイテムのスタイル確認
      const taskElements = screen.getAllByText(/アーカイブタスク\d/);
      taskElements.forEach(element => {
        const taskContainer = element.closest('div');
        expect(taskContainer).toHaveClass('transition-colors', 'duration-200');
      });
      
      // 取り消し線スタイルの確認
      taskElements.forEach(element => {
        expect(element).toHaveClass('line-through');
      });
    });
  });

  describe('エラー処理', () => {
    it('不正なタスクデータでもエラーにならない', () => {
      const invalidTasks = [
        {
          ...createMockTask('invalid-task', 'Invalid Task', 'archived'),
          title: '', // 空のタイトル
        }
      ];
      
      expect(() => {
        render(
          <ArchivedTasksSection
            tasks={invalidTasks}
            storageKey="test-archived-visible"
          />
        );
      }).not.toThrow();
    });

    it('ローカルストレージエラー時でもレンダリングされる', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      expect(() => {
        render(
          <ArchivedTasksSection
            tasks={mockArchivedTasks}
            storageKey="test-archived-visible"
          />
        );
      }).not.toThrow();
    });
  });
});