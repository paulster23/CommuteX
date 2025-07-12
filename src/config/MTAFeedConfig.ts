/**
 * Centralized MTA GTFS-RT Feed Configuration
 * 
 * This configuration provides the latest MTA API endpoints and handles
 * authentication requirements for accessing real-time data.
 */

export interface MTAFeedEndpoint {
  url: string;
  description: string;
  requiresAuth: boolean;
  priority: number; // Lower numbers = higher priority
}

export interface MTAFeedConfig {
  alerts: MTAFeedEndpoint[];
  subway: {
    [key: string]: MTAFeedEndpoint;
  };
  bus: MTAFeedEndpoint[];
}

/**
 * MTA Feed Configuration
 * 
 * Updated for 2025: GTFS-RT feeds don't require API keys.
 * CamSys alerts feed is primary as nyct/gtfs-alerts is currently broken (NoSuchKey error).
 * Fixed feed priorities to use working endpoints first.
 */
export const MTA_FEED_CONFIG: MTAFeedConfig = {
  alerts: [
    {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/camsys%2Fsubway-alerts',
      description: 'CamSys Service Alerts (Primary - Reliable)',
      requiresAuth: false,
      priority: 1
    },
    {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-alerts',
      description: 'MTA Native Service Alerts (Fallback - Currently Broken)',
      requiresAuth: false,
      priority: 2
    }
  ],
  subway: {
    'bdfm': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
      description: 'B, D, F, M Lines',
      requiresAuth: true,
      priority: 1
    },
    'ace': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
      description: 'A, C, E Lines',
      requiresAuth: true,
      priority: 1
    },
    'nqrw': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
      description: 'N, Q, R, W Lines',
      requiresAuth: true,
      priority: 1
    },
    'l': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
      description: 'L Line',
      requiresAuth: true,
      priority: 1
    },
    'g': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
      description: 'G Line',
      requiresAuth: true,
      priority: 1
    },
    '123456s': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-123456s',
      description: '1, 2, 3, 4, 5, 6, S Lines',
      requiresAuth: true,
      priority: 1
    },
    '7': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-7',
      description: '7 Line',
      requiresAuth: true,
      priority: 1
    },
    'jz': {
      url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
      description: 'J, Z Lines',
      requiresAuth: true,
      priority: 1
    }
  },
  bus: [
    {
      url: 'https://gtfsrt.prod.obanyc.com/alerts',
      description: 'MTA Bus Service Alerts',
      requiresAuth: true,
      priority: 1
    }
  ]
};

/**
 * Get feed URL for a specific subway line
 */
export function getFeedUrlForLine(line: string): string {
  const lineLower = line.toLowerCase();
  
  // Map individual lines to their feed groups
  const lineToFeedMap: { [key: string]: string } = {
    'b': 'bdfm', 'd': 'bdfm', 'f': 'bdfm', 'm': 'bdfm',
    'a': 'ace', 'c': 'ace', 'e': 'ace',
    'n': 'nqrw', 'q': 'nqrw', 'r': 'nqrw', 'w': 'nqrw',
    'l': 'l',
    'g': 'g',
    '1': '123456s', '2': '123456s', '3': '123456s', 
    '4': '123456s', '5': '123456s', '6': '123456s', 's': '123456s',
    '7': '7',
    'j': 'jz', 'z': 'jz'
  };
  
  const feedGroup = lineToFeedMap[lineLower];
  if (!feedGroup) {
    throw new Error(`Unknown subway line: ${line}`);
  }
  
  return MTA_FEED_CONFIG.subway[feedGroup].url;
}

/**
 * Get alerts feed URLs in priority order
 */
export function getAlertsFeedUrls(): MTAFeedEndpoint[] {
  return MTA_FEED_CONFIG.alerts.sort((a, b) => a.priority - b.priority);
}

/**
 * Environment variable names for MTA API configuration
 */
export const MTA_ENV_VARS = {
  API_KEY: 'MTA_API_KEY',
  USE_FALLBACK_ONLY: 'MTA_USE_FALLBACK_ONLY',
  DISABLE_AUTH: 'MTA_DISABLE_AUTH'
} as const;

/**
 * Get MTA API key from environment variables
 */
export function getMTAApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[MTA_ENV_VARS.API_KEY];
  }
  return undefined;
}

/**
 * Check if authentication should be disabled (for testing)
 */
export function isAuthDisabled(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[MTA_ENV_VARS.DISABLE_AUTH] === 'true';
  }
  return false;
}

/**
 * Get request headers for MTA API calls
 */
export function getMTAApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/x-protobuf',
    'User-Agent': 'CommuteX/1.0.0'
  };
  
  const apiKey = getMTAApiKey();
  if (apiKey && !isAuthDisabled()) {
    headers['x-api-key'] = apiKey;
  }
  
  return headers;
}