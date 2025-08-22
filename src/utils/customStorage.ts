/**
 * Zustand用カスタムストレージ実装
 * Date型オブジェクトのシリアライズ/デシリアライズを適切に処理する
 */

import { createJSONStorage } from 'zustand/middleware';

/**
 * JSON.parseのreviver関数
 * ISO 8601形式の日付文字列を検出してDateオブジェクトに変換
 */
const dateReviver = (_key: string, value: any): any => {
  // ISO 8601形式の日付文字列を検出してDateオブジェクトに変換
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
    try {
      return new Date(value);
    } catch (error) {
      console.error('Failed to parse date:', value, error);
      return value;
    }
  }
  return value;
};

/**
 * JSON.stringifyのreplacer関数
 * DateオブジェクトをISO文字列に変換
 */
const dateReplacer = (_key: string, value: any): any => {
  // DateオブジェクトをISO文字列に変換
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
};

/**
 * Date型を適切に処理するカスタムストレージ
 */
export const customStorage = createJSONStorage(() => localStorage, {
  reviver: dateReviver,
  replacer: dateReplacer
});