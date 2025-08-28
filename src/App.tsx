import React, { useEffect } from 'react';
import AppRouter from './router/AppRouter';
import { QueryProvider } from './providers/QueryProvider';
import { useProjectStore } from './stores/projectStore';

const App: React.FC = () => {
  return (
    <QueryProvider>
      <AppContent />
    </QueryProvider>
  );
};

const AppContent: React.FC = () => {
  const loadMockData = useProjectStore(state => state.loadMockData);
  
  // アプリ起動時にモックデータを読み込む（互換性維持のため）
  useEffect(() => {
    // Hybrid版を使う場合は不要だが、既存コンポーネントとの互換性のため残す
    loadMockData();
  }, [loadMockData]);

  return <AppRouter />;
};

export default App;