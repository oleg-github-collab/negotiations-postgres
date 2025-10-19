/* ============================================
   ROBUST API CLIENT
   Centralized API communication with retry, caching, validation
   ============================================ */

const APIClient = {
  baseURL: '/api/v1',
  defaultTimeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  cache: new Map(),
  cacheExpiration: 5 * 60 * 1000, // 5 minutes
  pendingRequests: new Map(),
  requestInterceptors: [],
  responseInterceptors: [],

  // ============================================
  // INITIALIZATION
  // ============================================

  init() {
    this.setupDefaultInterceptors();
    this.setupConnectionMonitoring();
    console.log('✅ API Client initialized');
  },

  setupDefaultInterceptors() {
    // Request interceptor - add auth, sanitize data
    this.addRequestInterceptor(async (config) => {
      // Add timestamp
      config.metadata = {
        ...config.metadata,
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      };

      // Sanitize data
      if (config.body && typeof config.body === 'object') {
        config.body = this.sanitizeData(config.body);
      }

      return config;
    });

    // Response interceptor - handle errors, cache
    this.addResponseInterceptor(
      async (response, config) => {
        // Cache successful GET requests
        if (config.method === 'GET' && config.cache !== false) {
          this.setCache(config.url, response.data);
        }

        // Log performance
        const duration = Date.now() - config.metadata.timestamp;
        if (duration > 1000) {
          console.warn(`⚠️ Slow API call: ${config.url} took ${duration}ms`);
        }

        return response;
      },
      async (error, config) => {
        // Handle specific errors
        return this.handleError(error, config);
      }
    );
  },

  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      console.log('📡 Connection restored');
      this.retryFailedRequests();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost');
    });
  },

  // ============================================
  // CORE REQUEST METHOD
  // ============================================

  async request(url, options = {}) {
    const config = {
      url: this.normalizeURL(url),
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body,
      timeout: options.timeout || this.defaultTimeout,
      retry: options.retry !== false,
      retries: 0,
      cache: options.cache !== false,
      metadata: {}
    };

    // Check cache for GET requests
    if (config.method === 'GET' && config.cache) {
      const cached = this.getCache(config.url);
      if (cached) {
        console.log(`💾 Cache hit: ${config.url}`);
        return { data: cached, cached: true };
      }
    }

    // Deduplicate identical pending requests
    const requestKey = this.getRequestKey(config);
    if (this.pendingRequests.has(requestKey)) {
      console.log(`⏳ Deduplicating request: ${config.url}`);
      return this.pendingRequests.get(requestKey);
    }

    // Execute request
    const requestPromise = this.executeRequest(config);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(requestKey);
    }
  },

  async executeRequest(config) {
    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    let lastError;

    for (let attempt = 0; attempt <= (config.retry ? this.maxRetries : 0); attempt++) {
      if (attempt > 0) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`🔄 Retry attempt ${attempt} after ${delay}ms`);
        await this.sleep(delay);
      }

      try {
        const response = await this.fetchWithTimeout(config);

        // Run response interceptors
        let result = { data: response, cached: false };
        for (const interceptor of this.responseInterceptors) {
          result = await interceptor[0](result, config);
        }

        return result;

      } catch (error) {
        lastError = error;

        // Don't retry on 4xx errors (client errors)
        if (error.status >= 400 && error.status < 500) {
          break;
        }

        // Don't retry if offline
        if (!navigator.onLine) {
          console.log('📴 Offline, queuing request');
          this.queueOfflineRequest(config);
          throw error;
        }
      }
    }

    // All retries failed, run error interceptors
    for (const interceptor of this.responseInterceptors) {
      if (interceptor[1]) {
        lastError = await interceptor[1](lastError, config);
      }
    }

    throw lastError;
  },

  async fetchWithTimeout(config) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        credentials: 'include',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Parse response
      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw {
          status: response.status,
          statusText: response.statusText,
          message: data.error || data.message || 'Request failed',
          data: data,
          response: response
        };
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw {
          status: 408,
          statusText: 'Request Timeout',
          message: 'Request timed out',
          timeout: true
        };
      }

      if (error.status) {
        throw error;
      }

      // Network error
      throw {
        status: 0,
        statusText: 'Network Error',
        message: 'Failed to connect to server',
        network: true,
        originalError: error
      };
    }
  },

  // ============================================
  // HTTP METHODS
  // ============================================

  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  },

  async post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data,
      cache: false
    });
  },

  async put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data,
      cache: false
    });
  },

  async patch(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: data,
      cache: false
    });
  },

  async delete(url, options = {}) {
    return this.request(url, {
      ...options,
      method: 'DELETE',
      cache: false
    });
  },

  // ============================================
  // INTERCEPTORS
  // ============================================

  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  },

  addResponseInterceptor(onSuccess, onError) {
    this.responseInterceptors.push([onSuccess, onError]);
    return () => {
      const index = this.responseInterceptors.findIndex(i => i[0] === onSuccess);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  },

  // ============================================
  // CACHING
  // ============================================

  getCache(url) {
    const cached = this.cache.get(url);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiration) {
      this.cache.delete(url);
      return null;
    }

    return cached.data;
  },

  setCache(url, data) {
    this.cache.set(url, {
      data,
      timestamp: Date.now()
    });
  },

  clearCache(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  },

  // ============================================
  // ERROR HANDLING
  // ============================================

  async handleError(error, config) {
    const message = this.getErrorMessage(error);

    // Log error
    console.error(`❌ API Error [${config.method} ${config.url}]:`, {
      status: error.status,
      message: error.message,
      requestId: config.metadata.requestId
    });

    // Show user-friendly notification
    if (window.ErrorHandler) {
      ErrorHandler.handleApiError(error, {
        operation: `${config.method} ${config.url}`,
        showNotification: true
      });
    }

    return error;
  },

  getErrorMessage(error) {
    if (error.timeout) return 'Request timed out. Please try again.';
    if (error.network) return 'Network error. Please check your connection.';

    switch (error.status) {
      case 400: return 'Invalid request data.';
      case 401: return 'Authentication required.';
      case 403: return 'Access denied.';
      case 404: return 'Resource not found.';
      case 409: return 'Conflict with existing data.';
      case 422: return 'Validation failed.';
      case 429: return 'Too many requests. Please wait.';
      case 500: return 'Server error. Please try again.';
      case 503: return 'Service unavailable. Please try again later.';
      default: return error.message || 'An error occurred.';
    }
  },

  // ============================================
  // OFFLINE SUPPORT
  // ============================================

  queueOfflineRequest(config) {
    const queue = this.getOfflineQueue();
    queue.push({
      config,
      timestamp: Date.now()
    });
    this.saveOfflineQueue(queue);
  },

  async retryFailedRequests() {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`🔄 Retrying ${queue.length} offline requests`);

    const results = await Promise.allSettled(
      queue.map(item => this.executeRequest(item.config))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (succeeded > 0) {
      console.log(`✅ ${succeeded} requests succeeded`);
      this.clearOfflineQueue();
    }

    if (failed > 0) {
      console.warn(`⚠️ ${failed} requests still failed`);
    }
  },

  getOfflineQueue() {
    try {
      const queue = localStorage.getItem('teampulse_offline_queue');
      return queue ? JSON.parse(queue) : [];
    } catch (e) {
      return [];
    }
  },

  saveOfflineQueue(queue) {
    try {
      localStorage.setItem('teampulse_offline_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to save offline queue:', e);
    }
  },

  clearOfflineQueue() {
    localStorage.removeItem('teampulse_offline_queue');
  },

  // ============================================
  // DATA SANITIZATION
  // ============================================

  sanitizeData(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        // Remove null/undefined
        if (value === null || value === undefined) {
          continue;
        }

        // Trim strings
        if (typeof value === 'string') {
          sanitized[key] = value.trim();
        }
        // Recursively sanitize objects
        else if (typeof value === 'object') {
          sanitized[key] = this.sanitizeData(value);
        }
        // Keep other types as-is
        else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return data;
  },

  // ============================================
  // UTILITIES
  // ============================================

  normalizeURL(url) {
    // Don't modify if already a full URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Remove any existing /api or /api/v1 prefix to avoid duplication
    let cleanUrl = url.replace(/^\/api\/v1/, '').replace(/^\/api/, '');

    // Ensure leading slash
    if (!cleanUrl.startsWith('/')) {
      cleanUrl = '/' + cleanUrl;
    }

    // Add base URL
    return `${this.baseURL}${cleanUrl}`;
  },

  getRequestKey(config) {
    return `${config.method}:${config.url}:${JSON.stringify(config.body || {})}`;
  },

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // ============================================
  // STATISTICS
  // ============================================

  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      offlineQueueSize: this.getOfflineQueue().length,
      interceptors: {
        request: this.requestInterceptors.length,
        response: this.responseInterceptors.length
      }
    };
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => APIClient.init());
} else {
  APIClient.init();
}

// Expose globally
window.APIClient = APIClient;

// ============================================
// GLOBAL apiCall - Backward Compatibility
// ============================================

/**
 * Global apiCall function for backward compatibility
 * Provides simple API for all modules
 *
 * @param {string} url - Endpoint URL (e.g., '/prospects', '/clients')
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
window.apiCall = async (url, options = {}) => {
  try {
    const method = options.method || 'GET';

    // Handle body - if string, parse it, otherwise use as-is
    let body = options.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // If not valid JSON, keep as string
      }
    }

    const response = await APIClient.request(url, {
      method,
      body,
      headers: options.headers,
      cache: options.cache,
      retry: options.retry,
      timeout: options.timeout
    });

    // Return just the data for simpler usage
    return response.data;
  } catch (error) {
    // Re-throw with better error message
    console.error(`apiCall failed [${options.method || 'GET'} ${url}]:`, error);

    // If 401, redirect to login
    if (error.status === 401) {
      console.log('🔐 Session expired, redirecting to login');
      window.location.href = '/login';
    }

    throw error;
  }
};

console.log('✅ API Client loaded with global apiCall()');
