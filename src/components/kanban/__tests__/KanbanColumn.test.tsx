/**
 * KanbanColumnコンポーネントのユニットテスト
 * Issue #039: ドラッグ&ドロップ機能 - タスク移動不可の修正テスト
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { KanbanColumn } from '../KanbanColumn';
import { Task, TaskStatus } from '@/types/task';

// モック設定
vi.mock('@/stores/projectStore', () => ({
  useProjectHelper: () => ({
    getProjectById: vi.fn(() => null),
  }),
}));

vi.mock('../ColumnHeader', () => ({
  ColumnHeader: ({ title, taskCount }: { title: string; taskCount: number }) => (
    <div data-testid="column-header">
      {title} ({taskCount})
    </div>
  ),
}));

vi.mock('../TaskCard', () => ({
  TaskCard: ({ task }: { task: Task }) => (
    <div data-testid="task-card" data-task-id={task.id}>
      {task.title}
    </div>
  ),
}));

vi.mock('../TaskCardCompact', () => ({
  TaskCardCompact: ({ task }: { task: Task }) => (
    <div data-testid="task-card-compact" data-task-id={task.id}>
      {task.title}
    </div>
  ),
}));

// テスト用のサンプルタスク
const createMockTask = (id: string, title: string, status: TaskStatus = 'todo'): Task => ({
  id,
  title,
  status,
  description: '',
  priority: 'medium',
  completed: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: 'test-user',
  updatedBy: 'test-user',
});

// テスト用のDndContextWrapper
const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndContext onDragEnd={() => {}}>{children}</DndContext>
);

describe('KanbanColumn', () => {
  const mockTasks: Task[] = [
    createMockTask('task-1', 'タスク1', 'todo'),
    createMockTask('task-2', 'タスク2', 'todo'),
  ];

  const defaultProps = {
    status: 'todo' as TaskStatus,
    title: 'ToDo',
    tasks: mockTasks,
    collapsedTasks: new Set<string>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ドロップゾーン構造の修正テスト (Issue #039)', () => {
    it('ドロップゾーンの基本構造が正しくレンダリングされる', () => {
      render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      // ドロップエリアのaria-labelが存在することを確認
      expect(screen.getByLabelText('ToDo ドロップエリア')).toBeInTheDocument();
      
      // タスク一覧のaria-labelが存在することを確認  
      expect(screen.getByLabelText('ToDo のタスク一覧')).toBeInTheDocument();
    });

    it('透明ドロップレイヤーが適切なz-indexクラスで作成される', () => {
      const { container } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      // 透明ドロップレイヤー（z-0クラス）の存在を確認
      const dropLayer = container.querySelector('.absolute.inset-0.z-0');
      expect(dropLayer).toBeInTheDocument();
      expect(dropLayer).toHaveAttribute('aria-hidden', 'true');
      expect(dropLayer).toHaveAttribute('title', 'ToDo エリアにタスクをドロップ');
    });

    it('タスクリストコンテナがz-10クラスで適切に配置される', () => {
      const { container } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      // タスクリストコンテナ（z-10クラス）の存在を確認
      const taskListContainer = container.querySelector('.relative.z-10');
      expect(taskListContainer).toBeInTheDocument();
      expect(taskListContainer).toHaveClass('p-4', 'space-y-3', 'overflow-y-auto', 'min-h-[200px]');
    });

    it('ドロップゾーンコンテナがrelative positioningを持つ', () => {
      const { container } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      // ドロップゾーンのメインコンテナ
      const dropZoneContainer = container.querySelector('.flex-1.relative');
      expect(dropZoneContainer).toBeInTheDocument();
      expect(dropZoneContainer).toHaveAttribute('role', 'region');
      expect(dropZoneContainer).toHaveAttribute('aria-label', 'ToDo ドロップエリア');
    });

    it('E2Eテスト用のdata-testid属性が正しく設定される', () => {
      render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      // カラムドロップゾーンのdata-testid
      expect(screen.getByTestId('column-todo')).toBeInTheDocument();
      
      // タスクアイテムのdata-testid
      const taskItems = screen.getAllByTestId('task-item');
      expect(taskItems).toHaveLength(2);
    });

    it('異なるstatusでもdata-testidが正しく設定される', () => {
      render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} status="in_progress" />
        </DndWrapper>
      );

      expect(screen.getByTestId('column-in_progress')).toBeInTheDocument();
    });
  });

  describe('タスク表示機能', () => {
    it('タスクが存在する場合、正常にタスクカードが表示される', () => {
      render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      const taskCards = screen.getAllByTestId('task-card');
      expect(taskCards).toHaveLength(2);
      expect(screen.getByText('タスク1')).toBeInTheDocument();
      expect(screen.getByText('タスク2')).toBeInTheDocument();
    });

    it('タスクが存在しない場合、空状態メッセージが表示される', () => {
      render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} tasks={[]} />
        </DndWrapper>
      );

      expect(screen.getByText('タスクがありません')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'タスクが存在しません');
    });

    it('コンパクトモードでタスクが正しく表示される', () => {
      render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} compact={true} />
        </DndWrapper>
      );

      const compactCards = screen.getAllByTestId('task-card-compact');
      expect(compactCards).toHaveLength(2);
      expect(screen.getByText('タスク1')).toBeInTheDocument();
    });
  });

  describe('アクセシビリティ対応', () => {
    it('適切なARIA属性が設定されている', () => {
      render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      // region role
      expect(screen.getByRole('region', { name: 'ToDo ドロップエリア' })).toBeInTheDocument();
      
      // list role
      expect(screen.getByRole('list', { name: 'ToDo のタスク一覧' })).toBeInTheDocument();
      
      // listitem role
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);
    });

    it('aria-live属性が正しく設定されている', () => {
      const { container } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      const taskList = container.querySelector('[aria-live="polite"]');
      expect(taskList).toBeInTheDocument();
      expect(taskList).toHaveAttribute('aria-atomic', 'false');
    });
  });

  describe('ドラッグオーバー状態の視覚フィードバック', () => {
    it('isDraggedOverプロパティがtrueの時、適切なスタイルが適用される', () => {
      const { container } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} isDraggedOver={true} />
        </DndWrapper>
      );

      const columnContainer = container.querySelector('.flex.flex-col.rounded-lg.border');
      expect(columnContainer).toHaveClass('bg-blue-50', 'border-blue-300', 'shadow-lg');
    });

    it('isDraggedOverプロパティがfalseの時、通常のスタイルが適用される', () => {
      const { container } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} isDraggedOver={false} />
        </DndWrapper>
      );

      const columnContainer = container.querySelector('.flex.flex-col.rounded-lg.border');
      expect(columnContainer).toHaveClass('bg-gray-50', 'border-gray-200');
    });
  });

  describe('プロップス変更時の挙動', () => {
    it('statusが変更された時、適切なaria-labelが更新される', () => {
      const { rerender } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} status="in_progress" title="進行中" />
        </DndWrapper>
      );

      expect(screen.getByLabelText('進行中 ドロップエリア')).toBeInTheDocument();
      expect(screen.getByLabelText('進行中 のタスク一覧')).toBeInTheDocument();

      rerender(
        <DndWrapper>
          <KanbanColumn {...defaultProps} status="done" title="完了" />
        </DndWrapper>
      );

      expect(screen.getByLabelText('完了 ドロップエリア')).toBeInTheDocument();
      expect(screen.getByLabelText('完了 のタスク一覧')).toBeInTheDocument();
    });

    it('tasksが変更された時、正しくタスクカードが更新される', () => {
      const initialTasks = [createMockTask('task-1', 'タスク1')];
      const updatedTasks = [
        createMockTask('task-1', 'タスク1'),
        createMockTask('task-3', 'タスク3'),
      ];

      const { rerender } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} tasks={initialTasks} />
        </DndWrapper>
      );

      expect(screen.getByText('タスク1')).toBeInTheDocument();
      expect(screen.queryByText('タスク3')).not.toBeInTheDocument();

      rerender(
        <DndWrapper>
          <KanbanColumn {...defaultProps} tasks={updatedTasks} />
        </DndWrapper>
      );

      expect(screen.getByText('タスク1')).toBeInTheDocument();
      expect(screen.getByText('タスク3')).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザインの維持', () => {
    it('必要なTailwind CSSクラスが適用されている', () => {
      const { container } = render(
        <DndWrapper>
          <KanbanColumn {...defaultProps} />
        </DndWrapper>
      );

      // ドロップゾーンコンテナ
      const dropZoneContainer = container.querySelector('.flex-1.relative');
      expect(dropZoneContainer).toBeInTheDocument();

      // 透明レイヤー
      const transparentLayer = container.querySelector('.absolute.inset-0.z-0');
      expect(transparentLayer).toBeInTheDocument();

      // タスクリストコンテナ
      const taskListContainer = container.querySelector('.p-4.space-y-3.overflow-y-auto.min-h-\\[200px\\].relative.z-10');
      expect(taskListContainer).toBeInTheDocument();
    });
  });
});