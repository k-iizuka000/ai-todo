# AI Todo Application

モダンなTodoアプリケーション（React + TypeScript + Prisma + PostgreSQL）

## 🚀 E2Eテスト環境（Playwright統合基盤）

### 基本的な使用方法

```bash
# Playwright E2Eテストの実行（Docker環境）
npm run docker:test:playwright

# UIモードでのデバッグ実行
npm run docker:test:playwright:ui  

# CI用ヘッドレス実行（HTML レポート生成）
npm run docker:test:playwright:ci
```

### 環境構築

```bash
# 初回セットアップ（依存関係インストール）
docker compose -f docker-compose.e2e.yml build

# テスト環境の起動確認
docker compose -f docker-compose.e2e.yml up test-database test-app

# スモークテストの実行
docker compose -f docker-compose.e2e.yml run --rm playwright npm run test:playwright -- basic-smoke.test.ts
```

### 設計書準拠の品質基準

- **パフォーマンス**: 画面遷移3秒以内、データ保存2秒以内
- **テストカバレッジ**: 80%以上
- **実行成功率**: 100%（Docker環境での安定実行）
- **Feature Object パターン**: モダンE2Eテスト設計採用

## 開発環境
