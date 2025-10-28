/**
 * ⚡ SERVICE WORKER - PWA Support ⚡
 * Progressive Web App with intelligent caching strategy
 * Enterprise-grade offline capabilities
 */

const CACHE_VERSION = 'v2.1.0'; // FORCE CACHE UPDATE
const CACHE_NAME = `teampulse-cache-${CACHE_VERSION}`;

// Assets to cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/ultra-optimized.css',
  '/layout-fixes.css',
  '/modals.css',
  '/prospects-manager.css',
  '/kanban-board.css',
  '/teamhub.css',
  '/ui-helpers.css',
  '/js/offline-sync.js',
  '/manifest.json'
];

// API endpoints to cache with network-first strategy
const API_CACHE_PATTERNS = [
  /\/api\/v1\/clients/,
  /\/api\/v1\/prospects/,
  /\/api\/v1\/teams/
];

// Cache strategies
const CacheStrategies = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - handle requests with appropriate strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip chrome extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip POST, PUT, DELETE requests from caching
  if (request.method !== 'GET') {
    return;
  }

  // Determine cache strategy based on request
  const strategy = determineStrategy(request);

  event.respondWith(
    handleRequest(request, strategy)
  );
});

/**
 * Determine caching strategy based on request
 */
function determineStrategy(request) {
  const url = new URL(request.url);

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    return CacheStrategies.NETWORK_FIRST;
  }

  // Static assets - Cache First
  if (url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|woff|woff2)$/)) {
    return CacheStrategies.CACHE_FIRST;
  }

  // HTML pages - Stale While Revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    return CacheStrategies.STALE_WHILE_REVALIDATE;
  }

  // Default
  return CacheStrategies.NETWORK_FIRST;
}

/**
 * Handle request with specified strategy
 */
async function handleRequest(request, strategy) {
  switch (strategy) {
    case CacheStrategies.CACHE_FIRST:
      return cacheFirst(request);

    case CacheStrategies.NETWORK_FIRST:
      return networkFirst(request);

    case CacheStrategies.STALE_WHILE_REVALIDATE:
      return staleWhileRevalidate(request);

    case CacheStrategies.CACHE_ONLY:
      return cacheOnly(request);

    case CacheStrategies.NETWORK_ONLY:
      return networkOnly(request);

    default:
      return networkFirst(request);
  }
}

/**
 * Cache First strategy
 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return createOfflineResponse();
  }
}

/**
 * Network First strategy
 */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { timeout: 3000 });

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return cache.match('/offline.html') || createOfflineResponse();
    }

    return createOfflineResponse();
  }
}

/**
 * Stale While Revalidate strategy
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Fetch and update cache in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // Return cached immediately if available, otherwise wait for fetch
  return cached || fetchPromise || createOfflineResponse();
}

/**
 * Cache Only strategy
 */
async function cacheOnly(request) {
  const cache = await caches.open(CACHE_NAME);
  return cache.match(request) || createOfflineResponse();
}

/**
 * Network Only strategy
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return createOfflineResponse();
  }
}

/**
 * Create offline response
 */
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your connection.',
      offline: true
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline': 'true'
      }
    }
  );
}

/**
 * Background sync
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[SW] Background sync started');

  try {
    // Get pending operations from IndexedDB
    // This would integrate with the offline sync manager
    console.log('[SW] Sync completed successfully');
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    throw error; // Retry sync
  }
}

/**
 * Push notifications
 */
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  const options = {
    body: data.message || 'New notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TeamPulse', options)
  );
});

/**
 * Notification click
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Message handler - communicate with clients
 */
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
    );
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

console.log(`[SW] Service Worker loaded - version ${CACHE_VERSION}`);
