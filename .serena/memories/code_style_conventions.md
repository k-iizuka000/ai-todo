# コードスタイルと規約

## TypeScript設定
- **Strict Mode**: 有効 (strict: true)
- **未使用変数チェック**: 有効
- **パスマッピング**: `@/*` → `./src/*`
- **JSX**: react-jsx形式

## ESLint設定
- TypeScriptサポート有効
- React Hooks ルール有効
- React Refresh プラグイン有効
- 最大警告数: 0 (警告も許可しない)

## ファイル命名規約
- **コンポーネント**: PascalCase (例: MainLayout.tsx, TaskCard.tsx)
- **ページ**: PascalCase (例: Dashboard.tsx, Tasks.tsx)
- **ユーティリティ**: camelCase (例: utils.ts)
- **型定義**: camelCase (例: task.ts, user.ts)

## コンポーネント構造
- React.FC型の使用
- Propsインターフェースの明示的定義
- Export defaultの使用
- アロー関数での定義

## スタイル規約
- **Tailwind CSS**: 主要なスタイリング手法
- **CSS変数**: カスタムプロパティの活用
- **レスポンシブ**: モバイルファーストアプローチ
- **アニメーション**: 独自のkeyframes定義

## インポート順序
1. React関連
2. サードパーティライブラリ
3. 内部コンポーネント (@/から始まる)
4. 相対パス

## 状態管理
- 基本: useState, useReducer
- グローバル状態: 独自のstoreパターン（taskStore.ts）

## アクセシビリティ
- ARIAラベルの適切な使用
- キーボードナビゲーション対応
- セマンティックHTML要素の使用