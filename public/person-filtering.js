// Enhanced Person Filtering System for Negotiations
class PersonFilteringSystem {
    constructor() {
        this.knownPersons = new Set();
        this.personSuggestions = [];
        this.currentFilters = [];
        this.analysisHistory = [];
        this.init();
    }

    init() {
        this.loadPersonHistory();
        this.setupPersonInput();
        this.setupFilterUI();
    }

    // Load person history from previous analyses
    async loadPersonHistory() {
        try {
            const response = await fetch('/api/negotiations/persons-history');
            if (response.ok) {
                const data = await response.json();
                this.personSuggestions = data.persons || [];
                this.updatePersonSuggestions();
            }
        } catch (error) {
            console.error('Failed to load person history:', error);
        }
    }

    // Setup enhanced person input with autocomplete
    setupPersonInput() {
        const personInput = document.getElementById('person-focus');
        if (!personInput) return;

        // Create suggestion container
        const suggestionContainer = this.createSuggestionContainer(personInput);

        // Enhanced input handling
        personInput.addEventListener('input', (e) => {
            this.handlePersonInput(e.target.value, suggestionContainer);
        });

        personInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e, suggestionContainer);
        });

        // Click outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!personInput.contains(e.target) && !suggestionContainer.contains(e.target)) {
                suggestionContainer.style.display = 'none';
            }
        });
    }

    createSuggestionContainer(input) {
        const container = document.createElement('div');
        container.className = 'person-suggestions';
        container.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--surface-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: 0 4px 12px var(--shadow-color);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;

        input.parentNode.style.position = 'relative';
        input.parentNode.appendChild(container);
        return container;
    }

    handlePersonInput(value, container) {
        if (value.length < 2) {
            container.style.display = 'none';
            return;
        }

        const matches = this.findPersonMatches(value);
        this.renderSuggestions(matches, container, value);
    }

    findPersonMatches(query) {
        const normalizedQuery = query.toLowerCase().trim();

        // Exact matches first
        const exactMatches = this.personSuggestions.filter(person =>
            person.name.toLowerCase().includes(normalizedQuery)
        );

        // Fuzzy matches for partial names
        const fuzzyMatches = this.personSuggestions.filter(person => {
            const words = normalizedQuery.split(' ');
            return words.every(word =>
                person.name.toLowerCase().includes(word) ||
                person.role?.toLowerCase().includes(word) ||
                person.department?.toLowerCase().includes(word)
            );
        });

        // Combine and deduplicate
        const allMatches = [...new Set([...exactMatches, ...fuzzyMatches])];

        // Sort by relevance
        return allMatches.sort((a, b) => {
            const aRelevance = this.calculateRelevance(a, normalizedQuery);
            const bRelevance = this.calculateRelevance(b, normalizedQuery);
            return bRelevance - aRelevance;
        }).slice(0, 8);
    }

    calculateRelevance(person, query) {
        let score = 0;
        const name = person.name.toLowerCase();

        // Exact name match
        if (name === query) score += 100;
        // Name starts with query
        else if (name.startsWith(query)) score += 80;
        // Name contains query
        else if (name.includes(query)) score += 60;

        // Role relevance
        if (person.role?.toLowerCase().includes(query)) score += 40;

        // Recent usage bonus
        if (person.lastUsed) {
            const daysSince = (Date.now() - new Date(person.lastUsed)) / (1000 * 60 * 60 * 24);
            if (daysSince < 7) score += 20;
            else if (daysSince < 30) score += 10;
        }

        // Usage frequency bonus
        score += (person.usageCount || 0) * 5;

        return score;
    }

    renderSuggestions(suggestions, container, query) {
        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="suggestion-item no-results">
                    <i class="fas fa-search"></i>
                    <span>Додати нову особу: "${query}"</span>
                </div>
            `;
            container.style.display = 'block';
            return;
        }

        container.innerHTML = suggestions.map((person, index) => `
            <div class="suggestion-item" data-person='${JSON.stringify(person)}' data-index="${index}">
                <div class="person-info">
                    <div class="person-name">${this.highlightMatch(person.name, query)}</div>
                    <div class="person-details">
                        ${person.role ? `<span class="role">${person.role}</span>` : ''}
                        ${person.department ? `<span class="department">${person.department}</span>` : ''}
                        ${person.usageCount ? `<span class="usage-count">${person.usageCount} аналізів</span>` : ''}
                    </div>
                </div>
                <div class="person-actions">
                    <button class="btn-icon btn-xs" onclick="personFilter.selectPerson('${person.name}')" title="Вибрати">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const personData = JSON.parse(item.dataset.person);
                this.selectPerson(personData.name);
            });
        });

        container.style.display = 'block';
    }

    highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    handleKeyNavigation(e, container) {
        const items = container.querySelectorAll('.suggestion-item');
        const currentSelected = container.querySelector('.suggestion-item.selected');
        let selectedIndex = currentSelected ? parseInt(currentSelected.dataset.index) : -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            this.updateSelection(items, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            this.updateSelection(items, selectedIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentSelected) {
                const personData = JSON.parse(currentSelected.dataset.person);
                this.selectPerson(personData.name);
            } else {
                // Use current input value as new person
                this.selectPerson(e.target.value);
            }
        } else if (e.key === 'Escape') {
            container.style.display = 'none';
        }
    }

    updateSelection(items, selectedIndex) {
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }

    selectPerson(personName) {
        const personInput = document.getElementById('person-focus');
        if (personInput) {
            personInput.value = personName;
            this.addPersonFilter(personName);
        }

        // Hide suggestions
        const container = document.querySelector('.person-suggestions');
        if (container) {
            container.style.display = 'none';
        }

        // Track usage
        this.trackPersonUsage(personName);
    }

    // Setup filter UI with active filters display
    setupFilterUI() {
        this.createFilterContainer();
        this.setupFilterControls();
    }

    createFilterContainer() {
        const analysisForm = document.querySelector('.analysis-form');
        if (!analysisForm) return;

        const filterContainer = document.createElement('div');
        filterContainer.className = 'person-filters-container';
        filterContainer.innerHTML = `
            <div class="active-filters">
                <div class="filter-header">
                    <i class="fas fa-filter"></i>
                    <span>Активні фільтри осіб:</span>
                </div>
                <div class="filter-tags" id="person-filter-tags"></div>
            </div>
            <div class="filter-controls">
                <button type="button" class="btn-secondary btn-sm" onclick="personFilter.showFilterHistory()">
                    <i class="fas fa-history"></i> Історія фільтрів
                </button>
                <button type="button" class="btn-secondary btn-sm" onclick="personFilter.clearAllFilters()">
                    <i class="fas fa-times"></i> Очистити все
                </button>
            </div>
        `;

        const personInput = document.getElementById('person-focus');
        if (personInput && personInput.parentNode) {
            personInput.parentNode.after(filterContainer);
        }
    }

    addPersonFilter(personName) {
        if (!personName || this.currentFilters.includes(personName)) return;

        this.currentFilters.push(personName);
        this.updateFilterTags();
        this.applyFilters();
    }

    removePersonFilter(personName) {
        this.currentFilters = this.currentFilters.filter(name => name !== personName);
        this.updateFilterTags();
        this.applyFilters();
    }

    updateFilterTags() {
        const tagsContainer = document.getElementById('person-filter-tags');
        if (!tagsContainer) return;

        if (this.currentFilters.length === 0) {
            tagsContainer.innerHTML = '<span class="no-filters">Фільтри не застосовані</span>';
            return;
        }

        tagsContainer.innerHTML = this.currentFilters.map(personName => `
            <div class="filter-tag">
                <i class="fas fa-user"></i>
                <span>${personName}</span>
                <button type="button" onclick="personFilter.removePersonFilter('${personName}')" title="Видалити фільтр">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    clearAllFilters() {
        this.currentFilters = [];
        this.updateFilterTags();
        this.applyFilters();

        // Clear person input
        const personInput = document.getElementById('person-focus');
        if (personInput) {
            personInput.value = '';
        }
    }

    applyFilters() {
        // Update analysis display based on active filters
        if (window.updateAnalysisDisplay) {
            window.updateAnalysisDisplay(this.currentFilters);
        }

        // Update form state
        this.updateFormState();
    }

    updateFormState() {
        const personInput = document.getElementById('person-focus');
        if (personInput && this.currentFilters.length > 0) {
            personInput.value = this.currentFilters.join(', ');
        }
    }

    async trackPersonUsage(personName) {
        try {
            await fetch('/api/negotiations/track-person-usage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personName })
            });
        } catch (error) {
            console.error('Failed to track person usage:', error);
        }
    }

    async showFilterHistory() {
        try {
            const response = await fetch('/api/negotiations/filter-history');
            if (response.ok) {
                const data = await response.json();
                this.renderFilterHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to load filter history:', error);
        }
    }

    renderFilterHistory(history) {
        const modal = this.createHistoryModal(history);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    createHistoryModal(history) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content filter-history-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> Історія фільтрів осіб</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="history-list">
                        ${history.map(item => `
                            <div class="history-item" onclick="personFilter.applyHistoryFilter('${item.persons.join(',')}')">
                                <div class="history-persons">
                                    ${item.persons.map(person => `<span class="person-badge">${person}</span>`).join('')}
                                </div>
                                <div class="history-meta">
                                    <span class="usage-count">${item.usageCount} разів</span>
                                    <span class="last-used">${new Date(item.lastUsed).toLocaleDateString('uk-UA')}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        return modal;
    }

    applyHistoryFilter(personsString) {
        const persons = personsString.split(',').filter(p => p.trim());
        this.currentFilters = persons;
        this.updateFilterTags();
        this.updateFormState();
        this.applyFilters();

        // Close modal
        document.querySelector('.filter-history-modal')?.closest('.modal-overlay')?.remove();
    }

    // Advanced filtering for analysis results
    filterAnalysisResults(analyses, filters = this.currentFilters) {
        if (!filters || filters.length === 0) return analyses;

        return analyses.filter(analysis => {
            if (!analysis.person_focus) return false;

            const analysisPersons = analysis.person_focus.toLowerCase().split(',').map(p => p.trim());

            return filters.some(filter =>
                analysisPersons.some(person =>
                    person.includes(filter.toLowerCase()) ||
                    filter.toLowerCase().includes(person)
                )
            );
        });
    }

    // Export current filter configuration
    exportFilterConfig() {
        return {
            filters: this.currentFilters,
            timestamp: new Date().toISOString(),
            personSuggestions: this.personSuggestions
        };
    }

    // Import filter configuration
    importFilterConfig(config) {
        if (config.filters) {
            this.currentFilters = config.filters;
            this.updateFilterTags();
            this.updateFormState();
        }
        if (config.personSuggestions) {
            this.personSuggestions = config.personSuggestions;
        }
    }
}

// Global instance
const personFilter = new PersonFilteringSystem();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.personFilter = personFilter;
    window.PersonFilteringSystem = PersonFilteringSystem;
}