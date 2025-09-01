module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': 'off', // 今回は警告のみ
    
    // ✅ Issue 027: 無限レンダリングループ防止のカスタムルール
    'react-hooks/exhaustive-deps': 'error', // useMemo/useEffect依存配列の厳格チェック
    'no-console': ['warn', { allow: ['warn', 'error'] }], // console.logの制限
    
    // ✅ useMemo/useCallback内での副作用を禁止（カスタムパターン）
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.name="useMemo"] > ArrowFunctionExpression > BlockStatement > :matches(ExpressionStatement > CallExpression[callee.object.name=/^set/], ExpressionStatement > AssignmentExpression)',
        message: '🚨 useMemo内でのstate更新は禁止です。無限レンダリングループの原因となります。useEffectを使用してください。'
      },
      {
        selector: 'CallExpression[callee.name="useCallback"] > ArrowFunctionExpression > BlockStatement > :matches(ExpressionStatement > CallExpression[callee.object.name=/^set/], ExpressionStatement > AssignmentExpression)',
        message: '⚠️ useCallback内でのstate更新は注意が必要です。適切な依存配列を設定してください。'
      },
      {
        selector: 'CallExpression[callee.name="useMemo"] > ArrowFunctionExpression > BlockStatement > :matches(ExpressionStatement > AwaitExpression, VariableDeclaration > VariableDeclarator > AwaitExpression)',
        message: '🚨 useMemo内での非同期処理は禁止です。同期的な計算のみ実行してください。'
      }
    ],
    
    // ✅ React Hooks使用時の厳格ルール
    'react-hooks/rules-of-hooks': 'error',
    
    // ✅ 基本的な品質ルール  
    'prefer-const': 'error',
    'no-var': 'error'
  },
}