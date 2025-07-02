/**
 * Monitoring and Logging Service for Phase 6
 * 
 * Following CLAUDE.md principles - comprehensive monitoring and observability
 * Tracks performance, errors, and system health metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  source: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

export interface SystemMetrics {
  performance: {
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    throughput: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    memoryUsage?: number;
    errors24h: number;
  };
  features: {
    offlineCapability: boolean;
    notificationsEnabled: boolean;
    cacheEnabled: boolean;
    pwaSupportLevel: 'full' | 'partial' | 'none';
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  callback?: (metric: PerformanceMetric) => void;
}

export class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private logs: LogEntry[] = [];
  private alertRules: AlertRule[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly MAX_LOGS = 500;
  private startTime: Date;
  private sessionId: string;

  constructor() {
    this.startTime = new Date();
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.setupDefaultAlertRules();
  }

  private setupDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        metric: 'error_rate',
        threshold: 10,
        operator: 'gt',
        severity: 'high',
        enabled: true
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        metric: 'response_time',
        threshold: 5000,
        operator: 'gt',
        severity: 'medium',
        enabled: true
      },
      {
        id: 'low-cache-hit-rate',
        name: 'Low Cache Hit Rate',
        metric: 'cache_hit_rate',
        threshold: 50,
        operator: 'lt',
        severity: 'medium',
        enabled: true
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        metric: 'memory_usage',
        threshold: 80,
        operator: 'gt',
        severity: 'high',
        enabled: true
      }
    ];
  }

  recordMetric(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    this.maintainMetricsSize();
    
    // Check alert rules
    this.checkAlertRules(metric);

    // Log significant metrics
    if (this.isSignificantMetric(metric)) {
      this.log('info', `Metric recorded: ${name} = ${value} ${unit}`, 'MonitoringService', { metric });
    }
  }

  private isSignificantMetric(metric: PerformanceMetric): boolean {
    const significantMetrics = ['error_rate', 'response_time', 'cache_hit_rate', 'memory_usage'];
    return significantMetrics.includes(metric.name) || 
           metric.name.includes('error') || 
           metric.name.includes('failure');
  }

  private checkAlertRules(metric: PerformanceMetric): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled || rule.metric !== metric.name) {
        continue;
      }

      let shouldAlert = false;
      switch (rule.operator) {
        case 'gt':
          shouldAlert = metric.value > rule.threshold;
          break;
        case 'lt':
          shouldAlert = metric.value < rule.threshold;
          break;
        case 'gte':
          shouldAlert = metric.value >= rule.threshold;
          break;
        case 'lte':
          shouldAlert = metric.value <= rule.threshold;
          break;
        case 'eq':
          shouldAlert = metric.value === rule.threshold;
          break;
      }

      if (shouldAlert) {
        this.triggerAlert(rule, metric);
      }
    }
  }

  private triggerAlert(rule: AlertRule, metric: PerformanceMetric): void {
    this.log('warn', `Alert triggered: ${rule.name}`, 'AlertSystem', {
      rule: rule.id,
      metric: metric.name,
      value: metric.value,
      threshold: rule.threshold,
      severity: rule.severity
    });

    if (rule.callback) {
      try {
        rule.callback(metric);
      } catch (error) {
        this.log('error', 'Alert callback failed', 'AlertSystem', { error: (error as Error).message });
      }
    }
  }

  log(level: LogEntry['level'], message: string, source: string, context?: Record<string, any>, userId?: string): void {
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: new Date(),
      source,
      context,
      userId,
      sessionId: this.sessionId
    };

    this.logs.push(logEntry);
    this.maintainLogsSize();

    // Console output for development
    if (typeof console !== 'undefined') {
      const consoleMethod = level === 'debug' ? 'debug' :
                           level === 'info' ? 'info' :
                           level === 'warn' ? 'warn' :
                           'error';
      
      console[consoleMethod](`[${source}] ${message}`, context || '');
    }
  }

  private maintainMetricsSize(): void {
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  private maintainLogsSize(): void {
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }
  }

  getSystemMetrics(): SystemMetrics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Calculate performance metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > oneHourAgo);
    const responseTimeMetrics = recentMetrics.filter(m => m.name === 'response_time');
    const cacheHitMetrics = recentMetrics.filter(m => m.name === 'cache_hit_rate');
    const errorMetrics = recentMetrics.filter(m => m.name === 'error_rate');

    const averageResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;

    const cacheHitRate = cacheHitMetrics.length > 0
      ? cacheHitMetrics.reduce((sum, m) => sum + m.value, 0) / cacheHitMetrics.length
      : 0;

    const errorRate = errorMetrics.length > 0
      ? errorMetrics.reduce((sum, m) => sum + m.value, 0) / errorMetrics.length
      : 0;

    const throughput = recentMetrics.filter(m => m.name === 'request').length;

    // Calculate health status
    const errors24h = this.logs.filter(log => 
      log.level === 'error' && 
      log.timestamp.getTime() > oneDayAgo
    ).length;

    const uptime = now - this.startTime.getTime();
    
    let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 10 || errors24h > 50) {
      healthStatus = 'unhealthy';
    } else if (errorRate > 5 || errors24h > 20 || averageResponseTime > 3000) {
      healthStatus = 'degraded';
    }

    // Check PWA features
    const hasPWASupport = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    const hasNotifications = typeof window !== 'undefined' && 'Notification' in window;
    const hasCache = typeof window !== 'undefined' && 'caches' in window;

    let pwaSupportLevel: 'full' | 'partial' | 'none' = 'none';
    if (hasPWASupport && hasNotifications && hasCache) {
      pwaSupportLevel = 'full';
    } else if (hasPWASupport || hasCache) {
      pwaSupportLevel = 'partial';
    }

    return {
      performance: {
        averageResponseTime,
        cacheHitRate,
        errorRate,
        throughput
      },
      health: {
        status: healthStatus,
        uptime,
        errors24h
      },
      features: {
        offlineCapability: hasPWASupport && hasCache,
        notificationsEnabled: hasNotifications,
        cacheEnabled: hasCache,
        pwaSupportLevel
      }
    };
  }

  getMetrics(name?: string, since?: Date): PerformanceMetric[] {
    let filteredMetrics = this.metrics;

    if (name) {
      filteredMetrics = filteredMetrics.filter(m => m.name === name);
    }

    if (since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= since);
    }

    return filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getLogs(level?: LogEntry['level'], source?: string, since?: Date): LogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (source) {
      filteredLogs = filteredLogs.filter(log => log.source === source);
    }

    if (since) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= since);
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.alertRules.push({ ...rule, id });
    this.log('info', `Alert rule added: ${rule.name}`, 'MonitoringService', { ruleId: id });
    return id;
  }

  removeAlertRule(id: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.id === id);
    if (index >= 0) {
      this.alertRules.splice(index, 1);
      this.log('info', `Alert rule removed: ${id}`, 'MonitoringService');
      return true;
    }
    return false;
  }

  updateAlertRule(id: string, updates: Partial<Omit<AlertRule, 'id'>>): boolean {
    const rule = this.alertRules.find(r => r.id === id);
    if (rule) {
      Object.assign(rule, updates);
      this.log('info', `Alert rule updated: ${id}`, 'MonitoringService', { updates });
      return true;
    }
    return false;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  // Performance tracking helpers
  startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(`${operation}_duration`, duration, 'ms', { operation });
    };
  }

  trackOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const endTimer = this.startTimer(operation);
    const start = Date.now();

    return fn()
      .then(result => {
        endTimer();
        this.recordMetric(`${operation}_success`, 1, 'count');
        this.log('debug', `Operation completed: ${operation}`, 'MonitoringService', {
          operation,
          duration: Date.now() - start
        });
        return result;
      })
      .catch(error => {
        endTimer();
        this.recordMetric(`${operation}_error`, 1, 'count');
        this.log('error', `Operation failed: ${operation}`, 'MonitoringService', {
          operation,
          error: error.message,
          duration: Date.now() - start
        });
        throw error;
      });
  }

  // System health checks
  performHealthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, { status: boolean; message: string; duration: number }>;
  } {
    const checks: Record<string, { status: boolean; message: string; duration: number }> = {};
    
    // Check 1: Recent error rate
    const start1 = Date.now();
    const recentErrors = this.logs.filter(log => 
      log.level === 'error' && 
      log.timestamp.getTime() > Date.now() - (60 * 60 * 1000)
    ).length;
    checks.errorRate = {
      status: recentErrors < 10,
      message: `${recentErrors} errors in last hour`,
      duration: Date.now() - start1
    };

    // Check 2: Performance metrics
    const start2 = Date.now();
    const metrics = this.getSystemMetrics();
    checks.performance = {
      status: metrics.performance.averageResponseTime < 3000,
      message: `Average response time: ${metrics.performance.averageResponseTime.toFixed(0)}ms`,
      duration: Date.now() - start2
    };

    // Check 3: Cache functionality
    const start3 = Date.now();
    checks.cache = {
      status: metrics.features.cacheEnabled,
      message: metrics.features.cacheEnabled ? 'Cache enabled' : 'Cache not available',
      duration: Date.now() - start3
    };

    // Check 4: PWA features
    const start4 = Date.now();
    checks.pwa = {
      status: metrics.features.pwaSupportLevel !== 'none',
      message: `PWA support: ${metrics.features.pwaSupportLevel}`,
      duration: Date.now() - start4
    };

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => !check.status).length;
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (failedChecks > 2) {
      status = 'unhealthy';
    } else if (failedChecks > 0) {
      status = 'degraded';
    }

    this.log('info', `Health check completed: ${status}`, 'MonitoringService', {
      status,
      failedChecks,
      checks: Object.keys(checks).filter(key => !checks[key].status)
    });

    return { status, checks };
  }

  // Export data for analysis
  exportData(): {
    metrics: PerformanceMetric[];
    logs: LogEntry[];
    alerts: AlertRule[];
    system: SystemMetrics;
    session: string;
    exportedAt: Date;
  } {
    return {
      metrics: this.metrics,
      logs: this.logs,
      alerts: this.alertRules,
      system: this.getSystemMetrics(),
      session: this.sessionId,
      exportedAt: new Date()
    };
  }

  // Clear all data
  clear(): void {
    this.metrics = [];
    this.logs = [];
    this.log('info', 'Monitoring data cleared', 'MonitoringService');
  }

  // Get summary statistics
  getSummary(): {
    totalMetrics: number;
    totalLogs: number;
    errorLogs: number;
    uptime: string;
    sessionId: string;
    alertRules: number;
    lastActivity: Date | null;
  } {
    const errorLogs = this.logs.filter(log => log.level === 'error').length;
    const uptimeMs = Date.now() - this.startTime.getTime();
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    
    const lastActivity = this.metrics.length > 0 || this.logs.length > 0
      ? new Date(Math.max(
          this.metrics.length > 0 ? Math.max(...this.metrics.map(m => m.timestamp.getTime())) : 0,
          this.logs.length > 0 ? Math.max(...this.logs.map(l => l.timestamp.getTime())) : 0
        ))
      : null;

    return {
      totalMetrics: this.metrics.length,
      totalLogs: this.logs.length,
      errorLogs,
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      sessionId: this.sessionId,
      alertRules: this.alertRules.length,
      lastActivity
    };
  }
}