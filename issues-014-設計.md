# Issue 014: タスクとプロジェクトの紐付け情報表示機能 - 設計書

## 1. 概要

すべてのタスク表示箇所でプロジェクトとの紐付け情報を表示し、プロジェクトに紐付いていないタスクは「（プロジェクト無し）」と表示する機能を実装する。

## 2. 現状分析

### 2.1 実装済み機能
- **TaskCard/TaskCardCompact**: ProjectBadgeコンポーネントを使用してプロジェクト情報を表示済み
- **ProjectBadge**: プロジェクト情報の表示コンポーネント実装済み（プロジェクトなしの場合「プロジェクト未設定」と表示）
- **projectStore**: プロジェクト情報取得用のヘルパー関数（getProjectDisplayData等）実装済み
- **モックデータ**: タスクにprojectIdが設定済み、対応するプロジェクトデータも存在

### 2.2 改善が必要な箇所
1. **TaskDetailView**: タスク詳細画面でプロジェクト情報が表示されていない
2. **TaskHierarchy**: タスク階層表示でプロジェクト情報が表示されていない
3. **TaskForm/TaskCreateModal/TaskEditModal**: タスク作成・編集時のプロジェクト選択機能が未実装
4. **UI一貫性**: 「プロジェクト未設定」と「（プロジェクト無し）」の文言不統一

## 3. 設計方針

### 3.1 基本方針
- **型安全性**: TypeScriptの厳密な型定義を使用し、実行時エラーを防止
- **再利用性**: 既存のProjectBadgeコンポーネントを最大限活用
- **一貫性**: すべてのタスク表示箇所で統一されたプロジェクト表示
- **パフォーマンス**: React.memoとuseMemoを使用した最適化
- **アクセシビリティ**: 適切なARIA属性とキーボード操作対応

### 3.2 ベストプラクティス適用
- **Compound Components Pattern**: タスク表示コンポーネントの階層的な構成
- **Container-Presentational Pattern**: ビジネスロジックと表示ロジックの分離
- **Feature-based Organization**: 機能単位でのコード整理

## 4. 実装計画

## グループ1: プロジェクト表示文言の統一 [@Phase1]

### 対象ファイル
- `/src/components/project/ProjectBadge.tsx`

### 実装内容
1. emptyStateTextのデフォルト値を「（プロジェクト無し）」に統一
2. TaskCardの呼び出し箇所でemptyStateTextを削除（デフォルト値を使用）

### 変更詳細
```typescript
// ProjectBadge.tsx
export const ProjectBadge: React.FC<ProjectBadgeProps> = React.memo(({
  // ...
  emptyStateText = '（プロジェクト無し）', // 統一文言に変更
  // ...
}) => {
```

## グループ2: TaskDetailViewへのプロジェクト情報追加 [@Phase1]

### 対象ファイル
- `/src/components/task/TaskDetailView.tsx`

### 実装内容
1. ProjectBadgeコンポーネントのインポート追加
2. ステータス・優先度バッジエリアにプロジェクトバッジを追加
3. プロジェクトクリック時のコールバック追加

### 変更詳細
```typescript
// インポート追加
import { ProjectBadge } from '../project/ProjectBadge';

// Propsに追加
interface TaskDetailViewProps {
  // 既存のprops...
  onProjectClick?: (projectId: string) => void;
}

// バッジエリアに追加（214-220行目付近）
<div className="flex flex-wrap items-center gap-2 mt-3">
  <span className={`...${getStatusColor(task.status)}`}>
    {getStatusLabel(task.status)}
  </span>
  <span className={`...${getPriorityColor(task.priority)}`}>
    優先度: {getPriorityLabel(task.priority)}
  </span>
  {/* プロジェクトバッジ追加 */}
  <ProjectBadge
    projectId={task.projectId}
    size="sm"
    onClick={task.projectId ? () => onProjectClick?.(task.projectId!) : undefined}
    showEmptyState={true}
  />
</div>
```

## グループ3: TaskHierarchyへのプロジェクト情報追加

### 対象ファイル
- `/src/components/task/TaskHierarchy.tsx`

### 実装内容
1. ProjectBadgeコンポーネントのインポート追加
2. タスク行にプロジェクトバッジを表示
3. コンパクトモードでの表示調整

### 実装詳細
- 階層表示の各タスク行にProjectBadgeを追加
- インデントレベルに応じた表示位置の調整
- 折りたたみ時の表示制御

## グループ4: タスク作成・編集フォームのプロジェクト選択機能 [@Phase1]

### 対象ファイル
- `/src/components/task/TaskForm.tsx`
- `/src/components/task/TaskCreateModal.tsx`
- `/src/components/task/TaskEditModal.tsx`

### 実装内容
1. ProjectSelectorコンポーネントのインポートと使用
2. フォームのバリデーションルール追加
3. プロジェクト選択状態の管理

### 変更詳細
```typescript
// TaskForm.tsx
import { ProjectSelector } from '../project/ProjectSelector';

// フォームフィールドに追加
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    プロジェクト
  </label>
  <ProjectSelector
    value={formData.projectId}
    onChange={(projectId) => setFormData({...formData, projectId})}
    placeholder="プロジェクトを選択"
    allowClear={true}
  />
</div>
```

## グループ5: ProjectSelectorコンポーネントの検証と改善

### 対象ファイル
- `/src/components/project/ProjectSelector.tsx`

### 実装内容
1. コンポーネントの動作確認
2. 必要に応じて「プロジェクトなし」オプションの追加
3. アクセシビリティの改善

## グループ6: タスクリスト系コンポーネントの確認

### 対象ファイル
- `/src/pages/Dashboard.tsx`
- `/src/pages/Calendar.tsx`
- その他タスクを表示する画面

### 実装内容
1. すべてのタスクリスト表示箇所の調査
2. プロジェクト情報が表示されていない箇所の特定
3. 必要に応じてProjectBadgeの追加

## グループ7: モックデータの整合性確認

### 対象ファイル
- `/src/mock/tasks.ts`
- `/src/mock/projects.ts`

### 実装内容
1. プロジェクトIDのないタスクを意図的に追加（テスト用）
2. 存在しないプロジェクトIDを持つタスクの処理確認
3. エッジケースのテストデータ追加

## グループ8: 統合テストとエラーハンドリング

### 実装内容
1. プロジェクトが削除された場合のタスク表示確認
2. プロジェクトストアのエラーハンドリング強化
3. 非同期データ取得時のローディング状態処理

## グループ9: パフォーマンス最適化

### 実装内容
1. ProjectBadgeコンポーネントのメモ化確認
2. プロジェクト情報の頻繁な再取得を防ぐキャッシュ戦略
3. 大量タスク表示時のパフォーマンステスト

## グループ10: ドキュメントとコメントの整備

### 実装内容
1. 実装した機能のJSDocコメント追加
2. 使用例とベストプラクティスの文書化
3. 今後の拡張ポイントの明記

## 5. テスト計画

### 5.1 単体テスト
- ProjectBadgeの表示ロジックテスト
- プロジェクトなし状態の表示テスト
- プロジェクト選択コンポーネントの動作テスト

### 5.2 統合テスト
- タスク作成時のプロジェクト選択フロー
- プロジェクト変更時のタスク表示更新
- プロジェクト削除時のタスク表示確認

### 5.3 E2Eテスト
- ユーザーストーリーに基づく一連の操作確認
- 異なる画面間でのプロジェクト情報の一貫性確認

## 6. リスクと対策

### 6.1 パフォーマンスリスク
- **リスク**: 大量のタスクで各タスクがプロジェクト情報を取得する際のパフォーマンス低下
- **対策**: プロジェクト情報のメモ化とバッチ取得の実装

### 6.2 データ整合性リスク
- **リスク**: プロジェクト削除時にタスクが参照エラーになる
- **対策**: プロジェクトが見つからない場合の適切なフォールバック処理

### 6.3 UIの一貫性リスク
- **リスク**: 異なる画面でプロジェクト表示が異なる
- **対策**: 共通コンポーネント（ProjectBadge）の徹底使用

## 7. 今後の拡張性

- プロジェクトフィルタリング機能の追加
- プロジェクト別タスク一覧画面の実装
- プロジェクト進捗とタスクの連動表示
- プロジェクトカラーのタスクカードへの反映
- マルチプロジェクト対応（1タスクが複数プロジェクトに所属）

## 8. 実装優先順位

**Phase 1（即座に実装）**:
- グループ1: プロジェクト表示文言の統一
- グループ2: TaskDetailViewへのプロジェクト情報追加
- グループ4: タスク作成・編集フォームのプロジェクト選択機能

**Phase 2（Phase 1完了後）**:
- グループ3: TaskHierarchyへのプロジェクト情報追加
- グループ5: ProjectSelectorコンポーネントの検証と改善
- グループ6: タスクリスト系コンポーネントの確認

**Phase 3（Phase 2完了後）**:
- グループ7: モックデータの整合性確認
- グループ8: 統合テストとエラーハンドリング

**Phase 4（最終調整）**:
- グループ9: パフォーマンス最適化
- グループ10: ドキュメントとコメントの整備