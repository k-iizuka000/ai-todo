/**
 * Core Web Vitals監視フック
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 * LCP < 1.2秒, FID < 100ms, CLS < 0.1の要件を監視
 */

import { useEffect, useState, useCallback } from 'react';

// Web Vitals メトリクス型定義
export interface WebVitalsMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay  
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

// パフォーマンス閾値定義（設計書要件）
export const PERFORMANCE_THRESHOLDS = {
  lcp: 1200, // 1.2秒
  fid: 100,  // 100ms
  cls: 0.1,  // 0.1
  fcp: 1800, // 1.8秒
  ttfb: 800, // 800ms
} as const;

// メトリクス評価結果
export interface MetricEvaluation {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: number;
}

/**
 * Core Web Vitalsを監視するフック
 */
export const useWebVitals = () => {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({});
  const [isLoading, setIsLoading] = useState(true);

  // メトリクス評価関数
  const evaluateMetric = useCallback((
    name: keyof typeof PERFORMANCE_THRESHOLDS,
    value: number
  ): MetricEvaluation => {
    const threshold = PERFORMANCE_THRESHOLDS[name];
    let rating: 'good' | 'needs-improvement' | 'poor';

    switch (name) {
      case 'lcp':
        rating = value <= 2500 ? (value <= 1200 ? 'good' : 'needs-improvement') : 'poor';
        break;
      case 'fid':
        rating = value <= 300 ? (value <= 100 ? 'good' : 'needs-improvement') : 'poor';
        break;
      case 'cls':
        rating = value <= 0.25 ? (value <= 0.1 ? 'good' : 'needs-improvement') : 'poor';
        break;
      case 'fcp':
        rating = value <= 3000 ? (value <= 1800 ? 'good' : 'needs-improvement') : 'poor';
        break;
      case 'ttfb':
        rating = value <= 1500 ? (value <= 800 ? 'good' : 'needs-improvement') : 'poor';
        break;
      default:
        rating = 'good';
    }

    return { value, rating, threshold };
  }, []);

  // Web Vitals測定
  useEffect(() => {
    const measureWebVitals = async () => {
      try {
        // web-vitalsライブラリの動的インポート
        const webVitalsModule = await import('web-vitals');
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitalsModule;

        const newMetrics: WebVitalsMetrics = {};

        // 各メトリクスを測定
        getCLS((metric) => {
          newMetrics.cls = metric.value;
          setMetrics(prev => ({ ...prev, cls: metric.value }));
        });

        getFID((metric) => {
          newMetrics.fid = metric.value;
          setMetrics(prev => ({ ...prev, fid: metric.value }));
        });

        getFCP((metric) => {
          newMetrics.fcp = metric.value;
          setMetrics(prev => ({ ...prev, fcp: metric.value }));
        });

        getLCP((metric) => {
          newMetrics.lcp = metric.value;
          setMetrics(prev => ({ ...prev, lcp: metric.value }));
        });

        getTTFB((metric) => {
          newMetrics.ttfb = metric.value;
          setMetrics(prev => ({ ...prev, ttfb: metric.value }));
        });

        setIsLoading(false);
      } catch (error) {
        console.warn('Web Vitals measurement failed:', error);
        setIsLoading(false);
      }
    };

    // ページロード完了後に測定開始
    if (document.readyState === 'complete') {
      measureWebVitals();
    } else {
      window.addEventListener('load', measureWebVitals);
      return () => window.removeEventListener('load', measureWebVitals);
    }
  }, []);

  // パフォーマンス評価
  const evaluatePerformance = useCallback(() => {
    const evaluations: Record<string, MetricEvaluation> = {};

    Object.entries(metrics).forEach(([key, value]) => {
      if (value !== undefined && key in PERFORMANCE_THRESHOLDS) {
        evaluations[key] = evaluateMetric(
          key as keyof typeof PERFORMANCE_THRESHOLDS,
          value
        );
      }
    });

    return evaluations;
  }, [metrics, evaluateMetric]);

  // 全体的なパフォーマンススコア計算
  const getOverallScore = useCallback(() => {
    const evaluations = evaluatePerformance();
    const scores = Object.values(evaluations);
    
    if (scores.length === 0) return null;

    const goodCount = scores.filter(s => s.rating === 'good').length;
    const totalCount = scores.length;
    
    return Math.round((goodCount / totalCount) * 100);
  }, [evaluatePerformance]);

  // 300ms要件チェック（設計書要件）
  const checkPerformanceRequirements = useCallback(() => {
    const { lcp, fid, cls } = metrics;
    
    return {
      lcp: lcp !== undefined ? lcp <= PERFORMANCE_THRESHOLDS.lcp : null,
      fid: fid !== undefined ? fid <= PERFORMANCE_THRESHOLDS.fid : null,
      cls: cls !== undefined ? cls <= PERFORMANCE_THRESHOLDS.cls : null,
      overall: lcp !== undefined && fid !== undefined && cls !== undefined
        ? lcp <= PERFORMANCE_THRESHOLDS.lcp && 
          fid <= PERFORMANCE_THRESHOLDS.fid && 
          cls <= PERFORMANCE_THRESHOLDS.cls
        : null,
    };
  }, [metrics]);

  return {
    metrics,
    isLoading,
    evaluatePerformance,
    getOverallScore,
    checkPerformanceRequirements,
    thresholds: PERFORMANCE_THRESHOLDS,
  };
};

/**
 * パフォーマンス監視とアラートのフック
 */
export const usePerformanceMonitor = (options?: {
  alertThreshold?: number;
  onAlert?: (metric: string, value: number) => void;
}) => {
  const { metrics, checkPerformanceRequirements } = useWebVitals();
  const { alertThreshold = 80, onAlert } = options || {};

  useEffect(() => {
    const requirements = checkPerformanceRequirements();
    
    // パフォーマンス要件チェック
    Object.entries(requirements).forEach(([metric, passes]) => {
      if (passes === false) {
        const value = metrics[metric as keyof WebVitalsMetrics];
        if (value !== undefined) {
          onAlert?.(metric, value);
        }
      }
    });
  }, [metrics, checkPerformanceRequirements, onAlert]);

  return {
    metrics,
    requirements: checkPerformanceRequirements(),
  };
};

export default useWebVitals;