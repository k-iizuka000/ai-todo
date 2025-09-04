/**
 * 機密情報マスク機能のテストスクリプト
 */

const { maskSensitiveValue } = require('./validation-rules.cjs');

console.log('🧪 機密情報マスク機能テスト');
console.log('═'.repeat(50));

// テストケース
const testCases = [
  { name: 'JWT_SECRET', value: 'my-super-secret-key-12345', expected: 'masked' },
  { name: 'DATABASE_URL', value: 'postgresql://user:password@localhost:5432/db', expected: 'not_masked' },
  { name: 'API_KEY', value: 'sk-abcdef123456789', expected: 'masked' },
  { name: 'PASSWORD', value: 'secretpassword123', expected: 'masked' },
  { name: 'PRIVATE_KEY', value: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BA', expected: 'masked' },
  { name: 'PORT', value: '3001', expected: 'not_masked' },
  { name: 'VITE_API_URL', value: 'http://localhost:3001', expected: 'not_masked' }
];

console.log('\n📋 テストケース実行:');
testCases.forEach((testCase, index) => {
  const maskedValue = maskSensitiveValue(testCase.name, testCase.value);
  const isMasked = maskedValue !== testCase.value;
  const shouldBeMasked = testCase.expected === 'masked';
  
  const status = isMasked === shouldBeMasked ? '✅' : '❌';
  
  console.log(`\n${index + 1}. ${status} ${testCase.name}`);
  console.log(`   原文: "${testCase.value}"`);
  console.log(`   結果: "${maskedValue}"`);
  console.log(`   期待: ${testCase.expected === 'masked' ? 'マスクされる' : 'マスクされない'}`);
});

console.log('\n🎯 generateDetailedErrorReport でのマスクテスト:');

const { generateDetailedErrorReport } = require('./env-validator.cjs');

const testErrors = [
  {
    type: 'INVALID_FORMAT',
    variable: 'JWT_SECRET',
    value: 'my-super-secret-key-12345',
    message: 'Invalid format for JWT_SECRET',
    suggestion: 'Use a secure secret key'
  },
  {
    type: 'INVALID_FORMAT',
    variable: 'API_KEY',
    value: 'sk-abcdef123456789',
    message: 'Invalid format for API_KEY',
    suggestion: 'Check API key format'
  },
  {
    type: 'VALUE_OUT_OF_RANGE',
    variable: 'PASSWORD',
    value: 'weakpassword',
    message: 'Password is too weak',
    suggestion: 'Use a stronger password'
  }
];

const report = generateDetailedErrorReport(testErrors);
console.log('\n📊 エラーレポート出力:');
console.log(report);

console.log('\n✅ 機密情報マスクテストが完了しました');