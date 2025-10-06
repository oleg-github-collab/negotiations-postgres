// timeline-view.js - Interactive Timeline for Prospect History
(() => {
  'use strict';

  const TimelineView = {
    prospectId: null,
    events: [],
    filters: {
      type: 'all',
      dateRange: 'all'
    },

    // Event type configurations
    eventTypes: {
      created: {
        icon: 'fa-plus-circle',
        color: '#4facfe',
        label: 'Створено'
      },
      stage_change: {
        icon: 'fa-arrow-right',
        color: '#667eea',
        label: 'Зміна етапу'
      },
      analysis_added: {
        icon: 'fa-chart-line',
        color: '#51cf66',
        label: 'Додано аналіз'
      },
      status_updated: {
        icon: 'fa-edit',
        color: '#ff9f43',
        label: 'Оновлено статус'
      },
      note_added: {
        icon: 'fa-sticky-note',
        color: '#ffd43b',
        label: 'Додано замітку'
      },
      email_sent: {
        icon: 'fa-envelope',
        color: '#4facfe',
        label: 'Відправлено email'
      },
      meeting: {
        icon: 'fa-calendar',
        color: '#ff6b6b',
        label: 'Зустріч'
      },
      call: {
        icon: 'fa-phone',
        color: '#51cf66',
        label: 'Дзвінок'
      },
      converted: {
        icon: 'fa-check-circle',
        color: '#51cf66',
        label: 'Конвертовано'
      },
      custom_field_updated: {
        icon: 'fa-cog',
        color: '#868e96',
        label: 'Оновлено поле'
      }
    },

    // ============================================
    // INITIALIZATION
    // ============================================

    async init(prospectId) {
      this.prospectId = prospectId;
      await this.loadTimeline();
      this.render();
      this.attachEventListeners();
    },

    // ============================================
    // DATA LOADING
    // ============================================

    async loadTimeline() {
      try {
        const response = await apiCall(`/prospects/${this.prospectId}/timeline`);
        if (response.success) {
          this.events = response.events || [];
          console.log(`✅ Loaded ${this.events.length} timeline events`);
        }
      } catch (error) {
        console.error('❌ Error loading timeline:', error);
        // Fallback to mock data for demonstration
        this.events = this.generateMockTimeline();
      }
    },

    generateMockTimeline() {
      const now = new Date();
      return [
        {
          id: 1,
          event_type: 'created',
          data: { company: 'Tech Corp' },
          created_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'Jane Smith'
        },
        {
          id: 2,
          event_type: 'stage_change',
          data: { from: 'new', to: 'qualifying' },
          created_at: new Date(now - 25 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'John Doe'
        },
        {
          id: 3,
          event_type: 'analysis_added',
          data: { title: 'Початковий аналіз переговорів', risk_level: 'low' },
          created_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'AI Assistant'
        },
        {
          id: 4,
          event_type: 'note_added',
          data: { note: 'Клієнт зацікавлений в Enterprise плані' },
          created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'Jane Smith'
        },
        {
          id: 5,
          event_type: 'meeting',
          data: { title: 'Демо продукту', duration: '1 година' },
          created_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'Sales Team'
        },
        {
          id: 6,
          event_type: 'stage_change',
          data: { from: 'qualifying', to: 'promising' },
          created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          user: 'System'
        }
      ];
    },

    // ============================================
    // RENDERING
    // ============================================

    render() {
      const container = document.getElementById('timeline-view');
      if (!container) return;

      const filteredEvents = this.getFilteredEvents();

      container.innerHTML = `
        <div class="timeline-header">
          <h3>
            <i class="fas fa-history"></i>
            Історія взаємодій
          </h3>
          <div class="timeline-controls">
            ${this.renderFilters()}
            <button class="btn btn-sm btn-primary" onclick="TimelineView.addEvent()">
              <i class="fas fa-plus"></i>
              Додати подію
            </button>
          </div>
        </div>

        <div class="timeline-body">
          ${filteredEvents.length === 0
            ? this.renderEmptyState()
            : this.renderTimeline(filteredEvents)
          }
        </div>
      `;
    },

    renderFilters() {
      return `
        <div class="timeline-filters">
          <select id="timeline-type-filter" class="filter-select">
            <option value="all">Всі події</option>
            ${Object.keys(this.eventTypes).map(type => `
              <option value="${type}">${this.eventTypes[type].label}</option>
            `).join('')}
          </select>

          <select id="timeline-date-filter" class="filter-select">
            <option value="all">Весь час</option>
            <option value="today">Сьогодні</option>
            <option value="week">Цей тиждень</option>
            <option value="month">Цей місяць</option>
            <option value="quarter">Квартал</option>
          </select>
        </div>
      `;
    },

    renderTimeline(events) {
      const groupedEvents = this.groupByDate(events);

      return `
        <div class="timeline-container">
          ${Object.keys(groupedEvents).map(date => `
            <div class="timeline-date-group">
              <div class="timeline-date-header">
                <i class="fas fa-calendar-alt"></i>
                ${this.formatDateHeader(date)}
              </div>
              <div class="timeline-events">
                ${groupedEvents[date].map(event => this.renderEvent(event)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    renderEvent(event) {
      const config = this.eventTypes[event.event_type] || {
        icon: 'fa-circle',
        color: '#868e96',
        label: 'Подія'
      };

      return `
        <div class="timeline-event" data-event-id="${event.id}">
          <div class="timeline-event-marker" style="background: ${config.color}">
            <i class="fas ${config.icon}"></i>
          </div>
          <div class="timeline-event-content">
            <div class="timeline-event-header">
              <span class="timeline-event-type" style="color: ${config.color}">
                ${config.label}
              </span>
              <span class="timeline-event-time">
                ${this.formatTime(event.created_at)}
              </span>
            </div>
            <div class="timeline-event-body">
              ${this.renderEventDetails(event)}
            </div>
            ${event.user ? `
              <div class="timeline-event-footer">
                <i class="fas fa-user"></i>
                ${event.user}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    },

    renderEventDetails(event) {
      const data = event.data || {};

      switch (event.event_type) {
        case 'created':
          return `<p>Створено потенційного клієнта <strong>${data.company}</strong></p>`;

        case 'stage_change':
          return `
            <p>Етап змінено з
              <span class="stage-badge">${this.getStageName(data.from)}</span>
              на
              <span class="stage-badge stage-badge-active">${this.getStageName(data.to)}</span>
            </p>
          `;

        case 'analysis_added':
          return `
            <p><strong>${data.title}</strong></p>
            ${data.risk_level ? `<span class="risk-badge risk-${data.risk_level}">Ризик: ${data.risk_level}</span>` : ''}
          `;

        case 'note_added':
          return `<p>${this.escapeHtml(data.note)}</p>`;

        case 'meeting':
          return `
            <p><strong>${data.title}</strong></p>
            ${data.duration ? `<span class="detail-text"><i class="fas fa-clock"></i> ${data.duration}</span>` : ''}
          `;

        case 'email_sent':
          return `
            <p>Email: <strong>${data.subject}</strong></p>
            ${data.to ? `<span class="detail-text"><i class="fas fa-envelope"></i> ${data.to}</span>` : ''}
          `;

        case 'call':
          return `
            <p>Дзвінок: ${data.duration || 'N/A'}</p>
            ${data.notes ? `<p class="call-notes">${this.escapeHtml(data.notes)}</p>` : ''}
          `;

        case 'converted':
          return `<p>Клієнта конвертовано в <strong>${data.client_type || 'активний'}</strong></p>`;

        case 'custom_field_updated':
          return `
            <p>Поле <strong>${data.field_name}</strong> оновлено</p>
            ${data.old_value ? `<span class="detail-text">Було: ${data.old_value}</span>` : ''}
            ${data.new_value ? `<span class="detail-text">Стало: ${data.new_value}</span>` : ''}
          `;

        default:
          return `<p>${JSON.stringify(data)}</p>`;
      }
    },

    renderEmptyState() {
      return `
        <div class="timeline-empty">
          <i class="fas fa-history fa-4x"></i>
          <h4>Історія порожня</h4>
          <p>Тут з'являться всі події та взаємодії з клієнтом</p>
          <button class="btn btn-secondary" onclick="TimelineView.addEvent()">
            <i class="fas fa-plus"></i>
            Додати першу подію
          </button>
        </div>
      `;
    },

    // ============================================
    // EVENT MANAGEMENT
    // ============================================

    async addEvent() {
      // Show modal with event types
      const eventType = prompt('Тип події (meeting/call/note_added/email_sent):');
      if (!eventType) return;

      const eventData = {};

      switch (eventType) {
        case 'meeting':
          eventData.title = prompt('Назва зустрічі:');
          eventData.duration = prompt('Тривалість:');
          break;
        case 'call':
          eventData.duration = prompt('Тривалість дзвінка:');
          eventData.notes = prompt('Замітки:');
          break;
        case 'note_added':
          eventData.note = prompt('Текст замітки:');
          break;
        case 'email_sent':
          eventData.subject = prompt('Тема email:');
          eventData.to = prompt('Кому:');
          break;
      }

      try {
        await apiCall(`/prospects/${this.prospectId}/timeline`, {
          method: 'POST',
          body: JSON.stringify({
            event_type: eventType,
            data: eventData,
            timestamp: new Date().toISOString()
          })
        });

        showToast('Подію додано', 'success');
        await this.loadTimeline();
        this.render();
      } catch (error) {
        console.error('Error adding event:', error);
        showToast('Помилка додавання події', 'error');
      }
    },

    // ============================================
    // FILTERS
    // ============================================

    getFilteredEvents() {
      let filtered = [...this.events];

      // Filter by type
      if (this.filters.type !== 'all') {
        filtered = filtered.filter(e => e.event_type === this.filters.type);
      }

      // Filter by date
      if (this.filters.dateRange !== 'all') {
        const now = new Date();
        const ranges = {
          today: 1,
          week: 7,
          month: 30,
          quarter: 90
        };
        const days = ranges[this.filters.dateRange] || 0;
        const cutoff = new Date(now - days * 24 * 60 * 60 * 1000);

        filtered = filtered.filter(e => new Date(e.created_at) >= cutoff);
      }

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return filtered;
    },

    groupByDate(events) {
      const grouped = {};

      events.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(event);
      });

      return grouped;
    },

    // ============================================
    // EVENT LISTENERS
    // ============================================

    attachEventListeners() {
      const typeFilter = document.getElementById('timeline-type-filter');
      const dateFilter = document.getElementById('timeline-date-filter');

      if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
          this.filters.type = e.target.value;
          this.render();
        });
      }

      if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
          this.filters.dateRange = e.target.value;
          this.render();
        });
      }
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    getStageName(stageId) {
      const stages = {
        new: 'Нові ліди',
        qualifying: 'Кваліфікація',
        promising: 'Перспективні',
        negotiation: 'Переговори',
        risky: 'Ризиковані',
        converted: 'Конвертовано'
      };
      return stages[stageId] || stageId;
    },

    formatDateHeader(dateStr) {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today - 24 * 60 * 60 * 1000);

      if (date.toDateString() === today.toDateString()) {
        return 'Сьогодні';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчора';
      } else {
        return date.toLocaleDateString('uk-UA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    },

    formatTime(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Export to window
  window.TimelineView = TimelineView;

})();
