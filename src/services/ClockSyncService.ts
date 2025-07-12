/**
 * Clock Synchronization Service
 * Validates device time accuracy against network time
 */

import { getFeedUrlForLine, getMTAApiHeaders } from '../config/MTAFeedConfig';

export interface TimeValidationResult {
  isAccurate: boolean;
  offsetSeconds: number;
  warningMessage?: string;
}

export class ClockSyncService {
  private static readonly MAX_ACCEPTABLE_DRIFT_SECONDS = 60; // 1 minute
  private static cachedValidation: { result: TimeValidationResult; timestamp: number } | null = null;
  private static readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Validate device clock accuracy
   */
  static async validateClockAccuracy(): Promise<TimeValidationResult> {
    // Return cached result if still valid
    if (this.cachedValidation) {
      const cacheAge = Date.now() - this.cachedValidation.timestamp;
      if (cacheAge < this.CACHE_DURATION_MS) {
        return this.cachedValidation.result;
      }
    }

    try {
      const result = await this.performClockValidation();
      
      // Cache the result
      this.cachedValidation = {
        result,
        timestamp: Date.now()
      };
      
      return result;
    } catch (error) {
      console.warn('[ClockSyncService] Clock validation failed:', error);
      
      // Return default "accurate" result if validation fails
      const fallbackResult: TimeValidationResult = {
        isAccurate: true,
        offsetSeconds: 0
      };
      
      this.cachedValidation = {
        result: fallbackResult,
        timestamp: Date.now()
      };
      
      return fallbackResult;
    }
  }

  /**
   * Perform actual clock validation using HTTP Date header
   */
  private static async performClockValidation(): Promise<TimeValidationResult> {
    const deviceTime = Date.now();
    
    // Use a reliable time source - we'll use a HEAD request to avoid data usage
    const timeUrl = 'https://worldtimeapi.org/api/ip';
    
    try {
      const response = await fetch(timeUrl, {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      // Get server time from Date header
      const serverDateHeader = response.headers.get('date');
      if (!serverDateHeader) {
        throw new Error('No Date header in response');
      }
      
      const serverTime = new Date(serverDateHeader).getTime();
      const offsetSeconds = Math.round((deviceTime - serverTime) / 1000);
      
      console.log(`[ClockSyncService] Device time offset: ${offsetSeconds} seconds`);
      
      const isAccurate = Math.abs(offsetSeconds) <= this.MAX_ACCEPTABLE_DRIFT_SECONDS;
      
      let warningMessage: string | undefined;
      if (!isAccurate) {
        if (offsetSeconds > 0) {
          warningMessage = `Your device clock is ${Math.abs(offsetSeconds)} seconds fast. Train times may appear earlier than actual.`;
        } else {
          warningMessage = `Your device clock is ${Math.abs(offsetSeconds)} seconds slow. Train times may appear later than actual.`;
        }
      }
      
      return {
        isAccurate,
        offsetSeconds,
        warningMessage
      };
      
    } catch (error) {
      // Fallback: Try using HTTP Date header from MTA API
      try {
        const mtaResponse = await fetch(getFeedUrlForLine('A'), {
          method: 'HEAD',
          cache: 'no-cache',
          headers: getMTAApiHeaders()
        });
        
        const mtaDateHeader = mtaResponse.headers.get('date');
        if (mtaDateHeader) {
          const serverTime = new Date(mtaDateHeader).getTime();
          const offsetSeconds = Math.round((deviceTime - serverTime) / 1000);
          
          const isAccurate = Math.abs(offsetSeconds) <= this.MAX_ACCEPTABLE_DRIFT_SECONDS;
          
          return {
            isAccurate,
            offsetSeconds,
            warningMessage: !isAccurate 
              ? `Device clock drift detected: ${offsetSeconds}s. Times may be inaccurate.`
              : undefined
          };
        }
      } catch (mtaError) {
        console.warn('[ClockSyncService] MTA time fallback failed:', mtaError);
      }
      
      throw error;
    }
  }

  /**
   * Get compensated current time based on known offset
   */
  static getCompensatedTime(): Date {
    if (this.cachedValidation && this.cachedValidation.result.offsetSeconds !== 0) {
      const compensatedTime = new Date(Date.now() - (this.cachedValidation.result.offsetSeconds * 1000));
      return compensatedTime;
    }
    
    return new Date();
  }

  /**
   * Clear cached validation to force fresh check
   */
  static clearCache(): void {
    this.cachedValidation = null;
  }
}