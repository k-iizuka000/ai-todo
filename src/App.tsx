import React, { useEffect } from 'react';
import AppRouter from '@/router/AppRouter';
import { useProjectStore } from '@/stores/projectStore';

const App: React.FC = () => {
  const loadMockData = useProjectStore(state => state.loadMockData);
  
  // アプリ起動時にモックデータを読み込む
  useEffect(() => {
    loadMockData();
  }, [loadMockData]);

  return <AppRouter />;
};

export default App;