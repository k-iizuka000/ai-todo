/**
 * 環境変数の自動検証とバリデーション機能を提供
 * Issue 047: 環境変数設定の自動検証機能
 */

const fs = require('fs');
const path = require('path');
const {
  REQUIRED_ENV_VARS,
  validatePortRange,
  validateUrlFormat,
  validateRequiredFields,
  checkPortConflicts,
  validateEnvironmentValueFormats,
  maskSensitiveValue
} = require('./validation-rules.cjs');

// エラータイプ定義
const ERROR_TYPES = {
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  INVALID_FORMAT: 'INVALID_FORMAT',  
  PORT_CONFLICT: 'PORT_CONFLICT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND'
};

/**
 * 環境設定ファイルから環境変数を読み込み
 * @param {string} configPath - 設定ファイルのパス
 * @returns {object} - 環境変数オブジェクト
 */
function loadEnvConfig(configPath) {
  try {
    if (!fs.existsSync(configPath)) {
      return { error: `Config file not found: ${configPath}`, vars: {} };
    }
    
    const envContent = fs.readFileSync(configPath, 'utf8');
    const envVars = {};
    
    // .envファイルのパースを行う
    envContent.split('\n').forEach(line => {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.startsWith('#') && cleanLine.includes('=')) {
        const [key, ...valueParts] = cleanLine.split('=');
        const value = valueParts.join('=').replace(/['"]/g, ''); // クォート除去
        envVars[key.trim()] = value.trim();
      }
    });
    
    return { vars: envVars };
  } catch (error) {
    return { error: `Failed to read config file: ${error.message}`, vars: {} };
  }
}

/**
 * 必須環境変数のチェック機能
 * @param {string[]} requiredVars - 必須環境変数のリスト
 * @param {object} actualVars - 実際の環境変数
 * @returns {object[]} - バリデーションエラーのリスト
 */
function validateRequiredEnvVars(requiredVars, actualVars) {
  const errors = [];
  
  requiredVars.forEach(varName => {
    if (!actualVars[varName] || actualVars[varName].trim() === '') {
      errors.push({
        type: ERROR_TYPES.MISSING_REQUIRED,
        variable: varName,
        message: `Missing required environment variable: ${varName}`,
        suggestion: getSuggestionForVariable(varName)
      });
    }
  });
  
  return errors;
}

/**
 * ポート番号の重複・競合チェック
 * @param {object} envVars - 環境変数オブジェクト  
 * @returns {object} - ポートバリデーション結果
 */
function validatePortNumbers(envVars) {
  const conflicts = checkPortConflicts(envVars);
  const invalidRanges = [];
  
  // ポート範囲の検証
  Object.keys(envVars).forEach(varName => {
    if (varName.includes('PORT')) {
      const port = envVars[varName];
      if (port && !validatePortRange(port)) {
        invalidRanges.push({
          type: ERROR_TYPES.VALUE_OUT_OF_RANGE,
          variable: varName,
          value: port,
          message: `Port ${port} is out of valid range (3000-9999 for development)`,
          suggestion: 'Use a port number between 3000-9999'
        });
      }
    }
  });
  
  return {
    conflicts: conflicts.map(conflict => ({
      type: ERROR_TYPES.PORT_CONFLICT,
      port: conflict.port,
      variables: conflict.conflictingVars,
      message: `Port ${conflict.port} is used by multiple variables: ${conflict.conflictingVars.join(', ')}`,
      suggestion: 'Assign different port numbers to each service'
    })),
    invalidRanges
  };
}

/**
 * 設定値の妥当性検証（URL形式、数値範囲等）
 * @param {object} envVars - 環境変数オブジェクト
 * @returns {object} - フォーマットバリデーション結果
 */
function validateEnvValueFormats(envVars) {
  // validation-rules.cjs のvalidateEnvironmentValueFormatsを使用
  const validationErrors = validateEnvironmentValueFormats(envVars);
  
  // 既存のERROR_TYPES形式に変換
  const errors = validationErrors.map(error => ({
    type: ERROR_TYPES.INVALID_FORMAT,
    variable: error.variable,
    value: error.current,
    message: error.message,
    suggestion: `Expected ${error.expected}. Examples: ${error.examples?.join(', ') || 'valid format'}`
  }));
  
  return { errors };
}

/**
 * 変数名に対する提案を生成
 * @param {string} varName - 変数名
 * @returns {string} - 提案メッセージ
 */
function getSuggestionForVariable(varName) {
  const suggestions = {
    'VITE_API_URL': 'Set to your API server URL (e.g., http://localhost:3001)',
    'VITE_APP_TITLE': 'Set your application title (e.g., "AI Todo Application")',
    'DATABASE_URL': 'Set your database connection string (e.g., postgresql://user:pass@localhost:5432/dbname)',
    'PORT': 'Set your server port (e.g., 3001)',
    'JWT_SECRET': 'Set a secure JWT secret key for authentication'
  };
  
  return suggestions[varName] || `Please set the ${varName} environment variable`;
}

/**
 * 詳細なエラーレポートを生成
 * @param {object[]} errors - バリデーションエラーのリスト
 * @returns {string} - フォーマットされたエラーレポート
 */
function generateDetailedErrorReport(errors) {
  if (errors.length === 0) {
    return '✅ All environment variables are valid';
  }
  
  let report = '\n🔴 Environment validation failed:\n';
  report += '═'.repeat(50) + '\n';
  
  // エラーをタイプ別にグループ化
  const errorGroups = {};
  errors.forEach(error => {
    if (!errorGroups[error.type]) {
      errorGroups[error.type] = [];
    }
    errorGroups[error.type].push(error);
  });
  
  // タイプ別エラー表示
  Object.keys(errorGroups).forEach(errorType => {
    const typeErrors = errorGroups[errorType];
    
    switch (errorType) {
      case ERROR_TYPES.MISSING_REQUIRED:
        report += '\n📋 Missing Required Variables:\n';
        typeErrors.forEach(error => {
          report += `  - ${error.variable}: ${error.message}\n`;
          report += `    💡 ${error.suggestion}\n`;
        });
        break;
        
      case ERROR_TYPES.PORT_CONFLICT:
        report += '\n⚠️  Port Conflicts:\n';
        typeErrors.forEach(error => {
          report += `  - ${error.message}\n`;
          report += `    💡 ${error.suggestion}\n`;
        });
        break;
        
      case ERROR_TYPES.INVALID_FORMAT:
        report += '\n🔧 Format Errors:\n';
        typeErrors.forEach(error => {
          const maskedValue = maskSensitiveValue(error.variable, error.value);
          report += `  - ${error.variable}="${maskedValue}"\n`;
          report += `    ${error.message}\n`;
          report += `    💡 ${error.suggestion}\n`;
        });
        break;
        
      case ERROR_TYPES.VALUE_OUT_OF_RANGE:
        report += '\n📏 Value Range Errors:\n';
        typeErrors.forEach(error => {
          const maskedValue = maskSensitiveValue(error.variable, error.value);
          report += `  - ${error.variable}="${maskedValue}"\n`;
          report += `    ${error.message}\n`;
          report += `    💡 ${error.suggestion}\n`;
        });
        break;
    }
  });
  
  report += '\n═'.repeat(50);
  report += '\n📝 Please update your .env file and run validation again.\n';
  
  return report;
}

/**
 * 全体的な環境変数検証の統合実行
 * @param {string} configPath - 設定ファイルのパス
 * @param {string} scope - 検証スコープ（frontend/backend/all）
 * @returns {object} - 環境バリデーション結果
 */
function validateEnvironment(configPath = '.env', scope = 'all') {
  // デフォルトの設定ファイルパスを解決
  const rootPath = process.cwd();
  const fullConfigPath = path.resolve(rootPath, configPath);
  
  // 環境変数の読み込み
  const configResult = loadEnvConfig(fullConfigPath);
  if (configResult.error) {
    return {
      isValid: false,
      errors: [{
        type: ERROR_TYPES.FILE_NOT_FOUND,
        message: configResult.error,
        suggestion: 'Create .env file from .env.example template'
      }],
      warnings: [],
      summary: { total: 1, errors: 1, warnings: 0 },
      detailedReport: generateDetailedErrorReport([{
        type: ERROR_TYPES.FILE_NOT_FOUND,
        message: configResult.error,
        suggestion: 'Create .env file from .env.example template'
      }])
    };
  }
  
  const envVars = configResult.vars;
  let allErrors = [];
  
  // 必須環境変数のチェック
  const requiredVars = [];
  if (scope === 'frontend' || scope === 'all') {
    requiredVars.push(...REQUIRED_ENV_VARS.frontend);
  }
  if (scope === 'backend' || scope === 'all') {
    requiredVars.push(...REQUIRED_ENV_VARS.backend);
  }
  
  const requiredErrors = validateRequiredEnvVars(requiredVars, envVars);
  allErrors.push(...requiredErrors);
  
  // ポート番号の検証
  const portValidation = validatePortNumbers(envVars);
  allErrors.push(...portValidation.conflicts);
  allErrors.push(...portValidation.invalidRanges);
  
  // フォーマットの検証
  const formatValidation = validateEnvValueFormats(envVars);
  allErrors.push(...formatValidation.errors);
  
  // 結果の作成
  const isValid = allErrors.length === 0;
  const detailedReport = generateDetailedErrorReport(allErrors);
  
  return {
    isValid,
    errors: allErrors,
    warnings: [], // 将来の拡張用
    summary: {
      total: allErrors.length,
      errors: allErrors.length,
      warnings: 0
    },
    detailedReport
  };
}

// CLI実行時の処理
if (require.main === module) {
  const args = process.argv.slice(2);
  const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1] || '.env';
  const scope = args.find(arg => arg.startsWith('--scope='))?.split('=')[1] || 'all';
  const verbose = args.includes('--verbose');
  
  console.log('🍀 環境変数検証を開始します（スコープ: ' + scope + '）');
  
  const result = validateEnvironment(configPath, scope);
  
  // フロントエンド/バックエンド別のエラー数を表示
  let frontendErrors = 0;
  let backendErrors = 0;
  let portConflicts = 0;
  let portRangeErrors = 0;
  
  result.errors.forEach(error => {
    if (error.type === ERROR_TYPES.MISSING_REQUIRED) {
      if (REQUIRED_ENV_VARS.frontend.includes(error.variable)) {
        frontendErrors++;
      } else if (REQUIRED_ENV_VARS.backend.includes(error.variable)) {
        backendErrors++;
      }
    } else if (error.type === ERROR_TYPES.PORT_CONFLICT) {
      portConflicts++;
    } else if (error.type === ERROR_TYPES.VALUE_OUT_OF_RANGE) {
      portRangeErrors++;
    }
  });
  
  console.log(`✓ フロントエンド環境変数: ${frontendErrors}件のエラー`);
  if (scope === 'all') {
    console.log(`✓ バックエンド環境変数: ${backendErrors}件のエラー`);
  }
  console.log(`✓ ポート競合チェック: ${portConflicts}件の競合, ${portRangeErrors}件の範囲警告`);
  
  if (!result.isValid) {
    console.log('\n🔴 環境変数検証エラー:');
    let errorNumber = 1;
    result.errors.forEach(error => {
      console.log(`\n${errorNumber}. [${error.type}] ${error.variable}:`);
      console.log(`   ${error.message}`);
      if (error.value) {
        const maskedValue = maskSensitiveValue(error.variable, error.value);
        console.log(`   現在値: "${maskedValue}"`);
      }
      console.log(`   💡 推奨: ${error.suggestion}`);
      errorNumber++;
    });
    process.exit(1);
  }
  
  console.log('\n✅ 環境変数検証が正常に完了しました');
}

module.exports = {
  validateEnvironment,
  validateRequiredEnvVars,
  validatePortNumbers,
  validateEnvValueFormats,
  generateDetailedErrorReport,
  loadEnvConfig,
  ERROR_TYPES
};