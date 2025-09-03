// Node.jsで直接実行する簡易テスト

import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, authMiddleware } from './src/middleware/auth.js';

// JWT_SECRETを設定
process.env.JWT_SECRET = 'test-secret-key-12345';

console.log('🧪 認証ミドルウェアの手動テスト開始');

// 1. generateToken関数のテスト
console.log('\n📝 1. generateToken関数のテスト');
try {
  const userId = 'user-12345';
  const token = generateToken(userId);
  console.log('✅ トークン生成成功:', token.substring(0, 20) + '...');
  
  // 生成されたトークンが有効かチェック
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('✅ トークン検証成功:', decoded.userId === userId ? 'ユーザーID一致' : 'ユーザーID不一致');
} catch (error) {
  console.error('❌ generateToken失敗:', error.message);
}

// 2. verifyToken関数のテスト
console.log('\n🔍 2. verifyToken関数のテスト');
try {
  const userId = 'user-67890';
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const decoded = verifyToken(token);
  console.log('✅ トークン検証成功:', decoded.userId === userId ? 'ユーザーID一致' : 'ユーザーID不一致');
} catch (error) {
  console.error('❌ verifyToken失敗:', error.message);
}

// 3. エラーケースのテスト
console.log('\n⚠️ 3. エラーケースのテスト');

// 無効なトークン
try {
  verifyToken('invalid-token');
  console.error('❌ 無効なトークンが受け入れられました');
} catch (error) {
  console.log('✅ 無効なトークンが正しく拒否されました:', error.message);
}

// 空のuserIdでトークン生成
try {
  generateToken('');
  console.error('❌ 空のuserIdでトークンが生成されました');
} catch (error) {
  console.log('✅ 空のuserIdが正しく拒否されました:', error.message);
}

// JWT_SECRETなしでトークン生成
try {
  delete process.env.JWT_SECRET;
  generateToken('user-123');
  console.error('❌ JWT_SECRETなしでトークンが生成されました');
} catch (error) {
  console.log('✅ JWT_SECRETなしが正しく拒否されました:', error.message);
}

console.log('\n🎉 認証ミドルウェアテスト完了！');