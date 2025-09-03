import React, { useEffect } from 'react';
import AppRouter from './router/AppRouter';
import { QueryProvider } from './providers/QueryProvider';
import { AccessibilityProvider } from './providers/AccessibilityProvider';
import { useProjectStore } from './stores/projectStore';

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AccessibilityProvider
        initialConfig={{
          keyboardNavigation: true,
          enhancedFocus: true,
          reducedMotion: false,
          highContrast: false,
          largeTouchTargets: false
        }}
        storageKey="ai-todo-accessibility"
      >
        <AppContent />
      </AccessibilityProvider>
    </QueryProvider>
  );
};

const AppContent: React.FC = () => {
  // モックデータ読み込み機能は削除（projectStoreからloadMockData関数が削除されたため）
  // 必要に応じてプロジェクト一覧を読み込む処理に置き換え可能
  
  return <AppRouter />;
};

export default App;