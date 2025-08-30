/**
 * Core Web Vitals 測定フック（精度向上版）
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 * 
 * 厳格な目標値:
 * - LCP: < 1.0秒 (モーダル初期表示)
 * - FID: < 100ms (インタラクション応答)
 * - CLS: < 0.1 (レイアウトシフト)
 * - Bundle Size: < 50KB (TaskDetailModal chunk)
 * 
 * 機能強化:
 * - リアルタイム監視
 * - 詳細なパフォーマンス分析
 * - バンドルサイズ監視
 * - メトリクス履歴保持
 */

import { useEffect, useCallback, useRef } from 'react';
import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';

export interface CoreWebVitalsMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  // 新規追加: 詳細メトリクス
  modalLcp?: number;
  modalCls?: number;
  bundleSize?: number;
  renderTime?: number;
  interactionLatency?: number;
}

export interface PerformanceEntry {
  timestamp: number;
  metrics: CoreWebVitalsMetrics;
  context: string;
}

export interface PerformanceThresholds {
  lcp: { good: number; needsImprovement: number; poor: number };
  fid: { good: number; needsImprovement: number; poor: number };
  cls: { good: number; needsImprovement: number; poor: number };
  bundleSize: { good: number; needsImprovement: number; poor: number };
}

export interface CoreWebVitalsOptions {
  /** メトリクス収集を有効にするか */
  enabled?: boolean;
  /** パフォーマンス結果を報告するコールバック */
  onMetric?: (name: string, value: number, id: string, context?: string) => void;
  /** デバッグモード（コンソール出力を有効） */
  debug?: boolean;
  /** リアルタイム監視を有効にするか */
  realTimeMonitoring?: boolean;
  /** パフォーマンス履歴保持数 */
  historyLimit?: number;
  /** 監視対象のメトリクス */
  monitoredMetrics?: (keyof CoreWebVitalsMetrics)[];
  /** カスタム閾値 */
  customThresholds?: Partial<PerformanceThresholds>;
}

/**
 * Core Web Vitals を測定するカスタムフック
 * 
 * @param options - 測定オプション
 * @returns メトリクス値と測定開始関数
 */
// デフォルト閾値（設計書要件に基づく厳格化）
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  lcp: { good: 1000, needsImprovement: 2500, poor: 4000 }, // 1.0秒目標
  fid: { good: 100, needsImprovement: 300, poor: 500 },   // 100ms目標
  cls: { good: 0.1, needsImprovement: 0.25, poor: 0.5 },  // 0.1目標
  bundleSize: { good: 50000, needsImprovement: 100000, poor: 200000 }, // 50KB目標
};

export const useCoreWebVitals = (options: CoreWebVitalsOptions = {}) => {
  const { 
    enabled = true, 
    onMetric, 
    debug = false,
    realTimeMonitoring = true,
    historyLimit = 10,
    monitoredMetrics = ['lcp', 'fid', 'cls', 'modalLcp', 'modalCls'],
    customThresholds = {}
  } = options;
  
  const metricsRef = useRef<CoreWebVitalsMetrics>({});
  const historyRef = useRef<PerformanceEntry[]>([]);
  const isInitializedRef = useRef(false);
  const thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };

  // 高精度メトリクス処理関数
  const handleMetric = useCallback(
    (name: string, value: number, id: string, context: string = 'global') => {
      const roundedValue = Math.round(value * 100) / 100;
      const metricKey = name.toLowerCase().replace('-', '') as keyof CoreWebVitalsMetrics;

      // メトリクス値を保存
      const newMetrics = {
        ...metricsRef.current,
        [metricKey]: roundedValue,
      };
      metricsRef.current = newMetrics;

      // 履歴に追加（リアルタイム監視用）
      if (realTimeMonitoring) {
        const entry: PerformanceEntry = {
          timestamp: Date.now(),
          metrics: { [metricKey]: roundedValue },
          context
        };
        
        historyRef.current.push(entry);
        if (historyRef.current.length > historyLimit) {
          historyRef.current.shift();
        }
      }

      if (debug) {
        console.group(`🎯 Core Web Vitals - ${name}`);
        console.log(`Value: ${roundedValue}${name.includes('CLS') ? '' : 'ms'} (ID: ${id})`);
        console.log(`Context: ${context}`);
        
        // 詳細なステータス評価
        const threshold = getThresholdForMetric(metricKey);
        if (threshold) {
          const status = getPerformanceRating(roundedValue, threshold);
          const statusEmoji = status === 'good' ? '✅' : status === 'needs-improvement' ? '⚠️' : '❌';
          console.log(`Status: ${statusEmoji} ${status.toUpperCase()}`);
          console.log(`Thresholds: Good(${threshold.good}) | NeedsImprovement(${threshold.needsImprovement}) | Poor(${threshold.poor})`);
        }
        console.groupEnd();
      }

      // 外部コールバック呼び出し
      onMetric?.(name, roundedValue, id, context);
    },
    [onMetric, debug, realTimeMonitoring, historyLimit]
  );

  // 閾値取得ヘルパー
  const getThresholdForMetric = useCallback((metric: keyof CoreWebVitalsMetrics) => {
    const baseMetric = metric.replace('modal', '').toLowerCase();
    return thresholds[baseMetric as keyof PerformanceThresholds];
  }, [thresholds]);

  // パフォーマンス評価ヘルパー
  const getPerformanceRating = useCallback(
    (value: number, threshold: { good: number; needsImprovement: number; poor: number }) => {
      if (value <= threshold.good) return 'good';
      if (value <= threshold.needsImprovement) return 'needs-improvement';
      return 'poor';
    },
    []
  );

  // Core Web Vitals 測定開始
  const initializeMetrics = useCallback(() => {
    if (!enabled || isInitializedRef.current) return;

    isInitializedRef.current = true;

    try {
      // LCP (Largest Contentful Paint)
      onLCP((metric) => {
        handleMetric('LCP', metric.value, metric.id);
      });

      // FID (First Input Delay)
      onFID((metric) => {
        handleMetric('FID', metric.value, metric.id);
      });

      // CLS (Cumulative Layout Shift)
      onCLS((metric) => {
        handleMetric('CLS', metric.value, metric.id);
      });

      // FCP (First Contentful Paint)
      onFCP((metric) => {
        handleMetric('FCP', metric.value, metric.id);
      });

      // TTFB (Time to First Byte)
      onTTFB((metric) => {
        handleMetric('TTFB', metric.value, metric.id);
      });

      if (debug) {
        console.log('🚀 Core Web Vitals measurement initialized');
      }
    } catch (error) {
      console.error('❌ Core Web Vitals initialization failed:', error);
    }
  }, [enabled, handleMetric, debug]);

  // 初期化
  useEffect(() => {
    if (enabled) {
      initializeMetrics();
    }
  }, [enabled, initializeMetrics]);

  // 高精度モーダルLCP測定（設計書要件: < 1.0秒）
  const measureModalLCP = useCallback((modalElement: HTMLElement, context: string = 'modal') => {
    if (!enabled) return;

    const startTime = performance.now();
    let isComplete = false;
    
    // Intersection Observer による可視性監視
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isComplete) {
            const loadTime = performance.now() - startTime;
            handleMetric('Modal-LCP', loadTime, `modal-${Date.now()}`, context);
            isComplete = true;
            intersectionObserver.disconnect();
          }
        });
      },
      { threshold: 0.75 } // 75%表示で測定完了
    );

    intersectionObserver.observe(modalElement);

    // Mutation Observer による DOM 変更監視
    const mutationObserver = new MutationObserver(() => {
      if (!isComplete) {
        // 重要なコンテンツ（画像、タスク詳細）の読み込み完了チェック
        const images = modalElement.querySelectorAll('img');
        const allImagesLoaded = Array.from(images).every(img => img.complete);
        
        if (allImagesLoaded) {
          const loadTime = performance.now() - startTime;
          handleMetric('Modal-LCP', loadTime, `modal-content-${Date.now()}`, `${context}-content`);
          isComplete = true;
          mutationObserver.disconnect();
          intersectionObserver.disconnect();
        }
      }
    });

    mutationObserver.observe(modalElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'class']
    });

    // フォールバック：2秒後に強制測定
    const fallbackTimer = setTimeout(() => {
      if (!isComplete) {
        const fallbackTime = performance.now() - startTime;
        handleMetric('Modal-LCP-Fallback', fallbackTime, `modal-fallback-${Date.now()}`, `${context}-fallback`);
        isComplete = true;
        intersectionObserver.disconnect();
        mutationObserver.disconnect();
      }
    }, 2000);

    // クリーンアップ関数を返す
    return () => {
      clearTimeout(fallbackTimer);
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [enabled, handleMetric]);

  // 高精度インタラクション応答時間測定（設計書要件: < 100ms）
  const measureFID = useCallback((interactionType: string = 'click', context: string = 'interaction') => {
    if (!enabled) return;

    const startTime = performance.now();
    let isFirstInput = true;
    
    return () => {
      const endTime = performance.now();
      const fid = endTime - startTime;
      
      // First Input Delay の正確な測定
      if (isFirstInput) {
        handleMetric(`${interactionType}-FID`, fid, `${interactionType}-${Date.now()}`, context);
        isFirstInput = false;
        
        // 100ms閾値を超えた場合の詳細ログ
        if (fid > 100 && debug) {
          console.warn(
            `⚠️ FID target exceeded (${fid}ms > 100ms) for ${interactionType} in ${context}`
          );
        }
      }
      
      return fid;
    };
  }, [enabled, handleMetric, debug]);

  // CLS測定開始
  const measureCLS = useCallback((element: HTMLElement) => {
    if (!enabled) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (
            sessionValue &&
            entry.startTime - lastSessionEntry.startTime < 1000 &&
            entry.startTime - firstSessionEntry.startTime < 5000
          ) {
            sessionValue += (entry as any).value;
            sessionEntries.push(entry);
          } else {
            sessionValue = (entry as any).value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            handleMetric('Modal-CLS', clsValue, `modal-cls-${Date.now()}`);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // クリーンアップ関数を返す
    return () => {
      observer.disconnect();
    };
  }, [enabled, handleMetric]);

  // バンドルサイズ測定機能
  const measureBundleSize = useCallback(async (chunkName: string = 'task-detail-modal') => {
    if (!enabled || typeof window === 'undefined') return;
    
    try {
      if ('connection' in navigator && 'transferSize' in PerformanceResourceTiming.prototype) {
        const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const chunkEntries = resourceEntries.filter(entry => entry.name.includes(chunkName));
        
        let totalSize = 0;
        chunkEntries.forEach(entry => {
          totalSize += entry.transferSize || entry.encodedBodySize || 0;
        });
        
        if (totalSize > 0) {
          handleMetric('Bundle-Size', totalSize, `bundle-${chunkName}-${Date.now()}`, 'bundle-analysis');
          
          if (debug) {
            console.log(`📦 Bundle Size Analysis for ${chunkName}:`);
            console.log(`  Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
            console.log(`  Target: < 50 KB`);
            console.log(`  Status: ${totalSize < 50000 ? '✅ Good' : '⚠️ Needs Optimization'}`);
          }
        }
      }
    } catch (error) {
      if (debug) {
        console.warn('Bundle size measurement failed:', error);
      }
    }
  }, [enabled, handleMetric, debug]);

  // パフォーマンス監査機能
  const auditPerformance = useCallback(() => {
    const currentMetrics = metricsRef.current;
    const audit: Record<string, { value: number; rating: string; target: number }> = {};
    
    Object.entries(currentMetrics).forEach(([key, value]) => {
      if (value !== undefined) {
        const threshold = getThresholdForMetric(key as keyof CoreWebVitalsMetrics);
        if (threshold) {
          const rating = getPerformanceRating(value, threshold);
          audit[key] = {
            value,
            rating,
            target: threshold.good
          };
        }
      }
    });
    
    return audit;
  }, [getThresholdForMetric, getPerformanceRating]);

  // リアルタイム監視状態取得
  const getMonitoringState = useCallback(() => {
    return {
      metrics: metricsRef.current,
      history: historyRef.current.slice(-5), // 最新5件
      isMonitoring: realTimeMonitoring && enabled,
      thresholds,
      audit: auditPerformance()
    };
  }, [realTimeMonitoring, enabled, thresholds, auditPerformance]);

  return {
    // 基本メトリクス
    metrics: metricsRef.current,
    
    // 測定関数
    measureModalLCP,
    measureFID,
    measureCLS,
    measureBundleSize,
    initializeMetrics,
    
    // 分析・監視機能
    auditPerformance,
    getMonitoringState,
    getPerformanceRating,
    getThresholdForMetric,
    
    // 設定・状態
    thresholds,
    enabled,
    realTimeMonitoring
  };
};

export default useCoreWebVitals;