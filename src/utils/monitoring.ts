/**
 * 本番環境監視アラートシステム
 * Issue #026 Group 4 Task 4.4
 * 
 * 機能:
 * - エラー発生時の通知システム
 * - パフォーマンス監視とアラート
 * - データ整合性監視
 * - ユーザー体験品質の監視
 * - システムヘルス状態の追跡
 */

// 監視イベントの型定義
export type MonitoringEventType = 
  | 'ERROR'
  | 'PERFORMANCE_DEGRADATION'
  | 'DATA_INTEGRITY_ISSUE'
  | 'USER_EXPERIENCE_ISSUE'
  | 'SYSTEM_HEALTH'
  | 'SECURITY_ALERT';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MonitoringEvent {
  id: string;
  type: MonitoringEventType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  context?: Record<string, any>;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
  metadata?: {
    environment: 'development' | 'staging' | 'production';
    version: string;
    buildNumber?: string;
    feature?: string;
    component?: string;
  };
}

export interface AlertChannel {
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'console' | 'sentry' | 'datadog';
  enabled: boolean;
  config: Record<string, any>;
  severityFilter: AlertSeverity[];
  typeFilter?: MonitoringEventType[];
  rateLimitMinutes?: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  version: string;
  channels: AlertChannel[];
  thresholds: {
    errorRate: number; // エラー率の閾値 (%)
    responseTime: number; // レスポンス時間の閾値 (ms)
    memoryUsage: number; // メモリ使用量の閾値 (MB)
    dataIntegrityScore: number; // データ整合性スコアの閾値 (0-100)
  };
  sampling: {
    errorSampling: number; // エラーのサンプリング率 (0-1)
    performanceSampling: number; // パフォーマンス監視のサンプリング率 (0-1)
    userExperienceSampling: number; // UX監視のサンプリング率 (0-1)
  };
  filters: {
    excludeUrls?: string[]; // 監視対象外URL
    excludeErrors?: string[]; // 監視対象外エラーメッセージ
    includeOnlyComponents?: string[]; // 監視対象コンポーネント
  };
}

/**
 * 監視システムのメインクラス
 */
export class MonitoringSystem {
  private config: MonitoringConfig;
  private eventQueue: MonitoringEvent[] = [];
  private rateLimitMap = new Map<string, { count: number; lastReset: number }>();
  private performanceObserver?: PerformanceObserver;
  private errorHandler?: (event: ErrorEvent) => void;
  private unhandledRejectionHandler?: (event: PromiseRejectionEvent) => void;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.initializeMonitoring();
  }

  /**
   * 監視システムの初期化
   */
  private initializeMonitoring(): void {
    if (!this.config.enabled) {
      return;
    }

    // エラーイベントの監視
    this.setupErrorMonitoring();
    
    // パフォーマンス監視
    this.setupPerformanceMonitoring();
    
    // ユーザー体験監視
    this.setupUserExperienceMonitoring();
    
    // 定期的なヘルスチェック
    this.setupHealthCheck();

    console.log('🔍 Monitoring system initialized');
  }

  /**
   * エラー監視のセットアップ
   */
  private setupErrorMonitoring(): void {
    // JavaScript エラーの監視
    this.errorHandler = (event: ErrorEvent) => {
      if (this.shouldSampleEvent('error')) {
        this.reportEvent({
          type: 'ERROR',
          severity: this.determineErrorSeverity(event.error),
          title: `JavaScript Error: ${event.error?.name || 'Unknown Error'}`,
          message: event.message,
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
          },
          stackTrace: event.error?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }
    };

    window.addEventListener('error', this.errorHandler);

    // Promise rejection の監視
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      if (this.shouldSampleEvent('error')) {
        this.reportEvent({
          type: 'ERROR',
          severity: 'HIGH',
          title: 'Unhandled Promise Rejection',
          message: event.reason?.message || 'Promise rejected without handling',
          context: {
            reason: event.reason
          },
          stackTrace: event.reason?.stack,
          url: window.location.href,
          userAgent: navigator.userAgent
        });
      }
    };

    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  /**
   * パフォーマンス監視のセットアップ
   */
  private setupPerformanceMonitoring(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        if (!this.shouldSampleEvent('performance')) {
          return;
        }

        const entries = list.getEntries();
        for (const entry of entries) {
          this.analyzePerformanceEntry(entry);
        }
      });

      try {
        this.performanceObserver.observe({ 
          entryTypes: ['measure', 'navigation', 'resource', 'longtask'] 
        });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }

    // メモリ使用量の監視
    setInterval(() => {
      this.checkMemoryUsage();
    }, 60000); // 1分ごと

    // レスポンス時間の監視
    this.setupResponseTimeMonitoring();
  }

  /**
   * ユーザー体験監視のセットアップ
   */
  private setupUserExperienceMonitoring(): void {
    // Cumulative Layout Shift (CLS) の監視
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        if (!this.shouldSampleEvent('userExperience')) {
          return;
        }

        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            const cls = (entry as any).value;
            if (cls > 0.1) { // CLS > 0.1 は Poor
              this.reportEvent({
                type: 'USER_EXPERIENCE_ISSUE',
                severity: cls > 0.25 ? 'HIGH' : 'MEDIUM',
                title: 'Layout Shift Detected',
                message: `Cumulative Layout Shift score: ${cls.toFixed(3)}`,
                context: {
                  cls,
                  sources: (entry as any).sources
                }
              });
            }
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Layout Shift monitoring not supported:', error);
      }
    }

    // Long Task の監視
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        if (!this.shouldSampleEvent('userExperience')) {
          return;
        }

        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // 50ms以上のタスクは問題
            this.reportEvent({
              type: 'PERFORMANCE_DEGRADATION',
              severity: entry.duration > 200 ? 'HIGH' : 'MEDIUM',
              title: 'Long Task Detected',
              message: `Task blocked main thread for ${Math.round(entry.duration)}ms`,
              context: {
                duration: entry.duration,
                startTime: entry.startTime
              }
            });
          }
        }
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long Task monitoring not supported:', error);
      }
    }
  }

  /**
   * システムヘルスチェックのセットアップ
   */
  private setupHealthCheck(): void {
    // 定期的なヘルスチェック (5分ごと)
    setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);

    // ページビューティの監視
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // ページが再表示された時のヘルスチェック
        setTimeout(() => this.performHealthCheck(), 1000);
      }
    });
  }

  /**
   * イベントレポート
   */
  public reportEvent(eventData: Partial<MonitoringEvent>): void {
    const event: MonitoringEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      metadata: {
        environment: this.config.environment,
        version: this.config.version,
        buildNumber: process.env.REACT_APP_BUILD_NUMBER,
        ...eventData.metadata
      },
      ...eventData
    } as MonitoringEvent;

    // フィルタリング
    if (!this.shouldReportEvent(event)) {
      return;
    }

    // レート制限チェック
    if (!this.checkRateLimit(event)) {
      return;
    }

    // イベントキューに追加
    this.eventQueue.push(event);

    // 即座に送信するかバッチ処理するか判定
    if (event.severity === 'CRITICAL' || event.type === 'SECURITY_ALERT') {
      this.flushEvents();
    } else {
      // バッチ処理のためにキューに蓄積
      if (this.eventQueue.length >= 10) {
        this.flushEvents();
      }
    }
  }

  /**
   * データ整合性の監視
   */
  public reportDataIntegrityIssue(
    score: number, 
    issues: Array<{ type: string; severity: string; message: string }>
  ): void {
    if (score < this.config.thresholds.dataIntegrityScore) {
      const criticalIssues = issues.filter(issue => issue.severity === 'CRITICAL');
      
      this.reportEvent({
        type: 'DATA_INTEGRITY_ISSUE',
        severity: criticalIssues.length > 0 ? 'CRITICAL' : 'HIGH',
        title: 'Data Integrity Issues Detected',
        message: `Data quality score dropped to ${score}%. ${criticalIssues.length} critical issues found.`,
        context: {
          score,
          issues,
          criticalCount: criticalIssues.length,
          totalIssues: issues.length
        }
      });
    }
  }

  /**
   * パフォーマンス劣化の報告
   */
  public reportPerformanceDegradation(
    metric: string,
    value: number,
    threshold: number,
    context?: Record<string, any>
  ): void {
    const severityRatio = value / threshold;
    let severity: AlertSeverity = 'LOW';
    
    if (severityRatio > 3) severity = 'CRITICAL';
    else if (severityRatio > 2) severity = 'HIGH';
    else if (severityRatio > 1.5) severity = 'MEDIUM';

    this.reportEvent({
      type: 'PERFORMANCE_DEGRADATION',
      severity,
      title: `Performance Degradation: ${metric}`,
      message: `${metric} exceeded threshold: ${value} > ${threshold}`,
      context: {
        metric,
        value,
        threshold,
        severityRatio,
        ...context
      }
    });
  }

  /**
   * カスタムアラート
   */
  public alert(
    type: MonitoringEventType,
    severity: AlertSeverity,
    title: string,
    message: string,
    context?: Record<string, any>
  ): void {
    this.reportEvent({
      type,
      severity,
      title,
      message,
      context
    });
  }

  /**
   * 監視システムの終了処理
   */
  public destroy(): void {
    // イベントリスナーの削除
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }

    // Performance Observer の停止
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    // 残りのイベントを送信
    this.flushEvents();

    console.log('🔍 Monitoring system destroyed');
  }

  // プライベートメソッド

  private shouldSampleEvent(eventType: 'error' | 'performance' | 'userExperience'): boolean {
    const samplingRates = {
      error: this.config.sampling.errorSampling,
      performance: this.config.sampling.performanceSampling,
      userExperience: this.config.sampling.userExperienceSampling
    };

    return Math.random() < samplingRates[eventType];
  }

  private shouldReportEvent(event: MonitoringEvent): boolean {
    // URL フィルタリング
    if (this.config.filters.excludeUrls?.some(pattern => 
      event.url?.includes(pattern)
    )) {
      return false;
    }

    // エラーメッセージフィルタリング
    if (this.config.filters.excludeErrors?.some(pattern => 
      event.message.includes(pattern)
    )) {
      return false;
    }

    // コンポーネントフィルタリング
    if (this.config.filters.includeOnlyComponents?.length && 
        !this.config.filters.includeOnlyComponents.includes(event.metadata?.component || '')) {
      return false;
    }

    return true;
  }

  private checkRateLimit(event: MonitoringEvent): boolean {
    const key = `${event.type}-${event.severity}`;
    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry) {
      this.rateLimitMap.set(key, { count: 1, lastReset: now });
      return true;
    }

    const timeWindow = 60000; // 1分間のウィンドウ
    const maxEvents = event.severity === 'CRITICAL' ? 10 : 5;

    if (now - entry.lastReset > timeWindow) {
      entry.count = 1;
      entry.lastReset = now;
      return true;
    }

    if (entry.count >= maxEvents) {
      return false; // レート制限に引っかかった
    }

    entry.count++;
    return true;
  }

  private determineErrorSeverity(error: Error): AlertSeverity {
    if (!error) return 'LOW';
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('security') || message.includes('unauthorized')) {
      return 'CRITICAL';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'HIGH';
    }
    if (message.includes('validation') || message.includes('type')) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  private analyzePerformanceEntry(entry: PerformanceEntry): void {
    if (entry.entryType === 'measure') {
      if (entry.duration > this.config.thresholds.responseTime) {
        this.reportPerformanceDegradation(
          entry.name,
          entry.duration,
          this.config.thresholds.responseTime,
          { entryType: entry.entryType }
        );
      }
    } else if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      const loadTime = navEntry.loadEventEnd - navEntry.navigationStart;
      
      if (loadTime > 3000) { // 3秒以上のページロード
        this.reportEvent({
          type: 'PERFORMANCE_DEGRADATION',
          severity: loadTime > 10000 ? 'HIGH' : 'MEDIUM',
          title: 'Slow Page Load',
          message: `Page load took ${Math.round(loadTime)}ms`,
          context: {
            loadTime,
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
            firstPaint: navEntry.loadEventStart - navEntry.navigationStart
          }
        });
      }
    }
  }

  private setupResponseTimeMonitoring(): void {
    // Fetch API の監視
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (duration > this.config.thresholds.responseTime && this.shouldSampleEvent('performance')) {
          this.reportPerformanceDegradation(
            'API Response Time',
            duration,
            this.config.thresholds.responseTime,
            {
              url: args[0],
              method: args[1]?.method || 'GET',
              status: response.status
            }
          );
        }

        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (this.shouldSampleEvent('error')) {
          this.reportEvent({
            type: 'ERROR',
            severity: 'HIGH',
            title: 'API Request Failed',
            message: `Failed to fetch ${args[0]}: ${(error as Error).message}`,
            context: {
              url: args[0],
              method: args[1]?.method || 'GET',
              duration,
              error: error
            }
          });
        }

        throw error;
      }
    };
  }

  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      
      if (usedMB > this.config.thresholds.memoryUsage) {
        this.reportPerformanceDegradation(
          'Memory Usage',
          usedMB,
          this.config.thresholds.memoryUsage,
          {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        );
      }
    }
  }

  private performHealthCheck(): void {
    const healthMetrics = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null,
      memory: 'memory' in performance ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null,
      timing: performance.timing ? {
        navigationStart: performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
      } : null
    };

    this.reportEvent({
      type: 'SYSTEM_HEALTH',
      severity: 'LOW',
      title: 'System Health Check',
      message: 'Periodic system health check completed',
      context: healthMetrics
    });
  }

  private flushEvents(): void {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    // 各チャンネルにイベントを送信
    for (const channel of this.config.channels) {
      if (!channel.enabled) {
        continue;
      }

      const filteredEvents = eventsToSend.filter(event => {
        return channel.severityFilter.includes(event.severity) &&
               (!channel.typeFilter || channel.typeFilter.includes(event.type));
      });

      if (filteredEvents.length > 0) {
        this.sendToChannel(channel, filteredEvents);
      }
    }
  }

  private sendToChannel(channel: AlertChannel, events: MonitoringEvent[]): void {
    try {
      switch (channel.type) {
        case 'console':
          this.sendToConsole(events);
          break;
        case 'webhook':
          this.sendToWebhook(channel.config.url, events);
          break;
        case 'sentry':
          this.sendToSentry(events);
          break;
        case 'datadog':
          this.sendToDatadog(channel.config, events);
          break;
        case 'slack':
          this.sendToSlack(channel.config, events);
          break;
        case 'email':
          this.sendToEmail(channel.config, events);
          break;
        default:
          console.warn(`Unknown alert channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel.type}:`, error);
    }
  }

  private sendToConsole(events: MonitoringEvent[]): void {
    events.forEach(event => {
      const logLevel = {
        'CRITICAL': 'error',
        'HIGH': 'error',
        'MEDIUM': 'warn',
        'LOW': 'info'
      }[event.severity] as 'error' | 'warn' | 'info';

      console[logLevel](`🚨 [${event.type}] ${event.title}`, {
        message: event.message,
        context: event.context,
        timestamp: event.timestamp
      });
    });
  }

  private sendToWebhook(url: string, events: MonitoringEvent[]): void {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        events,
        source: 'ai-todo-monitoring',
        timestamp: new Date().toISOString()
      })
    }).catch(error => {
      console.error('Failed to send webhook alert:', error);
    });
  }

  private sendToSentry(events: MonitoringEvent[]): void {
    // Sentryが利用可能な場合のみ送信
    if (typeof (window as any).Sentry !== 'undefined') {
      events.forEach(event => {
        (window as any).Sentry.captureException(new Error(event.message), {
          tags: {
            monitoringEventType: event.type,
            severity: event.severity
          },
          extra: event.context,
          level: event.severity === 'CRITICAL' || event.severity === 'HIGH' ? 'error' : 'warning'
        });
      });
    }
  }

  private sendToDatadog(config: any, events: MonitoringEvent[]): void {
    // Datadog RUM が利用可能な場合のみ送信
    if (typeof (window as any).DD_RUM !== 'undefined') {
      events.forEach(event => {
        (window as any).DD_RUM.addError(event.message, {
          ...event.context,
          monitoringEventType: event.type,
          severity: event.severity
        });
      });
    }
  }

  private sendToSlack(config: { webhookUrl: string }, events: MonitoringEvent[]): void {
    const message = {
      text: `🚨 AI Todo Monitoring Alert`,
      blocks: events.map(event => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${event.title}*\n${event.message}\n_Severity: ${event.severity} | Type: ${event.type}_`
        }
      }))
    };

    fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }).catch(error => {
      console.error('Failed to send Slack alert:', error);
    });
  }

  private sendToEmail(config: { apiUrl: string; recipients: string[] }, events: MonitoringEvent[]): void {
    const emailData = {
      to: config.recipients,
      subject: `AI Todo Monitoring Alert - ${events.length} events`,
      html: this.generateEmailHtml(events)
    };

    fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    }).catch(error => {
      console.error('Failed to send email alert:', error);
    });
  }

  private generateEmailHtml(events: MonitoringEvent[]): string {
    return `
      <html>
        <body>
          <h2>AI Todo Monitoring Alert</h2>
          <p>Detected ${events.length} monitoring events:</p>
          <ul>
            ${events.map(event => `
              <li>
                <strong>${event.title}</strong> (${event.severity})
                <br>
                <em>${event.message}</em>
                <br>
                <small>${event.timestamp.toISOString()}</small>
              </li>
            `).join('')}
          </ul>
        </body>
      </html>
    `;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('monitoring_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('monitoring_session_id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | undefined {
    // 実際のアプリケーションのユーザー管理システムから取得
    return localStorage.getItem('user_id') || undefined;
  }
}

/**
 * デフォルト設定でのモニタリングシステム初期化
 */
export function initializeMonitoring(customConfig?: Partial<MonitoringConfig>): MonitoringSystem {
  const defaultConfig: MonitoringConfig = {
    enabled: process.env.NODE_ENV === 'production',
    environment: (process.env.NODE_ENV as any) || 'development',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    channels: [
      {
        name: 'console',
        type: 'console',
        enabled: true,
        config: {},
        severityFilter: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      }
    ],
    thresholds: {
      errorRate: 5, // 5%
      responseTime: 2000, // 2秒
      memoryUsage: 100, // 100MB
      dataIntegrityScore: 80 // 80%
    },
    sampling: {
      errorSampling: 1.0, // 100%
      performanceSampling: 0.1, // 10%
      userExperienceSampling: 0.5 // 50%
    },
    filters: {
      excludeUrls: ['/health', '/ping'],
      excludeErrors: ['ResizeObserver loop limit exceeded']
    }
  };

  const config = { ...defaultConfig, ...customConfig };
  return new MonitoringSystem(config);
}

// グローバルなモニタリングシステムインスタンス
let globalMonitoringSystem: MonitoringSystem | null = null;

/**
 * グローバルモニタリングシステムの取得
 */
export function getGlobalMonitoring(): MonitoringSystem | null {
  return globalMonitoringSystem;
}

/**
 * グローバルモニタリングシステムの設定
 */
export function setGlobalMonitoring(system: MonitoringSystem): void {
  globalMonitoringSystem = system;
}

/**
 * 簡易アラート送信関数
 */
export function alert(
  type: MonitoringEventType,
  severity: AlertSeverity,
  title: string,
  message: string,
  context?: Record<string, any>
): void {
  const monitoring = getGlobalMonitoring();
  if (monitoring) {
    monitoring.alert(type, severity, title, message, context);
  } else {
    console.warn('Monitoring system not initialized');
    console.log(`[${severity}] ${title}: ${message}`, context);
  }
}

/**
 * パフォーマンス劣化の報告
 */
export function reportPerformanceIssue(
  metric: string,
  value: number,
  threshold: number,
  context?: Record<string, any>
): void {
  const monitoring = getGlobalMonitoring();
  if (monitoring) {
    monitoring.reportPerformanceDegradation(metric, value, threshold, context);
  }
}

/**
 * データ整合性問題の報告
 */
export function reportDataIntegrityIssue(
  score: number,
  issues: Array<{ type: string; severity: string; message: string }>
): void {
  const monitoring = getGlobalMonitoring();
  if (monitoring) {
    monitoring.reportDataIntegrityIssue(score, issues);
  }
}