import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * クラス名をマージするユーティリティ関数
 * clsxとtailwind-mergeを組み合わせて使用
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 2つの日付が同じ日かどうかを判定する関数
 * @param date1 - 比較する日付1
 * @param date2 - 比較する日付2
 * @returns 同じ日の場合true、それ以外はfalse
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}