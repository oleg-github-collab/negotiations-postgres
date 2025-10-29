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
        console.log('📥 Loading prospects...');

        // Check if apiCall is available
        if (typeof window.apiCall !== 'function') {
          console.error('❌ apiCall not available');
          throw new Error('API client not initialized');
        }

        const params = new URLSearchParams({
          search: this.filters.search,
          status: this.filters.status,
          risk_level: this.filters.risk_level,
          sort: this.filters.sort,
          limit: 100
        });

        const response = await window.apiCall(`/prospects?${params}`);
        console.log('📥 Prospects response:', response);

        if (response && response.success) {
          this.prospects = response.prospects || [];
          this.updateStats(response.stats);
          this.renderProspectsList();
          console.log(`✅ Loaded ${this.prospects.length} prospects`);
        } else {
          console.warn('⚠️ No prospects data received');
          this.prospects = [];
          this.renderProspectsList();
        }
      } catch (error) {
        console.error('❌ Error loading prospects:', error);
        if (window.showToast) {
          window.showToast('Помилка завантаження потенційних клієнтів', 'error');
        }
        this.prospects = [];
        this.renderProspectsList();
      }
    },

    async loadProspectDetails(prospectId) {
      try {
        const response = await window.apiCall(`/prospects/${prospectId}`);

        if (response.success) {
          this.selectedProspect = response.prospect;
          this.renderProspectDetails(response.prospect, response.analyses);
        }
      } catch (error) {
        console.error('❌ Error loading prospect details:', error);
        window.showToast('Помилка завантаження деталей', 'error');
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
        window.showToast('Невірний статус', 'error');
        return;
      }

      try {
        const promises = Array.from(this.selectedProspects).map(id =>
          window.apiCall(`/prospects/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              notes: { status: newStatus }
            })
          })
        );

        await Promise.all(promises);
        window.showToast(`Оновлено ${this.selectedProspects.size} клієнтів`, 'success');
        this.clearSelection();
        this.loadProspects();
      } catch (error) {
        console.error('Error bulk updating:', error);
        window.showToast('Помилка оновлення', 'error');
      }
    },

    async bulkConvert() {
      if (!confirm(`Конвертувати ${this.selectedProspects.size} клієнтів в активних?`)) {
        return;
      }

      try {
        const promises = Array.from(this.selectedProspects).map(id =>
          window.apiCall(`/prospects/${id}/convert`, {
            method: 'POST',
            body: JSON.stringify({ type: 'teamhub' })
          })
        );

        await Promise.all(promises);
        window.showToast(`Конвертовано ${this.selectedProspects.size} клієнтів`, 'success');
        this.clearSelection();
        this.loadProspects();
      } catch (error) {
        console.error('Error bulk converting:', error);
        window.showToast('Помилка конвертації', 'error');
      }
    },

    async bulkDelete() {
      if (!confirm(`Видалити ${this.selectedProspects.size} клієнтів? Це незворотна дія!`)) {
        return;
      }

      try {
        const promises = Array.from(this.selectedProspects).map(id =>
          window.apiCall(`/prospects/${id}`, { method: 'DELETE' })
        );

        await Promise.all(promises);
        window.showToast(`Видалено ${this.selectedProspects.size} клієнтів`, 'success');
        this.clearSelection();
        this.loadProspects();
      } catch (error) {
        console.error('Error bulk deleting:', error);
        window.showToast('Помилка видалення', 'error');
      }
    },

    // ============================================
    // MODALS & ACTIONS
    // ============================================

    openConvertModal(prospectId) {
      try {
        console.log('🔄 Opening convert modal for prospect:', prospectId);

        this.selectedProspect = this.prospects.find(p => p.id === prospectId);
        if (!this.selectedProspect) {
          console.warn('⚠️ Prospect not found:', prospectId);
          return;
        }

        // Check if ModalManager is available
        if (typeof window.ModalManager === 'undefined') {
          console.error('❌ ModalManager not available');
          alert('Помилка: модулі не завантажені. Перезавантажте сторінку.');
          return;
        }

        // Set prospect data in convert modal
        const modal = document.getElementById('convert-modal');
        if (!modal) {
          console.error('❌ Convert modal not found in DOM');
          alert('Помилка: модальне вікно не знайдено');
          return;
        }

        const prospectName = modal.querySelector('#convert-prospect-name');
        if (prospectName) {
          prospectName.textContent = this.selectedProspect.company;
        }

        console.log('✅ Opening convert modal');
        window.ModalManager.open('convert-modal');
      } catch (error) {
        console.error('❌ Error opening convert modal:', error);
        if (window.showToast) {
          window.showToast('Помилка відкриття форми конвертації', 'error');
        } else {
          alert('Помилка відкриття форми конвертації: ' + error.message);
        }
      }
    },

    openNotesModal(prospectId) {
      NotesManager.open(prospectId, 'prospect');
    },

    openProspectMenu(prospectId) {
      // TODO: Implement context menu
      console.log('Open menu for prospect:', prospectId);
    },

    async viewAnalysis(analysisId) {
      try {
        // Load full analysis with transcript and highlights
        const analysis = await window.apiCall(`/negotiations/analysis/${analysisId}`);

        if (!analysis || !analysis.success) {
          window.showToast('Не вдалося завантажити аналіз', 'error');
          return;
        }

        // Render analysis in modal with transcript highlights
        this.renderAnalysisModal(analysis.data);
      } catch (error) {
        console.error('Error loading analysis:', error);
        window.showToast('Помилка завантаження аналізу', 'error');
      }
    },

    renderAnalysisModal(analysis) {
      // Create or get modal
      let modal = document.getElementById('analysis-detail-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'analysis-detail-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
      }

      // Parse barometer data for adequacy meter
      const barometer = analysis.barometer || {};
      const adequacyScore = this.calculateAdequacyScore(barometer);
      const riskLevel = barometer.risk_level || 'unknown';

      // Get transcript with highlights
      const transcript = analysis.transcript || '';
      const highlightedTranscript = this.renderTranscriptWithHighlights(
        transcript,
        analysis.highlights || []
      );

      modal.innerHTML = `
        <div class="modal-overlay" onclick="hideModal('analysis-detail-modal')"></div>
        <div class="modal-content modal-xl">
          <div class="modal-header">
            <h2>
              <i class="fas fa-chart-line"></i>
              ${this.escapeHtml(analysis.title || 'Аналіз переговорів')}
            </h2>
            <button class="modal-close-btn" onclick="hideModal('analysis-detail-modal')">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <!-- БАРОМЕТР АДЕКВАТНОСТІ КЛІЄНТА -->
            <div class="adequacy-barometer">
              <h3>
                <i class="fas fa-tachometer-alt"></i>
                Барометр адекватності клієнта та легкості роботи
              </h3>
              <div class="barometer-display">
                <div class="barometer-gauge">
                  <div class="gauge-arc">
                    <div class="gauge-fill" style="--gauge-value: ${adequacyScore}%"></div>
                  </div>
                  <div class="gauge-center">
                    <span class="gauge-value">${adequacyScore}</span>
                    <span class="gauge-label">/ 100</span>
                  </div>
                </div>
                <div class="barometer-metrics">
                  ${this.renderBarometerMetrics(barometer)}
                </div>
              </div>
              <div class="barometer-interpretation">
                ${this.renderAdequacyInterpretation(adequacyScore, barometer)}
              </div>
            </div>

            <!-- РИЗИК РІВЕНЬ -->
            <div class="risk-section">
              <h3><i class="fas fa-shield-alt"></i> Оцінка ризику</h3>
              ${this.renderRiskBadge(riskLevel)}
              ${barometer.risk_factors ? `
                <div class="risk-factors">
                  <h4>Фактори ризику:</h4>
                  <ul>
                    ${barometer.risk_factors.map(f => `<li>${this.escapeHtml(f)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>

            <!-- КЛЮЧОВІ ІНСАЙТИ -->
            ${analysis.summary?.key_points ? `
              <div class="key-insights">
                <h3><i class="fas fa-lightbulb"></i> Ключові інсайти</h3>
                <div class="insights-content">
                  ${this.escapeHtml(analysis.summary.key_points)}
                </div>
              </div>
            ` : ''}

            <!-- ПОВНИЙ ТРАНСКРИПТ З ВИДІЛЕННЯМИ -->
            <div class="transcript-section">
              <div class="transcript-header">
                <h3>
                  <i class="fas fa-file-alt"></i>
                  Повний транскрипт переговорів
                </h3>
                <div class="transcript-tools">
                  <button class="btn btn-sm btn-secondary" onclick="ProspectsManager.toggleHighlights()">
                    <i class="fas fa-highlighter"></i>
                    ${analysis.highlights?.length || 0} виділень
                  </button>
                  <button class="btn btn-sm btn-primary" onclick="ProspectsManager.showCognitiveBiases(${analysis.id})">
                    <i class="fas fa-brain"></i>
                    Викривлення
                  </button>
                  <button class="btn btn-sm btn-primary" onclick="ProspectsManager.askAIAssistant(${analysis.id})">
                    <i class="fas fa-robot"></i>
                    Поради AI
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="ProspectsManager.copyTranscript()">
                    <i class="fas fa-copy"></i>
                    Копіювати
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="ProspectsManager.downloadTranscript(${analysis.id})">
                    <i class="fas fa-download"></i>
                    Завантажити
                  </button>
                </div>
              </div>
              <div class="transcript-content" id="transcript-content">
                ${highlightedTranscript}
              </div>

              <!-- Когнітивні викривлення (показується при активації) -->
              <div class="cognitive-biases-panel" id="cognitive-biases-panel" style="display: none;">
                <div class="biases-loading">
                  <i class="fas fa-brain fa-spin"></i>
                  <span>Аналізую когнітивні викривлення...</span>
                </div>
              </div>
            </div>

            <!-- РЕКОМЕНДАЦІЇ -->
            ${analysis.recommendations ? `
              <div class="recommendations-section">
                <h3><i class="fas fa-tasks"></i> Рекомендації</h3>
                <div class="recommendations-list">
                  ${this.renderRecommendations(analysis.recommendations)}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="hideModal('analysis-detail-modal')">
              Закрити
            </button>
            <button class="btn btn-primary" onclick="ProspectsManager.exportAnalysis(${analysis.id})">
              <i class="fas fa-file-pdf"></i>
              Експорт в PDF
            </button>
          </div>
        </div>
      `;

      showModal('analysis-detail-modal');
    },

    renderTranscriptWithHighlights(transcript, highlights = []) {
      if (!transcript) {
        return '<p class="text-muted">Транскрипт недоступний</p>';
      }

      let html = this.escapeHtml(transcript);

      // Apply highlights from AI analysis
      if (highlights.length > 0) {
        // Sort highlights by position (descending) to avoid index shifting
        const sortedHighlights = [...highlights].sort((a, b) => b.start - a.start);

        sortedHighlights.forEach(highlight => {
          const { start, end, text, type, note } = highlight;

          const highlightClass = this.getHighlightClass(type);
          const beforeText = html.substring(0, start);
          const highlightedText = html.substring(start, end);
          const afterText = html.substring(end);

          html = beforeText +
                 `<mark class="${highlightClass}" data-note="${this.escapeHtml(note || '')}" title="${this.escapeHtml(note || '')}">${highlightedText}</mark>` +
                 afterText;
        });
      }

      // Convert newlines to <br> for proper display
      html = html.replace(/\n/g, '<br>');

      return `<div class="transcript-text">${html}</div>`;
    },

    getHighlightClass(type) {
      const classMap = {
        'red_flag': 'highlight-danger',
        'positive': 'highlight-success',
        'warning': 'highlight-warning',
        'important': 'highlight-info',
        'question': 'highlight-question',
        'objection': 'highlight-objection',
        'commitment': 'highlight-commitment'
      };
      return classMap[type] || 'highlight-default';
    },

    calculateAdequacyScore(barometer) {
      // Calculate adequacy score from various factors
      let score = 50; // Start with neutral

      // Positive factors
      if (barometer.communication_clarity === 'high') score += 15;
      if (barometer.communication_clarity === 'medium') score += 5;

      if (barometer.responsiveness === 'high') score += 15;
      if (barometer.responsiveness === 'medium') score += 5;

      if (barometer.decision_making === 'clear') score += 10;
      if (barometer.budget_awareness === 'realistic') score += 10;

      // Negative factors
      if (barometer.risk_level === 'high') score -= 20;
      if (barometer.risk_level === 'critical') score -= 30;
      if (barometer.red_flags && barometer.red_flags.length > 0) {
        score -= barometer.red_flags.length * 5;
      }

      // Clamp between 0 and 100
      return Math.max(0, Math.min(100, score));
    },

    renderBarometerMetrics(barometer) {
      const metrics = [
        { icon: 'fa-comments', label: 'Комунікація', value: barometer.communication_clarity || 'unknown' },
        { icon: 'fa-bolt', label: 'Відгук', value: barometer.responsiveness || 'unknown' },
        { icon: 'fa-balance-scale', label: 'Рішення', value: barometer.decision_making || 'unknown' },
        { icon: 'fa-dollar-sign', label: 'Бюджет', value: barometer.budget_awareness || 'unknown' },
        { icon: 'fa-handshake', label: 'Співпраця', value: barometer.cooperation_level || 'unknown' }
      ];

      return metrics.map(m => `
        <div class="metric-item">
          <i class="fas ${m.icon}"></i>
          <span class="metric-label">${m.label}:</span>
          <span class="metric-value metric-${m.value}">${this.formatMetricValue(m.value)}</span>
        </div>
      `).join('');
    },

    formatMetricValue(value) {
      const valueMap = {
        'high': 'Високий',
        'medium': 'Середній',
        'low': 'Низький',
        'clear': 'Чітке',
        'unclear': 'Нечітке',
        'realistic': 'Реалістичний',
        'unrealistic': 'Нереалістичний',
        'unknown': 'Невідомо'
      };
      return valueMap[value] || value;
    },

    renderAdequacyInterpretation(score, barometer) {
      let interpretation = '';
      let color = '';
      let icon = '';

      if (score >= 80) {
        color = 'success';
        icon = 'fa-smile';
        interpretation = '<strong>Відмінний клієнт!</strong> Високий рівень адекватності, чітка комунікація, легко працювати.';
      } else if (score >= 60) {
        color = 'info';
        icon = 'fa-meh';
        interpretation = '<strong>Добрий клієнт.</strong> Прийнятний рівень співпраці, можливі деякі виклики.';
      } else if (score >= 40) {
        color = 'warning';
        icon = 'fa-frown';
        interpretation = '<strong>Складний клієнт.</strong> Потребує додаткової уваги та чіткої комунікації.';
      } else {
        color = 'danger';
        icon = 'fa-dizzy';
        interpretation = '<strong>Дуже складний клієнт!</strong> Високі ризики, рекомендується обережність.';
      }

      return `
        <div class="interpretation interpretation-${color}">
          <i class="fas ${icon}"></i>
          <p>${interpretation}</p>
        </div>
      `;
    },

    renderRecommendations(recommendations) {
      if (!recommendations || recommendations.length === 0) {
        return '<p class="text-muted">Немає рекомендацій</p>';
      }

      return recommendations.map(rec => `
        <div class="recommendation-item">
          <i class="fas fa-check-circle"></i>
          <span>${this.escapeHtml(rec)}</span>
        </div>
      `).join('');
    },

    toggleHighlights() {
      const content = document.getElementById('transcript-content');
      if (content) {
        content.classList.toggle('highlights-hidden');
      }
    },

    copyTranscript() {
      const content = document.getElementById('transcript-content');
      if (content) {
        const text = content.innerText;
        navigator.clipboard.writeText(text).then(() => {
          window.showToast('Транскрипт скопійовано', 'success');
        }).catch(() => {
          window.showToast('Помилка копіювання', 'error');
        });
      }
    },

    async downloadTranscript(analysisId) {
      try {
        const response = await window.apiCall(`/negotiations/analysis/${analysisId}/export`);
        // Handle download
        window.showToast('Завантаження розпочато', 'success');
      } catch (error) {
        window.showToast('Помилка завантаження', 'error');
      }
    },

    async exportAnalysis(analysisId) {
      try {
        const response = await window.apiCall(`/negotiations/analysis/${analysisId}/export-pdf`, {
          method: 'POST'
        });
        window.showToast('PDF експортовано', 'success');
      } catch (error) {
        window.showToast('Помилка експорту', 'error');
      }
    },

    // ============================================
    // КОГНІТИВНІ ВИКРИВЛЕННЯ
    // ============================================

    async showCognitiveBiases(analysisId) {
      const panel = document.getElementById('cognitive-biases-panel');
      if (!panel) return;

      // Toggle panel
      if (panel.style.display !== 'none') {
        panel.style.display = 'none';
        return;
      }

      panel.style.display = 'block';
      panel.innerHTML = '<div class="biases-loading"><i class="fas fa-brain fa-spin"></i><span>Аналізую когнітивні викривлення...</span></div>';

      try {
        // Get analysis data
        const analysis = await window.apiCall(`/negotiations/analysis/${analysisId}`);
        const transcript = (analysis.data || analysis).transcript || '';

        // Call AI to analyze cognitive biases
        const biasesResponse = await window.apiCall('/ai/analyze-biases', {
          method: 'POST',
          body: JSON.stringify({
            transcript,
            analysis_id: analysisId
          })
        });

        const biases = biasesResponse.biases || [];

        // Render biases
        panel.innerHTML = this.renderCognitiveBiases(biases);
      } catch (error) {
        console.error('Failed to analyze biases:', error);
        panel.innerHTML = '<div class="error-state">Помилка аналізу когнітивних викривлень</div>';
      }
    },

    renderCognitiveBiases(biases) {
      if (!biases || biases.length === 0) {
        return '<div class="empty-state-small"><p>Когнітивних викривлень не виявлено</p></div>';
      }

      const biasCategories = {
        'confirmation_bias': { icon: 'fa-check-circle', name: 'Підтверджувальна упередженість', color: '#ff6b6b' },
        'anchoring': { icon: 'fa-anchor', name: 'Ефект якоря', color: '#ffd93d' },
        'availability_heuristic': { icon: 'fa-lightbulb', name: 'Евристика доступності', color: '#6bcf7f' },
        'sunk_cost_fallacy': { icon: 'fa-money-bill-wave', name: 'Ілюзія невідновних витрат', color: '#667eea' },
        'framing_effect': { icon: 'fa-frame', name: 'Ефект обрамлення', color: '#ba7deb' },
        'overconfidence': { icon: 'fa-crown', name: 'Надмірна впевненість', color: '#ff8c00' },
        'groupthink': { icon: 'fa-users', name: 'Групове мислення', color: '#00bfff' },
        'halo_effect': { icon: 'fa-star', name: 'Ефект ореолу', color: '#ffd700' },
        'recency_bias': { icon: 'fa-clock', name: 'Ефект новизни', color: '#ff1493' },
        'status_quo_bias': { icon: 'fa-balance-scale', name: 'Упередженість статус-кво', color: '#4682b4' }
      };

      return `
        <div class="cognitive-biases-content">
          <div class="biases-header">
            <h4>
              <i class="fas fa-brain"></i>
              Виявлені когнітивні викривлення (${biases.length})
            </h4>
            <p class="biases-description">
              Детальний психологічний аналіз прийняття рішень та мислення під час переговорів
            </p>
          </div>

          <div class="biases-grid">
            ${biases.map(bias => {
              const config = biasCategories[bias.type] || {
                icon: 'fa-exclamation-triangle',
                name: bias.type,
                color: '#999'
              };

              return `
                <div class="bias-card" style="border-left: 4px solid ${config.color}">
                  <div class="bias-header">
                    <div class="bias-icon" style="background: ${config.color}20; color: ${config.color}">
                      <i class="fas ${config.icon}"></i>
                    </div>
                    <div class="bias-title">
                      <h5>${config.name}</h5>
                      <span class="bias-severity bias-severity-${bias.severity}">
                        ${this.getBiasSeverityLabel(bias.severity)}
                      </span>
                    </div>
                  </div>

                  <div class="bias-content">
                    <p class="bias-description">${this.escapeHtml(bias.description)}</p>

                    ${bias.quote ? `
                      <div class="bias-quote">
                        <i class="fas fa-quote-left"></i>
                        <span>${this.escapeHtml(bias.quote)}</span>
                      </div>
                    ` : ''}

                    ${bias.impact ? `
                      <div class="bias-impact">
                        <strong>Вплив:</strong>
                        <p>${this.escapeHtml(bias.impact)}</p>
                      </div>
                    ` : ''}

                    ${bias.mitigation ? `
                      <div class="bias-mitigation">
                        <strong>Як нейтралізувати:</strong>
                        <p>${this.escapeHtml(bias.mitigation)}</p>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="biases-summary">
            <h5><i class="fas fa-chart-pie"></i> Загальна оцінка</h5>
            <p>Виявлено ${biases.length} когнітивних викривлень, які можуть впливати на об'єктивність прийняття рішень.
            Рекомендуємо врахувати ці моменти при подальших переговорах.</p>
          </div>
        </div>
      `;
    },

    getBiasSeverityLabel(severity) {
      const labels = {
        'low': 'Низький вплив',
        'medium': 'Помірний вплив',
        'high': 'Високий вплив',
        'critical': 'Критичний вплив'
      };
      return labels[severity] || severity;
    },

    // ============================================
    // AI ASSISTANT (GPT-4o поради)
    // ============================================

    async askAIAssistant(analysisId) {
      // Create AI Assistant modal
      let modal = document.getElementById('ai-assistant-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-assistant-modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="modal-overlay" onclick="hideModal('ai-assistant-modal')"></div>
        <div class="modal-content modal-lg">
          <div class="modal-header">
            <h2>
              <i class="fas fa-robot"></i>
              AI Асистент переговорів
            </h2>
            <button class="modal-close-btn" onclick="hideModal('ai-assistant-modal')">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="ai-chat-container" id="ai-chat-container">
              <div class="ai-welcome">
                <div class="ai-avatar">
                  <i class="fas fa-robot"></i>
                </div>
                <h3>Вітаю! Я ваш AI-консультант</h3>
                <p>Задайте мені будь-яке питання про переговори, стратегію, тактику або попросіть пораду щодо конкретної ситуації.</p>

                <div class="ai-quick-questions">
                  <h4>Швидкі питання:</h4>
                  <button class="quick-question-btn" onclick="ProspectsManager.askQuickQuestion(${analysisId}, 'Як покращити свою позицію в переговорах?')">
                    Як покращити позицію?
                  </button>
                  <button class="quick-question-btn" onclick="ProspectsManager.askQuickQuestion(${analysisId}, 'Які червоні прапорці я маю враховувати?')">
                    Червоні прапорці
                  </button>
                  <button class="quick-question-btn" onclick="ProspectsManager.askQuickQuestion(${analysisId}, 'Яка оптимальна стратегія для цього клієнта?')">
                    Оптимальна стратегія
                  </button>
                  <button class="quick-question-btn" onclick="ProspectsManager.askQuickQuestion(${analysisId}, 'Як мені відповісти на їхні заперечення?')">
                    Відповідь на заперечення
                  </button>
                </div>
              </div>

              <div class="ai-messages" id="ai-messages"></div>
            </div>

            <div class="ai-input-container">
              <textarea
                id="ai-question-input"
                class="ai-question-input"
                placeholder="Задайте питання або попросіть пораду..."
                rows="3"
              ></textarea>
              <button class="btn btn-primary btn-send-ai" onclick="ProspectsManager.sendAIQuestion(${analysisId})">
                <i class="fas fa-paper-plane"></i>
                Надіслати
              </button>
            </div>
          </div>
        </div>
      `;

      showModal('ai-assistant-modal');

      // Focus input
      setTimeout(() => {
        document.getElementById('ai-question-input')?.focus();
      }, 100);

      // Add Enter to send
      const input = document.getElementById('ai-question-input');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            this.sendAIQuestion(analysisId);
          }
        });
      }
    },

    async askQuickQuestion(analysisId, question) {
      const input = document.getElementById('ai-question-input');
      if (input) {
        input.value = question;
      }
      await this.sendAIQuestion(analysisId);
    },

    async sendAIQuestion(analysisId) {
      const input = document.getElementById('ai-question-input');
      const messagesContainer = document.getElementById('ai-messages');

      if (!input || !messagesContainer) return;

      const question = input.value.trim();
      if (!question) {
        window.showToast('Введіть питання', 'warning');
        return;
      }

      // Add user message
      const userMsg = document.createElement('div');
      userMsg.className = 'ai-message ai-message-user';
      userMsg.innerHTML = `
        <div class="message-content">
          <p>${this.escapeHtml(question)}</p>
        </div>
        <div class="message-avatar">
          <i class="fas fa-user"></i>
        </div>
      `;
      messagesContainer.appendChild(userMsg);

      // Clear input
      input.value = '';

      // Add loading message
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'ai-message ai-message-assistant';
      loadingMsg.innerHTML = `
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content message-loading">
          <i class="fas fa-circle-notch fa-spin"></i>
          <span>Думаю...</span>
        </div>
      `;
      messagesContainer.appendChild(loadingMsg);

      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        // Get analysis context
        const analysis = await window.apiCall(`/negotiations/analysis/${analysisId}`);

        // Send to AI
        const response = await window.apiCall('/ai/ask-advice', {
          method: 'POST',
          body: JSON.stringify({
            question,
            analysis_id: analysisId,
            transcript: (analysis.data || analysis).transcript,
            context: {
              company: this.selectedProspect?.company,
              negotiator: this.selectedProspect?.negotiator,
              barometer: (analysis.data || analysis).barometer
            }
          })
        });

        // Remove loading
        loadingMsg.remove();

        // Add AI response
        const aiMsg = document.createElement('div');
        aiMsg.className = 'ai-message ai-message-assistant';
        aiMsg.innerHTML = `
          <div class="message-avatar">
            <i class="fas fa-robot"></i>
          </div>
          <div class="message-content">
            ${this.formatAIResponse(response.answer || response.advice)}
          </div>
        `;
        messagesContainer.appendChild(aiMsg);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } catch (error) {
        console.error('AI question failed:', error);
        loadingMsg.remove();

        const errorMsg = document.createElement('div');
        errorMsg.className = 'ai-message ai-message-error';
        errorMsg.innerHTML = `
          <div class="message-avatar">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="message-content">
            <p>Вибачте, сталася помилка. Спробуйте ще раз.</p>
          </div>
        `;
        messagesContainer.appendChild(errorMsg);
      }
    },

    formatAIResponse(text) {
      // Convert markdown-like formatting to HTML
      let html = this.escapeHtml(text);

      // Bold
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      // Lists
      html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

      // Numbered lists
      html = html.replace(/^\d+\. (.*?)$/gm, '<li>$1</li>');

      // Paragraphs
      html = html.replace(/\n\n/g, '</p><p>');
      html = `<p>${html}</p>`;

      return html;
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
