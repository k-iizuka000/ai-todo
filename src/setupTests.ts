// テスト環境のセットアップファイル
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';

// jest-axeカスタムマッチャーを追加
expect.extend(toHaveNoViolations);

// テスト後のクリーンアップ
afterEach(() => {
  cleanup();
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

// React Router のモック
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' }),
  };
});

// crypto.randomUUID のモック（Node.js 環境用）
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
    random: () => Math.random(),
  },
});

// matchMedia のモック（jsdom環境用）
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});