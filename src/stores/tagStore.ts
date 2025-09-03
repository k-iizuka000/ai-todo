/**
 * タグ管理用のZustandストア
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Tag, CreateTagInput, UpdateTagInput, TagFilter, validateTag, validateTagName } from '../types/tag';
// Mock依存を完全除去: API統合により mockTags の使用を完全停止
import { 
  fetchTags, 
  createTag as apiCreateTag, 
  updateTag as apiUpdateTag, 
  deleteTag as apiDeleteTag,
  isApiError, 
  getErrorMessage 
} from '../utils/tagApi';


interface TagState {
  tags: Tag[];
  selectedTags: Tag[];
  isLoading: boolean;
  error: string | null;
  apiMode: boolean; // API連携モードフラグ
  
  // アクション - イミュータブル更新パターン
  addTag: (tag: CreateTagInput) => Promise<Tag | void>;
  initialize: () => Promise<void>;
  updateTag: (id: string, updates: UpdateTagInput) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  selectTag: (tag: Tag) => void;
  deselectTag: (tagId: string) => void;
  clearSelectedTags: () => void;
  
  // セレクター - パフォーマンス最適化
  getFilteredTags: (filter: TagFilter) => Tag[];
  getTagByName: (name: string) => Tag | undefined;
  getTopUsedTags: (limit: number) => Tag[];
  
  
  // 整合性チェックと同期処理
  checkTagUsage: (tagId: string) => { isUsed: boolean; taskCount: number };
  syncWithTasks: () => Promise<void>;
  cleanupUnusedTags: () => Promise<void>;
  
  // API連携モード切り替え
  enableApiMode: () => void;
  disableApiMode: () => void;
  isApiModeEnabled: () => boolean;
}

// IDの生成関数
const generateTagId = (): string => {
  return `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// 初期データ: API統合により実データをinitializeで取得
const initialTags: Tag[] = [];

export const useTagStore = create<TagState>()(
  devtools(
    persist(
      (set, get) => ({
        tags: initialTags,
        selectedTags: [],
        isLoading: false,
        error: null,
        apiMode: true, // PostgreSQL連携モード

        // API統合による楽観的更新の実装
        addTag: async (input: CreateTagInput) => {
          try {
            set({ isLoading: true, error: null });
            
            // バリデーション
            const validation = validateTag(input);
            if (!validation.isValid) {
              set({ 
                isLoading: false,
                error: validation.errors.join(', ')
              });
              return;
            }
            
            // API統合: PostgreSQL連携のみ（LocalStorageロジック除去）
            const newTag = await apiCreateTag(input);
            set(state => ({ 
              tags: [...state.tags, newTag],
              isLoading: false,
            }));
            return newTag;
          } catch (error) {
            set({ 
              isLoading: false,
              error: isApiError(error) ? getErrorMessage(error) : 'タグの作成に失敗しました'
            });
          }
        },
        
        // 初期化時にAPIからタグデータを取得
        initialize: async () => {
          try {
            set({ isLoading: true, error: null });
            
            // API統合: PostgreSQL連携のみ
            const tags = await fetchTags();
            set({ tags, isLoading: false });
          } catch (error) {
            set({ 
              isLoading: false,
              error: 'タグの取得に失敗しました'
            });
          }
        },

        updateTag: async (id: string, updates: UpdateTagInput) => {
          try {
            set({ isLoading: true, error: null });
            
            // API統合: PostgreSQL連携のみ（LocalStorageロジック除去）
            const updatedTag = await apiUpdateTag(id, updates);
            set(state => ({
              tags: state.tags.map((tag: Tag) => 
                tag.id === id ? updatedTag : tag
              ),
              isLoading: false,
            }));
          } catch (error) {
            set({ 
              isLoading: false,
              error: isApiError(error) ? getErrorMessage(error) : 'タグの更新に失敗しました'
            });
          }
        },

        deleteTag: async (id: string) => {
          try {
            set({ isLoading: true, error: null });
            
            // API統合: PostgreSQL連携のみ（LocalStorageロジック除去）
            await apiDeleteTag(id);
            set(state => ({
              tags: state.tags.filter((tag: Tag) => tag.id !== id),
              selectedTags: state.selectedTags.filter((tag: Tag) => tag.id !== id),
              isLoading: false,
            }));
          } catch (error) {
            set({ 
              isLoading: false,
              error: isApiError(error) ? getErrorMessage(error) : 'タグの削除に失敗しました'
            });
          }
        },

        selectTag: (tag: Tag) => {
          set(state => {
            if (state.selectedTags.some((t: Tag) => t.id === tag.id)) {
              return state; // 既に選択済み
            }
            return {
              selectedTags: [...state.selectedTags, tag]
            };
          });
        },

        deselectTag: (tagId: string) => {
          set(state => ({
            selectedTags: state.selectedTags.filter((tag: Tag) => tag.id !== tagId)
          }));
        },

        clearSelectedTags: () => {
          set({ selectedTags: [] });
        },

        getFilteredTags: (filter: TagFilter) => {
          const { tags } = get();
          let filtered = [...tags];

          // 検索フィルター
          if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            filtered = filtered.filter((tag: Tag) => 
              tag.name.toLowerCase().includes(searchLower)
            );
          }

          // ソート
          if (filter.sortBy) {
            filtered.sort((a, b) => {
              const aValue = a[filter.sortBy!];
              const bValue = b[filter.sortBy!];
              
              if (aValue === undefined || bValue === undefined) return 0;
              
              const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
              return filter.sortOrder === 'desc' ? -comparison : comparison;
            });
          }

          return filtered;
        },

        getTagByName: (name: string) => {
          const { tags } = get();
          return tags.find((tag: Tag) => tag.name.toLowerCase() === name.toLowerCase());
        },

        getTopUsedTags: (limit: number) => {
          const { tags } = get();
          return [...tags]
            .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
            .slice(0, limit);
        },

        
        // 整合性チェック: API統合により不要（バックエンドで処理）
        checkTagUsage: (tagId: string) => {
          // API統合により、タグ使用状況はバックエンドで管理
          console.warn('checkTagUsage: API統合により、この機能はバックエンドで処理されます');
          return { isUsed: false, taskCount: 0 };
        },
        
        syncWithTasks: async () => {
          try {
            set({ isLoading: true, error: null });
            
            // API統合により、同期は initialize() でAPI経由で実行
            await get().initialize();
            
          } catch (error) {
            set({ 
              isLoading: false,
              error: error instanceof Error ? error.message : 'タスクとの同期に失敗しました'
            });
          }
        },
        
        cleanupUnusedTags: async () => {
          try {
            set({ isLoading: true, error: null });
            
            // API統合により、未使用タグの削除はバックエンドで処理
            // フロントエンドは最新データを取得するのみ
            await get().initialize();
            
          } catch (error) {
            set({ 
              isLoading: false,
              error: error instanceof Error ? error.message : '未使用タグの削除に失敗しました'
            });
          }
        },
        
        // API連携モード切り替え
        enableApiMode: () => {
          set({ apiMode: true });
        },
        
        disableApiMode: () => {
          set({ apiMode: false });
        },
        
        isApiModeEnabled: () => {
          return get().apiMode;
        },
      }),
      { 
        name: 'tag-store',
        version: 1,
        // 永続化設定: APIモード時は永続化を無効化
        partialize: (state) => {
          // APIモード時は永続化を無効化（設計書要件）
          return state.apiMode ? {} : {
            tags: state.tags,
            selectedTags: state.selectedTags,
          };
        },
        // 初期データがない場合のデフォルト値を設定
        merge: (persistedState: any, currentState: TagState) => ({
          ...currentState,
          tags: persistedState?.tags?.length > 0 ? persistedState.tags : [],
          selectedTags: persistedState?.selectedTags || [],
        }),
      }
    ),
    { name: 'tag-store' }
  )
);