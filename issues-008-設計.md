# Issue-008: タスク管理タブをダッシュボードに変更し、既存ダッシュボードを削除する設計書

## 概要
- **目的**: サイドメニューの「タスク管理」タブを「ダッシュボード」に名称変更し、既存のダッシュボード画面を削除する
- **影響範囲**: ルーティング、サイドメニュー、ページコンポーネント、モックデータ

## 現状分析

### 現在の構成
1. **ルーティング構成**
   - `/` → Dashboard.tsx (統計情報ダッシュボード) - **削除対象**
   - `/tasks` → Tasks.tsx (タスク管理画面) - **新ダッシュボードになる**
   - `/tasks/today` → 今日のタスク
   - `/tasks/important` → 重要なタスク
   - `/tasks/completed` → 完了済みタスク
   - `/tasks/demo` → タスク詳細デモ

2. **影響ファイル数**
   - Dashboard関連: 10ファイル
   - Tasks関連: 35ファイル
   - `/tasks`パス参照: 通知機能など複数箇所

### 技術的考慮事項
1. **段階的移行戦略**（React Router v7ベストプラクティス）
   - 一度にすべて変更せず、段階的に実施
   - 互換性維持のためのリダイレクト設定
   - TypeScript型定義の整合性維持

2. **SEO/UX考慮**
   - 既存URLからのリダイレクト設定
   - ブックマーク対応
   - 通知機能のリンク維持

## 実装設計

### アーキテクチャ方針
1. **命名規則の統一**
   - Tasks.tsx → Dashboard.tsx にリネーム
   - `/tasks` → `/dashboard` にパス変更
   - 既存Dashboard.tsx削除

2. **後方互換性**
   - `/tasks/*` から `/dashboard/*` へのリダイレクト設定
   - ローカルストレージのマイグレーション考慮

3. **段階的実装**
   - Phase 1: 基本的なリネームとルーティング変更
   - Phase 2-4: 詳細調整と動作確認

## 作業グループ

## グループ1: ルーティング設定の更新 [@Phase1]
### 作業内容
1. **routes.tsの更新**
   - `/tasks` → `/dashboard` パス変更
   - ラベル「タスク管理」→「ダッシュボード」変更
   - 子ルートのパス更新

2. **AppRouter.tsxの更新**
   - Dashboard コンポーネントのインポート削除
   - Tasks → Dashboard にコンポーネント名変更
   - ルートパスの調整

### 変更詳細
```typescript
// routes.ts
// 変更前:
{
  path: '/',
  label: 'ダッシュボード',
  icon: 'Home',
},
{
  path: '/tasks',
  label: 'タスク管理',
  icon: 'CheckSquare',
  children: [...]
}

// 変更後:
{
  path: '/dashboard',
  label: 'ダッシュボード',
  icon: 'CheckSquare',
  children: [
    { path: '/dashboard', label: '全てのタスク' },
    { path: '/dashboard/today', label: '今日のタスク' },
    { path: '/dashboard/important', label: '重要なタスク' },
    { path: '/dashboard/completed', label: '完了済みタスク' },
    { path: '/dashboard/demo', label: 'タスク詳細デモ' },
  ]
}
```

## グループ2: コンポーネントのリネームと削除 [@Phase1]
### 作業内容
1. **Tasks.tsxのリネーム**
   - src/pages/Tasks.tsx → src/pages/Dashboard.tsx
   - コンポーネント名変更: Tasks → Dashboard
   - エクスポート名の統一

2. **既存Dashboard.tsxの削除**
   - src/pages/Dashboard.tsx（旧）を削除
   - 関連するテストファイルも削除（存在する場合）

3. **インポート更新**
   - AppRouter.tsxのインポート文更新

## グループ3: リダイレクト設定 [@Phase1]
### 作業内容
1. **AppRouter.tsxにリダイレクトルート追加**
   ```typescript
   // 後方互換性のためのリダイレクト
   <Route path="/" element={<Navigate to="/dashboard" replace />} />
   <Route path="/tasks" element={<Navigate to="/dashboard" replace />} />
   <Route path="/tasks/*" element={<Navigate to="/dashboard/*" replace />} />
   ```

2. **404処理の考慮**
   - 既存のNotFound処理に影響がないよう配慮

## グループ4: 通知機能のパス更新
### 作業内容
1. **notifications.tsの更新**
   - `/tasks/task-*` → `/dashboard/task-*` に変更
   - 全11箇所のパス更新

### リスク
- 既存の通知リンクが機能しなくなる可能性
- リダイレクトでカバーするが、確認必要

## グループ5: モックデータとインポート更新
### 作業内容
1. **インポート文の更新**
   - calendarData.ts, taskDetails.ts, projectsWithStats.ts, analyticsData.ts
   - `import { mockTasks }` のパス確認（変更不要の可能性）

2. **型定義の確認**
   - AnalyticsDashboard型への影響確認
   - 必要に応じて型名変更

## グループ6: 認証後のリダイレクト更新
### 作業内容
1. **ProtectedRoute.tsxの確認**
   - Dashboard参照箇所の確認と更新
   - デフォルトリダイレクト先の変更（必要な場合）

2. **ログイン/サインアップ後の遷移先**
   - LoginForm.tsx, SignupForm.tsxの確認
   - 成功後のリダイレクト先更新

## グループ7: ページ内リンクの更新
### 作業内容
1. **Dashboard.tsx（旧Tasks.tsx）内のリンク**
   - 内部リンクのパス更新
   - useLocationフックの処理確認

2. **他ページからのリンク**
   - Analytics.tsx, DataManagement.tsxなど
   - タスク管理へのリンク更新

## グループ8: テストとドキュメント更新
### 作業内容
1. **E2Eテスト更新**（存在する場合）
   - パス変更に伴うテスト修正

2. **README更新**（必要な場合）
   - ルーティング説明の更新

## グループ9: 動作確認とUI整合性チェック
### 作業内容
1. **機能テスト**
   - 全ルートへのアクセス確認
   - リダイレクトの動作確認
   - サイドメニューのアクティブ状態確認

2. **UI/UX確認**
   - モバイルビューでの動作
   - ブレッドクラムの表示（存在する場合）
   - ページタイトルの整合性

### チェックリスト
- [ ] ダッシュボード（旧タスク管理）へのアクセス
- [ ] 子ルート（today, important, completed, demo）の動作
- [ ] サイドメニューのハイライト
- [ ] 通知からのリンク動作
- [ ] モバイルナビゲーション
- [ ] ブラウザの戻る/進む動作
- [ ] リロード時の挙動

## リスクと対策

### リスク1: 既存URLへのアクセス
- **影響**: ブックマークや共有リンクの無効化
- **対策**: リダイレクト設定で対応

### リスク2: ローカルストレージの整合性
- **影響**: ユーザー設定やフィルタ状態の喪失
- **対策**: キー名の確認と必要に応じたマイグレーション

### リスク3: 型定義の不整合
- **影響**: TypeScriptコンパイルエラー
- **対策**: 段階的な型更新と確認

## 実装順序とPhase分割

### Phase 1（本Issue対象）
1. グループ1: ルーティング設定の更新
2. グループ2: コンポーネントのリネームと削除
3. グループ3: リダイレクト設定

### Phase 2-4（後続作業）
- グループ4-9: 詳細調整と確認作業

## 成功基準
1. サイドメニューに「ダッシュボード」が表示される
2. 既存のダッシュボード画面が削除されている
3. `/dashboard`でタスク管理機能にアクセスできる
4. 既存の`/tasks`URLがリダイレクトされる
5. UIに矛盾がない
6. すべての機能が正常に動作する

## 注意事項
- **段階的実装**: 一度にすべて変更せず、コミット単位で確認
- **後方互換性**: 既存URLのリダイレクト必須
- **テスト重視**: 各段階での動作確認を徹底
- **ユーザー影響最小化**: リダイレクトで既存リンクを保護