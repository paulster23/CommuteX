/**
 * Error Handling Service for Phase 6
 * 
 * Following CLAUDE.md principles - robust error handling with user-friendly messaging
 * Provides centralized error management and recovery options
 */

export interface ErrorContext {
  operation: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  recoveryActions: RecoveryAction[];
  technicalDetails?: string;
  errorCode?: string;
}

export interface RecoveryAction {
  label: string;
  action: 'retry' | 'refresh' | 'offline' | 'contact' | 'navigate' | 'custom';
  data?: any;
  primary?: boolean;
}

export interface ErrorLog {
  id: string;
  error: Error;
  context: ErrorContext;
  userFriendlyError: UserFriendlyError;
  resolved: boolean;
  resolvedAt?: Date;
  userActions: string[];
}

export class ErrorHandlingService {
  private errorLogs: ErrorLog[] = [];
  private errorCallbacks: Map<string, (error: UserFriendlyError) => void> = new Map();
  private readonly MAX_ERROR_LOGS = 100;

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Only set up in browser environment with functioning event listeners
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          operation: 'unhandled_promise_rejection',
          timestamp: new Date(),
          additionalData: { 
            promise: event.promise,
            type: 'unhandledrejection' 
          }
        });
      });

      // Handle JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleError(new Error(event.message), {
          operation: 'javascript_error',
          timestamp: new Date(),
          additionalData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            type: 'javascript_error'
          }
        });
      });
    }
  }

  handleError(error: Error, context: ErrorContext): UserFriendlyError {
    const userFriendlyError = this.createUserFriendlyError(error, context);
    
    // Log the error
    const errorLog: ErrorLog = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      error,
      context,
      userFriendlyError,
      resolved: false,
      userActions: []
    };

    this.errorLogs.push(errorLog);
    this.maintainErrorLogSize();

    // Notify registered callbacks
    this.notifyErrorCallbacks(userFriendlyError);

    // Log to console for debugging
    console.error('[ErrorHandlingService] Error occurred:', {
      errorId: errorLog.id,
      operation: context.operation,
      message: error.message,
      userFriendlyMessage: userFriendlyError.message
    });

    return userFriendlyError;
  }

  private createUserFriendlyError(error: Error, context: ErrorContext): UserFriendlyError {
    const errorMessage = error.message.toLowerCase();
    const operation = context.operation.toLowerCase();

    // MTA/GTFS-specific errors
    if (errorMessage.includes('mta') || errorMessage.includes('gtfs') || errorMessage.includes('feed')) {
      return this.createMTAError(error, context);
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      return this.createNetworkError(error, context);
    }

    // Offline errors
    if (errorMessage.includes('offline') || errorMessage.includes('cached') || !navigator.onLine) {
      return this.createOfflineError(error, context);
    }

    // Route calculation errors
    if (operation.includes('route') || operation.includes('calculate')) {
      return this.createRouteError(error, context);
    }

    // Service worker/PWA errors
    if (errorMessage.includes('service worker') || errorMessage.includes('notification') || errorMessage.includes('sync')) {
      return this.createPWAError(error, context);
    }

    // Cache errors
    if (errorMessage.includes('cache') || operation.includes('cache')) {
      return this.createCacheError(error, context);
    }

    // Performance/timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('performance')) {
      return this.createPerformanceError(error, context);
    }

    // Generic fallback
    return this.createGenericError(error, context);
  }

  private createMTAError(error: Error, context: ErrorContext): UserFriendlyError {
    const isFeedDown = error.message.includes('down') || error.message.includes('unavailable');
    
    return {
      title: 'Real-Time Data Unavailable',
      message: isFeedDown 
        ? 'MTA real-time feeds are currently down. We\'ll show cached route information if available.'
        : 'Having trouble getting the latest subway information. This usually resolves quickly.',
      severity: 'warning',
      errorCode: 'MTA_FEED_ERROR',
      recoveryActions: [
        {
          label: 'Try Again',
          action: 'retry',
          primary: true
        },
        {
          label: 'Use Cached Routes',
          action: 'offline',
          data: { useCachedData: true }
        },
        {
          label: 'Check MTA Status',
          action: 'navigate',
          data: { url: 'https://status.mta.info' }
        }
      ],
      technicalDetails: `Operation: ${context.operation}, Error: ${error.message}`
    };
  }

  private createNetworkError(error: Error, context: ErrorContext): UserFriendlyError {
    return {
      title: 'Connection Problem',
      message: 'Unable to connect to transit data services. Please check your internet connection.',
      severity: 'error',
      errorCode: 'NETWORK_ERROR',
      recoveryActions: [
        {
          label: 'Retry',
          action: 'retry',
          primary: true
        },
        {
          label: 'Use Offline Mode',
          action: 'offline',
          data: { enableOfflineMode: true }
        },
        {
          label: 'Refresh App',
          action: 'refresh'
        }
      ],
      technicalDetails: `Network error during ${context.operation}: ${error.message}`
    };
  }

  private createOfflineError(error: Error, context: ErrorContext): UserFriendlyError {
    return {
      title: 'Offline Mode',
      message: 'You\'re currently offline. Showing saved route information from your recent searches.',
      severity: 'info',
      errorCode: 'OFFLINE_MODE',
      recoveryActions: [
        {
          label: 'Continue Offline',
          action: 'offline',
          primary: true,
          data: { acknowledgeOffline: true }
        },
        {
          label: 'Check Connection',
          action: 'retry'
        }
      ],
      technicalDetails: `Offline operation: ${context.operation}`
    };
  }

  private createRouteError(error: Error, context: ErrorContext): UserFriendlyError {
    const noRoutes = error.message.includes('No routes') || error.message.includes('no cached');
    
    return {
      title: 'Route Not Available',
      message: noRoutes
        ? 'No routes found for your search. Try different locations or check if subway service is running.'
        : 'Unable to calculate route with current transit data. This usually resolves quickly.',
      severity: 'warning',
      errorCode: 'ROUTE_CALCULATION_ERROR',
      recoveryActions: [
        {
          label: 'Try Different Route',
          action: 'custom',
          primary: true,
          data: { action: 'showRouteOptions' }
        },
        {
          label: 'Try Again',
          action: 'retry'
        },
        {
          label: 'Check Service Status',
          action: 'navigate',
          data: { url: 'https://status.mta.info' }
        }
      ],
      technicalDetails: `Route calculation failed: ${error.message}`
    };
  }

  private createPWAError(error: Error, context: ErrorContext): UserFriendlyError {
    return {
      title: 'App Feature Unavailable',
      message: 'Some app features aren\'t working right now, but you can still search for routes.',
      severity: 'info',
      errorCode: 'PWA_ERROR',
      recoveryActions: [
        {
          label: 'Continue',
          action: 'custom',
          primary: true,
          data: { action: 'dismissError' }
        },
        {
          label: 'Refresh App',
          action: 'refresh'
        }
      ],
      technicalDetails: `PWA feature error: ${error.message}`
    };
  }

  private createCacheError(error: Error, context: ErrorContext): UserFriendlyError {
    return {
      title: 'Data Storage Issue',
      message: 'Having trouble saving your route data. The app will still work, but may be slower.',
      severity: 'warning',
      errorCode: 'CACHE_ERROR',
      recoveryActions: [
        {
          label: 'Continue',
          action: 'custom',
          primary: true,
          data: { action: 'clearCache' }
        },
        {
          label: 'Clear App Data',
          action: 'custom',
          data: { action: 'resetStorage' }
        }
      ],
      technicalDetails: `Cache operation failed: ${error.message}`
    };
  }

  private createPerformanceError(error: Error, context: ErrorContext): UserFriendlyError {
    return {
      title: 'Slow Response',
      message: 'The transit data is taking longer than usual to load. Please wait a moment.',
      severity: 'warning',
      errorCode: 'PERFORMANCE_ERROR',
      recoveryActions: [
        {
          label: 'Wait',
          action: 'custom',
          primary: true,
          data: { action: 'waitAndRetry' }
        },
        {
          label: 'Try Again',
          action: 'retry'
        },
        {
          label: 'Use Cached Data',
          action: 'offline',
          data: { preferCached: true }
        }
      ],
      technicalDetails: `Performance issue: ${error.message}`
    };
  }

  private createGenericError(error: Error, context: ErrorContext): UserFriendlyError {
    return {
      title: 'Something Went Wrong',
      message: 'We encountered an unexpected issue. Please try again in a moment.',
      severity: 'error',
      errorCode: 'GENERIC_ERROR',
      recoveryActions: [
        {
          label: 'Try Again',
          action: 'retry',
          primary: true
        },
        {
          label: 'Refresh App',
          action: 'refresh'
        },
        {
          label: 'Report Issue',
          action: 'contact',
          data: { 
            subject: 'CommuteX Error Report',
            errorId: `error-${Date.now()}`
          }
        }
      ],
      technicalDetails: `Unexpected error in ${context.operation}: ${error.message}`
    };
  }

  private notifyErrorCallbacks(userFriendlyError: UserFriendlyError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(userFriendlyError);
      } catch (error) {
        console.error('[ErrorHandlingService] Error in error callback:', error);
      }
    });
  }

  private maintainErrorLogSize(): void {
    if (this.errorLogs.length > this.MAX_ERROR_LOGS) {
      this.errorLogs = this.errorLogs.slice(-this.MAX_ERROR_LOGS);
    }
  }

  // Public API methods
  registerErrorCallback(id: string, callback: (error: UserFriendlyError) => void): void {
    this.errorCallbacks.set(id, callback);
  }

  unregisterErrorCallback(id: string): void {
    this.errorCallbacks.delete(id);
  }

  markErrorResolved(errorId: string, userAction: string): void {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      errorLog.resolvedAt = new Date();
      errorLog.userActions.push(userAction);
    }
  }

  getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: number;
    resolvedErrors: number;
    criticalErrors: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const errorsByType: Record<string, number> = {};
    let recentErrors = 0;
    let resolvedErrors = 0;
    let criticalErrors = 0;

    this.errorLogs.forEach(log => {
      // Count by error code
      const errorCode = log.userFriendlyError.errorCode || 'UNKNOWN';
      errorsByType[errorCode] = (errorsByType[errorCode] || 0) + 1;

      // Count recent errors (last hour)
      if (log.context.timestamp.getTime() > oneHourAgo) {
        recentErrors++;
      }

      // Count resolved errors
      if (log.resolved) {
        resolvedErrors++;
      }

      // Count critical errors
      if (log.userFriendlyError.severity === 'critical') {
        criticalErrors++;
      }
    });

    return {
      totalErrors: this.errorLogs.length,
      errorsByType,
      recentErrors,
      resolvedErrors,
      criticalErrors
    };
  }

  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getErrorStats();
    const errorRate = stats.recentErrors;
    const criticalCount = stats.criticalErrors;
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check error rate
    if (errorRate > 10) {
      status = 'unhealthy';
      issues.push('High error rate detected');
      recommendations.push('Check network connection and MTA service status');
    } else if (errorRate > 5) {
      status = 'degraded';
      issues.push('Elevated error rate');
      recommendations.push('Monitor system performance');
    }

    // Check critical errors
    if (criticalCount > 0) {
      status = 'unhealthy';
      issues.push(`${criticalCount} critical errors detected`);
      recommendations.push('Immediate attention required');
    }

    // Check specific error patterns
    const mtaErrors = stats.errorsByType['MTA_FEED_ERROR'] || 0;
    if (mtaErrors > 3) {
      issues.push('Multiple MTA feed failures');
      recommendations.push('MTA services may be experiencing issues');
    }

    const networkErrors = stats.errorsByType['NETWORK_ERROR'] || 0;
    if (networkErrors > 3) {
      issues.push('Network connectivity problems');
      recommendations.push('Check internet connection');
    }

    return { status, issues, recommendations };
  }

  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  getRecentErrors(limit: number = 10): ErrorLog[] {
    return this.errorLogs
      .sort((a, b) => b.context.timestamp.getTime() - a.context.timestamp.getTime())
      .slice(0, limit);
  }

  // Helper method for testing
  simulateError(type: string): UserFriendlyError {
    const testErrors = {
      mta: new Error('MTA feeds are currently down'),
      network: new Error('Network connection failed'),
      offline: new Error('No cached route data available offline'),
      route: new Error('No routes found for the specified locations'),
      performance: new Error('Request timeout exceeded')
    };

    const error = testErrors[type as keyof typeof testErrors] || new Error('Test error');
    return this.handleError(error, {
      operation: `test_${type}`,
      timestamp: new Date(),
      additionalData: { isTest: true }
    });
  }
}