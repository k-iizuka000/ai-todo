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

# 依存関係のインストール（package-lock.json問題回避）
RUN npm install

# ソースコードをコピー
COPY . .

# TypeScript のコンパイル（開発環境ではスキップ - tsxで直接実行）
# RUN npm run build

# ポート3003を公開（統一API）
EXPOSE 3003

# dumb-init を使用してプロセス管理
ENTRYPOINT ["dumb-init", "--"]

# シンプル起動（Node.jsで直接実行）
CMD ["npx", "tsx", "src/server.ts"]

# 本番環境用の設定
FROM base AS production

# 開発依存関係も含めてインストール（ビルドに必要）
RUN npm install && npm cache clean --force

# ソースコードをコピー（必要なファイルのみ）
COPY src/server.ts src/
COPY tsconfig.json ./
RUN npm run build

# 本番用依存関係のみに整理
RUN npm prune --production

# 非rootユーザーの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S api -u 1001

# 権限の設定
RUN chown -R api:nodejs /app
USER api

# ポート3003を公開（統一API）
EXPOSE 3003

# Health check endpoint のためのcurl確認
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# dumb-init を使用してプロセス管理
ENTRYPOINT ["dumb-init", "--"]

# 本番モードで起動
CMD ["node", "dist/server.js"]