# コーディング規約

## TypeScript設定
- **Strict Mode**: 有効
- **未使用変数/パラメータ**: エラー
- **Switch文の全ケース**: 必須
- **JSX**: react-jsx使用

## 命名規則
- **コンポーネント**: PascalCase (KanbanBoard.tsx)
- **ファイル名**: PascalCase (.tsx), camelCase (.ts)
- **変数/関数**: camelCase
- **型定義**: PascalCase
- **定数**: UPPER_SNAKE_CASE

## インポート設定
- **パスエイリアス**: `@/*` で src/* を参照可能
- **拡張子**: .ts, .tsx を明示的にインポート可能

## スタイリング
- **Tailwind CSS**: メインスタイリングフレームワーク
- **カスタムテーマ**: status, priority色を定義済み
- **ダークモード**: class戦略使用
- **レスポンシブ**: mobile-first

## コンポーネント構造
- **UI Components**: /src/components/ui/
- **Business Logic**: カスタムhookに分離
- **Props Interface**: 明示的に定義
- **Default Export**: コンポーネントのみ

## 型定義パターン
```typescript
// 基本型
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';

// インターフェース
export interface Task {
  id: string;
  title: string;
  // ...
}

// Input型 (Create/Update)
export interface CreateTaskInput {
  title: string;
  // 必要最小限のフィールド
}
```