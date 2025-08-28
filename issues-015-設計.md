# Issue 015: Archived Tasks Toggle Functionality 設計書

## 現状分析

### 影響対象画面
- **Dashboard画面** (`pages/Dashboard.tsx`): タスク管理画面
- **Calendar画面** (`pages/Calendar.tsx`): カレンダー画面  
- **Analytics画面** (`pages/Analytics.tsx`): 分析画面

### 既存アーカイブ機能
- **TaskStatus型**: `'archived'` ステータスが定義済み
- **フィルタリング**: `taskStore.getFilteredTasks()` でステータスフィルタが実装済み
- **状態管理**: Zustand + persist middleware でローカルストレージ連携済み

## ベストプラクティス適用

### React/TypeScript 2024年のベストプラクティス
1. **コンポジション設計**: Accordion/AccordionItem/AccordionTrigger/AccordionContent
2. **カスタムフック**: useLocalStorageでローカルストレージ管理
3. **パフォーマンス最適化**: React.memo, CSS transitions, lazy rendering
4. **アクセシビリティ**: ARIA属性、キーボード操作、セマンティックHTML

### 状態管理パターン
- **永続化**: useLocalStorage カスタムフック
- **レスポンシブ**: 200ms以内の応答性を保証
- **型安全**: TypeScript strict mode対応

## アーキテクチャ設計

### コンポーネント構成
```
components/
├── ui/
│   ├── Accordion.tsx          # 汎用アコーディオンコンポーネント
│   └── ArchivedTasksSection.tsx # アーカイブタスク専用セクション
├── hooks/
│   └── useLocalStorage.ts     # ローカルストレージフック
└── task/
    └── TaskList.tsx           # タスクリスト表示コンポーネント
```

### 状態設計
```typescript
// ローカルストレージ保存状態
interface ArchivedToggleState {
  dashboard: boolean;
  calendar: boolean; 
  analytics: boolean;
}

// アコーディオン状態
interface AccordionState {
  [key: string]: boolean; // セクションID -> 開閉状態
}
```

## 実装詳細

### グループ1: 共通コンポーネント開発 [@Phase1]
**成果物**: 
- `components/ui/Accordion.tsx`: 汎用アコーディオン
- `components/ui/ArchivedTasksSection.tsx`: アーカイブ専用セクション
- `hooks/useLocalStorage.ts`: ローカルストレージフック

**技術仕様**:
- コンポジション設計でAccordion/AccordionItem/AccordionTrigger/AccordionContent
- ARIA属性対応（aria-expanded, aria-controls, role="region"）
- CSS transition（max-height, opacity）
- React.memoによる再レンダリング最適化

### グループ2: 状態管理とストレージ [@Phase1]
**成果物**:
- アーカイブ表示状態の永続化
- taskStoreへのフィルター追加

**技術仕様**:
- `useLocalStorage<ArchivedToggleState>('archivedTasksVisible')`
- XSS対策（JSON.parseの安全化）
- エラーハンドリング（localStorage無効時の処理）

### グループ3: Dashboard画面統合 [@Phase1] 
**成果物**:
- Dashboard.tsx へのアーカイブセクション追加

**実装箇所**:
- displayTasksのフィルタリングロジック拡張
- ArchivedTasksSectionコンポーネント配置
- 既存フィルター機能との協調

### グループ4: Calendar画面統合 [@Phase1]
**成果物**:
- Calendar.tsx へのアーカイブセクション追加

**実装箇所**:
- filteredEventsのロジック拡張
- カレンダー表示でのアーカイブタスク分離表示

### グループ5: Analytics画面統合 [@Phase1]
**成果物**:
- Analytics.tsx へのアーカイブセクション追加

**実装箇所**:
- 分析データからアーカイブタスクの分離
- 統計処理でのアーカイブ除外オプション

### グループ6: パフォーマンス最適化とA11y [@Phase1]
**成果物**:
- 200ms以内の応答性保証
- WCAG 2.1 AA準拠

**技術仕様**:
- useMemo/useCallbackによる最適化
- lazy renderingでアーカイブタスクの遅延読み込み
- キーボードナビゲーション（Tab, Enter, Space）
- スクリーンリーダー対応

### グループ7: テストとバリデーション [@Phase1]
**成果物**:
- ユニットテスト（70%以上カバレッジ）
- アクセシビリティテスト

**技術仕様**:
- Jest + React Testing Library
- アクセシビリティテスト（jest-axe）
- パフォーマンステスト（応答時間200ms以内）

## 技術仕様詳細

### Accordionコンポーネント仕様
```typescript
interface AccordionProps {
  type?: 'single' | 'multiple'; // 単一展開 or 複数展開
  collapsible?: boolean;         // 全閉じ可能か
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  className?: string;
  children: ReactNode;
}

interface AccordionItemProps {
  value: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}
```

### ArchivedTasksSectionコンポーネント仕様
```typescript
interface ArchivedTasksSectionProps {
  tasks: Task[];                           // アーカイブタスクの配列
  storageKey: string;                     // ローカルストレージキー
  onTaskClick?: (task: Task) => void;     // タスククリック処理
  renderTask?: (task: Task) => ReactNode; // カスタムタスク表示
  className?: string;
}
```

### useLocalStorage フック仕様
```typescript
function useLocalStorage<T>(
  key: string, 
  initialValue: T,
  options?: {
    serialize?: (value: T) => string;
    deserialize?: (value: string) => T;
  }
): [T, (value: T | ((prev: T) => T)) => void];
```

## セキュリティ考慮事項

### XSS対策
- localStorage値のサニタイゼーション
- JSON.parseの安全な実装
- ユーザー入力の適切なエスケープ

### データ保護
- センシティブデータの除外
- ローカルストレージ容量制限の考慮

## パフォーマンス要件

### 応答性
- アコーディオン開閉: 200ms以内
- タスクフィルタリング: 100ms以内
- 初期表示: 1秒以内

### メモリ効率
- Virtual scrolling（1000件以上のタスク時）
- lazy loading（画面外コンテンツ）
- React.memoによる不要な再レンダリング防止

## アクセシビリティ要件

### WCAG 2.1 AA準拠
- キーボード操作: Tab, Enter, Space
- スクリーンリーダー: 適切なARIA属性
- 色覚多様性: 色だけに依存しない設計
- フォーカス管理: 視覚的フォーカスインジケータ

### 推奨ARIA属性
```html
<button aria-expanded="true" aria-controls="archived-content" id="archived-trigger">
<div role="region" aria-labelledby="archived-trigger" id="archived-content">
```

## 実装チェックリスト

### Phase 1 完了条件
- [ ] Accordion汎用コンポーネント実装済み
- [ ] ArchivedTasksSectionコンポーネント実装済み
- [ ] useLocalStorageフック実装済み
- [ ] Dashboard画面統合完了
- [ ] Calendar画面統合完了
- [ ] Analytics画面統合完了
- [ ] WCAG 2.1 AA準拠確認
- [ ] パフォーマンステスト（200ms以内）通過
- [ ] ユニットテスト70%以上カバレッジ
- [ ] XSS対策実装確認

## リスク管理

### 技術リスク
- **低**: 既存コンポーネントとの競合 → 名前空間分離で解決
- **低**: ローカルストレージ容量不足 → 容量監視とクリーンアップ実装

### 品質リスク
- **中**: アクセシビリティ不備 → 専門ツールでの検証とレビュー
- **中**: パフォーマンス劣化 → 継続的な性能測定とプロファイリング

## 成功指標

### 機能指標
- 全3画面でアーカイブタスク切り替え機能動作: 100%
- ローカルストレージ永続化: 100%
- 200ms以内応答性: 100%

### 品質指標  
- テストカバレッジ: 70%以上
- アクセシビリティスコア: AA準拠
- エラー率: 0%（本番環境）

---
**設計責任者**: Frontend Architecture Agent  
**更新日時**: 2025-08-28  
**バージョン**: v1.0