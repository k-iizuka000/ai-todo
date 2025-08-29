/**
 * タスク詳細専用Zustandストア
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 * 選択的サブスクリプションとキャッシュ最適化を実装
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { TaskDetail } from '../types/task';
import { DataValidationService } from '../utils/dataValidation';

// タスク詳細ストアの状態型定義
interface TaskDetailState {
  // キャッシュされたタスク詳細
  taskDetails: Record<string, TaskDetail>;
  // ローディング状態（タスクID別）
  loadingStates: Record<string, boolean>;
  // プリフェッチされたタスクID
  prefetchedTaskIds: Set<string>;
  
  // アクション
  getTaskDetail: (id: string) => TaskDetail | undefined;
  setTaskDetail: (id: string, task: TaskDetail) => void;
  updateTaskField: (id: string, field: keyof TaskDetail, value: any) => void;
  prefetchTaskDetail: (id: string) => void;
  clearTaskDetail: (id: string) => void;
  setLoading: (id: string, loading: boolean) => void;
  
  // キャッシュ管理
  clearExpiredCache: (maxAgeMs?: number) => void;
  getCacheSize: () => number;
}

// 最適化されたタスク詳細ストア
export const useTaskDetailStore = create<TaskDetailState>()(
  devtools(
    (set, get) => ({
      // 初期状態
      taskDetails: {},
      loadingStates: {},
      prefetchedTaskIds: new Set(),

      // タスク詳細取得（キャッシュ利用）
      getTaskDetail: (id: string) => {
        const { taskDetails } = get();
        return taskDetails[id];
      },

      // タスク詳細設定（バリデーション付き）
      setTaskDetail: (id: string, task: TaskDetail) => {
        const validatedTask = DataValidationService.validateTaskDetail(task);
        
        set(
          (state) => ({
            taskDetails: {
              ...state.taskDetails,
              [id]: validatedTask,
            },
            loadingStates: {
              ...state.loadingStates,
              [id]: false,
            },
          }),
          false,
          `setTaskDetail/${id}`
        );
      },

      // 部分的フィールド更新
      updateTaskField: (id: string, field: keyof TaskDetail, value: any) => {
        set(
          (state) => {
            const existingTask = state.taskDetails[id];
            if (!existingTask) return state;

            const updatedTask = {
              ...existingTask,
              [field]: value,
              updatedAt: new Date(),
            };

            return {
              taskDetails: {
                ...state.taskDetails,
                [id]: updatedTask,
              },
            };
          },
          false,
          `updateTaskField/${id}/${field}`
        );
      },

      // プリフェッチ（バックグラウンドで取得）
      prefetchTaskDetail: (id: string) => {
        const { prefetchedTaskIds } = get();
        
        set(
          (state) => ({
            prefetchedTaskIds: new Set([...state.prefetchedTaskIds, id]),
          }),
          false,
          `prefetchTaskDetail/${id}`
        );
      },

      // タスク詳細削除
      clearTaskDetail: (id: string) => {
        set(
          (state) => {
            const newTaskDetails = { ...state.taskDetails };
            const newLoadingStates = { ...state.loadingStates };
            const newPrefetchedTaskIds = new Set(state.prefetchedTaskIds);

            delete newTaskDetails[id];
            delete newLoadingStates[id];
            newPrefetchedTaskIds.delete(id);

            return {
              taskDetails: newTaskDetails,
              loadingStates: newLoadingStates,
              prefetchedTaskIds: newPrefetchedTaskIds,
            };
          },
          false,
          `clearTaskDetail/${id}`
        );
      },

      // ローディング状態設定
      setLoading: (id: string, loading: boolean) => {
        set(
          (state) => ({
            loadingStates: {
              ...state.loadingStates,
              [id]: loading,
            },
          }),
          false,
          `setLoading/${id}/${loading}`
        );
      },

      // 期限切れキャッシュのクリア
      clearExpiredCache: (maxAgeMs = 10 * 60 * 1000) => { // デフォルト10分
        const now = new Date().getTime();
        
        set(
          (state) => {
            const newTaskDetails: Record<string, TaskDetail> = {};
            
            Object.entries(state.taskDetails).forEach(([id, task]) => {
              if (now - task.updatedAt.getTime() < maxAgeMs) {
                newTaskDetails[id] = task;
              }
            });

            return {
              taskDetails: newTaskDetails,
            };
          },
          false,
          'clearExpiredCache'
        );
      },

      // キャッシュサイズ取得
      getCacheSize: () => {
        return Object.keys(get().taskDetails).length;
      },
    }),
    {
      name: 'task-detail-store',
    }
  )
);

// === 選択的サブスクリプション用カスタムフック ===

/**
 * 特定のタスク詳細を取得するフック（選択的サブスクリプション）
 */
export const useTaskDetail = (taskId: string) => 
  useTaskDetailStore(
    (state) => state.taskDetails[taskId],
    shallow
  );

/**
 * 特定のタスクのローディング状態を取得するフック
 */
export const useTaskDetailLoading = (taskId: string) =>
  useTaskDetailStore(
    (state) => state.loadingStates[taskId] || false
  );

/**
 * タスク詳細の特定のフィールドのみを監視するフック
 */
export const useTaskDetailField = <K extends keyof TaskDetail>(
  taskId: string,
  field: K
) =>
  useTaskDetailStore(
    (state) => state.taskDetails[taskId]?.[field]
  );

/**
 * 複数のタスク詳細を効率的に取得するフック
 */
export const useTaskDetails = (taskIds: string[]) =>
  useTaskDetailStore(
    (state) => taskIds.map(id => state.taskDetails[id]).filter(Boolean),
    shallow
  );

/**
 * タスク詳細のステータス関連情報のみを取得するフック
 */
export const useTaskDetailStatus = (taskId: string) =>
  useTaskDetailStore(
    (state) => {
      const task = state.taskDetails[taskId];
      if (!task) return null;
      
      return {
        id: task.id,
        status: task.status,
        priority: task.priority,
        updatedAt: task.updatedAt,
      };
    },
    shallow
  );

/**
 * タスク詳細アクションのみを取得するフック（レンダリング最適化）
 */
export const useTaskDetailActions = () =>
  useTaskDetailStore(
    (state) => ({
      getTaskDetail: state.getTaskDetail,
      setTaskDetail: state.setTaskDetail,
      updateTaskField: state.updateTaskField,
      prefetchTaskDetail: state.prefetchTaskDetail,
      clearTaskDetail: state.clearTaskDetail,
      setLoading: state.setLoading,
      clearExpiredCache: state.clearExpiredCache,
      getCacheSize: state.getCacheSize,
    }),
    shallow
  );

// === パフォーマンス監視用フック ===

/**
 * ストアのメタ情報を監視するフック
 */
export const useTaskDetailStoreMeta = () =>
  useTaskDetailStore(
    (state) => ({
      cacheSize: state.getCacheSize(),
      loadingCount: Object.values(state.loadingStates).filter(Boolean).length,
      prefetchedCount: state.prefetchedTaskIds.size,
    }),
    shallow
  );