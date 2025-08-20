# 推奨コマンド一覧

## Docker環境での開発 (必須)
```bash
# 開発サーバー起動
docker-compose up -d

# ログ確認
docker-compose logs -f app

# 開発サーバー停止
docker-compose down

# リビルド
docker-compose up --build

# コンテナ内でコマンド実行
docker-compose exec app npm run lint
docker-compose exec app npm run build
```

## アクセス
- 開発サーバー: http://localhost:5173
- Storybook (オプション): http://localhost:6006

## 重要な制約
- **npm run devは絶対禁止** - Docker環境のみを使用
- 全ての開発作業はDocker環境内で実行

## コード品質管理
```bash
# TypeScriptチェック
docker-compose exec app npm run build

# ESLintチェック
docker-compose exec app npm run lint

# プレビュー版の実行
docker-compose exec app npm run preview
```

## システムコマンド (macOS Darwin)
```bash
# ファイル検索
find . -name "*.tsx" -type f

# パターン検索
grep -r "pattern" src/

# ディレクトリ一覧
ls -la

# Git操作
git status
git add .
git commit -m "message"
```

## Tailwind CSS クラス確認
```bash
# 設定ファイル確認
cat tailwind.config.js

# CSSファイル確認
cat src/index.css
```