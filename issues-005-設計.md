# 通知画面のmock作成 - 設計書

## 設計概要
ヘッダー部分の通知アイコンをクリックすると、通知一覧がドロップダウンで表示される機能のmock実装を行います。

## 現状分析
### 既存実装の確認
- **Header.tsx**: 通知ベルアイコンが実装済み（通知数「3」がハードコーディング）
- **user.ts**: 通知設定の型定義が存在
- **schedule.ts**: リマインダー通知の型定義が存在
- **mockデータ構造**: 既存のmockファイルパターンを踏襲

### 技術スタック
- React + TypeScript
- Tailwind CSS（スタイリング）
- Lucide React（アイコン）
- 状態管理: Zustand（既存パターンに従う）

## 通知機能の設計方針

### アーキテクチャ設計
```
components/
├── notification/
│   ├── NotificationDropdown.tsx    # ドロップダウン本体
│   ├── NotificationItem.tsx        # 個別通知アイテム
│   ├── NotificationBadge.tsx       # 通知数バッジ
│   └── index.ts                    # エクスポート用
types/
├── notification.ts                 # 通知の型定義
mock/
├── notifications.ts                # 通知のmockデータ
stores/
├── notificationStore.ts            # 通知の状態管理（Phase2以降）
```

### 型定義設計
```typescript
// 通知タイプ
export type NotificationType = 
  | 'task_deadline'      // タスク期限
  | 'task_assigned'      // タスク割り当て
  | 'task_completed'     // タスク完了
  | 'mention'           // メンション
  | 'project_update'    // プロジェクト更新
  | 'system';           // システム通知

// 通知の優先度
export type NotificationPriority = 'high' | 'medium' | 'low';

// 通知のインターフェース
export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: {
    taskId?: string;
    projectId?: string;
    userId?: string;
    [key: string]: any;
  };
}
```

### UIデザイン仕様
- **ドロップダウンサイズ**: 幅 384px (w-96)、最大高さ 480px
- **通知アイテム**: ホバー時にハイライト、既読/未読の視覚的区別
- **ヘッダー**: 「通知」タイトル、「すべて既読にする」アクション
- **エンプティステート**: 通知がない場合の表示
- **スクロール**: 通知が多い場合は内部スクロール

## 実装グループ分割

## グループ1: 型定義とmockデータ作成 [@Phase1]
- `src/types/notification.ts`の作成
- `src/mock/notifications.ts`の作成
- 通知データの生成ロジック実装

## グループ2: 通知コンポーネント実装 [@Phase1]
- `NotificationItem.tsx`の実装
- `NotificationBadge.tsx`の実装
- 通知アイテムのスタイリング

## グループ3: ドロップダウンコンポーネント実装 [@Phase1]
- `NotificationDropdown.tsx`の実装
- ドロップダウンの開閉ロジック
- クリック外側での自動クローズ機能

## グループ4: Header統合 [@Phase1]
- `Header.tsx`への通知ドロップダウン統合
- 通知数の動的表示
- mockデータの接続

## グループ5: インタラクション改善（Phase 2以降）
- 通知の既読処理
- 「すべて既読にする」機能
- 通知のフィルタリング機能

## グループ6: 状態管理実装（Phase 2以降）
- `notificationStore.ts`の作成
- 通知の追加/削除/更新ロジック
- localStorage連携

## グループ7: リアルタイム更新（Phase 3以降）
- WebSocket連携の準備
- ポーリングによる更新（暫定実装）
- プッシュ通知の基盤

## グループ8: アニメーション追加（Phase 3以降）
- 通知追加時のアニメーション
- ドロップダウンの開閉アニメーション
- バッジの数値変更アニメーション

## 技術的考慮事項

### パフォーマンス最適化
- 仮想スクロール（通知数が多い場合）
- メモ化による再レンダリング最適化
- 遅延読み込み（必要に応じて）

### アクセシビリティ
- ARIA属性の適切な設定
- キーボードナビゲーション対応
- スクリーンリーダー対応

### エラーハンドリング
- 通知データ取得失敗時の処理
- 不正なデータ形式への対応
- ユーザーへの適切なフィードバック

## 成功条件
1. ヘッダーの通知アイコンクリックでドロップダウンが表示される
2. mockデータによる通知一覧が表示される
3. 未読通知数がバッジに表示される
4. ドロップダウン外クリックで閉じる
5. 各通知アイテムが適切にスタイリングされている

## 将来的な拡張性
- WebSocket/SSEによるリアルタイム通知
- 通知の永続化（バックエンド連携）
- 通知の詳細設定（ユーザーごとのカスタマイズ）
- 通知のグループ化・カテゴリ分け
- 通知音の実装