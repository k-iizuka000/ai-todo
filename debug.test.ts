import { useTaskStore } from './src/stores/taskStore';

// ストアから利用可能な関数を確認
const store = useTaskStore.getState();
console.log('Available functions:', Object.keys(store));
console.log('resetStore exists:', typeof store.resetStore);