# タスク完了時チェックリスト

## 必須セキュリティチェック
- [ ] フルパス（個人情報）の削除確認
- [ ] APIキー・トークンの漏洩確認
- [ ] パスワードのハードコーディング確認
- [ ] 機密ファイルの取り扱い確認
- [ ] 環境変数の適切な使用確認

## コード品質チェック
- [ ] TypeScriptエラーなし
  ```bash
  docker-compose exec app npm run build
  ```
- [ ] ESLintエラーなし
  ```bash
  docker-compose exec app npm run lint
  ```
- [ ] 未使用のimport/変数なし
- [ ] Console.logの削除

## 動作確認
- [ ] Docker環境での起動確認
  ```bash
  docker-compose up -d
  curl http://localhost:5173
  ```
- [ ] レスポンシブデザインの確認
- [ ] モバイル表示の確認
- [ ] 主要機能の動作テスト

## ドキュメンテーション
- [ ] 新機能の説明追加（必要に応じて）
- [ ] 破壊的変更の記録
- [ ] learning/学習記録.mdへの技術的知見追記

## Git操作
- [ ] 適切なコミットメッセージ
- [ ] 不要なファイルのstaging除外
- [ ] .gitignoreの更新（必要に応じて）

## 最終確認
- [ ] 指定タスクの完全実装
- [ ] 既存機能への影響なし
- [ ] パフォーマンス劣化なし