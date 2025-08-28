/**
 * アーカイブタスクの表示切り替え状態の型定義
 */

// アーカイブタスクの表示状態（画面ごとに管理）
export interface ArchivedToggleState {
  dashboard: boolean;   // Dashboard画面での表示状態
  calendar: boolean;    // Calendar画面での表示状態
  analytics: boolean;   // Analytics画面での表示状態
}

// デフォルトのアーカイブ表示状態（非表示）
export const defaultArchivedToggleState: ArchivedToggleState = {
  dashboard: false,
  calendar: false,
  analytics: false
};

// アコーディオンの開閉状態管理用の型
export interface AccordionState {
  [sectionId: string]: boolean; // セクションID -> 開閉状態
}