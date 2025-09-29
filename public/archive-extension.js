// Archive Extension for TeamPulse Turbo
(() => {
    'use strict';

    // Wait for the main app to be initialized
    document.addEventListener('DOMContentLoaded', () => {
        // Add archive functionality after main app loads
        setTimeout(initArchiveExtension, 1000);
    });

    function initArchiveExtension() {
        console.log('🗃️ Initializing Archive Extension...');

        // Add event listeners for archive functionality
        addArchiveEventListeners();

        // Enhance analysis form with person focus
        enhanceAnalysisForm();

        // Hook into client selection to load archive
        interceptClientSelection();

        console.log('🗃️ Archive Extension initialized');
    }

    function addArchiveEventListeners() {
        // Archive filters toggle
        const filtersToggle = document.getElementById('archive-filters-toggle');
        if (filtersToggle) {
            filtersToggle.addEventListener('click', () => {
                const filters = document.getElementById('archive-filters');
                const isVisible = filters.style.display !== 'none';
                filters.style.display = isVisible ? 'none' : 'block';
            });
        }

        // Archive filter actions
        const applyBtn = document.getElementById('apply-archive-filters');
        if (applyBtn) {
            applyBtn.addEventListener('click', applyArchiveFilters);
        }

        const clearBtn = document.getElementById('clear-archive-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', clearArchiveFilters);
        }

        // Archive pagination
        const prevBtn = document.getElementById('archive-prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => navigateArchive('prev'));
        }

        const nextBtn = document.getElementById('archive-next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => navigateArchive('next'));
        }

        // Search on Enter key
        const searchInput = document.getElementById('archive-search');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    applyArchiveFilters();
                }
            });
        }
    }

    function enhanceAnalysisForm() {
        // Find the analysis form and enhance it with person focus
        const startBtn = document.getElementById('start-analysis-btn');
        if (startBtn) {
            // Store original onclick handler
            const originalHandler = startBtn.onclick;

            // Replace with enhanced handler
            startBtn.onclick = async function(e) {
                // Get person focus input
                const personFocusInput = document.getElementById('person-focus-input');
                const personFocus = personFocusInput ? personFocusInput.value.trim() : '';

                // Add person focus to the analysis request
                if (window.startAnalysis) {
                    // If there's a global startAnalysis function, enhance it
                    const originalStartAnalysis = window.startAnalysis;
                    window.startAnalysis = async function(text, filename, source) {
                        return originalStartAnalysis(text, filename, source, personFocus);
                    };
                }

                // Call original handler
                if (originalHandler) {
                    return originalHandler.call(this, e);
                }
            };
        }
    }

    function interceptClientSelection() {
        // Hook into client selection to load archive
        const originalSelectClient = window.selectClient;
        if (originalSelectClient) {
            window.selectClient = function(clientId) {
                // Call original function first
                const result = originalSelectClient.call(this, clientId);

                // Then load archive for this client
                setTimeout(() => {
                    if (window.loadArchive) {
                        window.loadArchive(clientId);
                    }
                }, 500);

                return result;
            };
        }
    }

    // Archive state management
    window.archiveState = {
        analyses: [],
        filters: {
            search: '',
            person_filter: '',
            analysis_type: '',
            date_from: '',
            date_to: ''
        },
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 1
        },
        available_persons: [],
        available_types: [],
        loading: false
    };

    // Archive functions
    window.loadArchive = async function(clientId) {
        if (!clientId) {
            document.getElementById('archive-section').style.display = 'none';
            return;
        }

        window.archiveState.loading = true;
        updateArchiveUI();

        try {
            const params = new URLSearchParams({
                limit: window.archiveState.pagination.limit,
                offset: (window.archiveState.pagination.page - 1) * window.archiveState.pagination.limit,
                ...window.archiveState.filters
            });

            const response = await fetch(`/api/negotiations/client/${clientId}/archive?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка завантаження архіву');
            }

            window.archiveState.analyses = data.analyses || [];
            window.archiveState.available_persons = data.filters?.available_persons || [];
            window.archiveState.available_types = data.filters?.available_types || [];
            window.archiveState.pagination.total = data.meta?.total || 0;
            window.archiveState.pagination.totalPages = Math.ceil(window.archiveState.pagination.total / window.archiveState.pagination.limit);

            updateArchiveFilters();
            renderArchiveList();
            updateArchivePagination();
            document.getElementById('archive-section').style.display = 'block';

        } catch (error) {
            console.error('Archive loading error:', error);
            if (window.showNotification) {
                window.showNotification(error.message || 'Помилка завантаження архіву', 'error');
            }
        } finally {
            window.archiveState.loading = false;
            updateArchiveUI();
        }
    };

    function updateArchiveFilters() {
        const personFilter = document.getElementById('archive-person-filter');
        const typeFilter = document.getElementById('archive-type-filter');

        if (personFilter) {
            personFilter.innerHTML = '<option value="">Всі особи</option>';
            window.archiveState.available_persons.forEach(person => {
                const option = document.createElement('option');
                option.value = person;
                option.textContent = person;
                option.selected = person === window.archiveState.filters.person_filter;
                personFilter.appendChild(option);
            });
        }

        if (typeFilter) {
            typeFilter.innerHTML = '<option value="">Всі типи</option>';
            window.archiveState.available_types.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type === 'manual' ? 'Ручний ввід' : type;
                option.selected = type === window.archiveState.filters.analysis_type;
                typeFilter.appendChild(option);
            });
        }

        // Set current filter values
        const searchInput = document.getElementById('archive-search');
        const dateFromInput = document.getElementById('archive-date-from');
        const dateToInput = document.getElementById('archive-date-to');

        if (searchInput) searchInput.value = window.archiveState.filters.search;
        if (dateFromInput) dateFromInput.value = window.archiveState.filters.date_from;
        if (dateToInput) dateToInput.value = window.archiveState.filters.date_to;
    }

    function renderArchiveList() {
        const archiveList = document.getElementById('archive-list');
        const archiveCount = document.getElementById('archive-count');

        if (archiveCount) {
            archiveCount.textContent = window.archiveState.pagination.total;
        }

        if (!archiveList) return;

        if (window.archiveState.analyses.length === 0) {
            archiveList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-archive"></i>
                    </div>
                    <p>Архів аналізів порожній</p>
                </div>
            `;
            return;
        }

        archiveList.innerHTML = window.archiveState.analyses.map(analysis => {
            const date = new Date(analysis.created_at).toLocaleDateString('uk-UA');
            const time = new Date(analysis.created_at).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="archive-item" data-analysis-id="${analysis.id}">
                    <div class="archive-item-header">
                        <div class="archive-item-title">
                            <i class="fas fa-brain"></i>
                            <span>${analysis.title}</span>
                        </div>
                        <div class="archive-item-actions">
                            <button class="btn-icon" onclick="loadArchiveAnalysis(${analysis.id})" title="Завантажити">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon" onclick="deleteArchiveAnalysis(${analysis.id})" title="Видалити">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="archive-item-meta">
                        <span class="archive-date">
                            <i class="fas fa-calendar"></i>
                            ${date} о ${time}
                        </span>
                        ${analysis.person_focus ? `
                            <span class="archive-person">
                                <i class="fas fa-user"></i>
                                ${analysis.person_focus}
                            </span>
                        ` : ''}
                        ${analysis.tokens_estimated ? `
                            <span class="archive-tokens">
                                <i class="fas fa-coins"></i>
                                ${analysis.tokens_estimated} токенів
                            </span>
                        ` : ''}
                    </div>
                    <div class="archive-item-preview">
                        ${analysis.negotiation_title || 'Без назви переговорів'}
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateArchivePagination() {
        const pagination = document.getElementById('archive-pagination');
        const pageInfo = document.getElementById('archive-page-info');
        const prevBtn = document.getElementById('archive-prev-page');
        const nextBtn = document.getElementById('archive-next-page');

        if (!pagination) return;

        if (window.archiveState.pagination.totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        if (pageInfo) {
            pageInfo.textContent = `${window.archiveState.pagination.page} / ${window.archiveState.pagination.totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled = window.archiveState.pagination.page === 1;
        }
        if (nextBtn) {
            nextBtn.disabled = window.archiveState.pagination.page === window.archiveState.pagination.totalPages;
        }
    }

    function updateArchiveUI() {
        const archiveList = document.getElementById('archive-list');

        if (!archiveList) return;

        if (window.archiveState.loading) {
            archiveList.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Завантаження архіву...</p>
                </div>
            `;
        }
    }

    window.applyArchiveFilters = async function() {
        window.archiveState.filters = {
            search: document.getElementById('archive-search')?.value.trim() || '',
            person_filter: document.getElementById('archive-person-filter')?.value || '',
            analysis_type: document.getElementById('archive-type-filter')?.value || '',
            date_from: document.getElementById('archive-date-from')?.value || '',
            date_to: document.getElementById('archive-date-to')?.value || ''
        };

        window.archiveState.pagination.page = 1;

        // Get current client ID
        const currentClientId = window.state?.currentClient?.id ||
                              window.appState?.currentClient?.id ||
                              getCurrentClientId();

        if (currentClientId) {
            await window.loadArchive(currentClientId);
        }
    };

    window.clearArchiveFilters = function() {
        window.archiveState.filters = {
            search: '',
            person_filter: '',
            analysis_type: '',
            date_from: '',
            date_to: ''
        };

        const searchInput = document.getElementById('archive-search');
        const personFilter = document.getElementById('archive-person-filter');
        const typeFilter = document.getElementById('archive-type-filter');
        const dateFromInput = document.getElementById('archive-date-from');
        const dateToInput = document.getElementById('archive-date-to');

        if (searchInput) searchInput.value = '';
        if (personFilter) personFilter.value = '';
        if (typeFilter) typeFilter.value = '';
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';

        window.archiveState.pagination.page = 1;

        const currentClientId = getCurrentClientId();
        if (currentClientId) {
            window.loadArchive(currentClientId);
        }
    };

    window.loadArchiveAnalysis = async function(analysisId) {
        try {
            if (window.showNotification) {
                window.showNotification('Завантаження аналізу...', 'info');
            }

            const analysis = window.archiveState.analyses.find(a => a.id === analysisId);
            if (!analysis) {
                throw new Error('Аналіз не знайдено');
            }

            // Try to use the main app's analysis display
            if (window.state) {
                window.state.currentAnalysis = {
                    id: analysis.id,
                    title: analysis.title,
                    content: analysis.original_text,
                    highlights: analysis.highlights || [],
                    summary: analysis.summary || {},
                    barometer: analysis.barometer || {},
                    personas: analysis.personas || [],
                    insights: analysis.insights || {},
                    person_focus: analysis.person_focus
                };

                if (window.showAnalysisResults) {
                    window.showAnalysisResults();
                }
            }

            if (window.showNotification) {
                window.showNotification('Аналіз завантажено з архіву', 'success');
            }

        } catch (error) {
            console.error('Archive analysis loading error:', error);
            if (window.showNotification) {
                window.showNotification(error.message || 'Помилка завантаження аналізу', 'error');
            }
        }
    };

    window.deleteArchiveAnalysis = async function(analysisId) {
        if (!confirm('Видалити цей аналіз з архіву? Цю дію неможливо скасувати.')) {
            return;
        }

        try {
            const response = await fetch(`/api/negotiations/analysis/${analysisId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка видалення аналізу');
            }

            const currentClientId = getCurrentClientId();
            if (currentClientId) {
                await window.loadArchive(currentClientId);
            }

            if (window.showNotification) {
                window.showNotification('Аналіз видалено з архіву', 'success');
            }

        } catch (error) {
            console.error('Archive analysis deletion error:', error);
            if (window.showNotification) {
                window.showNotification(error.message || 'Помилка видалення аналізу', 'error');
            }
        }
    };

    window.navigateArchive = function(direction) {
        if (direction === 'prev' && window.archiveState.pagination.page > 1) {
            window.archiveState.pagination.page--;
        } else if (direction === 'next' && window.archiveState.pagination.page < window.archiveState.pagination.totalPages) {
            window.archiveState.pagination.page++;
        }

        const currentClientId = getCurrentClientId();
        if (currentClientId) {
            window.loadArchive(currentClientId);
        }
    };

    function getCurrentClientId() {
        // Try multiple ways to get current client ID
        return window.state?.currentClient?.id ||
               window.appState?.currentClient?.id ||
               document.querySelector('.client-item.selected')?.dataset?.clientId ||
               null;
    }

})();