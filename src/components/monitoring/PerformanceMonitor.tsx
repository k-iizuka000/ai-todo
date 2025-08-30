/**
 * リアルタイムパフォーマンス監視コンポーネント
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 * 
 * 機能:
 * - Core Web Vitals のリアルタイム監視
 * - Bundle Size の継続監視
 * - パフォーマンス劣化の早期検出とアラート
 * - デバッグ用パフォーマンスダッシュボード
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCoreWebVitals } from '../../hooks/useCoreWebVitals';
import { BundleSizeMonitor, generateBundleReport } from '../../utils/bundleAnalyzer';

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error';
  metric: string;
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
}

interface PerformanceMonitorProps {
  /** 監視を有効にするか */
  enabled?: boolean;
  /** デバッグモード（詳細表示） */
  debugMode?: boolean;
  /** アラートを表示するか */
  showAlerts?: boolean;
  /** 監視間隔（ms） */
  monitoringInterval?: number;
}

/**
 * パフォーマンス監視コンポーネント
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = true,
  debugMode = process.env.NODE_ENV === 'development',
  showAlerts = true,
  monitoringInterval = 5000
}) => {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [bundleReport, setBundleReport] = useState<string>('');
  const [isMonitoring, setIsMonitoring] = useState(enabled);

  // Core Web Vitals監視
  const { 
    metrics, 
    getMonitoringState, 
    auditPerformance,
    thresholds 
  } = useCoreWebVitals({
    enabled: isMonitoring,
    debug: debugMode,
    realTimeMonitoring: true,
    onMetric: handleMetricUpdate
  });

  // メトリクス更新時のアラート判定
  function handleMetricUpdate(name: string, value: number, id: string, context?: string) {
    const alertThreshold = getThreshold(name);
    if (alertThreshold && value > alertThreshold.needsImprovement) {
      const alert: PerformanceAlert = {
        id: `${name}-${Date.now()}`,
        type: value > alertThreshold.poor ? 'error' : 'warning',
        metric: name,
        message: generateAlertMessage(name, value, alertThreshold.good),
        timestamp: Date.now(),
        value,
        threshold: alertThreshold.good
      };

      setAlerts(prev => [alert, ...prev.slice(0, 9)]); // 最新10件まで保持
    }
  }

  // 閾値取得ヘルパー
  const getThreshold = useCallback((metricName: string) => {
    const lowerName = metricName.toLowerCase().replace(/[^a-z]/g, '');
    if (lowerName.includes('lcp')) return thresholds.lcp;
    if (lowerName.includes('fid')) return thresholds.fid;
    if (lowerName.includes('cls')) return thresholds.cls;
    return null;
  }, [thresholds]);

  // アラートメッセージ生成
  const generateAlertMessage = useCallback((metric: string, value: number, threshold: number): string => {
    const unit = metric.toLowerCase().includes('cls') ? '' : 'ms';
    const exceeds = metric.toLowerCase().includes('cls') 
      ? (value - threshold).toFixed(3)
      : Math.round(value - threshold);
    
    return `${metric} (${value}${unit}) exceeds target by ${exceeds}${unit}`;
  }, []);

  // Bundle分析の定期実行
  useEffect(() => {
    if (!isMonitoring) return;

    const runBundleAnalysis = async () => {
      try {
        const report = await generateBundleReport();
        setBundleReport(report);
      } catch (error) {
        console.warn('Bundle analysis failed:', error);
      }
    };

    // 初回実行
    runBundleAnalysis();

    // 定期実行
    const interval = setInterval(runBundleAnalysis, monitoringInterval * 4); // Bundle分析は頻度を下げる

    return () => clearInterval(interval);
  }, [isMonitoring, monitoringInterval]);

  // パフォーマンス監査の定期実行
  useEffect(() => {
    if (!isMonitoring) return;

    const runAudit = () => {
      const audit = auditPerformance();
      if (debugMode) {
        console.group('🔍 Performance Audit');
        console.table(audit);
        console.groupEnd();
      }
    };

    const interval = setInterval(runAudit, monitoringInterval);
    return () => clearInterval(interval);
  }, [isMonitoring, monitoringInterval, auditPerformance, debugMode]);

  // メトリクス表示用のフォーマット
  const formattedMetrics = useMemo(() => {
    return Object.entries(metrics).map(([key, value]) => {
      const threshold = getThreshold(key);
      const status = !threshold ? 'unknown' :
        value <= threshold.good ? 'good' :
        value <= threshold.needsImprovement ? 'warning' : 'error';

      const unit = key.toLowerCase().includes('cls') ? '' : 'ms';

      return {
        name: key.toUpperCase(),
        value: typeof value === 'number' ? `${value.toFixed(1)}${unit}` : 'N/A',
        status,
        target: threshold ? `${threshold.good}${unit}` : 'N/A'
      };
    });
  }, [metrics, getThreshold]);

  // アラートのクリア
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // 監視の切り替え
  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(prev => !prev);
  }, []);

  if (!debugMode && !showAlerts) {
    return null; // 本番環境では非表示
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* アラート表示 */}
      {showAlerts && alerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.slice(0, 3).map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg shadow-lg text-sm ${
                alert.type === 'error'
                  ? 'bg-red-100 border border-red-300 text-red-800'
                  : 'bg-yellow-100 border border-yellow-300 text-yellow-800'
              }`}
            >
              <div className="font-medium">⚠️ Performance Alert</div>
              <div>{alert.message}</div>
              <div className="text-xs opacity-75">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {alerts.length > 3 && (
            <div className="text-xs text-gray-500 text-center">
              +{alerts.length - 3} more alerts
            </div>
          )}
        </div>
      )}

      {/* デバッグダッシュボード */}
      {debugMode && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 w-80 text-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 dark:text-white">
              📊 Performance Monitor
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMonitoring}
                className={`w-2 h-2 rounded-full ${
                  isMonitoring ? 'bg-green-500' : 'bg-red-500'
                }`}
                title={isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
              />
              {alerts.length > 0 && (
                <button
                  onClick={clearAlerts}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="mb-3">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              Core Web Vitals
            </h4>
            <div className="space-y-1">
              {formattedMetrics.map(metric => (
                <div key={metric.name} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{metric.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{metric.value}</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        metric.status === 'good' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-yellow-500' :
                        metric.status === 'error' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bundle情報 */}
          {bundleReport && (
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                Bundle Analysis
              </h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 font-mono whitespace-pre-line max-h-32 overflow-y-auto">
                {bundleReport.split('\n').slice(0, 8).join('\n')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;