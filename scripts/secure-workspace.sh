#!/bin/bash
# セキュアワークスペース管理スクリプト
# 個人情報を含まない安全なパス制御

set -euo pipefail

# ===========================================
# セキュアパス戦略: Environment Variable Based
# ===========================================

# 1. Dynamic Path Resolution (No Personal Info)
setup_secure_workspace() {
    # Get true project root (handle worktree case)
    if [[ "$(pwd)" =~ \.worktree/ ]]; then
        export PROJECT_ROOT="$(git rev-parse --show-toplevel | sed 's|/.worktree.*||')"
    else
        export PROJECT_ROOT="$(git rev-parse --show-toplevel)"
    fi
    
    export CURRENT_BRANCH="$(git branch --show-current)"
    export ISSUE_NUMBER="${CURRENT_BRANCH##*-}"  # Extract issue number
    export WORKSPACE_BASE="${PROJECT_ROOT}/.worktree"
    export SECURE_WORKSPACE="${WORKSPACE_BASE}/${CURRENT_BRANCH}"
    
    echo "🔧 Secure Workspace Setup:"
    echo "   Project Root: ${PROJECT_ROOT}"
    echo "   Current Branch: ${CURRENT_BRANCH}" 
    echo "   Issue Number: ${ISSUE_NUMBER}"
    echo "   Secure Workspace: ${SECURE_WORKSPACE}"
}

# 2. Workspace Validation Gate
validate_workspace() {
    # Initialize if not already done
    if [[ -z "${SECURE_WORKSPACE:-}" ]]; then
        setup_secure_workspace
    fi
    
    local current_dir="$(pwd)"
    local expected_dir="${SECURE_WORKSPACE}"
    
    if [[ "${current_dir}" != "${expected_dir}" ]]; then
        echo "🚨 WORKSPACE VIOLATION DETECTED"
        echo "   Current: ${current_dir}"
        echo "   Expected: ${expected_dir}"
        echo "   Action: cd to correct workspace"
        return 1
    fi
    
    echo "✅ Workspace validated: ${current_dir}"
    return 0
}

# 3. Secure Path Generator (No Personal Info)
secure_path() {
    local relative_path="$1"
    if [[ -z "${SECURE_WORKSPACE:-}" ]]; then
        setup_secure_workspace
    fi
    echo "${SECURE_WORKSPACE}/${relative_path}"
}

# 4. Agent Command Wrapper
execute_secure() {
    local command="$*"
    
    echo "🔒 Executing in secure workspace..."
    validate_workspace || {
        echo "❌ Workspace validation failed"
        return 1
    }
    
    echo "🚀 Command: ${command}"
    eval "${command}"
    
    echo "✅ Secure execution completed"
}

# 5. Pre-commit Security Check
security_audit() {
    echo "🔍 Security Audit..."
    
    # Check for personal information (exclude known safe files)
    local temp_file=$(mktemp)
    
    # Scan for personal info, excluding this script and git files
    if find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
        ! -path "./.git/*" \
        ! -path "./node_modules/*" \
        ! -path "./scripts/secure-workspace.sh" \
        -exec grep -l "/Users/.*kei" {} \; > "$temp_file"; then
        
        if [[ -s "$temp_file" ]]; then
            echo "🚨 SECURITY RISK: Personal information detected in:"
            cat "$temp_file"
            rm "$temp_file"
            return 1
        fi
    fi
    
    rm "$temp_file"
    echo "✅ Security audit passed"
    return 0
}

# 6. Environment Export for Agent Tools
export_secure_env() {
    setup_secure_workspace
    
    # Export for use in other scripts
    export -f validate_workspace
    export -f secure_path
    export -f execute_secure
    export -f security_audit
    
    echo "🌍 Secure environment exported"
    echo "   Available functions: validate_workspace, secure_path, execute_secure, security_audit"
}

# 7. Clean Legacy Security Risks
clean_personal_info() {
    echo "🧹 Cleaning personal information from files..."
    
    # Replace absolute paths with relative paths in documentation
    find . -name "*.md" ! -path "./.git/*" ! -path "./node_modules/*" \
        -exec sed -i.bak 's|/Users/[^/]*/work/ai-todo/\.worktree/issue-029/|./|g' {} \;
    
    # Remove backup files
    find . -name "*.bak" -delete
    
    echo "✅ Personal information cleaned"
}

# ===========================================
# Main Execution
# ===========================================

case "${1:-help}" in
    "setup")
        setup_secure_workspace
        ;;
    "validate")
        validate_workspace
        ;;
    "audit")
        security_audit
        ;;
    "export")
        export_secure_env
        ;;
    "path")
        secure_path "${2:-}"
        ;;
    "exec")
        shift
        execute_secure "$@"
        ;;
    "clean")
        clean_personal_info
        ;;
    "help"|*)
        echo "🛡️ Secure Workspace Manager"
        echo ""
        echo "Usage:"
        echo "  $0 setup     - Initialize secure workspace"
        echo "  $0 validate  - Validate current workspace"
        echo "  $0 audit     - Security audit for personal info"
        echo "  $0 export    - Export secure environment"
        echo "  $0 path <rel> - Generate secure absolute path"
        echo "  $0 exec <cmd> - Execute command in secure workspace"
        echo "  $0 clean     - Clean personal info from files"
        echo ""
        echo "Examples:"
        echo "  source scripts/secure-workspace.sh export"
        echo "  ./scripts/secure-workspace.sh validate"
        echo "  ./scripts/secure-workspace.sh exec 'npm install'"
        echo "  ./scripts/secure-workspace.sh clean"
        ;;
esac