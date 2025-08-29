/**
 * パフォーマンス関連の型定義
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 */

// Performance API の型定義
export interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  toJSON(): object;
}

export interface PerformanceMeasure extends PerformanceEntry {
  entryType: 'measure';
  detail?: any;
}

export interface PerformanceObserverEntryList {
  getEntries(): PerformanceEntry[];
  getEntriesByType(type: string): PerformanceEntry[];
  getEntriesByName(name: string, type?: string): PerformanceEntry[];
}

// Web Vitals 関連型定義
export interface Metric {
  name: string;
  value: number;
  delta: number;
  entries: PerformanceEntry[];
  id: string;
  navigationType: string;
}

export interface ReportHandler {
  (metric: Metric): void;
}

// パフォーマンス監視設定
export interface PerformanceConfig {
  reportAllChanges?: boolean;
  durationThreshold?: number;
}

export type WebVitalMetric = 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';

export interface WebVitalThresholds {
  good: number;
  needsImprovement: number;
  poor: number;
}