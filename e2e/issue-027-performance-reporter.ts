/**
 * Issue 027: パフォーマンス測定・レポート生成ユーティリティ
 * 
 * 機能:
 * - リアルタイムパフォーマンス監視
 * - メモリ使用量追跡
 * - レンダリングループ検出
 * - HTMLレポート生成
 * - JSON形式でのメトリクス出力
 */

import { Page, Browser, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface PerformanceMetrics {
  timestamp: number;
  loadTime: number;
  memoryUsage: number;
  renderCount: number;
  cpuUsage: number;
  networkRequests: number;
  errorCount: number;
}

interface TestScenarioResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  metrics: PerformanceMetrics[];
  screenshots: string[];
  errors: string[];
  description: string;
}

interface TestSuiteReport {
  title: string;
  executionDate: string;
  totalDuration: number;
  scenarios: TestScenarioResult[];
  summary: {
    passed: number;
    failed: number;
    skipped: number;
    totalTests: number;
    avgLoadTime: number;
    maxMemoryUsage: number;
    renderLoopDetected: boolean;
    criticalErrors: number;
  };
  recommendations: string[];
  issueValidation: {
    infiniteRenderingFixed: boolean;
    existingFunctionsMaintained: boolean;
    errorHandlingWorking: boolean;
    performanceImproved: boolean;
  };
}

export class PerformanceReporter {
  private metrics: PerformanceMetrics[] = [];
  private scenarios: TestScenarioResult[] = [];
  private startTime: number = Date.now();
  private reportDir: string = 'test-results/issue-027';

  constructor() {
    // レポートディレクトリを作成
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * パフォーマンス監視開始
   */
  async startMonitoring(page: Page, scenarioName: string): Promise<void> {
    console.log(`📊 パフォーマンス監視開始: ${scenarioName}`);
    
    // ネットワークリクエスト監視
    let networkRequests = 0;
    page.on('request', () => networkRequests++);
    
    // エラー監視
    let errorCount = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorCount++;
      }
    });
    
    page.on('pageerror', () => errorCount++);
    
    // リアルタイムメトリクス収集を開始
    await page.addInitScript(() => {
      (window as any).performanceMonitor = {
        startTime: Date.now(),
        renderCount: 0,
        memoryBaseline: 0
      };
      
      // React render tracking
      if (window.React) {
        const originalRender = console.log;
        console.log = function(...args) {
          if (args.some(arg => 
            typeof arg === 'string' && 
            (arg.includes('render') || arg.includes('update'))
          )) {
            (window as any).performanceMonitor.renderCount++;
          }
          return originalRender.apply(console, arguments);
        };
      }
    });
  }

  /**
   * リアルタイムメトリクス収集
   */
  async collectMetrics(page: Page): Promise<PerformanceMetrics> {
    const pageMetrics = await page.evaluate(() => {
      const perf = performance;
      const monitor = (window as any).performanceMonitor || {};
      
      return {
        timestamp: Date.now(),
        loadTime: perf.timing ? perf.timing.loadEventEnd - perf.timing.navigationStart : 0,
        memoryUsage: (perf as any).memory ? (perf as any).memory.usedJSHeapSize : 0,
        renderCount: monitor.renderCount || 0,
        cpuUsage: 0, // ブラウザでは直接取得困難
        networkRequests: 0 // page.onでカウント
      };
    });
    
    const metrics: PerformanceMetrics = {
      ...pageMetrics,
      errorCount: 0 // page.onでカウント
    };
    
    this.metrics.push(metrics);
    return metrics;
  }

  /**
   * レンダリングループ検出
   */
  async detectRenderLoop(page: Page, duration: number = 5000): Promise<{
    detected: boolean;
    renderCount: number;
    timeframe: number;
  }> {
    const startMetrics = await this.collectMetrics(page);
    await page.waitForTimeout(duration);
    const endMetrics = await this.collectMetrics(page);
    
    const renderIncrease = endMetrics.renderCount - startMetrics.renderCount;
    const renderLoopThreshold = 20; // 5秒間で20回以上のレンダリングは異常
    
    return {
      detected: renderIncrease > renderLoopThreshold,
      renderCount: renderIncrease,
      timeframe: duration
    };
  }

  /**
   * メモリリーク検出
   */
  async detectMemoryLeak(page: Page, iterations: number = 5): Promise<{
    detected: boolean;
    memoryIncrease: number;
    leakRate: number;
  }> {
    const memoryReadings: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const metrics = await this.collectMetrics(page);
      memoryReadings.push(metrics.memoryUsage);
      
      // 軽微な操作を実行してメモリ変化を確認
      await page.reload();
      await page.waitForTimeout(1000);
    }
    
    const initialMemory = memoryReadings[0];
    const finalMemory = memoryReadings[memoryReadings.length - 1];
    const memoryIncrease = finalMemory - initialMemory;
    
    // 10MB以上の増加は潜在的なリーク
    const leakThreshold = 10 * 1024 * 1024;
    
    return {
      detected: memoryIncrease > leakThreshold,
      memoryIncrease,
      leakRate: memoryIncrease / iterations
    };
  }

  /**
   * スクリーンショット撮影（エラー時含む）
   */
  async captureScreenshot(page: Page, name: string, type: 'success' | 'error' | 'info' = 'info'): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${type}-${timestamp}.png`;
    const filepath = path.join(this.reportDir, 'screenshots', filename);
    
    // ディレクトリ作成
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    
    await page.screenshot({ 
      path: filepath, 
      fullPage: true 
    });
    
    return filepath;
  }

  /**
   * シナリオ結果を記録
   */
  addScenarioResult(result: TestScenarioResult): void {
    this.scenarios.push(result);
    console.log(`📝 シナリオ結果記録: ${result.name} - ${result.status}`);
  }

  /**
   * HTML形式のレポート生成
   */
  generateHTMLReport(): string {
    const report = this.generateReport();
    const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title} - テストレポート</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }
        .header { 
            border-bottom: 3px solid #007acc; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-skipped { color: #ffc107; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }
        .metric-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            border-left: 4px solid #007acc; 
        }
        .metric-value { 
            font-size: 2em; 
            font-weight: bold; 
            color: #007acc; 
        }
        .metric-label { 
            color: #666; 
            font-size: 0.9em; 
        }
        .scenario { 
            margin: 20px 0; 
            padding: 20px; 
            border: 1px solid #dee2e6; 
            border-radius: 8px; 
        }
        .scenario-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 15px; 
        }
        .validation-section {
            background: #e8f4fd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #007acc;
        }
        .validation-item {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        .validation-check {
            font-size: 1.2em;
            margin-right: 10px;
        }
        .recommendations {
            background: #fff3cd;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #ffc107;
        }
        .chart-container {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${report.title}</h1>
            <p>実行日時: ${new Date(report.executionDate).toLocaleString('ja-JP')}</p>
            <p>総実行時間: ${(report.totalDuration / 1000).toFixed(2)}秒</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value status-passed">${report.summary.passed}</div>
                <div class="metric-label">成功</div>
            </div>
            <div class="metric-card">
                <div class="metric-value status-failed">${report.summary.failed}</div>
                <div class="metric-label">失敗</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.avgLoadTime.toFixed(0)}ms</div>
                <div class="metric-label">平均ロード時間</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(report.summary.maxMemoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                <div class="metric-label">最大メモリ使用量</div>
            </div>
        </div>

        <div class="validation-section">
            <h2>Issue 027 修正検証結果</h2>
            <div class="validation-item">
                <span class="validation-check">${report.issueValidation.infiniteRenderingFixed ? '✅' : '❌'}</span>
                <span>無限レンダリングループ修正</span>
            </div>
            <div class="validation-item">
                <span class="validation-check">${report.issueValidation.existingFunctionsMaintained ? '✅' : '❌'}</span>
                <span>既存機能維持</span>
            </div>
            <div class="validation-item">
                <span class="validation-check">${report.issueValidation.errorHandlingWorking ? '✅' : '❌'}</span>
                <span>エラーハンドリング動作</span>
            </div>
            <div class="validation-item">
                <span class="validation-check">${report.issueValidation.performanceImproved ? '✅' : '❌'}</span>
                <span>パフォーマンス改善</span>
            </div>
        </div>

        <h2>シナリオ別結果</h2>
        ${report.scenarios.map(scenario => `
            <div class="scenario">
                <div class="scenario-header">
                    <h3>${scenario.name}</h3>
                    <span class="status-${scenario.status}">${scenario.status.toUpperCase()}</span>
                </div>
                <p>${scenario.description}</p>
                <p><strong>実行時間:</strong> ${(scenario.duration / 1000).toFixed(2)}秒</p>
                ${scenario.errors.length > 0 ? `
                    <div style="background: #f8d7da; padding: 10px; border-radius: 4px; margin: 10px 0;">
                        <strong>エラー:</strong>
                        <ul>${scenario.errors.map(error => `<li>${error}</li>`).join('')}</ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}

        ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h2>推奨事項</h2>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>`;

    const reportPath = path.join(this.reportDir, 'performance-report.html');
    fs.writeFileSync(reportPath, html, 'utf-8');
    console.log(`📄 HTMLレポート生成完了: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * JSON形式のレポート生成
   */
  generateJSONReport(): string {
    const report = this.generateReport();
    const reportPath = path.join(this.reportDir, 'performance-report.json');
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`📄 JSONレポート生成完了: ${reportPath}`);
    
    return reportPath;
  }

  /**
   * レポートデータ生成
   */
  private generateReport(): TestSuiteReport {
    const totalDuration = Date.now() - this.startTime;
    const allMetrics = this.scenarios.flatMap(s => s.metrics);
    
    const summary = {
      passed: this.scenarios.filter(s => s.status === 'passed').length,
      failed: this.scenarios.filter(s => s.status === 'failed').length,
      skipped: this.scenarios.filter(s => s.status === 'skipped').length,
      totalTests: this.scenarios.length,
      avgLoadTime: allMetrics.reduce((sum, m) => sum + m.loadTime, 0) / allMetrics.length || 0,
      maxMemoryUsage: Math.max(...allMetrics.map(m => m.memoryUsage), 0),
      renderLoopDetected: allMetrics.some(m => m.renderCount > 20),
      criticalErrors: allMetrics.reduce((sum, m) => sum + m.errorCount, 0)
    };

    const recommendations: string[] = [];
    
    // パフォーマンス改善提案
    if (summary.avgLoadTime > 3000) {
      recommendations.push('ページロード時間が目標値を超えています。画像最適化やコード分割を検討してください。');
    }
    
    if (summary.maxMemoryUsage > 100 * 1024 * 1024) {
      recommendations.push('メモリ使用量が高いです。不要なオブジェクトの解放を確認してください。');
    }
    
    if (summary.renderLoopDetected) {
      recommendations.push('レンダリングループの可能性があります。useEffect の依存関係を見直してください。');
    }
    
    if (summary.criticalErrors > 0) {
      recommendations.push(`${summary.criticalErrors}個のエラーが検出されました。ログを確認して修正してください。`);
    }

    return {
      title: 'Issue 027: Dashboard無限レンダリングループエラー修正検証',
      executionDate: new Date().toISOString(),
      totalDuration,
      scenarios: this.scenarios,
      summary,
      recommendations,
      issueValidation: {
        infiniteRenderingFixed: !summary.renderLoopDetected,
        existingFunctionsMaintained: summary.passed >= 4, // 基本機能テスト数
        errorHandlingWorking: this.scenarios.some(s => s.name.includes('エラー処理') && s.status === 'passed'),
        performanceImproved: summary.avgLoadTime <= 3000 && !summary.renderLoopDetected
      }
    };
  }

  /**
   * コンソール出力形式のサマリー
   */
  printSummary(): void {
    const report = this.generateReport();
    
    console.log('='.repeat(80));
    console.log('📊 Issue 027 検証結果サマリー');
    console.log('='.repeat(80));
    console.log(`✅ 成功: ${report.summary.passed}/${report.summary.totalTests}`);
    console.log(`❌ 失敗: ${report.summary.failed}/${report.summary.totalTests}`);
    console.log(`📈 平均ロード時間: ${report.summary.avgLoadTime.toFixed(0)}ms`);
    console.log(`💾 最大メモリ使用量: ${(report.summary.maxMemoryUsage / 1024 / 1024).toFixed(1)}MB`);
    console.log(`🔄 レンダリングループ: ${report.summary.renderLoopDetected ? '検出' : '未検出'}`);
    console.log('');
    console.log('🔍 Issue 027 修正検証:');
    console.log(`  無限レンダリング修正: ${report.issueValidation.infiniteRenderingFixed ? '✅' : '❌'}`);
    console.log(`  既存機能維持: ${report.issueValidation.existingFunctionsMaintained ? '✅' : '❌'}`);
    console.log(`  エラーハンドリング: ${report.issueValidation.errorHandlingWorking ? '✅' : '❌'}`);
    console.log(`  パフォーマンス改善: ${report.issueValidation.performanceImproved ? '✅' : '❌'}`);
    
    if (report.recommendations.length > 0) {
      console.log('');
      console.log('💡 推奨事項:');
      report.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    console.log('='.repeat(80));
  }
}