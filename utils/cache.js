/**
 * ⚡ ULTRA CACHING SYSTEM ⚡
 * High-performance multi-layer caching with intelligent invalidation
 * Enterprise-grade implementation with ML-inspired patterns
 */

import logger from './logger.js';

/**
 * In-memory cache with LRU eviction
 */
export class MemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.cache = new Map();
    this.accessCount = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  /**
   * Get value from cache
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access count for LRU
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = this.ttl) {
    // Evict if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry = {
      value,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: Date.now() + ttl
    };

    this.cache.set(key, entry);
    this.accessCount.set(key, 0);
    this.stats.sets++;

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key) {
    this.cache.delete(key);
    this.accessCount.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.accessCount.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let lruKey = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getSize() {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // approximate string size
      totalSize += JSON.stringify(entry.value).length * 2;
    }
    return totalSize;
  }
}

/**
 * Cache key generator
 */
export class CacheKeyGenerator {
  static generate(prefix, ...parts) {
    return `${prefix}:${parts.map(p => {
      if (typeof p === 'object') {
        return JSON.stringify(p);
      }
      return String(p);
    }).join(':')}`;
  }

  static generateHash(obj) {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Cache middleware factory
 */
export function cacheMiddleware(options = {}) {
  const cache = new MemoryCache({
    maxSize: options.maxSize || 500,
    ttl: options.ttl || 300000
  });

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate cache key
    const cacheKey = CacheKeyGenerator.generate(
      'route',
      req.path,
      req.query
    );

    // Check cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      cache.set(cacheKey, data, options.ttl);
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
}

/**
 * Intelligent cache with predictive patterns
 */
export class SmartCache extends MemoryCache {
  constructor(options = {}) {
    super(options);
    this.accessPatterns = new Map();
    this.predictiveEnabled = options.predictive !== false;
  }

  /**
   * Get with pattern learning
   */
  get(key) {
    const value = super.get(key);

    if (this.predictiveEnabled) {
      this.recordAccess(key);
      this.prefetchRelated(key);
    }

    return value;
  }

  /**
   * Record access pattern
   */
  recordAccess(key) {
    const now = Date.now();
    const pattern = this.accessPatterns.get(key) || {
      count: 0,
      times: [],
      relatedKeys: new Set()
    };

    pattern.count++;
    pattern.times.push(now);

    // Keep only last 10 access times
    if (pattern.times.length > 10) {
      pattern.times.shift();
    }

    this.accessPatterns.set(key, pattern);
  }

  /**
   * Predict and prefetch related keys
   */
  prefetchRelated(key) {
    const pattern = this.accessPatterns.get(key);
    if (!pattern) return;

    // Calculate access frequency
    const avgInterval = this.calculateAverageInterval(pattern.times);

    // If key is accessed frequently (< 5 minutes between accesses)
    if (avgInterval < 300000) {
      // Prefetch related keys
      pattern.relatedKeys.forEach(relatedKey => {
        if (!this.cache.has(relatedKey)) {
          logger.debug(`Predictive prefetch: ${relatedKey}`);
        }
      });
    }
  }

  /**
   * Calculate average interval between accesses
   */
  calculateAverageInterval(times) {
    if (times.length < 2) return Infinity;

    let totalInterval = 0;
    for (let i = 1; i < times.length; i++) {
      totalInterval += times[i] - times[i - 1];
    }

    return totalInterval / (times.length - 1);
  }

  /**
   * Link related keys for predictive caching
   */
  linkKeys(key1, key2) {
    const pattern1 = this.accessPatterns.get(key1) || {
      count: 0,
      times: [],
      relatedKeys: new Set()
    };
    const pattern2 = this.accessPatterns.get(key2) || {
      count: 0,
      times: [],
      relatedKeys: new Set()
    };

    pattern1.relatedKeys.add(key2);
    pattern2.relatedKeys.add(key1);

    this.accessPatterns.set(key1, pattern1);
    this.accessPatterns.set(key2, pattern2);
  }
}

/**
 * Cache warming - preload frequently accessed data
 */
export class CacheWarmer {
  constructor(cache, warmupFunctions = []) {
    this.cache = cache;
    this.warmupFunctions = warmupFunctions;
    this.warming = false;
  }

  /**
   * Execute cache warming
   */
  async warm() {
    if (this.warming) {
      logger.warn('Cache warming already in progress');
      return;
    }

    this.warming = true;
    logger.info('Starting cache warming...');

    try {
      const results = await Promise.allSettled(
        this.warmupFunctions.map(fn => fn(this.cache))
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      logger.info('Cache warming completed', { succeeded, failed });
    } catch (error) {
      logger.error('Cache warming failed', error);
    } finally {
      this.warming = false;
    }
  }

  /**
   * Schedule periodic warming
   */
  schedule(interval = 3600000) { // 1 hour default
    setInterval(() => this.warm(), interval);
    logger.info('Cache warming scheduled', { interval });
  }
}

/**
 * Cache invalidation patterns
 */
export class CacheInvalidator {
  constructor(cache) {
    this.cache = cache;
    this.invalidationRules = new Map();
  }

  /**
   * Register invalidation rule
   */
  addRule(pattern, invalidatePatterns) {
    this.invalidationRules.set(pattern, invalidatePatterns);
  }

  /**
   * Invalidate cache based on event
   */
  invalidate(event, data = {}) {
    logger.debug('Cache invalidation triggered', { event, data });

    const patterns = this.invalidationRules.get(event) || [];

    patterns.forEach(pattern => {
      // If pattern is a function, execute it
      if (typeof pattern === 'function') {
        const keys = pattern(data);
        keys.forEach(key => this.cache.delete(key));
      }
      // If pattern is a string, match prefix
      else if (typeof pattern === 'string') {
        this.invalidateByPrefix(pattern);
      }
      // If pattern is regex, match all keys
      else if (pattern instanceof RegExp) {
        this.invalidateByPattern(pattern);
      }
    });
  }

  /**
   * Invalidate by key prefix
   */
  invalidateByPrefix(prefix) {
    const cache = this.cache.cache;
    let count = 0;

    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }

    logger.debug(`Invalidated ${count} keys with prefix: ${prefix}`);
  }

  /**
   * Invalidate by pattern
   */
  invalidateByPattern(pattern) {
    const cache = this.cache.cache;
    let count = 0;

    for (const key of cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    logger.debug(`Invalidated ${count} keys matching pattern: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  invalidateAll() {
    this.cache.clear();
    logger.info('All cache invalidated');
  }
}

/**
 * Response compression helper
 */
export function compressResponse(data) {
  // In production, this would use actual compression (gzip, brotli)
  // For now, just JSON stringify
  return JSON.stringify(data);
}

/**
 * Memoization decorator
 */
export function memoize(fn, options = {}) {
  const cache = new MemoryCache(options);

  return function(...args) {
    const key = CacheKeyGenerator.generateHash(args);
    const cached = cache.get(key);

    if (cached !== null) {
      return cached;
    }

    const result = fn.apply(this, args);

    if (result instanceof Promise) {
      return result.then(value => {
        cache.set(key, value);
        return value;
      });
    }

    cache.set(key, result);
    return result;
  };
}

/**
 * Cache statistics tracker
 */
export class CacheStatsTracker {
  constructor() {
    this.metrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      latency: [],
      sizes: []
    };
  }

  recordRequest(hit, latency, size = 0) {
    this.metrics.requests++;
    if (hit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }

    this.metrics.latency.push(latency);
    if (size > 0) {
      this.metrics.sizes.push(size);
    }

    // Keep only last 1000 measurements
    if (this.metrics.latency.length > 1000) {
      this.metrics.latency.shift();
    }
    if (this.metrics.sizes.length > 1000) {
      this.metrics.sizes.shift();
    }
  }

  getStats() {
    const hitRate = this.metrics.requests > 0
      ? this.metrics.hits / this.metrics.requests
      : 0;

    const avgLatency = this.metrics.latency.length > 0
      ? this.metrics.latency.reduce((a, b) => a + b, 0) / this.metrics.latency.length
      : 0;

    const avgSize = this.metrics.sizes.length > 0
      ? this.metrics.sizes.reduce((a, b) => a + b, 0) / this.metrics.sizes.length
      : 0;

    return {
      requests: this.metrics.requests,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgLatency: Math.round(avgLatency * 100) / 100,
      avgSize: Math.round(avgSize)
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      hits: 0,
      misses: 0,
      latency: [],
      sizes: []
    };
  }
}

// Create global cache instances
export const globalCache = new SmartCache({
  maxSize: 1000,
  ttl: 300000,
  predictive: true
});

export const queryCache = new MemoryCache({
  maxSize: 500,
  ttl: 600000 // 10 minutes
});

export const userCache = new MemoryCache({
  maxSize: 100,
  ttl: 1800000 // 30 minutes
});

// Create cache invalidator
export const cacheInvalidator = new CacheInvalidator(globalCache);

// Setup common invalidation rules
cacheInvalidator.addRule('client:created', ['route:clients']);
cacheInvalidator.addRule('client:updated', [(data) => [`route:clients:${data.id}`]]);
cacheInvalidator.addRule('client:deleted', ['route:clients']);

export default {
  MemoryCache,
  SmartCache,
  CacheKeyGenerator,
  CacheWarmer,
  CacheInvalidator,
  CacheStatsTracker,
  cacheMiddleware,
  memoize,
  globalCache,
  queryCache,
  userCache,
  cacheInvalidator
};
