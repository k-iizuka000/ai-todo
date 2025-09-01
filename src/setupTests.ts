/**
 * テスト環境のセットアップ
 * Jest/Vitest用の共通設定
 */

import '@testing-library/jest-dom';
import { expect, vi } from 'vitest';
import { registerCustomMatchers } from './hooks/__tests__/testUtils';
import React from 'react';

// カスタムマッチャーの登録
registerCustomMatchers();

// Performance APIのモック
Object.defineProperty(global, 'performance', {
  value: {
    ...performance,
    now: vi.fn().mockReturnValue(Date.now()),
    memory: {
      usedJSHeapSize: 10 * 1024 * 1024,
      totalJSHeapSize: 50 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024
    },
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([]),
    getEntriesByType: vi.fn().mockReturnValue([])
  },
  configurable: true
});

// PerformanceObserver のモック（完全修正版）
const createMockObserver = (callback: any) => {
  const mockObserver = {
    observe: vi.fn(),
    disconnect: vi.fn(), // 確実にfunctionとして定義
    takeRecords: vi.fn().mockReturnValue([])
  };
  
  // callback関数をモック（必要に応じて）
  if (typeof callback === 'function') {
    mockObserver.observe = vi.fn().mockImplementation(() => {
      // エントリが追加されたときのシミュレート
      setTimeout(() => {
        try {
          callback({
            getEntries: () => [{
              name: 'useKanbanTasks-filtering',
              duration: 10,
              entryType: 'measure'
            }]
          });
        } catch (error) {
          // コールバックエラーを無視
        }
      }, 0);
    });
  }
  
  return mockObserver;
};

// グローバルにPerformanceObserverを設定
global.PerformanceObserver = vi.fn().mockImplementation(createMockObserver);

// PerformanceObserverをグローバルとして再定義（確実にアクセス可能にする）
Object.defineProperty(global, 'PerformanceObserver', {
  value: vi.fn().mockImplementation(createMockObserver),
  writable: true,
  configurable: true
});

// windowオブジェクトにもPerformanceObserverを追加
Object.defineProperty(window, 'PerformanceObserver', {
  value: vi.fn().mockImplementation(createMockObserver),
  writable: true,
  configurable: true
});

// IntersectionObserver のモック
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn().mockReturnValue([])
}));

// ResizeObserver のモック
global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// requestIdleCallback のモック
global.requestIdleCallback = vi.fn().mockImplementation((callback) => {
  return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 0);
});

global.cancelIdleCallback = vi.fn().mockImplementation((id) => {
  clearTimeout(id);
});

// matchMedia のモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// sessionStorage のモック
Object.defineProperty(window, 'sessionStorage', {
  value: { ...localStorageMock }
});

// クリップボード API のモック
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('')
  }
});

// Web Vitals のモック
vi.mock('web-vitals', () => ({
  getCLS: vi.fn(),
  getFID: vi.fn(),
  getFCP: vi.fn(),
  getLCP: vi.fn(),
  getTTFB: vi.fn()
}));

// React DnD のモック
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => children,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false
  }),
  DragOverlay: ({ children }: any) => children
}));

// React Query のモック
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: any) => children
}));

// React Router のモック
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  useParams: () => ({}),
  BrowserRouter: ({ children }: any) => children,
  Routes: ({ children }: any) => children,
  Route: ({ children }: any) => children,
  Link: ({ children, ...props }: any) => React.createElement('a', props, children)
}));

// React Hot Toast のモック
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  },
  Toaster: () => null
}));

// Lucide React アイコンのモック
vi.mock('lucide-react', () => {
  const MockIcon = ({ children, ...props }: any) => 
    React.createElement('svg', { ...props, 'data-testid': 'mock-icon' }, children);
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (typeof prop === 'string') {
        return MockIcon;
      }
      return target[prop as keyof typeof target];
    }
  });
});

// Zustandのテスト用モック
const mockStore = {
  getState: vi.fn(),
  setState: vi.fn(),
  subscribe: vi.fn(),
  destroy: vi.fn(),
};

// Zustandストアのモック
vi.mock('./stores/tagStore', () => ({
  useTagStore: vi.fn(() => mockStore),
}));

vi.mock('./stores/taskStore', () => ({
  useTaskStore: vi.fn(() => mockStore),
}));

// crypto.randomUUID のモック（Node.js 環境用）
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
    random: () => Math.random(),
  },
});

// エラーハンドリングの設定
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// テスト実行前の環境変数設定
process.env.NODE_ENV = 'test';