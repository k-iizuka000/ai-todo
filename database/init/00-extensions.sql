-- AI TODO Application Database Extensions
-- 設計書グループ2: スキーマ設計（改良版）
-- Version: 2.0 (改良版)
-- Date: 2025-08-28

-- ==================================================
-- PostgreSQL Extensions for Advanced Features
-- ==================================================

-- UUID生成機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 暗号化機能（パスワードハッシュ、機密データ暗号化）
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 全文検索機能（trigram検索、類似性検索）
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 複合インデックス最適化（GIN index for multiple columns）
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- クエリパフォーマンス統計収集
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- インデックス使用統計
CREATE EXTENSION IF NOT EXISTS "pg_buffercache";

-- ==================================================
-- Extension Configuration
-- ==================================================

-- pg_stat_statementsの設定（クエリ監視用）
-- postgresql.confで設定済みと仮定：
-- shared_preload_libraries = 'pg_stat_statements'
-- pg_stat_statements.max = 10000
-- pg_stat_statements.track = all

-- Extension確認用ビュー
COMMENT ON EXTENSION "uuid-ossp" IS '改良版スキーマ: UUID生成機能';
COMMENT ON EXTENSION "pgcrypto" IS '改良版スキーマ: 暗号化機能';
COMMENT ON EXTENSION "pg_trgm" IS '改良版スキーマ: 全文検索（trigram）';
COMMENT ON EXTENSION "btree_gin" IS '改良版スキーマ: 複合インデックス最適化';
COMMENT ON EXTENSION "pg_stat_statements" IS '改良版スキーマ: パフォーマンス統計';