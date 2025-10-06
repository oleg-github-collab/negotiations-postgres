// kanban-board.js - Kanban Board with Drag & Drop for Prospects Pipeline
(() => {
  'use strict';

  const KanbanBoard = {
    prospects: [],
    columns: [
      { id: 'new', title: 'Нові лід', status: 'active', color: '#4facfe', icon: 'fa-plus-circle' },
      { id: 'qualifying', title: 'Кваліфікація', status: 'active', color: '#667eea', icon: 'fa-search' },
      { id: 'promising', title: 'Перспективні', status: 'promising', color: '#51cf66', icon: 'fa-star' },
      { id: 'negotiation', title: 'Переговори', status: 'active', color: '#ff9f43', icon: 'fa-handshake' },
      { id: 'risky', title: 'Ризиковані', status: 'risky', color: '#ff6b6b', icon: 'fa-exclamation-triangle' },
      { id: 'converted', title: 'Конвертовано', status: 'converted', color: '#51cf66', icon: 'fa-check-circle' }
    ],
    draggedCard: null,
    draggedOverColumn: null,

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
      console.log('📋 KanbanBoard initializing...');
      await this.loadProspects();
      this.render();
      this.attachEventListeners();
    },

    // ============================================
    // DATA LOADING
    // ============================================

    async loadProspects() {
      try {
        const response = await apiCall('/prospects?limit=200');
        if (response.success) {
          this.prospects = response.prospects || [];
          console.log(`✅ Loaded ${this.prospects.length} prospects for Kanban`);
        }
      } catch (error) {
        console.error('❌ Error loading prospects for Kanban:', error);
        showToast('Помилка завантаження даних', 'error');
      }
    },

    // ============================================
    // RENDERING
    // ============================================

    render() {
      const container = document.getElementById('kanban-board');
      if (!container) return;

      container.innerHTML = `
        <div class="kanban-header">
          <h2>
            <i class="fas fa-columns"></i>
            Kanban Pipeline
          </h2>
          <div class="kanban-controls">
            <button class="btn btn-sm btn-secondary" onclick="KanbanBoard.toggleCompactMode()">
              <i class="fas fa-compress-alt"></i>
              Компактний вигляд
            </button>
            <button class="btn btn-sm btn-secondary" onclick="KanbanBoard.refresh()">
              <i class="fas fa-sync"></i>
              Оновити
            </button>
            <button class="btn btn-sm btn-ghost" onclick="KanbanBoard.close()">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
        <div class="kanban-columns">
          ${this.columns.map(col => this.renderColumn(col)).join('')}
        </div>
      `;

      this.makeDraggable();
    },

    renderColumn(column) {
      const prospectsInColumn = this.getProspectsForColumn(column);
      const count = prospectsInColumn.length;

      return `
        <div class="kanban-column" data-column-id="${column.id}" data-status="${column.status}">
          <div class="kanban-column-header" style="background: linear-gradient(135deg, ${column.color}22, ${column.color}44);">
            <div class="column-title">
              <i class="fas ${column.icon}" style="color: ${column.color}"></i>
              <h3>${column.title}</h3>
              <span class="column-count" style="background: ${column.color}">${count}</span>
            </div>
            <button class="column-add-btn" onclick="KanbanBoard.addToColumn('${column.id}')">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="kanban-column-body" data-column-id="${column.id}">
            ${prospectsInColumn.length === 0
              ? this.renderEmptyColumn()
              : prospectsInColumn.map(p => this.renderCard(p)).join('')
            }
          </div>
        </div>
      `;
    },

    getProspectsForColumn(column) {
      // Group prospects by kanban stage (stored in notes.kanban_stage)
      return this.prospects.filter(p => {
        const notes = this.parseNotes(p.notes);
        const stage = notes.kanban_stage || 'new';
        return stage === column.id;
      });
    },

    renderCard(prospect) {
      const notes = this.parseNotes(prospect.notes);
      const riskLevel = notes.risk_level || 'unknown';
      const dealValue = prospect.deal_value || '';
      const analysisCount = prospect.analysis_count || 0;

      return `
        <div class="kanban-card"
             data-prospect-id="${prospect.id}"
             draggable="true">
          <div class="kanban-card-header">
            <div class="card-avatar">
              ${(prospect.company || 'C')[0].toUpperCase()}
            </div>
            <div class="card-info">
              <h4>${this.escapeHtml(prospect.company)}</h4>
              ${prospect.negotiator ? `<p>${this.escapeHtml(prospect.negotiator)}</p>` : ''}
            </div>
            <button class="card-menu-btn" onclick="KanbanBoard.openCardMenu(event, ${prospect.id})">
              <i class="fas fa-ellipsis-v"></i>
            </button>
          </div>

          <div class="kanban-card-body">
            ${dealValue ? `
              <div class="card-value">
                <i class="fas fa-dollar-sign"></i>
                ${dealValue}
              </div>
            ` : ''}

            <div class="card-meta">
              <span class="card-meta-item">
                <i class="fas fa-chart-line"></i>
                ${analysisCount} аналізів
              </span>
              ${prospect.sector ? `
                <span class="card-meta-item">
                  <i class="fas fa-briefcase"></i>
                  ${this.escapeHtml(prospect.sector)}
                </span>
              ` : ''}
            </div>

            ${this.renderRiskBadge(riskLevel)}
          </div>

          <div class="kanban-card-footer">
            <button class="card-action-btn" onclick="KanbanBoard.viewDetails(${prospect.id})">
              <i class="fas fa-eye"></i>
              Переглянути
            </button>
            <button class="card-action-btn" onclick="KanbanBoard.addAnalysis(${prospect.id})">
              <i class="fas fa-plus"></i>
              Аналіз
            </button>
          </div>
        </div>
      `;
    },

    renderRiskBadge(riskLevel) {
      const riskConfig = {
        low: { label: 'Низький', color: '#51cf66', icon: 'fa-check-circle' },
        medium: { label: 'Середній', color: '#ff9f43', icon: 'fa-exclamation-circle' },
        high: { label: 'Високий', color: '#ff6b6b', icon: 'fa-exclamation-triangle' },
        critical: { label: 'Критичний', color: '#e64980', icon: 'fa-times-circle' },
        unknown: { label: 'Невідомо', color: '#868e96', icon: 'fa-question-circle' }
      };

      const config = riskConfig[riskLevel] || riskConfig.unknown;

      return `
        <div class="card-risk-badge" style="background: ${config.color}22; border-color: ${config.color}; color: ${config.color}">
          <i class="fas ${config.icon}"></i>
          Ризик: ${config.label}
        </div>
      `;
    },

    renderEmptyColumn() {
      return `
        <div class="kanban-empty-column">
          <i class="fas fa-inbox"></i>
          <p>Перетягніть картку сюди</p>
        </div>
      `;
    },

    // ============================================
    // DRAG & DROP
    // ============================================

    makeDraggable() {
      const cards = document.querySelectorAll('.kanban-card');
      const columns = document.querySelectorAll('.kanban-column-body');

      cards.forEach(card => {
        card.addEventListener('dragstart', this.handleDragStart.bind(this));
        card.addEventListener('dragend', this.handleDragEnd.bind(this));
      });

      columns.forEach(column => {
        column.addEventListener('dragover', this.handleDragOver.bind(this));
        column.addEventListener('dragenter', this.handleDragEnter.bind(this));
        column.addEventListener('dragleave', this.handleDragLeave.bind(this));
        column.addEventListener('drop', this.handleDrop.bind(this));
      });
    },

    handleDragStart(e) {
      this.draggedCard = e.currentTarget;
      e.currentTarget.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);

      // Add ghost effect
      setTimeout(() => {
        e.currentTarget.style.opacity = '0.5';
      }, 0);
    },

    handleDragEnd(e) {
      e.currentTarget.classList.remove('dragging');
      e.currentTarget.style.opacity = '1';

      // Remove all drag-over classes
      document.querySelectorAll('.kanban-column-body').forEach(col => {
        col.classList.remove('drag-over');
      });

      this.draggedCard = null;
    },

    handleDragOver(e) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      e.dataTransfer.dropEffect = 'move';
      return false;
    },

    handleDragEnter(e) {
      e.currentTarget.classList.add('drag-over');
    },

    handleDragLeave(e) {
      e.currentTarget.classList.remove('drag-over');
    },

    async handleDrop(e) {
      if (e.stopPropagation) {
        e.stopPropagation();
      }

      e.currentTarget.classList.remove('drag-over');

      if (!this.draggedCard) return false;

      const prospectId = parseInt(this.draggedCard.dataset.prospectId);
      const newColumnId = e.currentTarget.dataset.columnId;
      const newColumn = this.columns.find(c => c.id === newColumnId);

      if (!newColumn) return false;

      // Update prospect stage
      await this.updateProspectStage(prospectId, newColumnId, newColumn.status);

      return false;
    },

    async updateProspectStage(prospectId, stage, status) {
      try {
        // Update notes with new kanban stage and status
        const prospect = this.prospects.find(p => p.id === prospectId);
        if (!prospect) return;

        const notes = this.parseNotes(prospect.notes);
        notes.kanban_stage = stage;
        notes.status = status;
        notes.stage_updated_at = new Date().toISOString();

        await apiCall(`/prospects/${prospectId}`, {
          method: 'PUT',
          body: JSON.stringify({ notes })
        });

        showToast(`Переміщено в "${this.columns.find(c => c.id === stage).title}"`, 'success');

        // Reload and re-render
        await this.loadProspects();
        this.render();

        // Add to timeline
        await this.addTimelineEvent(prospectId, 'stage_change', {
          from: prospect.notes?.kanban_stage || 'new',
          to: stage
        });

      } catch (error) {
        console.error('Error updating prospect stage:', error);
        showToast('Помилка оновлення статусу', 'error');
      }
    },

    // ============================================
    // TIMELINE INTEGRATION
    // ============================================

    async addTimelineEvent(prospectId, eventType, data) {
      try {
        await apiCall(`/prospects/${prospectId}/timeline`, {
          method: 'POST',
          body: JSON.stringify({
            event_type: eventType,
            data,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Error adding timeline event:', error);
      }
    },

    // ============================================
    // ACTIONS
    // ============================================

    addToColumn(columnId) {
      const column = this.columns.find(c => c.id === columnId);
      showToast(`Додати в "${column.title}"`, 'info');
      ModalManager.open('create-prospect-modal');
    },

    viewDetails(prospectId) {
      if (window.ProspectsManager) {
        window.ProspectsManager.loadProspectDetails(prospectId);
      }
    },

    addAnalysis(prospectId) {
      const prospect = this.prospects.find(p => p.id === prospectId);
      if (window.ProspectsManager) {
        window.ProspectsManager.selectedProspect = prospect;
      }
      ModalManager.open('create-analysis-modal');
    },

    openCardMenu(event, prospectId) {
      event.stopPropagation();
      // TODO: Implement context menu
      console.log('Open menu for:', prospectId);
    },

    toggleCompactMode() {
      const board = document.getElementById('kanban-board');
      if (board) {
        board.classList.toggle('compact-mode');
      }
    },

    async refresh() {
      await this.loadProspects();
      this.render();
      showToast('Kanban оновлено', 'success');
    },

    close() {
      const container = document.getElementById('kanban-board');
      if (container) {
        container.style.display = 'none';
      }
      // Show grid view
      const gridView = document.getElementById('prospects-list');
      if (gridView) {
        gridView.style.display = 'block';
      }
    },

    // ============================================
    // EVENT LISTENERS
    // ============================================

    attachEventListeners() {
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + B: Toggle Kanban view
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
          e.preventDefault();
          this.toggle();
        }
      });
    },

    toggle() {
      const kanbanContainer = document.getElementById('kanban-board');
      const gridContainer = document.getElementById('prospects-list');

      if (!kanbanContainer || !gridContainer) return;

      if (kanbanContainer.style.display === 'none') {
        kanbanContainer.style.display = 'block';
        gridContainer.style.display = 'none';
        this.refresh();
      } else {
        kanbanContainer.style.display = 'none';
        gridContainer.style.display = 'block';
      }
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
    }
  };

  // Export to window
  window.KanbanBoard = KanbanBoard;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const container = document.getElementById('kanban-board');
      if (container) {
        KanbanBoard.init();
      }
    });
  }

})();
