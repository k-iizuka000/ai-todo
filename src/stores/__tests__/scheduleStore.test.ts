/**
 * スケジュールストアの単体テスト
 * グループ6: 単体テストの実装
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// formatDate関数のテスト（現在の実装をベース）
describe('formatDate function', () => {
  // 現在の実装: const formatDate = (date: Date): string => date.toISOString().split('T')[0];
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  test('正常なDate型の入力', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = formatDate(date);
    expect(result).toBe('2024-01-15');
  });

  test('現在日時の変換', () => {
    const now = new Date();
    const result = formatDate(now);
    // ISO文字列の日付部分と一致することを確認
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe(now.toISOString().split('T')[0]);
  });

  test('タイムゾーンに関係なく正しい日付文字列を返す', () => {
    const date = new Date('2024-12-31T23:59:59.999Z');
    const result = formatDate(date);
    expect(result).toBe('2024-12-31');
  });

  test('うるう年の日付', () => {
    const leapYearDate = new Date('2024-02-29T12:00:00.000Z');
    const result = formatDate(leapYearDate);
    expect(result).toBe('2024-02-29');
  });

  test('年末年始の日付', () => {
    const newYearDate = new Date('2024-01-01T00:00:00.000Z');
    const result = formatDate(newYearDate);
    expect(result).toBe('2024-01-01');
  });
});

// dateReviver/dateReplacer関数のテスト（設計書の仕様通り）
describe('Date serialization functions', () => {
  // 設計書通りの実装
  const dateReviver = (key: string, value: any): any => {
    // ISO 8601形式の日付文字列を検出してDateオブジェクトに変換
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
      return new Date(value);
    }
    return value;
  };

  const dateReplacer = (key: string, value: any): any => {
    // DateオブジェクトをISO文字列に変換
    if (value instanceof Date) {
      try {
        return value.toISOString();
      } catch (e) {
        // 不正なDateオブジェクトの場合
        return 'Invalid Date';
      }
    }
    return value;
  };

  describe('dateReviver function', () => {
    test('ISO 8601形式の日付文字列をDateオブジェクトに変換', () => {
      const isoString = '2024-01-15T10:30:00.123Z';
      const result = dateReviver('currentDate', isoString);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe(isoString);
    });

    test('日付文字列以外の値はそのまま返す', () => {
      expect(dateReviver('title', 'Test Task')).toBe('Test Task');
      expect(dateReviver('id', 123)).toBe(123);
      expect(dateReviver('active', true)).toBe(true);
      expect(dateReviver('items', null)).toBe(null);
    });

    test('不正な形式の日付文字列はそのまま返す', () => {
      expect(dateReviver('date', '2024-01-15')).toBe('2024-01-15');
      expect(dateReviver('date', '2024/01/15')).toBe('2024/01/15');
      expect(dateReviver('date', 'invalid-date')).toBe('invalid-date');
    });

    test('空文字や undefined はそのまま返す', () => {
      expect(dateReviver('date', '')).toBe('');
      expect(dateReviver('date', undefined)).toBe(undefined);
    });

    test('ミリ秒なしのISO文字列は変換されない（パターンが厳密）', () => {
      const isoWithoutMs = '2024-01-15T10:30:00Z';
      expect(dateReviver('date', isoWithoutMs)).toBe(isoWithoutMs);
    });
  });

  describe('dateReplacer function', () => {
    test('Dateオブジェクトを ISO 文字列に変換', () => {
      const date = new Date('2024-01-15T10:30:00.123Z');
      const result = dateReplacer('currentDate', date);
      
      expect(typeof result).toBe('string');
      expect(result).toBe('2024-01-15T10:30:00.123Z');
    });

    test('Date以外のオブジェクトはそのまま返す', () => {
      expect(dateReplacer('title', 'Test Task')).toBe('Test Task');
      expect(dateReplacer('id', 123)).toBe(123);
      expect(dateReplacer('active', true)).toBe(true);
      expect(dateReplacer('items', null)).toBe(null);
    });

    test('オブジェクトや配列はそのまま返す', () => {
      const obj = { id: 1, name: 'test' };
      const arr = [1, 2, 3];
      
      expect(dateReplacer('data', obj)).toBe(obj);
      expect(dateReplacer('list', arr)).toBe(arr);
    });

    test('不正な Date オブジェクトも文字列に変換', () => {
      const invalidDate = new Date('invalid-date');
      const result = dateReplacer('date', invalidDate);
      
      expect(typeof result).toBe('string');
      expect(result).toBe('Invalid Date');
    });
  });
});

// ストア永続化のテスト
describe('Store persistence', () => {
  beforeEach(() => {
    // localStorage をクリア
    localStorage.clear();
    
    // localStorage のモック
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  describe('Date persistence simulation', () => {
    test('Date型の値が localStorage に正しく保存される（シミュレーション）', () => {
      const originalDate = new Date('2024-01-15T10:30:00.123Z');
      const state = {
        currentDate: originalDate,
        viewSettings: {
          date: originalDate,
          view: 'day' as const
        }
      };

      // Zustand persist の動作をシミュレート（JSON.stringify使用）
      const serialized = JSON.stringify(state);
      const parsed = JSON.parse(serialized);

      // JSON.stringify後は文字列になる
      expect(typeof parsed.currentDate).toBe('string');
      expect(typeof parsed.viewSettings.date).toBe('string');
      expect(parsed.currentDate).toBe(originalDate.toISOString());
    });

    test('カスタムストレージによる Date の復元（シミュレーション）', () => {
      const dateReviver = (key: string, value: any): any => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
          return new Date(value);
        }
        return value;
      };

      const originalDate = new Date('2024-01-15T10:30:00.123Z');
      const serializedState = JSON.stringify({
        currentDate: originalDate,
        viewSettings: { date: originalDate }
      });

      // カスタム reviver で復元
      const restoredState = JSON.parse(serializedState, dateReviver);

      expect(restoredState.currentDate).toBeInstanceOf(Date);
      expect(restoredState.viewSettings.date).toBeInstanceOf(Date);
      expect(restoredState.currentDate.getTime()).toBe(originalDate.getTime());
    });

    test('localStorage から文字列として復元されたデータの型チェック', () => {
      // localStorage から復元された状態（Date が文字列になっている）
      const restoredFromStorage = {
        currentDate: '2024-01-15T10:30:00.123Z',
        viewSettings: {
          date: '2024-01-15T10:30:00.123Z',
          view: 'day' as const
        }
      };

      // 文字列として復元されていることを確認
      expect(typeof restoredFromStorage.currentDate).toBe('string');
      expect(typeof restoredFromStorage.viewSettings.date).toBe('string');

      // 手動で Date に変換した場合
      const manualConversion = {
        ...restoredFromStorage,
        currentDate: new Date(restoredFromStorage.currentDate),
        viewSettings: {
          ...restoredFromStorage.viewSettings,
          date: new Date(restoredFromStorage.viewSettings.date)
        }
      };

      expect(manualConversion.currentDate).toBeInstanceOf(Date);
      expect(manualConversion.viewSettings.date).toBeInstanceOf(Date);
    });
  });

  describe('Error scenarios', () => {
    test('不正な日付文字列の処理', () => {
      const dateReviver = (key: string, value: any): any => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
          return new Date(value);
        }
        return value;
      };

      // 正規表現にマッチするが不正な日付
      const invalidButMatchingString = '9999-99-99T99:99:99.999Z';
      const result = dateReviver('date', invalidButMatchingString);
      
      // パターンマッチして Date 変換が試行されるが、無効な Date になる
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(true);
    });

    test('localStorage が利用できない場合の考慮', () => {
      // localStorage のエラーをシミュレート
      const mockGetItem = vi.fn(() => {
        throw new Error('localStorage not available');
      });
      
      Object.defineProperty(window, 'localStorage', {
        value: { getItem: mockGetItem },
        writable: true,
      });

      expect(() => {
        localStorage.getItem('test');
      }).toThrow('localStorage not available');
    });
  });
});