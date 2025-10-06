/* ============================================
   TEAMHUB - ACTIVE CLIENTS MANAGEMENT
   Потужний модуль для управління активними клієнтами
   ============================================ */

const TeamHub = {
  activeClients: [],
  selectedClient: null,
  view: 'grid', // grid, list, detailed
  filters: {
    search: '',
    sector: 'all',
    teamSize: 'all',
    sortBy: 'updated_desc'
  },

  async init() {
    console.log('🚀 TeamHub initializing...');
    this.setupEventListeners();
    await this.loadActiveClients();
    this.render();
  },

  setupEventListeners() {
    // Search
    const searchInput = document.getElementById('teamhub-search');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((e) => {
        this.filters.search = e.target.value;
        this.filterAndRender();
      }, 300));
    }

    // View toggle
    document.querySelectorAll('.teamhub-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        document.querySelectorAll('.teamhub-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render();
      });
    });

    // Add client button
    const addBtn = document.getElementById('add-active-client-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddClientModal());
    }
  },

  async loadActiveClients() {
    try {
      const response = await apiCall('/clients?client_type=active');
      this.activeClients = response.clients || [];
      console.log(`✅ Loaded ${this.activeClients.length} active clients`);
    } catch (error) {
      console.error('❌ Failed to load active clients:', error);
      showNotification('Не вдалося завантажити активних клієнтів', 'error');
    }
  },

  filterAndRender() {
    let filtered = [...this.activeClients];

    // Search filter
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      filtered = filtered.filter(client =>
        client.company?.toLowerCase().includes(search) ||
        client.negotiator?.toLowerCase().includes(search) ||
        client.sector?.toLowerCase().includes(search)
      );
    }

    // Sector filter
    if (this.filters.sector !== 'all') {
      filtered = filtered.filter(client => client.sector === this.filters.sector);
    }

    // Team size filter
    if (this.filters.teamSize !== 'all') {
      filtered = filtered.filter(client => {
        const teamCount = client.teams_count || 0;
        switch (this.filters.teamSize) {
          case 'small': return teamCount <= 5;
          case 'medium': return teamCount > 5 && teamCount <= 15;
          case 'large': return teamCount > 15;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (this.filters.sortBy) {
        case 'name_asc': return (a.company || '').localeCompare(b.company || '');
        case 'name_desc': return (b.company || '').localeCompare(a.company || '');
        case 'created_desc': return new Date(b.created_at) - new Date(a.created_at);
        case 'created_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'updated_desc': return new Date(b.updated_at) - new Date(a.updated_at);
        case 'updated_asc': return new Date(a.updated_at) - new Date(b.updated_at);
        default: return 0;
      }
    });

    this.render(filtered);
  },

  render(clientsToRender = null) {
    const clients = clientsToRender || this.activeClients;
    const container = document.getElementById('teamhub-container');

    if (!container) {
      console.warn('TeamHub container not found');
      return;
    }

    if (clients.length === 0) {
      container.innerHTML = this.renderEmptyState();
      return;
    }

    switch (this.view) {
      case 'grid':
        container.innerHTML = this.renderGridView(clients);
        break;
      case 'list':
        container.innerHTML = this.renderListView(clients);
        break;
      case 'detailed':
        container.innerHTML = this.renderDetailedView(clients);
        break;
    }

    this.attachCardEventListeners();
  },

  renderGridView(clients) {
    return `
      <div class="teamhub-grid">
        ${clients.map(client => this.renderClientCard(client)).join('')}
      </div>
    `;
  },

  renderClientCard(client) {
    const teamsCount = client.teams_count || 0;
    const analysesCount = client.analyses_count || 0;
    const lastActivity = client.updated_at ? this.formatRelativeTime(client.updated_at) : 'Немає даних';

    return `
      <div class="client-card" data-client-id="${client.id}">
        <div class="client-card-header">
          <div class="client-avatar">
            ${this.getCompanyInitials(client.company)}
          </div>
          <div class="client-header-info">
            <h3 class="client-company">${this.escapeHtml(client.company)}</h3>
            ${client.sector ? `<span class="client-sector">${this.escapeHtml(client.sector)}</span>` : ''}
          </div>
          <div class="client-card-actions">
            <button class="icon-btn" onclick="TeamHub.openClientDetails(${client.id})" title="Детальніше">
              <i class="fas fa-eye"></i>
            </button>
            <button class="icon-btn" onclick="TeamHub.editClient(${client.id})" title="Редагувати">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>

        <div class="client-card-body">
          ${client.negotiator ? `
            <div class="client-info-item">
              <i class="fas fa-user"></i>
              <span>${this.escapeHtml(client.negotiator)}</span>
            </div>
          ` : ''}

          <div class="client-metrics">
            <div class="client-metric">
              <i class="fas fa-users"></i>
              <span>${teamsCount} ${this.pluralize(teamsCount, 'команда', 'команди', 'команд')}</span>
            </div>
            <div class="client-metric">
              <i class="fas fa-chart-line"></i>
              <span>${analysesCount} ${this.pluralize(analysesCount, 'аналіз', 'аналізи', 'аналізів')}</span>
            </div>
          </div>

          <div class="client-last-activity">
            <i class="fas fa-clock"></i>
            <span>Оновлено ${lastActivity}</span>
          </div>
        </div>

        <div class="client-card-footer">
          <button class="btn-secondary btn-sm" onclick="TeamHub.manageTeams(${client.id})">
            <i class="fas fa-users-cog"></i>
            Команди
          </button>
          <button class="btn-secondary btn-sm" onclick="TeamHub.viewAnalytics(${client.id})">
            <i class="fas fa-chart-bar"></i>
            Аналітика
          </button>
        </div>
      </div>
    `;
  },

  renderListView(clients) {
    return `
      <div class="teamhub-list">
        <table class="clients-table">
          <thead>
            <tr>
              <th>Компанія</th>
              <th>Переговорник</th>
              <th>Сфера</th>
              <th>Команди</th>
              <th>Аналізи</th>
              <th>Оновлено</th>
              <th>Дії</th>
            </tr>
          </thead>
          <tbody>
            ${clients.map(client => this.renderClientRow(client)).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderClientRow(client) {
    const teamsCount = client.teams_count || 0;
    const analysesCount = client.analyses_count || 0;
    const lastActivity = client.updated_at ? this.formatRelativeTime(client.updated_at) : '—';

    return `
      <tr class="client-row" data-client-id="${client.id}">
        <td>
          <div class="client-name-cell">
            <div class="client-avatar-sm">${this.getCompanyInitials(client.company)}</div>
            <strong>${this.escapeHtml(client.company)}</strong>
          </div>
        </td>
        <td>${client.negotiator ? this.escapeHtml(client.negotiator) : '—'}</td>
        <td>${client.sector ? this.escapeHtml(client.sector) : '—'}</td>
        <td>${teamsCount}</td>
        <td>${analysesCount}</td>
        <td>${lastActivity}</td>
        <td>
          <div class="table-actions">
            <button class="icon-btn" onclick="TeamHub.openClientDetails(${client.id})" title="Детальніше">
              <i class="fas fa-eye"></i>
            </button>
            <button class="icon-btn" onclick="TeamHub.manageTeams(${client.id})" title="Команди">
              <i class="fas fa-users-cog"></i>
            </button>
            <button class="icon-btn" onclick="TeamHub.editClient(${client.id})" title="Редагувати">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  },

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">
          <i class="fas fa-users-cog"></i>
        </div>
        <h2>Немає активних клієнтів</h2>
        <p>Додайте нового клієнта або конвертуйте потенційного клієнта з розділу Prospects</p>
        <div class="empty-state-actions">
          <button class="btn-primary" onclick="TeamHub.showAddClientModal()">
            <i class="fas fa-plus"></i>
            Додати клієнта
          </button>
          <button class="btn-secondary" onclick="TeamHub.goToProspects()">
            <i class="fas fa-briefcase"></i>
            Переглянути Prospects
          </button>
        </div>
      </div>
    `;
  },

  // ============================================
  // CLIENT ACTIONS
  // ============================================

  showAddClientModal() {
    const modal = document.getElementById('add-client-modal');
    if (modal && typeof window.showModal === 'function') {
      window.showModal('add-client-modal');
    }
  },

  async openClientDetails(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      this.selectedClient = client;
      this.showClientDetailsModal(client);
    } catch (error) {
      console.error('Failed to load client details:', error);
      showNotification('Не вдалося завантажити деталі клієнта', 'error');
    }
  },

  showClientDetailsModal(client) {
    // This will integrate with modals.js
    if (typeof window.showClientDetails === 'function') {
      window.showClientDetails(client);
    }
  },

  async editClient(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      this.selectedClient = client;

      // Populate edit modal with client data
      document.getElementById('edit-client-id').value = client.id;
      document.getElementById('edit-company').value = client.company || '';
      document.getElementById('edit-negotiator').value = client.negotiator || '';
      document.getElementById('edit-sector').value = client.sector || '';
      document.getElementById('edit-weekly-hours').value = client.weekly_hours || '';

      if (typeof window.showModal === 'function') {
        window.showModal('edit-client-modal');
      }
    } catch (error) {
      console.error('Failed to load client for editing:', error);
      showNotification('Не вдалося завантажити клієнта', 'error');
    }
  },

  async manageTeams(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      this.selectedClient = client;

      // Navigate to teams tab
      if (typeof window.TeamManager !== 'undefined') {
        window.TeamManager.loadTeamsByClient(clientId);
      }

      showNotification(`Завантажуємо команди для ${client.company}`, 'info');
    } catch (error) {
      console.error('Failed to load teams:', error);
      showNotification('Не вдалося завантажити команди', 'error');
    }
  },

  async viewAnalytics(clientId) {
    try {
      const client = await apiCall(`/clients/${clientId}`);
      this.selectedClient = client;

      // Show analytics modal or navigate to analytics view
      showNotification(`Аналітика для ${client.company} (в розробці)`, 'info');
    } catch (error) {
      console.error('Failed to load analytics:', error);
      showNotification('Не вдалося завантажити аналітику', 'error');
    }
  },

  goToProspects() {
    // Switch to Prospects tab
    const prospectsTab = document.querySelector('[data-tab="prospects"]');
    if (prospectsTab) {
      prospectsTab.click();
    }
  },

  attachCardEventListeners() {
    // Add click handlers for client cards
    document.querySelectorAll('.client-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          const clientId = parseInt(card.dataset.clientId);
          this.openClientDetails(clientId);
        }
      });
    });
  },

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  getCompanyInitials(company) {
    if (!company) return '?';
    const words = company.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[1][0]).toUpperCase();
  },

  formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'щойно';
    if (diffMins < 60) return `${diffMins} хв тому`;
    if (diffHours < 24) return `${diffHours} год тому`;
    if (diffDays < 7) return `${diffDays} дн тому`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} тиж тому`;

    return date.toLocaleDateString('uk-UA');
  },

  pluralize(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  },

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
  }
};

// Helper functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('teamhub-container')) {
      TeamHub.init();
    }
  });
} else {
  if (document.getElementById('teamhub-container')) {
    TeamHub.init();
  }
}

// Expose globally
window.TeamHub = TeamHub;
