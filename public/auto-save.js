/* ============================================
   AUTO-SAVE SYSTEM WITH OFFLINE SUPPORT
   Automatic data persistence and sync
   ============================================ */

const AutoSave = {
  saveQueues: new Map(),
  saveTimers: new Map(),
  saveDelay: 2000, // 2 seconds debounce
  syncInterval: 30000, // 30 seconds
  syncTimer: null,
  pendingSaves: [],
  isOnline: navigator.onLine,

  init() {
    this.setupEventListeners();
    this.startSyncTimer();
    this.recoverPendingSaves();
  },

  setupEventListeners() {
    // Monitor online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('📡 Back online, syncing pending saves...');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Offline mode activated');
    });

    // Save before page unload
    window.addEventListener('beforeunload', () => {
      this.flushAll();
    });
  },

  startSyncTimer() {
    this.syncTimer = setInterval(() => {
      if (this.isOnline) {
        this.syncAll();
      }
    }, this.syncInterval);
  },

  stopSyncTimer() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  },

  // ============================================
  // AUTO-SAVE REGISTRATION
  // ============================================

  register(key, getData, saveFunction, options = {}) {
    const config = {
      key,
      getData,
      saveFunction,
      delay: options.delay || this.saveDelay,
      immediate: options.immediate || false,
      localStorageKey: `autosave_${key}`,
      lastSavedData: null,
      lastSaveTime: null,
      saving: false,
      error: null
    };

    this.saveQueues.set(key, config);
    console.log(`✅ Registered auto-save for: ${key}`);

    // Load from localStorage if available
    this.loadLocal(key);

    return config;
  },

  unregister(key) {
    const timer = this.saveTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.saveTimers.delete(key);
    }

    this.saveQueues.delete(key);
    console.log(`❌ Unregistered auto-save for: ${key}`);
  },

  // ============================================
  // TRIGGER SAVE
  // ============================================

  trigger(key) {
    const config = this.saveQueues.get(key);
    if (!config) {
      console.warn(`Auto-save not registered: ${key}`);
      return;
    }

    // Clear existing timer
    const existingTimer = this.saveTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Immediate save or debounced
    if (config.immediate) {
      this.save(key);
    } else {
      const timer = setTimeout(() => {
        this.save(key);
      }, config.delay);

      this.saveTimers.set(key, timer);
    }

    // Show indicator
    this.showSavingIndicator(key);
  },

  // ============================================
  // SAVE OPERATIONS
  // ============================================

  async save(key) {
    const config = this.saveQueues.get(key);
    if (!config || config.saving) return;

    try {
      config.saving = true;
      config.error = null;

      // Get current data
      const data = await config.getData();

      // Check if data changed
      if (this.hasDataChanged(config.lastSavedData, data)) {

        // Save to localStorage first (instant)
        this.saveLocal(key, data);

        // Try to save to server if online
        if (this.isOnline) {
          await config.saveFunction(data);
          config.lastSavedData = data;
          config.lastSaveTime = new Date();

          this.showSavedIndicator(key);
          console.log(`💾 Auto-saved: ${key}`);

          // Remove from pending saves
          this.removePendingSave(key);
        } else {
          // Queue for later sync
          this.addPendingSave(key, data);
          this.showOfflineIndicator(key);
          console.log(`📴 Queued for sync: ${key}`);
        }
      }
    } catch (error) {
      console.error(`Failed to auto-save ${key}:`, error);
      config.error = error;

      // Save to localStorage as backup
      try {
        const data = await config.getData();
        this.saveLocal(key, data);
        this.addPendingSave(key, data);
      } catch (e) {
        console.error('Failed to backup to localStorage:', e);
      }

      this.showErrorIndicator(key);
    } finally {
      config.saving = false;
    }
  },

  async saveNow(key) {
    // Immediate save without debounce
    const config = this.saveQueues.get(key);
    if (!config) return;

    const existingTimer = this.saveTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.saveTimers.delete(key);
    }

    await this.save(key);
  },

  flushAll() {
    // Save all immediately (for page unload)
    for (const [key] of this.saveQueues) {
      try {
        const config = this.saveQueues.get(key);
        if (config && !config.saving) {
          const data = config.getData();
          this.saveLocal(key, data);
        }
      } catch (e) {
        console.error(`Failed to flush ${key}:`, e);
      }
    }
  },

  // ============================================
  // SYNC OPERATIONS
  // ============================================

  async syncAll() {
    if (!this.isOnline || this.pendingSaves.length === 0) return;

    console.log(`🔄 Syncing ${this.pendingSaves.length} pending saves...`);

    const saves = [...this.pendingSaves];
    const results = await Promise.allSettled(
      saves.map(item => this.syncOne(item.key, item.data))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (succeeded > 0) {
      showNotification(`Синхронізовано ${succeeded} змін`, 'success');
    }

    if (failed > 0) {
      showNotification(`Не вдалося синхронізувати ${failed} змін`, 'error');
    }
  },

  async syncOne(key, data) {
    const config = this.saveQueues.get(key);
    if (!config) return;

    try {
      await config.saveFunction(data);
      config.lastSavedData = data;
      config.lastSaveTime = new Date();

      this.removePendingSave(key);
      this.clearLocal(key);

      console.log(`✅ Synced: ${key}`);
    } catch (error) {
      console.error(`Failed to sync ${key}:`, error);
      throw error;
    }
  },

  // ============================================
  // LOCAL STORAGE
  // ============================================

  saveLocal(key, data) {
    const config = this.saveQueues.get(key);
    if (!config) return false;

    try {
      const item = {
        key,
        data,
        timestamp: new Date().toISOString(),
        version: 1
      };

      localStorage.setItem(config.localStorageKey, JSON.stringify(item));
      return true;
    } catch (e) {
      console.error(`Failed to save to localStorage: ${key}`, e);
      return false;
    }
  },

  loadLocal(key) {
    const config = this.saveQueues.get(key);
    if (!config) return null;

    try {
      const item = localStorage.getItem(config.localStorageKey);
      if (!item) return null;

      const { data, timestamp } = JSON.parse(item);

      // Check if data is not too old (max 7 days)
      const age = Date.now() - new Date(timestamp).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000;

      if (age > maxAge) {
        this.clearLocal(key);
        return null;
      }

      console.log(`📂 Loaded from localStorage: ${key}`);
      return data;
    } catch (e) {
      console.error(`Failed to load from localStorage: ${key}`, e);
      return null;
    }
  },

  clearLocal(key) {
    const config = this.saveQueues.get(key);
    if (!config) return;

    try {
      localStorage.removeItem(config.localStorageKey);
    } catch (e) {
      console.error(`Failed to clear localStorage: ${key}`, e);
    }
  },

  // ============================================
  // PENDING SAVES QUEUE
  // ============================================

  addPendingSave(key, data) {
    // Remove existing pending save for this key
    this.removePendingSave(key);

    this.pendingSaves.push({
      key,
      data,
      timestamp: new Date().toISOString()
    });

    // Persist pending saves
    this.persistPendingSaves();
  },

  removePendingSave(key) {
    this.pendingSaves = this.pendingSaves.filter(item => item.key !== key);
    this.persistPendingSaves();
  },

  persistPendingSaves() {
    try {
      localStorage.setItem('teampulse_pending_saves', JSON.stringify(this.pendingSaves));
    } catch (e) {
      console.error('Failed to persist pending saves:', e);
    }
  },

  recoverPendingSaves() {
    try {
      const item = localStorage.getItem('teampulse_pending_saves');
      if (item) {
        this.pendingSaves = JSON.parse(item);
        console.log(`📦 Recovered ${this.pendingSaves.length} pending saves`);

        // Sync if online
        if (this.isOnline && this.pendingSaves.length > 0) {
          setTimeout(() => this.syncAll(), 1000);
        }
      }
    } catch (e) {
      console.error('Failed to recover pending saves:', e);
    }
  },

  // ============================================
  // STATUS INDICATORS
  // ============================================

  showSavingIndicator(key) {
    this.updateIndicator(key, 'saving', 'Збереження...');
  },

  showSavedIndicator(key) {
    this.updateIndicator(key, 'saved', 'Збережено');
    setTimeout(() => this.hideIndicator(key), 2000);
  },

  showOfflineIndicator(key) {
    this.updateIndicator(key, 'offline', 'Офлайн');
  },

  showErrorIndicator(key) {
    this.updateIndicator(key, 'error', 'Помилка збереження');
  },

  updateIndicator(key, status, text) {
    let indicator = document.getElementById(`autosave-indicator-${key}`);

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = `autosave-indicator-${key}`;
      indicator.className = 'autosave-indicator';

      // Find a good place to add it (top right of viewport)
      const container = document.querySelector('.autosave-indicators');
      if (container) {
        container.appendChild(indicator);
      } else {
        const newContainer = document.createElement('div');
        newContainer.className = 'autosave-indicators';
        newContainer.appendChild(indicator);
        document.body.appendChild(newContainer);
      }
    }

    indicator.className = `autosave-indicator autosave-${status}`;
    indicator.innerHTML = `
      <i class="${this.getStatusIcon(status)}"></i>
      <span>${text}</span>
    `;

    indicator.style.display = 'flex';
  },

  hideIndicator(key) {
    const indicator = document.getElementById(`autosave-indicator-${key}`);
    if (indicator) {
      indicator.style.display = 'none';
    }
  },

  getStatusIcon(status) {
    switch (status) {
      case 'saving': return 'fas fa-spinner fa-spin';
      case 'saved': return 'fas fa-check-circle';
      case 'offline': return 'fas fa-cloud-upload-alt';
      case 'error': return 'fas fa-exclamation-circle';
      default: return 'fas fa-info-circle';
    }
  },

  // ============================================
  // UTILITIES
  // ============================================

  hasDataChanged(oldData, newData) {
    // Simple deep comparison
    return JSON.stringify(oldData) !== JSON.stringify(newData);
  },

  getStatus(key) {
    const config = this.saveQueues.get(key);
    if (!config) return null;

    return {
      key,
      saving: config.saving,
      lastSaveTime: config.lastSaveTime,
      error: config.error,
      hasPendingSave: this.pendingSaves.some(item => item.key === key)
    };
  },

  getAllStatuses() {
    const statuses = {};
    for (const [key] of this.saveQueues) {
      statuses[key] = this.getStatus(key);
    }
    return statuses;
  }
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AutoSave.init());
} else {
  AutoSave.init();
}

// Expose globally
window.AutoSave = AutoSave;

// ============================================
// USAGE EXAMPLE
// ============================================

/*
// Register auto-save for a form
AutoSave.register(
  'team-editor-123',

  // getData function - returns current form data
  () => {
    return {
      title: document.getElementById('team-title').value,
      description: document.getElementById('team-description').value,
      members: TeamManagement.currentTeam.members
    };
  },

  // saveFunction - saves to server
  async (data) => {
    const response = await apiCall(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response;
  },

  // options
  {
    delay: 2000,
    immediate: false
  }
);

// Trigger save on input change
document.getElementById('team-title').addEventListener('input', () => {
  AutoSave.trigger('team-editor-123');
});

// Save immediately
await AutoSave.saveNow('team-editor-123');

// Unregister when done
AutoSave.unregister('team-editor-123');
*/
