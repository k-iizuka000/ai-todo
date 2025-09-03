# Agent実行プロトコル: セキュア＆確実

## 🎯 Protocol Overview

**Purpose**: エージェント作業の確実性とセキュリティを両立

**Core Principle**: 
- ✅ **Security**: 個人情報ゼロ露出
- ✅ **Reliability**: 100%正確な場所での作業実行
- ✅ **Verifiability**: 全作業の検証可能性

---

## 🔒 Execution Workflow

### Pre-execution Phase

```bash
# 1. Secure Environment Setup
source scripts/secure-workspace.sh export

# 2. Workspace Validation
validate_workspace || {
    echo "❌ Workspace validation failed"
    exit 1
}

# 3. Security Pre-check
security_audit || {
    echo "❌ Security audit failed" 
    exit 1
}

echo "✅ Pre-execution validation completed"
```

### Agent Execution Phase

```bash
# 4. Secure Command Execution Template
execute_secure "command_here"

# Examples:
execute_secure "npm install"
execute_secure "docker-compose up -d"
execute_secure "git add ."
```

### Post-execution Phase

```bash
# 5. Verification Gates
validate_workspace  # Still in correct location?
security_audit      # No personal info leaked?

echo "✅ Post-execution validation completed"
```

---

## 🛠️ Agent Prompt Template

### For Task Tool Usage

```markdown
## 🔒 Secure Workspace Protocol

### MANDATORY Pre-execution:
1. Execute: `source scripts/secure-workspace.sh export`
2. Execute: `validate_workspace`
3. Execute: `security_audit`

### MANDATORY Command Wrapping:
- Instead of: `npm install`
- Use: `execute_secure "npm install"`

### MANDATORY Post-execution:
1. Execute: `validate_workspace`
2. Execute: `security_audit`

### Path Generation:
- For file operations: `secure_path "relative/path/here"`
- Never use absolute paths with personal info

### Working Directory:
- Current workspace: {{SECURE_WORKSPACE}}
- All operations MUST occur within this directory
```

---

## 🔍 Verification Protocol

### Automated Checks

```bash
#!/bin/bash
# verification-suite.sh

echo "🔍 Starting comprehensive verification..."

# Check 1: Workspace Location
current_workspace="$(pwd)"
expected_pattern="\.worktree/issue-[0-9]+"

if [[ ! "${current_workspace}" =~ ${expected_pattern} ]]; then
    echo "❌ Invalid workspace location: ${current_workspace}"
    exit 1
fi

# Check 2: Personal Information Scan
if grep -r "/Users/" . 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -q "[USER]"; then
    echo "❌ Personal information detected:"
    grep -r "/Users/" . 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep "[USER]"
    exit 1
fi

# Check 3: File Integrity
required_files=(
    "docker-compose.yml"
    "api-layer/package.json"
    "api-layer/src/server.ts"
)

for file in "${required_files[@]}"; do
    if [[ ! -f "${file}" ]]; then
        echo "❌ Required file missing: ${file}"
        exit 1
    fi
done

# Check 4: Docker Configuration Validation
if ! docker-compose config --quiet; then
    echo "❌ Docker compose configuration invalid"
    exit 1
fi

echo "✅ All verification checks passed"
echo "   Workspace: ${current_workspace}"
echo "   Security: Clean"
echo "   Integrity: Verified"
```

---

## 🚀 Migration Strategy for Existing Issues

### For Current Issue-029

```bash
# 1. Apply secure workspace (Already in correct location)
source scripts/secure-workspace.sh export
validate_workspace  # Should pass

# 2. Verify Issue-029 completion status
execute_secure "docker-compose up -d api-layer"
execute_secure "curl http://localhost:3010/health"

# 3. Complete remaining tasks if needed
# (Based on analysis: api-layer implementation ~90% complete)
```

### For Future Issues

```bash
# 1. Create issue branch
git checkout -b issue-XXX

# 2. Setup worktree with secure workspace
git worktree add .worktree/issue-XXX issue-XXX
cd .worktree/issue-XXX

# 3. Initialize secure environment
source scripts/secure-workspace.sh export
validate_workspace

# 4. Agent execution with protocol
execute_secure "[agent tasks]"

# 5. Verification before commit
security_audit
```

---

## 🎯 Success Indicators

### Immediate Success (Issue-029)
- ✅ docker-compose.yml synchronized
- ✅ api-layer service functional
- ✅ No personal information in codebase
- 🔄 Issue-029 implementation completion (90% → 100%)

### Process Success (Future Issues)
- ✅ Zero workspace violations
- ✅ Zero personal information leaks
- ✅ 100% agent execution reliability
- ✅ Streamlined multi-issue workflow

### Security Success
- ✅ Public repository ready
- ✅ No manual intervention required
- ✅ Automated security validation
- ✅ Portable across environments

---

**Created**: 2025-09-02  
**Status**: Ready for implementation  
**Priority**: Critical infrastructure improvement  
**Dependencies**: None (self-contained solution)