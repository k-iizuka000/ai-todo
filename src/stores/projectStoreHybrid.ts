/**
 * Hybrid Project Store - React Query + Zustand
 * サーバー状態はReact Query、UI状態はZustandで管理
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  ProjectFilterInput,
  ProjectSort,
  ProjectSortField,
  ProjectStatus,
  ProjectPriority,
  ProjectRole,
  mapToLegacyStatus,
  mapToLegacyPriority,
  mapToLegacyRole,
  mapFromLegacyStatus,
  mapFromLegacyPriority,
  mapFromLegacyRole
} from '../types/project';

// UI状態のインターフェース
interface ProjectStoreState {
  // 選択状態
  selectedProjectId: string | null;
  selectedProjectIds: string[];
  
  // フィルター状態
  filter: ProjectFilterInput;
  sort: ProjectSort;
  
  // UI表示状態
  viewMode: 'grid' | 'list';
  showArchived: boolean;
  searchQuery: string;
  
  // ページネーション状態
  currentPage: number;
  pageSize: number;
  
  // モーダル・ダイアログ状態
  showCreateModal: boolean;
  showSettingsModal: boolean;
  showMemberModal: boolean;
  showBulkEditModal: boolean;
  
  // エラー状態
  error: string | null;
  
  // アクション
  setSelectedProject: (id: string | null) => void;
  setSelectedProjects: (ids: string[]) => void;
  toggleProjectSelection: (id: string) => void;
  clearSelection: () => void;
  
  setFilter: (filter: Partial<ProjectFilterInput>) => void;
  clearFilter: () => void;
  setSort: (sort: Partial<ProjectSort>) => void;
  
  setViewMode: (mode: 'grid' | 'list') => void;
  setShowArchived: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openSettingsModal: (projectId?: string) => void;
  closeSettingsModal: () => void;
  openMemberModal: (projectId?: string) => void;
  closeMemberModal: () => void;
  openBulkEditModal: () => void;
  closeBulkEditModal: () => void;
  
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // ユーティリティ
  getQueryParams: () => import('../api/projects').ProjectQueryParams;
  resetPagination: () => void;
  resetState: () => void;
  
  // 互換性メソッド（旧コードとの統合用）
  loadMockData: () => void;
  getFilteredProjects: () => any[];
  getProjectById: (id: string) => any;
}

// デフォルトフィルター
const defaultFilter: ProjectFilterInput = {
  status: undefined,
  priority: undefined,
  ownerId: undefined,
  memberIds: undefined,
  tags: undefined,
  isArchived: undefined,
  search: undefined,
  dateRange: undefined,
};

// デフォルトソート
const defaultSort: ProjectSort = {
  field: 'updatedAt',
  order: 'desc'
};

// Zustandストア
export const useProjectStore = create<ProjectStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        selectedProjectId: null,
        selectedProjectIds: [],
        filter: { ...defaultFilter },
        sort: { ...defaultSort },
        viewMode: 'grid',
        showArchived: false,
        searchQuery: '',
        currentPage: 1,
        pageSize: 12,
        showCreateModal: false,
        showSettingsModal: false,
        showMemberModal: false,
        showBulkEditModal: false,
        error: null,

        // 選択関連アクション
        setSelectedProject: (id) => {
          set({ selectedProjectId: id }, false, 'setSelectedProject');
        },

        setSelectedProjects: (ids) => {
          set({ selectedProjectIds: ids }, false, 'setSelectedProjects');
        },

        toggleProjectSelection: (id) => {
          const { selectedProjectIds } = get();
          const newSelection = selectedProjectIds.includes(id)
            ? selectedProjectIds.filter(selectedId => selectedId !== id)
            : [...selectedProjectIds, id];
          set({ selectedProjectIds: newSelection }, false, 'toggleProjectSelection');
        },

        clearSelection: () => {
          set({ 
            selectedProjectId: null, 
            selectedProjectIds: [] 
          }, false, 'clearSelection');
        },

        // フィルター・ソート関連アクション
        setFilter: (newFilter) => {
          const currentFilter = get().filter;
          const updatedFilter = { ...currentFilter, ...newFilter };
          set({ 
            filter: updatedFilter,
            currentPage: 1 // フィルター変更時はページをリセット
          }, false, 'setFilter');
        },

        clearFilter: () => {
          set({ 
            filter: { ...defaultFilter },
            currentPage: 1
          }, false, 'clearFilter');
        },

        setSort: (newSort) => {
          const currentSort = get().sort;
          const updatedSort = { ...currentSort, ...newSort };
          set({ sort: updatedSort }, false, 'setSort');
        },

        // 表示設定関連アクション
        setViewMode: (mode) => {
          set({ viewMode: mode }, false, 'setViewMode');
        },

        setShowArchived: (show) => {
          set({ 
            showArchived: show,
            filter: { ...get().filter, isArchived: show ? true : undefined },
            currentPage: 1
          }, false, 'setShowArchived');
        },

        setSearchQuery: (query) => {
          set({ 
            searchQuery: query,
            filter: { ...get().filter, search: query || undefined },
            currentPage: 1
          }, false, 'setSearchQuery');
        },

        // ページネーション関連アクション
        setPage: (page) => {
          set({ currentPage: page }, false, 'setPage');
        },

        setPageSize: (size) => {
          set({ 
            pageSize: size,
            currentPage: 1 // ページサイズ変更時はページをリセット
          }, false, 'setPageSize');
        },

        // モーダル関連アクション
        openCreateModal: () => {
          set({ showCreateModal: true }, false, 'openCreateModal');
        },

        closeCreateModal: () => {
          set({ showCreateModal: false }, false, 'closeCreateModal');
        },

        openSettingsModal: (projectId) => {
          set({ 
            showSettingsModal: true,
            selectedProjectId: projectId || get().selectedProjectId
          }, false, 'openSettingsModal');
        },

        closeSettingsModal: () => {
          set({ showSettingsModal: false }, false, 'closeSettingsModal');
        },

        openMemberModal: (projectId) => {
          set({ 
            showMemberModal: true,
            selectedProjectId: projectId || get().selectedProjectId
          }, false, 'openMemberModal');
        },

        closeMemberModal: () => {
          set({ showMemberModal: false }, false, 'closeMemberModal');
        },

        openBulkEditModal: () => {
          const { selectedProjectIds } = get();
          if (selectedProjectIds.length > 0) {
            set({ showBulkEditModal: true }, false, 'openBulkEditModal');
          }
        },

        closeBulkEditModal: () => {
          set({ showBulkEditModal: false }, false, 'closeBulkEditModal');
        },

        // エラー関連アクション
        setError: (error) => {
          set({ error }, false, 'setError');
        },

        clearError: () => {
          set({ error: null }, false, 'clearError');
        },

        // ユーティリティメソッド
        getQueryParams: () => {
          const { filter, sort, currentPage, pageSize } = get();
          return {
            ...filter,
            page: currentPage,
            limit: pageSize,
            sortField: sort.field,
            sortOrder: sort.order,
          };
        },

        resetPagination: () => {
          set({ currentPage: 1 }, false, 'resetPagination');
        },

        resetState: () => {
          set({
            selectedProjectId: null,
            selectedProjectIds: [],
            filter: { ...defaultFilter },
            sort: { ...defaultSort },
            currentPage: 1,
            showCreateModal: false,
            showSettingsModal: false,
            showMemberModal: false,
            showBulkEditModal: false,
            error: null,
          }, false, 'resetState');
        },

        // 互換性メソッド（旧コードとの統合用）
        loadMockData: () => {
          console.warn('loadMockData is deprecated. Use React Query hooks instead.');
          // 空実装 - React Queryに移行したため不要
        },

        getFilteredProjects: () => {
          console.warn('getFilteredProjects is deprecated. Use useProjects hook instead.');
          return [];
        },

        getProjectById: (id: string) => {
          console.warn('getProjectById is deprecated. Use useProject hook instead.');
          return null;
        },
      }),
      {
        name: 'project-store-hybrid',
        partialize: (state) => ({
          // 永続化する状態を選択
          filter: state.filter,
          sort: state.sort,
          viewMode: state.viewMode,
          showArchived: state.showArchived,
          pageSize: state.pageSize,
        }),
      }
    ),
    {
      name: 'project-store-hybrid'
    }
  )
);

// カスタムフック：選択されたプロジェクトIDを取得
export const useSelectedProjectId = () => {
  return useProjectStore(state => state.selectedProjectId);
};

// カスタムフック：選択されたプロジェクトIDの配列を取得
export const useSelectedProjectIds = () => {
  return useProjectStore(state => state.selectedProjectIds);
};

// カスタムフック：現在のフィルター条件を取得
export const useProjectFilter = () => {
  return useProjectStore(state => state.filter);
};

// カスタムフック：現在のソート条件を取得
export const useProjectSort = () => {
  return useProjectStore(state => state.sort);
};

// カスタムフック：クエリパラメータを取得
export const useProjectQueryParams = () => {
  return useProjectStore(state => state.getQueryParams());
};

// カスタムフック：プロジェクトストアの統計データ（互換性維持用）
export const useProjectStats = () => {
  // 注意：このフックは実際のDBデータではなく、UI状態のみを返します
  // 実際の統計データは useProjectStats(id) フックまたは useProject(id, true) を使用
  return useProjectStore(state => {
    const selectedCount = state.selectedProjectIds.length;
    return {
      total: 0, // React Queryから取得する必要がある
      selected: selectedCount,
      filtered: 0, // React Queryから取得する必要がある
      archived: 0, // React Queryから取得する必要がある
    };
  });
};

// カスタムフック：プロジェクト管理のUI状態
export const useProjectUI = () => {
  const {
    viewMode,
    showArchived,
    searchQuery,
    showCreateModal,
    showSettingsModal,
    showMemberModal,
    showBulkEditModal,
    error,
  } = useProjectStore();
  
  return {
    viewMode,
    showArchived,
    searchQuery,
    modals: {
      create: showCreateModal,
      settings: showSettingsModal,
      member: showMemberModal,
      bulkEdit: showBulkEditModal,
    },
    error,
  };
};