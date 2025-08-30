/**
 * Core Web Vitals 目標値達成検証ユーティリティ
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 * 
 * 厳格な目標値:
 * - LCP: < 1.0秒 (モーダル初期表示)
 * - FID: < 100ms (インタラクション応答)
 * - CLS: < 0.1 (レイアウトシフト)
 * - Bundle Size: < 50KB (TaskDetailModal chunk)
 */

export interface PerformanceTargets {
  lcp: number;           // Largest Contentful Paint (ms)
  fid: number;           // First Input Delay (ms)
  cls: number;           // Cumulative Layout Shift
  bundleSize: number;    // Bundle Size (bytes)
}

export interface ValidationResult {
  metric: string;
  value: number;
  target: number;
  passed: boolean;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  improvement: number;   // Percentage improvement needed
  recommendations: string[];
}

export interface OverallPerformanceScore {
  score: number;         // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passedTests: number;
  totalTests: number;
  results: ValidationResult[];
  summary: string;
  nextSteps: string[];
}

/**
 * 設計書で定義された厳格な目標値
 */
export const PERFORMANCE_TARGETS: PerformanceTargets = {
  lcp: 1000,      // 1.0秒
  fid: 100,       // 100ms
  cls: 0.1,       // 0.1
  bundleSize: 50 * 1024  // 50KB
};

/**
 * パフォーマンス検証クラス
 */
export class PerformanceValidator {
  private targets: PerformanceTargets;

  constructor(customTargets?: Partial<PerformanceTargets>) {
    this.targets = { ...PERFORMANCE_TARGETS, ...customTargets };
  }

  /**
   * 個別メトリクスの検証
   */
  validateMetric(metric: keyof PerformanceTargets, value: number): ValidationResult {
    const target = this.targets[metric];
    const passed = value <= target;
    const improvement = passed ? 0 : ((value - target) / target) * 100;

    return {
      metric,
      value,
      target,
      passed,
      grade: this.calculateGrade(value, target, metric),
      improvement,
      recommendations: this.generateRecommendations(metric, value, target)
    };
  }

  /**
   * 全体的なパフォーマンススコア計算
   */
  calculateOverallScore(metrics: Partial<Record<keyof PerformanceTargets, number>>): OverallPerformanceScore {
    const results: ValidationResult[] = [];
    let totalScore = 0;
    let validMetrics = 0;

    Object.entries(metrics).forEach(([key, value]) => {
      if (value !== undefined && key in this.targets) {
        const result = this.validateMetric(key as keyof PerformanceTargets, value);
        results.push(result);
        totalScore += this.gradeToScore(result.grade);
        validMetrics++;
      }
    });

    const score = validMetrics > 0 ? Math.round(totalScore / validMetrics) : 0;
    const passedTests = results.filter(r => r.passed).length;

    return {
      score,
      grade: this.scoreToGrade(score),
      passedTests,
      totalTests: results.length,
      results,
      summary: this.generateSummary(score, passedTests, results.length),
      nextSteps: this.generateNextSteps(results)
    };
  }

  /**
   * グレード計算
   */
  private calculateGrade(value: number, target: number, metric: keyof PerformanceTargets): 'A' | 'B' | 'C' | 'D' | 'F' {
    const ratio = value / target;

    // メトリック別の評価基準
    switch (metric) {
      case 'lcp':
        if (ratio <= 1.0) return 'A';   // 目標値以内
        if (ratio <= 1.5) return 'B';   // 1.5倍まで
        if (ratio <= 2.0) return 'C';   // 2.0倍まで
        if (ratio <= 2.5) return 'D';   // 2.5倍まで
        return 'F';

      case 'fid':
        if (ratio <= 1.0) return 'A';   // 目標値以内
        if (ratio <= 2.0) return 'B';   // 2.0倍まで
        if (ratio <= 3.0) return 'C';   // 3.0倍まで
        if (ratio <= 5.0) return 'D';   // 5.0倍まで
        return 'F';

      case 'cls':
        if (ratio <= 1.0) return 'A';   // 目標値以内
        if (ratio <= 2.0) return 'B';   // 2.0倍まで
        if (ratio <= 3.0) return 'C';   // 3.0倍まで
        if (ratio <= 5.0) return 'D';   // 5.0倍まで
        return 'F';

      case 'bundleSize':
        if (ratio <= 1.0) return 'A';   // 目標値以内
        if (ratio <= 1.5) return 'B';   // 1.5倍まで
        if (ratio <= 2.0) return 'C';   // 2.0倍まで
        if (ratio <= 3.0) return 'D';   // 3.0倍まで
        return 'F';

      default:
        return 'F';
    }
  }

  /**
   * 改善提案生成
   */
  private generateRecommendations(metric: keyof PerformanceTargets, value: number, target: number): string[] {
    if (value <= target) {
      return [`✅ ${metric.toUpperCase()} target achieved!`];
    }

    const recommendations: string[] = [];
    const ratio = value / target;

    switch (metric) {
      case 'lcp':
        recommendations.push('Optimize lazy loading with more efficient chunking');
        if (ratio > 2) {
          recommendations.push('Consider server-side rendering for critical content');
        }
        recommendations.push('Minimize DOM complexity in modal content');
        recommendations.push('Preload critical resources with webpackPreload');
        break;

      case 'fid':
        recommendations.push('Reduce JavaScript execution time during interactions');
        recommendations.push('Use requestIdleCallback for non-critical operations');
        if (ratio > 3) {
          recommendations.push('Consider Web Workers for heavy computations');
        }
        recommendations.push('Optimize event handlers and reduce re-renders');
        break;

      case 'cls':
        recommendations.push('Use fixed dimensions for modal containers');
        recommendations.push('Avoid dynamic content injection after modal open');
        recommendations.push('Predefine space for loading states');
        if (ratio > 2) {
          recommendations.push('Review animation implementations for layout stability');
        }
        break;

      case 'bundleSize':
        recommendations.push('Further optimize code splitting strategy');
        recommendations.push('Remove unused imports and dependencies');
        if (ratio > 1.5) {
          recommendations.push('Consider lazy loading for non-critical modal features');
        }
        recommendations.push('Enable tree shaking and minification');
        recommendations.push('Use dynamic imports for conditional features');
        break;
    }

    return recommendations;
  }

  /**
   * グレードから数値スコアへの変換
   */
  private gradeToScore(grade: 'A' | 'B' | 'C' | 'D' | 'F'): number {
    const gradeScores = { A: 95, B: 85, C: 75, D: 65, F: 50 };
    return gradeScores[grade];
  }

  /**
   * 数値スコアからグレードへの変換
   */
  private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * サマリー生成
   */
  private generateSummary(score: number, passedTests: number, totalTests: number): string {
    const passRate = Math.round((passedTests / totalTests) * 100);
    
    if (passedTests === totalTests) {
      return `🎉 Excellent! All ${totalTests} performance targets achieved (Score: ${score})`;
    }
    
    if (passRate >= 75) {
      return `✅ Good performance with ${passedTests}/${totalTests} targets met (Score: ${score})`;
    }
    
    if (passRate >= 50) {
      return `⚠️ Moderate performance with ${passedTests}/${totalTests} targets met (Score: ${score})`;
    }
    
    return `❌ Performance needs improvement - ${passedTests}/${totalTests} targets met (Score: ${score})`;
  }

  /**
   * 次のステップ生成
   */
  private generateNextSteps(results: ValidationResult[]): string[] {
    const failedTests = results.filter(r => !r.passed);
    
    if (failedTests.length === 0) {
      return ['Continue monitoring performance metrics', 'Consider setting more ambitious targets'];
    }

    const nextSteps: string[] = [];
    
    // 最も重要な改善点を優先順位付け
    const sortedFailures = failedTests.sort((a, b) => b.improvement - a.improvement);
    const topFailure = sortedFailures[0];
    
    nextSteps.push(`🔥 Priority: Fix ${topFailure.metric.toUpperCase()} (${topFailure.improvement.toFixed(1)}% over target)`);
    
    // 追加の改善提案
    if (failedTests.length > 1) {
      nextSteps.push(`Address ${failedTests.length - 1} additional performance metrics`);
    }
    
    nextSteps.push('Run comprehensive performance audit');
    nextSteps.push('Implement automated performance monitoring');
    
    return nextSteps;
  }
}

/**
 * 便利な検証関数
 */
export const validateTaskDetailModalPerformance = (metrics: {
  lcp?: number;
  fid?: number;  
  cls?: number;
  bundleSize?: number;
}): OverallPerformanceScore => {
  const validator = new PerformanceValidator();
  return validator.calculateOverallScore(metrics);
};

/**
 * パフォーマンステストレポートを生成
 */
export const generatePerformanceReport = (score: OverallPerformanceScore): string => {
  const lines = [
    '# TaskDetailModal Performance Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    `## Overall Score: ${score.grade} (${score.score}/100)`,
    score.summary,
    '',
    '## Metrics Analysis',
    ...score.results.map(result => {
      const status = result.passed ? '✅' : '❌';
      const unit = result.metric === 'cls' ? '' : result.metric === 'bundleSize' ? ' bytes' : ' ms';
      return `${status} ${result.metric.toUpperCase()}: ${result.value}${unit} (target: ${result.target}${unit}) - Grade ${result.grade}`;
    }),
    '',
    '## Recommendations',
    ...score.results.flatMap(result => result.recommendations.map(rec => `- ${rec}`)),
    '',
    '## Next Steps',
    ...score.nextSteps.map((step, i) => `${i + 1}. ${step}`)
  ];
  
  return lines.join('\n');
};

/**
 * デフォルトインスタンス
 */
export const performanceValidator = new PerformanceValidator();