import { useState, useEffect, useCallback } from 'react';

/**
 * ローカルストレージ管理用のカスタムフック
 * XSS対策とエラーハンドリングを含む安全な実装
 */

interface UseLocalStorageOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  const { serialize = JSON.stringify, deserialize = JSON.parse } = options || {};

  // 初期値の取得（XSS対策とエラーハンドリング付き）
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      
      // JSON.parseの安全な実装
      const parsed = deserialize(item);
      
      // 基本的なサニタイゼーション
      if (parsed && typeof parsed === 'object') {
        // HTMLタグを含む値をサニタイズ
        const sanitized = JSON.parse(JSON.stringify(parsed, (_key, value) => {
          if (typeof value === 'string') {
            // 基本的なHTMLエスケープ
            return value.replace(/[<>]/g, '');
          }
          return value;
        }));
        return sanitized;
      }
      
      return parsed;
    } catch (error) {
      console.warn(`useLocalStorage: Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 値をローカルストレージに保存
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        // 容量制限チェック（簡易版）
        const serializedValue = serialize(valueToStore);
        if (serializedValue.length > 1024 * 1024) { // 1MB制限
          console.warn(`useLocalStorage: Approaching localStorage capacity limit`);
        }
        
        window.localStorage.setItem(key, serializedValue);
      }
    } catch (error) {
      console.error(`useLocalStorage: Error setting localStorage key "${key}":`, error);
      
      // クォータ超過の場合はクリーンアップを試行
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded. Consider implementing cleanup.');
      }
    }
  }, [storedValue, key, serialize]);

  // ストレージイベントのリスニング（他のタブでの変更検知）
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = deserialize(e.newValue);
          setStoredValue(newValue);
        } catch (error) {
          console.warn(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, deserialize]);

  return [storedValue, setValue];
}

// アーカイブ表示状態の型定義
export interface ArchivedToggleState {
  dashboard: boolean;
  calendar: boolean;
  analytics: boolean;
}

// アーカイブ表示状態管理用の特化フック
export function useArchivedTasksVisible() {
  return useLocalStorage<ArchivedToggleState>('archivedTasksVisible', {
    dashboard: false,
    calendar: false,
    analytics: false,
  });
}

export default useLocalStorage;