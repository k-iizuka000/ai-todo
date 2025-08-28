/**
 * PerformanceMonitor コンポーネント
 * Issue 015: Archived Tasks Toggle Functionality - グループ6 パフォーマンス最適化とA11y
 * 
 * 200ms応答性保証のためのパフォーマンス監視
 */

import * as React from "react"

// ========================================
// Type Definitions
// ========================================

export interface PerformanceMetrics {
  renderTime: number
  interactionTime: number
  isWithin200ms: boolean
  timestamp: number
}

export interface PerformanceMonitorProps {
  /** パフォーマンス測定を有効にするか */
  enabled?: boolean
  /** 測定結果のコールバック */
  onMetrics?: (metrics: PerformanceMetrics) => void
  /** 監視対象のコンポーネント */
  children: React.ReactNode
  /** コンポーネント名（デバッグ用） */
  componentName?: string
}

// ========================================
// Performance Utilities
// ========================================

/**
 * パフォーマンス測定ユーティリティ
 */
export class PerformanceTracker {
  private static instance: PerformanceTracker
  private metrics: Map<string, number> = new Map()

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker()
    }
    return PerformanceTracker.instance
  }

  /**
   * 測定開始
   */
  startMeasure(key: string): void {
    this.metrics.set(`${key}_start`, performance.now())
  }

  /**
   * 測定終了と結果取得
   */
  endMeasure(key: string): number {
    const startTime = this.metrics.get(`${key}_start`)
    if (!startTime) {
      console.warn(`Performance measurement not started for key: ${key}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.metrics.delete(`${key}_start`)
    return duration
  }

  /**
   * 200ms以内かどうかの判定
   */
  isWithinThreshold(duration: number, threshold: number = 200): boolean {
    return duration <= threshold
  }

  /**
   * パフォーマンス警告の出力
   */
  logPerformanceWarning(componentName: string, duration: number): void {
    if (duration > 200) {
      console.warn(
        `🐌 Performance Warning: ${componentName} took ${duration.toFixed(2)}ms (>200ms threshold)`
      )
    } else {
      console.log(
        `✅ Performance OK: ${componentName} took ${duration.toFixed(2)}ms (<200ms threshold)`
      )
    }
  }
}

// ========================================
// Performance Monitor Hook
// ========================================

/**
 * パフォーマンス監視用カスタムフック
 */
export function usePerformanceMonitor(
  componentName: string = 'Component',
  enabled: boolean = process.env.NODE_ENV === 'development'
) {
  const tracker = React.useMemo(() => PerformanceTracker.getInstance(), [])
  const renderCountRef = React.useRef(0)
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null)

  // レンダリング時間の測定
  const startRenderMeasure = React.useCallback(() => {
    if (!enabled) return
    renderCountRef.current += 1
    tracker.startMeasure(`${componentName}_render_${renderCountRef.current}`)
  }, [componentName, enabled, tracker])

  const endRenderMeasure = React.useCallback(() => {
    if (!enabled) return
    const renderTime = tracker.endMeasure(`${componentName}_render_${renderCountRef.current}`)
    const isWithin200ms = tracker.isWithinThreshold(renderTime)
    
    const newMetrics: PerformanceMetrics = {
      renderTime,
      interactionTime: 0,
      isWithin200ms,
      timestamp: Date.now()
    }
    
    setMetrics(newMetrics)
    tracker.logPerformanceWarning(componentName, renderTime)
    
    return newMetrics
  }, [componentName, enabled, tracker])

  // インタラクション時間の測定
  const measureInteraction = React.useCallback((actionName: string = 'interaction') => {
    if (!enabled) return () => 0

    const interactionKey = `${componentName}_${actionName}`
    tracker.startMeasure(interactionKey)
    
    return () => {
      const interactionTime = tracker.endMeasure(interactionKey)
      const isWithin200ms = tracker.isWithinThreshold(interactionTime)
      
      const newMetrics: PerformanceMetrics = {
        renderTime: metrics?.renderTime || 0,
        interactionTime,
        isWithin200ms,
        timestamp: Date.now()
      }
      
      setMetrics(newMetrics)
      tracker.logPerformanceWarning(`${componentName} ${actionName}`, interactionTime)
      
      return interactionTime
    }
  }, [componentName, enabled, metrics?.renderTime, tracker])

  return {
    metrics,
    startRenderMeasure,
    endRenderMeasure,
    measureInteraction,
    isEnabled: enabled
  }
}

// ========================================
// Performance Monitor Component
// ========================================

/**
 * パフォーマンス監視コンポーネント
 * 子コンポーネントのレンダリング時間を自動測定
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = React.memo(({
  enabled = process.env.NODE_ENV === 'development',
  onMetrics,
  children,
  componentName = 'MonitoredComponent'
}) => {
  const { startRenderMeasure, endRenderMeasure, metrics } = usePerformanceMonitor(componentName, enabled)

  // レンダリング開始時
  React.useLayoutEffect(() => {
    if (enabled) {
      startRenderMeasure()
    }
  })

  // レンダリング完了時
  React.useLayoutEffect(() => {
    if (enabled) {
      const result = endRenderMeasure()
      if (result && onMetrics) {
        onMetrics(result)
      }
    }
  })

  // 開発環境でのみメトリクス表示
  if (enabled && metrics && process.env.NODE_ENV === 'development') {
    return (
      <>
        {children}
        <div 
          style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            padding: '8px',
            background: metrics.isWithin200ms ? '#10B981' : '#EF4444',
            color: 'white',
            fontSize: '12px',
            borderRadius: '4px',
            zIndex: 9999,
            fontFamily: 'monospace'
          }}
        >
          {componentName}: {metrics.renderTime.toFixed(1)}ms
          {!metrics.isWithin200ms && ' ⚠️'}
        </div>
      </>
    )
  }

  return <>{children}</>
})
PerformanceMonitor.displayName = "PerformanceMonitor"

// ========================================
// Performance Test Utilities
// ========================================

/**
 * パフォーマンステストユーティリティ
 * Jest/React Testing Libraryでの使用を想定
 */
export class PerformanceTestUtils {
  /**
   * コンポーネントのレンダリング時間をテスト
   */
  static async testRenderingPerformance(
    renderFn: () => Promise<void> | void,
    threshold: number = 200,
    testName: string = 'Component rendering'
  ): Promise<{ duration: number; isWithinThreshold: boolean }> {
    const startTime = performance.now()
    await renderFn()
    const duration = performance.now() - startTime
    const isWithinThreshold = duration <= threshold

    console.log(`🔬 ${testName}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
    
    return { duration, isWithinThreshold }
  }

  /**
   * インタラクションパフォーマンスをテスト
   */
  static async testInteractionPerformance(
    interactionFn: () => Promise<void> | void,
    threshold: number = 200,
    testName: string = 'User interaction'
  ): Promise<{ duration: number; isWithinThreshold: boolean }> {
    const startTime = performance.now()
    await interactionFn()
    const duration = performance.now() - startTime
    const isWithinThreshold = duration <= threshold

    console.log(`🖱️ ${testName}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
    
    return { duration, isWithinThreshold }
  }

  /**
   * 複数回の測定による平均パフォーマンステスト
   */
  static async testAveragePerformance(
    testFn: () => Promise<void> | void,
    iterations: number = 10,
    threshold: number = 200,
    testName: string = 'Performance test'
  ): Promise<{ averageDuration: number; allResults: number[]; isWithinThreshold: boolean }> {
    const results: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.testRenderingPerformance(testFn, threshold, `${testName} #${i + 1}`)
      results.push(duration)
    }
    
    const averageDuration = results.reduce((sum, duration) => sum + duration, 0) / iterations
    const isWithinThreshold = averageDuration <= threshold
    
    console.log(`📊 ${testName} Average: ${averageDuration.toFixed(2)}ms over ${iterations} runs`)
    
    return { averageDuration, allResults: results, isWithinThreshold }
  }
}

// ========================================
// Exports
// ========================================

export default PerformanceMonitor