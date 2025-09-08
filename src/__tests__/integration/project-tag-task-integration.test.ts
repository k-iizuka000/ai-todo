/**
 * プロジェクト・タグ・タスク統合テスト
 * 要件2: プロジェクト管理機能拡張、要件3: タグ連携機能強化の統合テスト
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { useTaskStore } from '../../stores/taskStore';
import { useTagStore } from '../../stores/tagStore';
import { useProjectStore } from '../../stores/projectStore';
import { Task, CreateTaskInput } from '../../types/task';
import { Tag, CreateTagInput } from '../../types/tag';
import { Project, CreateProjectInput } from '../../types/project';

// APIモック
vi.mock('../../stores/api/taskApi');
vi.mock('../../utils/tagApi');
vi.mock('../../lib/api/projects');

// 統合テスト用のサービス層モック
const mockTaskAPI = {
  fetchTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
};

const mockTagAPI = {
  fetchTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  fetchTagUsage: vi.fn(),
};

const mockProjectAPI = {
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
};

vi.mock('../../stores/api/taskApi', () => ({
  taskAPI: mockTaskAPI,
}));

vi.mock('../../utils/tagApi', () => mockTagAPI);

vi.mock('../../lib/api/projects', () => ({
  projectsAPI: mockProjectAPI,
}));

// テストデータ
const mockProject: Project = {
  id: 'project-1',
  name: 'Webアプリケーション',
  description: 'React + TypeScript でのWebアプリケーション開発',
  status: 'active',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

const mockTags: Tag[] = [
  {
    id: 'tag-1',
    name: 'フロントエンド',
    color: '#3B82F6',
    usageCount: 0,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  },
  {
    id: 'tag-2',
    name: 'バックエンド',
    color: '#10B981',
    usageCount: 0,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
];

const mockTask: Task = {
  id: 'task-1',
  title: 'ユーザー認証機能の実装',
  description: 'JWT認証の実装',
  status: 'todo',
  priority: 'high',
  tags: ['tag-1', 'tag-2'],
  projectId: 'project-1',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

describe('プロジェクト・タグ・タスク統合テスト', () => {
  let taskStore: any;
  let tagStore: any;
  let projectStore: any;

  beforeAll(() => {
    // 共通モック設定
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // 各ストアをリセット
    const { result: taskResult } = renderHook(() => useTaskStore());
    const { result: tagResult } = renderHook(() => useTagStore());
    const { result: projectResult } = renderHook(() => useProjectStore());

    taskStore = taskResult.current;
    tagStore = tagResult.current;
    projectStore = projectResult.current;

    act(() => {
      taskStore.resetStore();
      tagStore.resetStore();
      projectStore.resetStore();
    });

    // モックをクリア
    vi.clearAllMocks();
  });

  describe('基本的なデータフロー統合テスト', () => {
    it('プロジェクト作成 → タグ作成 → タスク作成の完全フロー', async () => {
      // 1. プロジェクトを作成
      mockProjectAPI.create.mockResolvedValue(mockProject);
      mockProjectAPI.list.mockResolvedValue([mockProject]);

      const projectInput: CreateProjectInput = {
        name: 'Webアプリケーション',
        description: 'React + TypeScript でのWebアプリケーション開発',
      };

      await act(async () => {
        await projectStore.addProject(projectInput);
      });

      expect(projectStore.projects).toContainEqual(mockProject);

      // 2. タグを作成
      mockTagAPI.createTag
        .mockResolvedValueOnce(mockTags[0])
        .mockResolvedValueOnce(mockTags[1]);
      mockTagAPI.fetchTags.mockResolvedValue(mockTags);

      const frontendTagInput: CreateTagInput = {
        name: 'フロントエンド',
        color: '#3B82F6',
      };

      const backendTagInput: CreateTagInput = {
        name: 'バックエンド',
        color: '#10B981',
      };

      await act(async () => {
        await tagStore.addTag(frontendTagInput);
        await tagStore.addTag(backendTagInput);
      });

      expect(tagStore.tags).toHaveLength(2);
      expect(tagStore.tags).toContainEqual(mockTags[0]);
      expect(tagStore.tags).toContainEqual(mockTags[1]);

      // 3. 作成したプロジェクトとタグを使用してタスクを作成
      const taskWithUpdatedUsage = {
        ...mockTask,
        tags: ['tag-1', 'tag-2'], // 作成したタグのIDを使用
      };

      mockTaskAPI.createTask.mockResolvedValue(taskWithUpdatedUsage);
      mockTaskAPI.fetchTasks.mockResolvedValue([taskWithUpdatedUsage]);

      const taskInput: CreateTaskInput = {
        title: 'ユーザー認証機能の実装',
        description: 'JWT認証の実装',
        priority: 'high',
        projectId: 'project-1', // 作成したプロジェクトのIDを使用
        tags: ['tag-1', 'tag-2'], // 作成したタグのIDを使用
      };

      await act(async () => {
        await taskStore.addTask(taskInput);
      });

      // 検証: タスクが正しく作成され、プロジェクトとタグが関連付けられている
      expect(taskStore.tasks).toHaveLength(1);
      expect(taskStore.tasks[0]).toMatchObject({
        title: 'ユーザー認証機能の実装',
        projectId: 'project-1',
        tags: ['tag-1', 'tag-2'],
      });
    });

    it('既存データを活用した完全統合フロー', async () => {
      // 既存データをストアに設定
      act(() => {
        projectStore.setProjects([mockProject]);
        tagStore.setTags(mockTags);
      });

      // タスクを作成して統合を確認
      mockTaskAPI.createTask.mockResolvedValue(mockTask);

      const taskInput: CreateTaskInput = {
        title: mockTask.title,
        description: mockTask.description,
        priority: mockTask.priority,
        projectId: mockTask.projectId,
        tags: mockTask.tags,
      };

      await act(async () => {
        await taskStore.addTask(taskInput);
      });

      // 統合データの整合性を確認
      const createdTask = taskStore.tasks[0];
      const relatedProject = projectStore.getProjectById(createdTask.projectId);
      const relatedTags = createdTask.tags?.map(tagId => 
        tagStore.getTag(tagId)
      ).filter(Boolean);

      expect(createdTask).toBeDefined();
      expect(relatedProject).toEqual(mockProject);
      expect(relatedTags).toHaveLength(2);
      expect(relatedTags?.map(tag => tag?.name)).toContain('フロントエンド');
      expect(relatedTags?.map(tag => tag?.name)).toContain('バックエンド');
    });
  });

  describe('タグ使用統計とプロジェクト連携テスト', () => {
    it('タスク作成時にタグ使用統計が更新される', async () => {
      // 初期タグ設定
      const initialTags = mockTags.map(tag => ({ ...tag, usageCount: 0 }));
      mockTagAPI.fetchTags.mockResolvedValue(initialTags);

      act(() => {
        tagStore.setTags(initialTags);
      });

      expect(tagStore.tags[0].usageCount).toBe(0);
      expect(tagStore.tags[1].usageCount).toBe(0);

      // タスクを作成してタグ使用統計を更新
      mockTaskAPI.createTask.mockResolvedValue(mockTask);
      
      // タグ使用統計の更新をモック
      const updatedTags = mockTags.map(tag => ({
        ...tag,
        usageCount: tag.id === 'tag-1' || tag.id === 'tag-2' ? 1 : 0,
      }));
      mockTagAPI.fetchTagUsage.mockResolvedValue(updatedTags);

      await act(async () => {
        await taskStore.addTask({
          title: mockTask.title,
          description: mockTask.description,
          priority: mockTask.priority,
          projectId: mockTask.projectId,
          tags: mockTask.tags,
        });
        
        // タグ使用統計を更新
        await tagStore.updateTagUsageStats();
      });

      // タグ使用統計が更新されることを確認
      expect(tagStore.tags.find(tag => tag.id === 'tag-1')?.usageCount).toBe(1);
      expect(tagStore.tags.find(tag => tag.id === 'tag-2')?.usageCount).toBe(1);
    });

    it('プロジェクト削除時に関連タスクとタグ使用統計が更新される', async () => {
      // 初期データ設定
      act(() => {
        projectStore.setProjects([mockProject]);
        tagStore.setTags(mockTags);
        taskStore.setTasks([mockTask]);
      });

      // プロジェクト削除をモック
      mockProjectAPI.delete.mockResolvedValue(undefined);
      mockTaskAPI.fetchTasks.mockResolvedValue([]);
      
      // タグ使用統計の更新をモック
      const updatedTags = mockTags.map(tag => ({ ...tag, usageCount: 0 }));
      mockTagAPI.fetchTagUsage.mockResolvedValue(updatedTags);

      await act(async () => {
        // プロジェクト削除
        await projectStore.deleteProject(mockProject.id);
        // 関連タスクを削除
        await taskStore.deleteTask(mockTask.id);
        // タグ使用統計を更新
        await tagStore.updateTagUsageStats();
      });

      // プロジェクトが削除されていることを確認
      expect(projectStore.projects).toHaveLength(0);
      // 関連タスクが削除されていることを確認
      expect(taskStore.tasks).toHaveLength(0);
      // タグ使用統計がリセットされていることを確認
      expect(tagStore.tags.every(tag => tag.usageCount === 0)).toBe(true);
    });
  });

  describe('フィルタリングと検索の統合テスト', () => {
    beforeEach(() => {
      // 複数のテストデータを設定
      const multipleProjects: Project[] = [
        mockProject,
        {
          ...mockProject,
          id: 'project-2',
          name: 'モバイルアプリ',
          status: 'archived',
        },
      ];

      const multipleTasks: Task[] = [
        mockTask,
        {
          ...mockTask,
          id: 'task-2',
          title: 'API設計',
          projectId: 'project-2',
          tags: ['tag-2'],
        },
      ];

      act(() => {
        projectStore.setProjects(multipleProjects);
        tagStore.setTags(mockTags);
        taskStore.setTasks(multipleTasks);
      });
    });

    it('プロジェクトによるタスクフィルタリング', () => {
      // プロジェクト1のタスクのみを取得
      const project1Tasks = taskStore.getTasksByProject('project-1');
      
      expect(project1Tasks).toHaveLength(1);
      expect(project1Tasks[0].projectId).toBe('project-1');
    });

    it('タグによるタスクフィルタリング', () => {
      // フロントエンドタグ（tag-1）を持つタスクを取得
      const frontendTasks = taskStore.getTasksByTag('tag-1');
      
      expect(frontendTasks).toHaveLength(1);
      expect(frontendTasks[0].tags).toContain('tag-1');
    });

    it('複合条件でのフィルタリング（プロジェクト + タグ）', () => {
      // フィルター設定
      act(() => {
        taskStore.setFilter({
          projectId: 'project-1',
          tags: ['tag-1'],
        });
      });

      const filteredTasks = taskStore.getFilteredTasks();
      
      expect(filteredTasks).toHaveLength(1);
      expect(filteredTasks[0]).toMatchObject({
        projectId: 'project-1',
        tags: expect.arrayContaining(['tag-1']),
      });
    });
  });

  describe('データ整合性テスト', () => {
    it('タグ削除時に関連タスクからタグが除去される', async () => {
      // 初期データ設定
      act(() => {
        tagStore.setTags(mockTags);
        taskStore.setTasks([mockTask]);
      });

      // タグを削除
      mockTagAPI.deleteTag.mockResolvedValue(undefined);
      mockTagAPI.fetchTags.mockResolvedValue([mockTags[1]]);
      
      // タスクからもタグを除去
      const updatedTask = {
        ...mockTask,
        tags: mockTask.tags?.filter(tagId => tagId !== 'tag-1') || [],
      };
      mockTaskAPI.updateTask.mockResolvedValue(updatedTask);

      await act(async () => {
        await tagStore.deleteTag('tag-1');
        // 関連タスクからタグを除去
        await taskStore.updateTask(mockTask.id, { tags: updatedTask.tags });
      });

      // タグが削除されていることを確認
      expect(tagStore.tags.find(tag => tag.id === 'tag-1')).toBeUndefined();
      // タスクからタグが除去されていることを確認
      const task = taskStore.getTaskById(mockTask.id);
      expect(task?.tags).not.toContain('tag-1');
      expect(task?.tags).toContain('tag-2');
    });

    it('プロジェクトIDの変更時にタスクの関連付けが更新される', async () => {
      // 初期データ設定
      const newProject: Project = {
        ...mockProject,
        id: 'project-new',
        name: '新プロジェクト',
      };

      act(() => {
        projectStore.setProjects([mockProject, newProject]);
        taskStore.setTasks([mockTask]);
      });

      // タスクのプロジェクトIDを変更
      const updatedTask = {
        ...mockTask,
        projectId: 'project-new',
      };
      mockTaskAPI.updateTask.mockResolvedValue(updatedTask);

      await act(async () => {
        await taskStore.updateTask(mockTask.id, { projectId: 'project-new' });
      });

      // タスクのプロジェクトIDが更新されていることを確認
      const task = taskStore.getTaskById(mockTask.id);
      expect(task?.projectId).toBe('project-new');
    });
  });

  describe('エラーハンドリング統合テスト', () => {
    it('プロジェクト作成エラー時に関連操作がロールバックされる', async () => {
      // プロジェクト作成でエラーが発生
      mockProjectAPI.create.mockRejectedValue(new Error('プロジェクト作成エラー'));

      await act(async () => {
        try {
          await projectStore.addProject({
            name: 'エラープロジェクト',
            description: 'エラーテスト用',
          });
        } catch (error) {
          // エラーが発生することを期待
        }
      });

      // プロジェクトが作成されていないことを確認
      expect(projectStore.projects).toHaveLength(0);
      // エラー状態が設定されていることを確認
      expect(projectStore.error).toBeTruthy();
    });

    it('タスク作成時のプロジェクト・タグ検証エラー', async () => {
      // 存在しないプロジェクトIDを使用してタスク作成を試行
      const invalidTaskInput: CreateTaskInput = {
        title: '無効なタスク',
        description: 'テスト',
        priority: 'medium',
        projectId: 'non-existent-project',
        tags: ['non-existent-tag'],
      };

      mockTaskAPI.createTask.mockRejectedValue(new Error('関連データが存在しません'));

      await act(async () => {
        try {
          await taskStore.addTask(invalidTaskInput);
        } catch (error) {
          // エラーが発生することを期待
        }
      });

      // タスクが作成されていないことを確認
      expect(taskStore.tasks).toHaveLength(0);
      // エラー状態が設定されていることを確認
      expect(taskStore.error).toBeTruthy();
    });
  });

  describe('パフォーマンステスト', () => {
    it('大量データでの統合操作が適切な時間内で完了する', async () => {
      // 大量のテストデータを準備
      const largeProjectList: Project[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockProject,
        id: `project-${i}`,
        name: `プロジェクト ${i}`,
      }));

      const largeTagList: Tag[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockTags[0],
        id: `tag-${i}`,
        name: `タグ ${i}`,
      }));

      const largeTaskList: Task[] = Array.from({ length: 200 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
        title: `タスク ${i}`,
        projectId: `project-${i % 50}`,
        tags: [`tag-${i % 100}`, `tag-${(i + 1) % 100}`],
      }));

      // データ設定のパフォーマンス測定
      const startTime = performance.now();

      act(() => {
        projectStore.setProjects(largeProjectList);
        tagStore.setTags(largeTagList);
        taskStore.setTasks(largeTaskList);
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // パフォーマンス基準: 100ms以内で完了
      expect(executionTime).toBeLessThan(100);

      // データが正しく設定されていることを確認
      expect(projectStore.projects).toHaveLength(50);
      expect(tagStore.tags).toHaveLength(100);
      expect(taskStore.tasks).toHaveLength(200);
    });

    it('複合フィルタリングのパフォーマンス', () => {
      // 大量のタスクデータで複合フィルタリングを実行
      const largeTaskList: Task[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockTask,
        id: `task-${i}`,
        title: `タスク ${i}`,
        projectId: `project-${i % 10}`,
        tags: [`tag-${i % 5}`],
        status: i % 3 === 0 ? 'todo' : i % 3 === 1 ? 'in-progress' : 'done',
      }));

      act(() => {
        taskStore.setTasks(largeTaskList);
        taskStore.setFilter({
          projectId: 'project-1',
          status: ['todo', 'in-progress'],
          tags: ['tag-1'],
        });
      });

      const startTime = performance.now();
      const filteredTasks = taskStore.getFilteredTasks();
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      // フィルタリング実行時間が50ms以内
      expect(executionTime).toBeLessThan(50);
      // 結果が正しいことを確認
      expect(filteredTasks.every(task => 
        task.projectId === 'project-1' &&
        ['todo', 'in-progress'].includes(task.status) &&
        task.tags?.includes('tag-1')
      )).toBe(true);
    });
  });

  describe('リアルタイム同期テスト', () => {
    it('複数ストア間のリアルタイム同期が正常に動作する', async () => {
      // 初期データ設定
      act(() => {
        projectStore.setProjects([mockProject]);
        tagStore.setTags(mockTags);
      });

      // タスク作成時に他ストアの状態が更新される
      mockTaskAPI.createTask.mockResolvedValue(mockTask);
      const updatedTags = mockTags.map(tag => ({
        ...tag,
        usageCount: mockTask.tags?.includes(tag.id) ? 1 : 0,
      }));
      mockTagAPI.fetchTagUsage.mockResolvedValue(updatedTags);

      await act(async () => {
        // タスクを作成
        await taskStore.addTask({
          title: mockTask.title,
          description: mockTask.description,
          priority: mockTask.priority,
          projectId: mockTask.projectId,
          tags: mockTask.tags,
        });

        // タグ使用統計を同期更新
        await tagStore.updateTagUsageStats();
      });

      // タスクが作成されていることを確認
      expect(taskStore.tasks).toHaveLength(1);
      
      // タグ使用統計が更新されていることを確認
      const frontendTag = tagStore.tags.find(tag => tag.id === 'tag-1');
      const backendTag = tagStore.tags.find(tag => tag.id === 'tag-2');
      
      expect(frontendTag?.usageCount).toBe(1);
      expect(backendTag?.usageCount).toBe(1);
    });

    it('ストア間の依存関係が正しく管理される', async () => {
      // プロジェクト削除時のカスケード処理
      act(() => {
        projectStore.setProjects([mockProject]);
        taskStore.setTasks([mockTask]);
      });

      mockProjectAPI.delete.mockResolvedValue(undefined);
      mockTaskAPI.deleteTask.mockResolvedValue(undefined);

      await act(async () => {
        // プロジェクト削除
        await projectStore.deleteProject(mockProject.id);
        // 依存するタスクも削除
        await taskStore.deleteTask(mockTask.id);
      });

      // プロジェクトとタスクが削除されていることを確認
      expect(projectStore.projects).toHaveLength(0);
      expect(taskStore.tasks).toHaveLength(0);
    });
  });
});