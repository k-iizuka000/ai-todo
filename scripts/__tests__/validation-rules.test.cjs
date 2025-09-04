const {
  REQUIRED_ENV_VARS,
  PORT_RANGES,
  URL_PATTERNS,
  DEFAULT_VALUES,
  SENSITIVE_PATTERNS,
  validatePortRange,
  validateUrlFormat,
  validateRequiredFields,
  checkPortConflicts,
  validateEnvironmentValueFormats,
  maskSensitiveValue,
  getDefaultValue,
  getAllRequiredVars
} = require('../validation-rules.cjs');

describe('validation-rules.cjs', () => {
  describe('validatePortRange', () => {
    test('有効なポート番号（開発環境）', () => {
      expect(validatePortRange('3000', 'development')).toBe(true);
      expect(validatePortRange('8080', 'development')).toBe(true);
      expect(validatePortRange('9999', 'development')).toBe(true);
    });

    test('無効なポート番号（開発環境）', () => {
      expect(validatePortRange('2999', 'development')).toBe(false);
      expect(validatePortRange('10000', 'development')).toBe(false);
      expect(validatePortRange('80', 'development')).toBe(false);
    });

    test('有効なポート番号（プロダクション環境）', () => {
      expect(validatePortRange('80', 'production')).toBe(true);
      expect(validatePortRange('443', 'production')).toBe(true);
      expect(validatePortRange('8080', 'production')).toBe(true);
    });

    test('無効なポート番号（プロダクション環境）', () => {
      expect(validatePortRange('79', 'production')).toBe(false);
      expect(validatePortRange('65536', 'production')).toBe(false);
    });

    test('不正な文字列', () => {
      expect(validatePortRange('abc', 'development')).toBe(false);
      expect(validatePortRange('', 'development')).toBe(false);
      // parseInt('3000.5', 10) は 3000 になるため有効なポートとして判定される
      expect(validatePortRange('3000.5', 'development')).toBe(true);
    });
  });

  describe('validateUrlFormat', () => {
    test('有効なAPI URL', () => {
      expect(validateUrlFormat('http://localhost:3000', 'api')).toBe(true);
      expect(validateUrlFormat('https://api.example.com', 'api')).toBe(true);
      expect(validateUrlFormat('http://localhost:3001/api', 'api')).toBe(true);
      expect(validateUrlFormat('https://sub.domain.com:8080/path/', 'api')).toBe(true);
    });

    test('無効なAPI URL', () => {
      expect(validateUrlFormat('localhost:3000', 'api')).toBe(false);
      expect(validateUrlFormat('ftp://example.com', 'api')).toBe(false);
      expect(validateUrlFormat('', 'api')).toBe(false);
    });

    test('有効なデータベースURL', () => {
      expect(validateUrlFormat('postgresql://user:pass@localhost:5432/db', 'database')).toBe(true);
      expect(validateUrlFormat('mysql://root:password@localhost:3306/test', 'database')).toBe(true);
      expect(validateUrlFormat('sqlite:///path/to/database.db', 'database')).toBe(true);
      expect(validateUrlFormat('mongodb://user:pass@localhost:27017/db', 'database')).toBe(true);
    });

    test('無効なデータベースURL', () => {
      expect(validateUrlFormat('http://localhost:5432', 'database')).toBe(false);
      expect(validateUrlFormat('invalid://connection', 'database')).toBe(false);
      expect(validateUrlFormat('', 'database')).toBe(false);
    });

    test('有効なWebSocketURL', () => {
      expect(validateUrlFormat('ws://localhost:3001', 'websocket')).toBe(true);
      expect(validateUrlFormat('wss://ws.example.com', 'websocket')).toBe(true);
      expect(validateUrlFormat('wss://sub.domain.com:8080/path/', 'websocket')).toBe(true);
    });

    test('無効なWebSocketURL', () => {
      expect(validateUrlFormat('http://localhost:3001', 'websocket')).toBe(false);
      expect(validateUrlFormat('localhost:3001', 'websocket')).toBe(false);
      expect(validateUrlFormat('', 'websocket')).toBe(false);
    });

    test('未対応URLタイプ', () => {
      expect(validateUrlFormat('http://example.com', 'unsupported')).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    test('フロントエンド必須変数 - 全て存在', () => {
      const envConfig = {
        'VITE_API_URL': 'http://localhost:3001',
        'VITE_APP_TITLE': 'Todo App'
      };
      expect(validateRequiredFields(envConfig, 'frontend')).toEqual([]);
    });

    test('フロントエンド必須変数 - 一部不足', () => {
      const envConfig = {
        'VITE_API_URL': 'http://localhost:3001'
      };
      expect(validateRequiredFields(envConfig, 'frontend')).toEqual(['VITE_APP_TITLE']);
    });

    test('バックエンド必須変数 - 全て存在', () => {
      const envConfig = {
        'PORT': '3001',
        'DATABASE_URL': 'postgresql://user:pass@localhost:5432/db',
        'JWT_SECRET': 'your-secret-key'
      };
      expect(validateRequiredFields(envConfig, 'backend')).toEqual([]);
    });

    test('バックエンド必須変数 - 複数不足', () => {
      const envConfig = {
        'PORT': '3001'
      };
      expect(validateRequiredFields(envConfig, 'backend')).toEqual(['DATABASE_URL', 'JWT_SECRET']);
    });

    test('空文字は不足として扱う', () => {
      const envConfig = {
        'VITE_API_URL': '',
        'VITE_APP_TITLE': '   '  // 空白のみ
      };
      expect(validateRequiredFields(envConfig, 'frontend')).toEqual(['VITE_API_URL', 'VITE_APP_TITLE']);
    });

    test('未対応スコープ', () => {
      const envConfig = { 'TEST': 'value' };
      expect(validateRequiredFields(envConfig, 'unsupported')).toEqual([]);
    });
  });

  describe('checkPortConflicts', () => {
    test('ポート競合なし', () => {
      const envConfig = {
        'FRONTEND_PORT': '3000',
        'BACKEND_PORT': '3001',
        'DB_PORT': '5432'
      };
      expect(checkPortConflicts(envConfig)).toEqual([]);
    });

    test('ポート競合あり', () => {
      const envConfig = {
        'FRONTEND_PORT': '3000',
        'BACKEND_PORT': '3000',  // 競合
        'API_PORT': '3001'
      };
      const result = checkPortConflicts(envConfig);
      expect(result).toHaveLength(1);
      expect(result[0].port).toBe(3000);
      expect(result[0].conflictingVars).toEqual(['FRONTEND_PORT', 'BACKEND_PORT']);
    });

    test('複数ポートで競合', () => {
      const envConfig = {
        'PORT1': '3000',
        'PORT2': '3000',  // 競合1
        'PORT3': '3001',
        'PORT4': '3001',  // 競合2
        'PORT5': '3002'   // 競合なし
      };
      const result = checkPortConflicts(envConfig);
      expect(result).toHaveLength(2);
    });

    test('PORTキーワードを含まない変数は無視', () => {
      const envConfig = {
        'SERVER': '3000',
        'CLIENT': '3000',  // PORTを含まないので無視
        'FRONTEND_PORT': '3001'
      };
      expect(checkPortConflicts(envConfig)).toEqual([]);
    });

    test('空の値は無視', () => {
      const envConfig = {
        'FRONTEND_PORT': '',
        'BACKEND_PORT': '3000',
        'API_PORT': null
      };
      expect(checkPortConflicts(envConfig)).toEqual([]);
    });
  });

  describe('定数定義の検証', () => {
    test('REQUIRED_ENV_VARS が正しく定義されている', () => {
      expect(REQUIRED_ENV_VARS).toHaveProperty('frontend');
      expect(REQUIRED_ENV_VARS).toHaveProperty('backend');
      expect(REQUIRED_ENV_VARS.frontend).toBeInstanceOf(Array);
      expect(REQUIRED_ENV_VARS.backend).toBeInstanceOf(Array);
      expect(REQUIRED_ENV_VARS.frontend.length).toBeGreaterThan(0);
      expect(REQUIRED_ENV_VARS.backend.length).toBeGreaterThan(0);
    });

    test('PORT_RANGES が正しく定義されている', () => {
      expect(PORT_RANGES).toHaveProperty('development');
      expect(PORT_RANGES).toHaveProperty('production');
      expect(PORT_RANGES.development).toHaveProperty('min');
      expect(PORT_RANGES.development).toHaveProperty('max');
      expect(PORT_RANGES.production).toHaveProperty('min');
      expect(PORT_RANGES.production).toHaveProperty('max');
    });

    test('URL_PATTERNS が正しく定義されている', () => {
      expect(URL_PATTERNS).toHaveProperty('api');
      expect(URL_PATTERNS).toHaveProperty('database');
      expect(URL_PATTERNS.api.pattern).toBeInstanceOf(RegExp);
      expect(URL_PATTERNS.database.pattern).toBeInstanceOf(RegExp);
    });

    test('DEFAULT_VALUES が正しく定義されている', () => {
      expect(DEFAULT_VALUES).toHaveProperty('development');
      expect(DEFAULT_VALUES).toHaveProperty('production');
      expect(DEFAULT_VALUES.development).toBeInstanceOf(Object);
      expect(DEFAULT_VALUES.production).toBeInstanceOf(Object);
    });

    test('SENSITIVE_PATTERNS が正しく定義されている', () => {
      expect(SENSITIVE_PATTERNS).toBeInstanceOf(Array);
      expect(SENSITIVE_PATTERNS.length).toBeGreaterThan(0);
      SENSITIVE_PATTERNS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });
  });

  describe('validateEnvironmentValueFormats', () => {
    test('有効な環境変数設定', () => {
      const envConfig = {
        'VITE_API_URL': 'http://localhost:3001',
        'DATABASE_URL': 'postgresql://user:pass@localhost:5432/db',
        'PORT': '3001',
        'NODE_ENV': 'development'
      };
      expect(validateEnvironmentValueFormats(envConfig)).toEqual([]);
    });

    test('無効なURL形式', () => {
      const envConfig = {
        'VITE_API_URL': 'localhost:3001'
      };
      const result = validateEnvironmentValueFormats(envConfig);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('INVALID_URL_FORMAT');
      expect(result[0].variable).toBe('VITE_API_URL');
    });

    test('無効なポート番号', () => {
      const envConfig = {
        'PORT': '99999',
        'NODE_ENV': 'development'
      };
      const result = validateEnvironmentValueFormats(envConfig);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('PORT_OUT_OF_RANGE');
      expect(result[0].variable).toBe('PORT');
    });

    test('無効な数値フィールド', () => {
      const envConfig = {
        'TIMEOUT': 'invalid',
        'MAX_LIMIT': '-1'
      };
      const result = validateEnvironmentValueFormats(envConfig);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('INVALID_NUMBER');
      expect(result[1].type).toBe('INVALID_NUMBER');
    });
  });

  describe('maskSensitiveValue', () => {
    test('機密情報をマスク（9文字以上）', () => {
      expect(maskSensitiveValue('JWT_SECRET', 'verylongsecretkey')).toBe('very****tkey');
      expect(maskSensitiveValue('PASSWORD', '123456789')).toBe('1234****6789');
      expect(maskSensitiveValue('API_KEY', '123456789012')).toBe('1234****9012');
    });

    test('機密情報をマスク（8文字以下）', () => {
      expect(maskSensitiveValue('PASSWORD', '12345678')).toBe('****');
      expect(maskSensitiveValue('API_KEY', 'short')).toBe('****');
      expect(maskSensitiveValue('SECRET', 'abcd')).toBe('****');
    });

    test('非機密情報はそのまま', () => {
      expect(maskSensitiveValue('PORT', '3000')).toBe('3000');
      expect(maskSensitiveValue('NODE_ENV', 'development')).toBe('development');
    });

    test('空値の処理', () => {
      expect(maskSensitiveValue('JWT_SECRET', '')).toBe('');
      expect(maskSensitiveValue('PASSWORD', null)).toBe(null);
    });
  });

  describe('getDefaultValue', () => {
    test('開発環境のデフォルト値取得', () => {
      expect(getDefaultValue('VITE_API_URL', 'development')).toBe('http://localhost:3001');
      expect(getDefaultValue('PORT', 'development')).toBe('3001');
      expect(getDefaultValue('NODE_ENV', 'development')).toBe('development');
    });

    test('プロダクション環境のデフォルト値取得', () => {
      expect(getDefaultValue('VITE_APP_TITLE', 'production')).toBe('AI Todo');
      expect(getDefaultValue('NODE_ENV', 'production')).toBe('production');
    });

    test('未定義値は null', () => {
      expect(getDefaultValue('UNDEFINED_VAR', 'development')).toBeNull();
      expect(getDefaultValue('PORT', 'production')).toBeNull();
    });
  });

  describe('getAllRequiredVars', () => {
    test('全スコープの必須変数取得', () => {
      const allVars = getAllRequiredVars();
      expect(allVars).toContain('VITE_API_URL');
      expect(allVars).toContain('VITE_APP_TITLE');
      expect(allVars).toContain('PORT');
      expect(allVars).toContain('DATABASE_URL');
      expect(allVars).toContain('JWT_SECRET');
      expect(allVars).toContain('NODE_ENV');
    });

    test('特定スコープのみ', () => {
      const frontendVars = getAllRequiredVars(['frontend']);
      expect(frontendVars).toContain('VITE_API_URL');
      expect(frontendVars).toContain('VITE_APP_TITLE');
      expect(frontendVars).not.toContain('PORT');
    });

    test('重複除去', () => {
      const allVars = getAllRequiredVars(['frontend', 'backend', 'common']);
      const uniqueVars = [...new Set(allVars)];
      expect(allVars.length).toBe(uniqueVars.length);
    });

    test('空スコープ', () => {
      const noVars = getAllRequiredVars([]);
      expect(noVars).toEqual([]);
    });
  });
});