import { CacheUtility } from '../CacheUtility';

// Mock browser APIs
const mockCaches = {
  keys: jest.fn(),
  delete: jest.fn(),
};

const mockNavigator = {
  serviceWorker: {
    getRegistrations: jest.fn(),
  },
};

const mockStorage = {
  clear: jest.fn(),
};

// Setup global mocks
Object.defineProperty(global, 'caches', {
  value: mockCaches,
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true,
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockStorage,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    mtaService: {
      clearAllCaches: jest.fn(),
    },
  },
  writable: true,
});

describe('CacheUtility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  test('shouldClearAllCachesSuccessfully', async () => {
    // Red: Test that clearAllCaches works when all APIs are available
    
    // Setup mocks
    mockCaches.keys.mockResolvedValue(['cache1', 'cache2']);
    mockCaches.delete.mockResolvedValue(true);
    mockNavigator.serviceWorker.getRegistrations.mockResolvedValue([
      { unregister: jest.fn().mockResolvedValue(true) }
    ]);

    const result = await CacheUtility.clearAllCaches();

    expect(result.success).toBe(true);
    expect(result.message).toContain('All caches cleared successfully');
    
    // Verify cache operations
    expect(mockCaches.keys).toHaveBeenCalled();
    expect(mockCaches.delete).toHaveBeenCalledWith('cache1');
    expect(mockCaches.delete).toHaveBeenCalledWith('cache2');
    
    // Verify storage cleared
    expect(mockStorage.clear).toHaveBeenCalledTimes(2); // localStorage and sessionStorage
    
    // Verify service worker unregistered
    expect(mockNavigator.serviceWorker.getRegistrations).toHaveBeenCalled();
  });

  test('shouldHandleErrorsGracefully', async () => {
    // Red: Test that clearAllCaches handles errors properly
    
    // Make caches.keys throw an error
    mockCaches.keys.mockRejectedValue(new Error('Cache API error'));

    const result = await CacheUtility.clearAllCaches();

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to clear some caches');
    expect(console.error).toHaveBeenCalledWith(
      '[CacheUtility] Failed to clear caches:',
      expect.any(Error)
    );
  });

  test('shouldWorkWithoutServiceWorkerSupport', async () => {
    // Red: Test that clearAllCaches works when service worker is not supported
    
    // Remove service worker support
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
    });

    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
    });

    const result = await CacheUtility.clearAllCaches();

    expect(result.success).toBe(true);
    expect(result.message).toContain('All caches cleared successfully');
  });

  test('shouldGetCacheInfo', async () => {
    // Red: Test that getCacheInfo returns proper information
    
    mockCaches.keys.mockResolvedValue(['workbox-precache', 'mta-data']);
    
    // Mock storage estimate
    Object.defineProperty(global, 'navigator', {
      value: {
        storage: {
          estimate: jest.fn().mockResolvedValue({ usage: 1024 * 1024 }), // 1MB
        },
        serviceWorker: {},
      },
      writable: true,
    });

    const info = await CacheUtility.getCacheInfo();

    expect(info.serviceWorkerCaches).toEqual(['workbox-precache', 'mta-data']);
    expect(info.storageSize).toBe(1024 * 1024);
    expect(info.hasServiceWorker).toBe(true);
  });

  test('shouldHandleMissingMTAService', async () => {
    // Red: Test that clearAllCaches works when MTA service is not available
    
    Object.defineProperty(global, 'window', {
      value: {},
      writable: true,
    });

    // Ensure caches and navigator are available for this test
    mockCaches.keys.mockResolvedValue([]);
    mockNavigator.serviceWorker.getRegistrations.mockResolvedValue([]);
    
    // Reset navigator to have serviceWorker property
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          getRegistrations: jest.fn().mockResolvedValue([]),
        },
      },
      writable: true,
    });

    const result = await CacheUtility.clearAllCaches();

    expect(result.success).toBe(true);
    expect(console.log).toHaveBeenCalledWith('[CacheUtility] Clearing all caches...');
    expect(console.log).toHaveBeenCalledWith('[CacheUtility] All caches cleared successfully');
  });
});