/**
 * Bundle Size分析ユーティリティ
 * 設計書 グループ2: パフォーマンス最適化とCore Web Vitals対応
 * 
 * 目標値: TaskDetailModal chunk < 50KB
 */

export interface BundleAnalysis {
  chunkName: string;
  size: number; // bytes
  gzipSize?: number;
  dependencies: string[];
  loadTime: number; // ms
  cacheHit: boolean;
}

export interface BundleMetrics {
  totalSize: number;
  compressedSize: number;
  loadTime: number;
  chunks: BundleAnalysis[];
  performanceScore: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Bundle Size監視クラス
 */
export class BundleSizeMonitor {
  private readonly TARGET_SIZE = 50 * 1024; // 50KB
  private readonly performance: Performance;
  
  constructor() {
    this.performance = typeof window !== 'undefined' ? window.performance : ({} as Performance);
  }

  /**
   * 特定のchunkのサイズを測定
   */
  async measureChunkSize(chunkName: string): Promise<BundleAnalysis | null> {
    if (typeof window === 'undefined' || !this.performance.getEntriesByType) {
      return null;
    }

    try {
      const resourceEntries = this.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const chunkEntries = resourceEntries.filter(entry => 
        entry.name.includes(chunkName) && entry.name.endsWith('.js')
      );

      if (chunkEntries.length === 0) {
        return null;
      }

      const totalSize = chunkEntries.reduce((sum, entry) => {
        return sum + (entry.transferSize || entry.encodedBodySize || 0);
      }, 0);

      const loadTime = chunkEntries.reduce((sum, entry) => {
        return sum + (entry.responseEnd - entry.requestStart);
      }, 0) / chunkEntries.length;

      const cacheHit = chunkEntries.some(entry => 
        entry.transferSize === 0 || entry.transferSize < (entry.encodedBodySize || 0) * 0.1
      );

      return {
        chunkName,
        size: totalSize,
        gzipSize: this.estimateGzipSize(totalSize),
        dependencies: this.extractDependencies(chunkEntries),
        loadTime,
        cacheHit
      };
    } catch (error) {
      console.warn(`Bundle size measurement failed for ${chunkName}:`, error);
      return null;
    }
  }

  /**
   * 全体のbundleメトリクスを取得
   */
  async getOverallMetrics(): Promise<BundleMetrics> {
    const chunks = await Promise.all([
      this.measureChunkSize('task-detail-view'),
      this.measureChunkSize('task-detail-modal'),
      this.measureChunkSize('task-detail-tabs'),
    ]);

    const validChunks = chunks.filter((chunk): chunk is BundleAnalysis => chunk !== null);
    const totalSize = validChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const compressedSize = validChunks.reduce((sum, chunk) => sum + (chunk.gzipSize || chunk.size * 0.3), 0);
    const avgLoadTime = validChunks.reduce((sum, chunk) => sum + chunk.loadTime, 0) / validChunks.length;

    return {
      totalSize,
      compressedSize,
      loadTime: avgLoadTime,
      chunks: validChunks,
      performanceScore: this.calculatePerformanceScore(totalSize)
    };
  }

  /**
   * パフォーマンススコアを計算
   */
  private calculatePerformanceScore(totalSize: number): 'good' | 'needs-improvement' | 'poor' {
    if (totalSize <= this.TARGET_SIZE) return 'good';
    if (totalSize <= this.TARGET_SIZE * 2) return 'needs-improvement';
    return 'poor';
  }

  /**
   * GZIPサイズの推定
   */
  private estimateGzipSize(originalSize: number): number {
    // JavaScript の場合、一般的にGZIP圧縮で30-40%のサイズになる
    return Math.round(originalSize * 0.35);
  }

  /**
   * 依存関係の抽出（簡易版）
   */
  private extractDependencies(entries: PerformanceResourceTiming[]): string[] {
    return entries
      .map(entry => {
        const url = new URL(entry.name);
        const pathParts = url.pathname.split('/');
        return pathParts[pathParts.length - 1];
      })
      .filter(name => name.endsWith('.js'));
  }

  /**
   * レポートを生成
   */
  async generateReport(): Promise<string> {
    const metrics = await getOverallMetrics();
    const report = [`Bundle Size Analysis Report`, `Generated: ${new Date().toISOString()}`, ``];

    report.push(`Overall Performance Score: ${metrics.performanceScore.toUpperCase()}`);
    report.push(`Total Size: ${(metrics.totalSize / 1024).toFixed(2)} KB`);
    report.push(`Compressed Size: ${(metrics.compressedSize / 1024).toFixed(2)} KB`);
    report.push(`Average Load Time: ${metrics.loadTime.toFixed(2)} ms`);
    report.push(``);

    report.push(`Chunk Analysis:`);
    metrics.chunks.forEach(chunk => {
      const sizeKB = (chunk.size / 1024).toFixed(2);
      const status = chunk.size <= this.TARGET_SIZE ? '✅' : '⚠️';
      report.push(`  ${status} ${chunk.chunkName}: ${sizeKB} KB (${chunk.loadTime.toFixed(2)}ms)`);
      
      if (chunk.size > this.TARGET_SIZE) {
        report.push(`    ⚠️  Exceeds target size by ${((chunk.size - this.TARGET_SIZE) / 1024).toFixed(2)} KB`);
      }
    });

    if (metrics.performanceScore !== 'good') {
      report.push(``);
      report.push(`Optimization Recommendations:`);
      
      if (metrics.totalSize > this.TARGET_SIZE) {
        report.push(`  - Consider code splitting for large components`);
        report.push(`  - Use dynamic imports for non-critical features`);
        report.push(`  - Review and remove unused dependencies`);
      }
      
      if (metrics.loadTime > 200) {
        report.push(`  - Optimize network delivery with CDN`);
        report.push(`  - Enable HTTP/2 server push for critical chunks`);
        report.push(`  - Consider preloading critical chunks`);
      }
    }

    return report.join('\n');
  }
}

/**
 * グローバルインスタンス
 */
const bundleMonitor = new BundleSizeMonitor();

/**
 * Bundle size測定の便利関数
 */
export const measureTaskDetailModalBundle = () => bundleMonitor.measureChunkSize('task-detail-modal');
export const getOverallMetrics = () => bundleMonitor.getOverallMetrics();
export const generateBundleReport = () => bundleMonitor.generateReport();

/**
 * 開発環境でのみ実行されるバンドル分析
 */
export const runDevelopmentAnalysis = async () => {
  if (process.env.NODE_ENV !== 'development') return;

  try {
    const report = await generateBundleReport();
    console.group('📦 Bundle Size Analysis');
    console.log(report);
    console.groupEnd();
  } catch (error) {
    console.warn('Bundle analysis failed:', error);
  }
};

// 開発環境での自動実行
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setTimeout(runDevelopmentAnalysis, 2000); // 2秒後に実行
}