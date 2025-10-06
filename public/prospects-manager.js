// prospects-manager.js - Modern Prospects Management Module
(() => {
  'use strict';

  const ProspectsManager = {
    prospects: [],
    selectedProspect: null,
    selectedProspects: new Set(), // For bulk operations
    filters: {
      search: '',
      status: '',
      risk_level: '',
      sort: 'recent'
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
      console.log('🚀 ProspectsManager initializing...');
      this.attachEventListeners();
      await this.loadProspects();
      this.setupKeyboardShortcuts();
    },

    // ============================================
    // DATA LOADING
    // ============================================

    async loadProspects() {
      try {
        const params = new URLSearchParams({
          search: this.filters.search,
          status: this.filters.status,
          risk_level: this.filters.risk_level,
          sort: this.filters.sort,
          limit: 100
        });

        const response = await apiCall(`/prospects?${params}`);

        if (response.success) {
          this.prospects = response.prospects || [];
          this.updateStats(response.stats);
          this.renderProspectsList();
          console.log(`✅ Loaded ${this.prospects.length} prospects`);
        }
      } catch (error) {
        console.error('❌ Error loading prospects:', error);
        showToast('Помилка завантаження потенційних клієнтів', 'error');
      }
    },

    async loadProspectDetails(prospectId) {
      try {
        const response = await apiCall(`/prospects/${prospectId}`);

        if (response.success) {
          this.selectedProspect = response.prospect;
          this.renderProspectDetails(response.prospect, response.analyses);
        }
      } catch (error) {
        console.error('❌ Error loading prospect details:', error);
        showToast('Помилка завантаження деталей', 'error');
      }
    },

    // ============================================
    // RENDERING
    // ============================================

    renderProspectsList() {
      const container = document.getElementById('prospects-list');
      if (!container) return;

      // Clear selection if needed
      if (this.prospects.length === 0) {
        this.selectedProspects.clear();
      }

      if (this.prospects.length === 0) {
        container.innerHTML = this.getEmptyState();
        return;
      }

      const bulkToolbar = this.selectedProspects.size > 0
        ? this.renderBulkToolbar()
        : '';

      const items = this.prospects.map(prospect =>
        this.renderProspectCard(prospect)
      ).join('');

      container.innerHTML = `
        ${bulkToolbar}
        <div class="prospects-grid">
          ${items}
        </div>
      `;

      this.attachProspectCardListeners();
    },

    renderProspectCard(prospect) {
      const isSelected = this.selectedProspects.has(prospect.id);
      const isActive = this.selectedProspect?.id === prospect.id;

      const riskLevel = this.parseNotes(prospect.notes)?.risk_level || 'unknown';
      const status = this.parseNotes(prospect.notes)?.status || 'active';

      const analysisCount = prospect.analysis_count || 0;
      const lastAnalysis = prospect.last_analysis_date
        ? this.formatRelativeTime(prospect.last_analysis_date)
        : 'Немає аналізів';

      return `
        <div class="prospect-card ${isActive ? 'active' : ''}" data-prospect-id="${prospect.id}">
          <div class="prospect-card-header">
            <label class="checkbox-container" onclick="event.stopPropagation()">
              <input
                type="checkbox"
                class="prospect-checkbox"
                data-prospect-id="${prospect.id}"
                ${isSelected ? 'checked' : ''}
              >
              <span class="checkmark"></span>
            </label>
            <div class="prospect-avatar">
              ${(prospect.company || 'C')[0].toUpperCase()}
            </div>
            <div class="prospect-info">
              <h3 class="prospect-name">${this.escapeHtml(prospect.company)}</h3>
              <p class="prospect-meta">
                ${prospect.sector ? `<span>${this.escapeHtml(prospect.sector)}</span>` : ''}
                ${prospect.negotiator ? `<span>• ${this.escapeHtml(prospect.negotiator)}</span>` : ''}
              </p>
            </div>
            <div class="prospect-actions">
              <button
                class="icon-btn"
                onclick="event.stopPropagation(); ProspectsManager.openConvertModal(${prospect.id})"
                title="Конвертувати в клієнта"
              >
                <i class="fas fa-exchange-alt"></i>
              </button>
              <button
                class="icon-btn"
                onclick="event.stopPropagation(); ProspectsManager.openProspectMenu(${prospect.id})"
                title="Меню"
              >
                <i class="fas fa-ellipsis-v"></i>
              </button>
            </div>
          </div>

          <div class="prospect-card-body">
            <div class="prospect-badges">
              ${this.renderStatusBadge(status)}
              ${this.renderRiskBadge(riskLevel)}
            </div>

            <div class="prospect-stats">
              <div class="stat-item">
                <i class="fas fa-chart-line"></i>
                <span>${analysisCount} ${this.pluralize(analysisCount, 'аналіз', 'аналізи', 'аналізів')}</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-clock"></i>
                <span>${lastAnalysis}</span>
              </div>
            </div>

            ${prospect.goal ? `
              <div class="prospect-goal">
                <i class="fas fa-bullseye"></i>
                <span>${this.truncate(prospect.goal, 80)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    },

    renderStatusBadge(status) {
      const statusConfig = {
        active: { label: 'Активні переговори', icon: 'fa-play-circle', color: 'blue' },
        promising: { label: 'Перспективний', icon: 'fa-star', color: 'green' },
        risky: { label: 'Ризиковий', icon: 'fa-exclamation-triangle', color: 'orange' },
        converted: { label: 'Конвертовано', icon: 'fa-check-circle', color: 'success' },
        rejected: { label: 'Відхилено', icon: 'fa-times-circle', color: 'gray' }
      };

      const config = statusConfig[status] || statusConfig.active;

      return `
        <span class="badge badge-${config.color}">
          <i class="fas ${config.icon}"></i>
          ${config.label}
        </span>
      `;
    },

    renderRiskBadge(riskLevel) {
      const riskConfig = {
        low: { label: 'Низький ризик', color: 'success' },
        medium: { label: 'Середній ризик', color: 'warning' },
        high: { label: 'Високий ризик', color: 'danger' },
        critical: { label: 'Критичний', color: 'danger' },
        unknown: { label: 'Невідомо', color: 'gray' }
      };

      const config = riskConfig[riskLevel] || riskConfig.unknown;

      return `
        <span class="badge badge-${config.color}">
          <i class="fas fa-shield-alt"></i>
          ${config.label}
        </span>
      `;
    },

    renderBulkToolbar() {
      const count = this.selectedProspects.size;

      return `
        <div class="bulk-toolbar">
          <div class="bulk-info">
            <i class="fas fa-check-square"></i>
            <span>Вибрано: ${count}</span>
          </div>
          <div class="bulk-actions">
            <button class="btn btn-sm btn-secondary" onclick="ProspectsManager.bulkUpdateStatus()">
              <i class="fas fa-edit"></i>
              Змінити статус
            </button>
            <button class="btn btn-sm btn-primary" onclick="ProspectsManager.bulkConvert()">
              <i class="fas fa-exchange-alt"></i>
              Конвертувати
            </button>
            <button class="btn btn-sm btn-danger" onclick="ProspectsManager.bulkDelete()">
              <i class="fas fa-trash"></i>
              Видалити
            </button>
            <button class="btn btn-sm btn-ghost" onclick="ProspectsManager.clearSelection()">
              <i class="fas fa-times"></i>
              Скасувати
            </button>
          </div>
        </div>
      `;
    },

    renderProspectDetails(prospect, analyses) {
      const container = document.getElementById('prospect-details');
      if (!container) return;

      const notes = this.parseNotes(prospect.notes);
      const email = notes?.email || '';
      const phone = notes?.phone || '';

      container.innerHTML = `
        <div class="prospect-details-header">
          <div class="details-title">
            <h2>${this.escapeHtml(prospect.company)}</h2>
            <div class="details-meta">
              ${this.renderStatusBadge(notes?.status || 'active')}
              ${this.renderRiskBadge(notes?.risk_level || 'unknown')}
            </div>
          </div>
          <div class="details-actions">
            <button class="btn btn-secondary" onclick="ProspectsManager.openNotesModal(${prospect.id})">
              <i class="fas fa-sticky-note"></i>
              Замітки
            </button>
            <button class="btn btn-primary" onclick="ProspectsManager.openConvertModal(${prospect.id})">
              <i class="fas fa-exchange-alt"></i>
              Конвертувати в клієнта
            </button>
          </div>
        </div>

        <div class="prospect-details-body">
          <div class="details-section">
            <h3><i class="fas fa-info-circle"></i> Основна інформація</h3>
            <div class="details-grid">
              ${prospect.negotiator ? `
                <div class="detail-item">
                  <label>Контактна особа:</label>
                  <span>${this.escapeHtml(prospect.negotiator)}</span>
                </div>
              ` : ''}
              ${email ? `
                <div class="detail-item">
                  <label>Email:</label>
                  <span><a href="mailto:${email}">${email}</a></span>
                </div>
              ` : ''}
              ${phone ? `
                <div class="detail-item">
                  <label>Телефон:</label>
                  <span><a href="tel:${phone}">${phone}</a></span>
                </div>
              ` : ''}
              ${prospect.sector ? `
                <div class="detail-item">
                  <label>Сфера:</label>
                  <span>${this.escapeHtml(prospect.sector)}</span>
                </div>
              ` : ''}
              ${prospect.company_size ? `
                <div class="detail-item">
                  <label>Розмір компанії:</label>
                  <span>${this.escapeHtml(prospect.company_size)}</span>
                </div>
              ` : ''}
              ${prospect.deal_value ? `
                <div class="detail-item">
                  <label>Вартість угоди:</label>
                  <span>${this.escapeHtml(prospect.deal_value)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          ${prospect.goal ? `
            <div class="details-section">
              <h3><i class="fas fa-bullseye"></i> Мета переговорів</h3>
              <p>${this.escapeHtml(prospect.goal)}</p>
            </div>
          ` : ''}

          <div class="details-section">
            <h3>
              <i class="fas fa-chart-line"></i>
              Аналізи (${analyses.length})
              <button class="btn btn-sm btn-primary" onclick="ModalManager.open('create-analysis-modal')">
                <i class="fas fa-plus"></i>
                Новий аналіз
              </button>
            </h3>
            ${this.renderAnalysesList(analyses)}
          </div>
        </div>
      `;
    },

    renderAnalysesList(analyses) {
      if (analyses.length === 0) {
        return `
          <div class="empty-state-small">
            <i class="fas fa-chart-line fa-3x"></i>
            <p>Поки немає аналізів</p>
            <button class="btn btn-secondary" onclick="ModalManager.open('create-analysis-modal')">
              Створити перший аналіз
            </button>
          </div>
        `;
      }

      return `
        <div class="analyses-list">
          ${analyses.map(analysis => `
            <div class="analysis-item" onclick="ProspectsManager.viewAnalysis(${analysis.id})">
              <div class="analysis-header">
                <h4>${this.escapeHtml(analysis.title || 'Без назви')}</h4>
                <span class="analysis-date">${this.formatDate(analysis.created_at)}</span>
              </div>
              ${analysis.barometer?.risk_level ? `
                <div class="analysis-risk">
                  ${this.renderRiskBadge(analysis.barometer.risk_level)}
                </div>
              ` : ''}
              ${analysis.summary?.key_points ? `
                <div class="analysis-summary">
                  ${this.truncate(analysis.summary.key_points, 150)}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    },

    getEmptyState() {
      return `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="fas fa-briefcase fa-4x"></i>
          </div>
          <h3>Немає потенційних клієнтів</h3>
          <p>Почніть додавати потенційних клієнтів для аналізу переговорів</p>
          <button class="btn btn-primary btn-lg" onclick="ModalManager.open('create-prospect-modal')">
            <i class="fas fa-plus"></i>
            Створити першого клієнта
          </button>
        </div>
      `;
    },

    // ============================================
    // FILTERS & SEARCH
    // ============================================

    updateFilters(newFilters) {
      this.filters = { ...this.filters, ...newFilters };
      this.loadProspects();
    },

    setupSearchDebounce() {
      const searchInput = document.getElementById('prospect-search');
      if (!searchInput) return;

      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.updateFilters({ search: e.target.value });
        }, 300);
      });
    },

    // ============================================
    // BULK OPERATIONS
    // ============================================

    toggleProspectSelection(prospectId) {
      if (this.selectedProspects.has(prospectId)) {
        this.selectedProspects.delete(prospectId);
      } else {
        this.selectedProspects.add(prospectId);
      }
      this.renderProspectsList();
    },

    selectAll() {
      this.prospects.forEach(p => this.selectedProspects.add(p.id));
      this.renderProspectsList();
    },

    clearSelection() {
      this.selectedProspects.clear();
      this.renderProspectsList();
    },

    async bulkUpdateStatus() {
      const newStatus = prompt('Введіть новий статус (active/promising/risky/rejected):');
      if (!newStatus) return;

      const validStatuses = ['active', 'promising', 'risky', 'rejected'];
      if (!validStatuses.includes(newStatus)) {
        showToast('Невірний статус', 'error');
        return;
      }

      try {
        const promises = Array.from(this.selectedProspects).map(id =>
          apiCall(`/prospects/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              notes: { status: newStatus }
            })
          })
        );

        await Promise.all(promises);
        showToast(`Оновлено ${this.selectedProspects.size} клієнтів`, 'success');
        this.clearSelection();
        this.loadProspects();
      } catch (error) {
        console.error('Error bulk updating:', error);
        showToast('Помилка оновлення', 'error');
      }
    },

    async bulkConvert() {
      if (!confirm(`Конвертувати ${this.selectedProspects.size} клієнтів в активних?`)) {
        return;
      }

      try {
        const promises = Array.from(this.selectedProspects).map(id =>
          apiCall(`/prospects/${id}/convert`, {
            method: 'POST',
            body: JSON.stringify({ type: 'teamhub' })
          })
        );

        await Promise.all(promises);
        showToast(`Конвертовано ${this.selectedProspects.size} клієнтів`, 'success');
        this.clearSelection();
        this.loadProspects();
      } catch (error) {
        console.error('Error bulk converting:', error);
        showToast('Помилка конвертації', 'error');
      }
    },

    async bulkDelete() {
      if (!confirm(`Видалити ${this.selectedProspects.size} клієнтів? Це незворотна дія!`)) {
        return;
      }

      try {
        const promises = Array.from(this.selectedProspects).map(id =>
          apiCall(`/prospects/${id}`, { method: 'DELETE' })
        );

        await Promise.all(promises);
        showToast(`Видалено ${this.selectedProspects.size} клієнтів`, 'success');
        this.clearSelection();
        this.loadProspects();
      } catch (error) {
        console.error('Error bulk deleting:', error);
        showToast('Помилка видалення', 'error');
      }
    },

    // ============================================
    // MODALS & ACTIONS
    // ============================================

    openConvertModal(prospectId) {
      this.selectedProspect = this.prospects.find(p => p.id === prospectId);
      if (!this.selectedProspect) return;

      // Set prospect data in convert modal
      const modal = document.getElementById('convert-modal');
      if (modal) {
        const prospectName = modal.querySelector('#convert-prospect-name');
        if (prospectName) {
          prospectName.textContent = this.selectedProspect.company;
        }
        ModalManager.open('convert-modal');
      }
    },

    openNotesModal(prospectId) {
      NotesManager.open(prospectId, 'prospect');
    },

    openProspectMenu(prospectId) {
      // TODO: Implement context menu
      console.log('Open menu for prospect:', prospectId);
    },

    viewAnalysis(analysisId) {
      // TODO: Open analysis detail view
      console.log('View analysis:', analysisId);
      ModalManager.open('analysis-detail-modal');
    },

    // ============================================
    // EVENT LISTENERS
    // ============================================

    attachEventListeners() {
      // Filters
      const statusFilter = document.getElementById('prospect-status-filter');
      if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
          this.updateFilters({ status: e.target.value });
        });
      }

      const sortSelect = document.getElementById('prospect-sort');
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          this.updateFilters({ sort: e.target.value });
        });
      }

      // Search
      this.setupSearchDebounce();

      // Select all checkbox
      const selectAllCheckbox = document.getElementById('select-all-prospects');
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.selectAll();
          } else {
            this.clearSelection();
          }
        });
      }
    },

    attachProspectCardListeners() {
      // Click on cards
      document.querySelectorAll('.prospect-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.prospect-checkbox')) return;
          if (e.target.closest('button')) return;

          const prospectId = parseInt(card.dataset.prospectId);
          this.loadProspectDetails(prospectId);
        });
      });

      // Checkboxes
      document.querySelectorAll('.prospect-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const prospectId = parseInt(e.target.dataset.prospectId);
          this.toggleProspectSelection(prospectId);
        });
      });
    },

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================

    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          document.getElementById('prospect-search')?.focus();
        }

        // Ctrl/Cmd + N: New prospect
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
          e.preventDefault();
          ModalManager.open('create-prospect-modal');
        }

        // Escape: Clear selection
        if (e.key === 'Escape') {
          this.clearSelection();
        }

        // Ctrl/Cmd + A: Select all
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && this.prospects.length > 0) {
          e.preventDefault();
          this.selectAll();
        }
      });
    },

    // ============================================
    // STATS UPDATE
    // ============================================

    updateStats(stats) {
      if (!stats) return;

      const totalEl = document.getElementById('prospects-total');
      const activeEl = document.getElementById('prospects-active');
      const promisingEl = document.getElementById('prospects-promising');

      if (totalEl) totalEl.textContent = stats.total || 0;
      if (activeEl) activeEl.textContent = stats.active || 0;
      if (promisingEl) promisingEl.textContent = stats.promising || 0;
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    parseNotes(notes) {
      if (typeof notes === 'object') return notes;
      try {
        return JSON.parse(notes || '{}');
      } catch {
        return {};
      }
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    truncate(text, length) {
      if (!text || text.length <= length) return text;
      return text.substring(0, length) + '...';
    },

    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    formatRelativeTime(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Щойно';
      if (diffMins < 60) return `${diffMins} хв тому`;
      if (diffHours < 24) return `${diffHours} год тому`;
      if (diffDays < 7) return `${diffDays} дн тому`;

      return this.formatDate(dateString);
    },

    pluralize(count, one, few, many) {
      if (count % 10 === 1 && count % 100 !== 11) return one;
      if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return few;
      return many;
    }
  };

  // Export to window
  window.ProspectsManager = ProspectsManager;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProspectsManager.init());
  } else {
    ProspectsManager.init();
  }

  // Export for modals integration
  window.loadProspects = () => ProspectsManager.loadProspects();

})();
