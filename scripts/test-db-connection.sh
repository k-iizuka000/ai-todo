#!/bin/bash
# ====================================================
# データベース接続テストスクリプト
# ====================================================
# Docker環境でのPostgreSQLへの接続を確認します

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# デフォルト値
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5433}
DB_NAME=${DB_NAME:-ai_todo_dev}
DB_USER=${DB_USER:-ai_todo_user}
DB_PASSWORD=${DB_PASSWORD:-dev_password_2024}

echo "======================================================"
echo "データベース接続テスト"
echo "======================================================"
echo ""

# 環境変数ファイルの読み込み（存在する場合）
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local を読み込みました${NC}"
    export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f ".env.database" ]; then
    echo -e "${GREEN}✅ .env.database を読み込みました${NC}"
    export $(cat .env.database | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}⚠️  環境変数ファイルが見つかりません。デフォルト値を使用します${NC}"
fi

echo ""
echo "接続設定:"
echo -e "${BLUE}  ホスト: ${DB_HOST}${NC}"
echo -e "${BLUE}  ポート: ${DB_PORT}${NC}"
echo -e "${BLUE}  データベース: ${DB_NAME}${NC}"
echo -e "${BLUE}  ユーザー: ${DB_USER}${NC}"
echo ""

# Docker Composeのステータス確認
echo "Docker Compose サービスの状態を確認中..."
docker-compose ps database 2>/dev/null || {
    echo -e "${RED}❌ Docker Composeサービスが起動していません${NC}"
    echo "   docker-compose up -d を実行してください"
    exit 1
}

# 接続テスト（ホストから）
echo ""
echo "ホストマシンからの接続テスト..."
if command -v psql &> /dev/null; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version();" 2>/dev/null && {
        echo -e "${GREEN}✅ ホストからの接続成功${NC}"
    } || {
        echo -e "${YELLOW}⚠️  ホストからの直接接続に失敗しました${NC}"
    }
else
    echo -e "${YELLOW}⚠️  psqlコマンドが見つかりません${NC}"
fi

# 接続テスト（Dockerコンテナ経由）
echo ""
echo "Dockerコンテナ経由での接続テスト..."
docker exec ai-todo-db psql -U $DB_USER -d $DB_NAME -c "SELECT version();" && {
    echo -e "${GREEN}✅ Dockerコンテナ経由の接続成功${NC}"
} || {
    echo -e "${RED}❌ Dockerコンテナ経由の接続に失敗しました${NC}"
    exit 1
}

# テーブル一覧の確認
echo ""
echo "データベース内のテーブルを確認..."
TABLE_COUNT=$(docker exec ai-todo-db psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt "0" ]; then
    echo -e "${GREEN}✅ $TABLE_COUNT 個のテーブルが見つかりました${NC}"
    echo ""
    echo "テーブル一覧:"
    docker exec ai-todo-db psql -U $DB_USER -d $DB_NAME -c "\dt public.*"
else
    echo -e "${YELLOW}⚠️  テーブルが見つかりません${NC}"
    echo "   データベースの初期化が必要かもしれません"
fi

# 接続プールの状態確認
echo ""
echo "接続プールの状態..."
docker exec ai-todo-db psql -U $DB_USER -d $DB_NAME -c "SELECT count(*) as connections, state FROM pg_stat_activity WHERE datname = '$DB_NAME' GROUP BY state;"

# パフォーマンス設定の確認
echo ""
echo "パフォーマンス設定の確認..."
docker exec ai-todo-db psql -U $DB_USER -d $DB_NAME -c "SHOW shared_buffers;" -t | xargs echo "  shared_buffers:"
docker exec ai-todo-db psql -U $DB_USER -d $DB_NAME -c "SHOW effective_cache_size;" -t | xargs echo "  effective_cache_size:"
docker exec ai-todo-db psql -U $DB_USER -d $DB_NAME -c "SHOW max_connections;" -t | xargs echo "  max_connections:"

echo ""
echo "======================================================"
echo -e "${GREEN}テスト完了！${NC}"
echo "======================================================"
echo ""
echo "アプリケーションからの接続情報:"
echo "  ホストから: DATABASE_URL=\"postgresql://$DB_USER:****@$DB_HOST:$DB_PORT/$DB_NAME\""
echo "  コンテナから: DATABASE_URL=\"postgresql://$DB_USER:****@database:5432/$DB_NAME\""