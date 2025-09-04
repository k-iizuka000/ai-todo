const fs = require('fs');
const path = require('path');
const {
  validateEnvironment,
  loadEnvConfig,
  validateRequiredEnvVars,
  validatePortNumbers,
  validateEnvValueFormats,
  generateDetailedErrorReport
} = require('../env-validator.cjs');

// モックファイル用の一時ディレクトリ
const testTempDir = path.join(__dirname, 'temp');

describe('env-validator.cjs', () => {
  beforeAll(() => {
    // テスト用ディレクトリ作成
    if (!fs.existsSync(testTempDir)) {
      fs.mkdirSync(testTempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // テスト用ディレクトリ削除
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  });

  describe('loadEnvConfig', () => {
    test('正常な.envファイルのパース', () => {
      const testEnvFile = path.join(testTempDir, 'test.env');
      const envContent = `VITE_API_URL=http://localhost:3001
VITE_APP_TITLE="Todo App"
PORT=3000
# コメント行
DATABASE_URL=postgresql://localhost:5432/test`;

      fs.writeFileSync(testEnvFile, envContent);
      const result = loadEnvConfig(testEnvFile);

      expect(result.vars).toEqual({
        'VITE_API_URL': 'http://localhost:3001',
        'VITE_APP_TITLE': 'Todo App',
        'PORT': '3000',
        'DATABASE_URL': 'postgresql://localhost:5432/test'
      });

      fs.unlinkSync(testEnvFile);
    });

    test('存在しないファイル', () => {
      const result = loadEnvConfig(path.join(testTempDir, 'nonexistent.env'));
      expect(result.error).toBeDefined();
      expect(result.vars).toEqual({});
    });

    test('空のファイル', () => {
      const testEnvFile = path.join(testTempDir, 'empty.env');
      fs.writeFileSync(testEnvFile, '');
      
      const result = loadEnvConfig(testEnvFile);
      expect(result.vars).toEqual({});
      
      fs.unlinkSync(testEnvFile);
    });

    test('コメントのみのファイル', () => {
      const testEnvFile = path.join(testTempDir, 'comments.env');
      const envContent = `# コメント1
# コメント2
# VITE_API_URL=http://example.com`;

      fs.writeFileSync(testEnvFile, envContent);
      const result = loadEnvConfig(testEnvFile);
      expect(result.vars).toEqual({});

      fs.unlinkSync(testEnvFile);
    });

    test('クォート文字列の処理', () => {
      const testEnvFile = path.join(testTempDir, 'quotes.env');
      const envContent = `VAR1="double quotes"
VAR2='single quotes'
VAR3=no quotes`;

      fs.writeFileSync(testEnvFile, envContent);
      const result = loadEnvConfig(testEnvFile);

      expect(result.vars).toEqual({
        'VAR1': 'double quotes',
        'VAR2': 'single quotes',
        'VAR3': 'no quotes'
      });

      fs.unlinkSync(testEnvFile);
    });
  });

  describe('validateRequiredEnvVars', () => {
    test('全ての必須変数が存在', () => {
      const requiredVars = ['VITE_API_URL', 'VITE_APP_TITLE'];
      const actualVars = {
        'VITE_API_URL': 'http://localhost:3001',
        'VITE_APP_TITLE': 'Test App'
      };
      const errors = validateRequiredEnvVars(requiredVars, actualVars);
      expect(errors).toHaveLength(0);
    });

    test('必須変数が不足', () => {
      const requiredVars = ['VITE_API_URL', 'VITE_APP_TITLE'];
      const actualVars = {
        'VITE_API_URL': 'http://localhost:3001'
        // VITE_APP_TITLE が不足
      };
      const errors = validateRequiredEnvVars(requiredVars, actualVars);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('MISSING_REQUIRED');
      expect(errors[0].variable).toBe('VITE_APP_TITLE');
      expect(errors[0].message).toContain('Missing required environment variable');
    });
  });

  describe('validatePortNumbers', () => {
    test('有効なポート番号', () => {
      const envConfig = {
        'PORT': '3000',
        'API_PORT': '3001'
      };
      const result = validatePortNumbers(envConfig);
      expect(result.conflicts).toHaveLength(0);
      expect(result.invalidRanges).toHaveLength(0);
    });

    test('ポート競合エラー', () => {
      const envConfig = {
        'FRONTEND_PORT': '3000',
        'BACKEND_PORT': '3000'  // 競合
      };
      const result = validatePortNumbers(envConfig);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('PORT_CONFLICT');
      expect(result.conflicts[0].message).toContain('is used by multiple variables');
    });

    test('ポート範囲外エラー', () => {
      const envConfig = {
        'PORT': '2999'  // 開発環境範囲外
      };
      const result = validatePortNumbers(envConfig);
      
      expect(result.invalidRanges).toHaveLength(1);
      expect(result.invalidRanges[0].type).toBe('VALUE_OUT_OF_RANGE');
      expect(result.invalidRanges[0].message).toContain('out of valid range');
    });
  });

  describe('validateEnvValueFormats', () => {
    test('有効なURL形式', () => {
      const envConfig = {
        'VITE_API_URL': 'http://localhost:3001',
        'DATABASE_URL': 'postgresql://user:pass@localhost:5432/db'
      };
      const result = validateEnvValueFormats(envConfig);
      expect(result.errors).toHaveLength(0);
    });

    test('無効なAPI URL形式', () => {
      const envConfig = {
        'VITE_API_URL': 'localhost:3001'  // protocolなし
      };
      const result = validateEnvValueFormats(envConfig);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('INVALID_FORMAT');
      expect(result.errors[0].variable).toBe('VITE_API_URL');
      expect(result.errors[0].message).toContain('Invalid URL format');
    });

    test('無効なデータベースURL形式', () => {
      const envConfig = {
        'DATABASE_URL': 'http://localhost:5432'  // 無効なプロトコル
      };
      const result = validateEnvValueFormats(envConfig);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('INVALID_FORMAT');
      expect(result.errors[0].variable).toBe('DATABASE_URL');
      expect(result.errors[0].message).toContain('Invalid URL format');
    });
  });

  describe('generateDetailedErrorReport', () => {
    test('エラーなしの場合', () => {
      const report = generateDetailedErrorReport([]);
      expect(report).toContain('✅ All environment variables are valid');
    });

    test('エラーありの場合', () => {
      const errors = [
        {
          type: 'MISSING_REQUIRED',
          variable: 'VITE_API_URL',
          message: 'Missing required environment variable',
          suggestion: 'Set your API URL'
        }
      ];
      const report = generateDetailedErrorReport(errors);
      
      expect(report).toContain('🔴 Environment validation failed');
      expect(report).toContain('📋 Missing Required Variables');
      expect(report).toContain('VITE_API_URL');
      expect(report).toContain('💡 Set your API URL');
    });

    test('複数タイプのエラー', () => {
      const errors = [
        {
          type: 'MISSING_REQUIRED',
          variable: 'VAR1',
          message: 'Error1',
          suggestion: 'Fix1'
        },
        {
          type: 'INVALID_FORMAT',
          variable: 'VAR2',
          value: 'invalid-value',
          message: 'Error2',
          suggestion: 'Fix2'
        }
      ];
      const report = generateDetailedErrorReport(errors);
      
      expect(report).toContain('📋 Missing Required Variables');
      expect(report).toContain('🔧 Format Errors');
    });
  });

  describe('validateEnvironment統合テスト', () => {
    test('フロントエンドスコープのみ検証', () => {
      // 一時的な.envファイルを作成
      const testEnvFile = path.join(testTempDir, 'frontend.env');
      const envContent = `VITE_API_URL=http://localhost:3001
VITE_APP_TITLE=Test App`;

      fs.writeFileSync(testEnvFile, envContent);

      const result = validateEnvironment(testEnvFile, 'frontend');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.detailedReport).toContain('✅ All environment variables are valid');

      fs.unlinkSync(testEnvFile);
    });

    test('検証失敗の場合', () => {
      // 不正な設定を含む.envファイルを作成
      const testEnvFile = path.join(testTempDir, 'invalid.env');
      const envContent = `VITE_API_URL=localhost:3001`; // 不正な形式

      fs.writeFileSync(testEnvFile, envContent);

      const result = validateEnvironment(testEnvFile, 'frontend');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.detailedReport).toContain('🔴 Environment validation failed');

      fs.unlinkSync(testEnvFile);
    });
  });
});