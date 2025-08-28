#!/bin/bash
# ====================================================
# 環境変数セットアップスクリプト
# ====================================================
# 安全な環境変数設定を支援するスクリプト

set -e  # エラーが発生したら停止

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ヘッダー表示
echo "======================================================"
echo "AI TODO - 環境変数セットアップ"
echo "======================================================"
echo ""

# .env.localの存在確認
if [ -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local が既に存在します${NC}"
    read -p "上書きしますか？ (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "セットアップを中止しました"
        exit 0
    fi
fi

# .env.local.exampleからコピー
if [ ! -f ".env.local.example" ]; then
    echo -e "${RED}❌ .env.local.example が見つかりません${NC}"
    exit 1
fi

cp .env.local.example .env.local
echo -e "${GREEN}✅ .env.local を作成しました${NC}"

# パスワード生成オプション
echo ""
echo "データベースパスワードを生成しますか？"
echo "（現在の開発用パスワードを強力なものに置き換えます）"
read -p "生成する場合は y を入力: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 強力なパスワードを生成（32文字）
    NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # .env.localのパスワードを更新
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/dev_password_2024/${NEW_PASSWORD}/g" .env.local
    else
        # Linux
        sed -i "s/dev_password_2024/${NEW_PASSWORD}/g" .env.local
    fi
    
    echo -e "${GREEN}✅ 新しいパスワードを生成しました${NC}"
    echo -e "${YELLOW}⚠️  docker-compose.ymlのDB_PASSWORDも更新してください${NC}"
    echo ""
    echo "生成されたパスワード: ${NEW_PASSWORD}"
    echo ""
    echo -e "${RED}重要: このパスワードを安全に保管してください${NC}"
fi

# JWTシークレット生成オプション
echo ""
echo "JWT用のシークレットキーを生成しますか？"
read -p "生成する場合は y を入力: " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 強力なシークレットキーを生成（64文字）
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
    
    # .env.localのJWT_SECRETを有効化して更新
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/# JWT_SECRET=\"your-secret-key-here\"/JWT_SECRET=\"${JWT_SECRET}\"/g" .env.local
    else
        # Linux
        sed -i "s/# JWT_SECRET=\"your-secret-key-here\"/JWT_SECRET=\"${JWT_SECRET}\"/g" .env.local
    fi
    
    echo -e "${GREEN}✅ JWTシークレットを生成しました${NC}"
fi

# 環境確認
echo ""
echo "======================================================"
echo "環境設定の確認"
echo "======================================================"
echo ""

# Docker環境の確認
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✅ Docker がインストールされています${NC}"
else
    echo -e "${YELLOW}⚠️  Docker がインストールされていません${NC}"
fi

if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✅ Docker Compose がインストールされています${NC}"
else
    echo -e "${YELLOW}⚠️  Docker Compose がインストールされていません${NC}"
fi

# PostgreSQLポートの確認
if lsof -Pi :5432 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  ポート 5432 が使用中です（ローカルPostgreSQL？）${NC}"
    echo "   Docker Composeはポート 5433 を使用します"
fi

if lsof -Pi :5433 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}❌ ポート 5433 が既に使用中です${NC}"
    echo "   docker-compose.ymlのポート設定を変更してください"
fi

# gitignoreの確認
if grep -q "^\.env\.local$" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ .env.local は .gitignore に含まれています${NC}"
else
    echo -e "${RED}❌ .env.local が .gitignore に含まれていません${NC}"
    echo ".env.local" >> .gitignore
    echo -e "${GREEN}✅ .gitignore に追加しました${NC}"
fi

echo ""
echo "======================================================"
echo "セットアップ完了！"
echo "======================================================"
echo ""
echo "次のステップ:"
echo "1. .env.local を確認して必要に応じて編集"
echo "2. docker-compose up -d でサービスを起動"
echo "3. アプリケーションを開発開始"
echo ""
echo -e "${YELLOW}注意: 本番環境では必ず環境変数を安全に管理してください${NC}"