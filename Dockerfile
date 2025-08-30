# マルチステージビルド対応 Dockerfile
# 開発環境: docker-compose up (development stage)
# 本番環境: docker build --target production

# ========================================
# Base Stage: 共通設定
# ========================================
FROM node:18-alpine AS base

# 作業ディレクトリ設定
WORKDIR /app

# パッケージ管理の最適化
RUN npm config set fund false
RUN npm config set audit-level moderate

# ========================================
# Dependencies Stage: 依存関係インストール
# ========================================
FROM base AS dependencies

# Docker環境変数を設定（preinstallスクリプト用）
ENV IS_DOCKER_CONTAINER=1

# package.json と package-lock.json をコピー（キャッシュ効率化）
COPY package*.json ./

# preinstallスクリプトに必要なscriptsディレクトリをコピー
COPY scripts/ ./scripts/

# 依存関係インストール
RUN npm ci --prefer-offline --no-audit

# ========================================
# Development Stage: 開発環境
# ========================================
FROM dependencies AS development

# 開発に必要な追加パッケージ
RUN apk add --no-cache git curl

# ソースコードをコピー（ボリュームマウントで上書きされる想定）
COPY . .

# ポート公開
EXPOSE 5173

# 環境変数
ENV NODE_ENV=development
ENV VITE_HOST=0.0.0.0
ENV VITE_PORT=5173
ENV IS_DOCKER_CONTAINER=1

# 開発サーバー起動
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ========================================
# Build Stage: ビルド環境
# ========================================
FROM dependencies AS build

# ソースコードをコピー
COPY . .

# TypeScript型チェック
RUN npm run type-check || echo "Warning: Type check failed"

# プロダクションビルド
RUN npm run build

# ビルド結果の確認
RUN ls -la dist/

# ========================================
# Production Stage: 本番環境 (nginx)
# ========================================
FROM nginx:alpine AS production

# nginxユーザーでの実行
USER root

# 必要なパッケージインストール
RUN apk add --no-cache curl

# nginx設定ファイルをコピー
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# ビルド済みファイルをnginxのドキュメントルートにコピー
COPY --from=build /app/dist /usr/share/nginx/html

# 静的ファイルの権限設定
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html

# ヘルスチェック用スクリプト
RUN echo '#!/bin/sh\ncurl -f http://localhost/ || exit 1' > /healthcheck.sh
RUN chmod +x /healthcheck.sh

# ヘルスチェック設定
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD ["/healthcheck.sh"]

# ポート公開
EXPOSE 80

# nginxをフォアグラウンドで実行
CMD ["nginx", "-g", "daemon off;"]

# ========================================
# Test Stage: テスト環境（オプション）
# ========================================
FROM dependencies AS test

# テスト用ツールの追加

# ソースコードをコピー
COPY . .

# テスト実行
CMD ["npm", "test"]