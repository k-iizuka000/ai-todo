# ベースイメージ: Node.js 20 LTS
FROM node:20-alpine AS base

# 必要なパッケージのインストール（curl は healthcheck で使用）
RUN apk add --no-cache \
  curl \
  dumb-init

# 作業ディレクトリの設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 開発環境用の設定
FROM base AS development

# 開発用依存関係のインストール
RUN npm ci --include=dev

# ソースコードをコピー
COPY . .

# TypeScript のコンパイル
RUN npm run build

# ポート3010を公開
EXPOSE 3010

# dumb-init を使用してプロセス管理
ENTRYPOINT ["dumb-init", "--"]

# 開発モードで起動
CMD ["npm", "run", "dev"]

# 本番環境用の設定
FROM base AS production

# 本番用依存関係のみインストール
RUN npm ci --only=production && npm cache clean --force

# ソースコードをコピーしてビルド
COPY . .
RUN npm run build

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S api -u 1001

# 権限の設定
RUN chown -R api:nodejs /app
USER api

# ポート3010を公開
EXPOSE 3010

# Health check endpoint のためのcurl確認
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3010/health || exit 1

# dumb-init を使用してプロセス管理
ENTRYPOINT ["dumb-init", "--"]

# 本番モードで起動
CMD ["node", "dist/server.js"]