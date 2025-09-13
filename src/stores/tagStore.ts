/**
 * タグ管理用のZustandストア
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Tag, CreateTagInput, UpdateTagInput, TagFilter, validateTag, validateTagName } from '../types/tag';
// Mock依存: APIが失敗した場合のフォールバックとして使用
import { mockTags } from '../mock/tasks';
import { 
  fetchTags, 
  createTag as apiCreateTag, 
  updateTag as apiUpdateTag, 
  deleteTag as apiDeleteTag,
  isApiError, 
  getErrorMessage 
} from '../utils/tagApi';
import { useTaskStore } from './taskStore';


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
  getTagRelatedTaskCount: (tagId: string) => number;
  syncWithTasks: () => Promise<void>;
  cleanupUnusedTags: () => Promise<void>;
  
  // API連携モード切り替え
  enableApiMode: () => void;
  disableApiMode: () => void;
  isApiModeEnabled: () => boolean;
  
  // TaskStore連携・同期機能
  notifyTaskStore: (operation: 'tag-updated' | 'tag-deleted', tagId: string, newTag?: Tag) => void;
  handleTaskStoreUpdate: (taskId: string, task: any | null, operation: 'create' | 'update' | 'delete') => Promise<void>;
  updateTagUsageStatistics: () => Promise<void>;
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
        
        // 初期化時にAPIからタグデータを取得（失敗時はモックデータを使用）
        initialize: async () => {
          try {
            set({ isLoading: true, error: null });
            
            // API統合: PostgreSQL連携を試みる
            try {
              const tags = await fetchTags();
              set({ tags, isLoading: false });
              console.log('[TagStore] Tags loaded from API', { count: tags.length });
            } catch (apiError) {
              // APIが失敗した場合はモックデータにフォールバック
              console.warn('[TagStore] API failed, falling back to mock data', apiError);
              set({ 
                tags: mockTags,
                isLoading: false,
                error: null // エラーは表示しない（モックデータで継続）
              });
              console.log('[TagStore] Tags loaded from mock data', { count: mockTags.length });
            }
          } catch (error) {
            // 予期しないエラーの場合でもモックデータを使用
            console.error('[TagStore] Unexpected error, using mock data', error);
            set({ 
              tags: mockTags,
              isLoading: false,
              error: null
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
            
            // TaskStoreに更新を通知（タグ情報変更時の関連タスクの更新）
            get().notifyTaskStore('tag-updated', id, updatedTag);
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
            
            // 削除前に関連タスクをチェック
            const relatedTaskCount = get().getTagRelatedTaskCount(id);
            if (relatedTaskCount > 0) {
              const errorMessage = `このタグには${relatedTaskCount}個の関連タスクがあります。関連タスクからタグを削除してから、タグを削除してください。`;
              set({ 
                isLoading: false,
                error: errorMessage
              });
              console.warn('Tag deletion blocked due to related tasks', {
                category: 'tag_store',
                tagId: id,
                relatedTaskCount
              });
              return;
            }
            
            // API統合: PostgreSQL連携のみ（LocalStorageロジック除去）
            await apiDeleteTag(id);
            set(state => ({
              tags: state.tags.filter((tag: Tag) => tag.id !== id),
              selectedTags: state.selectedTags.filter((tag: Tag) => tag.id !== id),
              isLoading: false,
            }));
            
            // TaskStoreに削除を通知（関連タスクからタグを除去）
            get().notifyTaskStore('tag-deleted', id);
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

        
        // 整合性チェック: タスクストアと連携して実際のタグ使用状況を取得
        checkTagUsage: (tagId: string) => {
          const taskCount = get().getTagRelatedTaskCount(tagId);
          return { isUsed: taskCount > 0, taskCount };
        },

        getTagRelatedTaskCount: (tagId: string) => {
          // タスクストアから該当タグのタスク数を取得
          const taskStore = useTaskStore.getState();
          const relatedTasks = taskStore.getTasksByTag(tagId);
          return relatedTasks.length;
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
        
        // ==============================
        // TaskStore連携・データ同期機能
        // ==============================
        
        // TaskStoreに変更を通知
        notifyTaskStore: (operation: 'tag-updated' | 'tag-deleted', tagId: string, newTag?: Tag) => {
          try {
            // 循環参照回避のため動的import（ESモジュール対応）
            const taskStore = useTaskStore.getState();
            
            // TaskStoreにTagStoreの変更を通知
            if (operation === 'tag-updated' && newTag) {
              taskStore.handleTagUpdate(tagId, newTag);
            } else if (operation === 'tag-deleted') {
              taskStore.handleTagDeletion(tagId);
            }
            
            console.log('[TagStore] Notified task store of tag change', {
              operation,
              tagId,
              tagName: newTag?.name
            });
          } catch (error) {
            console.error('[TagStore] Failed to notify task store', { operation, tagId }, error);
          }
        },
        
        // TaskStoreからのタスク更新通知を処理
        handleTaskStoreUpdate: async (taskId: string, task: any | null, operation: 'create' | 'update' | 'delete') => {
          try {
            // タスクでタグが使用されている場合、使用統計を更新
            if (task && task.tags && Array.isArray(task.tags)) {
              // 非同期で統計を更新（UIブロックを避ける）
              setTimeout(() => {
                get().updateTagUsageStatistics();
              }, 100);
            }
            
            console.log('[TagStore] Processed task store update', {
              taskId,
              operation,
              tagCount: task?.tags?.length || 0
            });
          } catch (error) {
            console.error('[TagStore] Failed to handle task store update', { taskId, operation }, error);
          }
        },
        
        // タグ使用統計情報の自動更新
        updateTagUsageStatistics: async () => {
          try {
            const { tags } = get();
            const taskStore = useTaskStore.getState();
            
            // 各タグの使用回数を計算
            const updatedTags = tags.map(tag => {
              const relatedTasks = taskStore.getTasksByTag(tag.id);
              const usageCount = relatedTasks.length;
              
              // 使用回数が変更された場合のみ更新
              if (tag.usageCount !== usageCount) {
                return {
                  ...tag,
                  usageCount,
                  lastUsed: relatedTasks.length > 0 ? new Date() : tag.lastUsed
                };
              }
              return tag;
            });
            
            // 変更があった場合のみ状態を更新
            const hasChanges = updatedTags.some((tag, index) => 
              tag.usageCount !== tags[index].usageCount
            );
            
            if (hasChanges) {
              set({ tags: updatedTags });
              console.log('[TagStore] Tag usage statistics updated', {
                tagCount: tags.length,
                changedTags: updatedTags.filter((tag, index) => 
                  tag.usageCount !== tags[index].usageCount
                ).length
              });
            }
          } catch (error) {
            console.error('[TagStore] Failed to update tag usage statistics', error);
          }
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