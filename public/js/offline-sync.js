/**
 * ⚡ ULTRA OFFLINE SYNC SYSTEM ⚡
 * Progressive Web App capabilities with intelligent sync
 * Enterprise-grade offline-first architecture
 */

class OfflineSyncManager {
  constructor() {
    this.dbName = 'TeamPulseOfflineDB';
    this.dbVersion = 1;
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    this.syncInProgress = false;
    this.listeners = new Map();

    this.init();
  }

  /**
   * Initialize offline storage
   */
  async init() {
    try {
      // Open IndexedDB
      this.db = await this.openDB();

      // Setup event listeners
      this.setupEventListeners();

      // Register service worker
      await this.registerServiceWorker();

      // Start sync process if online
      if (this.isOnline) {
        this.startSync();
      }

      console.log('✅ Offline sync manager initialized');
    } catch (error) {
      console.error('Failed to initialize offline sync:', error);
    }
  }

  /**
   * Open IndexedDB
   */
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create stores
        if (!db.objectStoreNames.contains('clients')) {
          const clientsStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
          clientsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          clientsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('prospects')) {
          const prospectsStore = db.createObjectStore('prospects', { keyPath: 'id', autoIncrement: true });
          prospectsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        if (!db.objectStoreNames.contains('teams')) {
          const teamsStore = db.createObjectStore('teams', { keyPath: 'id', autoIncrement: true });
          teamsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Online/offline detection
    window.addEventListener('online', () => {
      console.log('🟢 Connection restored');
      this.isOnline = true;
      this.emit('online');
      this.startSync();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 Connection lost - switching to offline mode');
      this.isOnline = false;
      this.emit('offline');
    });

    // Visibility change - sync when tab becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.startSync();
      }
    });
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker available');
              this.emit('updateAvailable');
            }
          });
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Save data locally
   */
  async saveLocal(storeName, data) {
    try {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);

      const dataWithSync = {
        ...data,
        syncStatus: this.isOnline ? 'synced' : 'pending',
        updatedAt: Date.now()
      };

      await store.put(dataWithSync);
      await tx.complete;

      // Add to sync queue if offline
      if (!this.isOnline) {
        await this.addToSyncQueue({
          action: data.id ? 'update' : 'create',
          store: storeName,
          data: dataWithSync,
          timestamp: Date.now()
        });
      }

      return dataWithSync;
    } catch (error) {
      console.error('Failed to save locally:', error);
      throw error;
    }
  }

  /**
   * Get data from local storage
   */
  async getLocal(storeName, id = null) {
    try {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);

      if (id) {
        return await store.get(id);
      } else {
        return await store.getAll();
      }
    } catch (error) {
      console.error('Failed to get local data:', error);
      return id ? null : [];
    }
  }

  /**
   * Delete from local storage
   */
  async deleteLocal(storeName, id) {
    try {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      await store.delete(id);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await this.addToSyncQueue({
          action: 'delete',
          store: storeName,
          id,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to delete locally:', error);
      throw error;
    }
  }

  /**
   * Add operation to sync queue
   */
  async addToSyncQueue(operation) {
    const tx = this.db.transaction(['syncQueue'], 'readwrite');
    const store = tx.objectStore('syncQueue');
    await store.add(operation);
    console.log('Added to sync queue:', operation);
  }

  /**
   * Get sync queue
   */
  async getSyncQueue() {
    const tx = this.db.transaction(['syncQueue'], 'readonly');
    const store = tx.objectStore('syncQueue');
    return await store.getAll();
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    const tx = this.db.transaction(['syncQueue'], 'readwrite');
    const store = tx.objectStore('syncQueue');
    await store.clear();
  }

  /**
   * Start synchronization process
   */
  async startSync() {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.emit('syncStart');

    try {
      const queue = await this.getSyncQueue() || [];
      console.log(`Syncing ${queue.length} operations...`);

      if (!Array.isArray(queue)) {
        console.warn('Sync queue is not an array, skipping sync');
        return;
      }

      for (const operation of queue) {
        try {
          await this.syncOperation(operation);
        } catch (error) {
          console.error('Failed to sync operation:', operation, error);
          // Continue with next operation
        }
      }

      await this.clearSyncQueue();
      this.emit('syncComplete', { synced: queue.length });
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('syncError', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync single operation
   */
  async syncOperation(operation) {
    const { action, store, data, id } = operation;
    let endpoint = `/api/v1/${store}`;

    switch (action) {
      case 'create':
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'update':
        await fetch(`${endpoint}/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        break;

      case 'delete':
        await fetch(`${endpoint}/${id}`, {
          method: 'DELETE'
        });
        break;
    }

    console.log(`✅ Synced ${action} operation for ${store}`);
  }

  /**
   * Smart fetch with offline fallback
   */
  async smartFetch(url, options = {}) {
    try {
      // Try online fetch first
      if (this.isOnline) {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'X-Offline-Capable': 'true'
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Cache response for offline use
          await this.cacheResponse(url, data);
          return data;
        }
      }
    } catch (error) {
      console.warn('Online fetch failed, trying offline cache:', error);
    }

    // Fallback to cached data
    return await this.getCachedResponse(url);
  }

  /**
   * Cache response
   */
  async cacheResponse(url, data) {
    try {
      const tx = this.db.transaction(['metadata'], 'readwrite');
      const store = tx.objectStore('metadata');
      await store.put({
        key: `cache:${url}`,
        data,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }

  /**
   * Get cached response
   */
  async getCachedResponse(url) {
    try {
      const tx = this.db.transaction(['metadata'], 'readonly');
      const store = tx.objectStore('metadata');
      const cached = await store.get(`cache:${url}`);
      return cached?.data || null;
    } catch (error) {
      console.error('Failed to get cached response:', error);
      return null;
    }
  }

  /**
   * Event emitter
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Get storage usage
   */
  async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage,
        quota: estimate.quota,
        percentage: Math.round((estimate.usage / estimate.quota) * 100)
      };
    }
    return null;
  }

  /**
   * Clear all offline data
   */
  async clearAllData() {
    const stores = ['clients', 'prospects', 'teams', 'syncQueue', 'metadata'];
    for (const storeName of stores) {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      await store.clear();
    }
    console.log('All offline data cleared');
  }
}

// Create global instance
window.offlineSync = new OfflineSyncManager();

// UI Helper functions
function showOfflineIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'offline-indicator';
  indicator.innerHTML = `
    <i class="fas fa-wifi-slash"></i>
    <span>Offline Mode</span>
  `;
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
    color: white;
    padding: 12px 24px;
    border-radius: 30px;
    box-shadow: 0 8px 24px rgba(255, 107, 107, 0.4);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    animation: slideDown 0.3s ease;
  `;
  document.body.appendChild(indicator);
}

function hideOfflineIndicator() {
  const indicator = document.getElementById('offline-indicator');
  if (indicator) {
    indicator.style.animation = 'slideUp 0.3s ease';
    setTimeout(() => indicator.remove(), 300);
  }
}

function showSyncIndicator(message = 'Syncing...') {
  const indicator = document.createElement('div');
  indicator.id = 'sync-indicator';
  indicator.innerHTML = `
    <i class="fas fa-sync-alt fa-spin"></i>
    <span>${message}</span>
  `;
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 12px 20px;
    border-radius: 30px;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
    animation: slideUp 0.3s ease;
  `;
  document.body.appendChild(indicator);
}

function hideSyncIndicator() {
  const indicator = document.getElementById('sync-indicator');
  if (indicator) {
    indicator.style.animation = 'slideDown 0.3s ease';
    setTimeout(() => indicator.remove(), 300);
  }
}

// Setup event listeners
window.offlineSync.on('offline', () => {
  showOfflineIndicator();
  showToast('You are now offline. Changes will be saved locally.', 'warning');
});

window.offlineSync.on('online', () => {
  hideOfflineIndicator();
  showToast('Connection restored!', 'success');
});

window.offlineSync.on('syncStart', () => {
  showSyncIndicator('Synchronizing...');
});

window.offlineSync.on('syncComplete', (data) => {
  hideSyncIndicator();
  if (data.synced > 0) {
    showToast(`Synced ${data.synced} changes`, 'success');
  }
});

window.offlineSync.on('syncError', (error) => {
  hideSyncIndicator();
  showToast('Sync failed. Will retry later.', 'error');
  console.error('Sync error:', error);
});

window.offlineSync.on('updateAvailable', () => {
  showToast('Update available! Reload to get the latest version.', 'info', 10000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OfflineSyncManager;
}
