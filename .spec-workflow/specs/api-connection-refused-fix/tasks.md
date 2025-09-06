# Tasks Document: API接続拒否エラー修正

## Phase 1: Docker & Infrastructure Configuration

- [x] 1.1 Docker Composeサービス設定の統一
  - File: docker-compose.yml
  - 既存の複数APIサーバー設定を統一APIゲートウェイ（ポート3003）に変更
  - api-layer サービスのポートを3010→3003に変更し、server/サービスを内部サービスに変更
  - 必要なヘルスチェック設定を追加
  - Purpose: フロントエンドが期待するポート3003でAPIを提供
  - _Leverage: 既存のDocker Compose設定、network、volumes_
  - _Requirements: FR-001_

- [x] 1.2 環境変数設定の整理
  - File: .env
  - VITE_API_URL を http://localhost:3003 に統一
  - Docker内部通信用の環境変数を設定
  - ポート設定の整合性確認
  - Purpose: フロントエンドとバックエンドのポート設定統一
  - _Leverage: 既存の.envファイル構造_
  - _Requirements: FR-001_

- [x] 1.3 APIゲートウェイサービスの作成
  - File: api-gateway/server.js
  - Express基盤のシンプルなプロキシサーバーを作成
  - 内部APIサーバー（server/, api-layer/）へのリクエストルーティング
  - ヘルスチェックエンドポイント（/health）の実装
  - Purpose: 単一エンドポイントでの統一API提供
  - _Leverage: Express、既存のCORS・middleware設定_
  - _Requirements: FR-001_

## Phase 2: フロントエンドAPI強化

- [x] 2.1 リトライ機構付きAPIクライアントの拡張
  - File: src/stores/api/taskApi.ts (既存を拡張)
  - SimpleApiClient クラスにリトライ機能を追加
  - 指数バックオフ（1秒→2秒→4秒）のリトライ間隔実装
  - 最大3回までのリトライ機構
  - Purpose: 一時的な接続障害への耐性向上
  - _Leverage: 既存のSimpleApiClient基盤_
  - _Requirements: FR-002_

- [x] 2.2 接続状態管理の実装
  - File: src/stores/connectionStore.ts
  - MobX store pattern で接続状態を管理
  - 接続状態: 'connected' | 'reconnecting' | 'offline' 
  - 接続状態変化のイベント通知機構
  - Purpose: ユーザーへの接続状態フィードバック
  - _Leverage: 既存のMobX store pattern_
  - _Requirements: FR-003_

- [x] 2.3 ヘルスチェック機能の実装
  - File: src/stores/api/taskApi.ts (既存ファイルに追加)
  - /health エンドポイントへの定期チェック機能
  - API応答時間の監視
  - 接続失敗時の状態更新
  - Purpose: API接続状態の能動的監視
  - _Leverage: 既存のAPI基盤、fetch実装_
  - _Requirements: FR-001_

## Phase 3: エラーハンドリング & UX改善

- [x] 3.1 エラー表示コンポーネントの強化
  - File: src/components/common/ErrorBoundary.tsx (既存を拡張)
  - API接続エラー専用のエラーメッセージ
  - リトライボタンの追加
  - 接続状態の視覚的表示
  - Purpose: ユーザーフレンドリーなエラー体験
  - _Leverage: 既存のReact Error Boundary_
  - _Requirements: FR-003_

- [x] 3.2 TaskStore のエラーハンドリング改善
  - File: src/stores/taskStore.ts (既存を拡張)
  - API失敗時のグレースフルハンドリング
  - モックモードの改善とユーザー通知
  - 接続復旧時の自動同期機能
  - Purpose: データ整合性とユーザー体験の向上
  - _Leverage: 既存のtaskStore MobX実装_
  - _Requirements: FR-003_

- [x] 3.3 接続状態表示UIの追加
  - File: src/components/common/ConnectionStatus.tsx
  - ヘッダーエリアに接続状態インジケーター
  - 「オフライン」「再接続中」状態の表示
  - 接続復旧時の通知バナー
  - Purpose: 接続状態の常時可視化
  - _Leverage: 既存のReactコンポーネントパターン_
  - _Requirements: FR-003_

## Phase 4: テスト & 検証

- [ ] 4.1 APIゲートウェイテストの作成
  - File: api-gateway/tests/server.test.js
  - ヘルスチェックエンドポイントのテスト
  - プロキシ機能のテスト
  - エラーハンドリングのテスト
  - Purpose: APIゲートウェイの動作保証
  - _Leverage: 既存のテストフレームワーク（Jest）_
  - _Requirements: FR-001, FR-004_

- [ ] 4.2 リトライ機構のユニットテスト
  - File: src/stores/api/__tests__/taskApi.test.ts
  - リトライ回数・間隔の検証
  - 失敗パターンのテスト
  - 接続復旧時の動作テスト
  - Purpose: リトライ機能の信頼性確保
  - _Leverage: 既存のJest/Vitestテスト環境_
  - _Requirements: FR-002_

- [ ] 4.3 接続状態管理のテスト
  - File: src/stores/__tests__/connectionStore.test.ts
  - 状態遷移のテスト
  - イベント通知のテスト
  - タイムアウト処理のテスト
  - Purpose: 接続状態管理の正確性確保
  - _Leverage: 既存のMobXテストパターン_
  - _Requirements: FR-003_

- [ ] 4.4 E2Eテスト: タスク作成フロー
  - File: tests/e2e/task-creation.test.js
  - 正常なタスク作成フローのテスト
  - API障害時の動作テスト
  - 接続復旧時の同期テスト
  - Purpose: エンドツーエンドでの動作確認
  - _Leverage: 既存のPlaywright MCP tools_
  - _Requirements: US-001, US-002_

- [ ] 4.5 Docker環境での統合テスト
  - File: tests/integration/docker-integration.test.js
  - Docker Compose環境でのフルスタックテスト
  - コンテナ間通信のテスト
  - ヘルスチェック機能のテスト
  - Purpose: 本番相当環境での動作確認
  - _Leverage: Docker Compose設定、既存のテスト環境_
  - _Requirements: All_

## Phase 5: ドキュメント & 運用対応

- [ ] 5.1 トラブルシューティングガイドの作成
  - File: docs/troubleshooting/api-connection.md
  - よくある接続エラーと対処法
  - ポート設定確認手順
  - ログの確認方法
  - Purpose: 開発者・運用者向けサポート
  - _Leverage: 既存のドキュメント構造_
  - _Requirements: US-002_

- [ ] 5.2 設定ファイルのバリデーション
  - File: scripts/validate-config.js
  - 環境変数の整合性チェックスクリプト
  - Docker設定の検証
  - 起動前の設定確認
  - Purpose: 設定ミスの事前検出
  - _Leverage: 既存のスクリプト基盤_
  - _Requirements: FR-001_