# Tasks Document

## 📋 実装進捗状況 (3/21 完了)

### ✅ 完了済みタスク
- **タスク1**: プロジェクト管理ページの機能拡張 - ProjectEditModal実装、完全CRUD対応
- **タスク2**: タグ管理ページの機能拡張 - TagManager完全実装、API連携強化  
- **タスク12**: 型定義の拡張と整合性確保 - TaskWithCategories等の型安全性確保

### 🔄 次の優先タスク
- **タスク6**: TaskStoreにプロジェクト・タグ連携機能を追加 (基盤となるStore拡張)
- **タスク3**: TaskFormコンポーネントの統合 (UI連携の核心)
- **タスク4-5**: TaskModal統合 (作成・編集Modal対応)

### 📁 完了済み成果物
```
src/components/project/ProjectEditModal.tsx    # 新規作成 - プロジェクト編集機能
src/components/project/ProjectCard.tsx         # 拡張 - 編集ボタン追加
src/components/project/index.ts                # 更新 - ProjectEditModal export
src/pages/ProjectManagement.tsx                # 拡張 - 完全CRUD操作実装
src/components/tag/TagManager.tsx              # 完成 - API連携・エラーハンドリング
src/types/task.ts                             # 拡張 - TaskWithCategories型等追加
src/types/project.ts                          # 拡張 - ProjectWithTaskCount型追加  
src/types/tag.ts                              # 拡張 - TagWithTaskCount型追加
```

---

- [x] 1. 既存プロジェクト管理ページの機能拡張 ✅ **COMPLETED**
  - File: src/pages/ProjectManagement.tsx
  - **実装済み**: ProjectEditModalコンポーネントを新規作成し、完全なCRUD操作を実装
  - **実装済み**: ProjectCardに編集ボタン追加とonEditClickプロパティ対応
  - **実装済み**: 楽観的更新とエラーハンドリング、成功通知機能の統合
  - Purpose: プロジェクト管理の基本CRUD操作を完全にする
  - _Leverage: src/components/project/ProjectCreateModal.tsx, src/components/project/ProjectSelector.tsx_
  - _Requirements: 1.1, 1.2_
  - **Added Files**: src/components/project/ProjectEditModal.tsx

- [x] 2. タグ管理ページの機能拡張 ✅ **COMPLETED**
  - File: src/pages/TagManagement.tsx
  - **実装済み**: TagManagerのTODO処理を完全実装（削除・一括削除・エラーハンドリング）
  - **実装済み**: TagStoreとの連携強化、初期データ読み込み機能追加
  - **実装済み**: エラー表示とローディング状態の改善
  - Purpose: タグ管理の基本CRUD操作を完全にする
  - _Leverage: src/components/tag/TagCreateModal.tsx, src/components/tag/TagEditModal.tsx, src/components/tag/TagManager.tsx_
  - _Requirements: 2.1, 2.2_

- [x] 3. TaskFormコンポーネントにプロジェクト・タグ選択機能を統合
  - File: src/components/task/TaskForm.tsx
  - ProjectSelectorとTagSelectorコンポーネントを統合
  - フォームvalidationにプロジェクト・タグの選択状態を含める
  - Purpose: タスク作成時にプロジェクトとタグを選択できるようにする
  - _Leverage: src/components/project/ProjectSelector.tsx, src/components/tag/TagSelector.tsx_
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. TaskCreateModalでのプロジェクト・タグ連携
  - File: src/components/task/TaskCreateModal.tsx
  - TaskFormWithCategories機能を統合
  - プロジェクト・タグ選択状態をTaskStoreに保存
  - Purpose:新規タスク作成時のカテゴリ選択を実現
  - _Leverage: src/components/task/TaskForm.tsx, src/stores/taskStore.ts_
  - _Requirements: 3.4, 3.5_

- [x] 5. TaskEditModalでのプロジェクト・タグ編集機能
  - File: src/components/task/TaskEditModal.tsx
  - 既存タスクのプロジェクト・タグ情報を読み込み
  - プロジェクト・タグの変更機能を追加
  - Purpose: 既存タスクのカテゴリ情報を編集可能にする
  - _Leverage: src/components/task/TaskForm.tsx, src/stores/taskStore.ts_
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. TaskStoreにプロジェクト・タグ連携機能を追加
  - File: src/stores/taskStore.ts
  - タスク作成・更新時のプロジェクト・タグ情報の保存
  - TaskWithCategories型の対応
  - Purpose: タスクとプロジェクト・タグの関連データを管理
  - _Leverage: src/stores/projectStore.ts, src/stores/tagStore.ts, src/types/task.ts_
  - _Requirements: 3.4, 5.4_

- [x] 7. TaskListでのプロジェクト・タグ表示機能
  - File: src/components/task/TaskList.tsx (新規作成またはKanbanBoard拡張)
  - タスク一覧でのProjectBadge、TagBadge表示
  - プロジェクト・タグによるフィルタリング機能
  - Purpose: タスク一覧でカテゴリ情報を視覚的に表示
  - _Leverage: src/components/project/ProjectBadge.tsx, src/components/tag/TagBadge.tsx_
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. DashboardでのTaskListWithCategories統合
  - File: src/pages/Dashboard.tsx
  - 既存のKanbanBoardにプロジェクト・タグ表示を追加
  - TaskCardにProjectBadge、TagBadge表示
  - Purpose: ダッシュボードでタスクのカテゴリ情報を表示
  - _Leverage: src/components/kanban/TaskCard.tsx, src/components/project/ProjectBadge.tsx, src/components/tag/TagBadge.tsx_
  - _Requirements: 4.1, 4.2_

- [x] 9. プロジェクト削除時の関連タスク処理
  - File: src/stores/projectStore.ts
  - プロジェクト削除前の関連タスク確認
  - 削除確認ダイアログでの関連タスク数表示
  - Purpose: データ整合性を保ち、ユーザーに適切な警告を提供
  - _Leverage: src/stores/taskStore.ts, src/components/ui/modal.tsx_
  - _Requirements: Error Handling 4_

- [x] 10. タグ削除時の関連タスク処理
  - File: src/stores/tagStore.ts
  - タグ削除前の関連タスク確認
  - 削除確認ダイアログでの関連タスク数表示
  - Purpose: データ整合性を保ち、ユーザーに適切な警告を提供
  - _Leverage: src/stores/taskStore.ts, src/components/ui/modal.tsx_
  - _Requirements: Error Handling 4_

- [x] 11. プロジェクト・タグvalidationユーティリティの拡張
  - File: src/utils/projectPermissions.ts, src/utils/tagValidation.ts
  - プロジェクト・タグ選択時のvalidation強化
  - 重複チェック、必須項目チェックの追加
  - Purpose: データ品質を保ち、ユーザーエラーを防ぐ
  - _Leverage: src/utils/validationUtils.ts_
  - _Requirements: Error Handling 1, 2, 3_

- [x] 12. 型定義の拡張と整合性確保 ✅ **COMPLETED**
  - File: src/types/task.ts
  - **実装済み**: TaskWithCategories型、TaskFormWithCategoriesData型の正式定義
  - **実装済み**: CreateTaskWithCategoriesInput、UpdateTaskWithCategoriesInput型の追加
  - **実装済み**: TaskCategoryFilter、TaskListWithCategories型の定義
  - **実装済み**: ProjectWithTaskCount、TagWithTaskCount型の追加（統計情報付き）
  - Purpose: TypeScriptによる型安全性を全体で確保
  - _Leverage: src/types/project.ts, src/types/tag.ts_
  - _Requirements: All (型安全性)_
  - **Enhanced Files**: src/types/project.ts, src/types/tag.ts

- [x] 13. ProjectStoreとTaskStore間のデータ同期
  - File: src/stores/projectStore.ts, src/stores/taskStore.ts
  - プロジェクト情報変更時の関連タスクの更新
  - プロジェクト統計情報（タスク数等）の自動更新
  - Purpose: store間のデータ整合性を保つ
  - _Leverage: Zustand store パターン_
  - _Requirements: Data consistency_

- [x] 14. TagStoreとTaskStore間のデータ同期
  - File: src/stores/tagStore.ts, src/stores/taskStore.ts
  - タグ情報変更時の関連タスクの更新
  - タグ使用統計情報の自動更新
  - Purpose: store間のデータ整合性を保つ
  - _Leverage: Zustand store パターン_
  - _Requirements: Data consistency_

- [x] 15. プロジェクト管理機能のunit tests作成
  - File: src/components/project/__tests__/ProjectManager.test.tsx
  - ProjectManagerコンポーネントのCRUD操作テスト
  - エラーハンドリングのテスト
  - Purpose: プロジェクト管理機能の品質保証
  - _Leverage: src/__tests__/stores/projectStore.test.ts_
  - _Requirements: 1.1, 1.2_

- [x] 16. タグ管理機能のunit tests作成
  - File: src/components/tag/__tests__/TagManager.enhanced.test.tsx
  - TagManagerコンポーネントの拡張機能テスト
  - 既存のTagManager.test.tsxを拡張
  - Purpose: タグ管理機能の品質保証
  - _Leverage: src/components/tag/__tests__/TagManager.test.tsx_
  - _Requirements: 2.1, 2.2_

- [x] 17. TaskForm連携機能のunit tests作成
  - File: src/components/task/__tests__/TaskFormWithCategories.test.tsx
  - プロジェクト・タグ選択機能のテスト
  - フォーム validation のテスト
  - Purpose: タスク作成・編集時のカテゴリ選択機能の品質保証
  - _Leverage: src/components/task/__tests__/TaskForm.test.tsx_
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2_

- [x] 18. Store連携機能のintegration tests作成
  - File: src/__tests__/integration/project-tag-task-integration.test.ts
  - プロジェクト作成→タスク作成→一覧表示の統合テスト
  - タグ作成→タスク作成→一覧表示の統合テスト
  - Purpose: 全体的なデータ連携の品質保証
  - _Leverage: src/__tests__/stores/taskStore.test.ts_
  - _Requirements: Integration flow_

- [x] 19. E2E テストの準備（Playwright MCP対応）
  - Files: 既存画面の活用（例: src/pages/Dashboard.tsx, src/pages/ProjectManagement.tsx, src/pages/TagManagement.tsx, src/components/task/TaskCreateModal.tsx, src/components/task/TaskEditModal.tsx）
  - 安定したE2Eセレクタの整備（data-testid属性を主要操作要素に付与）
  - ポート5173でのアクセス可能性確認（アプリは:5173で起動）
  - Purpose: 既存画面のみでPlaywright MCPの自動テストを成立させる
  - _Leverage: 既存のページ/モーダル/フォームコンポーネント_
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 20. Playwright MCP E2Eテスト実行・検証
  - File: E2Eテスト実行（コードファイルなし、テスト実行のみ）
  - プロジェクト作成→編集→タスク作成→一覧確認→タスク編集の完全フロー
  - 実行前提: Dockerで`database`/`api-layer`/`app`が起動し(:5173到達可)、DBが既知のクリーン状態に初期化済み
  - エラーが発生しないことを確認
  - Purpose: 要件で指定された完全なE2Eテストシナリオの実行
  - _Leverage: Playwright MCP tools_
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 21. E2E環境前提の整備（Docker + DBリセット/起動）
  - Files: docker-compose.yml, Dockerfile, package.json（任意で補助スクリプト追加）, prisma/*（シードがある場合）
  - 起動: `docker compose up -d database api-layer app`（:5173公開、ヘルスチェック通過を待機）
  - DBリセット/シード: `docker compose exec api-layer npx prisma migrate reset --force && docker compose exec api-layer npx prisma db seed`（必要時）
  - 停止/後片付け: `docker compose down -v`（必要時）
  - ドキュメント: Playwright MCP実行前手順を明記（起動→DBリセット/シード→テスト）
  - Purpose: Docker前提でE2Eの安定再現性（Preconditions）を確保
  - _Leverage: 既存のDocker構成/Prisma設定_
  - _Requirements: 6章 Preconditions
