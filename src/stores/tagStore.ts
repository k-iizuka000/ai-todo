/**
 * タグ管理用のZustandストア
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Tag, CreateTagInput, UpdateTagInput, TagFilter, validateTag, validateTagName } from '../types/tag';
import { mockTags } from '../mock/tags';


interface TagState {
  tags: Tag[];
  selectedTags: Tag[];
  isLoading: boolean;
  error: string | null;
  apiMode: boolean; // API連携モードフラグ
  
  // アクション - イミュータブル更新パターン
  addTag: (tag: CreateTagInput) => Promise<void>;
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

// 初期データ
const initialTags: Tag[] = mockTags;

export const useTagStore = create<TagState>()(
  devtools(
    persist(
      (set, get) => ({
        tags: initialTags,
        selectedTags: [],
        isLoading: false,
        error: null,
        apiMode: false, // 初期状態はlocalStorageモード

        // 楽観的更新の実装
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

            // 名前の重複チェック
            const { tags } = get();
            const existingTag = tags.find((tag: Tag) => 
              tag.name.toLowerCase() === input.name.toLowerCase()
            );
            if (existingTag) {
              set({ 
                isLoading: false,
                error: 'この名前のタグは既に存在します'
              });
              return;
            }

            const newTag: Tag = {
              ...input,
              id: generateTagId(),
              usageCount: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            
            // イミュータブルな更新
            set(state => ({ 
              tags: [...state.tags, newTag],
              isLoading: false,
            }));
            
            // APIモードでない場合、persistミドルウェアが自動保存
          } catch (error) {
            set({ 
              isLoading: false,
              error: error instanceof Error ? error.message : 'タグの作成に失敗しました'
            });
          }
        },

        updateTag: async (id: string, updates: UpdateTagInput) => {
          try {
            set({ isLoading: true, error: null });
            
            // バリデーション（更新対象のフィールドのみ）
            if (updates.name !== undefined) {
              const nameValidation = validateTagName(updates.name);
              if (!nameValidation.isValid) {
                set({ 
                  isLoading: false,
                  error: nameValidation.errors.join(', ')
                });
                return;
              }

              // 名前の重複チェック（他のタグとの重複）
              const { tags } = get();
              const existingTag = tags.find((tag: Tag) => 
                tag.id !== id && 
                tag.name.toLowerCase() === updates.name!.toLowerCase()
              );
              if (existingTag) {
                set({ 
                  isLoading: false,
                  error: 'この名前のタグは既に存在します'
                });
                return;
              }
            }

            // カラーバリデーション
            if (updates.color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
              set({ 
                isLoading: false,
                error: '有効なカラーコード（#RRGGBB形式）を指定してください'
              });
              return;
            }
            
            set(state => ({
              tags: state.tags.map((tag: Tag) => 
                tag.id === id 
                  ? { ...tag, ...updates, updatedAt: new Date() }
                  : tag
              ),
              isLoading: false,
            }));
            
            // APIモードでない場合、persistミドルウェアが自動保存
          } catch (error) {
            set({ 
              isLoading: false,
              error: error instanceof Error ? error.message : 'タグの更新に失敗しました'
            });
          }
        },

        deleteTag: async (id: string) => {
          try {
            set({ isLoading: true, error: null });
            
            // 参照整合性チェック
            const state = get();
            const usage = state.checkTagUsage(id);
            if (usage.isUsed) {
              set({ 
                isLoading: false,
                error: `このタグは${usage.taskCount}件のタスクで使用中です。削除する前にタスクからタグを削除してください。`
              });
              return;
            }
            
            set(state => ({
              tags: state.tags.filter((tag: Tag) => tag.id !== id),
              selectedTags: state.selectedTags.filter((tag: Tag) => tag.id !== id),
              isLoading: false,
            }));
            
            // APIモードでない場合、persistミドルウェアが自動保存
          } catch (error) {
            set({ 
              isLoading: false,
              error: error instanceof Error ? error.message : 'タグの削除に失敗しました'
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

        
        // 整合性チェックと同期処理
        checkTagUsage: (tagId: string) => {
          // タスクストアからタグ使用状況をチェック
          try {
            const taskStoreData = localStorage.getItem('task-store');
            if (!taskStoreData) {
              return { isUsed: false, taskCount: 0 };
            }
            
            const { state } = JSON.parse(taskStoreData);
            const tasks = state?.tasks || [];
            
            const usingTasks = tasks.filter((task: any) => 
              task.tags && task.tags.some((tag: any) => tag.id === tagId)
            );
            
            return {
              isUsed: usingTasks.length > 0,
              taskCount: usingTasks.length
            };
          } catch (error) {
            console.error('Failed to check tag usage:', error);
            return { isUsed: false, taskCount: 0 };
          }
        },
        
        syncWithTasks: async () => {
          try {
            set({ isLoading: true, error: null });
            
            const { tags } = get();
            const updatedTags = [...tags];
            
            // 各タグの使用回数を更新
            const state = get();
            updatedTags.forEach((tag: Tag) => {
              const usage = state.checkTagUsage(tag.id);
              tag.usageCount = usage.taskCount;
            });
            
            set({ 
              tags: updatedTags,
              isLoading: false 
            });
            
            // persistミドルウェアが自動保存
            
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
            
            const { tags } = get();
            const state = get();
            const usedTags = tags.filter((tag: Tag) => {
              const usage = state.checkTagUsage(tag.id);
              return usage.isUsed;
            });
            
            set({ 
              tags: usedTags,
              isLoading: false 
            });
            
            // persistミドルウェアが自動保存
            
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
        // 永続化から除外するフィールド
        partialize: (state) => ({
          tags: state.tags,
          selectedTags: state.selectedTags,
        }),
        // 初期データがない場合のデフォルト値を設定
        merge: (persistedState: any, currentState: TagState) => ({
          ...currentState,
          tags: persistedState?.tags?.length > 0 ? persistedState.tags : mockTags,
          selectedTags: persistedState?.selectedTags || [],
        }),
      }
    ),
    { name: 'tag-store' }
  )
);