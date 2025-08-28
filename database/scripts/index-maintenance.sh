#!/bin/bash

# ==================================================================================
# index-maintenance.sh: インデックスメンテナンス自動化スクリプト
# ==================================================================================
# 目的: インデックスの健全性チェック、自動修復、監視の自動化
# 実行方法: ./index-maintenance.sh [command] [options]
# ==================================================================================

set -euo pipefail

# ==================================================================================
# 設定値
# ==================================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/../logs"
DB_NAME="${DB_NAME:-ai_todo_dev}"
DB_USER="${DB_USER:-ai_todo_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
LOG_FILE="${LOG_DIR}/index-maintenance-$(date +%Y%m%d).log"

# ログディレクトリの作成
mkdir -p "${LOG_DIR}"

# ==================================================================================
# ログ関数
# ==================================================================================

log_info() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "${LOG_FILE}"
}

log_warn() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "${LOG_FILE}"
}

# ==================================================================================
# データベース接続関数
# ==================================================================================

execute_sql() {
    local sql="$1"
    local output_format="${2:-table}"
    
    PGPASSWORD="${DB_PASSWORD:-dev_password_2024}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "${sql}" \
        --${output_format}
}

execute_sql_file() {
    local sql_file="$1"
    
    if [[ ! -f "${sql_file}" ]]; then
        log_error "SQL file not found: ${sql_file}"
        return 1
    fi
    
    PGPASSWORD="${DB_PASSWORD:-dev_password_2024}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -f "${sql_file}"
}

# ==================================================================================
# ヘルスチェック機能
# ==================================================================================

health_check() {
    log_info "Starting index health check..."
    
    local output_file="${LOG_DIR}/health-check-$(date +%Y%m%d-%H%M%S).csv"
    
    # 健全性チェック実行
    execute_sql "COPY (SELECT * FROM index_health_dashboard) TO STDOUT WITH CSV HEADER" > "${output_file}"
    
    log_info "Health check completed. Report saved to: ${output_file}"
    
    # 問題のあるインデックスがある場合は警告
    local problem_count=$(execute_sql "SELECT COUNT(*) FROM index_health_dashboard WHERE health_status != 'HEALTHY'" --tuples-only --no-align)
    
    if [[ "${problem_count}" -gt 0 ]]; then
        log_warn "Found ${problem_count} problematic indexes. Check the report for details."
        
        # 問題の詳細をログに出力
        execute_sql "SELECT index_name, health_status, recommendation FROM index_health_dashboard WHERE health_status != 'HEALTHY'"
        
        return 1
    else
        log_info "All indexes are healthy."
        return 0
    fi
}

# ==================================================================================
# アラート生成機能
# ==================================================================================

generate_alerts() {
    log_info "Generating index alerts..."
    
    local alert_count=$(execute_sql "SELECT generate_index_alerts()" --tuples-only --no-align)
    
    if [[ "${alert_count}" -gt 0 ]]; then
        log_warn "Generated ${alert_count} new alerts."
        
        # アラートの詳細を表示
        execute_sql "SELECT alert_type, severity, index_name, description FROM index_health_alerts WHERE resolved_at IS NULL ORDER BY severity, created_at DESC"
        
        # 高優先度アラートがある場合は即座に通知
        local critical_alerts=$(execute_sql "SELECT COUNT(*) FROM index_health_alerts WHERE severity IN ('HIGH', 'CRITICAL') AND resolved_at IS NULL" --tuples-only --no-align)
        
        if [[ "${critical_alerts}" -gt 0 ]]; then
            log_error "Found ${critical_alerts} critical/high priority alerts requiring immediate attention!"
            send_alert_notification "CRITICAL" "${critical_alerts} critical index alerts detected"
        fi
    else
        log_info "No new alerts generated."
    fi
}

# ==================================================================================
# 自動修復機能
# ==================================================================================

auto_fix() {
    local dry_run="${1:-true}"
    local max_size_mb="${2:-1000}"
    
    if [[ "${dry_run}" == "true" ]]; then
        log_info "Running auto-fix in DRY RUN mode (max size: ${max_size_mb}MB)..."
    else
        log_warn "Running auto-fix in LIVE mode (max size: ${max_size_mb}MB)..."
    fi
    
    # ブロートしたインデックスの修復
    log_info "Checking for bloated indexes..."
    local reindex_results=$(mktemp)
    execute_sql "SELECT * FROM auto_reindex_bloated_indexes(${dry_run}, ${max_size_mb})" > "${reindex_results}"
    
    if [[ -s "${reindex_results}" ]]; then
        log_info "Bloated index repair results:"
        cat "${reindex_results}" | tee -a "${LOG_FILE}"
    else
        log_info "No bloated indexes found requiring repair."
    fi
    
    # 古い統計情報の更新
    log_info "Checking for stale statistics..."
    local analyze_results=$(mktemp)
    execute_sql "SELECT * FROM auto_analyze_stale_tables(${dry_run})" > "${analyze_results}"
    
    if [[ -s "${analyze_results}" ]]; then
        log_info "Stale statistics update results:"
        cat "${analyze_results}" | tee -a "${LOG_FILE}"
    else
        log_info "No stale statistics found."
    fi
    
    # 一時ファイルのクリーンアップ
    rm -f "${reindex_results}" "${analyze_results}"
}

# ==================================================================================
# 統計情報収集
# ==================================================================================

collect_statistics() {
    log_info "Collecting index statistics..."
    
    execute_sql "SELECT collect_index_statistics()"
    
    log_info "Statistics collection completed."
}

# ==================================================================================
# レポート生成
# ==================================================================================

generate_report() {
    local report_type="${1:-weekly}"
    local output_file="${LOG_DIR}/index-report-${report_type}-$(date +%Y%m%d).html"
    
    log_info "Generating ${report_type} index report..."
    
    # HTMLレポートの生成
    cat > "${output_file}" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Index Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .healthy { color: green; }
        .warning { color: orange; }
        .critical { color: red; }
        .section-title { color: #333; border-bottom: 2px solid #333; }
    </style>
</head>
<body>
    <h1>Database Index Performance Report</h1>
    <p>Generated on: $(date)</p>
    
    <h2 class="section-title">Health Summary</h2>
EOF
    
    # 健全性サマリーを追加
    echo "<table>" >> "${output_file}"
    echo "<tr><th>Metric</th><th>Value</th></tr>" >> "${output_file}"
    execute_sql "SELECT 'Total Indexes', COUNT(*) FROM index_health_dashboard" --html >> "${output_file}"
    execute_sql "SELECT 'Healthy Indexes', COUNT(*) FROM index_health_dashboard WHERE health_status = 'HEALTHY'" --html >> "${output_file}"
    execute_sql "SELECT 'Problem Indexes', COUNT(*) FROM index_health_dashboard WHERE health_status != 'HEALTHY'" --html >> "${output_file}"
    echo "</table>" >> "${output_file}"
    
    # 詳細レポートを追加
    echo "<h2 class=\"section-title\">Detailed Index Status</h2>" >> "${output_file}"
    execute_sql "SELECT table_name as \"Table\", index_name as \"Index\", index_size as \"Size\", scans as \"Scans\", health_status as \"Status\", recommendation as \"Recommendation\" FROM index_health_dashboard ORDER BY health_status, scans DESC" --html >> "${output_file}"
    
    cat >> "${output_file}" << 'EOF'
</body>
</html>
EOF
    
    log_info "Report generated: ${output_file}"
}

# ==================================================================================
# 通知機能
# ==================================================================================

send_alert_notification() {
    local severity="$1"
    local message="$2"
    
    # 実際の通知システム（Slack, Discord, メールなど）と連携
    log_warn "ALERT [${severity}]: ${message}"
    
    # TODO: 実際のアプリケーションでは以下のような通知を実装
    # - Slack webhook
    # - Discord webhook  
    # - Email notification
    # - システムログへの記録
}

# ==================================================================================
# パフォーマンステスト
# ==================================================================================

performance_test() {
    log_info "Running performance tests..."
    
    local test_results="${LOG_DIR}/performance-test-$(date +%Y%m%d-%H%M%S).txt"
    
    # テスト用SQLファイルを実行
    if [[ -f "${SCRIPT_DIR}/../tests/performance-queries.sql" ]]; then
        execute_sql_file "${SCRIPT_DIR}/../tests/performance-queries.sql" > "${test_results}" 2>&1
        log_info "Performance test results saved to: ${test_results}"
    else
        log_error "Performance test file not found"
        return 1
    fi
    
    # SLA達成確認
    local sla_check=$(execute_sql "SELECT COUNT(*) FROM verify_performance_sla() WHERE sla_status = 'FAIL'" --tuples-only --no-align)
    
    if [[ "${sla_check}" -gt 0 ]]; then
        log_error "Performance SLA violations detected!"
        execute_sql "SELECT * FROM verify_performance_sla() WHERE sla_status = 'FAIL'"
        return 1
    else
        log_info "All performance SLAs are being met."
        return 0
    fi
}

# ==================================================================================
# メイン実行部分
# ==================================================================================

usage() {
    cat << EOF
Usage: $0 COMMAND [OPTIONS]

COMMANDS:
    health-check       Run comprehensive index health check
    generate-alerts    Generate new alerts for index issues
    auto-fix           Run automatic index repairs
    collect-stats      Collect index usage statistics
    report             Generate performance report
    performance-test   Run performance benchmark tests
    full-maintenance   Run complete maintenance cycle

OPTIONS:
    --dry-run         Run in dry-run mode (for auto-fix)
    --max-size MB     Maximum index size for auto-repair (default: 1000MB)
    --report-type     Report type: daily|weekly|monthly (default: weekly)

EXAMPLES:
    $0 health-check
    $0 auto-fix --dry-run
    $0 auto-fix --max-size 500
    $0 report --report-type daily
    $0 full-maintenance
EOF
}

main() {
    local command="${1:-}"
    local dry_run="true"
    local max_size="1000"
    local report_type="weekly"
    
    # パラメータ解析
    shift
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run="true"
                ;;
            --live)
                dry_run="false"
                ;;
            --max-size)
                max_size="$2"
                shift
                ;;
            --report-type)
                report_type="$2"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
        shift
    done
    
    log_info "Starting index maintenance: ${command}"
    
    case "${command}" in
        health-check)
            health_check
            ;;
        generate-alerts)
            generate_alerts
            ;;
        auto-fix)
            auto_fix "${dry_run}" "${max_size}"
            ;;
        collect-stats)
            collect_statistics
            ;;
        report)
            generate_report "${report_type}"
            ;;
        performance-test)
            performance_test
            ;;
        full-maintenance)
            log_info "Running full maintenance cycle..."
            collect_statistics
            health_check || true
            generate_alerts
            auto_fix "${dry_run}" "${max_size}"
            generate_report "${report_type}"
            log_info "Full maintenance cycle completed."
            ;;
        "")
            log_error "No command specified."
            usage
            exit 1
            ;;
        *)
            log_error "Unknown command: ${command}"
            usage
            exit 1
            ;;
    esac
    
    log_info "Index maintenance completed: ${command}"
}

# スクリプト実行
main "$@"