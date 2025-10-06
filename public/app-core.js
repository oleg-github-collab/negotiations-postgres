/* ============================================
   APP CORE - TeamPulse Turbo
   Головний контролер додатку
   ============================================ */

(function() {
  'use strict';

  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const AppState = {
    currentMode: 'negotiations', // 'negotiations' або 'teamhub'
    selectedProspect: null,
    selectedClient: null,
    prospects: [],
    clients: [],
    analyses: [],
    user: null,

    update(key, value) {
      this[key] = value;
      this.persist();
      this.emit('stateChange', { key, value });
    },

    persist() {
      const stateToPersist = {
        currentMode: this.currentMode,
        selectedProspect: this.selectedProspect,
        selectedClient: this.selectedClient
      };
      localStorage.setItem('teampulse-state', JSON.stringify(stateToPersist));
    },

    restore() {
      const stored = localStorage.getItem('teampulse-state');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          Object.assign(this, parsed);
        } catch (e) {
          console.error('Failed to restore state:', e);
        }
      }
    },

    listeners: {},

    on(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },

    emit(event, data) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => callback(data));
      }
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  function showToast(message, type = 'info') {
    if (window.UltraSmooth && window.UltraSmooth.ToastManager) {
      window.UltraSmooth.ToastManager.show(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatDateTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleString('uk-UA', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function apiCall(endpoint, options = {}) {
    try {
      const token = localStorage.getItem('adminToken');
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      };

      const response = await fetch(`/api${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'API помилка');
      }

      return data;
    } catch (error) {
      console.error('API call failed:', error);
      showToast(error.message, 'error');
      throw error;
    }
  }

  // ============================================
  // MODE SWITCHER
  // ============================================

  const ModeSwitcher = {
    init() {
      const negotiationsBtn = $('#mode-negotiations');
      const teamhubBtn = $('#mode-teamhub');

      if (negotiationsBtn) {
        negotiationsBtn.addEventListener('click', () => this.switchMode('negotiations'));
      }

      if (teamhubBtn) {
        teamhubBtn.addEventListener('click', () => this.switchMode('teamhub'));
      }

      // Restore last mode
      this.switchMode(AppState.currentMode);
    },

    switchMode(mode) {
      AppState.update('currentMode', mode);

      // Update buttons
      const buttons = $$('.mode-btn');
      buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });

      // Update content visibility
      const negotiationsMode = $('#negotiations-mode');
      const teamhubMode = $('#teamhub-mode');

      if (negotiationsMode) {
        negotiationsMode.style.display = mode === 'negotiations' ? 'flex' : 'none';
      }

      if (teamhubMode) {
        teamhubMode.style.display = mode === 'teamhub' ? 'flex' : 'none';
      }

      console.log(`Switched to ${mode} mode`);
    }
  };

  // ============================================
  // USER MENU
  // ============================================

  const UserMenu = {
    init() {
      const userBtn = $('#user-menu-btn');
      const dropdown = $('#user-dropdown');
      const logoutBtn = $('#logout-btn');

      if (userBtn && dropdown) {
        userBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isVisible = dropdown.style.display === 'block';
          dropdown.style.display = isVisible ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
          dropdown.style.display = 'none';
        });
      }

      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      }
    },

    logout() {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('teampulse-state');
      window.location.reload();
    }
  };

  // ============================================
  // NEGOTIATIONS MODULE
  // ============================================

  const NegotiationsModule = {
    init() {
      this.attachEventListeners();
      this.loadProspects();
    },

    attachEventListeners() {
      // New prospect buttons
      const newProspectBtns = ['#new-prospect-btn', '#new-prospect-btn-main', '#create-first-prospect'];
      newProspectBtns.forEach(selector => {
        const btn = $(selector);
        if (btn) {
          btn.addEventListener('click', () => this.createProspect());
        }
      });

      // Search
      const searchInput = $('#prospect-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.filterProspects(e.target.value);
        });
      }

      // Filters
      const statusFilter = $('#prospect-status-filter');
      if (statusFilter) {
        statusFilter.addEventListener('change', () => {
          this.loadProspects();
        });
      }

      const sortFilter = $('#prospect-sort');
      if (sortFilter) {
        sortFilter.addEventListener('change', () => {
          this.loadProspects();
        });
      }

      // New analysis
      const newAnalysisBtn = $('#new-analysis-btn');
      if (newAnalysisBtn) {
        newAnalysisBtn.addEventListener('click', () => this.createAnalysis());
      }

      // Convert to client
      const convertBtn = $('#convert-to-client-btn');
      if (convertBtn) {
        convertBtn.addEventListener('click', () => this.convertToClient());
      }

      // Notes button
      const notesBtn = $('#prospect-notes-btn');
      if (notesBtn) {
        notesBtn.addEventListener('click', () => {
          if (AppState.selectedProspect && window.NotesManager) {
            window.NotesManager.open(AppState.selectedProspect.id, AppState.selectedProspect.name);
          }
        });
      }

      // Barometer reset
      this.resetBarometer();
    },

    async loadProspects() {
      try {
        const statusFilter = $('#prospect-status-filter')?.value || '';
        const sortBy = $('#prospect-sort')?.value || 'recent';

        const prospects = await apiCall('/negotiations/prospects', {
          method: 'GET'
        });

        AppState.update('prospects', prospects);
        this.renderProspects(prospects);
        this.updateStats(prospects);
      } catch (error) {
        console.error('Failed to load prospects:', error);
        this.renderProspects([]);
      }
    },

    renderProspects(prospects) {
      const container = $('#prospects-list');
      if (!container) return;

      if (prospects.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-inbox fa-3x"></i>
            <p>Немає потенційних клієнтів</p>
            <button class="btn btn-secondary btn-sm" id="create-first-prospect">
              Створити першого
            </button>
          </div>
        `;

        // Re-attach listener
        const btn = $('#create-first-prospect');
        if (btn) {
          btn.addEventListener('click', () => this.createProspect());
        }
        return;
      }

      container.innerHTML = prospects.map(prospect => `
        <div class="prospect-item ${AppState.selectedProspect?.id === prospect.id ? 'active' : ''}"
             data-id="${prospect.id}">
          <div class="prospect-info">
            <h4>${prospect.name || 'Без назви'}</h4>
            <div class="prospect-meta">
              <span class="meta-date">
                <i class="fas fa-calendar"></i>
                ${formatDate(prospect.created_at)}
              </span>
              <span class="meta-count">
                <i class="fas fa-file-alt"></i>
                ${prospect.analyses_count || 0}
              </span>
            </div>
          </div>
          <div class="prospect-status status-${prospect.status || 'active'}">
            <i class="fas fa-circle"></i>
          </div>
        </div>
      `).join('');

      // Attach click handlers
      $$('.prospect-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          this.selectProspect(id);
        });
      });
    },

    updateStats(prospects) {
      const total = $('#prospects-total');
      const active = $('#prospects-active');
      const promising = $('#prospects-promising');

      if (total) total.textContent = prospects.length;
      if (active) active.textContent = prospects.filter(p => p.status === 'active').length;
      if (promising) promising.textContent = prospects.filter(p => p.status === 'promising').length;
    },

    filterProspects(query) {
      const items = $$('.prospect-item');
      const searchQuery = query.toLowerCase();

      items.forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        const matches = name.includes(searchQuery);
        item.style.display = matches ? 'flex' : 'none';
      });
    },

    selectProspect(id) {
      const prospect = AppState.prospects.find(p => p.id == id);
      if (!prospect) return;

      AppState.update('selectedProspect', prospect);

      // Update UI
      $$('.prospect-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id == id);
      });

      // Show content
      const emptyState = $('#negotiations-empty');
      const content = $('#negotiations-content');

      if (emptyState) emptyState.style.display = 'none';
      if (content) content.style.display = 'block';

      this.renderProspectDetails(prospect);
      this.loadAnalyses(id);
    },

    renderProspectDetails(prospect) {
      const nameEl = $('#prospect-name');
      const dateEl = $('#prospect-date');
      const countEl = $('#prospect-analyses-count');
      const statusEl = $('#prospect-status');

      if (nameEl) nameEl.textContent = prospect.name || 'Без назви';
      if (dateEl) dateEl.textContent = `Створено: ${formatDate(prospect.created_at)}`;
      if (countEl) countEl.textContent = `Аналізів: ${prospect.analyses_count || 0}`;

      if (statusEl) {
        statusEl.textContent = this.getStatusLabel(prospect.status);
        statusEl.className = `meta-item status-badge status-${prospect.status || 'active'}`;
      }
    },

    getStatusLabel(status) {
      const labels = {
        active: 'Активні переговори',
        promising: 'Перспективний',
        risky: 'Ризиковий',
        converted: 'Конвертований',
        rejected: 'Відхилений'
      };
      return labels[status] || 'Активний';
    },

    async loadAnalyses(prospectId) {
      try {
        const analyses = await apiCall(`/negotiations/${prospectId}/analyses`);
        AppState.update('analyses', analyses);
        this.renderAnalyses(analyses);
        this.updateBarometer(analyses);
      } catch (error) {
        console.error('Failed to load analyses:', error);
        this.renderAnalyses([]);
      }
    },

    renderAnalyses(analyses) {
      const container = $('#analyses-list');
      const totalEl = $('#analyses-total');

      if (totalEl) totalEl.textContent = analyses.length;

      if (!container) return;

      if (analyses.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-chart-line fa-3x"></i>
            <p>Ще немає аналізів переговорів</p>
            <button class="btn btn-primary btn-sm" onclick="NegotiationsModule.createAnalysis()">
              Створити перший аналіз
            </button>
          </div>
        `;
        return;
      }

      container.innerHTML = analyses.map(analysis => `
        <div class="analysis-card" data-id="${analysis.id}">
          <div class="analysis-header">
            <h4>${analysis.title || 'Аналіз ' + formatDateTime(analysis.created_at)}</h4>
            <span class="analysis-risk risk-${analysis.risk_level || 'low'}">
              <i class="fas fa-exclamation-circle"></i>
              ${this.getRiskLabel(analysis.risk_level)}
            </span>
          </div>
          <div class="analysis-metrics">
            <div class="metric">
              <i class="fas fa-exclamation-triangle"></i>
              <span>${analysis.manipulations_count || 0}</span>
              <label>Маніпуляції</label>
            </div>
            <div class="metric">
              <i class="fas fa-brain"></i>
              <span>${analysis.biases_count || 0}</span>
              <label>Упередження</label>
            </div>
          </div>
          <div class="analysis-footer">
            <span class="analysis-date">
              <i class="fas fa-clock"></i>
              ${formatDateTime(analysis.created_at)}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="NegotiationsModule.viewAnalysis(${analysis.id})">
              <i class="fas fa-eye"></i>
              Переглянути
            </button>
          </div>
        </div>
      `).join('');
    },

    getRiskLabel(level) {
      const labels = {
        low: 'Низький',
        medium: 'Середній',
        high: 'Високий',
        critical: 'Критичний'
      };
      return labels[level] || 'Невизначений';
    },

    updateBarometer(analyses) {
      if (analyses.length === 0) {
        this.resetBarometer();
        return;
      }

      // Calculate aggregated metrics
      const totalManipulations = analyses.reduce((sum, a) => sum + (a.manipulations_count || 0), 0);
      const totalBiases = analyses.reduce((sum, a) => sum + (a.biases_count || 0), 0);
      const avgRisk = this.calculateAverageRisk(analyses);
      const trustIndex = this.calculateTrustIndex(analyses);

      // Update metrics
      const manipEl = $('#manipulations-count');
      const biasEl = $('#biases-count');
      const riskEl = $('#risk-level');
      const trustEl = $('#trust-index');

      if (manipEl) manipEl.textContent = totalManipulations;
      if (biasEl) biasEl.textContent = totalBiases;
      if (riskEl) riskEl.textContent = avgRisk.label;
      if (trustEl) trustEl.textContent = trustIndex + '%';

      // Update needle
      this.updateNeedle(avgRisk.value);
    },

    calculateAverageRisk(analyses) {
      const riskValues = {
        low: 1,
        medium: 2,
        high: 3,
        critical: 4
      };

      const totalRisk = analyses.reduce((sum, a) => {
        return sum + (riskValues[a.risk_level] || 1);
      }, 0);

      const avgValue = totalRisk / analyses.length;

      let level, label;
      if (avgValue <= 1.5) {
        level = 'low';
        label = 'Низький';
      } else if (avgValue <= 2.5) {
        level = 'medium';
        label = 'Середній';
      } else if (avgValue <= 3.5) {
        level = 'high';
        label = 'Високий';
      } else {
        level = 'critical';
        label = 'Критичний';
      }

      return {
        value: avgValue,
        level,
        label
      };
    },

    calculateTrustIndex(analyses) {
      // Simple trust calculation based on risk
      const avgRisk = this.calculateAverageRisk(analyses);
      const trustScore = Math.max(0, 100 - (avgRisk.value * 25));
      return Math.round(trustScore);
    },

    updateNeedle(riskValue) {
      const needle = $('#barometer-needle');
      if (!needle) return;

      // Map risk value (1-4) to angle (-90 to 90 degrees)
      // 1 (low) -> -90deg (left/green)
      // 2.5 (medium) -> 0deg (center/yellow)
      // 4 (critical) -> 90deg (right/red)

      const minAngle = -90;
      const maxAngle = 90;
      const angle = minAngle + ((riskValue - 1) / 3) * (maxAngle - minAngle);

      needle.style.transform = `rotate(${angle}deg)`;
    },

    resetBarometer() {
      const manipEl = $('#manipulations-count');
      const biasEl = $('#biases-count');
      const riskEl = $('#risk-level');
      const trustEl = $('#trust-index');
      const needle = $('#barometer-needle');

      if (manipEl) manipEl.textContent = '0';
      if (biasEl) biasEl.textContent = '0';
      if (riskEl) riskEl.textContent = '—';
      if (trustEl) trustEl.textContent = '—';
      if (needle) needle.style.transform = 'rotate(-90deg)';
    },

    createProspect() {
      if (window.ModalManager) {
        window.ModalManager.open('create-prospect-modal');
      }
    },

    createAnalysis() {
      if (!AppState.selectedProspect) {
        showToast('Спочатку виберіть клієнта', 'warning');
        return;
      }
      if (window.ModalManager) {
        window.ModalManager.open('create-analysis-modal');
      }
    },

    viewAnalysis(id) {
      if (window.ModalManager) {
        window.ModalManager.open('analysis-detail-modal', id);
      }
    },

    convertToClient() {
      if (!AppState.selectedProspect) {
        showToast('Спочатку виберіть клієнта', 'warning');
        return;
      }
      if (window.ModalManager) {
        window.ModalManager.open('convert-modal', AppState.selectedProspect);
      }
    }
  };

  // ============================================
  // TEAMHUB MODULE
  // ============================================

  const TeamHubModule = {
    init() {
      this.attachEventListeners();
      this.loadClients();
    },

    attachEventListeners() {
      // New client buttons
      const newClientBtns = ['#new-client-btn', '#new-client-btn-main', '#create-first-client'];
      newClientBtns.forEach(selector => {
        const btn = $(selector);
        if (btn) {
          btn.addEventListener('click', () => this.createClient());
        }
      });

      // Search
      const searchInput = $('#client-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.filterClients(e.target.value);
        });
      }

      // Tabs
      $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchTab(btn.dataset.tab);
        });
      });
    },

    async loadClients() {
      try {
        const clients = await apiCall('/clients', {
          method: 'GET'
        });

        AppState.update('clients', clients);
        this.renderClients(clients);
        this.updateStats(clients);
      } catch (error) {
        console.error('Failed to load clients:', error);
        this.renderClients([]);
      }
    },

    renderClients(clients) {
      const container = $('#clients-list');
      if (!container) return;

      if (clients.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-inbox fa-3x"></i>
            <p>Немає активних клієнтів</p>
            <button class="btn btn-secondary btn-sm" id="create-first-client-inner">
              Створити першого
            </button>
          </div>
        `;

        const btn = $('#create-first-client-inner');
        if (btn) {
          btn.addEventListener('click', () => this.createClient());
        }
        return;
      }

      container.innerHTML = clients.map(client => `
        <div class="client-item ${AppState.selectedClient?.id === client.id ? 'active' : ''}"
             data-id="${client.id}">
          <div class="client-info">
            <h4>${client.name || 'Без назви'}</h4>
            <div class="client-meta">
              <span class="meta-type">${client.type || 'Клієнт'}</span>
              <span class="meta-count">
                <i class="fas fa-users"></i>
                ${client.team_size || 0}
              </span>
            </div>
          </div>
        </div>
      `).join('');

      $$('.client-item').forEach(item => {
        item.addEventListener('click', () => {
          this.selectClient(item.dataset.id);
        });
      });
    },

    updateStats(clients) {
      const totalEl = $('#clients-total');
      const teamsEl = $('#teams-total');
      const membersEl = $('#members-total');

      const totalMembers = clients.reduce((sum, c) => sum + (c.team_size || 0), 0);

      if (totalEl) totalEl.textContent = clients.length;
      if (teamsEl) teamsEl.textContent = clients.length; // Simplified
      if (membersEl) membersEl.textContent = totalMembers;
    },

    filterClients(query) {
      const items = $$('.client-item');
      const searchQuery = query.toLowerCase();

      items.forEach(item => {
        const name = item.querySelector('h4').textContent.toLowerCase();
        const matches = name.includes(searchQuery);
        item.style.display = matches ? 'flex' : 'none';
      });
    },

    selectClient(id) {
      const client = AppState.clients.find(c => c.id == id);
      if (!client) return;

      AppState.update('selectedClient', client);

      $$('.client-item').forEach(item => {
        item.classList.toggle('active', item.dataset.id == id);
      });

      const emptyState = $('#teamhub-empty');
      const content = $('#teamhub-content');

      if (emptyState) emptyState.style.display = 'none';
      if (content) content.style.display = 'block';

      this.renderClientDetails(client);
    },

    renderClientDetails(client) {
      const nameEl = $('#client-name');
      const sizeEl = $('#client-team-size');
      const sinceEl = $('#client-since');
      const typeEl = $('#client-type');

      if (nameEl) nameEl.textContent = client.name || 'Без назви';
      if (sizeEl) sizeEl.textContent = `Команда: ${client.team_size || 0} осіб`;
      if (sinceEl) sinceEl.textContent = `Клієнт з: ${formatDate(client.created_at)}`;
      if (typeEl) typeEl.textContent = client.type || 'Клієнт';
    },

    switchTab(tabName) {
      $$('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
      });

      $$('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
      });
    },

    createClient() {
      if (window.ModalManager) {
        window.ModalManager.open('create-client-modal');
      }
    }
  };

  // ============================================
  // APP INITIALIZATION
  // ============================================

  const App = {
    init() {
      console.log('🚀 TeamPulse Turbo initializing...');

      // Check authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        this.showLogin();
        return;
      }

      // Restore state
      AppState.restore();

      // Initialize modules
      this.showApp();
      ModeSwitcher.init();
      UserMenu.init();
      NegotiationsModule.init();
      TeamHubModule.init();

      console.log('✅ TeamPulse Turbo ready');
    },

    showLogin() {
      const loginScreen = $('#login-screen');
      const appContainer = $('#app-container');

      if (loginScreen) loginScreen.style.display = 'flex';
      if (appContainer) appContainer.style.display = 'none';
    },

    showApp() {
      const loginScreen = $('#login-screen');
      const appContainer = $('#app-container');

      if (loginScreen) loginScreen.style.display = 'none';
      if (appContainer) appContainer.style.display = 'flex';
    }
  };

  // Export to window
  window.TeamPulseApp = App;
  window.NegotiationsModule = NegotiationsModule;
  window.TeamHubModule = TeamHubModule;

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

})();
