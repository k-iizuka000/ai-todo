/**
 * @fileoverview 環境変数のバリデーションルール定義・管理
 * Issue-047: 環境設定自動検証機能の実装
 * @version 1.0.0
 */

// 必須環境変数の定義
const REQUIRED_ENV_VARS = {
  frontend: [
    'VITE_API_URL',        // APIサーバーのURL
    'VITE_APP_TITLE',      // アプリケーションのタイトル
  ],
  backend: [
    'PORT',                // サーバーポート番号
    'DATABASE_URL',        // データベース接続文字列
    'JWT_SECRET',          // JWT暗号化秘密鍵
  ],
  common: [
    'NODE_ENV',           // 実行環境（development/production）
  ]
};

// ポート番号の範囲定義
const PORT_RANGES = {
  development: {
    min: 3000,
    max: 9999,
    description: 'Development environment port range'
  },
  production: {
    min: 80,
    max: 65535,
    description: 'Production environment port range'
  }
};

// URL形式のバリデーションパターン
const URL_PATTERNS = {
  api: {
    pattern: /^https?:\/\/[\w\-]+(\.[\w\-]+)*(:\d+)?(\/.*)?\/?$/,
    description: 'HTTP/HTTPS API endpoint URL',
    examples: ['http://localhost:3001', 'https://api.example.com/v1']
  },
  database: {
    pattern: /^(postgresql|mysql|mongodb|sqlite):\/\/.+$/,
    description: 'Database connection string',
    examples: ['postgresql://user:pass@localhost:5432/db', 'mysql://user:pass@localhost:3306/db']
  },
  websocket: {
    pattern: /^wss?:\/\/[\w\-]+(\.[\w\-]+)*(:\d+)?(\/.*)?\/?$/,
    description: 'WebSocket URL',
    examples: ['ws://localhost:3001', 'wss://ws.example.com']
  }
};

// 環境別設定のデフォルト値
const DEFAULT_VALUES = {
  development: {
    'VITE_API_URL': 'http://localhost:3001',
    'VITE_APP_TITLE': 'AI Todo - Development',
    'PORT': '3001',
    'NODE_ENV': 'development'
  },
  production: {
    'VITE_APP_TITLE': 'AI Todo',
    'NODE_ENV': 'production'
  }
};

// セキュアな環境変数パターン（ログ出力時にマスクする）
const SENSITIVE_PATTERNS = [
  /SECRET/i,
  /PASSWORD/i,
  /PRIVATE/i,
  /TOKEN/i,
  /KEY/i,
  /AUTH/i
];

/**
 * ポート番号の範囲をバリデーション
 * @param {string} port - ポート番号（文字列）
 * @param {string} env - 環境（development/production）
 * @returns {boolean} バリデーション結果
 */
function validatePortRange(port, env = 'development') {
  const portNum = parseInt(port, 10);
  
  // 数値変換チェック
  if (isNaN(portNum)) {
    return false;
  }

  // 環境別範囲チェック
  const range = PORT_RANGES[env] || PORT_RANGES.development;
  return portNum >= range.min && portNum <= range.max;
}

/**
 * URL形式のバリデーション
 * @param {string} url - URL文字列
 * @param {string} type - URLタイプ（api/database/websocket）
 * @returns {boolean} バリデーション結果
 */
function validateUrlFormat(url, type = 'api') {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const pattern = URL_PATTERNS[type];
  if (!pattern) {
    return false;
  }

  return pattern.pattern.test(url.trim());
}

/**
 * 必須フィールドの存在チェック
 * @param {Object} envConfig - 環境変数設定オブジェクト
 * @param {string} scope - スコープ（frontend/backend/common）
 * @returns {string[]} 不足している変数名の配列
 */
function validateRequiredFields(envConfig, scope) {
  const requiredVars = REQUIRED_ENV_VARS[scope] || [];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!envConfig[varName] || envConfig[varName].trim() === '') {
      missingVars.push(varName);
    }
  }

  return missingVars;
}

/**
 * ポート競合をチェック
 * @param {Object} envConfig - 環境変数設定オブジェクト
 * @returns {Array} 競合ポート情報の配列
 */
function checkPortConflicts(envConfig) {
  const portVars = Object.keys(envConfig).filter(key => 
    key.includes('PORT') || key.endsWith('_PORT')
  );

  const portMap = new Map();
  const conflicts = [];

  for (const varName of portVars) {
    const portValue = envConfig[varName];
    if (portValue && !isNaN(parseInt(portValue, 10))) {
      const port = parseInt(portValue, 10);
      
      if (portMap.has(port)) {
        conflicts.push({
          port,
          conflictingVars: [portMap.get(port), varName]
        });
      } else {
        portMap.set(port, varName);
      }
    }
  }

  return conflicts;
}

/**
 * 環境変数の値の形式をバリデーション
 * @param {Object} envConfig - 環境変数設定オブジェクト
 * @returns {Array} バリデーションエラーの配列
 */
function validateEnvironmentValueFormats(envConfig) {
  const errors = [];

  for (const [varName, value] of Object.entries(envConfig)) {
    if (!value || typeof value !== 'string') continue;

    // URLフィールドのチェック
    if (varName.includes('URL') || varName.includes('_URL')) {
      let urlType = 'api';
      if (varName.includes('DATABASE')) urlType = 'database';
      if (varName.includes('WS') || varName.includes('WEBSOCKET')) urlType = 'websocket';

      if (!validateUrlFormat(value, urlType)) {
        const pattern = URL_PATTERNS[urlType];
        errors.push({
          variable: varName,
          type: 'INVALID_URL_FORMAT',
          message: `Invalid URL format for ${varName}`,
          current: value,
          expected: pattern.description,
          examples: pattern.examples
        });
      }
    }

    // ポート番号のチェック
    if (varName.includes('PORT')) {
      const env = envConfig.NODE_ENV || 'development';
      if (!validatePortRange(value, env)) {
        const range = PORT_RANGES[env] || PORT_RANGES.development;
        errors.push({
          variable: varName,
          type: 'PORT_OUT_OF_RANGE',
          message: `Port number out of range for ${varName}`,
          current: value,
          expected: `${range.min}-${range.max} (${env})`,
          examples: [`${range.min}`, `${Math.floor((range.min + range.max) / 2)}`]
        });
      }
    }

    // 数値フィールドのチェック
    if (varName.includes('TIMEOUT') || varName.includes('LIMIT') || varName.includes('MAX')) {
      if (isNaN(parseInt(value, 10)) || parseInt(value, 10) <= 0) {
        errors.push({
          variable: varName,
          type: 'INVALID_NUMBER',
          message: `Invalid number format for ${varName}`,
          current: value,
          expected: 'Positive integer',
          examples: ['1', '30', '100']
        });
      }
    }
  }

  return errors;
}

/**
 * 機密情報を含む環境変数をマスク
 * @param {string} varName - 変数名
 * @param {string} value - 変数値
 * @returns {string} マスク済み値
 */
function maskSensitiveValue(varName, value) {
  const isSensitive = SENSITIVE_PATTERNS.some(pattern => 
    pattern.test(varName)
  );

  if (isSensitive && value) {
    return value.length > 8 
      ? `${value.slice(0, 4)}****${value.slice(-4)}`
      : '****';
  }

  return value;
}

/**
 * デフォルト値を取得
 * @param {string} varName - 変数名
 * @param {string} env - 環境（development/production）
 * @returns {string|null} デフォルト値
 */
function getDefaultValue(varName, env = 'development') {
  return DEFAULT_VALUES[env]?.[varName] || null;
}

/**
 * 全スコープの必須変数を取得
 * @param {string[]} scopes - 対象スコープ配列
 * @returns {string[]} 必須変数の配列
 */
function getAllRequiredVars(scopes = ['frontend', 'backend', 'common']) {
  const allRequired = [];
  
  for (const scope of scopes) {
    if (REQUIRED_ENV_VARS[scope]) {
      allRequired.push(...REQUIRED_ENV_VARS[scope]);
    }
  }

  return [...new Set(allRequired)]; // 重複除去
}

// エクスポート
module.exports = {
  // 定数
  REQUIRED_ENV_VARS,
  PORT_RANGES,
  URL_PATTERNS,
  DEFAULT_VALUES,
  SENSITIVE_PATTERNS,

  // バリデーション関数
  validatePortRange,
  validateUrlFormat,
  validateRequiredFields,
  checkPortConflicts,
  validateEnvironmentValueFormats,

  // ユーティリティ関数
  maskSensitiveValue,
  getDefaultValue,
  getAllRequiredVars
};