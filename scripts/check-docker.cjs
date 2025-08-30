#!/usr/bin/env node

/**
 * Docker環境チェックスクリプト
 * CLAUDE.mdの要求に従い、Docker環境での実行を強制する
 */

const fs = require('fs');
const path = require('path');

// Docker環境内かどうかチェック
function isRunningInDocker() {
  try {
    // 明示的なDocker環境変数チェック
    if (process.env.IS_DOCKER_CONTAINER === '1') {
      return true;
    }
    
    // /.dockerenvファイルの存在チェック
    if (fs.existsSync('/.dockerenv')) {
      return true;
    }
    
    // cgroupファイルでDockerコンテナかチェック
    if (fs.existsSync('/proc/1/cgroup')) {
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
      if (cgroup.includes('docker') || cgroup.includes('containerd')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// メイン処理
function main() {
  const isDocker = isRunningInDocker();
  
  if (!isDocker) {
    console.error('🔴 CRITICAL: Docker環境を使わずに実行しようとしました');
    console.error('');
    console.error('CLAUDE.mdのルールに従い、以下のコマンドを使用してください:');
    console.error('  docker compose run --rm app npm run type-check');
    console.error('');
    console.error('⚠️ ホスト環境での直接実行は禁止されています');
    process.exit(1);
  }
  
  console.log('✅ Docker環境での実行を確認');
}

if (require.main === module) {
  main();
}

module.exports = { isRunningInDocker };