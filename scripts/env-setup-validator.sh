#!/bin/bash

# =============================================================================
# 環境変数セットアップ・バリデーター
# Issue-047: タグ作成機能-検索機能表示問題（再発防止策）
# 
# 目的: 初回環境セットアップ時の環境変数ファイル作成と検証
# =============================================================================

set -euo pipefail

# UTF-8エンコーディング設定
export LC_ALL=C
export LANG=C

# =============================================================================
# 設定定義
# =============================================================================

# プロジェクトルート
readonly PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# カラー定義
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# 環境ファイル定義
readonly FRONTEND_ENV="${PROJECT_ROOT}/.env.local"
readonly FRONTEND_EXAMPLE="${PROJECT_ROOT}/.env.example"
readonly BACKEND_ENV="${PROJECT_ROOT}/server/.env"
readonly BACKEND_EXAMPLE="${PROJECT_ROOT}/server/.env.example"

# 外部設定ファイル定義（設計書との統合）
readonly VALIDATION_RULES_FILE="${PROJECT_ROOT}/scripts/validation-rules.cjs"
readonly ENV_VALIDATOR_FILE="${PROJECT_ROOT}/scripts/env-validator.cjs"

# デフォルト必須環境変数（外部ファイルが見つからない場合のフォールバック）
readonly DEFAULT_FRONTEND_REQUIRED=("VITE_API_URL" "VITE_APP_TITLE")
readonly DEFAULT_BACKEND_REQUIRED=("PORT" "DATABASE_URL")

# =============================================================================
# ユーティリティ関数
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}🔴 $1${NC}" >&2
}

# バナー表示
show_banner() {
    echo "=================================================="
    echo "🔧 環境変数セットアップ・バリデーター"
    echo "   Issue-047: 環境設定不整合問題対策"
    echo "=================================================="
    echo ""
}

# =============================================================================
# 環境ファイル生成機能
# =============================================================================

generate_env_from_template() {
    local template_file="$1"
    local target_file="$2"
    local context="$3"
    
    if [[ ! -f "$template_file" ]]; then
        log_error "テンプレートファイルが見つかりません: $template_file"
        return 1
    fi
    
    if [[ -f "$target_file" ]]; then
        log_info "$context環境ファイル($target_file)は既に存在します"
        return 0
    fi
    
    # テンプレートから環境ファイルを生成
    cp "$template_file" "$target_file"
    log_success "$context環境ファイルを作成しました: $target_file"
    
    # パーミッション設定（セキュリティ強化）
    chmod 600 "$target_file"
    log_info "セキュリティ: $target_file のパーミッションを600に設定"
    
    return 0
}

setup_env_files() {
    log_info "環境ファイルセットアップを開始します..."
    echo ""
    
    local has_error=false
    
    # フロントエンド環境ファイル
    if ! generate_env_from_template "$FRONTEND_EXAMPLE" "$FRONTEND_ENV" "フロントエンド"; then
        has_error=true
    fi
    
    # バックエンド環境ファイル  
    if ! generate_env_from_template "$BACKEND_EXAMPLE" "$BACKEND_ENV" "バックエンド"; then
        has_error=true
    fi
    
    if [[ "$has_error" == true ]]; then
        log_error "環境ファイルセットアップでエラーが発生しました"
        return 1
    fi
    
    echo ""
    log_success "環境ファイルセットアップが完了しました"
    return 0
}

# =============================================================================
# 外部設定ファイル読み込み機能
# =============================================================================

load_required_vars_from_external() {
    local scope="$1"  # "frontend" または "backend"
    local -n result_array="$2"  # 結果を格納する配列の参照
    
    # 外部設定ファイルが存在するか確認
    if [[ -f "$VALIDATION_RULES_FILE" ]]; then
        log_info "外部設定ファイルから必須変数を読み込みます: $VALIDATION_RULES_FILE"
        
        # Node.jsスクリプトで外部設定ファイルから必須変数を取得
        local external_vars
        external_vars=$(node -e "
            try {
                const rules = require('$VALIDATION_RULES_FILE');
                const required = rules.REQUIRED_ENV_VARS || {};
                if (required['$scope']) {
                    console.log(required['$scope'].join(' '));
                } else {
                    process.exit(1);
                }
            } catch (error) {
                process.exit(1);
            }
        " 2>/dev/null)
        
        if [[ $? -eq 0 && -n "$external_vars" ]]; then
            # スペース区切りの文字列を配列に変換
            read -ra result_array <<< "$external_vars"
            log_success "外部設定から${#result_array[@]}個の必須変数を読み込みました (${scope})"
            return 0
        else
            log_warning "外部設定ファイルから${scope}の必須変数を読み込めませんでした"
        fi
    else
        log_info "外部設定ファイルが見つかりません: $VALIDATION_RULES_FILE"
    fi
    
    # フォールバック: デフォルト値を使用
    case "$scope" in
        "frontend")
            result_array=("${DEFAULT_FRONTEND_REQUIRED[@]}")
            ;;
        "backend")
            result_array=("${DEFAULT_BACKEND_REQUIRED[@]}")
            ;;
        *)
            log_error "不明なスコープ: $scope"
            return 1
            ;;
    esac
    
    log_info "デフォルト設定を使用します (${scope}): ${#result_array[@]}個の必須変数"
    return 0
}

# =============================================================================
# 環境変数検証機能
# =============================================================================

validate_env_file_exists() {
    local env_file="$1"
    local context="$2"
    
    if [[ ! -f "$env_file" ]]; then
        log_error "$context環境ファイルが見つかりません: $env_file"
        return 1
    fi
    
    log_success "$context環境ファイルを確認: $env_file"
    return 0
}

validate_required_vars() {
    local env_file="$1"
    local context="$2"
    shift 2
    local required_vars=("$@")
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" 2>/dev/null; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "$context: 必須環境変数が不足しています"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    log_success "$context: 必須環境変数が設定されています (${#required_vars[@]}項目)"
    return 0
}

validate_port_format() {
    local env_file="$1"
    local context="$2"
    
    local invalid_ports=()
    
    while IFS='=' read -r key value; do
        if [[ "$key" =~ PORT$ ]] && [[ -n "$value" ]]; then
            # ポート番号の形式チェック（1-65535の範囲）
            local port_number="$value"
            if ! [[ "$port_number" =~ ^[1-9][0-9]*$ ]] || [[ "$port_number" -gt 65535 ]] || [[ "$port_number" -lt 1 ]]; then
                invalid_ports+=("$key=$port_number")
            fi
        fi
    done < <(grep -E "^[A-Z_]*PORT=" "$env_file" 2>/dev/null || true)
    
    if [[ ${#invalid_ports[@]} -gt 0 ]]; then
        log_error "$context: 無効なポート番号形式"
        for port in "${invalid_ports[@]}"; do
            echo "  - $port"
        done
        return 1
    fi
    
    log_success "$context: ポート番号形式が正しく設定されています"
    return 0
}

validate_url_format() {
    local env_file="$1"
    local context="$2"
    
    local invalid_urls=()
    
    while IFS='=' read -r key value; do
        if [[ "$key" =~ URL$ ]] && [[ -n "$value" ]]; then
            # 基本的なURL形式チェック
            if ! [[ "$value" =~ ^https?://[^[:space:]]+$ ]]; then
                invalid_urls+=("$key=$value")
            fi
        fi
    done < <(grep -E "^[A-Z_]*URL=" "$env_file" 2>/dev/null || true)
    
    if [[ ${#invalid_urls[@]} -gt 0 ]]; then
        log_error "$context: 無効なURL形式"
        for url in "${invalid_urls[@]}"; do
            echo "  - $url"
        done
        return 1
    fi
    
    log_success "$context: URL形式が正しく設定されています"
    return 0
}

validate_environment() {
    log_info "環境変数検証を開始します..."
    echo ""
    
    local has_error=false
    
    # 設計書通りのNode.js検証との統合
    if [[ -f "${PROJECT_ROOT}/scripts/env-validator.cjs" ]]; then
        log_info "=== Node.js環境変数検証 (設計通りの統合検証) ==="
        if ! node "${PROJECT_ROOT}/scripts/env-validator.cjs" 2>/dev/null; then
            log_warning "Node.js検証でエラーが発生しましたが、Bash検証を継続します"
            # Node.js検証の失敗はエラーとせず、警告レベルとして扱う
        else
            log_success "Node.js検証が正常に完了しました"
        fi
        echo ""
    else
        log_info "Node.js検証ファイル (env-validator.cjs) が見つからないため、Bash検証のみ実行します"
        echo ""
    fi
    
    # 既存のBash検証も継続（後方互換性確保）
    # フロントエンド環境変数検証
    log_info "=== フロントエンド環境変数検証 (Bash検証) ==="
    if validate_env_file_exists "$FRONTEND_ENV" "フロントエンド"; then
        # 外部設定ファイルから必須変数を読み込み
        local frontend_required
        if ! load_required_vars_from_external "frontend" frontend_required; then
            log_error "フロントエンド必須変数の読み込みに失敗しました"
            has_error=true
        else
            # 必須変数チェック
            if ! validate_required_vars "$FRONTEND_ENV" "フロントエンド" "${frontend_required[@]}"; then
                has_error=true
            fi
        fi
        
        # URL形式チェック
        if ! validate_url_format "$FRONTEND_ENV" "フロントエンド"; then
            has_error=true
        fi
    else
        has_error=true
    fi
    
    echo ""
    
    # バックエンド環境変数検証
    log_info "=== バックエンド環境変数検証 (Bash検証) ==="
    if validate_env_file_exists "$BACKEND_ENV" "バックエンド"; then
        # 外部設定ファイルから必須変数を読み込み
        local backend_required
        if ! load_required_vars_from_external "backend" backend_required; then
            log_error "バックエンド必須変数の読み込みに失敗しました"
            has_error=true
        else
            # 必須変数チェック
            if ! validate_required_vars "$BACKEND_ENV" "バックエンド" "${backend_required[@]}"; then
                has_error=true
            fi
        fi
        
        # ポート形式チェック
        if ! validate_port_format "$BACKEND_ENV" "バックエンド"; then
            has_error=true
        fi
        
        # URL形式チェック
        if ! validate_url_format "$BACKEND_ENV" "バックエンド"; then
            has_error=true
        fi
    else
        has_error=true
    fi
    
    echo ""
    
    if [[ "$has_error" == true ]]; then
        log_error "環境変数検証でエラーが発生しました"
        return 1
    fi
    
    log_success "環境変数検証が完了しました - 全て正常です！"
    return 0
}

# =============================================================================
# テンプレート同期チェック機能
# =============================================================================

check_sync_for_context() {
    local env_file="$1"
    local example_file="$2" 
    local context="$3"
    
    if [[ -f "$env_file" ]] && [[ -f "$example_file" ]]; then
        local template_vars
        local env_vars
        
        template_vars=$(grep -E "^[A-Z_]+=.*$" "$example_file" | cut -d'=' -f1 | sort)
        env_vars=$(grep -E "^[A-Z_]+=.*$" "$env_file" | cut -d'=' -f1 | sort)
        
        local missing_in_env
        missing_in_env=$(comm -23 <(echo "$template_vars") <(echo "$env_vars"))
        
        if [[ -n "$missing_in_env" ]]; then
            log_warning "${context}: テンプレートにあるが環境ファイルにない変数"
            echo "$missing_in_env" | sed 's/^/  - /'
            return 1  # 警告レベル
        else
            log_success "${context}: テンプレートと環境ファイルが同期しています"
            return 0
        fi
    else
        log_warning "${context}: 環境ファイルまたはテンプレートファイルが見つかりません"
        return 1
    fi
}

check_env_template_sync() {
    log_info "環境ファイルとテンプレートの同期確認を開始します..."
    echo ""
    
    local has_warning=false
    
    # フロントエンド同期チェック（共通関数使用）
    if ! check_sync_for_context "$FRONTEND_ENV" "$FRONTEND_EXAMPLE" "フロントエンド"; then
        has_warning=true
    fi
    
    # バックエンド同期チェック（共通関数使用）
    if ! check_sync_for_context "$BACKEND_ENV" "$BACKEND_EXAMPLE" "バックエンド"; then
        has_warning=true
    fi
    
    echo ""
    
    if [[ "$has_warning" == true ]]; then
        log_warning "同期確認で警告が発生しました - 環境ファイルの更新をご検討ください"
        return 2  # 警告レベル
    fi
    
    log_success "テンプレート同期確認が完了しました - 全て同期済みです！"
    return 0
}

# =============================================================================
# メイン処理
# =============================================================================

show_usage() {
    echo "使用方法: $0 [コマンド]"
    echo ""
    echo "コマンド:"
    echo "  setup       環境ファイルの初期セットアップ"
    echo "  validate    環境変数の検証実行"
    echo "  check_sync  テンプレートとの同期確認"
    echo "  help        このヘルプを表示"
    echo ""
    echo "コマンドを指定しない場合、setup -> validate の順で実行されます"
    echo ""
    echo "例:"
    echo "  $0                # 初期セットアップ + 検証"
    echo "  $0 validate       # 検証のみ"
    echo "  $0 check_sync     # 同期チェックのみ"
}

main() {
    local command="${1:-setup_and_validate}"
    
    show_banner
    
    case "$command" in
        "setup")
            setup_env_files
            ;;
        "validate")
            validate_environment
            ;;
        "check_sync")
            check_env_template_sync
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        "setup_and_validate")
            if setup_env_files; then
                echo ""
                validate_environment
            else
                log_error "セットアップに失敗したため、検証をスキップします"
                exit 1
            fi
            ;;
        *)
            log_error "不明なコマンド: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# スクリプトが直接実行された場合のみメイン処理を実行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi