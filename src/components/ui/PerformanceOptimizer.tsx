/**
 * パフォーマンス最適化コンポーネント
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 * 300ms要件の監視とCLS最適化を実装
 */

import React, { useEffect, useMemo } from 'react';
import { useWebVitals, usePerformanceMonitor } from '../../hooks/useWebVitals';

export interface PerformanceOptimizerProps {
  /** 開発モードでの詳細表示 */
  showDetails?: boolean;
  /** パフォーマンスアラートの有効/無効 */
  enableAlerts?: boolean;
  /** カスタムアラート処理 */
  onPerformanceIssue?: (metric: string, value: number) => void;
  /** 子コンポーネント */
  children: React.ReactNode;
}

/**
 * Core Web Vitalsを監視し、パフォーマンス最適化を行うコンポーネント
 */
export const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({
  showDetails = process.env.NODE_ENV === 'development',
  enableAlerts = true,
  onPerformanceIssue,
  children,
}) => {
  const { metrics, isLoading, getOverallScore, checkPerformanceRequirements } = useWebVitals();
  
  const { requirements } = usePerformanceMonitor({
    alertThreshold: 80,
    onAlert: enableAlerts ? onPerformanceIssue : undefined,
  });

  // パフォーマンススコア計算
  const overallScore = useMemo(() => getOverallScore(), [getOverallScore]);
  
  // 設計書要件（300ms）チェック
  const meetsDesignRequirements = useMemo(() => {
    return requirements.overall === true;
  }, [requirements]);

  // 開発モード用デバッグ情報
  useEffect(() => {
    if (showDetails && !isLoading) {
      console.group('🚀 Core Web Vitals Performance Report');
      console.log('📊 Metrics:', metrics);
      console.log('🎯 Requirements Check:', requirements);
      console.log('📈 Overall Score:', overallScore);
      console.log('✅ Meets Design Requirements (300ms):', meetsDesignRequirements);
      console.groupEnd();
    }
  }, [metrics, requirements, overallScore, meetsDesignRequirements, showDetails, isLoading]);

  // CLS最適化のためのコンテナ設定
  const optimizedStyles: React.CSSProperties = {
    // CLS (Cumulative Layout Shift) 最適化
    containIntrinsicSize: 'auto 500px', // レイアウトシフト防止
    contentVisibility: 'auto', // 描画最適化
    // GPU加速によるFID改善
    willChange: 'transform',
    transform: 'translateZ(0)',
  };

  return (
    <div 
      style={optimizedStyles}
      data-performance-optimized="true"
      data-performance-score={overallScore}
      data-meets-requirements={meetsDesignRequirements}
    >
      {children}
      
      {/* 開発モード用パフォーマンス表示 */}
      {showDetails && !isLoading && (
        <PerformanceDebugPanel
          metrics={metrics}
          requirements={requirements}
          overallScore={overallScore}
          meetsDesignRequirements={meetsDesignRequirements}
        />
      )}
    </div>
  );
};

/**
 * 開発モード用パフォーマンスデバッグパネル
 */
const PerformanceDebugPanel: React.FC<{
  metrics: any;
  requirements: any;
  overallScore: number | null;
  meetsDesignRequirements: boolean;
}> = ({ metrics, requirements, overallScore, meetsDesignRequirements }) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div className="font-bold mb-2 text-green-400">
        🚀 Performance Monitor
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Overall Score:</span>
          <span className={overallScore !== null && overallScore >= 80 ? 'text-green-400' : 'text-yellow-400'}>
            {overallScore?.toFixed(0) || 'N/A'}%
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>LCP:</span>
          <span className={requirements.lcp === true ? 'text-green-400' : 'text-red-400'}>
            {metrics.lcp?.toFixed(0) || 'N/A'}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>FID:</span>
          <span className={requirements.fid === true ? 'text-green-400' : 'text-red-400'}>
            {metrics.fid?.toFixed(0) || 'N/A'}ms
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>CLS:</span>
          <span className={requirements.cls === true ? 'text-green-400' : 'text-red-400'}>
            {metrics.cls?.toFixed(3) || 'N/A'}
          </span>
        </div>
        
        <div className="border-t border-gray-600 pt-2 mt-2">
          <div className="flex justify-between">
            <span>Design Req:</span>
            <span className={meetsDesignRequirements ? 'text-green-400' : 'text-red-400'}>
              {meetsDesignRequirements ? '✅ Pass' : '❌ Fail'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceOptimizer;