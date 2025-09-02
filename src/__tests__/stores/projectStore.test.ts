/**
 * プロジェクトストア 単体テスト
 * 設計書要件に従った完全テスト実装
 */

import { act, renderHook } from '@testing-library/react';
import { 
  useProjectStore,
  useFilteredProjects,
  useSelectedProject,
  useActiveProjects,
  useProjectStats
} from '../../stores/projectStore';
import { projectsAPI } from '../../lib/api/projects';
import { 
  ProjectWithDetails, 
  CreateProjectInput, 
  UpdateProjectInput,
  ProjectStatus,
  ProjectPriority 
} from '../../types/project';

// API モック
jest.mock('../../lib/api/projects');
jest.mock('../../lib/logger');

const mockProjectsAPI = projectsAPI as jest.Mocked<typeof projectsAPI>;

// テスト用データ
const mockProject: ProjectWithDetails = {
  id: 'test-project-1',
  name: 'テストプロジェクト',
  description: 'テスト用のプロジェクトです',
  status: 'ACTIVE' as ProjectStatus,
  priority: 'HIGH' as ProjectPriority,
  color: '#3B82F6',
  icon: '📊',
  ownerId: 'user-1',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  deadline: new Date('2024-11-30'),
  budget: 100000,
  isArchived: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user-1',
  updatedBy: 'user-1',
  owner: {
    id: 'user-1',
    email: 'test@example.com',
    profile: {
      displayName: 'テストユーザー',
      firstName: 'テスト',
      lastName: 'ユーザー',
      avatar: null
    }
  },
  members: [],
  tags: ['重要', 'テスト']
};

const mockProjectList: ProjectWithDetails[] = [
  mockProject,
  {
    ...mockProject,
    id: 'test-project-2',
    name: 'アーカイブプロジェクト',
    status: 'COMPLETED' as ProjectStatus,
    priority: 'MEDIUM' as ProjectPriority,
    isArchived: true
  }
];

describe('プロジェクトストア', () => {
  beforeEach(() => {
    // ストアをリセット
    const { result } = renderHook(() => useProjectStore());
    act(() => {
      result.current.resetStore();
    });
    
    // モックをクリア
    jest.clearAllMocks();
  });

  describe('初期状態', () => {
    it('デフォルト値が設定されている', () => {
      const { result } = renderHook(() => useProjectStore());
      
      expect(result.current.projects).toEqual([]);
      expect(result.current.selectedProjectId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.filter).toMatchObject({
        status: undefined,
        priority: undefined,
        ownerId: undefined,
        memberId: undefined,
        tags: undefined,
        isArchived: undefined,
        search: undefined
      });
      expect(result.current.sort).toMatchObject({
        field: 'updatedAt',
        order: 'desc'
      });
    });
  });

  describe('プロジェクト読み込み', () => {
    it('成功時にプロジェクト一覧を設定する', async () => {
      mockProjectsAPI.getAll.mockResolvedValue(mockProjectList);
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.loadProjects();
      });
      
      expect(result.current.projects).toEqual(mockProjectList);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockProjectsAPI.getAll).toHaveBeenCalledWith({
        filter: expect.any(Object),
        sort: expect.any(Object),
        includeStats: true,
        includeMembers: true,
        includeTags: true
      });
    });

    it('失敗時にエラー状態を設定する', async () => {
      const errorMessage = 'ネットワークエラー';
      mockProjectsAPI.getAll.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.loadProjects();
      });
      
      expect(result.current.projects).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('読み込み中はローディング状態になる', async () => {
      let resolvePromise: (value: ProjectWithDetails[]) => void;
      const promise = new Promise<ProjectWithDetails[]>((resolve) => {
        resolvePromise = resolve;
      });
      mockProjectsAPI.getAll.mockReturnValue(promise);
      
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.loadProjects();
      });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      
      await act(async () => {
        resolvePromise!(mockProjectList);
        await promise;
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('プロジェクト作成', () => {
    const createInput: CreateProjectInput = {
      name: '新規プロジェクト',
      description: '新規作成のテスト',
      priority: 'HIGH' as ProjectPriority,
      color: '#10B981'
    };

    it('成功時にプロジェクトを追加する', async () => {
      const createdProject = { ...mockProject, name: createInput.name };
      mockProjectsAPI.create.mockResolvedValue(createdProject);
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.addProject(createInput);
      });
      
      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0].name).toBe(createInput.name);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockProjectsAPI.create).toHaveBeenCalledWith(createInput);
    });

    it('名前が空の場合にエラーを設定する', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.addProject({ ...createInput, name: '' });
      });
      
      expect(result.current.error).toBe('プロジェクト名は必須です');
      expect(mockProjectsAPI.create).not.toHaveBeenCalled();
    });

    it('API失敗時にエラー状態を設定する', async () => {
      const errorMessage = 'プロジェクト作成に失敗しました';
      mockProjectsAPI.create.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.addProject(createInput);
      });
      
      expect(result.current.projects).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('プロジェクト更新', () => {
    const updateInput: UpdateProjectInput = {
      name: '更新されたプロジェクト',
      description: '更新のテスト'
    };

    beforeEach(async () => {
      // 初期データを設定
      const { result } = renderHook(() => useProjectStore());
      act(() => {
        result.current._setProjects([mockProject]);
      });
    });

    it('成功時にプロジェクトを更新する', async () => {
      const updatedProject = { ...mockProject, ...updateInput };
      mockProjectsAPI.update.mockResolvedValue(updatedProject);
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.updateProject(mockProject.id, updateInput);
      });
      
      expect(result.current.projects[0].name).toBe(updateInput.name);
      expect(result.current.projects[0].description).toBe(updateInput.description);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockProjectsAPI.update).toHaveBeenCalledWith(mockProject.id, updateInput);
    });

    it('IDが空の場合にエラーを設定する', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.updateProject('', updateInput);
      });
      
      expect(result.current.error).toBe('プロジェクトIDが必要です');
      expect(mockProjectsAPI.update).not.toHaveBeenCalled();
    });

    it('API失敗時にエラー状態を設定する', async () => {
      const errorMessage = 'プロジェクト更新に失敗しました';
      mockProjectsAPI.update.mockRejectedValue(new Error(errorMessage));
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.updateProject(mockProject.id, updateInput);
      });
      
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('プロジェクト削除', () => {
    beforeEach(async () => {
      // 初期データを設定
      const { result } = renderHook(() => useProjectStore());
      act(() => {
        result.current._setProjects([mockProject]);
        result.current.selectProject(mockProject.id);
      });
    });

    it('成功時にプロジェクトを削除する', async () => {
      mockProjectsAPI.delete.mockResolvedValue();
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.deleteProject(mockProject.id);
      });
      
      expect(result.current.projects).toHaveLength(0);
      expect(result.current.selectedProjectId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockProjectsAPI.delete).toHaveBeenCalledWith(mockProject.id);
    });

    it('IDが空の場合にエラーを設定する', async () => {
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.deleteProject('');
      });
      
      expect(result.current.error).toBe('プロジェクトIDが必要です');
      expect(mockProjectsAPI.delete).not.toHaveBeenCalled();
    });
  });

  describe('一括操作', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useProjectStore());
      act(() => {
        result.current._setProjects(mockProjectList);
      });
    });

    it('一括更新が成功する', async () => {
      const updateInput: UpdateProjectInput = { priority: 'CRITICAL' as ProjectPriority };
      const updatedProjects = mockProjectList.map(p => ({ ...p, ...updateInput }));
      mockProjectsAPI.bulkUpdate.mockResolvedValue(updatedProjects);
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.bulkUpdateProjects(
          mockProjectList.map(p => p.id), 
          updateInput
        );
      });
      
      expect(mockProjectsAPI.bulkUpdate).toHaveBeenCalledWith(
        mockProjectList.map(p => p.id),
        updateInput
      );
    });

    it('一括削除が成功する', async () => {
      mockProjectsAPI.bulkDelete.mockResolvedValue();
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.bulkDeleteProjects([mockProject.id]);
      });
      
      expect(result.current.projects).toHaveLength(1);
      expect(mockProjectsAPI.bulkDelete).toHaveBeenCalledWith([mockProject.id]);
    });

    it('アーカイブが成功する', async () => {
      const archivedProjects = mockProjectList.map(p => ({ ...p, isArchived: true }));
      mockProjectsAPI.archive.mockResolvedValue(archivedProjects);
      
      const { result } = renderHook(() => useProjectStore());
      
      await act(async () => {
        await result.current.archiveProjects([mockProject.id]);
      });
      
      expect(mockProjectsAPI.archive).toHaveBeenCalledWith([mockProject.id]);
    });
  });

  describe('フィルタリング', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useProjectStore());
      act(() => {
        result.current._setProjects(mockProjectList);
      });
    });

    it('ステータスでフィルタリングする', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter({ status: ['ACTIVE'] });
      });
      
      const filtered = result.current.getFilteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe('ACTIVE');
    });

    it('アーカイブ状態でフィルタリングする', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter({ isArchived: false });
      });
      
      const filtered = result.current.getFilteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].isArchived).toBe(false);
    });

    it('検索クエリでフィルタリングする', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter({ search: 'テストプロジェクト' });
      });
      
      const filtered = result.current.getFilteredProjects();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toContain('テストプロジェクト');
    });

    it('フィルターをクリアする', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setFilter({ status: ['ACTIVE'] });
        result.current.clearFilter();
      });
      
      expect(result.current.filter.status).toBeUndefined();
    });
  });

  describe('ソート機能', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useProjectStore());
      act(() => {
        result.current._setProjects(mockProjectList);
      });
    });

    it('名前で昇順ソートする', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setSort({ field: 'name', order: 'asc' });
      });
      
      const filtered = result.current.getFilteredProjects();
      expect(filtered[0].name).toBe('アーカイブプロジェクト');
      expect(filtered[1].name).toBe('テストプロジェクト');
    });

    it('優先度で降順ソートする', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setSort({ field: 'priority', order: 'desc' });
      });
      
      const filtered = result.current.getFilteredProjects();
      expect(filtered[0].priority).toBe('HIGH');
    });
  });

  describe('カスタムフック', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useProjectStore());
      act(() => {
        result.current._setProjects(mockProjectList);
      });
    });

    it('useFilteredProjects が正常に動作する', () => {
      const { result: storeResult } = renderHook(() => useProjectStore());
      const { result: filteredResult } = renderHook(() => useFilteredProjects());
      
      act(() => {
        storeResult.current.setFilter({ status: ['ACTIVE'] });
      });
      
      expect(filteredResult.current).toHaveLength(1);
      expect(filteredResult.current[0].status).toBe('ACTIVE');
    });

    it('useSelectedProject が正常に動作する', () => {
      const { result: storeResult } = renderHook(() => useProjectStore());
      const { result: selectedResult } = renderHook(() => useSelectedProject());
      
      act(() => {
        storeResult.current.selectProject(mockProject.id);
      });
      
      expect(selectedResult.current?.id).toBe(mockProject.id);
    });

    it('useActiveProjects が正常に動作する', () => {
      const { result } = renderHook(() => useActiveProjects());
      
      expect(result.current).toHaveLength(1);
      expect(result.current[0].status).toBe('ACTIVE');
      expect(result.current[0].isArchived).toBe(false);
    });

    it('useProjectStats が正常に動作する', () => {
      const { result } = renderHook(() => useProjectStats());
      
      expect(result.current.total).toBe(2);
      expect(result.current.active).toBe(1);
      expect(result.current.completed).toBe(1);
      expect(result.current.archived).toBe(1);
      expect(result.current.completionRate).toBe(50);
    });
  });

  describe('エラーハンドリング', () => {
    it('エラーを設定・クリアできる', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setError('テストエラー');
      });
      
      expect(result.current.error).toBe('テストエラー');
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });

    it('ローディング状態を設定できる', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current.setLoading(true);
      });
      
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.setLoading(false);
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('ストアリセット', () => {
    it('ストアを初期状態にリセットする', () => {
      const { result } = renderHook(() => useProjectStore());
      
      act(() => {
        result.current._setProjects(mockProjectList);
        result.current.selectProject(mockProject.id);
        result.current.setError('テストエラー');
        result.current.setLoading(true);
      });
      
      act(() => {
        result.current.resetStore();
      });
      
      expect(result.current.projects).toEqual([]);
      expect(result.current.selectedProjectId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});