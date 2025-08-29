# Issues-022-設計: E2Eテストシナリオ完全実装設計書

## 🎯 設計概要

**目的**: E2Eテストシナリオ文書（`tests/E2E-テストシナリオ-ユーザー操作基本フロー.md`）をPlaywright実装に完全移行し、CI/CDで実行可能な回帰テストスイートを構築する。

**核心原則**: 
- **品質最優先**: テスト成功率100%（10回連続実行）
- **保守性重視**: Page Object Pattern・Feature Object Pattern適用  
- **パフォーマンス重視**: 単体5分・全体15分以内
- **最新技術活用**: Playwright 2025年ベストプラクティス準拠

## 🔍 現状分析

### 既存実装状況
✅ **完了済み基盤**：
- Vitestベーステスト環境（`tests/e2e/vitest.config.ts`）
- `TestDatabaseManager`, `TestTransactionManager`, `TestDataMatcher`実装済み
- Docker環境統合（パフォーマンス要件2秒以内対応）
- 詳細なE2Eシナリオ定義（6ステップフロー）

❌ **未実装要素**：
- Playwright依存関係未導入（package.jsonに未追加）
- playwright.config.ts設定ファイル未作成
- シナリオの実Playwrightテストコード未実装
- CI/CDパイプライン統合未完了

### 技術的課題
1. **VitestからPlaywright移行**: 既存基盤クラスの互換性保持
2. **DB統合**: トランザクション分離とテストデータ管理
3. **セレクター戦略**: data-testid属性の一貫性確保
4. **並列実行**: テスト分離とリソース競合回避

## 🚀 最新Playwrightベストプラクティス適用

### 2025年推奨パターン
1. **Resilient Selectors**: `page.getByRole()`, `page.getByTestId()`, `page.getByText()` 優先
2. **Auto-waiting**: 明示的waitの最小化、Playwright組み込み待機活用
3. **Test Isolation**: Browser context使用でテスト間状態分離
4. **Network Mocking**: API応答レコーディング・リプレイでエラーシミュレーション
5. **Trace Viewer**: デバッグ効率化のためのトレース記録
6. **Parallel Execution**: Worker並列実行による実行時間短縮

### パフォーマンス最適化戦略
- **Headless Mode**: CI環境での高速実行
- **API-based Setup**: UIベース初期化より高速なAPI経由データセットアップ
- **Component Testing**: 個別UIコンポーネント分離テスト
- **Smart Retries**: ネットワーク不安定性対応の自動リトライ

## 📋 実装グループ分割

## グループ1: Playwright基盤セットアップ [@Phase1]

**作業内容**:
- Playwright依存関係追加（`@playwright/test`最新版）
- `playwright.config.ts`設定作成（ブラウザ設定・並列実行・レポート）
- 既存TestDatabaseManagerとの統合設計
- Docker環境でのPlaywright実行確認

**成果物**:
- `package.json`更新（Playwright依存追加）
- `playwright.config.ts`（ブラウザ・並列・レポート設定）
- `tests/playwright/playwright-setup.ts`（既存DB基盤統合）

## グループ2: Page Objectパターン実装 [@Phase1] 

**作業内容**:
- `DashboardPage.ts`: プロジェクト・タグ・タスク操作
- `ProjectDetailPage.ts`: プロジェクト詳細・タスク管理
- `TaskDetailModal.ts`: タスク詳細表示・サブタスク操作
- `BasePage.ts`: 共通操作・エラーハンドリング

**成果物**:
- `tests/playwright/page-objects/`配下の全Page Objectクラス
- セレクター定義（`data-testid`戦略）
- 共通操作ヘルパー（waitForLoad, errorHandling等）

## グループ3: コアシナリオテスト実装 [@Phase1]

**作業内容**:
- 6ステップユーザーフローの完全実装
- DB検証・UI検証の両方対応
- パフォーマンス測定（画面遷移3秒・データ保存2秒）
- テストデータセットアップ・クリーンアップ

**成果物**:
- `tests/playwright/user-flow.test.ts`（メインテストファイル）
- `tests/playwright/fixtures/test-data.ts`（テストデータ定義）
- `tests/playwright/helpers/performance-helper.ts`

## グループ4: エラーハンドリング・Edge Caseテスト [@Phase2]

**作業内容**:
- ネットワークエラーシミュレーション
- バリデーションエラーテスト
- 重複データ作成エラーハンドリング
- ブラウザ種別テスト（Chromium・Firefox・WebKit）

**成果物**:
- `tests/playwright/error-scenarios.test.ts`
- ネットワークモック設定
- バリデーション境界値テスト

## グループ5: CI/CD統合・レポート機能 [@Phase2]

**作業内容**:
- GitHub Actions統合（`.github/workflows/playwright.yml`）
- HTMLレポート・JSON結果出力設定
- 失敗時スクリーンショット・動画記録
- 並列実行最適化（3-4 worker推奨）

**成果物**:
- `.github/workflows/playwright-e2e.yml`
- テスト結果アーティファクト設定
- 失敗時デバッグ情報収集

## グループ6: 品質保証・パフォーマンスチューニング [@Phase3]

**作業内容**:
- 10回連続実行での成功率100%確保
- 実行時間最適化（目標：単体5分・全体15分）
- メモリ・CPU使用量監視
- テストフレークネス分析・修正

**成果物**:
- 品質保証レポート
- パフォーマンス最適化設定
- フレークネス対策実装

## 🏗️ アーキテクチャ設計

### ファイル構成
```
tests/playwright/
├── playwright.config.ts                    # Playwright設定
├── global-setup.ts                         # グローバルセットアップ
├── global-teardown.ts                      # グローバル分解処理
├── user-flow.test.ts                       # メインE2Eテスト
├── error-scenarios.test.ts                 # エラーケーステスト
├── page-objects/
│   ├── BasePage.ts                         # 共通ベースクラス
│   ├── DashboardPage.ts                    # ダッシュボード操作
│   ├── ProjectDetailPage.ts                # プロジェクト詳細
│   ├── TaskDetailModal.ts                  # タスク詳細モーダル
│   └── index.ts                            # Page Object エクスポート
├── fixtures/
│   ├── test-data.ts                        # テストデータ定義
│   ├── selectors.ts                        # セレクター定義
│   └── auth.ts                             # 認証関連フィクスチャ
├── helpers/
│   ├── db-integration.ts                   # DB統合ヘルパー
│   ├── performance-monitor.ts              # パフォーマンス監視
│   ├── network-mock.ts                     # ネットワークモック
│   └── screenshot-helper.ts                # スクリーンショット支援
└── reports/                                # レポート出力先
```

### 技術スタック統合
```typescript
// 既存基盤との統合例
import { test, expect, Page } from '@playwright/test';
import { TestDatabaseManager } from '../e2e/TestDatabaseManager';
import { TestDataMatcher } from '../e2e/TestDataMatcher';

export class PlaywrightDBIntegration {
  constructor(
    private page: Page,
    private dbManager: TestDatabaseManager,
    private dataMatcher: TestDataMatcher
  ) {}

  async setupTestWithDB() {
    await this.dbManager.setupTestTransaction();
    // Page操作とDB操作の同期
  }
}
```

## 🔧 実装仕様詳細

### セレクター戦略
```typescript
// data-testid優先戦略
const SELECTORS = {
  dashboard: {
    newProjectButton: '[data-testid="new-project-button"]',
    projectCard: (title: string) => `[data-testid="project-card-${title}"]`,
    todayTasksFilter: '[data-testid="today-tasks-filter"]'
  },
  project: {
    tagManager: '[data-testid="tag-manager"]',
    taskList: '[data-testid="task-list"]',
    addTaskButton: '[data-testid="add-task-button"]'
  },
  task: {
    detailModal: '[data-testid="task-detail-modal"]',
    tagBadge: (tagName: string) => `[data-testid="tag-badge-${tagName}"]`,
    subtaskSection: '[data-testid="subtasks-section"]'
  }
};
```

### パフォーマンス監視実装
```typescript
// パフォーマンス要件検証
export class PerformanceAssertion {
  static async assertPageLoad(page: Page, maxMs: number = 3000) {
    const navigationStart = await page.evaluate(() => 
      performance.timeOrigin + performance.timing.navigationStart
    );
    const loadComplete = await page.evaluate(() => 
      performance.timeOrigin + performance.timing.loadEventEnd
    );
    
    const loadTime = loadComplete - navigationStart;
    expect(loadTime).toBeLessThan(maxMs);
    return loadTime;
  }

  static async assertAPIResponse(page: Page, maxMs: number = 2000) {
    // API応答時間測定実装
  }
}
```

## 🎯 品質保証要件

### テスト成功率保証
```typescript
// 10回連続実行成功確認
describe('品質保証: 安定性テスト', () => {
  test.describe.serial('10回連続実行', () => {
    Array.from({ length: 10 }, (_, i) => {
      test(`実行${i + 1}/10: ユーザー基本フロー`, async ({ page }) => {
        // テスト実装
      });
    });
  });
});
```

### パフォーマンス目標
- **画面遷移**: 3秒以内（`PerformanceAssertion.assertPageLoad(page, 3000)`）
- **データ保存**: 2秒以内（`PerformanceAssertion.assertAPIResponse(page, 2000)`）
- **テスト実行**: 単体5分・全体15分以内
- **並列実行**: 3-4 workerで最適化

## 🔄 CI/CD統合戦略

### GitHub Actions設定
```yaml
# .github/workflows/playwright-e2e.yml
name: Playwright E2E Tests
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
    
jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Docker Environment
        run: docker compose -f docker-compose.e2e.yml up -d
      - name: Install Playwright
        run: docker compose run --rm playwright npm ci && npx playwright install
      - name: Run E2E Tests
        run: docker compose run --rm playwright npm run test:playwright -- --project=${{ matrix.browser }}
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.browser }}
          path: test-results/
          retention-days: 7
```

## 🤖 協調エージェント・コンサルテーション

### Performance Architect連携
- **最適化方針**: 並列実行数・ヘッドレスモード・リソース使用量
- **監視指標**: CPU・メモリ・ネットワーク帯域・テスト実行時間
- **チューニング**: worker数最適化・テストデータサイズ調整

### Infrastructure Architect連携  
- **Docker統合**: Playwright実行環境・ブラウザインストール戦略
- **CI/CD最適化**: GitHub Actions runner・並列ジョブ設定
- **リソース管理**: テスト環境分離・DB接続プール管理

### Database Architect連携
- **トランザクション分離**: テスト間のデータ分離戦略
- **パフォーマンス**: DB操作の2秒以内応答確保
- **整合性**: テストデータクリーンアップ・ロールバック戦略

## 📊 成功指標・検証基準

### 機能要件達成度
- [ ] 6ステップフロー100%実装（Step1-6全対応）  
- [ ] DB検証・UI検証両方実装
- [ ] エラーハンドリング3パターン対応
- [ ] テストデータ自動セットアップ・クリーンアップ

### 非機能要件達成度  
- [ ] テスト成功率100%（10回連続実行）
- [ ] パフォーマンス要件達成（画面遷移3秒・データ保存2秒）
- [ ] 実行時間目標達成（単体5分・全体15分）
- [ ] CI/CD統合完了（GitHub Actions）

### 保守性・品質
- [ ] Page Object Pattern適用率100%
- [ ] data-testid戦略適用率100%  
- [ ] ESLint・Prettier準拠率100%
- [ ] テストカバレッジ適切な設定

## 🎌 実装優先順位・実行計画

### Phase 1 (最優先): 基盤構築
1. **グループ1**: Playwright基盤セットアップ
2. **グループ2**: Page Objectパターン実装  
3. **グループ3**: コアシナリオテスト実装

### Phase 2 (高優先): 品質強化
4. **グループ4**: エラーハンドリング・Edge Caseテスト
5. **グループ5**: CI/CD統合・レポート機能

### Phase 3 (完成度向上): 最適化
6. **グループ6**: 品質保証・パフォーマンスチューニング

---

**実装開始準備**: この設計書を基に、グループ1から順次実装を開始し、各グループ完了後に品質検証を実施して次グループに進む。Playwright 2025年ベストプラクティスを遵守し、10回連続実行成功率100%の高品質E2Eテストスイートを構築する。