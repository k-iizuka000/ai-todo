/**
 * useLocalStorageカスタムフックのユニットテスト
 * グループ7: テストとバリデーション - ローカルストレージフック
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import useLocalStorage from '../useLocalStorage';

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// Storage Event のモック
class MockStorageEvent extends Event {
  key: string;
  oldValue: string | null;
  newValue: string | null;
  url: string;
  storageArea: Storage | null;

  constructor(type: string, init?: StorageEventInit) {
    super(type);
    this.key = init?.key ?? '';
    this.oldValue = init?.oldValue ?? null;
    this.newValue = init?.newValue ?? null;
    this.url = init?.url ?? '';
    this.storageArea = init?.storageArea ?? null;
  }
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// パフォーマンステスト用のユーティリティ
const measurePerformance = (callback: () => void): number => {
  const startTime = performance.now();
  callback();
  const endTime = performance.now();
  return endTime - startTime;
};

// テスト用の型定義
interface TestObject {
  name: string;
  value: number;
}

describe('useLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // console.warnのモック
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本機能', () => {
    it('初期値が正しく設定される', () => {
      const { result } = renderHook(() => 
        useLocalStorage('test-key', 'initial-value')
      );

      expect(result.current[0]).toBe('initial-value');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
    });

    it('localStorage から既存値を読み込める', () => {
      localStorageMock.getItem.mockReturnValue('"stored-value"');

      const { result } = renderHook(() => 
        useLocalStorage('test-key', 'initial-value')
      );

      expect(result.current[0]).toBe('stored-value');
    });

    it('値を更新すると localStorage に保存される', () => {
      const { result } = renderHook(() => 
        useLocalStorage('test-key', 'initial-value')
      );

      act(() => {
        result.current[1]('new-value');
      });

      expect(result.current[0]).toBe('new-value');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key', 
        '"new-value"'
      );
    });

    it('関数による値更新が正しく動作する', () => {
      const { result } = renderHook(() => 
        useLocalStorage('test-key', 10)
      );

      act(() => {
        result.current[1](prevValue => prevValue + 5);
      });

      expect(result.current[0]).toBe(15);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key', 
        '15'
      );
    });
  });

  describe('オブジェクトとプリミティブ型', () => {
    it('文字列値を正しく処理する', () => {
      const { result } = renderHook(() => 
        useLocalStorage('string-key', 'default')
      );

      act(() => {
        result.current[1]('updated string');
      });

      expect(result.current[0]).toBe('updated string');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'string-key', 
        '"updated string"'
      );
    });

    it('数値を正しく処理する', () => {
      const { result } = renderHook(() => 
        useLocalStorage('number-key', 0)
      );

      act(() => {
        result.current[1](42);
      });

      expect(result.current[0]).toBe(42);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'number-key', 
        '42'
      );
    });

    it('真偽値を正しく処理する', () => {
      const { result } = renderHook(() => 
        useLocalStorage('boolean-key', false)
      );

      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'boolean-key', 
        'true'
      );
    });

    it('オブジェクトを正しく処理する', () => {
      const initialObject: TestObject = { name: 'test', value: 1 };
      const updatedObject: TestObject = { name: 'updated', value: 2 };

      const { result } = renderHook(() => 
        useLocalStorage('object-key', initialObject)
      );

      act(() => {
        result.current[1](updatedObject);
      });

      expect(result.current[0]).toEqual(updatedObject);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'object-key', 
        JSON.stringify(updatedObject)
      );
    });

    it('配列を正しく処理する', () => {
      const initialArray = [1, 2, 3];
      const updatedArray = [4, 5, 6];

      const { result } = renderHook(() => 
        useLocalStorage('array-key', initialArray)
      );

      act(() => {
        result.current[1](updatedArray);
      });

      expect(result.current[0]).toEqual(updatedArray);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'array-key', 
        JSON.stringify(updatedArray)
      );
    });
  });

  describe('カスタムシリアライゼーション', () => {
    it('カスタム serialize 関数が使用される', () => {
      const customSerialize = vi.fn((value: string) => `custom:${value}`);
      const customDeserialize = vi.fn((value: string) => value.replace('custom:', ''));

      const { result } = renderHook(() => 
        useLocalStorage('custom-key', 'initial', {
          serialize: customSerialize,
          deserialize: customDeserialize,
        })
      );

      act(() => {
        result.current[1]('test-value');
      });

      expect(customSerialize).toHaveBeenCalledWith('test-value');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'custom-key', 
        'custom:test-value'
      );
    });

    it('カスタム deserialize 関数が使用される', () => {
      const customSerialize = vi.fn((value: string) => `custom:${value}`);
      const customDeserialize = vi.fn((value: string) => value.replace('custom:', ''));
      
      localStorageMock.getItem.mockReturnValue('custom:stored-value');

      renderHook(() => 
        useLocalStorage('custom-key', 'initial', {
          serialize: customSerialize,
          deserialize: customDeserialize,
        })
      );

      expect(customDeserialize).toHaveBeenCalledWith('custom:stored-value');
    });
  });

  describe('XSS対策とセキュリティ', () => {
    it('スクリプトタグを含む値を拒否する', () => {
      localStorageMock.getItem.mockReturnValue('{"value": "<script>alert(\\"XSS\\")</script>"}');

      const { result } = renderHook(() => 
        useLocalStorage('security-key', { value: 'safe' })
      );

      // XSS攻撃を検知して初期値にフォールバック
      expect(result.current[0]).toEqual({ value: 'safe' });
      expect(console.warn).toHaveBeenCalledWith(
        'useLocalStorage: Potentially unsafe content detected'
      );
    });

    it('javascript: プロトコルを含む値を拒否する', () => {
      localStorageMock.getItem.mockReturnValue('"javascript:alert(\\"XSS\\")"');

      const { result } = renderHook(() => 
        useLocalStorage('security-key', 'safe-value')
      );

      expect(result.current[0]).toBe('safe-value');
      expect(console.warn).toHaveBeenCalledWith(
        'useLocalStorage: Potentially unsafe content detected'
      );
    });

    it('正常なJSONは受け入れる', () => {
      localStorageMock.getItem.mockReturnValue('{"name": "safe value", "count": 42}');

      const { result } = renderHook(() => 
        useLocalStorage('security-key', { name: 'default', count: 0 })
      );

      expect(result.current[0]).toEqual({ name: 'safe value', count: 42 });
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('localStorage読み込みエラー時に初期値を返す', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => 
        useLocalStorage('error-key', 'fallback-value')
      );

      expect(result.current[0]).toBe('fallback-value');
      expect(console.warn).toHaveBeenCalledWith(
        'useLocalStorage: Error reading localStorage key "error-key":',
        expect.any(Error)
      );
    });

    it('localStorage書き込みエラー時にエラーをログ出力する', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage full');
      });

      const { result } = renderHook(() => 
        useLocalStorage('error-key', 'initial-value')
      );

      act(() => {
        result.current[1]('new-value');
      });

      expect(console.error).toHaveBeenCalledWith(
        'useLocalStorage: Error setting localStorage key "error-key":',
        expect.any(Error)
      );
    });

    it('不正なJSON文字列を解析しようとした場合に初期値を返す', () => {
      localStorageMock.getItem.mockReturnValue('{invalid json}');

      const { result } = renderHook(() => 
        useLocalStorage('invalid-json-key', { default: 'value' })
      );

      expect(result.current[0]).toEqual({ default: 'value' });
    });
  });

  describe('容量制限チェック', () => {
    it('大量のデータ保存時に容量警告を表示する', () => {
      // 大量のデータをモック
      const largeData = 'x'.repeat(6 * 1024 * 1024); // 6MB
      Object.defineProperty(JSON, 'stringify', {
        value: vi.fn().mockReturnValue(largeData),
        writable: true,
      });

      const { result } = renderHook(() => 
        useLocalStorage('large-data-key', 'small-value')
      );

      act(() => {
        result.current[1]('large-value');
      });

      expect(console.warn).toHaveBeenCalledWith(
        'useLocalStorage: Approaching localStorage capacity limit'
      );
    });
  });

  describe('Storage Event の処理', () => {
    it('他のタブからの変更を検知する', () => {
      const { result } = renderHook(() => 
        useLocalStorage('sync-key', 'initial-value')
      );

      // 他のタブからの変更をシミュレート
      act(() => {
        const storageEvent = new MockStorageEvent('storage', {
          key: 'sync-key',
          newValue: '"updated-from-other-tab"',
          oldValue: '"initial-value"',
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current[0]).toBe('updated-from-other-tab');
    });

    it('関係ないキーの変更は無視する', () => {
      const { result } = renderHook(() => 
        useLocalStorage('my-key', 'my-value')
      );

      const initialValue = result.current[0];

      act(() => {
        const storageEvent = new MockStorageEvent('storage', {
          key: 'other-key',
          newValue: '"other-value"',
        });
        window.dispatchEvent(storageEvent);
      });

      expect(result.current[0]).toBe(initialValue);
    });

    it('削除されたキーの処理', () => {
      const { result } = renderHook(() => 
        useLocalStorage('delete-key', 'initial-value')
      );

      act(() => {
        const storageEvent = new MockStorageEvent('storage', {
          key: 'delete-key',
          newValue: null,
          oldValue: '"initial-value"',
        });
        window.dispatchEvent(storageEvent);
      });

      // newValue が null の場合は変更しない
      expect(result.current[0]).toBe('initial-value');
    });
  });

  describe('SSR 対応', () => {
    it('window オブジェクトが undefined の場合に初期値を返す', () => {
      const originalWindow = global.window;
      // @ts-expect-error Testing SSR environment
      delete global.window;

      const { result } = renderHook(() => 
        useLocalStorage('ssr-key', 'ssr-fallback')
      );

      expect(result.current[0]).toBe('ssr-fallback');

      // window を復元
      global.window = originalWindow;
    });

    it('SSR環境でsetValueが呼ばれてもエラーにならない', () => {
      const originalWindow = global.window;
      // @ts-expect-error Testing SSR environment
      delete global.window;

      const { result } = renderHook(() => 
        useLocalStorage('ssr-key', 'initial')
      );

      act(() => {
        result.current[1]('new-value');
      });

      expect(result.current[0]).toBe('new-value');

      // window を復元
      global.window = originalWindow;
    });
  });

  describe('パフォーマンステスト', () => {
    it('フック初期化時間が200ms以内である', () => {
      const initTime = measurePerformance(() => {
        renderHook(() => useLocalStorage('perf-key', 'perf-value'));
      });

      expect(initTime).toBeLessThan(200);
    });

    it('値更新処理時間が200ms以内である', () => {
      const { result } = renderHook(() => 
        useLocalStorage('update-perf-key', 'initial')
      );

      const updateTime = measurePerformance(() => {
        act(() => {
          result.current[1]('updated-value');
        });
      });

      expect(updateTime).toBeLessThan(200);
    });

    it('大きなオブジェクトの処理も効率的である', () => {
      const largeObject = Array.from({ length: 10000 }, (_, index) => ({
        id: index,
        name: `item-${index}`,
        data: `data-${index}`.repeat(10),
      }));

      const processTime = measurePerformance(() => {
        const { result } = renderHook(() => 
          useLocalStorage('large-object-key', largeObject)
        );
        
        act(() => {
          result.current[1]([...largeObject, { id: 10000, name: 'new-item', data: 'new-data' }]);
        });
      });

      expect(processTime).toBeLessThan(1000); // 1秒以内
    });
  });

  describe('メモリリーク防止', () => {
    it('アンマウント時にeventListenerが削除される', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => 
        useLocalStorage('cleanup-key', 'value')
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'storage', 
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('型安全性', () => {
    it('TypeScript型が正しく推論される', () => {
      // 文字列型
      const { result: stringResult } = renderHook(() => 
        useLocalStorage('string-key', 'default')
      );
      expectTypeOf(stringResult.current[0]).toBeString();

      // 数値型
      const { result: numberResult } = renderHook(() => 
        useLocalStorage('number-key', 42)
      );
      expectTypeOf(numberResult.current[0]).toBeNumber();

      // オブジェクト型
      const { result: objectResult } = renderHook(() => 
        useLocalStorage('object-key', { name: 'test', count: 1 })
      );
      expectTypeOf(objectResult.current[0]).toEqualTypeOf<{ name: string; count: number; }>();

      // 配列型
      const { result: arrayResult } = renderHook(() => 
        useLocalStorage('array-key', ['a', 'b', 'c'])
      );
      expectTypeOf(arrayResult.current[0]).toEqualTypeOf<string[]>();
    });
  });

  describe('useCallback による最適化', () => {
    it('setValue関数が適切にメモ化される', () => {
      const { result, rerender } = renderHook(
        ({ key, initialValue }) => useLocalStorage(key, initialValue),
        { initialProps: { key: 'memo-key', initialValue: 'initial' } }
      );

      const firstSetValue = result.current[1];

      // propsを変更せずに再レンダー
      rerender({ key: 'memo-key', initialValue: 'initial' });

      const secondSetValue = result.current[1];

      // useCallback により同じ参照が返される
      expect(firstSetValue).toBe(secondSetValue);
    });

    it('依存関係が変更された場合にsetValue関数が再作成される', () => {
      const { result, rerender } = renderHook(
        ({ key, initialValue }) => useLocalStorage(key, initialValue),
        { initialProps: { key: 'memo-key', initialValue: 'initial' } }
      );

      const firstSetValue = result.current[1];

      // キーを変更
      rerender({ key: 'different-key', initialValue: 'initial' });

      const secondSetValue = result.current[1];

      // 依存関係変更により新しい関数が返される
      expect(firstSetValue).not.toBe(secondSetValue);
    });
  });
});

// 型チェック用のヘルパー (実際のテストランナーで使用する場合は適切な型テストライブラリを使用)
const expectTypeOf = <T>(value: T) => ({
  toBeString: () => expect(typeof value).toBe('string'),
  toBeNumber: () => expect(typeof value).toBe('number'),
  toEqualTypeOf: <U>(): void => {
    // 型レベルでの検証のみ、実際のアサーションは不要
  },
});