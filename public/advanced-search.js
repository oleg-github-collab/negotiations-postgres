/**
 * Advanced Search & Filtering System
 * Powerful multi-criteria search with saved filters and smart suggestions
 */

const AdvancedSearch = {
    // State
    isOpen: false,
    filters: {},
    savedFilters: [],
    searchHistory: [],
    suggestions: [],

    // Configuration
    maxHistory: 20,
    debounceDelay: 300,
    debounceTimer: null,

    // Search criteria definitions
    criteriaDefinitions: {
        prospect: {
            text: {
                label: 'Текстовий пошук',
                fields: ['company', 'negotiator', 'notes'],
                type: 'text',
                icon: 'fa-search'
            },
            status: {
                label: 'Статус',
                type: 'select',
                icon: 'fa-flag',
                options: [
                    { value: 'new', label: 'Новий', color: '#667eea' },
                    { value: 'qualifying', label: 'Кваліфікація', color: '#4CAF50' },
                    { value: 'promising', label: 'Перспективний', color: '#2196F3' },
                    { value: 'negotiation', label: 'Переговори', color: '#FF9800' },
                    { value: 'risky', label: 'Ризиковий', color: '#F44336' },
                    { value: 'converted', label: 'Конвертовано', color: '#9C27B0' }
                ]
            },
            riskLevel: {
                label: 'Рівень ризику',
                type: 'select',
                icon: 'fa-exclamation-triangle',
                options: [
                    { value: 'low', label: 'Низький', color: '#4CAF50' },
                    { value: 'medium', label: 'Середній', color: '#FF9800' },
                    { value: 'high', label: 'Високий', color: '#F44336' },
                    { value: 'critical', label: 'Критичний', color: '#D32F2F' }
                ]
            },
            dateRange: {
                label: 'Діапазон дат',
                type: 'dateRange',
                icon: 'fa-calendar',
                fields: ['created_at', 'updated_at']
            },
            tags: {
                label: 'Теги',
                type: 'multiSelect',
                icon: 'fa-tags',
                options: [] // Populated dynamically
            },
            customFields: {
                label: 'Додаткові поля',
                type: 'dynamic',
                icon: 'fa-sliders-h'
            }
        },
        client: {
            text: {
                label: 'Текстовий пошук',
                fields: ['company_name', 'contact_person', 'notes'],
                type: 'text',
                icon: 'fa-search'
            },
            sector: {
                label: 'Сфера діяльності',
                type: 'select',
                icon: 'fa-industry',
                options: [
                    { value: 'it', label: 'IT' },
                    { value: 'finance', label: 'Фінанси' },
                    { value: 'healthcare', label: 'Охорона здоров\'я' },
                    { value: 'retail', label: 'Роздрібна торгівля' },
                    { value: 'manufacturing', label: 'Виробництво' },
                    { value: 'education', label: 'Освіта' }
                ]
            },
            teamSize: {
                label: 'Розмір команди',
                type: 'range',
                icon: 'fa-users',
                min: 0,
                max: 100
            },
            dateRange: {
                label: 'Діапазон дат',
                type: 'dateRange',
                icon: 'fa-calendar',
                fields: ['created_at', 'updated_at']
            }
        },
        team: {
            text: {
                label: 'Текстовий пошук',
                fields: ['title', 'description', 'notes'],
                type: 'text',
                icon: 'fa-search'
            },
            memberCount: {
                label: 'Кількість учасників',
                type: 'range',
                icon: 'fa-user-friends',
                min: 0,
                max: 50
            },
            roles: {
                label: 'Ролі',
                type: 'multiSelect',
                icon: 'fa-user-tag',
                options: [
                    { value: 'responsible', label: 'Відповідальний' },
                    { value: 'accountable', label: 'Підзвітний' },
                    { value: 'consulted', label: 'Консультант' },
                    { value: 'informed', label: 'Інформований' }
                ]
            }
        }
    },

    /**
     * Initialize the search system
     */
    init() {
        this.loadSearchHistory();
        this.loadSavedFilters();
        this.setupGlobalShortcuts();
        this.render();
        console.log('✅ Advanced Search initialized');
    },

    /**
     * Setup global keyboard shortcuts
     */
    setupGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F - Open search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.shiftKey) {
                e.preventDefault();
                this.open();
            }

            // Escape - Close search
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    /**
     * Open search panel
     */
    open(entityType = 'prospect') {
        this.isOpen = true;
        this.currentEntityType = entityType;
        this.filters = {};
        this.render();

        const container = document.getElementById('advanced-search-container');
        if (container) {
            container.classList.add('active');
            setTimeout(() => {
                document.getElementById('search-text-input')?.focus();
            }, 100);
        }
    },

    /**
     * Close search panel
     */
    close() {
        this.isOpen = false;
        const container = document.getElementById('advanced-search-container');
        if (container) {
            container.classList.remove('active');
        }
    },

    /**
     * Render the search interface
     */
    render() {
        let container = document.getElementById('advanced-search-container');

        if (!container) {
            container = document.createElement('div');
            container.id = 'advanced-search-container';
            container.className = 'advanced-search-container';
            document.body.appendChild(container);
        }

        container.innerHTML = `
            <div class="advanced-search-overlay"></div>
            <div class="advanced-search-panel">
                <!-- Header -->
                <div class="search-header">
                    <div class="search-title">
                        <i class="fas fa-search"></i>
                        <span>Розширений пошук</span>
                    </div>
                    <button class="search-close-btn" onclick="AdvancedSearch.close()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Entity Type Selector -->
                <div class="entity-type-selector">
                    <button class="entity-type-btn ${this.currentEntityType === 'prospect' ? 'active' : ''}"
                            onclick="AdvancedSearch.switchEntityType('prospect')">
                        <i class="fas fa-briefcase"></i>
                        Prospects
                    </button>
                    <button class="entity-type-btn ${this.currentEntityType === 'client' ? 'active' : ''}"
                            onclick="AdvancedSearch.switchEntityType('client')">
                        <i class="fas fa-users-cog"></i>
                        Клієнти
                    </button>
                    <button class="entity-type-btn ${this.currentEntityType === 'team' ? 'active' : ''}"
                            onclick="AdvancedSearch.switchEntityType('team')">
                        <i class="fas fa-users"></i>
                        Команди
                    </button>
                </div>

                <!-- Search Criteria -->
                <div class="search-criteria">
                    ${this.renderCriteria()}
                </div>

                <!-- Active Filters -->
                ${this.renderActiveFilters()}

                <!-- Saved Filters -->
                <div class="saved-filters-section">
                    <div class="section-header">
                        <span><i class="fas fa-bookmark"></i> Збережені фільтри</span>
                        <button class="btn-text" onclick="AdvancedSearch.saveCurrentFilter()">
                            <i class="fas fa-plus"></i> Зберегти поточний
                        </button>
                    </div>
                    <div class="saved-filters-list">
                        ${this.renderSavedFilters()}
                    </div>
                </div>

                <!-- Search History -->
                <div class="search-history-section">
                    <div class="section-header">
                        <span><i class="fas fa-history"></i> Історія пошуку</span>
                        <button class="btn-text" onclick="AdvancedSearch.clearHistory()">
                            <i class="fas fa-trash"></i> Очистити
                        </button>
                    </div>
                    <div class="search-history-list">
                        ${this.renderSearchHistory()}
                    </div>
                </div>

                <!-- Actions -->
                <div class="search-actions">
                    <button class="btn-secondary" onclick="AdvancedSearch.resetFilters()">
                        <i class="fas fa-undo"></i>
                        Скинути
                    </button>
                    <button class="btn-primary" onclick="AdvancedSearch.executeSearch()">
                        <i class="fas fa-search"></i>
                        Шукати
                    </button>
                </div>
            </div>
        `;

        this.attachEventListeners();
    },

    /**
     * Render search criteria based on entity type
     */
    renderCriteria() {
        const criteria = this.criteriaDefinitions[this.currentEntityType];
        if (!criteria) return '';

        return Object.entries(criteria).map(([key, config]) => {
            return `
                <div class="search-criterion">
                    <label class="criterion-label">
                        <i class="fas ${config.icon}"></i>
                        ${config.label}
                    </label>
                    ${this.renderCriterionInput(key, config)}
                </div>
            `;
        }).join('');
    },

    /**
     * Render input for specific criterion type
     */
    renderCriterionInput(key, config) {
        switch (config.type) {
            case 'text':
                return `
                    <input type="text"
                           class="criterion-input"
                           id="search-${key}-input"
                           placeholder="Введіть текст для пошуку..."
                           oninput="AdvancedSearch.handleTextInput('${key}', this.value)">
                `;

            case 'select':
                return `
                    <select class="criterion-select"
                            id="search-${key}-select"
                            onchange="AdvancedSearch.handleSelectChange('${key}', this.value)">
                        <option value="">Всі</option>
                        ${config.options.map(opt => `
                            <option value="${opt.value}">${opt.label}</option>
                        `).join('')}
                    </select>
                `;

            case 'multiSelect':
                return `
                    <div class="multi-select-container" id="search-${key}-multiselect">
                        ${config.options.map(opt => `
                            <label class="multi-select-option">
                                <input type="checkbox"
                                       value="${opt.value}"
                                       onchange="AdvancedSearch.handleMultiSelectChange('${key}')">
                                <span>${opt.label}</span>
                            </label>
                        `).join('')}
                    </div>
                `;

            case 'range':
                return `
                    <div class="range-inputs">
                        <input type="number"
                               class="range-input"
                               placeholder="Від"
                               min="${config.min || 0}"
                               max="${config.max || 999999}"
                               oninput="AdvancedSearch.handleRangeChange('${key}', 'min', this.value)">
                        <span class="range-separator">—</span>
                        <input type="number"
                               class="range-input"
                               placeholder="До"
                               min="${config.min || 0}"
                               max="${config.max || 999999}"
                               oninput="AdvancedSearch.handleRangeChange('${key}', 'max', this.value)">
                    </div>
                `;

            case 'dateRange':
                return `
                    <div class="date-range-inputs">
                        <input type="date"
                               class="date-input"
                               onchange="AdvancedSearch.handleDateRangeChange('${key}', 'start', this.value)">
                        <span class="range-separator">—</span>
                        <input type="date"
                               class="date-input"
                               onchange="AdvancedSearch.handleDateRangeChange('${key}', 'end', this.value)">
                    </div>
                `;

            default:
                return '';
        }
    },

    /**
     * Render active filters as chips
     */
    renderActiveFilters() {
        const filters = Object.entries(this.filters);
        if (filters.length === 0) return '';

        return `
            <div class="active-filters">
                <div class="active-filters-label">Активні фільтри:</div>
                <div class="filter-chips">
                    ${filters.map(([key, value]) => `
                        <div class="filter-chip">
                            <span>${this.formatFilterValue(key, value)}</span>
                            <button class="chip-remove" onclick="AdvancedSearch.removeFilter('${key}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render saved filters
     */
    renderSavedFilters() {
        if (this.savedFilters.length === 0) {
            return '<div class="empty-state">Немає збережених фільтрів</div>';
        }

        return this.savedFilters.map((filter, index) => `
            <div class="saved-filter-item">
                <div class="saved-filter-info">
                    <div class="saved-filter-name">${this.escapeHtml(filter.name)}</div>
                    <div class="saved-filter-meta">
                        ${Object.keys(filter.filters).length} фільтрів · ${filter.entityType}
                    </div>
                </div>
                <div class="saved-filter-actions">
                    <button class="btn-icon" onclick="AdvancedSearch.loadSavedFilter(${index})"
                            title="Застосувати">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon" onclick="AdvancedSearch.deleteSavedFilter(${index})"
                            title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    /**
     * Render search history
     */
    renderSearchHistory() {
        if (this.searchHistory.length === 0) {
            return '<div class="empty-state">Історія порожня</div>';
        }

        return this.searchHistory.slice(0, 10).map((item, index) => `
            <div class="history-item" onclick="AdvancedSearch.loadHistoryItem(${index})">
                <div class="history-query">${this.escapeHtml(item.query)}</div>
                <div class="history-meta">
                    ${item.entityType} · ${this.formatDate(item.timestamp)}
                </div>
            </div>
        `).join('');
    },

    /**
     * Handle text input with debounce
     */
    handleTextInput(key, value) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (value.trim()) {
                this.filters[key] = value.trim();
            } else {
                delete this.filters[key];
            }
            this.updateActiveFilters();
        }, this.debounceDelay);
    },

    /**
     * Handle select change
     */
    handleSelectChange(key, value) {
        if (value) {
            this.filters[key] = value;
        } else {
            delete this.filters[key];
        }
        this.updateActiveFilters();
    },

    /**
     * Handle multi-select change
     */
    handleMultiSelectChange(key) {
        const container = document.getElementById(`search-${key}-multiselect`);
        const checked = Array.from(container.querySelectorAll('input:checked'))
            .map(input => input.value);

        if (checked.length > 0) {
            this.filters[key] = checked;
        } else {
            delete this.filters[key];
        }
        this.updateActiveFilters();
    },

    /**
     * Handle range change
     */
    handleRangeChange(key, type, value) {
        if (!this.filters[key]) {
            this.filters[key] = {};
        }

        if (value) {
            this.filters[key][type] = parseFloat(value);
        } else {
            delete this.filters[key][type];
            if (Object.keys(this.filters[key]).length === 0) {
                delete this.filters[key];
            }
        }
        this.updateActiveFilters();
    },

    /**
     * Handle date range change
     */
    handleDateRangeChange(key, type, value) {
        if (!this.filters[key]) {
            this.filters[key] = {};
        }

        if (value) {
            this.filters[key][type] = value;
        } else {
            delete this.filters[key][type];
            if (Object.keys(this.filters[key]).length === 0) {
                delete this.filters[key];
            }
        }
        this.updateActiveFilters();
    },

    /**
     * Remove a filter
     */
    removeFilter(key) {
        delete this.filters[key];
        this.updateActiveFilters();
        this.render();
    },

    /**
     * Reset all filters
     */
    resetFilters() {
        this.filters = {};
        this.render();
    },

    /**
     * Update active filters display
     */
    updateActiveFilters() {
        const container = document.querySelector('.active-filters');
        if (container) {
            container.outerHTML = this.renderActiveFilters();
        }
    },

    /**
     * Execute search with current filters
     */
    async executeSearch() {
        const query = this.buildSearchQuery();

        // Add to history
        this.addToHistory(query);

        // Execute search based on entity type
        try {
            let results;

            switch (this.currentEntityType) {
                case 'prospect':
                    results = await this.searchProspects(query);
                    if (window.ProspectsManager) {
                        ProspectsManager.displaySearchResults(results);
                    }
                    break;

                case 'client':
                    results = await this.searchClients(query);
                    if (window.TeamHub) {
                        TeamHub.displaySearchResults(results);
                    }
                    break;

                case 'team':
                    results = await this.searchTeams(query);
                    break;
            }

            this.close();

            if (window.showNotification) {
                showNotification(`Знайдено ${results.length} результатів`, 'success');
            }

        } catch (error) {
            console.error('Search error:', error);
            if (window.showNotification) {
                showNotification('Помилка пошуку', 'error');
            }
        }
    },

    /**
     * Build search query from filters
     */
    buildSearchQuery() {
        const query = {
            entityType: this.currentEntityType,
            filters: { ...this.filters },
            timestamp: new Date().toISOString()
        };

        return query;
    },

    /**
     * Search prospects
     */
    async searchProspects(query) {
        const params = new URLSearchParams();

        Object.entries(query.filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                params.append(key, value.join(','));
            } else if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    params.append(`${key}_${subKey}`, subValue);
                });
            } else {
                params.append(key, value);
            }
        });

        const response = await APIClient.get(`/prospects/search?${params.toString()}`);
        return response.data;
    },

    /**
     * Search clients
     */
    async searchClients(query) {
        const params = new URLSearchParams();

        Object.entries(query.filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                params.append(key, value.join(','));
            } else if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    params.append(`${key}_${subKey}`, subValue);
                });
            } else {
                params.append(key, value);
            }
        });

        const response = await APIClient.get(`/clients/search?${params.toString()}`);
        return response.data;
    },

    /**
     * Search teams
     */
    async searchTeams(query) {
        const params = new URLSearchParams();

        Object.entries(query.filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                params.append(key, value.join(','));
            } else if (typeof value === 'object') {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    params.append(`${key}_${subKey}`, subValue);
                });
            } else {
                params.append(key, value);
            }
        });

        const response = await APIClient.get(`/teams/search?${params.toString()}`);
        return response.data;
    },

    /**
     * Save current filter
     */
    saveCurrentFilter() {
        if (Object.keys(this.filters).length === 0) {
            if (window.showNotification) {
                showNotification('Додайте фільтри перед збереженням', 'warning');
            }
            return;
        }

        const name = prompt('Назва фільтра:');
        if (!name) return;

        const savedFilter = {
            name,
            entityType: this.currentEntityType,
            filters: { ...this.filters },
            createdAt: new Date().toISOString()
        };

        this.savedFilters.push(savedFilter);
        this.saveSavedFilters();
        this.render();

        if (window.showNotification) {
            showNotification('Фільтр збережено', 'success');
        }
    },

    /**
     * Load saved filter
     */
    loadSavedFilter(index) {
        const filter = this.savedFilters[index];
        if (!filter) return;

        this.currentEntityType = filter.entityType;
        this.filters = { ...filter.filters };
        this.render();
    },

    /**
     * Delete saved filter
     */
    deleteSavedFilter(index) {
        this.savedFilters.splice(index, 1);
        this.saveSavedFilters();
        this.render();

        if (window.showNotification) {
            showNotification('Фільтр видалено', 'success');
        }
    },

    /**
     * Add query to history
     */
    addToHistory(query) {
        this.searchHistory.unshift({
            query: this.formatQueryForHistory(query),
            entityType: query.entityType,
            timestamp: new Date().toISOString()
        });

        // Limit history size
        if (this.searchHistory.length > this.maxHistory) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistory);
        }

        this.saveSearchHistory();
    },

    /**
     * Load history item
     */
    loadHistoryItem(index) {
        const item = this.searchHistory[index];
        if (!item) return;

        // Reconstruct filters from query (simplified)
        this.currentEntityType = item.entityType;
        this.render();
    },

    /**
     * Clear search history
     */
    clearHistory() {
        if (confirm('Очистити історію пошуку?')) {
            this.searchHistory = [];
            this.saveSearchHistory();
            this.render();
        }
    },

    /**
     * Switch entity type
     */
    switchEntityType(type) {
        this.currentEntityType = type;
        this.filters = {};
        this.render();
    },

    /**
     * Format filter value for display
     */
    formatFilterValue(key, value) {
        const config = this.criteriaDefinitions[this.currentEntityType]?.[key];
        if (!config) return `${key}: ${value}`;

        if (Array.isArray(value)) {
            return `${config.label}: ${value.join(', ')}`;
        } else if (typeof value === 'object') {
            const parts = [];
            if (value.min !== undefined) parts.push(`від ${value.min}`);
            if (value.max !== undefined) parts.push(`до ${value.max}`);
            if (value.start) parts.push(`з ${value.start}`);
            if (value.end) parts.push(`по ${value.end}`);
            return `${config.label}: ${parts.join(' ')}`;
        } else {
            const option = config.options?.find(opt => opt.value === value);
            return `${config.label}: ${option?.label || value}`;
        }
    },

    /**
     * Format query for history display
     */
    formatQueryForHistory(query) {
        const filterCount = Object.keys(query.filters).length;
        return `${filterCount} фільтр${filterCount === 1 ? '' : filterCount < 5 ? 'и' : 'ів'}`;
    },

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'щойно';
        if (diffMins < 60) return `${diffMins} хв тому`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} год тому`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} дн тому`;

        return date.toLocaleDateString('uk-UA');
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close on overlay click
        const overlay = document.querySelector('.advanced-search-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.close());
        }
    },

    /**
     * Save search history to localStorage
     */
    saveSearchHistory() {
        try {
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('Failed to save search history:', error);
        }
    },

    /**
     * Load search history from localStorage
     */
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('searchHistory');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load search history:', error);
            this.searchHistory = [];
        }
    },

    /**
     * Save saved filters to localStorage
     */
    saveSavedFilters() {
        try {
            localStorage.setItem('savedFilters', JSON.stringify(this.savedFilters));
        } catch (error) {
            console.error('Failed to save filters:', error);
        }
    },

    /**
     * Load saved filters from localStorage
     */
    loadSavedFilters() {
        try {
            const saved = localStorage.getItem('savedFilters');
            if (saved) {
                this.savedFilters = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load saved filters:', error);
            this.savedFilters = [];
        }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdvancedSearch.init());
} else {
    AdvancedSearch.init();
}

// Export for global access
window.AdvancedSearch = AdvancedSearch;
