/**
 * 環境変数検証機能の単体テスト
 * Issue 047: 環境変数設定の自動検証機能
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// テスト対象モジュール
const {
  validateEnvironment,
  validateRequiredEnvVars,
  validatePortNumbers,
  validateEnvValueFormats,
  loadEnvConfig,
  ERROR_TYPES
} = require('../env-validator.cjs');

describe('環境変数バリデーター', () => {
  let testDir;
  
  beforeEach(() => {
    // 一時テストディレクトリを作成
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
  });
  
  afterEach(() => {
    // 一時ディレクトリをクリーンアップ
    fs.rmSync(testDir, { recursive: true, force: true });
  });
  
  describe('loadEnvConfig', () => {
    test('正常な.envファイルが読み込まれること', () => {
      const envPath = path.join(testDir, '.env');
      fs.writeFileSync(envPath, 'VITE_API_URL=http://localhost:3001\nVITE_APP_TITLE="Test App"');
      
      const result = loadEnvConfig(envPath);
      
      expect(result.error).toBeUndefined();
      expect(result.vars).toEqual({
        VITE_API_URL: 'http://localhost:3001',
        VITE_APP_TITLE: 'Test App'
      });
    });
    
    test('存在しないファイルの場合エラーを返すこと', () => {
      const envPath = path.join(testDir, 'nonexistent.env');
      
      const result = loadEnvConfig(envPath);
      
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Config file not found');
      expect(result.vars).toEqual({});
    });
    
    test('コメント行と空行が正しく処理されること', () => {
      const envPath = path.join(testDir, '.env');
      fs.writeFileSync(envPath, [
        '# これはコメント',
        '',
        'VITE_API_URL=http://localhost:3001',
        '# 別のコメント',
        'VITE_APP_TITLE=Test App'
      ].join('\n'));
      
      const result = loadEnvConfig(envPath);
      
      expect(result.vars).toEqual({
        VITE_API_URL: 'http://localhost:3001',
        VITE_APP_TITLE: 'Test App'
      });
    });
  });
  
  describe('validateRequiredEnvVars', () => {
    test('必須変数が存在する場合はエラーが0件になること', () => {
      const requiredVars = ['VITE_API_URL', 'VITE_APP_TITLE'];
      const actualVars = {
        VITE_API_URL: 'http://localhost:3001',
        VITE_APP_TITLE: 'Test App'
      };
      
      const errors = validateRequiredEnvVars(requiredVars, actualVars);
      
      expect(errors).toHaveLength(0);
    });
    
    test('必須変数が不足している場合はエラーが生成されること', () => {
      const requiredVars = ['VITE_API_URL', 'VITE_APP_TITLE'];
      const actualVars = {
        VITE_API_URL: 'http://localhost:3001'
        // VITE_APP_TITLE が不足
      };
      
      const errors = validateRequiredEnvVars(requiredVars, actualVars);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(ERROR_TYPES.MISSING_REQUIRED);
      expect(errors[0].variable).toBe('VITE_APP_TITLE');
      expect(errors[0].message).toContain('Missing required environment variable');
    });
    
    test('空文字列の変数はエラーとして扱われること', () => {
      const requiredVars = ['VITE_API_URL'];
      const actualVars = {
        VITE_API_URL: '  ' // 空白のみ
      };
      
      const errors = validateRequiredEnvVars(requiredVars, actualVars);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].variable).toBe('VITE_API_URL');
    });
  });
  
  describe('validatePortNumbers', () => {
    test('有効なポート番号の場合はエラーが0件になること', () => {
      const envVars = {
        PORT: '3001',
        VITE_PORT: '3000'
      };
      
      const result = validatePortNumbers(envVars);
      
      expect(result.conflicts).toHaveLength(0);
      expect(result.invalidRanges).toHaveLength(0);
    });
    
    test('ポート番号の重複が検出されること', () => {
      const envVars = {
        PORT: '3001',
        API_PORT: '3001' // 重複
      };
      
      const result = validatePortNumbers(envVars);
      
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe(ERROR_TYPES.PORT_CONFLICT);
      expect(result.conflicts[0].port).toBe(3001);
      expect(result.conflicts[0].variables).toEqual(['PORT', 'API_PORT']);
    });
    
    test('無効な範囲のポート番号が検出されること', () => {
      const envVars = {
        PORT: '80' // developmentモードで80番ポート（範囲外）
      };
      
      const result = validatePortNumbers(envVars);
      
      expect(result.invalidRanges).toHaveLength(1);
      expect(result.invalidRanges[0].type).toBe(ERROR_TYPES.VALUE_OUT_OF_RANGE);
      expect(result.invalidRanges[0].variable).toBe('PORT');
      expect(result.invalidRanges[0].value).toBe('80');
    });
  });
  
  describe('validateEnvValueFormats', () => {
    test('有効な形式の値の場合はエラーが0件になること', () => {
      const envVars = {
        PORT: '3001',
        VITE_API_URL: 'http://localhost:3001',
        DEBUG: 'true'
      };
      
      const result = validateEnvValueFormats(envVars);
      
      expect(result.errors).toHaveLength(0);
    });
    
    test('不正な数値形式が検出されること', () => {
      const envVars = {
        PORT: 'invalid_number'
      };
      
      const result = validateEnvValueFormats(envVars);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ERROR_TYPES.INVALID_FORMAT);
      expect(result.errors[0].variable).toBe('PORT');
    });
    
    test('不正なURL形式が検出されること', () => {
      const envVars = {
        VITE_API_URL: 'invalid-url'
      };
      
      const result = validateEnvValueFormats(envVars);
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(ERROR_TYPES.INVALID_FORMAT);
      expect(result.errors[0].variable).toBe('VITE_API_URL');
    });
  });
  
  describe('validateEnvironment - 統合テスト', () => {
    test('完全に正常な環境設定の場合はvalidationが成功すること', () => {
      const envPath = path.join(testDir, '.env');
      fs.writeFileSync(envPath, [
        'VITE_API_URL=http://localhost:3001',
        'VITE_APP_TITLE=Test Application',
        'PORT=3002',
        'DATABASE_URL=postgresql://user:pass@localhost:5432/test',
        'JWT_SECRET=test_secret_key'
      ].join('\n'));
      
      // 作業ディレクトリを一時的に変更
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        const result = validateEnvironment('.env', 'all');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.summary.errors).toBe(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
    
    test('環境変数が不足している場合はvalidationが失敗すること', () => {
      const envPath = path.join(testDir, '.env');
      fs.writeFileSync(envPath, 'VITE_API_URL=http://localhost:3001\n');
      
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        const result = validateEnvironment('.env', 'all');
        
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.summary.errors).toBeGreaterThan(0);
        expect(result.detailedReport).toContain('Environment validation failed');
      } finally {
        process.chdir(originalCwd);
      }
    });
    
    test('設定ファイルが存在しない場合は適切なエラーが返されること', () => {
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        const result = validateEnvironment('nonexistent.env', 'all');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe(ERROR_TYPES.FILE_NOT_FOUND);
      } finally {
        process.chdir(originalCwd);
      }
    });
    
    test('frontendスコープでのvalidationが正常に動作すること', () => {
      const envPath = path.join(testDir, '.env');
      fs.writeFileSync(envPath, [
        'VITE_API_URL=http://localhost:3001',
        'VITE_APP_TITLE=Test Application'
      ].join('\n'));
      
      const originalCwd = process.cwd();
      process.chdir(testDir);
      
      try {
        const result = validateEnvironment('.env', 'frontend');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});