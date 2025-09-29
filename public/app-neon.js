// TeamPulse Turbo - Neon Enhanced Frontend
(() => {
    'use strict';

    // ===== Application State =====
    const state = {
        currentClient: null,
        currentAnalysis: null,
        clients: [],
        analyses: [],
        selectedFragments: [],
        recommendationsHistory: {}, // clientId -> array of recommendations
        originalText: null,
        onboardingCompleted: false,
        onboardingStep: 1,
        tokenUsage: {
            used: 0,
            total: 512000,
            percentage: 0
        },
        analysis: {
            focusPeople: [],
            excludePeople: [],
            persona: null,
            biasClusters: [],
            negotiationMap: null,
            question: '',
            highlightMultiplier: 1,
            personAdvice: {},
            adequacy: {
                score: 0,
                label: '—',
                comment: ''
            }
        },
        team: {
            list: [],
            current: null,
            members: [],
            latestRaci: null,
            latestRaciView: 'actual',
            salaryInsights: [],
            manualDraft: [],
            manualTitle: '',
            manualDescription: '',
            pendingTeamId: null,
            lastRaciMeta: null,
            lastSalaryMeta: null,
            profile: {
                company_name: '',
                company_industry: '',
                company_location: '',
                company_focus: '',
                team_name: '',
                team_mission: '',
                team_tags: ''
            },
            intake: {
                files: [],
                status: 'idle',
                lastRunAt: null,
                summary: '',
                highlights: []
            }
        },
        salary: {
            latest: null
        },
        guide: {
            steps: [],
            modules: {}
        },
        ui: {
            leftSidebarCollapsed: false,
            rightSidebarCollapsed: false,
            currentView: 'welcome',
            analysisStep: 1,
            highlightsView: 'list', // list, text, filter
            filters: {
                showManipulation: true,
                showCognitiveBias: true,
                showRhetoricalFallacy: true,
                minSeverity: 1,
                maxSeverity: 3,
                searchText: ''
            },
            filtersVisible: false,
            clientFormStep: 'basics'
        }
    };

    // ===== Normalization Helpers =====
    const normalizeId = (value) => {
        if (value === null || value === undefined) return null;
        const numeric = Number(value);
        return Number.isNaN(numeric) ? value : numeric;
    };

    const toNumberOrFallback = (value, fallback = null) => {
        if (value === null || value === undefined || value === '') return fallback;
        const numeric = Number(value);
        return Number.isNaN(numeric) ? fallback : numeric;
    };

    const normalizeClient = (raw = {}) => {
        if (!raw || typeof raw !== 'object') return raw;
        return {
            ...raw,
            id: normalizeId(raw.id),
            weekly_hours: toNumberOrFallback(raw.weekly_hours, 0),
            analyses_count: toNumberOrFallback(raw.analyses_count, 0),
            avg_complexity_score: raw.avg_complexity_score == null
                ? null
                : toNumberOrFallback(raw.avg_complexity_score, null)
        };
    };

    const normalizeAnalysis = (raw = {}) => {
        if (!raw || typeof raw !== 'object') return raw;
        return {
            ...raw,
            id: normalizeId(raw.id),
            client_id: normalizeId(raw.client_id),
            complexity_score: raw.complexity_score == null
                ? null
                : toNumberOrFallback(raw.complexity_score, null)
        };
    };

    const getFieldKey = (input) => {
        if (!input) return '';
        const source = input.dataset?.field || input.name || input.id;
        if (!source) return '';
        return source.replace(/-/g, '_');
    };

    const idsMatch = (a, b) => {
        const first = Number(a);
        const second = Number(b);
        if (Number.isNaN(first) || Number.isNaN(second)) {
            return a === b;
        }
        return first === second;
    };

    // ===== DOM Elements Cache =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const PRODUCT_META = {
        'analysis-dashboard': { label: 'Аналіз переговорів', icon: 'fas fa-brain' },
        'team-hub': { label: 'Team Hub', icon: 'fas fa-people-group' },
        'raci-dashboard': { label: 'RACI Matrix', icon: 'fas fa-network-wired' },
        'salary-dashboard': { label: 'Аналітика зарплат', icon: 'fas fa-sack-dollar' }
    };

    const DEFAULT_CLIENT_GUIDE = {
        steps: [
            {
                id: 'basics',
                title: 'Базові реквізити',
                description: 'Назва компанії та контактний контекст для збереження в CRM.',
                fields: ['company', 'negotiator', 'sector', 'company_size'],
                required: ['company']
            },
            {
                id: 'negotiation-scope',
                title: 'Контекст переговорів',
                description: 'Тип угоди, вартість та часові рамки для правильного підбору тактик.',
                fields: ['negotiation_type', 'deal_value', 'timeline', 'weekly_hours'],
                required: ['negotiation_type']
            },
            {
                id: 'goals',
                title: 'Цілі та критерії',
                description: 'Формалізуйте очікування, KPI і обмеження обох сторін.',
                fields: ['goal', 'decision_criteria', 'constraints', 'deadlines', 'user_goals', 'client_goals'],
                required: ['goal']
            },
            {
                id: 'intelligence',
                title: 'Ринковий інтелект',
                description: 'Зафіксуйте конкурентів, переваги та історію взаємодій.',
                fields: ['competitors', 'competitive_advantage', 'market_position', 'previous_interactions', 'offered_services', 'notes'],
                required: []
            }
        ],
        modules: {
            'analysis-dashboard': {
                title: 'Аналіз переговорів',
                goal: 'Швидко виявляйте маніпуляції, ризики та ключові фрагменти з переговорів.',
                steps: [
                    'Оберіть клієнта або створіть новий профіль.',
                    'Вставте транскрипт або завантажте документ для аналізу.',
                    'Перегляньте знайдені маніпуляції та збережіть важливі фрагменти.',
                    'Сформуйте робочу область для підготовки до відповіді.'
                ]
            },
            'team-hub': {
                title: 'Team Hub',
                goal: 'Структуруйте команду клієнта для подальшого аналізу відповідальності та компенсацій.',
                steps: [
                    'Імпортуйте дані з JSON або додайте учасників вручну.',
                    'Вкажіть ролі, завантаженість, KPI та ключові нотатки по команді.',
                    'Збережіть команду, щоб синхронізувати її з RACI та Salary Insights.',
                    'Оновлюйте профілі учасників після кожної сесії переговорів.'
                ]
            },
            'raci-dashboard': {
                title: 'RACI Matrix',
                goal: 'Порівняйте поточний стан відповідальності з цільовою моделлю та визначте прогалини.',
                steps: [
                    'Обирайте команду, синхронізовану з Team Hub.',
                    'Перегляньте поточний та ідеальний розподіл відповідальності.',
                    'Вивчіть блоки "Ключові розриви" та "Швидкі перемоги" для плану дій.',
                    'Збережіть матрицю для аудиту змін та наступних сесій.'
                ]
            },
            'salary-dashboard': {
                title: 'Salary Insights',
                goal: 'Оцініть компенсації, ринкові діапазони та завантаженість для кожної ролі.',
                steps: [
                    'Синхронізуйте дані з Team Hub або додайте учасників вручну.',
                    'Заповніть компенсаційні параметри та валюту для кожної ролі.',
                    'Перегляньте рекомендації щодо оптимізації балансу та рентабельності.',
                    'Експортуйте інсайти для фінансових переговорів з клієнтом.'
                ]
            }
        }
    };

    const elements = {
        // Layout
        sidebarLeft: $('#sidebar-left'),
        sidebarRight: $('#sidebar-right'),
        mainContent: $('#main-content'),
        sidebarRightToggle: $('#sidebar-right-toggle'),
        mobileMenuToggle: $('#mobile-menu-toggle'),
        workspaceToggle: $('#workspace-toggle'),
        
        // Onboarding
        onboardingModal: $('#onboarding-modal'),
        onboardingClose: $('#onboarding-close'),
        onboardingProgress: $('#onboarding-progress'),
        progressText: $('#progress-text'),
        nextStep: $('#next-step'),
        prevStep: $('#prev-step'),
        skipOnboarding: $('#skip-onboarding'),

        // Client Management
        clientList: $('#client-list'),
        clientSearch: $('#client-search'),
        clientCount: $('#client-count'),
        newClientBtn: $('#new-client-btn'),
        welcomeNewClient: $('#welcome-new-client'),
        welcomeHelp: $('#welcome-help'),
        
        // Navigation
        navClientInfo: $('#nav-client-info'),
        navClientAvatar: $('#nav-client-avatar'),
        navClientName: $('#nav-client-name'),
        navClientSector: $('#nav-client-sector'),
        
        // Token Counter
        tokenCounter: $('#token-counter'),
        usedTokens: $('#used-tokens'),
        totalTokens: $('#total-tokens'),
        tokenProgressFill: $('#token-progress-fill'),
        workspaceUsedTokens: $('#workspace-used-tokens'),
        workspaceTotalTokens: $('#workspace-total-tokens'),
        workspaceTokenProgress: $('#workspace-token-progress'),
        workspaceTokenPercentage: $('#workspace-token-percentage'),
        
        // Tabs & Content
        welcomeScreen: $('#welcome-screen'),
        clientForm: $('#client-form'),
        analysisDashboard: $('#analysis-dashboard'),
        
        // Client Form
        clientFormTitle: $('#client-form-title'),
        saveClientBtn: $('#save-client-btn'),
        cancelClientBtn: $('#cancel-client-btn'),
        clientWizard: $('#client-wizard'),
        clientStepper: $('#client-stepper'),
        clientStepTitle: $('#client-step-title'),
        clientStepDescription: $('#client-step-description'),
        clientStepCount: $('#client-step-count'),
        clientNextStep: $('#client-next-step'),
        clientPrevStep: $('#client-prev-step'),

        // Analysis
        textMethod: $('#text-method'),
        fileMethod: $('#file-method'),
        textInputContent: $('#text-input-content'),
        fileInputContent: $('#file-input-content'),
        negotiationText: $('#negotiation-text'),
        fileDropzone: $('#file-dropzone'),
        fileInput: $('#file-input'),
        chooseFileBtn: $('#choose-file-btn'),
        filePreview: $('#file-preview'),
        fileName: $('#file-name'),
        fileSize: $('#file-size'),
        removeFileBtn: $('#remove-file-btn'),
        startAnalysisBtn: $('#start-analysis-btn'),
        clearTextBtn: $('#clear-text-btn'),
        pasteBtn: $('#paste-btn'),
        charCount: $('#char-count'),
        wordCount: $('#word-count'),
        estimatedTokens: $('#estimated-tokens'),
        analysisTeamSelect: $('#analysis-team-select'),
        manageTeamBtn: $('#manage-team-btn'),
        focusPeopleChips: $('#focus-people-chips'),
        analysisQuestion: $('#analysis-question'),
        highlightDensity: $('#highlight-density'),
        highlightDensityLabel: $('#highlight-density-label'),
        personaInsights: $('#persona-insights'),
        biasClusters: $('#bias-clusters'),
        negotiationMap: $('#negotiation-map'),
        
        // Results
        resultsSection: $('#results-section'),
        stepInput: $('#step-input'),
        stepAnalysis: $('#step-analysis'),
        stepResults: $('#step-results'),
        manipulationsCount: $('#manipulations-count'),
        biasesCount: $('#biases-count'),
        fallaciesCount: $('#fallacies-count'),
        recommendationsCount: $('#recommendations-count'),
        barometerScore: $('#barometer-score'),
        barometerLabel: $('#barometer-label'),
        barometerComment: $('#barometer-comment'),
        gaugeCircle: $('#gauge-circle'),
        barometerAdequacyScore: $('#adequacy-score'),
        barometerAdequacyLabel: $('#adequacy-label'),
        barometerAdequacyComment: $('#adequacy-comment'),
        barometerAdequacyBar: $('#adequacy-bar'),
        highlightsList: $('#highlights-list'),
        fulltextContent: $('#fulltext-content'),
        fragmentsContent: $('#fragments-content'),
        listView: $('#list-view'),
        textView: $('#text-view'),
        highlightsView: $('#highlights-view'),
        filterView: $('#filter-view'),
        filtersPanel: $('#filters-panel'),
        filterManipulation: $('#filter-manipulation'),
        filterCognitiveBias: $('#filter-cognitive-bias'),
        filterRhetoricalFallacy: $('#filter-rhetorical-fallacy'),
        filterMinSeverity: $('#filter-min-severity'),
        filterMaxSeverity: $('#filter-max-severity'),
        filterSearch: $('#filter-search'),
        clearFiltersBtn: $('#clear-filters'),
        applyFiltersBtn: $('#apply-filters'),
        
        // Workspace
        workspaceClientInfo: $('#workspace-client-info'),
        recommendationsHistorySection: $('#recommendations-history-section'),
        recommendationsHistory: $('#recommendations-history'),
        recommendationsCount: $('#recommendations-count'),
        fragmentsCount: $('#fragments-count'),
        fragmentsDropZone: $('#fragments-drop-zone'),
        selectedFragments: $('#selected-fragments'),
        getAdviceBtn: $('#get-advice-btn'),
        exportSelectedBtn: $('#export-selected-btn'),
        clearWorkspaceBtn: $('#clear-workspace-btn'),
        
        // Analysis History (removed from sidebar, now only in modal)
        newAnalysisBtn: $('#new-analysis-btn'),
        
        // Team Hub
        teamHub: $('#team-hub'),
        teamList: $('#team-list'),
        teamPreview: $('#team-preview'),
        manualTeamEditor: $('#manual-team-editor'),
        manualTeamTitle: $('#manual-team-title'),
        manualTeamDescription: $('#manual-team-description'),
        addManualMemberBtn: $('#add-manual-member'),
        teamSaveManualBtn: $('#team-save-manual'),
        importTeamJsonBtn: $('#import-team-json-btn'),
        teamJsonInput: $('#team-json-input'),
        openManualTeamEditorBtn: $('#open-manual-team-editor'),
        
        // RACI
        raciDashboard: $('#raci-dashboard'),
        raciTeamSelect: $('#raci-team-select'),
        raciViewToggle: $('#raci-view-toggle'),
        generateRaciBtn: $('#generate-raci-btn'),
        raciMatrixTable: $('#raci-matrix-table'),
        raciGapsList: $('#raci-gaps-list'),
        raciQuickWins: $('#raci-quick-wins'),
        raciRoadmap: $('#raci-roadmap'),
        raciMetaInfo: $('#raci-meta-info'),
        intelFieldInputs: $$("[data-intel-field]"),
        intelDropzone: $('[data-intel-dropzone]'),
        intelFileInput: $('[data-intel-file-input]'),
        intelAssetList: $('#intel-asset-list'),
        intelProcessAssets: $('#intel-process-assets'),
        intelClearAssets: $('#intel-clear-assets'),
        intelProcessingState: $('#intel-processing-state'),
        intelProcessingMeta: $('#intel-processing-meta'),
        intelRosterList: $('#intel-roster-list'),
        employeeIntelModal: $('#employee-intel-modal'),
        employeeIntelSummary: $('#employee-intel-summary'),
        employeeIntelSignals: $('#employee-intel-signals'),
        employeeIntelActions: $('#employee-intel-actions'),
        employeeIntelMeta: $('#employee-intel-meta'),
        employeeIntelName: $('#employee-intel-name'),

        // Salary
        salaryDashboard: $('#salary-dashboard'),
        salaryMemberSelect: $('#salary-member-select'),
        salaryAmount: $('#salary-amount'),
        salaryCurrency: $('#salary-currency'),
        salaryHours: $('#salary-hours'),
        salaryNotes: $('#salary-notes'),
        generateSalaryBtn: $('#generate-salary-btn'),
        salaryUtilizationChart: $('#salary-utilization-chart'),
        salaryUtilizationDetails: $('#salary-utilization-details'),
        salaryCompensation: $('#salary-compensation'),
        salaryRecommendations: $('#salary-recommendations'),
        salaryLaunchMeta: $('#salary-launch-meta'),
        salarySignals: $('#salary-signals'),
        salaryMarketWindow: $('#salary-market-window'),
        
        // Notifications
        notifications: $('#notifications'),
        
        // Product switcher
        productDropdownBtn: $('#product-dropdown-btn'),
        productDropdown: $('#product-dropdown')
    };

    // ===== Utility Functions =====
    function showNotification(message, type = 'info', duration = 5000) {
        if (!elements.notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icons[type] || icons.info}"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        `;

        elements.notifications.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        // Click to remove
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    function formatNumber(num) {
        return num.toLocaleString('uk-UA');
    }

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

    const INTEL_FIELD_KEYS = ['company_name', 'company_industry', 'company_location', 'company_focus', 'team_name', 'team_mission', 'team_tags'];
    const MAX_INTEL_FILES = 10;
    const MAX_INTEL_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

    function ensureIntelIntake() {
        if (!state.team.intake) {
            state.team.intake = {
                files: [],
                status: 'idle',
                lastRunAt: null,
                summary: '',
                highlights: []
            };
        }
        if (!Array.isArray(state.team.intake.files)) {
            state.team.intake.files = [];
        }
        return state.team.intake;
    }

    function ensureIntelProfile() {
        if (!state.team.profile) {
            state.team.profile = {};
        }
        INTEL_FIELD_KEYS.forEach((key) => {
            if (state.team.profile[key] == null) {
                state.team.profile[key] = '';
            }
        });
        return state.team.profile;
    }

    function syncIntelInputsFromState() {
        ensureIntelProfile();
        if (!elements.intelFieldInputs || !elements.intelFieldInputs.length) return;
        elements.intelFieldInputs.forEach((input) => {
            const field = input?.dataset?.intelField;
            if (!field) return;
            const current = state.team.profile[field] ?? '';
            if (input.value !== current) {
                input.value = current;
            }
        });
    }

    function updateIntelProfileField(field, value, sourceEl = null) {
        if (!field) return;
        ensureIntelProfile();
        state.team.profile[field] = value;
        if (!elements.intelFieldInputs || !elements.intelFieldInputs.length) return;
        elements.intelFieldInputs.forEach((input) => {
            if (input === sourceEl) return;
            if (input?.dataset?.intelField === field && input.value !== value) {
                input.value = value;
            }
        });
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex += 1;
        }
        return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[unitIndex]}`;
    }

    function renderIntelAssets() {
        ensureIntelIntake();
        const container = elements.intelAssetList;
        if (!container) return;

        const files = state.team.intake.files;
        if (!files.length) {
            container.innerHTML = `
                <li class="asset-empty">
                    <div class="asset-empty-inner">
                        <i class="fas fa-folder-open"></i>
                        <span>Додайте матеріали команди для AI-структурування</span>
                    </div>
                </li>
            `;
            return;
        }

        container.innerHTML = files.map((asset) => `
            <li class="asset-item">
                <div class="asset-meta">
                    <strong>${escapeHtml(asset.name)}</strong>
                    <span>${formatFileSize(asset.size)} • ${escapeHtml(asset.type || 'невідомий формат')}</span>
                </div>
                <button type="button" class="asset-remove" data-action="remove-asset" data-asset-id="${asset.id}">
                    <i class="fas fa-times"></i>
                </button>
            </li>
        `).join('');
    }

    function addIntelAssets(fileList) {
        ensureIntelIntake();
        const incoming = Array.from(fileList || []);
        if (!incoming.length) return;

        if (!state.team.intake.files) {
            state.team.intake.files = [];
        }

        const availableSlots = MAX_INTEL_FILES - state.team.intake.files.length;
        if (availableSlots <= 0) {
            showNotification('Максимум 10 файлів у черзі', 'warning');
            return;
        }

        const accepted = incoming.slice(0, availableSlots);
        let added = 0;

        accepted.forEach((file) => {
            if (file.size > MAX_INTEL_FILE_SIZE) {
                showNotification(`${file.name} перевищує 25MB`, 'warning');
                return;
            }

            const duplicate = state.team.intake.files.find((asset) => asset.name === file.name && asset.size === file.size);
            if (duplicate) {
                showNotification(`${file.name} вже додано`, 'info');
                return;
            }

            const asset = {
                id: `asset-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                file,
                name: file.name || 'Файл без назви',
                size: file.size,
                type: file.type || 'application/octet-stream',
                addedAt: new Date().toISOString()
            };
            state.team.intake.files.push(asset);
            added += 1;
        });

        if (added > 0) {
            renderIntelAssets();
            setIntelProcessingStatus('ready');
        }
    }

    function removeIntelAsset(assetId) {
        ensureIntelIntake();
        state.team.intake.files = state.team.intake.files.filter((asset) => asset.id !== assetId);
        renderIntelAssets();
        if (!state.team.intake.files.length) {
            setIntelProcessingStatus('idle');
        }
    }

    function clearIntelAssets() {
        ensureIntelIntake();
        state.team.intake.files = [];
        renderIntelAssets();
        setIntelProcessingStatus('idle');
    }

    function setIntelProcessingStatus(status, meta = {}) {
        ensureIntelIntake();
        state.team.intake.status = status;
        const indicator = elements.intelProcessingState;
        if (indicator) {
            const dot = indicator.querySelector('.dot');
            const label = indicator.querySelector('.status-label');
            if (dot) {
                dot.classList.remove('active', 'error');
                if (status === 'processing' || status === 'success') {
                    dot.classList.add('active');
                } else if (status === 'error') {
                    dot.classList.add('error');
                }
            }
            if (label) {
                const textMap = {
                    idle: 'Очікує дані',
                    ready: 'Готово до запуску',
                    processing: 'GPT структурує дані',
                    success: 'Результат оновлено',
                    error: 'Помилка обробки'
                };
                label.textContent = textMap[status] || 'Статус невідомий';
            }
        }

        const metaContainer = elements.intelProcessingMeta;
        const summary = meta.summary || state.team.intake.summary || '';
        const highlights = Array.isArray(meta.highlights) ? meta.highlights : (state.team.intake.highlights || []);

        if (summary) {
            state.team.intake.summary = summary;
        }
        if (highlights.length) {
            state.team.intake.highlights = highlights;
        }
        if (meta.processedAt) {
            state.team.intake.lastRunAt = meta.processedAt;
        }

        if (metaContainer) {
            if (!summary && !highlights.length && !meta.tokensUsed) {
                metaContainer.innerHTML = '';
            } else {
                metaContainer.innerHTML = `
                    ${summary ? `<p class="intel-meta-summary">${escapeHtml(summary)}</p>` : ''}
                    ${highlights.length ? `<ul class="intel-meta-highlights">${highlights.map((item) => `<li><i class="fas fa-sparkles"></i>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
                    ${meta.tokensUsed ? `<div class="intel-meta-inline"><i class="fas fa-bolt"></i> ${meta.tokensUsed} токенів</div>` : ''}
                    ${meta.responseTime ? `<div class="intel-meta-inline"><i class="fas fa-stopwatch"></i> ${Math.round(meta.responseTime)} мс</div>` : ''}
                `;
            }
        }
    }

    async function runIntelIngestion() {
        ensureIntelProfile();
        ensureIntelIntake();

        if (!state.currentClient) {
            showNotification('Оберіть клієнта перед обробкою команди', 'warning');
            return;
        }

        const files = state.team.intake.files || [];
        const hasProfileData = INTEL_FIELD_KEYS.some((key) => (state.team.profile[key] || '').trim().length > 0);
        if (!files.length && !hasProfileData) {
            showNotification('Заповніть профіль або додайте файли для обробки', 'warning');
            return;
        }

        if (elements.intelProcessAssets) {
            elements.intelProcessAssets.disabled = true;
            elements.intelProcessAssets.classList.add('btn-loading');
        }

        setIntelProcessingStatus('processing');

        try {
            const formData = new FormData();
            formData.append('client_id', state.currentClient.id);
            if (state.team.current?.id) {
                formData.append('team_id', state.team.current.id);
            }
            formData.append('profile', JSON.stringify(state.team.profile));

            files.forEach((asset) => {
                formData.append('assets', asset.file, asset.name);
            });

            const response = await fetch('/api/teams/intelligence/ingest', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Не вдалося обробити дані команди');
            }

            if (data.profile) {
                ensureIntelProfile();
                if (data.profile.company) {
                    state.team.profile.company_name = data.profile.company.name || state.team.profile.company_name;
                    state.team.profile.company_industry = data.profile.company.industry || state.team.profile.company_industry;
                    state.team.profile.company_location = data.profile.company.location || state.team.profile.company_location;
                    state.team.profile.company_focus = data.profile.company.focus || state.team.profile.company_focus;
                }
                if (data.profile.team) {
                    state.team.profile.team_name = data.profile.team.title || state.team.profile.team_name;
                    state.team.profile.team_mission = data.profile.team.mission || state.team.profile.team_mission;
                    if (Array.isArray(data.profile.team.tags)) {
                        state.team.profile.team_tags = data.profile.team.tags.join(', ');
                    }
                }
                syncIntelInputsFromState();
            }

            const metaPayload = {
                summary: data.insights?.summary || data.profile?.team?.mission || '',
                highlights: data.insights?.highlights || [],
                processedAt: data.meta?.processedAt || new Date().toISOString(),
                tokensUsed: data.meta?.tokensUsed,
                responseTime: data.meta?.responseTime
            };

            setIntelProcessingStatus('success', metaPayload);
            clearIntelAssets();

            if (data.team?.id) {
                state.team.pendingTeamId = data.team.id;
                await loadTeamsForClient(state.currentClient.id, { preserveSelection: true });
                await selectTeam(data.team.id, { silent: true });
            } else {
                if (Array.isArray(data.members) && data.members.length) {
                    state.team.members = data.members.map((member) => ({
                        ...member,
                        responsibilities: Array.isArray(member.responsibilities) ? member.responsibilities : (member.responsibilities ? [member.responsibilities] : [])
                    }));
                }
                renderIntelRoster();
            }

            showNotification('AI успішно структурував дані команди', 'success');
        } catch (error) {
            console.error('❌ runIntelIngestion error:', error);
            setIntelProcessingStatus('error', { summary: error.message });
            showNotification(error.message || 'Не вдалося обробити дані команди', 'error');
        } finally {
            if (elements.intelProcessAssets) {
                elements.intelProcessAssets.disabled = false;
                elements.intelProcessAssets.classList.remove('btn-loading');
            }
        }
    }

    function extractRosterStatusLabel(status) {
        if (!status) return null;
        const map = {
            overloaded: 'Перевантаження',
            balanced: 'Баланс',
            underutilized: 'Недовантаження'
        };
        return map[status.toLowerCase()] || status;
    }

    function renderIntelRoster() {
        const container = elements.intelRosterList;
        if (!container) return;

        const members = Array.isArray(state.team.members) ? state.team.members : [];
        const alignment = Array.isArray(state.team.latestRaci?.role_alignment) ? state.team.latestRaci.role_alignment : [];
        const alignmentMap = new Map();
        alignment.forEach((item) => {
            const nameKey = (item.name || '').toLowerCase();
            if (!alignmentMap.has(nameKey)) {
                alignmentMap.set(nameKey, item);
            }
        });

        const rosterItems = [];
        members.forEach((member) => {
            const name = member.name || member.full_name || member.role || 'Співробітник';
            const alignmentData = alignmentMap.get(name.toLowerCase()) || null;
            rosterItems.push({ member, alignment: alignmentData, source: 'team' });
            if (alignmentData) {
                alignmentMap.delete(name.toLowerCase());
            }
        });

        alignmentMap.forEach((alignmentData) => {
            rosterItems.push({ member: null, alignment: alignmentData, source: 'alignment' });
        });

        if (!rosterItems.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-user-astronaut"></i></div>
                    <p>Додайте учасників команди або запустіть AI-інтейк, щоб побачити карту ролей.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = rosterItems.map(({ member, alignment }) => {
            const name = member?.name || member?.full_name || alignment?.name || 'Співробітник';
            const role = member?.role || alignment?.role || 'Роль не визначена';
            const responsibilities = Array.isArray(member?.responsibilities) ? member.responsibilities : [];
            const summaryLines = responsibilities.length ? responsibilities.slice(0, 2) : (Array.isArray(alignment?.signals) ? alignment.signals.slice(0, 2) : []);
            const statusLabel = extractRosterStatusLabel(alignment?.status);
            const tags = [];
            if (statusLabel) {
                tags.push(`<span class="roster-tag status-${(alignment.status || '').toLowerCase()}">${escapeHtml(statusLabel)}</span>`);
            }
            if (member?.seniority) {
                tags.push(`<span class="roster-tag">${escapeHtml(member.seniority)}</span>`);
            }
            if (member?.location) {
                tags.push(`<span class="roster-tag">${escapeHtml(member.location)}</span>`);
            }

            return `
                <div class="roster-card" data-member-id="${member?.id ?? ''}" data-member-name="${escapeHtml(name)}">
                    <div class="roster-role">${escapeHtml(role)}</div>
                    <h4>${escapeHtml(name)}</h4>
                    ${summaryLines.length ? `<p>${escapeHtml(summaryLines.join('; '))}</p>` : ''}
                    ${tags.length ? `<div class="roster-tags">${tags.join('')}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    function openEmployeeIntel(memberId, fallbackName = '') {
        const modal = elements.employeeIntelModal;
        if (!modal) return;

        const members = Array.isArray(state.team.members) ? state.team.members : [];
        let member = null;
        if (memberId) {
            member = members.find((item) => String(item.id) === String(memberId)) || null;
        }

        const targetName = member?.name || member?.full_name || fallbackName;
        const alignment = Array.isArray(state.team.latestRaci?.role_alignment)
            ? state.team.latestRaci.role_alignment.find((item) => (item.name || '').toLowerCase() === (targetName || '').toLowerCase())
            : null;

        const name = targetName || alignment?.name || 'Співробітник';
        const role = member?.role || alignment?.role || 'Роль не визначена';
        const responsibilities = Array.isArray(member?.responsibilities) ? member.responsibilities : [];
        const summaryBlock = responsibilities.length
            ? `<ul>${responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
            : `<p class="intel-modal-empty">Додайте обов'язки для детального опису ролі.</p>`;

        if (elements.employeeIntelName) {
            elements.employeeIntelName.textContent = name;
        }
        if (elements.employeeIntelSummary) {
            elements.employeeIntelSummary.innerHTML = summaryBlock;
        }
        if (elements.employeeIntelSignals) {
            const signals = Array.isArray(alignment?.signals) ? alignment.signals : [];
            elements.employeeIntelSignals.innerHTML = signals.length
                ? signals.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
                : '<li class="intel-modal-empty">Сигнали будуть доступні після аналізу RACI</li>';
        }
        if (elements.employeeIntelActions) {
            const actions = Array.isArray(alignment?.suggested_actions) ? alignment.suggested_actions : (Array.isArray(alignment?.recommendations) ? alignment.recommendations : []);
            elements.employeeIntelActions.innerHTML = actions.length
                ? actions.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
                : '<li class="intel-modal-empty">AI ще не запропонував кроки для цієї ролі</li>';
        }
        if (elements.employeeIntelMeta) {
            const items = [];
            if (role) {
                items.push(`<span><i class="fas fa-briefcase"></i> ${escapeHtml(role)}</span>`);
            }
            if (member?.seniority) {
                items.push(`<span><i class="fas fa-layer-group"></i> ${escapeHtml(member.seniority)}</span>`);
            }
            if (alignment?.status) {
                items.push(`<span><i class="fas fa-balance-scale"></i> ${escapeHtml(extractRosterStatusLabel(alignment.status))}</span>`);
            }
            elements.employeeIntelMeta.innerHTML = items.length ? items.join('') : '';
        }

        modal.style.display = 'flex';
        modal.dataset.open = 'true';
    }

    function closeEmployeeIntel() {
        const modal = elements.employeeIntelModal;
        if (!modal) return;
        modal.style.display = 'none';
        delete modal.dataset.open;
    }

    // ===== Token Management =====
    let tokenUsageLoadInProgress = false;
    let lastTokenUsageLoad = 0;
    const TOKEN_USAGE_RATE_LIMIT = 60000; // 1 minute minimum between requests

    // Debounced version of loadTokenUsage to prevent rapid calls
    const debouncedLoadTokenUsage = debounce(loadTokenUsage, 2000);

    async function loadTokenUsage() {
        // Rate limiting: prevent requests more frequent than once per minute
        const now = Date.now();
        if (now - lastTokenUsageLoad < TOKEN_USAGE_RATE_LIMIT) {
            console.log('📊 Token usage request rate limited, using cached data');
            return;
        }

        // Prevent concurrent requests
        if (tokenUsageLoadInProgress) {
            console.log('📊 Token usage request already in progress');
            return;
        }

        tokenUsageLoadInProgress = true;
        lastTokenUsageLoad = now;

        try {
            // Add timestamp and cache busting for reliable daily updates
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const response = await fetch(`/api/usage?date=${today}&_=${Date.now()}`);
            
            if (response.status === 429) {
                console.warn('📊 Token usage API rate limited (429), using cached data');
                // Use cached data instead of failing
                const cached = localStorage.getItem('teampulse-token-usage');
                if (cached) {
                    try {
                        const cachedData = JSON.parse(cached);
                        state.tokenUsage = { ...state.tokenUsage, ...cachedData };
                        updateTokenDisplay();
                        console.log('📊 Using cached token data due to rate limit');
                    } catch (e) {
                        console.error('Error parsing cached token data:', e);
                    }
                } else {
                    console.warn('📊 No cached token data available');
                }
                // Schedule next attempt in 2 minutes
                lastTokenUsageLoad = now + 60000; // Add extra delay for rate limited requests
                return;
            }

            const data = await response.json();
            
            if (data.success) {
                const newUsage = {
                    used: data.used_tokens || 0,
                    total: data.total_tokens || 512000,
                    percentage: data.percentage || 0,
                    daily_used: data.daily_used || 0,
                    daily_limit: data.daily_limit || 50000,
                    daily_percentage: data.daily_percentage || 0,
                    last_updated: new Date().toISOString(),
                    date: today
                };
                
                // Store in state with validation
                state.tokenUsage = { ...state.tokenUsage, ...newUsage };
                
                // Cache in localStorage for offline resilience
                localStorage.setItem('teampulse-token-usage', JSON.stringify({
                    ...newUsage,
                    cached_at: Date.now()
                }));
                
                updateTokenDisplay();
                console.log('📊 Token usage updated:', newUsage);
            }
        } catch (error) {
            console.error('Error loading token usage:', error);
            
            // Fallback to cached data if available
            const cached = localStorage.getItem('teampulse-token-usage');
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    const cacheAge = Date.now() - cachedData.cached_at;
                    
                    // Use cached data if less than 1 hour old
                    if (cacheAge < 3600000) {
                        state.tokenUsage = { ...state.tokenUsage, ...cachedData };
                        updateTokenDisplay();
                        console.log('📊 Using cached token usage:', cachedData);
                    }
                } catch (e) {
                    console.error('Error parsing cached token usage:', e);
                }
            }
            
            // Show user-friendly error notification
            showNotification('Помилка завантаження даних про токени. Використовуємо кеш.', 'warning');
        } finally {
            tokenUsageLoadInProgress = false;
        }
    }

    function updateTokenDisplay() {
        const { used, total, percentage, dailyUsed, dailyLimit, dailyPercentage } = state.tokenUsage;
        
        // Calculate display values
        const displayUsed = dailyUsed || used;
        const displayTotal = dailyLimit || total;
        const displayPercentage = dailyPercentage || percentage;
        
        // Top nav token counter - show daily usage primarily
        if (elements.usedTokens) {
            elements.usedTokens.textContent = formatNumber(displayUsed);
            elements.usedTokens.title = `Сьогодні: ${formatNumber(dailyUsed || 0)}/${formatNumber(dailyLimit || 0)} | Всього: ${formatNumber(used)}/${formatNumber(total)}`;
        }
        if (elements.totalTokens) {
            elements.totalTokens.textContent = formatNumber(displayTotal);
        }
        if (elements.tokenProgressFill) {
            elements.tokenProgressFill.style.width = `${displayPercentage}%`;
            
            // Color coding based on daily usage
            if (displayPercentage > 90) {
                elements.tokenProgressFill.style.background = 'linear-gradient(90deg, var(--danger), var(--neon-pink))';
            } else if (displayPercentage > 70) {
                elements.tokenProgressFill.style.background = 'linear-gradient(90deg, var(--warning), var(--neon-yellow))';
            } else {
                elements.tokenProgressFill.style.background = 'var(--gradient-accent)';
            }
        }

        // Workspace token display - show daily usage
        if (elements.workspaceUsedTokens) {
            elements.workspaceUsedTokens.textContent = formatNumber(displayUsed);
            elements.workspaceUsedTokens.title = `Денне використання: ${formatNumber(dailyUsed || 0)}`;
        }
        if (elements.workspaceTotalTokens) {
            elements.workspaceTotalTokens.textContent = formatNumber(displayTotal);
            elements.workspaceTotalTokens.title = `Денний ліміт: ${formatNumber(dailyLimit || 0)}`;
        }
        if (elements.workspaceTokenPercentage) {
            elements.workspaceTokenPercentage.textContent = `${Math.round(displayPercentage)}%`;
            elements.workspaceTokenPercentage.title = `Сьогодні використано: ${Math.round(displayPercentage)}%`;
        }
        if (elements.workspaceTokenProgress) {
            elements.workspaceTokenProgress.style.width = `${displayPercentage}%`;
            if (displayPercentage > 90) {
                elements.workspaceTokenProgress.style.background = 'var(--danger)';
            } else if (percentage > 70) {
                elements.workspaceTokenProgress.style.background = 'var(--warning)';
            } else {
                elements.workspaceTokenProgress.style.background = 'var(--gradient-accent)';
            }
        }
    }

    // ===== Layout Management =====
    function toggleSidebar(side) {
        // Left sidebar is now always visible, only right sidebar can be toggled
        if (side === 'right') {
            const sidebar = elements.sidebarRight;
            state.ui.rightSidebarCollapsed = !state.ui.rightSidebarCollapsed;
            sidebar.classList.toggle('collapsed', state.ui.rightSidebarCollapsed);
            
            // Update main content margin
            if (window.innerWidth > 1024) {
                elements.mainContent.style.marginRight = state.ui.rightSidebarCollapsed ? '0' : 'var(--right-panel-width)';
            }
            
            // Update toggle icon
            const icon = elements.sidebarRightToggle?.querySelector('i');
            if (icon) {
                icon.className = state.ui.rightSidebarCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
            }
            
            // Save state
            localStorage.setItem('teampulse-ui-state', JSON.stringify(state.ui));
        }
    }

    function showSection(sectionId) {
        // Hide all sections
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard', 'team-hub', 'raci-dashboard', 'salary-dashboard'];
        sections.forEach(id => {
            const el = $(`#${id}`);
            if (el) el.style.display = 'none';
        });
        
        // Show target section
        const target = $(`#${sectionId}`);
        if (target) {
            target.style.display = 'block';
            state.ui.currentView = sectionId;
            if (PRODUCT_META[sectionId]) {
                updateProductSwitcher(sectionId);
            }
        }
    }

    function updateInputMethod(method) {
        // Update buttons
        elements.textMethod?.classList.toggle('active', method === 'text');
        elements.fileMethod?.classList.toggle('active', method === 'file');
        
        // Update content
        if (elements.textInputContent) {
            elements.textInputContent.style.display = method === 'text' ? 'block' : 'none';
        }
        if (elements.fileInputContent) {
            elements.fileInputContent.style.display = method === 'file' ? 'block' : 'none';
        }
        
        // Ensure textarea is interactive when text method is active
        if (method === 'text' && elements.negotiationText) {
            // Remove any potential disable states
            elements.negotiationText.disabled = false;
            elements.negotiationText.readOnly = false;
            
            // Ensure proper styles
            elements.negotiationText.style.pointerEvents = 'auto';
            elements.negotiationText.style.userSelect = 'text';
            
            // Force focus after a brief delay to ensure element is visible
            setTimeout(() => {
                if (elements.negotiationText && method === 'text') {
                    elements.negotiationText.focus();
                }
            }, 100);
        }
    }

    // ===== Onboarding System =====
    function initOnboarding() {
        const completed = localStorage.getItem('teampulse-onboarding-completed');
        if (completed === 'true') {
            state.onboardingCompleted = true;
            if (elements.onboardingModal) {
                elements.onboardingModal.style.display = 'none';
            }
            return;
        }

        // Show onboarding
        showOnboarding();
    }

    function showOnboarding() {
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'flex';
            updateOnboardingStep();
        }
    }

    function updateOnboardingStep() {
        const totalSteps = $$('.onboarding-step').length || 1;
        const progress = (state.onboardingStep / totalSteps) * 100;
        
        if (elements.onboardingProgress) {
            elements.onboardingProgress.style.width = `${progress}%`;
        }
        if (elements.progressText) {
            elements.progressText.textContent = `Крок ${state.onboardingStep} з ${totalSteps}`;
        }

        // Show/hide steps
        for (let i = 1; i <= totalSteps; i++) {
            const step = $(`#onboarding-step-${i}`);
            if (step) {
                step.classList.toggle('active', i === state.onboardingStep);
                step.style.display = i === state.onboardingStep ? 'block' : 'none';
            }
        }

        // Update navigation buttons
        if (elements.prevStep) {
            elements.prevStep.style.display = state.onboardingStep > 1 ? 'inline-flex' : 'none';
        }
        if (elements.nextStep) {
            if (state.onboardingStep < totalSteps) {
                elements.nextStep.innerHTML = 'Далі <i class="fas fa-arrow-right"></i>';
            } else {
                elements.nextStep.innerHTML = '<i class="fas fa-rocket"></i> Розпочати роботу';
            }
        }
    }

    function nextOnboardingStep() {
        const totalSteps = $$('.onboarding-step').length || 1;
        if (state.onboardingStep < totalSteps) {
            state.onboardingStep++;
            updateOnboardingStep();
            return;
        }
        completeOnboarding();
    }

    function prevOnboardingStep() {
        if (state.onboardingStep > 1) {
            state.onboardingStep--;
            updateOnboardingStep();
        }
    }

    function completeOnboarding() {
        state.onboardingCompleted = true;
        localStorage.setItem('teampulse-onboarding-completed', 'true');
        
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'none';
        }
        
        showNotification('Ласкаво просимо до TeamPulse Turbo! 🚀', 'success');
        
        // Load initial data
        loadClients();
        debouncedLoadTokenUsage();
    }

    // ===== Client Management =====
    async function loadClients(forceRefresh = false) {
        console.log('🔄 Loading clients...', { forceRefresh, currentCount: state.clients?.length || 0 });
        try {
            // Add cache busting if forcing refresh
            const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
            const response = await fetch(`/api/clients${cacheBuster}`);
            console.log('📡 Response status:', response.status);
            
            if (response.status === 401) {
                console.log('❌ Unauthorized, redirecting to login');
                window.location.href = '/login';
                return;
            }
            
            const data = await response.json();
            console.log('📦 Received data:', data);
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || `HTTP Error: ${response.status}`);
            }
            
            const previousCount = state.clients?.length || 0;
            const previousClientId = state.currentClient ? normalizeId(state.currentClient.id) : null;

            state.clients = (data.clients || []).map(normalizeClient);

            if (previousClientId !== null) {
                const matchedClient = state.clients.find(client => idsMatch(client.id, previousClientId));
                if (matchedClient) {
                    state.currentClient = matchedClient;
                    updateNavClientInfo(state.currentClient);
                    updateWorkspaceClientInfo(state.currentClient);
                }
            }
            console.log('✅ Set state.clients:', state.clients.length, 'clients', { previousCount, newCount: state.clients.length });

            // Force immediate UI update with animation
            setTimeout(() => {
                renderClientsList();
                updateClientCount();
            }, 100);
            
            // Validate and fix data integrity
            validateDataIntegrity();
            
            console.log('🎉 Clients loaded successfully');
            
        } catch (error) {
            console.error('Failed to load clients:', error);
            showNotification('Помилка завантаження клієнтів', 'error');
        }
    }

    async function validateDataIntegrity() {
        try {
            // Check if there's a current analysis without a current client
            if (state.currentAnalysis && !state.currentClient) {
                console.log('🔄 Clearing orphaned analysis data');
                state.currentAnalysis = null;
                state.originalText = '';
                state.selectedFragments = [];
                clearAnalysisDisplay();
            }
            
            // Check if current client still exists in clients array
            if (state.currentClient && !state.clients.some(c => idsMatch(c.id, state.currentClient.id))) {
                console.log('🔄 Current client no longer exists, clearing state');
                state.currentClient = null;
                state.currentAnalysis = null;
                state.originalText = '';
                state.selectedFragments = [];
                updateNavClientInfo(null);
                updateWorkspaceClientInfo(null);
                clearAnalysisDisplay();
                showNotification('Поточний клієнт більше не існує', 'warning');
            }
            
            // If we have clients but none is selected, but there's analysis data visible
            if (state.clients.length > 0 && !state.currentClient && elements.resultsSection?.style.display === 'block') {
                console.log('🔄 Clearing analysis display - no client selected');
                clearAnalysisDisplay();
            }
            
        } catch (error) {
            console.error('Error validating data integrity:', error);
        }
    }

    function renderClientsList() {
        console.log('🎨 renderClientsList called');
        console.log('🎨 state.clients.length:', state.clients.length);
        console.log('🎨 Current client:', state.currentClient ? state.currentClient.company : 'none');
        
        if (!elements.clientList) {
            console.warn('❌ Client list element not found');
            return;
        }

        const searchTerm = elements.clientSearch?.value.toLowerCase().trim() || '';
        console.log('🎨 Search term:', searchTerm);
        
        const filtered = state.clients.filter(client => {
            if (!searchTerm) return true;
            return (
                client.company?.toLowerCase().includes(searchTerm) ||
                client.sector?.toLowerCase().includes(searchTerm) ||
                client.negotiator?.toLowerCase().includes(searchTerm)
            );
        });
        
        console.log('🎨 Filtered clients count:', filtered.length);

        if (filtered.length === 0) {
            console.log('🎨 Showing empty state');
            const emptyMessage = searchTerm ? 'Нічого не знайдено' : 'Немає клієнтів';
            const emptyIcon = searchTerm ? 'fas fa-search' : 'fas fa-users';
            elements.clientList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="${emptyIcon}"></i>
                    </div>
                    <p>${emptyMessage}</p>
                    ${!searchTerm ? '<button class="btn-primary" id="empty-new-client-btn">Створити першого клієнта</button>' : ''}
                </div>
            `;
            
            // Add event listener for empty state button
            if (!searchTerm) {
                const emptyNewBtn = document.getElementById('empty-new-client-btn');
                if (emptyNewBtn) {
                    emptyNewBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎯 Empty state new client button clicked');
                        showClientForm();
                    });
                }
            }
            return;
        }

        // Sort clients by name
        filtered.sort((a, b) => (a.company || '').localeCompare(b.company || ''));

        console.log('🎨 Rendering', filtered.length, 'client items');

        // Render client items
        elements.clientList.innerHTML = filtered.map(client => {
            const isActive = state.currentClient && idsMatch(state.currentClient.id, client.id);
            const avatar = (client.company || 'C')[0].toUpperCase();
            const analysisCount = client.analyses_count || 0;
            const progressHtml = Array.isArray(client.progress) && client.progress.length
                ? `<div class="client-progress">${client.progress.map(step => `<span class="client-progress-dot ${step.completed ? 'completed' : ''}" title="${escapeHtml(step.title)}"></span>`).join('')}</div>`
                : '';
            
            console.log('🎨 Rendering client:', client.company, 'active:', isActive);
            
            return `
                <div class="client-item ${isActive ? 'active' : ''}" 
                     data-client-id="${client.id}">
                    <div class="client-avatar">${avatar}</div>
                    <div class="client-info">
                        <div class="client-name">${escapeHtml(client.company || 'Без назви')}</div>
                        <div class="client-meta">
                            ${client.sector ? escapeHtml(client.sector) + ' • ' : ''}
                            ${analysisCount} аналізів
                        </div>
                        ${progressHtml}
                    </div>
                    <div class="client-actions">
                        <button class="btn-icon history-client-btn" data-client-id="${client.id}" title="Історія аналізів">
                            <i class="fas fa-history"></i>
                        </button>
                        <button class="btn-icon edit-client-btn" data-client-id="${client.id}" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-client-btn" data-client-id="${client.id}" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners to all client items
        const clientItems = elements.clientList.querySelectorAll('.client-item');
        clientItems.forEach(item => {
            const clientId = parseInt(item.dataset.clientId);
            
            // Client selection - click on main area (not buttons)
            item.addEventListener('click', (e) => {
                // Only handle clicks that are not on buttons
                if (!e.target.closest('.client-actions')) {
                    console.log('🎯 Client item clicked:', clientId);
                    selectClient(clientId);
                }
            });
            
            // Edit button
            const editBtn = item.querySelector('.edit-client-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✏️ Edit button clicked for client:', clientId);
                    editClient(clientId, e);
                });
            }
            
            // History button
            const historyBtn = item.querySelector('.history-client-btn');
            if (historyBtn) {
                historyBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📊 History button clicked for client:', clientId);
                    const client = state.clients.find(c => idsMatch(c.id, clientId));
                    if (client) {
                        openAnalysisHistoryModal(client);
                    }
                });
            }
            
            // Delete button
            const deleteBtn = item.querySelector('.delete-client-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🗑️ Delete button clicked for client:', clientId);
                    deleteClient(clientId, e);
                });
            }
        });
        
        console.log('🎨 Client list rendered successfully with event listeners');
    }

    function updateClientCount() {
        const count = state.clients.length;
        if (elements.clientCount) {
            elements.clientCount.textContent = count;
        }
    }

    function getGuideSteps() {
        const steps = state.guide?.steps;
        return Array.isArray(steps) && steps.length ? steps : DEFAULT_CLIENT_GUIDE.steps;
    }

    function getGuideModules() {
        const modules = state.guide?.modules;
        return modules && Object.keys(modules).length ? modules : DEFAULT_CLIENT_GUIDE.modules;
    }

    function collectClientFormData() {
        const data = {};
        const raw = {};
        const inputs = $$('#client-form input, #client-form select, #client-form textarea');

        inputs.forEach((input) => {
            const fieldKey = getFieldKey(input);
            if (!fieldKey) return;

            const trimmedValue = typeof input.value === 'string' ? input.value.trim() : input.value;
            raw[fieldKey] = trimmedValue;

            if (trimmedValue === '' || trimmedValue === null || trimmedValue === undefined) {
                return;
            }

            if (input.type === 'number') {
                const numericValue = Number(trimmedValue);
                if (!Number.isNaN(numericValue)) {
                    data[fieldKey] = numericValue;
                }
            } else {
                data[fieldKey] = trimmedValue;
            }
        });

        return { data, raw };
    }

    function hasFormValue(field, formBundle) {
        const rawValue = formBundle?.raw?.[field];
        if (rawValue === null || rawValue === undefined) return false;
        if (typeof rawValue === 'number') return !Number.isNaN(rawValue);
        if (typeof rawValue === 'string') return rawValue.trim().length > 0;
        return Boolean(rawValue);
    }

    function getFieldLabel(field) {
        const selector = `label[for="${field.replace(/_/g, '-')}"]`;
        const labelEl = document.querySelector(selector);
        if (labelEl) {
            return labelEl.textContent.replace('*', '').trim();
        }
        return field;
    }

    function highlightClientFields(fields) {
        fields.forEach((field) => {
            const selectorId = `#${field.replace(/_/g, '-')}`;
            const selectorData = `[data-field="${field}"]`;
            const input = document.querySelector(selectorId) || document.querySelector(selectorData);
            if (input) {
                input.classList.add('input-error');
            }
        });
    }

    function validateClientStep(stepId, formBundle) {
        const steps = getGuideSteps();
        const step = steps.find((item) => item.id === stepId);
        if (!step) return [];

        const requiredFields = step.required && step.required.length ? step.required : (step.fields || []);
        if (!requiredFields.length) return [];

        return requiredFields.filter((field) => !hasFormValue(field, formBundle));
    }

    function updateClientWizardProgress() {
        if (!elements.clientStepper) return;
        const steps = getGuideSteps();
        const formBundle = collectClientFormData();
        const buttons = elements.clientStepper.querySelectorAll('[data-step-id]');

        steps.forEach((step, index) => {
            const requiredFields = step.required && step.required.length ? step.required : (step.fields || []);
            const completed = requiredFields.length ? requiredFields.every((field) => hasFormValue(field, formBundle)) : false;
            const button = buttons[index];
            if (button) {
                button.classList.toggle('completed', completed);
            }
        });
    }

    function setClientFormStep(stepId) {
        const steps = getGuideSteps();
        if (!steps.length) {
            state.ui.clientFormStep = 'basics';
            return;
        }

        const fallbackId = steps[0].id;
        const targetStepId = steps.some((step) => step.id === stepId) ? stepId : fallbackId;
        state.ui.clientFormStep = targetStepId;

        const stepIndex = steps.findIndex((step) => step.id === targetStepId);
        const totalSteps = steps.length;

        if (elements.clientStepper) {
            const buttons = elements.clientStepper.querySelectorAll('[data-step-id]');
            buttons.forEach((button) => {
                button.classList.toggle('active', button.dataset.stepId === targetStepId);
            });
        }

        const panels = $$('.client-step-panel');
        panels.forEach((panel) => {
            panel.classList.toggle('active', panel.dataset.step === targetStepId);
        });

        const stepMeta = steps[stepIndex] || steps[0];
        if (elements.clientStepTitle) {
            elements.clientStepTitle.textContent = `Крок ${stepIndex + 1}. ${stepMeta.title}`;
        }
        if (elements.clientStepDescription) {
            elements.clientStepDescription.textContent = stepMeta.description || '';
        }
        if (elements.clientStepCount) {
            elements.clientStepCount.textContent = `Крок ${stepIndex + 1} / ${totalSteps}`;
        }

        if (elements.clientPrevStep) {
            elements.clientPrevStep.style.display = stepIndex === 0 ? 'none' : 'inline-flex';
        }
        if (elements.clientNextStep) {
            elements.clientNextStep.style.display = stepIndex === totalSteps - 1 ? 'none' : 'inline-flex';
        }
        if (elements.saveClientBtn) {
            elements.saveClientBtn.style.display = stepIndex === totalSteps - 1 ? 'inline-flex' : 'none';
        }

        updateClientWizardProgress();
    }

    function goToNextClientStep() {
        const steps = getGuideSteps();
        if (!steps.length) return;

        const currentId = state.ui.clientFormStep || steps[0].id;
        const currentIndex = steps.findIndex((step) => step.id === currentId);
        if (currentIndex === -1 || currentIndex >= steps.length - 1) return;

        const formBundle = collectClientFormData();
        const missing = validateClientStep(currentId, formBundle);

        if (missing.length) {
            highlightClientFields(missing);
            const missingLabels = missing.map(getFieldLabel).join(', ');
            showNotification(`Заповніть обов’язкові поля: ${missingLabels}`, 'warning');
            return;
        }

        setClientFormStep(steps[currentIndex + 1].id);
    }

    function goToPrevClientStep() {
        const steps = getGuideSteps();
        if (!steps.length) return;

        const currentId = state.ui.clientFormStep || steps[0].id;
        const currentIndex = steps.findIndex((step) => step.id === currentId);
        if (currentIndex <= 0) return;

        setClientFormStep(steps[currentIndex - 1].id);
    }

    function handleClientStepClick(event) {
        const button = event.target.closest('[data-step-id]');
        if (!button) return;

        const targetStepId = button.dataset.stepId;
        const steps = getGuideSteps();
        const currentId = state.ui.clientFormStep || steps[0]?.id;
        const targetIndex = steps.findIndex((step) => step.id === targetStepId);
        const currentIndex = steps.findIndex((step) => step.id === currentId);

        if (targetIndex === -1 || targetStepId === currentId) return;

        if (targetIndex > currentIndex) {
            const formBundle = collectClientFormData();
            for (let i = 0; i <= targetIndex - 1; i++) {
                const missing = validateClientStep(steps[i].id, formBundle);
                if (missing.length) {
                    highlightClientFields(missing);
                    const missingLabels = missing.map(getFieldLabel).join(', ');
                    showNotification(`Заповніть обов’язкові поля: ${missingLabels}`, 'warning');
                    setClientFormStep(steps[i].id);
                    return;
                }
            }
        }

        setClientFormStep(targetStepId);
    }

    function renderClientStepper() {
        if (!elements.clientStepper) return;
        const steps = getGuideSteps();

        elements.clientStepper.innerHTML = steps.map((step, index) => `
            <button type="button" class="client-step" data-step-id="${step.id}">
                <span class="step-index">${index + 1}</span>
                <span class="step-title">${escapeHtml(step.title)}</span>
            </button>
        `).join('');

        setClientFormStep(state.ui.clientFormStep || (steps[0]?.id || 'basics'));
        renderClientOnboardingSteps();
    }

    async function loadClientWorkflowGuide() {
        try {
            const response = await fetch('/api/clients/workflow');
            const data = await response.json();

            if (response.ok && data.success) {
                state.guide.steps = Array.isArray(data.guide?.steps) ? data.guide.steps : [];
                state.guide.modules = data.guide?.modules || {};
            } else {
                state.guide.steps = [];
                state.guide.modules = {};
            }
        } catch (error) {
            console.warn('Не вдалося завантажити гайд клієнтського флоу:', error);
            state.guide.steps = [];
            state.guide.modules = {};
        } finally {
            renderClientStepper();
            updateClientWizardProgress();
            renderModuleGuide();
            renderClientOnboardingSteps();
        }
    }

    function renderClientOnboardingSteps() {
        const container = document.getElementById('client-onboarding-steps');
        if (!container) return;
        const steps = getGuideSteps();

        container.innerHTML = steps.map((step, index) => `
            <div class="step-row">
                <div class="step-index">${index + 1}</div>
                <div class="step-body">
                    <h4>${escapeHtml(step.title)}</h4>
                    <p>${escapeHtml(step.description || '')}</p>
                </div>
            </div>
        `).join('');
    }

    function renderModuleGuide() {
        const container = document.getElementById('module-guide');
        if (!container) return;
        const modules = getGuideModules();
        const entries = Object.entries(modules);

        if (!entries.length) {
            container.innerHTML = '<p class="module-placeholder">Докладні інструкції будуть доступні після синхронізації довідника.</p>';
            return;
        }

        container.innerHTML = entries.map(([, module]) => {
            const stepsList = Array.isArray(module.steps) && module.steps.length
                ? `<ul>${module.steps.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
                : '';
            return `
                <div class="module-card">
                    <h4>${escapeHtml(module.title || '')}</h4>
                    <p>${escapeHtml(module.goal || '')}</p>
                    ${stepsList}
                </div>
            `;
        }).join('');
    }

    function showClientForm(clientId = null) {
        const isEdit = clientId !== null;
        
        if (elements.clientFormTitle) {
            elements.clientFormTitle.textContent = isEdit ? 'Редагувати клієнта' : 'Новий клієнт';
        }
        
        if (isEdit) {
            const client = state.clients.find(c => idsMatch(c.id, clientId));
            if (client) {
                populateClientForm(client);
            }
        } else {
            clearClientForm();
        }

        const steps = getGuideSteps();
        const formBundle = collectClientFormData();
        const incomplete = steps.find((step) => {
            const required = step.required && step.required.length ? step.required : (step.fields || []);
            if (!required.length) return false;
            return required.some((field) => !hasFormValue(field, formBundle));
        });

        const targetStepId = incomplete ? incomplete.id : (steps[steps.length - 1]?.id || (steps[0]?.id ?? 'basics'));
        setClientFormStep(targetStepId);
        updateClientWizardProgress();
        
        showSection('client-form');
    }

    function clearClientForm() {
        const inputs = $$('#client-form input, #client-form select, #client-form textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
            input.classList.remove('input-error');
        });
        const steps = getGuideSteps();
        setClientFormStep(steps[0]?.id || 'basics');
        updateClientWizardProgress();
    }

    function populateClientForm(client) {
        if (!client) return;
        const inputs = $$('#client-form input, #client-form select, #client-form textarea');
        inputs.forEach(input => {
            const fieldKey = getFieldKey(input);
            if (!fieldKey) return;

            const value = client[fieldKey];
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = Boolean(value);
            } else if (value !== undefined && value !== null) {
                input.value = value;
            } else {
                input.value = '';
            }
            input.classList.remove('input-error');
        });
        updateClientWizardProgress();
    }

    async function selectClient(clientId) {
        console.log('🎯 selectClient called with ID:', clientId);
        console.log('🎯 Current state.clients:', state.clients.length, 'clients');

        const numericClientId = Number(clientId);
        if (Number.isNaN(numericClientId)) {
            console.error('❌ Invalid client id provided:', clientId);
            showNotification('Невірний ідентифікатор клієнта', 'error');
            return;
        }

        const client = state.clients.find(c => idsMatch(c.id, numericClientId));
        console.log('🎯 Found client:', client ? client.company : 'NOT FOUND');

        if (!client) {
            console.error('❌ Client not found with ID:', clientId);
            showNotification('Клієнт не знайдений', 'error');
            return;
        }
        
        console.log('🎯 Setting current client to:', client.company);
        state.currentClient = client;
        
        // Update UI
        console.log('🎯 Updating UI components...');
        updateNavClientInfo(client);
        updateWorkspaceClientInfo(client);
        renderClientsList(); // Re-render to show active state
        
        // Show analysis dashboard
        console.log('🎯 Showing analysis dashboard...');
        showSection('analysis-dashboard');
        
        showNotification(`Обрано клієнта: ${client.company}`, 'success');
        
        // Load analysis history for this client and try to load the latest analysis
        console.log('🎯 Loading analysis history...');
        await loadAnalysisHistoryAndLatest(client.id);
        await loadTeamsForClient(client.id);

        // Save state
        console.log('🎯 Saving state...');
        scheduleStateSave();
        console.log('🎯 selectClient completed successfully');
    }

    function updateNavClientInfo(client) {
        if (!client) {
            if (elements.navClientInfo) elements.navClientInfo.style.display = 'none';
            return;
        }

        const avatar = (client.company || 'C')[0].toUpperCase();
        
        if (elements.navClientAvatar) elements.navClientAvatar.textContent = avatar;
        if (elements.navClientName) elements.navClientName.textContent = client.company || 'Без назви';
        if (elements.navClientSector) elements.navClientSector.textContent = client.sector || '—';
        if (elements.navClientInfo) elements.navClientInfo.style.display = 'flex';
    }

    function updateWorkspaceClientInfo(client) {
        if (!elements.workspaceClientInfo) return;

        if (!client) {
            elements.workspaceClientInfo.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <p>Оберіть клієнта для роботи</p>
                </div>
            `;
            // Hide recommendations history
            if (elements.recommendationsHistorySection) {
                elements.recommendationsHistorySection.style.display = 'none';
            }
            return;
        }

        // Find the most current client data from state.clients to get updated analysis count
        const currentClientData = state.clients.find(c => c.id === client.id) || client;
        const avatar = (currentClientData.company || 'C')[0].toUpperCase();
        
        elements.workspaceClientInfo.innerHTML = `
            <div class="client-item active">
                <div class="client-avatar">${avatar}</div>
                <div class="client-info">
                    <div class="client-name">${escapeHtml(currentClientData.company || 'Без назви')}</div>
                    <div class="client-meta">
                        ${currentClientData.sector ? escapeHtml(currentClientData.sector) + ' • ' : ''}
                        ${currentClientData.analyses_count || 0} аналізів
                    </div>
                </div>
            </div>
        `;
        
        // Show and update recommendations history
        if (elements.recommendationsHistorySection) {
            elements.recommendationsHistorySection.style.display = 'block';
            updateRecommendationsHistory(client.id);
        }
    }
    
    function updateRecommendationsHistory(clientId) {
        if (!elements.recommendationsHistory) return;
        
        const recommendations = state.recommendationsHistory[clientId] || [];
        
        if (elements.recommendationsCount) {
            elements.recommendationsCount.textContent = recommendations.length;
        }
        
        // Show/hide clear button
        const clearBtn = document.getElementById('clear-recommendations-btn');
        if (clearBtn) {
            clearBtn.style.display = recommendations.length > 0 ? 'block' : 'none';
        }
        
        if (recommendations.length === 0) {
            elements.recommendationsHistory.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <p>Історія рекомендацій з'явиться тут після їх генерації</p>
                </div>
            `;
            return;
        }
        
        elements.recommendationsHistory.innerHTML = recommendations.map((rec, index) => {
            // Truncate long recommendations for preview
            const maxLength = 150;
            const shortContent = rec.advice.length > maxLength 
                ? rec.advice.substring(0, maxLength) + '...' 
                : rec.advice;
            
            return `
            <div class="recommendation-item" data-recommendation-id="${rec.id}">
                <div class="recommendation-header">
                    <div class="recommendation-date">
                        <i class="fas fa-clock"></i>
                        ${getTimeAgo(new Date(rec.created_at))}
                    </div>
                    <div class="recommendation-actions">
                        <button class="btn-micro recommendation-detail-btn" data-action="view-recommendation" data-recommendation-id="${index}" title="Переглянути деталі">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-micro recommendation-copy-btn" data-action="copy-recommendation" data-recommendation-id="${index}" title="Копіювати">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn-micro btn-danger recommendation-delete-btn" data-action="delete-recommendation" data-recommendation-id="${index}" title="Видалити рекомендацію">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="recommendation-content recommendation-content-clickable" data-action="expand-recommendation" data-recommendation-id="${index}" style="cursor: pointer;">
                    ${escapeHtml(shortContent)}
                </div>
                ${rec.fragments_count ? `
                    <div class="recommendation-meta">
                        <i class="fas fa-bookmark"></i>
                        Базується на ${rec.fragments_count} фрагментах
                    </div>
                ` : ''}
            </div>
        `;
        }).join('');
    }
    
    function saveRecommendation(clientId, advice, fragmentsCount = 0, adviceData = null, fragments = null) {
        if (!state.recommendationsHistory[clientId]) {
            state.recommendationsHistory[clientId] = [];
        }
        
        const recommendation = {
            id: Date.now(),
            advice,
            advice_data: adviceData, // Store structured data from API
            fragments: fragments || state.selectedFragments.slice(), // Store selected fragments
            fragments_count: fragmentsCount,
            created_at: new Date().toISOString(),
            comment: '' // User comment field
        };
        
        state.recommendationsHistory[clientId].unshift(recommendation);
        
        // Keep only last 20 recommendations per client
        if (state.recommendationsHistory[clientId].length > 20) {
            state.recommendationsHistory[clientId] = state.recommendationsHistory[clientId].slice(0, 20);
        }
        
        updateRecommendationsHistory(clientId);
        scheduleStateSave();
    }
    
    function removeRecommendation(clientId, index) {
        if (state.recommendationsHistory[clientId] && state.recommendationsHistory[clientId][index]) {
            state.recommendationsHistory[clientId].splice(index, 1);
            updateRecommendationsHistory(clientId);
            scheduleStateSave();
            showNotification('Рекомендацію видалено', 'info');
        }
    }
    
    function expandRecommendation(clientId, index) {
        const recommendations = state.recommendationsHistory[clientId];
        if (!recommendations || !recommendations[index]) return;
        
        const rec = recommendations[index];
        
        // Create modal for full recommendation view
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.innerHTML = `
            <div class="advice-content" style="max-width: 700px;">
                <div class="advice-header">
                    <h3>
                        <i class="fas fa-lightbulb"></i> 
                        Персональна рекомендація
                    </h3>
                    <div class="advice-meta">
                        <span><i class="fas fa-clock"></i> ${getTimeAgo(new Date(rec.created_at))}</span>
                        ${rec.fragments_count ? `<span><i class="fas fa-bookmark"></i> ${rec.fragments_count} фрагментів</span>` : ''}
                    </div>
                    <button class="btn-icon close-advice" data-action="close-expanded-recommendation">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body" style="max-height: 500px; overflow-y: auto;">
                    <div class="recommendation-full-content">
                        ${escapeHtml(rec.advice).replace(/\\n/g, '<br>')}
                    </div>
                </div>
                <div class="advice-footer">
                    <button class="btn-secondary" data-action="copy-recommendation" data-recommendation-id="${index}">
                        <i class="fas fa-copy"></i> Копіювати
                    </button>
                    <button class="btn-danger" data-action="delete-recommendation" data-recommendation-id="${index}">
                        <i class="fas fa-trash"></i> Видалити
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    function copyRecommendation(clientId, index) {
        const recommendations = state.recommendationsHistory[clientId];
        if (!recommendations || !recommendations[index]) return;
        
        const rec = recommendations[index];
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(rec.advice).then(() => {
                showNotification('Рекомендацію скопійовано до буферу обміну', 'success');
            }).catch(() => {
                // Fallback
                copyToClipboardFallback(rec.advice);
            });
        } else {
            copyToClipboardFallback(rec.advice);
        }
    }
    
    function copyToClipboardFallback(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('Рекомендацію скопійовано до буферу обміну', 'success');
        } catch (err) {
            showNotification('Помилка копіювання до буферу обміну', 'error');
        }
        
        document.body.removeChild(textArea);
    }
    
    function clearRecommendationsHistory() {
        if (!state.currentClient) return;
        
        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId];
        
        if (!recommendations || recommendations.length === 0) {
            showNotification('Історія рекомендацій вже порожня', 'info');
            return;
        }
        
        // Create confirmation modal
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.innerHTML = `
            <div class="advice-content" style="max-width: 450px;">
                <div class="advice-header">
                    <h3>
                        <i class="fas fa-exclamation-triangle" style="color: var(--neon-pink);"></i> 
                        Підтвердження
                    </h3>
                    <button class="btn-icon close-advice" data-action="close-expanded-recommendation">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body">
                    <p><strong>Ви дійсно хочете видалити всю історію рекомендацій для цього клієнта?</strong></p>
                    <p>Буде видалено <strong>${recommendations.length}</strong> рекомендацій. Цю дію неможливо скасувати.</p>
                </div>
                <div class="advice-footer">
                    <button class="btn-secondary" data-action="close-expanded-recommendation">
                        <i class="fas fa-times"></i> Скасувати
                    </button>
                    <button class="btn-danger" data-action="clear-all-recommendations">
                        <i class="fas fa-trash"></i> Видалити все
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    function confirmClearRecommendations(clientId) {
        if (state.recommendationsHistory[clientId]) {
            const count = state.recommendationsHistory[clientId].length;
            state.recommendationsHistory[clientId] = [];
            updateRecommendationsHistory(clientId);
            scheduleStateSave();
            showNotification(`Видалено ${count} рекомендацій з історії`, 'success');
        }
    }

    // ===== Enhanced Recommendations Management =====

    function openRecommendationsModal() {
        if (!state.currentClient) {
            showNotification('Спочатку оберіть клієнта', 'warning');
            return;
        }

        const modal = $('#recommendations-modal');
        const clientName = $('#modal-recommendations-client-name');
        
        if (clientName) {
            clientName.textContent = state.currentClient.company || 'Невідомий клієнт';
        }

        updateRecommendationsModal();
        modal.style.display = 'block';
        
        // Focus search input
        const searchInput = $('#recommendations-search');
        if (searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    function closeRecommendationsModal() {
        const modal = $('#recommendations-modal');
        modal.style.display = 'none';
    }

    function updateRecommendationsModal() {
        if (!state.currentClient) return;

        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId] || [];
        
        // Update stats
        const totalCount = $('#modal-total-recommendations');
        const latestDate = $('#modal-latest-recommendation');
        const avgReplies = $('#modal-avg-replies');

        if (totalCount) totalCount.textContent = recommendations.length;
        
        if (latestDate) {
            if (recommendations.length > 0) {
                const latest = new Date(recommendations[0].created_at);
                latestDate.textContent = getTimeAgo(latest);
            } else {
                latestDate.textContent = '—';
            }
        }

        if (avgReplies) {
            if (recommendations.length > 0) {
                const totalReplies = recommendations.reduce((sum, rec) => {
                    return sum + (rec.advice_data?.recommended_replies?.length || 0);
                }, 0);
                const avg = Math.round(totalReplies / recommendations.length * 10) / 10;
                avgReplies.textContent = avg || '—';
            } else {
                avgReplies.textContent = '—';
            }
        }

        // Update table
        updateRecommendationsTable(recommendations);
    }

    function updateRecommendationsTable(recommendations) {
        const tableBody = $('#recommendations-table-body');
        const emptyState = $('#recommendations-empty-state');
        const table = $('#recommendations-table');

        if (!tableBody) return;

        if (recommendations.length === 0) {
            table.style.display = 'none';
            emptyState.classList.add('show');
            return;
        }

        table.style.display = 'table';
        emptyState.classList.remove('show');

        const searchTerm = $('#recommendations-search')?.value.toLowerCase() || '';
        const filteredRecommendations = recommendations.filter(rec => {
            const searchableText = `
                ${rec.advice_data?.recommended_replies?.join(' ') || ''}
                ${rec.advice_data?.risks?.join(' ') || ''}
                ${rec.advice_data?.notes || ''}
                ${rec.comment || ''}
            `.toLowerCase();
            return searchableText.includes(searchTerm);
        });

        tableBody.innerHTML = filteredRecommendations.map((rec, index) => {
            const originalIndex = recommendations.indexOf(rec);
            const date = new Date(rec.created_at);
            const fragmentsText = rec.fragments?.map(f => f.text).join(', ') || '';
            const repliesText = rec.advice_data?.recommended_replies?.join('; ') || '';
            const risksText = rec.advice_data?.risks?.join('; ') || '';
            const repliesCount = rec.advice_data?.recommended_replies?.length || 0;
            
            return `
                <tr class="recommendation-row recommendation-row-clickable" data-index="${originalIndex}">
                    <td>
                        <div class="recommendation-date">
                            ${date.toLocaleDateString('uk-UA')}
                            <br>
                            <small>${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</small>
                        </div>
                    </td>
                    <td>
                        <div class="recommendation-fragments" title="${escapeHtml(fragmentsText)}">
                            ${escapeHtml(fragmentsText.substring(0, 100))}${fragmentsText.length > 100 ? '...' : ''}
                        </div>
                    </td>
                    <td>
                        <div class="recommendation-replies" title="${escapeHtml(repliesText)}">
                            ${escapeHtml(repliesText.substring(0, 150))}${repliesText.length > 150 ? '...' : ''}
                            <span class="recommendation-replies-count">(${repliesCount})</span>
                        </div>
                    </td>
                    <td>
                        <div class="recommendation-risks" title="${escapeHtml(risksText)}">
                            ${escapeHtml(risksText.substring(0, 100))}${risksText.length > 100 ? '...' : ''}
                        </div>
                    </td>
                    <td>
                        <div class="recommendation-comment ${rec.comment ? '' : 'empty'}">
                            ${rec.comment ? escapeHtml(rec.comment.substring(0, 50)) + (rec.comment.length > 50 ? '...' : '') : 'Немає коментаря'}
                        </div>
                    </td>
                    <td>
                        <div class="recommendation-actions">
                            <button class="btn-micro recommendation-detail-btn" data-action="view-recommendation" data-recommendation-id="${originalIndex}" title="Деталі">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-micro recommendation-copy-btn" data-action="copy-recommendation" data-recommendation-id="${originalIndex}" title="Копіювати">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn-micro btn-danger recommendation-delete-btn" data-action="delete-recommendation" data-recommendation-id="${originalIndex}" title="Видалити">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openRecommendationDetails(index) {
        if (!state.currentClient) return;

        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId] || [];
        const rec = recommendations[index];
        
        if (!rec) return;

        const modal = $('#recommendation-details-modal');
        const content = $('#recommendation-details-content');
        
        if (!content) return;

        const date = new Date(rec.created_at);
        const fragments = rec.fragments || [];
        const replies = rec.advice_data?.recommended_replies || [];
        const risks = rec.advice_data?.risks || [];
        const notes = rec.advice_data?.notes || '';

        content.innerHTML = `
            <div class="recommendation-meta-info">
                <div class="recommendation-meta-item">
                    <div class="recommendation-meta-label">Дата створення</div>
                    <div class="recommendation-meta-value">${date.toLocaleString('uk-UA')}</div>
                </div>
                <div class="recommendation-meta-item">
                    <div class="recommendation-meta-label">Фрагментів</div>
                    <div class="recommendation-meta-value">${fragments.length}</div>
                </div>
                <div class="recommendation-meta-item">
                    <div class="recommendation-meta-label">Відповідей</div>
                    <div class="recommendation-meta-value">${replies.length}</div>
                </div>
                <div class="recommendation-meta-item">
                    <div class="recommendation-meta-label">Ризиків</div>
                    <div class="recommendation-meta-value">${risks.length}</div>
                </div>
            </div>

            ${fragments.length > 0 ? `
                <div class="recommendation-detail-section">
                    <h3><i class="fas fa-bookmark"></i> Проаналізовані фрагменти</h3>
                    <div class="recommendation-fragments-detail">
                        ${fragments.map(fragment => `
                            <div class="recommendation-fragment-item">
                                <div class="recommendation-fragment-meta">
                                    ${fragment.category || 'Neutral'} • ${fragment.label || 'Без мітки'}
                                </div>
                                <div>${escapeHtml(fragment.text || '')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${replies.length > 0 ? `
                <div class="recommendation-detail-section">
                    <h3><i class="fas fa-comments"></i> Рекомендовані відповіді</h3>
                    <div class="recommendation-replies-detail">
                        ${replies.map((reply, i) => `
                            <div class="recommendation-reply-item">
                                <strong>Варіант ${i + 1}:</strong> ${escapeHtml(reply)}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${risks.length > 0 ? `
                <div class="recommendation-detail-section">
                    <h3><i class="fas fa-exclamation-triangle"></i> Виявлені ризики</h3>
                    <div class="recommendation-risks-detail">
                        ${risks.map(risk => `
                            <div class="recommendation-risk-item">
                                <i class="fas fa-warning"></i>
                                <span>${escapeHtml(risk)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${notes ? `
                <div class="recommendation-detail-section">
                    <h3><i class="fas fa-sticky-note"></i> Додаткові нотатки</h3>
                    <div>${escapeHtml(notes).replace(/\n/g, '<br>')}</div>
                </div>
            ` : ''}

            <div class="recommendation-comment-section">
                <h3><i class="fas fa-comment"></i> Особистий коментар</h3>
                <textarea id="recommendation-comment-input" placeholder="Додайте свій коментар до цієї рекомендації...">${escapeHtml(rec.comment || '')}</textarea>
            </div>
        `;

        // Store current recommendation index for saving
        modal.dataset.recommendationIndex = index;
        modal.style.display = 'block';
    }

    function closeRecommendationDetails() {
        const modal = $('#recommendation-details-modal');
        modal.style.display = 'none';
    }

    function saveRecommendationComment() {
        if (!state.currentClient) return;

        const modal = $('#recommendation-details-modal');
        const index = parseInt(modal.dataset.recommendationIndex);
        const commentInput = $('#recommendation-comment-input');
        
        if (!commentInput || isNaN(index)) return;

        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId];
        
        if (!recommendations || !recommendations[index]) return;

        const newComment = commentInput.value.trim();
        recommendations[index].comment = newComment;
        
        scheduleStateSave();
        updateRecommendationsModal();
        updateRecommendationsHistory(clientId);
        
        showNotification('Коментар збережено', 'success');
        closeRecommendationDetails();
    }

    function confirmDeleteRecommendation(index) {
        if (!state.currentClient) return;

        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId];
        
        if (!recommendations || !recommendations[index]) return;

        const rec = recommendations[index];
        const date = new Date(rec.created_at).toLocaleDateString('uk-UA');
        
        showCustomConfirmation(
            'Видалення рекомендації',
            `Ви дійсно хочете видалити рекомендацію від ${date}? Цю дію неможливо скасувати.`,
            () => {
                recommendations.splice(index, 1);
                updateRecommendationsHistory(clientId);
                updateRecommendationsModal();
                scheduleStateSave();
                showNotification('Рекомендацію видалено', 'success');
            }
        );
    }

    function confirmClearAllRecommendations() {
        if (!state.currentClient) return;

        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId] || [];
        
        if (recommendations.length === 0) {
            showNotification('Історія рекомендацій вже порожня', 'info');
            return;
        }

        showCustomConfirmation(
            'Очищення історії рекомендацій',
            `Ви дійсно хочете видалити всі ${recommendations.length} рекомендацій для цього клієнта? Цю дію неможливо скасувати.`,
            () => {
                const count = recommendations.length;
                state.recommendationsHistory[clientId] = [];
                updateRecommendationsHistory(clientId);
                updateRecommendationsModal();
                scheduleStateSave();
                showNotification(`Видалено ${count} рекомендацій`, 'success');
                closeRecommendationsModal();
            }
        );
    }

    function exportRecommendations() {
        if (!state.currentClient) return;

        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId] || [];
        
        if (recommendations.length === 0) {
            showNotification('Немає рекомендацій для експорту', 'warning');
            return;
        }

        const exportData = {
            client: state.currentClient.company || 'Невідомий клієнт',
            exported_at: new Date().toISOString(),
            total_recommendations: recommendations.length,
            recommendations: recommendations.map(rec => ({
                created_at: rec.created_at,
                fragments_count: rec.fragments?.length || 0,
                fragments: rec.fragments || [],
                recommended_replies: rec.advice_data?.recommended_replies || [],
                risks: rec.advice_data?.risks || [],
                notes: rec.advice_data?.notes || '',
                comment: rec.comment || ''
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `recommendations_${state.currentClient.company || 'client'}_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        showNotification('Рекомендації експортовано', 'success');
    }

    function copyRecommendationToClipboard(index) {
        if (!state.currentClient) return;

        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId] || [];
        const rec = recommendations[index];
        
        if (!rec) return;

        const date = new Date(rec.created_at);
        const replies = rec.advice_data?.recommended_replies || [];
        const risks = rec.advice_data?.risks || [];
        const notes = rec.advice_data?.notes || '';
        
        const copyText = `Рекомендації TeamPulse (${date.toLocaleString('uk-UA')})

РЕКОМЕНДОВАНІ ВІДПОВІДІ:
${replies.map((reply, i) => `${i + 1}. ${reply}`).join('\n')}

РИЗИКИ:
${risks.map((risk, i) => `• ${risk}`).join('\n')}

ДОДАТКОВІ ПОРАДИ:
${notes}

${rec.comment ? `КОМЕНТАР: ${rec.comment}` : ''}`;

        navigator.clipboard.writeText(copyText).then(() => {
            showNotification('Рекомендацію скопійовано в буфер обміну', 'success');
        }).catch(() => {
            showNotification('Не вдалося скопіювати в буфер обміну', 'error');
        });
    }

    // ===== Custom Confirmation Modal =====

    function showCustomConfirmation(title, message, onConfirm, onCancel = null) {
        const modal = $('#confirmation-modal');
        const titleElement = $('#confirmation-title');
        const messageElement = $('#confirmation-message');
        const confirmBtn = $('#confirmation-confirm-btn');
        const cancelBtn = $('#confirmation-cancel-btn');

        if (!modal || !titleElement || !messageElement || !confirmBtn || !cancelBtn) return;

        titleElement.textContent = title;
        messageElement.textContent = message;

        // Remove previous event listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        // Add new event listeners
        newConfirmBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (onConfirm) onConfirm();
        });

        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            if (onCancel) onCancel();
        });

        modal.style.display = 'block';
    }

    function closeConfirmationModal() {
        const modal = $('#confirmation-modal');
        modal.style.display = 'none';
    }

    async function saveClient() {
        try {
            const formBundle = collectClientFormData();
            const steps = getGuideSteps();

            if (!hasFormValue('company', formBundle)) {
                highlightClientFields(['company']);
                setClientFormStep('basics');
                showNotification('Назва компанії є обов\'язковою', 'warning');
                return;
            }

            for (const step of steps) {
                const missing = validateClientStep(step.id, formBundle);
                if (missing.length) {
                    highlightClientFields(missing);
                    setClientFormStep(step.id);
                    const missingLabels = missing.map(getFieldLabel).join(', ');
                    showNotification(`Заповніть обов’язкові поля: ${missingLabels}`, 'warning');
                    return;
                }
            }

            // Add loading state
            if (elements.saveClientBtn) {
                elements.saveClientBtn.classList.add('btn-loading');
                elements.saveClientBtn.disabled = true;
            }

            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formBundle.data)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка збереження');
            }

            showNotification('Клієнта збережено успішно! 🎉', 'success');
            
            // Set the new client as current and show analysis dashboard
            state.currentClient = normalizeClient(data.client);
            
            // Force refresh the clients list to ensure it appears
            await loadClients(true); // Force refresh with cache busting
            
            // Make sure the client appears in UI with delay for better UX
            setTimeout(() => {
                renderClientsList();
                updateClientCount();
            }, 200);
            updateNavClientInfo(state.currentClient);
            updateWorkspaceClientInfo(state.currentClient);
            
            // Show analysis dashboard
            showSection('analysis-dashboard');
            
            // Save state
            scheduleStateSave();

        } catch (error) {
            console.error('Save client error:', error);
            showNotification(error.message || 'Помилка при збереженні клієнта', 'error');
        } finally {
            // Remove loading state
            if (elements.saveClientBtn) {
                elements.saveClientBtn.classList.remove('btn-loading');
                elements.saveClientBtn.disabled = false;
            }
        }
    }

    // ===== Text Analysis =====
    function updateTextStats() {
        const text = elements.negotiationText?.value || '';
        const chars = text.length;
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const tokens = estimateTokens(text);
        
        if (elements.charCount) elements.charCount.textContent = `${formatNumber(chars)} символів`;
        if (elements.wordCount) elements.wordCount.textContent = `${formatNumber(words)} слів`;
        if (elements.estimatedTokens) elements.estimatedTokens.textContent = `≈ ${formatNumber(tokens)} токенів`;
        
        // Enable/disable analysis button
        const hasText = chars > 0;
        const hasClient = state.currentClient !== null;
        
        if (elements.startAnalysisBtn) {
            elements.startAnalysisBtn.disabled = !hasText || !hasClient;
            
            if (!hasClient) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Спочатку оберіть клієнта</span>';
            } else if (!hasText) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-edit"></i> <span>Введіть текст для аналізу</span>';
            } else {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-brain"></i> <span>Розпочати аналіз</span>';
            }
        }
    }

    // Debounced version for performance
    const debouncedUpdateTextStats = debounce(updateTextStats, 300);

    function buildAnalysisProfile() {
        const client = state.currentClient || {};
        const team = state.team.current;
        const members = (state.team.members || []).map(member => ({
            id: member.id,
            name: member.name || member.full_name || '',
            role: member.role || '',
            seniority: member.seniority || '',
            location: member.location || '',
            responsibilities: Array.isArray(member.responsibilities)
                ? member.responsibilities
                : (member.responsibilities || '').split('\n').filter(Boolean),
            workload_percent: member.workload_percent ?? null,
            compensation: member.compensation || null,
            raci_actual: member.metadata?.raci_actual || member.raci_actual || null,
            raci_ideal: member.metadata?.raci_ideal || member.raci_ideal || null,
            tags: member.metadata?.tags || member.tags || []
        }));

        return {
            company: client.company || '',
            negotiator: client.negotiator || '',
            sector: client.sector || '',
            goal: client.goal || '',
            decision_criteria: client.decision_criteria || '',
            constraints: client.constraints || '',
            user_goals: client.user_goals || '',
            client_goals: client.client_goals || '',
            weekly_hours: client.weekly_hours || 0,
            offered_services: client.offered_services || '',
            deadlines: client.deadlines || '',
            notes: client.notes || '',
            focus_people: [...state.analysis.focusPeople],
            exclude_people: [...state.analysis.excludePeople],
            analysis_question: state.analysis.question || '',
            highlight_multiplier: state.analysis.highlightMultiplier || 1,
            team_members: members,
            raci_expectations: team?.raw_payload?.raci_expectations || team?.raci_expectations || [],
            team_id: team?.id || null,
            team_title: team?.title || '',
            team_description: team?.description || ''
        };
    }

    function renderFocusChips() {
        const container = elements.focusPeopleChips;
        if (!container) return;

        const members = state.team.members || [];
        container.innerHTML = '';

        if (!members.length) {
            container.classList.add('empty');
            container.innerHTML = '<span class="chip-placeholder">Додайте учасників команди</span>';
            return;
        }

        container.classList.remove('empty');

        const allChip = document.createElement('button');
        allChip.type = 'button';
        allChip.className = 'chip chip-control';
        allChip.dataset.action = 'focus-all';
        allChip.innerHTML = '<i class="fas fa-check-double"></i> Всі';
        container.appendChild(allChip);

        const clearChip = document.createElement('button');
        clearChip.type = 'button';
        clearChip.className = 'chip chip-control';
        clearChip.dataset.action = 'focus-clear';
        clearChip.innerHTML = '<i class="fas fa-minus-circle"></i> Очистити';
        container.appendChild(clearChip);

        members.forEach(member => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'chip';
            chip.dataset.name = member.name || member.full_name;
            chip.textContent = member.name || member.full_name || 'Невідомий';
            if (state.analysis.focusPeople.includes(chip.dataset.name)) {
                chip.classList.add('active');
            }
            container.appendChild(chip);
        });
    }

    function toggleFocusPerson(name) {
        if (!name) return;
        const index = state.analysis.focusPeople.indexOf(name);
        if (index === -1) {
            state.analysis.focusPeople.push(name);
        } else {
            state.analysis.focusPeople.splice(index, 1);
        }
        renderFocusChips();
    }

    function setAllFocusPeople() {
        state.analysis.focusPeople = (state.team.members || []).map(member => member.name || member.full_name).filter(Boolean);
        renderFocusChips();
    }

    function clearFocusSelection() {
        state.analysis.focusPeople = [];
        renderFocusChips();
    }

    async function startAnalysis() {
        if (!state.currentClient) {
            showNotification('Спочатку оберіть клієнта', 'warning');
            return;
        }

        const text = elements.negotiationText?.value?.trim();
        if (!text) {
            showNotification('Введіть текст для аналізу', 'warning');
            return;
        }

        // Store original text for highlighting
        state.originalText = text;
        state.analysis.persona = null;
        state.analysis.biasClusters = [];
        state.analysis.negotiationMap = null;
        state.analysis.personAdvice = {};
        state.analysis.adequacy = { score: 0, label: '—', comment: '' };

        try {
            // Show analysis has started with clear visual feedback
            showNotification('🚀 Аналіз розпочато! Слідкуйте за прогресом...', 'info', 3000);
            
            // Show results section and update steps
            if (elements.resultsSection) {
                elements.resultsSection.style.display = 'block';
                
                // Progressive auto-scroll: Stage 1 - Scroll to counters
                setTimeout(() => {
                    const statsGrid = document.querySelector('.stats-grid');
                    if (statsGrid) {
                        statsGrid.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center',
                            inline: 'nearest'
                        });
                        showNotification('📊 Підраховуємо проблеми...', 'info', 2000);
                    }
                }, 1000);
            }
            
            updateAnalysisSteps('analysis');
            
            // Add loading state with more descriptive text
            if (elements.startAnalysisBtn) {
                elements.startAnalysisBtn.classList.add('btn-loading');
                elements.startAnalysisBtn.disabled = true;
                elements.startAnalysisBtn.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Аналізую текст...</span>
                `;
            }
            
            // Show progress in step 2
            if (elements.stepAnalysis) {
                const stepContent = elements.stepAnalysis.querySelector('.step-content p');
                if (stepContent) {
                    let dots = 0;
                    const progressInterval = setInterval(() => {
                        dots = (dots + 1) % 4;
                        stepContent.textContent = `Аналіз в процесі${'.'.repeat(dots)}`;
                    }, 500);
                    
                    // Store interval to clear it later
                    state.progressInterval = progressInterval;
                }
            }

            // Prepare form data for streaming analysis
            const formData = new FormData();
            formData.append('text', text);
            formData.append('client_id', state.currentClient.id);
            formData.append('profile', JSON.stringify(buildAnalysisProfile()));
            if (state.team.current?.id) {
                formData.append('team_id', state.team.current.id);
            }

            // Start streaming analysis
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Помилка аналізу');
            }

            // Process streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let analysisData = {
                highlights: [],
                summary: {},
                barometer: {},
                persona: null,
                biasClusters: [],
                negotiationMap: null
            };

            state.analysis.personAdvice = {};
            renderPersonaInsights(null);
            renderBiasClusters([]);
            renderNegotiationMap(null);

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'highlight') {
                                analysisData.highlights.push(data);
                                updateHighlightsDisplay(analysisData.highlights);
                                updateCountersFromHighlights(analysisData.highlights);
                            } else if (data.type === 'merged_highlights') {
                                analysisData.highlights = data.items;
                                updateHighlightsDisplay(analysisData.highlights);
                                updateCountersFromHighlights(analysisData.highlights);
                                
                                // Progressive auto-scroll: Stage 2 - Scroll to problems
                                setTimeout(() => {
                                    const highlightsSection = document.querySelector('.highlights-section');
                                    if (highlightsSection) {
                                        highlightsSection.scrollIntoView({ 
                                            behavior: 'smooth', 
                                            block: 'start',
                                            inline: 'nearest'
                                        });
                                        showNotification(`🔍 Знайдено ${data.items.length} проблемних моментів`, 'success', 2500);
                                    }
                                }, 1000);
                            } else if (data.type === 'summary') {
                                analysisData.summary = data;
                                updateSummaryDisplay(data);
                            } else if (data.type === 'barometer') {
                                console.log('📊 Received barometer data:', data);
                                analysisData.barometer = data;
                                updateBarometerDisplay(data);
                            } else if (data.type === 'persona_focus') {
                                analysisData.persona = data;
                                renderPersonaInsights(data);
                            } else if (data.type === 'bias_cluster') {
                                analysisData.biasClusters = data.clusters || [];
                                renderBiasClusters(analysisData.biasClusters);
                            } else if (data.type === 'negotiation_map') {
                                analysisData.negotiationMap = data;
                                renderNegotiationMap(data);
                            } else if (data.type === 'analysis_saved') {
                                state.currentAnalysis = { id: data.id, ...analysisData };
                                
                                // Increment client analysis count
                                if (state.currentClient) {
                                    // Update in state.clients array
                                    const clientIndex = state.clients.findIndex(c => idsMatch(c.id, state.currentClient.id));
                                    if (clientIndex !== -1) {
                                        state.clients[clientIndex].analyses_count = (state.clients[clientIndex].analyses_count || 0) + 1;
                                    }
                                    
                                    // Update current client object
                                    state.currentClient.analyses_count = (state.currentClient.analyses_count || 0) + 1;
                                    
                                    // Update UI displays
                                    updateWorkspaceClientInfo(state.currentClient);
                                    updateClientsList();
                                }
                                
                                // Create proper analysis object with all needed data for history
                                const analysisForHistory = {
                                    id: data.id,
                                    created_at: new Date().toISOString(),
                                    text_preview: state.originalText ? state.originalText.substring(0, 100) : 'Аналіз переговорів',
                                    highlights: analysisData.highlights || [],
                                    issues_count: analysisData.highlights ? analysisData.highlights.length : 0,
                                    complexity_score: analysisData.barometer ? analysisData.barometer.score : 0,
                                    barometer: analysisData.barometer
                                };
                                
                                console.log('💾 Saving analysis with data:', {
                                    id: data.id,
                                    issues_count: analysisForHistory.issues_count,
                                    complexity_score: analysisForHistory.complexity_score,
                                    barometer: analysisForHistory.barometer
                                });
                                
                                // Update currentAnalysis with complete data
                                state.currentAnalysis = {
                                    id: data.id,
                                    ...analysisData,
                                    created_at: analysisForHistory.created_at,
                                    text_preview: analysisForHistory.text_preview,
                                    issues_count: analysisForHistory.issues_count,
                                    complexity_score: analysisForHistory.complexity_score
                                };
                                
                                // Update analysis history immediately with current data
                                if (!state.analyses) state.analyses = [];
                                state.analyses.unshift(analysisForHistory);
                                renderAnalysisHistory(state.analyses);
                                
                                // Also load from server to sync
                                await loadAnalysisHistory(state.currentClient.id);
                                
                                // Update client analysis count by refreshing client data
                                await loadClients(true);
                                
                                // Update current client data with refreshed info
                                if (state.currentClient) {
                                    const updatedClient = state.clients.find(c => idsMatch(c.id, state.currentClient.id));
                                    if (updatedClient) {
                                        state.currentClient = updatedClient;
                                    }
                                }
                                
                                renderClientsList();
                                updateWorkspaceClientInfo(state.currentClient);
                                
                                // Calculate and display custom barometer if none was provided
                                if (!analysisData.barometer) {
                                    const customBarometer = calculateComplexityBarometer(state.currentClient, analysisData);
                                    updateBarometerDisplay(customBarometer);
                                }
                            } else if (data.type === 'complete') {
                                console.log('📋 Analysis complete signal received');
                                
                                // Ensure barometer is displayed and stored
                                if (analysisData.barometer) {
                                    console.log('📊 Triggering barometer display on complete');
                                    updateBarometerDisplay(analysisData.barometer);
                                } else {
                                    console.log('📊 No barometer from AI, calculating custom barometer');
                                    const customBarometer = calculateComplexityBarometer(state.currentClient, analysisData);
                                    analysisData.barometer = customBarometer; // Store it in analysisData
                                    updateBarometerDisplay(customBarometer);
                                }
                                
                                // Ensure barometer is saved in currentAnalysis
                                if (!state.currentAnalysis) state.currentAnalysis = {};
                                state.currentAnalysis.barometer = analysisData.barometer;
                                state.analysis.persona = analysisData.persona;
                                state.analysis.biasClusters = analysisData.biasClusters;
                                state.analysis.negotiationMap = analysisData.negotiationMap;
                                renderPersonaInsights(analysisData.persona);
                                renderBiasClusters(analysisData.biasClusters);
                                renderNegotiationMap(analysisData.negotiationMap);

                                // Progressive auto-scroll: Stage 3 - Scroll to barometer (final)
                                setTimeout(() => {
                                    const barometerCard = document.querySelector('.barometer-card');
                                    if (barometerCard) {
                                        barometerCard.scrollIntoView({ 
                                            behavior: 'smooth', 
                                            block: 'center',
                                            inline: 'nearest'
                                        });
                                        const score = analysisData.barometer?.score || 0;
                                        const label = analysisData.barometer?.label || 'Невизначено';
                                        showNotification(`🎯 Аналіз завершено! Складність: ${score}/100 (${label})`, 'success', 4000);
                                    }
                                }, 2000);
                                
                                // Generate and display highlighted text
                                if (state.originalText && analysisData.highlights?.length > 0) {
                                    console.log('🔍 Generating highlighted text from highlights');
                                    const highlightedText = generateHighlightedText(state.originalText, analysisData.highlights);
                                    
                                    // Ensure state.currentAnalysis exists
                                    if (!state.currentAnalysis) state.currentAnalysis = {};
                                    state.currentAnalysis.highlighted_text = highlightedText;
                                    state.currentAnalysis.highlights = analysisData.highlights;
                                    
                                    console.log('🎨 Generated highlighted text, length:', highlightedText.length);
                                    
                                    // Always update full text view so it's ready when user switches to text view
                                    updateFullTextView(highlightedText);
                                    
                                    // Also update fragments view so it's ready
                                    updateFragmentsView(analysisData.highlights);
                                    
                                    console.log('🔍 Full text view and fragments view updated and ready');
                                }
                            }
                        } catch (e) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }

            // Update token usage (debounced to prevent rate limiting)
            debouncedLoadTokenUsage();
            updateAnalysisSteps('completed');
            
            // Update analysis history in sidebar if we have all the data
            if (state.currentClient && analysisData.highlights) {
                console.log('🔄 Updating analysis history after completion');
                await loadAnalysisHistory(state.currentClient.id);
            }
            
            showNotification('Аналіз завершено успішно! ✨', 'success');
            
            // Save state
            scheduleStateSave();

        } catch (error) {
            console.error('Analysis error:', error);
            showNotification(error.message || 'Помилка при аналізі', 'error');
            updateAnalysisSteps('error');
        } finally {
            // Clear progress interval
            if (state.progressInterval) {
                clearInterval(state.progressInterval);
                state.progressInterval = null;
            }
            
            // Remove loading state
            if (elements.startAnalysisBtn) {
                elements.startAnalysisBtn.classList.remove('btn-loading');
                elements.startAnalysisBtn.disabled = false;
            }
            updateTextStats(); // Restore button text
        }
    }

    function updateAnalysisSteps(step) {
        const steps = {
            'input': { step: 1, status: 'completed' },
            'analysis': { step: 2, status: 'active' },
            'completed': { step: 3, status: 'completed' },
            'error': { step: 2, status: 'error' }
        };

        const currentStep = steps[step];
        if (!currentStep) return;

        // Update step elements with better animation
        ['step-input', 'step-analysis', 'step-results'].forEach((id, index) => {
            const element = $(`#${id}`);
            if (element) {
                const stepNumber = index + 1;
                const stepContent = element.querySelector('.step-content p');
                
                // Remove all status classes
                element.classList.remove('active', 'completed', 'error');
                
                if (stepNumber < currentStep.step) {
                    element.classList.add('completed');
                    if (stepContent) {
                        stepContent.textContent = 'Завершено';
                    }
                } else if (stepNumber === currentStep.step) {
                    element.classList.add(currentStep.status);
                    if (stepContent) {
                        if (currentStep.status === 'active') {
                            stepContent.textContent = 'В процесі';
                        } else if (currentStep.status === 'completed') {
                            stepContent.textContent = 'Завершено';
                        } else if (currentStep.status === 'error') {
                            stepContent.textContent = 'Помилка';
                        }
                    }
                } else {
                    // Future steps
                    if (stepContent) {
                        if (stepNumber === 1) {
                            stepContent.textContent = 'Очікування';
                        } else if (stepNumber === 2) {
                            stepContent.textContent = 'Очікування';
                        } else if (stepNumber === 3) {
                            stepContent.textContent = 'Готові дані';
                        }
                    }
                }
            }
        });
        
        // Force repaint for animations
        requestAnimationFrame(() => {
            document.body.offsetHeight;
        });
    }

    // Streaming update functions
    function updateHighlightsDisplay(highlights) {
        if (!elements.highlightsList) return;
        
        if (!highlights || highlights.length === 0) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <p>Проблемні моменти з'являться тут після аналізу</p>
                </div>
            `;
            return;
        }
        
        // Apply filters if they exist
        const filteredHighlights = filterHighlights(highlights);
        
        if (filteredHighlights.length === 0) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-filter"></i></div>
                    <p>Жодних результатів не знайдено за вашими фільтрами</p>
                    <button class="btn-secondary btn-sm" data-action="clear-filters">Очистити фільтри</button>
                </div>
            `;
            return;
        }
        
        elements.highlightsList.innerHTML = filteredHighlights.map((highlight, filteredIndex) => {
            // Find original index in the full highlights array
            const originalIndex = highlights.findIndex(h => h.id === highlight.id || 
                (h.text === highlight.text && h.category === highlight.category));
            
            return `
            <div class="highlight-item" data-highlight-id="${originalIndex}" draggable="true">
                <div class="highlight-header">
                    <div class="highlight-type ${highlight.category || 'manipulation'}">${highlight.label || 'Проблема'}</div>
                    <div class="highlight-severity">Рівень: ${highlight.severity || 1}</div>
                </div>
                <div class="highlight-text">"${highlight.text}"</div>
                <div class="highlight-explanation">${highlight.explanation || ''}</div>
                <div class="highlight-actions">
                    <button class="btn-icon add-to-workspace-btn" data-highlight-index="${originalIndex}" title="Додати до робочої області">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');
        
        // Enable drag functionality
        enableHighlightDrag();
        
        // Add event listeners for workspace buttons
        setTimeout(() => {
            $$('.add-to-workspace-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.highlightIndex);
                    console.log('🔘 Adding highlight to workspace via + button:', index);
                    addToWorkspace(index);
                });
            });
        }, 100); // Small delay to ensure DOM is ready
    }

    function updateSummaryDisplay(summary) {
        // Update counts from summary
        const counts = summary.counts_by_category || {};
        
        // Animate counters
        if (elements.manipulationsCount) {
            animateNumber(elements.manipulationsCount, counts.manipulation || 0);
        }
        if (elements.biasesCount) {
            animateNumber(elements.biasesCount, counts.cognitive_bias || 0);
        }
        if (elements.fallaciesCount) {
            animateNumber(elements.fallaciesCount, counts.rhetological_fallacy || 0);
        }
        
        // Calculate total recommendations
        const totalCount = (counts.manipulation || 0) + (counts.cognitive_bias || 0) + (counts.rhetological_fallacy || 0);
        if (elements.recommendationsCount) {
            animateNumber(elements.recommendationsCount, totalCount);
        }
        
        // Show patterns
        if (summary.top_patterns) {
            state.currentPatterns = summary.top_patterns;
        }
    }

    function updateCountersFromHighlights(highlights) {
        if (!highlights || highlights.length === 0) return;
        
        // Count by category
        const counts = highlights.reduce((acc, highlight) => {
            const category = highlight.category || 'manipulation';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        
        // Update counters
        if (elements.manipulationsCount) {
            animateNumber(elements.manipulationsCount, counts.manipulation || 0);
        }
        if (elements.biasesCount) {
            animateNumber(elements.biasesCount, counts.cognitive_bias || 0);
        }
        if (elements.fallaciesCount) {
            animateNumber(elements.fallaciesCount, counts.rhetological_fallacy || 0);
        }
        
        // Calculate total recommendations
        const totalCount = highlights.length;
        if (elements.recommendationsCount) {
            animateNumber(elements.recommendationsCount, totalCount);
        }
        
        console.log('Updated counters:', counts, 'Total:', totalCount);
    }

    // ===== Enhanced Custom Barometer Logic =====
    function calculateComplexityBarometer(clientData, analysisData) {
        let complexityScore = 0;
        let factors = {
            client_profile: 0,
            manipulation_density: 0,
            manipulation_severity: 0,
            manipulation_frequency: 0,
            negotiation_type: 0,
            stakes_level: 0,
            communication_style: 0,
            company_size_impact: 0,
            sector_complexity: 0,
            risk_indicators: 0,
            time_pressure: 0,
            power_dynamics: 0
        };
        
        // Factor 1: Client Profile & Company Size (0-25 points) - More weight for large organizations
        if (clientData) {
            // Company size impact - larger companies mean more stakeholders, bureaucracy, and complexity
            const sizeMap = { 
                'startup': 4, 
                'small': 8, 
                'medium': 15, 
                'large': 25  // Maximum points for large companies due to complexity
            };
            factors.company_size_impact = sizeMap[clientData.company_size] || 10;
            
            // Sector complexity with more realistic weights based on regulatory burden and negotiation complexity
            const sectorMap = { 
                'IT': 12, 'Finance': 25, 'Healthcare': 20, 'Education': 8,
                'Manufacturing': 15, 'Retail': 10, 'Real Estate': 22, 'Energy': 25,
                'Consulting': 16, 'Other': 12
            };
            factors.sector_complexity = sectorMap[clientData.sector] || 12;
            
            // Deal value complexity with exponential scaling
            if (clientData.deal_value) {
                const dealStr = clientData.deal_value.toLowerCase();
                const amount = parseFloat(dealStr.replace(/[^0-9.]/g, '')) || 0;
                
                if (dealStr.includes('m') || dealStr.includes('мільйон') || dealStr.includes('млн')) {
                    factors.client_profile += 8 + Math.min(12, amount * 0.5); // Scale with amount
                } else if (dealStr.includes('k') || dealStr.includes('тисяч') || dealStr.includes('тис')) {
                    factors.client_profile += 3 + Math.min(5, amount * 0.1);
                }
                
                // Very large deals add exponential complexity
                if (amount > 50 && (dealStr.includes('m') || dealStr.includes('мільйон'))) {
                    factors.client_profile += 15;
                }
            }
        }
        
        // Factor 2: Manipulation Density Analysis (0-35 points) - Higher weight for frequent manipulation
        if (analysisData && analysisData.highlights) {
            const totalHighlights = analysisData.highlights.length;
            const textLength = state.originalText ? state.originalText.length : 1000;
            
            // Calculate manipulation density per paragraph (more realistic than per 100 chars)
            const paragraphs = (state.originalText || '').split(/\n\s*\n/).length;
            const manipulationsPerParagraph = totalHighlights / Math.max(1, paragraphs);
            
            // If there are many manipulations per paragraph, it's extremely complex
            factors.manipulation_density = Math.min(25, manipulationsPerParagraph * 8);
            
            // Category analysis with higher penalties for multiple manipulation types
            const categories = analysisData.highlights.reduce((acc, h) => {
                acc[h.category] = (acc[h.category] || 0) + 1;
                return acc;
            }, {});
            
            const categoryCount = Object.keys(categories).length;
            factors.manipulation_frequency = Math.min(10, categoryCount * 3); // Higher penalty for variety
            
            // Penalty for high concentration of any single manipulation type
            const maxCategoryCount = Math.max(...Object.values(categories), 0);
            if (maxCategoryCount > 5) factors.manipulation_frequency += 5;
        }
        
        // Factor 3: Manipulation Severity with Non-Linear Scaling (0-30 points)
        if (analysisData?.highlights && analysisData.highlights.length > 0) {
            const severities = analysisData.highlights.map(h => h.severity || 1);
            const avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;
            const maxSeverity = Math.max(...severities);
            const severeCount = severities.filter(s => s >= 3).length;
            const extremeCount = severities.filter(s => s >= 4).length;
            
            // Non-linear scaling - high severity gets exponentially more weight
            factors.manipulation_severity = avgSeverity * 4 + maxSeverity * 3 + severeCount * 3 + extremeCount * 5;
            factors.manipulation_severity = Math.min(30, factors.manipulation_severity);
            
            // If most manipulations are severe, add extra penalty
            const severeRatio = severeCount / severities.length;
            if (severeRatio > 0.6) factors.manipulation_severity += 8;
        }
        
        // Factor 4: Communication Style Analysis (0-20 points) - New factor
        if (state.originalText) {
            const text = state.originalText.toLowerCase();
            
            // Aggressive communication patterns
            const aggressiveWords = ['мусиш', 'маєш', 'зобов\'язаний', 'примусити', 'змусити'];
            const manipulativeWords = ['тільки сьогодні', 'останній шанс', 'всі так роблять', 'ніхто не'];
            const pressureWords = ['швидко', 'зараз', 'негайно', 'терміново', 'поспішай'];
            
            factors.communication_style += aggressiveWords.filter(word => text.includes(word)).length * 4;
            factors.communication_style += manipulativeWords.filter(word => text.includes(word)).length * 3;
            factors.communication_style += pressureWords.filter(word => text.includes(word)).length * 2;
            
            // Length and complexity indicators
            const sentences = text.split(/[.!?]+/).length;
            const avgSentenceLength = text.length / sentences;
            if (avgSentenceLength > 100) factors.communication_style += 3; // Very complex sentences
            
            factors.communication_style = Math.min(20, factors.communication_style);
        }
        
        // Factor 5: Negotiation Type with Power Dynamics (0-20 points)
        if (clientData?.negotiation_type) {
            const typeMap = {
                'sales': 8, 'partnership': 12, 'contract': 10, 'investment': 18,
                'acquisition': 20, 'licensing': 14, 'other': 10
            };
            factors.negotiation_type = typeMap[clientData.negotiation_type] || 10;
            
            // Add complexity for high-stake deal types with large companies
            if (['investment', 'acquisition'].includes(clientData.negotiation_type) && 
                clientData.company_size === 'large') {
                factors.power_dynamics += 10;
            }
        }
        
        // Factor 6: Enhanced Stakes Analysis (0-25 points)
        if (clientData?.goals || clientData?.user_goals) {
            const goalsText = (clientData.goals || clientData.user_goals || '').toLowerCase();
            
            // Critical business keywords
            const criticalWords = ['критично', 'важливо', 'стратегічно', 'ключово', 'пріоритет', 'життєво'];
            const urgentWords = ['терміново', 'швидко', 'негайно', 'асап', 'дедлайн', 'вчора'];
            const riskWords = ['ризик', 'загроза', 'втрати', 'конкуренти', 'криза', 'банкрутство'];
            const powerWords = ['контроль', 'влада', 'домінування', 'перемога', 'поразка'];
            
            factors.stakes_level += criticalWords.filter(word => goalsText.includes(word)).length * 4;
            factors.stakes_level += urgentWords.filter(word => goalsText.includes(word)).length * 3;
            factors.stakes_level += riskWords.filter(word => goalsText.includes(word)).length * 4;
            factors.stakes_level += powerWords.filter(word => goalsText.includes(word)).length * 3;
            
            // Very detailed goals indicate high stakes
            factors.stakes_level += Math.min(8, goalsText.length / 80);
            factors.stakes_level = Math.min(25, factors.stakes_level);
        }
        
        // Factor 7: Time Pressure with Escalation (0-15 points)
        if (state.originalText) {
            const text = state.originalText.toLowerCase();
            const timeWords = ['терміново', 'швидко', 'негайно', 'дедлайн', 'часу мало', 'пізно', 'вчора', 'зараз'];
            const pressureWords = ['поспішай', 'не встигнеш', 'останній день', 'закінчується', 'спливає'];
            
            factors.time_pressure += timeWords.filter(word => text.includes(word)).length * 2;
            factors.time_pressure += pressureWords.filter(word => text.includes(word)).length * 3;
            factors.time_pressure = Math.min(15, factors.time_pressure);
        }
        
        // Factor 8: Risk Indicators (0-20 points)
        if (clientData) {
            // Large companies in risky sectors = maximum complexity
            if (clientData.company_size === 'large') factors.risk_indicators += 8;
            
            // High-risk sectors get exponential scaling
            const riskySectors = ['Finance', 'Energy', 'Real Estate', 'Healthcare'];
            if (riskySectors.includes(clientData.sector)) {
                factors.risk_indicators += 10;
                if (clientData.company_size === 'large') factors.risk_indicators += 5; // Compound effect
            }
            
            // Very complex deal types
            const complexDeals = ['acquisition', 'investment'];
            const mediumDeals = ['partnership', 'licensing'];
            
            if (complexDeals.includes(clientData.negotiation_type)) {
                factors.risk_indicators += 8;
            } else if (mediumDeals.includes(clientData.negotiation_type)) {
                factors.risk_indicators += 4;
            }
            
            factors.risk_indicators = Math.min(20, factors.risk_indicators);
        }
        
        // Calculate total with weighted factors
        const weightedScore = 
            factors.company_size_impact * 0.8 +
            factors.sector_complexity * 0.7 +
            factors.client_profile * 0.6 +
            factors.manipulation_density * 1.2 +
            factors.manipulation_frequency * 1.1 +
            factors.manipulation_severity * 1.5 +
            factors.communication_style * 1.0 +
            factors.negotiation_type * 0.9 +
            factors.stakes_level * 1.3 +
            factors.time_pressure * 0.8 +
            factors.risk_indicators * 1.1 +
            factors.power_dynamics * 0.9;
        
        complexityScore = Math.round(weightedScore);
        
        // More realistic and less optimistic scoring ranges
        let label, normalizedScore, description;
        if (complexityScore <= 30) {
            label = 'Manageable';
            normalizedScore = Math.min(25, complexityScore * 0.8);
            description = 'Стандартні переговори, базова підготовка';
        } else if (complexityScore <= 60) {
            label = 'Challenging';
            normalizedScore = 25 + Math.min(25, (complexityScore - 30) * 0.8);
            description = 'Складні переговори, потрібна ретельна підготовка';
        } else if (complexityScore <= 100) {
            label = 'High Risk';
            normalizedScore = 50 + Math.min(25, (complexityScore - 60) * 0.6);
            description = 'Високоризикові переговори, критична підготовка';
        } else if (complexityScore <= 150) {
            label = 'Danger Zone';
            normalizedScore = 75 + Math.min(15, (complexityScore - 100) * 0.3);
            description = 'Вкрай небезпечні переговори, максимальна обережність';
        } else {
            label = 'Minefield';
            normalizedScore = 90 + Math.min(10, (complexityScore - 150) * 0.1);
            description = 'Екстремально небезпечні переговори, розгляньте відмову';
        }
        
        return {
            score: Math.round(normalizedScore),
            label,
            description,
            factors,
            rawScore: complexityScore,
            recommendations: generateAdvancedComplexityRecommendations(label, factors, clientData)
        };
    }
    
    function generateAdvancedComplexityRecommendations(label, factors, clientData) {
        const recommendations = [];
        
        // Manipulation-based recommendations
        if (factors.manipulation_density > 15) {
            recommendations.push('🚨 Критично високий рівень маніпуляцій - підготуйте детальні контраргументи');
        }
        if (factors.manipulation_severity > 20) {
            recommendations.push('⚖️ Агресивні техніки впливу - розгляньте залучення юристів');
        }
        if (factors.manipulation_frequency > 6) {
            recommendations.push('🎭 Різноманітні техніки маніпуляцій - вивчіть кожну категорію');
        }
        
        // Company and sector-based recommendations
        if (factors.company_size_impact > 20) {
            recommendations.push('🏢 Велика корпорація - очікуйте складну ієрархію та довгі процеси');
        }
        if (factors.sector_complexity > 20) {
            recommendations.push('🏭 Складна галузь - залучіть галузевих експертів');
        }
        
        // Communication style recommendations
        if (factors.communication_style > 15) {
            recommendations.push('💬 Агресивний стиль спілкування - зберігайте спокій та професіоналізм');
        }
        if (factors.power_dynamics > 5) {
            recommendations.push('⚡ Складна динаміка влади - визначте справжніх осіб, що приймають рішення');
        }
        
        // Stakes and pressure recommendations
        if (factors.stakes_level > 18) {
            recommendations.push('🎯 Критично високі ставки - максимальна підготовка обов\'язкова');
        }
        if (factors.time_pressure > 10) {
            recommendations.push('⏰ Сильний тиск часу - не поспішайте з важливими рішеннями');
        }
        if (factors.risk_indicators > 15) {
            recommendations.push('⚠️ Високі ризики - розробіть план виходу з переговорів');
        }
        
        // Label-based strategic recommendations
        switch (label) {
            case 'Manageable':
                recommendations.push('✅ Стандартна підготовка буде достатньою');
                break;
            case 'Challenging':
                recommendations.push('📚 Поглиблена підготовка та дослідження контрагента');
                break;
            case 'High Risk':
                recommendations.push('🛡️ Залучіть команду експертів та юридичну підтримку');
                break;
            case 'Danger Zone':
                recommendations.push('🚨 Розгляньте можливість відмови або кардинальної зміни умов');
                break;
            case 'Minefield':
                recommendations.push('💀 Серйозно розгляньте відмову від цих переговорів');
                break;
        }
        
        // Deal value specific recommendations
        if (clientData?.deal_value) {
            const dealStr = clientData.deal_value.toLowerCase();
            if (dealStr.includes('m') || dealStr.includes('мільйон')) {
                recommendations.push('💰 Великі суми - обов\'язкова юридична експертиза');
            }
        }
        
        return recommendations;
    }

    function getHumorousBarometerComment(score, label, clientName) {
        const comments = {
            'Very Low': [
                `${clientName || 'Цей клієнт'} як теплий літній вечір - все спокійно та передбачувано ☕`,
                'Схоже на зустріч з найкращим другом. Насолоджуйтесь процесом! 😊',
                'Легше буває хіба що у спа-салоні. Берите блокнот для записів! 📝'
            ],
            'Low': [
                `З ${clientName || 'цим клієнтом'} буде приємно працювати. Майже як відпустка! 🏖️`,
                'Рівень стресу: як вибрати що подивитись на Netflix. Relaxed! 🎬',
                'Це той випадок, коли переговори можуть закінчитись дружбою! 🤝'
            ],
            'Medium': [
                `${clientName || 'Цей клієнт'} тримає вас у тонусі, але без фанатизму ⚡`,
                'Як квест середньої складності - цікаво, але не смертельно! 🎮',
                'Потрібна концентрація, але кава ще не обов\'язкова ☕'
            ],
            'High': [
                `${clientName || 'Цей клієнт'} витисне з вас всі соки, але воно того варте! 💪`,
                'Рівень босу в Dark Souls. Приготуйте валер\'янку! 😅',
                'Після таких переговорів можна писати мемуари "Як я вижив" 📚'
            ],
            'Very High': [
                `${clientName || 'Цей клієнт'} - це переговорна версія екстремального спорту! 🎢`,
                'Підтримайте родичів - може знадобиться моральна підтримка 😱',
                'Якщо переживете це, вам точно підвищать зарплату! 💰',
                'Легенди складають про таких клієнтів. Ви увійдете в історію! 🏆'
            ]
        };

        const levelComments = comments[label] || comments['Medium'];
        return levelComments[Math.floor(Math.random() * levelComments.length)];
    }

    function getAdequacyColor(score) {
        if (score >= 85) return 'linear-gradient(90deg, rgba(34, 197, 94, 0.9), rgba(16, 185, 129, 0.85))';
        if (score >= 70) return 'linear-gradient(90deg, rgba(59, 130, 246, 0.9), rgba(14, 165, 233, 0.85))';
        if (score >= 55) return 'linear-gradient(90deg, rgba(250, 204, 21, 0.9), rgba(249, 115, 22, 0.85))';
        if (score >= 35) return 'linear-gradient(90deg, rgba(249, 115, 22, 0.9), rgba(239, 68, 68, 0.85))';
        return 'linear-gradient(90deg, rgba(190, 24, 93, 0.95), rgba(244, 63, 94, 0.9))';
    }

    function getAdequacyComment(score) {
        if (score >= 85) {
            return 'Клієнт демонструє зрілу та конструктивну позицію. Можна поглиблювати співпрацю.';
        }
        if (score >= 70) {
            return 'Переважає здоровий глузд. Контролюйте баланс інтересів та фіксуйте домовленості.';
        }
        if (score >= 55) {
            return 'Є риси токсичності. Підсиліть рамки переговорів і контролюйте виконання зобов’язань.';
        }
        if (score >= 35) {
            return 'Високі ризики маніпуляцій. Не приймайте устні домовленості без підтверджень.';
        }
        return 'Небезпечний рівень. Розробіть план виходу та готуйте альтернативні сценарії.';
    }

    function updateBarometerDisplay(barometer) {
        // Use custom barometer if none provided by AI
        if (!barometer || typeof barometer.score === 'undefined') {
            barometer = calculateComplexityBarometer(state.currentClient, state.currentAnalysis);
        }
        
        const score = Math.round(barometer.score);
        const label = barometer.label || 'Medium';
        const adequacy = barometer.adequacy || calculateComplexityBarometer(state.currentClient, state.currentAnalysis).adequacy;
        state.analysis.adequacy = adequacy;
        
        console.log('🔍 Updating barometer:', score, label, barometer);
        console.log('🔍 Elements check:', {
            barometerScore: !!elements.barometerScore,
            barometerLabel: !!elements.barometerLabel,
            barometerComment: !!elements.barometerComment,
            gaugeCircle: !!$('#gauge-circle')
        });
        
        // Update barometer display with animation
        if (elements.barometerScore) {
            animateNumber(elements.barometerScore, score);
        }
        if (elements.barometerLabel) {
            elements.barometerLabel.textContent = label;
        }

        // Add humorous comment
        if (elements.barometerComment) {
            const clientName = state.currentClient?.company;
            const comment = getHumorousBarometerComment(score, label, clientName);
            elements.barometerComment.textContent = comment;
        }

        if (elements.barometerAdequacyScore) {
            animateNumber(elements.barometerAdequacyScore, adequacy.score || 0);
        }
        if (elements.barometerAdequacyLabel) {
            elements.barometerAdequacyLabel.textContent = adequacy.label || '—';
        }
        if (elements.barometerAdequacyComment) {
            elements.barometerAdequacyComment.textContent = adequacy.comment || getAdequacyComment(adequacy.score || 0);
        }
        if (elements.barometerAdequacyBar) {
            const width = `${Math.min(100, Math.max(0, adequacy.score || 0))}%`;
            elements.barometerAdequacyBar.style.width = width;
            elements.barometerAdequacyBar.style.background = getAdequacyColor(adequacy.score || 0);
        }
        
        // Update gauge with smooth animation
        const gaugeCircle = $('#gauge-circle');
        if (gaugeCircle) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const progress = (score / 100) * circumference;
            
            // Animate the gauge
            let currentProgress = 0;
            const duration = 1500;
            const startTime = Date.now();
            
            function animateGauge() {
                const elapsed = Date.now() - startTime;
                const progressRatio = Math.min(elapsed / duration, 1);
                currentProgress = progress * progressRatio;
                
                gaugeCircle.style.strokeDasharray = `${currentProgress} ${circumference}`;
                
                // Color based on score
                if (score <= 20) {
                    gaugeCircle.style.stroke = 'var(--neon-green)';
                } else if (score <= 40) {
                    gaugeCircle.style.stroke = 'var(--neon-cyan)';
                } else if (score <= 60) {
                    gaugeCircle.style.stroke = 'var(--neon-yellow)';
                } else if (score <= 80) {
                    gaugeCircle.style.stroke = 'var(--neon-purple)';
                } else {
                    gaugeCircle.style.stroke = 'var(--neon-pink)';
                }
                
                if (progressRatio < 1) {
                    requestAnimationFrame(animateGauge);
                }
            }
            
            animateGauge();
        }
    }

    function displayAnalysisResults(analysis) {
        if (!analysis) return;

        console.log('🔍 displayAnalysisResults called with:', {
            highlights: analysis.highlights?.length || 0,
            summary: !!analysis.summary,
            barometer: !!analysis.barometer
        });

        // Process highlights to extract categories
        let categoryCounts = { manipulation: 0, cognitive_bias: 0, rhetological_fallacy: 0 };
        
        if (analysis.highlights && Array.isArray(analysis.highlights)) {
            analysis.highlights.forEach(highlight => {
                const category = highlight.category;
                if (categoryCounts.hasOwnProperty(category)) {
                    categoryCounts[category]++;
                }
            });
        }
        
        // Also check summary data if available
        if (analysis.summary && analysis.summary.counts_by_category) {
            categoryCounts = {
                ...categoryCounts,
                ...analysis.summary.counts_by_category
            };
        }

        console.log('🔍 Category counts:', categoryCounts);

        // Update statistics display
        if (elements.manipulationsCount) {
            animateNumber(elements.manipulationsCount, categoryCounts.manipulation || 0);
        }
        if (elements.biasesCount) {
            animateNumber(elements.biasesCount, categoryCounts.cognitive_bias || 0);
        }
        if (elements.fallaciesCount) {
            animateNumber(elements.fallaciesCount, categoryCounts.rhetological_fallacy || 0);
        }
        
        // Calculate total for recommendations count
        const totalCount = (categoryCounts.manipulation || 0) + (categoryCounts.cognitive_bias || 0) + (categoryCounts.rhetological_fallacy || 0);
        if (elements.recommendationsCount) {
            animateNumber(elements.recommendationsCount, totalCount);
        }

        // Update barometer
        if (analysis.barometer) {
            updateBarometerDisplay(analysis.barometer);
        } else if (analysis.complexity_score !== undefined) {
            updateBarometer(analysis.complexity_score, analysis.complexity_label);
        }

        // Update highlights display
        if (analysis.highlights) {
            updateHighlightsDisplay(analysis.highlights);
        }
        
        // Update summary display
        if (analysis.summary) {
            updateSummaryDisplay(analysis.summary);
        }

        // Update full text view
        if (analysis.highlighted_text) {
            console.log('🔍 Loading analysis with highlighted text, length:', analysis.highlighted_text.length);
            updateFullTextView(analysis.highlighted_text);
        } else {
            console.log('🔍 No highlighted text found in analysis');
        }
    }

    function animateNumber(element, target) {
        const start = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = Date.now();

        function update() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (target - start) * progress);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        update();
    }

    function updateBarometer(score, label) {
        if (elements.barometerScore) {
            elements.barometerScore.textContent = score || '—';
        }
        if (elements.barometerLabel) {
            elements.barometerLabel.textContent = label || 'Невідомо';
        }
        
        // Update gauge fill
        if (elements.gaugeCircle && score) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const progress = (score / 10) * circumference;
            elements.gaugeCircle.style.strokeDasharray = `${progress} ${circumference}`;
        }
    }

    function displayHighlights(highlights) {
        if (!elements.highlightsList || !highlights.length) {
            if (elements.highlightsList) {
                elements.highlightsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <p>Проблемних моментів не виявлено</p>
                    </div>
                `;
            }
            return;
        }

        elements.highlightsList.innerHTML = highlights.map((highlight, index) => `
            <div class="highlight-item ${highlight.category || 'general'}" data-highlight-id="${index}">
                <div class="highlight-header">
                    <div class="highlight-type ${highlight.category}">${highlight.category_label || 'Проблема'}</div>
                    <div class="highlight-actions">
                        <button class="btn-icon" data-action="add-to-workspace" data-highlight-id="${index}" title="Додати до робочої області">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon" data-action="share-highlight" data-highlight-id="${index}" title="Поділитися">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>
                <div class="highlight-text">${escapeHtml(highlight.text || '')}</div>
                <div class="highlight-description">${escapeHtml(highlight.description || '')}</div>
                ${highlight.suggestion ? `<div class="highlight-suggestion"><strong>Рекомендація:</strong> ${escapeHtml(highlight.suggestion)}</div>` : ''}
            </div>
        `).join('');
    }

    function updateFullTextView(highlightedText) {
        if (elements.fulltextContent) {
            if (highlightedText && highlightedText.trim() !== '') {
                console.log('🔍 Updating full text view with highlighted content, length:', highlightedText.length);
                elements.fulltextContent.innerHTML = `
                    <div class="fulltext-container">
                        ${highlightedText}
                    </div>
                `;
            } else if (state.currentAnalysis?.highlights && state.originalText) {
                // Generate highlighted text from highlights and original text
                console.log('🔍 Generating highlighted text in updateFullTextView');
                const highlighted = generateHighlightedText(state.originalText, state.currentAnalysis.highlights);
                elements.fulltextContent.innerHTML = `
                    <div class="fulltext-container">
                        ${highlighted}
                    </div>
                `;
            } else if (state.originalText && state.originalText.trim() !== '') {
                // Show original text without highlighting if no highlights available
                console.log('🔍 Showing original text without highlighting');
                elements.fulltextContent.innerHTML = `
                    <div class="fulltext-container">
                        ${escapeHtml(state.originalText)}
                    </div>
                `;
            } else {
                // Show empty state if no text available
                console.log('🔍 Showing empty state for full text view');
                elements.fulltextContent.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-file-text"></i></div>
                        <p>Повний текст з підсвічуванням з'явиться тут після аналізу</p>
                    </div>
                `;
            }
        }
    }

    function generateHighlightedText(originalText, highlights) {
        if (!originalText || !highlights || highlights.length === 0) {
            return escapeHtml(originalText || '');
        }

        console.log('🔍 Generating highlighted text, originalText length:', originalText.length);
        console.log('🔍 Number of highlights:', highlights.length);

        // Normalize text for better matching
        const normalizedOriginal = originalText.replace(/\s+/g, ' ').trim();
        const positions = [];
        
        for (const highlight of highlights) {
            const searchText = highlight.text?.trim();
            if (!searchText) {
                console.warn('🔍 Empty highlight text, skipping:', highlight);
                continue;
            }
            
            console.log('🔍 Searching for highlight text:', searchText);
            
            // Normalize search text
            const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
            let foundPositions = [];
            
            // Strategy 1: Exact match in original text
            let startIndex = 0;
            let index;
            while ((index = originalText.indexOf(searchText, startIndex)) !== -1) {
                foundPositions.push({
                    start: index,
                    end: index + searchText.length,
                    highlight: highlight,
                    matchType: 'exact',
                    priority: 1
                });
                startIndex = index + 1;
            }
            
            // Strategy 2: Exact match in normalized text
            if (foundPositions.length === 0 && normalizedSearch !== searchText) {
                startIndex = 0;
                while ((index = normalizedOriginal.indexOf(normalizedSearch, startIndex)) !== -1) {
                    foundPositions.push({
                        start: index,
                        end: index + normalizedSearch.length,
                        highlight: highlight,
                        matchType: 'normalized',
                        priority: 2
                    });
                    startIndex = index + 1;
                }
            }
            
            // Strategy 3: Case insensitive match
            if (foundPositions.length === 0) {
                const lowerOriginal = originalText.toLowerCase();
                const lowerSearch = searchText.toLowerCase();
                startIndex = 0;
                while ((index = lowerOriginal.indexOf(lowerSearch, startIndex)) !== -1) {
                    foundPositions.push({
                        start: index,
                        end: index + searchText.length,
                        highlight: highlight,
                        matchType: 'case-insensitive',
                        priority: 3
                    });
                    startIndex = index + 1;
                }
            }
            
            // Strategy 4: Word-by-word matching for partial matches
            if (foundPositions.length === 0) {
                const words = searchText.split(/\s+/).filter(w => w.length > 2);
                for (const word of words) {
                    const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
                    let match;
                    while ((match = regex.exec(originalText)) !== null) {
                        // Look for the full phrase in a larger context around this word
                        const contextRadius = Math.max(searchText.length * 2, 100);
                        const contextStart = Math.max(0, match.index - contextRadius);
                        const contextEnd = Math.min(originalText.length, match.index + contextRadius);
                        const context = originalText.substring(contextStart, contextEnd);
                        
                        // Try different variations of the search text in this context
                        const variations = [
                            searchText,
                            searchText.toLowerCase(),
                            normalizedSearch,
                            normalizedSearch.toLowerCase()
                        ];
                        
                        for (const variation of variations) {
                            const localIndex = context.toLowerCase().indexOf(variation.toLowerCase());
                            if (localIndex !== -1) {
                                const actualStart = contextStart + localIndex;
                                const actualEnd = actualStart + variation.length;
                                
                                // Make sure we don't already have this position
                                const isDuplicate = foundPositions.some(pos => 
                                    Math.abs(pos.start - actualStart) < 5
                                );
                                
                                if (!isDuplicate) {
                                    foundPositions.push({
                                        start: actualStart,
                                        end: actualEnd,
                                        highlight: highlight,
                                        matchType: 'context-based',
                                        priority: 4
                                    });
                                }
                                break; // Found one variation, move to next word
                            }
                        }
                    }
                }
            }
            
            // Strategy 5: Flexible text search ignoring punctuation and extra spaces
            if (foundPositions.length === 0) {
                const cleanSearch = searchText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                const cleanOriginal = originalText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').toLowerCase();
                
                if (cleanSearch !== searchText.toLowerCase()) {
                    const cleanIndex = cleanOriginal.indexOf(cleanSearch);
                    if (cleanIndex !== -1) {
                        // Map back to original text position
                        let originalPos = 0;
                        let cleanPos = 0;
                        
                        while (cleanPos < cleanIndex && originalPos < originalText.length) {
                            const origChar = originalText[originalPos].toLowerCase();
                            const cleanChar = cleanOriginal[cleanPos];
                            
                            if (origChar === cleanChar) {
                                cleanPos++;
                            }
                            originalPos++;
                        }
                        
                        // Find the end position
                        const searchEnd = cleanIndex + cleanSearch.length;
                        let endPos = originalPos;
                        while (cleanPos < searchEnd && endPos < originalText.length) {
                            const origChar = originalText[endPos].toLowerCase();
                            const cleanChar = cleanOriginal[cleanPos];
                            
                            if (origChar === cleanChar) {
                                cleanPos++;
                            }
                            endPos++;
                        }
                        
                        foundPositions.push({
                            start: originalPos,
                            end: endPos,
                            highlight: highlight,
                            matchType: 'flexible',
                            priority: 4
                        });
                    }
                }
            }
            
            // Strategy 6: Fuzzy search with Levenshtein-like approach for typos
            if (foundPositions.length === 0 && searchText.length > 10) {
                const searchLength = searchText.length;
                const tolerance = Math.floor(searchLength * 0.15); // 15% tolerance
                
                for (let i = 0; i <= originalText.length - searchLength + tolerance; i += 5) { // Skip every 5 chars for performance
                    const candidate = originalText.substring(i, i + searchLength);
                    const similarity = calculateSimilarity(searchText.toLowerCase(), candidate.toLowerCase());
                    
                    if (similarity > 0.75) { // 75% similarity threshold
                        foundPositions.push({
                            start: i,
                            end: i + candidate.length,
                            highlight: highlight,
                            matchType: 'fuzzy',
                            priority: 6,
                            similarity: similarity
                        });
                    }
                }
            }
            
            // Strategy 7: Last resort - search for key words from the highlight
            if (foundPositions.length === 0) {
                const keywords = searchText.split(/\s+/).filter(w => w.length > 3);
                if (keywords.length > 0) {
                    const mainKeyword = keywords.sort((a, b) => b.length - a.length)[0]; // Longest word
                    const regex = new RegExp(`\\b${escapeRegExp(mainKeyword)}\\b`, 'gi');
                    let match;
                    while ((match = regex.exec(originalText)) !== null) {
                        // Expand around the keyword to try to capture the full phrase
                        const expandRadius = searchText.length;
                        const expandStart = Math.max(0, match.index - expandRadius);
                        const expandEnd = Math.min(originalText.length, match.index + mainKeyword.length + expandRadius);
                        
                        foundPositions.push({
                            start: expandStart,
                            end: expandEnd,
                            highlight: highlight,
                            matchType: 'keyword-expanded',
                            priority: 7
                        });
                    }
                }
            }
            
            console.log(`🔍 Found ${foundPositions.length} positions for "${searchText}"`);
            if (foundPositions.length === 0) {
                console.warn(`🔍 No matches found for: "${searchText}"`);
                console.warn(`🔍 First 200 chars of original text:`, originalText.substring(0, 200));
            }
            
            positions.push(...foundPositions);
        }
        
        // Sort by priority first, then by position
        positions.sort((a, b) => a.priority - b.priority || a.start - b.start);
        console.log('🔍 Total positions found:', positions.length);
        
        // Remove overlapping highlights (keep the highest priority one)
        const cleanPositions = [];
        for (const pos of positions) {
            const overlaps = cleanPositions.some(existing => 
                (pos.start >= existing.start && pos.start < existing.end) ||
                (pos.end > existing.start && pos.end <= existing.end) ||
                (pos.start <= existing.start && pos.end >= existing.end)
            );
            
            if (!overlaps) {
                cleanPositions.push(pos);
            }
        }
        
        cleanPositions.sort((a, b) => a.start - b.start);
        console.log('🔍 Clean positions after overlap removal:', cleanPositions.length);
        
        // Build the highlighted text
        let result = '';
        let lastPos = 0;
        
        for (const pos of cleanPositions) {
            // Add text before highlight
            if (pos.start > lastPos) {
                result += escapeHtml(originalText.substring(lastPos, pos.start));
            }
            
            // Get the actual text from original (in case of case differences)
            const actualText = originalText.substring(pos.start, pos.end);
            const categoryClass = getCategoryClass(pos.highlight.category);
            const tooltip = escapeHtml(pos.highlight.explanation || pos.highlight.label || '');
            
            result += `<span class="text-highlight ${categoryClass}" data-tooltip="${tooltip}" title="Match type: ${pos.matchType}">${escapeHtml(actualText)}</span>`;
            
            lastPos = pos.end;
        }
        
        // Add remaining text
        if (lastPos < originalText.length) {
            result += escapeHtml(originalText.substring(lastPos));
        }
        
        console.log('🔍 Generated highlighted text length:', result.length);
        console.log('🔍 Highlighted', cleanPositions.length, 'out of', highlights.length, 'total highlights');
        
        return result;
    }
    
    // Helper function to calculate text similarity
    function calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    // Simple Levenshtein distance implementation
    function levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    function getCategoryClass(category) {
        const categoryMap = {
            'manipulation': 'manipulation',
            'cognitive_bias': 'cognitive_bias', 
            'rhetological_fallacy': 'fallacy',
            'logical_fallacy': 'fallacy'
        };
        return categoryMap[category] || 'manipulation';
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ===== View Controls =====
    function switchHighlightsView(view) {
        state.ui.highlightsView = view;
        
        // Update button states
        elements.listView?.classList.toggle('active', view === 'list');
        elements.textView?.classList.toggle('active', view === 'text');
        elements.highlightsView?.classList.toggle('active', view === 'highlights');
        
        // Show/hide content
        if (elements.highlightsList) {
            elements.highlightsList.style.display = view === 'list' ? 'block' : 'none';
        }
        if (elements.fulltextContent) {
            elements.fulltextContent.style.display = view === 'text' ? 'block' : 'none';
            
            // Update full text view when switching to text view
            if (view === 'text') {
                console.log('🔍 Switching to text view, updating full text view');
                if (state.currentAnalysis?.highlighted_text) {
                    updateFullTextView(state.currentAnalysis.highlighted_text);
                } else if (state.currentAnalysis?.highlights && state.originalText) {
                    // Generate highlighted text if not cached
                    const highlightedText = generateHighlightedText(state.originalText, state.currentAnalysis.highlights);
                    state.currentAnalysis.highlighted_text = highlightedText; // Cache it
                    updateFullTextView(highlightedText);
                } else {
                    // Fallback to original text or empty state
                    updateFullTextView(null);
                }
            }
        }
        if (elements.fragmentsContent) {
            elements.fragmentsContent.style.display = view === 'highlights' ? 'block' : 'none';
            
            // Update fragments view when switching to highlights view
            if (view === 'highlights' && state.currentAnalysis?.highlights) {
                console.log('🔍 Updating fragments view with highlights');
                updateFragmentsView(state.currentAnalysis.highlights);
            }
        }
    }

    function updateFragmentsView(highlights) {
        if (!elements.fragmentsContent) return;
        
        if (!highlights || highlights.length === 0) {
            elements.fragmentsContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-highlighter"></i></div>
                    <p>Виділені маніпулятивні фрагменти з'являться тут після аналізу</p>
                </div>
            `;
            return;
        }
        
        // Apply filters if they exist
        const filteredHighlights = filterHighlights(highlights);
        
        if (filteredHighlights.length === 0) {
            elements.fragmentsContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-filter"></i></div>
                    <p>Жодних фрагментів не знайдено за вашими фільтрами</p>
                    <button class="btn-secondary btn-sm" data-action="clear-filters">Очистити фільтри</button>
                </div>
            `;
            return;
        }
        
        // Sort highlights by severity (high to low)
        const sortedHighlights = [...filteredHighlights].sort((a, b) => 
            (b.severity || 2) - (a.severity || 2)
        );
        
        elements.fragmentsContent.innerHTML = sortedHighlights.map(highlight => {
            const categoryClass = getCategoryClass(highlight.category);
            const categoryLabel = getCategoryLabel(highlight.category);
            const severityText = getSeverityText(highlight.severity);
            
            return `
                <div class="fragment-item" data-category="${highlight.category}">
                    <div class="fragment-header">
                        <div class="fragment-category ${categoryClass}">
                            <i class="fas ${getCategoryIcon(highlight.category)}"></i>
                            ${categoryLabel}
                        </div>
                        <div class="highlight-severity">${severityText}</div>
                    </div>
                    <div class="fragment-text">
                        "${escapeHtml(highlight.text)}"
                    </div>
                    <div class="fragment-explanation">
                        <strong>${escapeHtml(highlight.label || highlight.title || 'Проблемний момент')}:</strong>
                        ${escapeHtml(highlight.explanation || 'Пояснення недоступне')}
                        ${highlight.suggestion ? `<br><br><strong>Рекомендація:</strong> ${escapeHtml(highlight.suggestion)}` : ''}
                    </div>
                    <div class="fragment-actions">
                        <button class="btn-icon add-fragment-btn" data-fragment='${JSON.stringify(highlight).replace(/'/g, "&#39;")}' title="Додати до робочої області">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon copy-fragment-btn" data-text="${escapeHtml(highlight.text)}" title="Скопіювати текст">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners
        elements.fragmentsContent.querySelectorAll('.add-fragment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const fragment = JSON.parse(e.target.closest('.add-fragment-btn').dataset.fragment);
                addToSelectedFragments(fragment);
            });
        });
        
        elements.fragmentsContent.querySelectorAll('.copy-fragment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const text = e.target.closest('.copy-fragment-btn').dataset.text;
                try {
                    await navigator.clipboard.writeText(text);
                    showNotification('Фрагмент скопійовано в буфер обміну', 'success');
                } catch (err) {
                    showNotification('Помилка копіювання', 'error');
                }
            });
        });
    }
    
    function getCategoryLabel(category) {
        const labels = {
            'manipulation': 'Маніпуляція',
            'cognitive_bias': 'Когнітивне викривлення',
            'rhetological_fallacy': 'Софізм',
            'logical_fallacy': 'Логічна помилка'
        };
        return labels[category] || 'Проблемний момент';
    }
    
    function getCategoryIcon(category) {
        const icons = {
            'manipulation': 'fa-exclamation-triangle',
            'cognitive_bias': 'fa-brain',
            'rhetological_fallacy': 'fa-comments',
            'logical_fallacy': 'fa-times-circle'
        };
        return icons[category] || 'fa-exclamation-triangle';
    }
    
    function getSeverityText(severity) {
        const severities = {
            1: 'Легкий',
            2: 'Помірний', 
            3: 'Серйозний'
        };
        return severities[severity] || 'Помірний';
    }

    function toggleFilters() {
        state.ui.filtersVisible = !state.ui.filtersVisible;
        
        // Update button state
        elements.filterView?.classList.toggle('active', state.ui.filtersVisible);
        
        // Show/hide filters panel
        if (elements.filtersPanel) {
            elements.filtersPanel.style.display = state.ui.filtersVisible ? 'block' : 'none';
        }
        
        // Hide other views when filters are shown
        if (state.ui.filtersVisible) {
            if (elements.highlightsList) elements.highlightsList.style.display = 'none';
            if (elements.fulltextContent) elements.fulltextContent.style.display = 'none';
            if (elements.fragmentsContent) elements.fragmentsContent.style.display = 'none';
        } else {
            // Restore previous view
            switchHighlightsView(state.ui.highlightsView || 'list');
        }
    }

    function applyFilters() {
        // Get filter values
        state.ui.filters.showManipulation = elements.filterManipulation?.checked ?? true;
        state.ui.filters.showCognitiveBias = elements.filterCognitiveBias?.checked ?? true;
        state.ui.filters.showRhetoricalFallacy = elements.filterRhetoricalFallacy?.checked ?? true;
        state.ui.filters.minSeverity = parseInt(elements.filterMinSeverity?.value || '1');
        state.ui.filters.maxSeverity = parseInt(elements.filterMaxSeverity?.value || '3');
        state.ui.filters.searchText = elements.filterSearch?.value.toLowerCase() || '';
        
        // Apply filters to current highlights
        if (state.currentAnalysis?.highlights) {
            updateHighlightsDisplay(state.currentAnalysis.highlights);
        }
        
        // Close filters panel
        toggleFilters();
        
        showNotification('Фільтри застосовано', 'success');
    }

    function clearFilters() {
        // Reset filter values
        state.ui.filters = {
            showManipulation: true,
            showCognitiveBias: true,
            showRhetoricalFallacy: true,
            minSeverity: 1,
            maxSeverity: 3,
            searchText: ''
        };
        
        // Update UI
        if (elements.filterManipulation) elements.filterManipulation.checked = true;
        if (elements.filterCognitiveBias) elements.filterCognitiveBias.checked = true;
        if (elements.filterRhetoricalFallacy) elements.filterRhetoricalFallacy.checked = true;
        if (elements.filterMinSeverity) elements.filterMinSeverity.value = '1';
        if (elements.filterMaxSeverity) elements.filterMaxSeverity.value = '3';
        if (elements.filterSearch) elements.filterSearch.value = '';
        
        // Reapply filters
        applyFilters();
    }

    function filterHighlights(highlights) {
        if (!highlights || highlights.length === 0) return highlights;
        
        return highlights.filter(highlight => {
            // Category filter
            const category = highlight.category || 'manipulation';
            if (category === 'manipulation' && !state.ui.filters.showManipulation) return false;
            if (category === 'cognitive_bias' && !state.ui.filters.showCognitiveBias) return false;
            if ((category === 'rhetological_fallacy' || category === 'rhetorical_fallacy') && !state.ui.filters.showRhetoricalFallacy) return false;
            
            // Severity filter
            const severity = highlight.severity || 1;
            if (severity < state.ui.filters.minSeverity || severity > state.ui.filters.maxSeverity) return false;
            
            // Text search filter
            if (state.ui.filters.searchText) {
                const searchText = state.ui.filters.searchText;
                const text = (highlight.text || '').toLowerCase();
                const label = (highlight.label || '').toLowerCase();
                const explanation = (highlight.explanation || '').toLowerCase();
                
                if (!text.includes(searchText) && !label.includes(searchText) && !explanation.includes(searchText)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    // ===== File Handling =====
    function setupFileHandling() {
        if (!elements.fileDropzone || !elements.fileInput) return;

        // File input change
        elements.fileInput.addEventListener('change', handleFileSelect);
        
        // Choose file button
        elements.chooseFileBtn?.addEventListener('click', () => {
            elements.fileInput.click();
        });

        // Drag and drop
        elements.fileDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.add('dragover');
        });

        elements.fileDropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.remove('dragover');
        });

        elements.fileDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect({ target: { files } });
            }
        });

        // Remove file button
        elements.removeFileBtn?.addEventListener('click', clearFile);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['.txt', '.doc', '.docx'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (file.size > maxSize) {
            showNotification('Файл занадто великий. Максимальний розмір: 10MB', 'error');
            return;
        }

        if (!allowedTypes.includes(fileExt)) {
            showNotification('Непідтримуваний формат файлу. Дозволені: TXT, DOC, DOCX', 'error');
            return;
        }

        // Show file preview
        showFilePreview(file);

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            if (elements.negotiationText) {
                elements.negotiationText.value = e.target.result;
                updateTextStats();
            }
            showNotification('Файл завантажено успішно! ✅', 'success');
        };
        reader.onerror = () => {
            showNotification('Помилка читання файлу', 'error');
        };
        reader.readAsText(file);
    }

    function showFilePreview(file) {
        if (elements.fileName) elements.fileName.textContent = file.name;
        if (elements.fileSize) elements.fileSize.textContent = formatFileSize(file.size);
        if (elements.filePreview) elements.filePreview.style.display = 'block';
    }

    function clearFile() {
        if (elements.fileInput) elements.fileInput.value = '';
        if (elements.filePreview) elements.filePreview.style.display = 'none';
        if (elements.negotiationText) {
            elements.negotiationText.value = '';
            updateTextStats();
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ===== Sidebar Management =====
    function toggleSidebar(side) {
        if (side === 'left') {
            state.ui.leftSidebarCollapsed = !state.ui.leftSidebarCollapsed;
            if (elements.sidebarLeft) {
                elements.sidebarLeft.classList.toggle('collapsed', state.ui.leftSidebarCollapsed);
            }
        } else if (side === 'right') {
            state.ui.rightSidebarCollapsed = !state.ui.rightSidebarCollapsed;
            if (elements.sidebarRight) {
                elements.sidebarRight.classList.toggle('collapsed', state.ui.rightSidebarCollapsed);
            }
        }
    }

    function showOnboarding() {
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'flex';
            updateOnboardingStep();
        }
    }

    function completeOnboarding() {
        state.onboardingCompleted = true;
        localStorage.setItem('teampulse-onboarding-completed', 'true');
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'none';
        }
        showNotification('Ласкаво просимо до TeamPulse Turbo! 🚀', 'success');

        // Load initial data
        loadClients();
        debouncedLoadTokenUsage();

        // Auto-refresh token usage (less frequent to avoid rate limiting)
        setInterval(debouncedLoadTokenUsage, 120000); // 2 minutes замість 30 секунд
    }

    function nextOnboardingStep() {
        const totalSteps = $$('.onboarding-step').length || 1;
        if (state.onboardingStep < totalSteps) {
            state.onboardingStep++;
            updateOnboardingStep();
            return;
        }
        completeOnboarding();
    }

    function prevOnboardingStep() {
        if (state.onboardingStep > 1) {
            state.onboardingStep--;
            updateOnboardingStep();
        }
    }

    function updateOnboardingStep() {
        const totalSteps = $$('.onboarding-step').length || 1;

        // Hide all steps
        $$('.onboarding-step').forEach(step => {
            step.classList.remove('active');
            step.style.display = 'none';
        });

        // Show current step
        const currentStep = $(`#onboarding-step-${state.onboardingStep}`);
        if (currentStep) {
            currentStep.classList.add('active');
            currentStep.style.display = 'block';
        }

        // Update progress
        const progress = (state.onboardingStep / totalSteps) * 100;
        if (elements.onboardingProgress) {
            elements.onboardingProgress.style.width = `${progress}%`;
        }
        if (elements.progressText) {
            elements.progressText.textContent = `Крок ${state.onboardingStep} з ${totalSteps}`;
        }

        // Update buttons
        if (elements.prevStep) {
            elements.prevStep.style.display = state.onboardingStep > 1 ? 'block' : 'none';
        }
        if (elements.nextStep) {
            elements.nextStep.innerHTML = state.onboardingStep < totalSteps ?
                'Далі <i class="fas fa-arrow-right"></i>' :
                'Завершити <i class="fas fa-check"></i>';
        }
    }

    // ===== Drag & Drop Functions =====
    function enableHighlightDrag() {
        $$('.highlight-item[draggable="true"]').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const highlightId = e.target.dataset.highlightId;
                e.dataTransfer.setData('text/plain', highlightId);
                e.target.classList.add('dragging');
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });
    }

    function setupWorkspaceDrop() {
        const dropZone = elements.fragmentsDropZone;
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('dragover');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const highlightId = e.dataTransfer.getData('text/plain');
            if (highlightId !== '') {
                addToWorkspace(parseInt(highlightId));
            }
        });
    }

    function addToWorkspace(highlightIndex) {
        if (!state.currentAnalysis?.highlights?.[highlightIndex]) return;
        
        const highlight = state.currentAnalysis.highlights[highlightIndex];
        
        // Avoid duplicates
        const exists = state.selectedFragments.some(f => f.id === highlight.id);
        if (exists) {
            showNotification('Цей фрагмент вже додано до робочої області', 'warning');
            return;
        }
        
        state.selectedFragments.push({
            id: highlight.id,
            text: highlight.text,
            category: highlight.category,
            label: highlight.label,
            explanation: highlight.explanation
        });
        
        updateWorkspaceFragments();
        updateWorkspaceActions();
        showNotification('Фрагмент додано до робочої області', 'success');
        
        // Save state
        scheduleStateSave();
    }

    function updateWorkspaceFragments() {
        const selectedFragments = elements.selectedFragments;
        if (!selectedFragments) return;
        
        if (elements.fragmentsCount) {
            elements.fragmentsCount.textContent = state.selectedFragments.length;
        }
        
        if (state.selectedFragments.length === 0) {
            selectedFragments.innerHTML = '';
            return;
        }
        
        selectedFragments.innerHTML = state.selectedFragments.map((fragment, index) => `
            <div class="fragment-item">
                <div class="highlight-type ${fragment.category}">${fragment.label}</div>
                <div class="fragment-text">"${fragment.text}"</div>
                <button class="fragment-remove" data-action="remove-from-workspace" data-fragment-index="${index}" title="Видалити">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    function removeFromWorkspace(index) {
        state.selectedFragments.splice(index, 1);
        updateWorkspaceFragments();
        updateWorkspaceActions();
    }

    function updateWorkspaceActions() {
        const hasFragments = state.selectedFragments.length > 0;
        
        if (elements.getAdviceBtn) {
            elements.getAdviceBtn.disabled = !hasFragments;
        }
        if (elements.exportSelectedBtn) {
            elements.exportSelectedBtn.disabled = !hasFragments;
        }
        if (elements.clearWorkspaceBtn) {
            elements.clearWorkspaceBtn.disabled = !hasFragments;
        }
    }

    async function getPersonalizedAdvice() {
        if (state.selectedFragments.length === 0) {
            showNotification('Спочатку оберіть фрагменти для аналізу', 'warning');
            return;
        }

        if (!state.currentClient) {
            showNotification('Клієнт не обраний', 'warning');
            return;
        }

        try {
            elements.getAdviceBtn.classList.add('btn-loading');
            elements.getAdviceBtn.disabled = true;

            const response = await fetch('/api/advice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: state.selectedFragments,
                    profile: state.currentClient
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка отримання порад');
            }

            // Save the advice for future reference
            const advice = data.advice || data;
            saveAdviceToHistory(advice);
            
            // Save recommendation to new history system
            if (state.currentClient) {
                let adviceText = '';
                if (typeof advice === 'string') {
                    adviceText = advice;
                } else if (advice && typeof advice === 'object') {
                    // Extract text from structured advice object
                    const parts = [];
                    if (advice.recommended_replies) {
                        parts.push('РЕКОМЕНДОВАНІ ВІДПОВІДІ:\n' + advice.recommended_replies.join('\n• '));
                    }
                    if (advice.strategies) {
                        parts.push('СТРАТЕГІЇ:\n' + advice.strategies.join('\n• '));
                    }
                    if (advice.warnings) {
                        parts.push('ПОПЕРЕДЖЕННЯ:\n' + advice.warnings.join('\n• '));
                    }
                    if (advice.next_steps) {
                        parts.push('НАСТУПНІ КРОКИ:\n' + advice.next_steps.join('\n• '));
                    }
                    adviceText = parts.join('\n\n');
                }
                
                if (adviceText) {
                    saveRecommendation(
                        state.currentClient.id, 
                        adviceText, 
                        state.selectedFragments.length,
                        advice, // Pass structured data
                        state.selectedFragments.slice() // Pass current fragments
                    );
                }
            }
            
            // Show advice in a modal or notification
            showAdviceModal(advice);
            debouncedLoadTokenUsage();

        } catch (error) {
            console.error('Advice error:', error);
            showNotification(error.message || 'Помилка при отриманні порад', 'error');
        } finally {
            elements.getAdviceBtn.classList.remove('btn-loading');
            elements.getAdviceBtn.disabled = state.selectedFragments.length === 0;
        }
    }

    function saveAdviceToHistory(advice) {
        try {
            if (!state.currentClient) return;
            
            const adviceRecord = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                clientId: state.currentClient.id,
                fragments: [...state.selectedFragments],
                advice: advice,
                created: formatDate(new Date())
            };
            
            // Get existing advice history
            const historyKey = 'teampulse-advice-history';
            let history = [];
            try {
                const saved = localStorage.getItem(historyKey);
                if (saved) history = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse advice history');
            }
            
            // Add new advice to beginning of history
            history.unshift(adviceRecord);
            
            // Keep only last 50 recommendations
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            // Save updated history
            localStorage.setItem(historyKey, JSON.stringify(history));
            console.log('Saved advice to history:', adviceRecord);
            
        } catch (error) {
            console.error('Failed to save advice to history:', error);
        }
    }

    function showAdviceModal(advice) {
        console.log('Showing advice modal with:', advice);
        
        // Handle different response formats
        let content = '';
        if (typeof advice === 'string') {
            content = `<div class="advice-text">${advice}</div>`;
        } else if (advice && typeof advice === 'object') {
            content = `
                ${advice.recommended_replies ? `
                    <div class="advice-section">
                        <h4><i class="fas fa-comments"></i><span>Рекомендовані відповіді:</span></h4>
                        <ul class="advice-list">
                            ${advice.recommended_replies.map(reply => `<li>${escapeHtml(reply)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${advice.risks ? `
                    <div class="advice-section">
                        <h4><i class="fas fa-exclamation-triangle"></i><span>Виявлені ризики:</span></h4>
                        <ul class="advice-list risks">
                            ${advice.risks.map(risk => `<li>${escapeHtml(risk)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${advice.notes ? `
                    <div class="advice-section">
                        <h4><i class="fas fa-clipboard-list"></i><span>Додаткові поради:</span></h4>
                        <div class="advice-notes">${escapeHtml(advice.notes)}</div>
                    </div>
                ` : ''}
            `;
        } else {
            content = '<div class="advice-text">Помилка отримання порад</div>';
        }
        
        // Create and show advice modal
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.innerHTML = `
            <div class="advice-content">
                <div class="advice-header">
                    <h3><i class="fas fa-lightbulb"></i> Персоналізовані поради</h3>
                    <button class="btn-icon close-advice">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body">
                    ${content}
                </div>
                <div class="advice-actions">
                    <button class="btn-secondary close-advice-btn">Закрити</button>
                    <button class="btn-ghost view-history-btn">
                        <i class="fas fa-history"></i> Попередні поради
                    </button>
                    <button class="btn-primary copy-advice-btn">
                        <i class="fas fa-copy"></i> Копіювати
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners for close buttons
        modal.querySelector('.close-advice').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.close-advice-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        // Add event listener for history button
        modal.querySelector('.view-history-btn').addEventListener('click', () => {
            modal.remove();
            showAdviceHistory();
        });
        
        // Add event listener for copy button
        modal.querySelector('.copy-advice-btn').addEventListener('click', () => {
            copyAdviceToClipboard(JSON.stringify(advice));
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        showNotification('Поради згенеровано успішно! 💡', 'success');
    }

    function showAdviceHistory() {
        try {
            const historyKey = 'teampulse-advice-history';
            const saved = localStorage.getItem(historyKey);
            const history = saved ? JSON.parse(saved) : [];
            
            // Filter by current client if one is selected
            const filteredHistory = state.currentClient 
                ? history.filter(record => record.clientId === state.currentClient.id)
                : history;
                
            if (filteredHistory.length === 0) {
                showNotification('Немає збережених порад для цього клієнта', 'info');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'advice-modal';
            modal.innerHTML = `
                <div class="advice-content" style="max-width: 800px;">
                    <div class="advice-header">
                        <h3><i class="fas fa-history"></i> Історія порад${state.currentClient ? ` для ${state.currentClient.company}` : ''}</h3>
                        <button class="btn-icon close-history">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="advice-body" style="max-height: 500px; overflow-y: auto;">
                        ${filteredHistory.map(record => `
                            <div class="advice-history-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <span style="font-size: 0.9em; color: rgba(255, 255, 255, 0.7);">${record.created}</span>
                                    <button class="btn-icon copy-history-advice" data-advice='${JSON.stringify(record.advice)}' title="Копіювати">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                                <div class="advice-content-preview">
                                    ${typeof record.advice === 'string' 
                                        ? `<div class="advice-text">${escapeHtml(record.advice)}</div>` 
                                        : formatAdviceContent(record.advice)
                                    }
                                </div>
                                ${record.fragments && record.fragments.length > 0 ? `
                                    <div style="margin-top: 10px; font-size: 0.85em; color: rgba(255, 255, 255, 0.6);">
                                        Базувалося на ${record.fragments.length} обраних фрагментах
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="advice-actions">
                        <button class="btn-secondary close-history-btn">Закрити</button>
                        <button class="btn-ghost clear-history-btn">
                            <i class="fas fa-trash"></i> Очистити історію
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners
            modal.querySelector('.close-history').addEventListener('click', () => modal.remove());
            modal.querySelector('.close-history-btn').addEventListener('click', () => modal.remove());
            modal.querySelector('.clear-history-btn').addEventListener('click', () => {
                showCustomConfirmation(
                    'Очищення історії порад',
                    'Ви впевнені, що хочете видалити всю історію порад? Цю дію неможливо скасувати.',
                    () => {
                        localStorage.removeItem(historyKey);
                        modal.remove();
                        showNotification('Історію порад очищено', 'success');
                    }
                );
            });
            
            // Copy buttons
            modal.querySelectorAll('.copy-history-advice').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const advice = e.target.closest('.copy-history-advice').getAttribute('data-advice');
                    copyAdviceToClipboard(advice);
                });
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
        } catch (error) {
            console.error('Failed to show advice history:', error);
            showNotification('Помилка завантаження історії порад', 'error');
        }
    }

    function formatAdviceContent(advice) {
        if (!advice || typeof advice !== 'object') return '';
        
        let content = '';
        if (advice.recommended_replies && advice.recommended_replies.length > 0) {
            content += `
                <div class="advice-section">
                    <h5><i class="fas fa-comments"></i> Рекомендовані відповіді:</h5>
                    <ul class="advice-list">
                        ${advice.recommended_replies.map(reply => `<li>${escapeHtml(reply)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (advice.strategies && advice.strategies.length > 0) {
            content += `
                <div class="advice-section">
                    <h5><i class="fas fa-chess"></i> Стратегії:</h5>
                    <ul class="advice-list">
                        ${advice.strategies.map(strategy => `<li>${escapeHtml(strategy)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (advice.warnings && advice.warnings.length > 0) {
            content += `
                <div class="advice-section">
                    <h5><i class="fas fa-exclamation-triangle"></i> Попередження:</h5>
                    <ul class="advice-list">
                        ${advice.warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        return content || '<div class="advice-text">Немає структурованих порад</div>';
    }

    function copyAdviceToClipboard(advice) {
        navigator.clipboard.writeText(advice).then(() => {
            showNotification('Поради скопійовано в буфер обміну', 'success');
        }).catch(() => {
            showNotification('Не вдалося скопіювати', 'error');
        });
    }

    function exportSelectedFragments() {
        if (state.selectedFragments.length === 0) {
            showNotification('Немає фрагментів для експорту', 'warning');
            return;
        }

        const exportData = {
            client: state.currentClient,
            fragments: state.selectedFragments,
            analysis_date: new Date().toISOString(),
            export_date: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `teampulse_analysis_${state.currentClient?.company || 'client'}_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('Дані експортовано успішно! 📁', 'success');
    }

    function clearWorkspace() {
        if (state.selectedFragments.length === 0) return;

        showCustomConfirmation(
            'Очищення робочої області',
            'Очистити робочу область? Всі обрані фрагменти будуть видалені.',
            () => {
                state.selectedFragments = [];
                updateWorkspaceFragments();
                updateWorkspaceActions();
                showNotification('Робочу область очищено', 'info');
            }
        );
    }

    // ===== Product Switcher =====
    function toggleProductDropdown(e) {
        e.stopPropagation();
        const isOpen = elements.productDropdown.style.display === 'block';
        
        if (isOpen) {
            closeProductDropdown();
        } else {
            openProductDropdown();
        }
    }
    
    function openProductDropdown() {
        elements.productDropdown.style.display = 'block';
        elements.productDropdownBtn.classList.add('active');
    }
    
    function closeProductDropdown() {
        elements.productDropdown.style.display = 'none';
        elements.productDropdownBtn.classList.remove('active');
    }

    function updateProductSwitcher(targetId) {
        $$('.product-item').forEach(item => {
            const itemTarget = item.getAttribute('data-target');
            if (!itemTarget) return;
            item.classList.toggle('active', itemTarget === targetId);
        });

        const meta = PRODUCT_META[targetId];
        if (meta && elements.productDropdownBtn) {
            const iconEl = elements.productDropdownBtn.querySelector('.product-current-icon');
            const labelEl = elements.productDropdownBtn.querySelector('.product-current-label');
            if (iconEl) {
                iconEl.className = `${meta.icon} product-current-icon`;
            }
            if (labelEl) {
                labelEl.textContent = meta.label;
            }
        }
    }

    function selectProduct(targetId) {
        if (!targetId) return;

        const item = elements.productDropdown?.querySelector(`[data-target="${targetId}"]`);
        if (item && item.classList.contains('disabled')) return;

        updateProductSwitcher(targetId);
        showSection(targetId);
        closeProductDropdown();
    }

    // Make functions globally accessible
    window.addToWorkspace = addToWorkspace;
    window.removeFromWorkspace = removeFromWorkspace;
    window.copyAdviceToClipboard = copyAdviceToClipboard;

    // ===== Event Handlers =====
    function bindEvents() {
        // Sidebar toggles (only right sidebar can be toggled now)
        elements.sidebarRightToggle?.addEventListener('click', () => toggleSidebar('right'));
        elements.workspaceToggle?.addEventListener('click', () => toggleSidebar('right'));
        
        // Product switcher
        elements.productDropdownBtn?.addEventListener('click', toggleProductDropdown);
        $$('.product-item[data-target]').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.getAttribute('data-target');
                selectProduct(target);
            });
        });
        elements.manageTeamBtn?.addEventListener('click', () => selectProduct('team-hub'));

        const updateWizardProgressDebounced = debounce(updateClientWizardProgress, 150);
        elements.clientNextStep?.addEventListener('click', goToNextClientStep);
        elements.clientPrevStep?.addEventListener('click', goToPrevClientStep);
        elements.clientStepper?.addEventListener('click', handleClientStepClick);
        $$('#client-form input, #client-form select, #client-form textarea').forEach((input) => {
            ['input', 'change'].forEach((eventName) => {
                input.addEventListener(eventName, () => {
                    input.classList.remove('input-error');
                    updateWizardProgressDebounced();
                });
            });
        });

        elements.analysisTeamSelect?.addEventListener('change', (event) => {
            const teamId = Number(event.target.value);
            if (teamId) {
                selectTeam(teamId, { fromSelector: true });
            } else {
                state.team.current = null;
                state.team.members = [];
                state.team.latestRaci = null;
                state.team.salaryInsights = [];
                state.team.pendingTeamId = null;
                state.analysis.focusPeople = [];
                renderFocusChips();
                updateTeamSelects();
                renderTeamPreview();
                clearRaciOutput();
                renderSalaryAnalysis(null);
            }
        });
        elements.analysisQuestion?.addEventListener('input', (event) => {
            state.analysis.question = event.target.value;
        });
        elements.highlightDensity?.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value) || 1;
            state.analysis.highlightMultiplier = value;
            if (elements.highlightDensityLabel) {
                let label = 'Стандартна';
                if (value >= 2.5) {
                    label = 'Максимальна';
                } else if (value > 1) {
                    label = 'Поглиблена';
                }
                elements.highlightDensityLabel.textContent = label;
            }
        });
        elements.focusPeopleChips?.addEventListener('click', (event) => {
            const chip = event.target.closest('.chip');
            if (!chip) return;
            const action = chip.dataset.action;
            if (action === 'focus-all') {
                setAllFocusPeople();
                return;
            }
            if (action === 'focus-clear') {
                clearFocusSelection();
                return;
            }
            const name = chip.dataset.name;
            if (name) {
                toggleFocusPerson(name);
            }
        });
        elements.importTeamJsonBtn?.addEventListener('click', () => elements.teamJsonInput?.click());
        elements.teamJsonInput?.addEventListener('change', handleTeamJsonFile);
        elements.addManualMemberBtn?.addEventListener('click', () => addManualTeamMember());
        elements.teamSaveManualBtn?.addEventListener('click', saveManualTeam);
        elements.openManualTeamEditorBtn?.addEventListener('click', () => {
            selectProduct('team-hub');
            if (!state.team.manualDraft.length) {
                addManualTeamMember();
            }
        });
        elements.intelFieldInputs?.forEach((input) => {
            const field = input?.dataset?.intelField;
            if (!field) return;
            input.addEventListener('input', (event) => {
                updateIntelProfileField(field, event.target.value, event.target);
            });
            input.addEventListener('blur', (event) => {
                updateIntelProfileField(field, event.target.value.trim(), event.target);
            });
        });
        elements.intelFileInput?.addEventListener('change', (event) => {
            addIntelAssets(event.target.files);
            event.target.value = '';
        });
        elements.intelClearAssets?.addEventListener('click', (event) => {
            event.preventDefault();
            clearIntelAssets();
        });
        elements.intelProcessAssets?.addEventListener('click', (event) => {
            event.preventDefault();
            if (elements.intelProcessAssets.disabled) return;
            runIntelIngestion();
        });
        elements.intelAssetList?.addEventListener('click', (event) => {
            const removeBtn = event.target.closest('[data-action="remove-asset"]');
            if (!removeBtn) return;
            const assetId = removeBtn.dataset.assetId;
            if (assetId) removeIntelAsset(assetId);
        });
        if (elements.intelDropzone) {
            ['dragenter', 'dragover'].forEach((type) => {
                elements.intelDropzone.addEventListener(type, (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    elements.intelDropzone.classList.add('drag-active');
                });
            });
            ['dragleave', 'drop'].forEach((type) => {
                elements.intelDropzone.addEventListener(type, (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    elements.intelDropzone.classList.remove('drag-active');
                    if (type === 'drop') {
                        const droppedFiles = event.dataTransfer?.files;
                        if (droppedFiles && droppedFiles.length) {
                            addIntelAssets(droppedFiles);
                        }
                    }
                });
            });
        }
        elements.intelRosterList?.addEventListener('click', (event) => {
            const card = event.target.closest('.roster-card');
            if (!card) return;
            const memberId = card.dataset.memberId || '';
            const memberName = card.dataset.memberName || '';
            openEmployeeIntel(memberId, memberName);
        });
        if (elements.employeeIntelModal) {
            elements.employeeIntelModal.addEventListener('click', (event) => {
                if (event.target === elements.employeeIntelModal || event.target.closest('[data-action="close-employee-intel"]')) {
                    closeEmployeeIntel();
                }
            });
        }
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && elements.employeeIntelModal?.dataset.open) {
                closeEmployeeIntel();
            }
        });
        elements.teamList?.addEventListener('click', (event) => {
            const card = event.target.closest('[data-team-id]');
            if (!card) return;
            const teamId = Number(card.dataset.teamId);
            if (teamId) selectTeam(teamId);
        });
        elements.raciTeamSelect?.addEventListener('change', (event) => {
            const teamId = Number(event.target.value);
            if (teamId) {
                selectTeam(teamId, { fromSelector: true });
            }
        });
        elements.raciViewToggle?.addEventListener('click', (event) => {
            const button = event.target.closest('.toggle-btn');
            if (!button) return;
            const view = button.dataset.view || 'actual';
            setRaciView(view);
        });
        elements.generateRaciBtn?.addEventListener('click', generateRaciAnalysis);
        elements.salaryMemberSelect?.addEventListener('change', (event) => {
            prefillSalaryForm(event.target.value);
        });
        elements.generateSalaryBtn?.addEventListener('click', generateSalaryAnalysis);
        elements.manualTeamEditor?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action="remove-manual-member"]');
            if (!button) return;
            const index = Number(button.dataset.index);
            if (!Number.isNaN(index)) {
                removeManualTeamMember(index);
            }
        });
        elements.manualTeamEditor?.addEventListener('input', (event) => {
            const card = event.target.closest('[data-member-index]');
            if (!card) return;
            const index = Number(card.dataset.memberIndex);
            if (Number.isNaN(index) || !state.team.manualDraft[index]) return;
            const field = event.target.name;
            if (!field) return;
            let value = event.target.value;
            if (event.target.type === 'number') {
                value = event.target.value === '' ? '' : Number(event.target.value);
            }
            state.team.manualDraft[index][field] = value;
        });
        elements.manualTeamTitle?.addEventListener('input', (event) => {
            state.team.manualTitle = event.target.value;
        });
        elements.manualTeamDescription?.addEventListener('input', (event) => {
            state.team.manualDescription = event.target.value;
        });

        // Close product dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const teamHubTrigger = e.target.closest('[data-action="open-team-hub"]');
            if (teamHubTrigger) {
                e.preventDefault();
                selectProduct('team-hub');
                return;
            }
            if (!e.target.closest('.product-switcher')) {
                closeProductDropdown();
            }
        });

        // Client search
        elements.clientSearch?.addEventListener('input', debounce(renderClientsList, 300));

        // Client management
        elements.newClientBtn?.addEventListener('click', () => showClientForm());
        elements.welcomeNewClient?.addEventListener('click', () => showClientForm());
        elements.saveClientBtn?.addEventListener('click', saveClient);
        elements.cancelClientBtn?.addEventListener('click', () => showSection('welcome-screen'));

        // Navigation actions
        $('#help-toggle')?.addEventListener('click', () => {
            const totalSteps = $$('.onboarding-step').length || 1;
            state.onboardingStep = totalSteps;
            showOnboarding();
        });
        $('#logout-btn')?.addEventListener('click', () => {
            showCustomConfirmation(
                'Вихід з системи',
                'Ви впевнені, що хочете вийти із системи?',
                () => {
                console.log('🔐 Logout button clicked, calling logout function');
                // Use the proper logout function from auth.js
                if (window.logout) {
                    window.logout();
                } else {
                    console.error('🔐 logout function not available, falling back to manual logout');
                    // Fallback manual logout
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    window.location.href = '/login.html';
                }
            }
        );
        });

        // Onboarding
        elements.welcomeHelp?.addEventListener('click', () => {
            state.onboardingStep = 1;
            showOnboarding();
        });
        elements.skipOnboarding?.addEventListener('click', completeOnboarding);
        elements.nextStep?.addEventListener('click', nextOnboardingStep);
        elements.prevStep?.addEventListener('click', prevOnboardingStep);

        // Enhanced Recommendations Modal
        $('#open-recommendations-modal')?.addEventListener('click', openRecommendationsModal);
        $('#close-recommendations-modal')?.addEventListener('click', closeRecommendationsModal);
        $('#close-recommendations-modal-btn')?.addEventListener('click', closeRecommendationsModal);
        $('#clear-all-recommendations-btn')?.addEventListener('click', confirmClearAllRecommendations);
        $('#export-recommendations-btn')?.addEventListener('click', exportRecommendations);
        
        // Recommendations search
        $('#recommendations-search')?.addEventListener('input', debounce(() => {
            if (state.currentClient) {
                const recommendations = state.recommendationsHistory[state.currentClient.id] || [];
                updateRecommendationsTable(recommendations);
            }
        }, 300));

        // Recommendation Details Modal
        $('#close-recommendation-details-modal')?.addEventListener('click', closeRecommendationDetails);
        $('#close-recommendation-details-btn')?.addEventListener('click', closeRecommendationDetails);
        $('#save-recommendation-comment-btn')?.addEventListener('click', saveRecommendationComment);

        // Custom Confirmation Modal
        $('#confirmation-cancel-btn')?.addEventListener('click', closeConfirmationModal);

        // Close modals on click outside
        $('#recommendations-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'recommendations-modal') closeRecommendationsModal();
        });
        $('#recommendation-details-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'recommendation-details-modal') closeRecommendationDetails();
        });
        $('#confirmation-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'confirmation-modal') closeConfirmationModal();
        });

        // Input methods
        elements.textMethod?.addEventListener('click', () => updateInputMethod('text'));
        elements.fileMethod?.addEventListener('click', () => updateInputMethod('file'));

        // Text analysis
        elements.negotiationText?.addEventListener('input', debouncedUpdateTextStats);
        
        // Ensure textarea wrapper is clickable and transfers focus
        const textWrapper = document.querySelector('.text-input-wrapper');
        if (textWrapper && elements.negotiationText) {
            textWrapper.addEventListener('click', (e) => {
                // If clicking on the wrapper but not the textarea, focus the textarea
                if (e.target === textWrapper || e.target.closest('.input-actions')) {
                    return; // Don't interfere with button clicks
                }
                if (e.target !== elements.negotiationText) {
                    elements.negotiationText.focus();
                }
            });
        }
        elements.startAnalysisBtn?.addEventListener('click', startAnalysis);
        elements.newAnalysisBtn?.addEventListener('click', createNewAnalysis);
        elements.clearTextBtn?.addEventListener('click', () => {
            if (elements.negotiationText) {
                elements.negotiationText.value = '';
                updateTextStats();
            }
        });
        elements.pasteBtn?.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (elements.negotiationText) {
                    elements.negotiationText.value = text;
                    updateTextStats();
                    showNotification('Текст вставлено з буферу обміну', 'success');
                }
            } catch (err) {
                showNotification('Не вдалося вставити з буферу обміну', 'error');
            }
        });

        // View controls
        elements.listView?.addEventListener('click', () => switchHighlightsView('list'));
        elements.textView?.addEventListener('click', () => switchHighlightsView('text'));
        elements.highlightsView?.addEventListener('click', () => switchHighlightsView('highlights'));
        elements.filterView?.addEventListener('click', () => toggleFilters());

        // Filter controls
        elements.clearFiltersBtn?.addEventListener('click', clearFilters);
        elements.applyFiltersBtn?.addEventListener('click', applyFilters);

        // Workspace actions
        elements.getAdviceBtn?.addEventListener('click', getPersonalizedAdvice);
        elements.exportSelectedBtn?.addEventListener('click', exportSelectedFragments);
        elements.clearWorkspaceBtn?.addEventListener('click', clearWorkspace);

        // Analysis History Modal
        $('#close-analysis-modal')?.addEventListener('click', closeAnalysisHistoryModal);
        $('#close-analysis-modal-btn')?.addEventListener('click', closeAnalysisHistoryModal);
        $('#new-analysis-from-modal')?.addEventListener('click', () => {
            closeAnalysisHistoryModal();
            showSection('analysis-dashboard');
            createNewAnalysis();
        });
        
        // Close modal when clicking backdrop
        $('#client-analysis-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'client-analysis-modal') {
                closeAnalysisHistoryModal();
            }
        });

        // Recommendations Event Delegation
        document.addEventListener('click', handleRecommendationActions);
        
        // Keyboard shortcuts
        ensureIntelProfile();
        ensureIntelIntake();
        syncIntelInputsFromState();
        renderIntelAssets();
        setIntelProcessingStatus(state.team.intake.status || 'idle', {
            summary: state.team.intake.summary,
            highlights: state.team.intake.highlights || [],
            processedAt: state.team.intake.lastRunAt
        });
        renderIntelRoster();

        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Window resize
        window.addEventListener('resize', debounce(handleResize, 100));
    }

    function handleRecommendationActions(e) {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        switch (action) {
            case 'clear-recommendations':
                clearRecommendationsHistory();
                break;
            case 'open-recommendations-modal':
                openRecommendationsModal();
                break;
            case 'close-recommendations-modal':
                closeRecommendationsModal();
                break;
            case 'clear-all-recommendations':
                confirmClearAllRecommendations();
                break;
            case 'export-recommendations':
                exportRecommendations();
                break;
            case 'view-recommendation':
                const recId = e.target.dataset.recommendationId || e.target.closest('[data-recommendation-id]')?.dataset.recommendationId;
                if (recId) openRecommendationDetails(parseInt(recId));
                break;
            case 'delete-recommendation':
                const delId = e.target.dataset.recommendationId || e.target.closest('[data-recommendation-id]')?.dataset.recommendationId;
                if (delId) confirmDeleteRecommendation(parseInt(delId));
                break;
            case 'expand-recommendation':
                const expId = e.target.dataset.recommendationId || e.target.closest('[data-recommendation-id]')?.dataset.recommendationId;
                if (expId && state.currentClient?.id) expandRecommendation(state.currentClient.id, parseInt(expId));
                break;
            case 'close-recommendation-details':
                closeRecommendationDetails();
                break;
            case 'save-recommendation-comment':
                saveRecommendationComment();
                break;
            case 'copy-recommendation':
                const copyId = e.target.dataset.recommendationId || e.target.closest('[data-recommendation-id]')?.dataset.recommendationId;
                if (copyId) copyRecommendationToClipboard(parseInt(copyId));
                break;
            case 'close-expanded-recommendation':
                const modal = e.target.closest('.advice-modal');
                if (modal) modal.remove();
                break;
            case 'clear-filters':
                clearFilters();
                break;
            case 'add-to-workspace':
                const highlightId = e.target.dataset.highlightId || e.target.closest('[data-highlight-id]')?.dataset.highlightId;
                if (highlightId) addToWorkspace(parseInt(highlightId));
                break;
            case 'share-highlight':
                const shareId = e.target.dataset.highlightId || e.target.closest('[data-highlight-id]')?.dataset.highlightId;
                if (shareId && window.shareHighlight) window.shareHighlight(parseInt(shareId));
                break;
            case 'remove-from-workspace':
                const fragmentIndex = e.target.dataset.fragmentIndex || e.target.closest('[data-fragment-index]')?.dataset.fragmentIndex;
                if (fragmentIndex !== undefined) removeFromWorkspace(parseInt(fragmentIndex));
                break;
            case 'create-first-analysis':
                closeAnalysisHistoryModal();
                showSection('analysis-dashboard');
                createNewAnalysis();
                break;
            case 'view-analysis-from-modal':
                const viewClientId = e.target.dataset.clientId || e.target.closest('[data-client-id]')?.dataset.clientId;
                const viewAnalysisId = e.target.dataset.analysisId || e.target.closest('[data-analysis-id]')?.dataset.analysisId;
                if (viewClientId && viewAnalysisId) viewAnalysisFromModal(viewClientId, viewAnalysisId);
                break;
            case 'delete-analysis-from-modal':
                const delClientId = e.target.dataset.clientId || e.target.closest('[data-client-id]')?.dataset.clientId;
                const delAnalysisId = e.target.dataset.analysisId || e.target.closest('[data-analysis-id]')?.dataset.analysisId;
                if (delClientId && delAnalysisId) deleteAnalysisFromModal(delClientId, delAnalysisId);
                break;
            case 'reload-analysis-history':
                const reloadClientId = e.target.dataset.clientId || e.target.closest('[data-client-id]')?.dataset.clientId;
                if (reloadClientId && window.loadClientAnalysisHistory) window.loadClientAnalysisHistory(reloadClientId);
                break;
        }
    }

    function handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to start analysis
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (state.ui.currentView === 'analysis-dashboard' && !elements.startAnalysisBtn?.disabled) {
                startAnalysis();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            if (elements.onboardingModal?.style.display === 'flex') {
                completeOnboarding();
            } else if ($('#client-analysis-modal')?.style.display === 'flex') {
                closeAnalysisHistoryModal();
            }
        }
    }

    function handleResize() {
        // Update sidebar states based on screen size
        if (window.innerWidth <= 1024) {
            // Mobile layout
            elements.sidebarLeft?.classList.remove('collapsed');
            elements.sidebarRight?.classList.remove('collapsed');
            if (elements.mainContent) {
                elements.mainContent.style.marginLeft = '';
                elements.mainContent.style.marginRight = '';
            }
        } else {
            // Desktop layout
            if (state.ui.leftSidebarCollapsed) {
                elements.sidebarLeft?.classList.add('collapsed');
            }
            if (state.ui.rightSidebarCollapsed) {
                elements.sidebarRight?.classList.add('collapsed');
            }
        }
    }

    // ===== Analysis History =====
    async function loadAnalysisHistory(clientId) {
        try {
            console.log('🔄 Loading analysis history for client:', clientId);
            const response = await fetch(`/api/clients/${clientId}`);
            const data = await response.json();

            if (data.success) {
                const normalizedClient = normalizeClient(data.client);
                if (normalizedClient && state.currentClient && idsMatch(state.currentClient.id, normalizedClient.id)) {
                    state.currentClient = { ...state.currentClient, ...normalizedClient };
                    updateNavClientInfo(state.currentClient);
                    updateWorkspaceClientInfo(state.currentClient);
                }

                const normalizedAnalyses = (data.analyses || []).map(normalizeAnalysis);
                console.log('📊 Received', normalizedAnalyses.length, 'analyses from server');
                state.analyses = normalizedAnalyses; // Store in state
                renderAnalysisHistory(normalizedAnalyses);
            }
        } catch (error) {
            console.error('Failed to load analysis history:', error);
        }
    }

    async function loadAnalysisHistoryAndLatest(clientId) {
        try {
            const response = await fetch(`/api/clients/${clientId}`);
            const data = await response.json();

            if (data.success) {
                const normalizedClient = normalizeClient(data.client);
                const normalizedAnalyses = (data.analyses || []).map(normalizeAnalysis);

                if (normalizedClient && state.currentClient && idsMatch(state.currentClient.id, normalizedClient.id)) {
                    state.currentClient = { ...state.currentClient, ...normalizedClient };
                    updateNavClientInfo(state.currentClient);
                    updateWorkspaceClientInfo(state.currentClient);
                }

                console.log('📊 Loading history and latest - received', normalizedAnalyses.length, 'analyses');
                state.analyses = normalizedAnalyses; // Store in state
                renderAnalysisHistory(normalizedAnalyses);

                // If there are analyses, automatically load the latest one
                if (normalizedAnalyses.length > 0) {
                    const latestAnalysis = normalizedAnalyses[0]; // Analyses should be sorted by date descending
                    await loadAnalysis(latestAnalysis.id);
                } else {
                    // No analyses for this client - show clean dashboard state but preserve UI
                    console.log('🔍 No analyses found for current client - showing empty state');
                    state.currentAnalysis = null;
                    state.originalText = '';
                    state.selectedFragments = [];
                    
                    // Clear text input only
                    if (elements.negotiationText) {
                        elements.negotiationText.value = '';
                        updateTextStats();
                    }
                    
                    // Show empty highlights
                    if (elements.highlightsList) {
                        elements.highlightsList.innerHTML = `
                            <div class="empty-state">
                                <div class="empty-icon">
                                    <i class="fas fa-search"></i>
                                </div>
                                <p>Проблемні моменти з'являться тут після аналізу</p>
                            </div>
                        `;
                    }
                    
                    // Update workspace but DON'T reset counters and barometer
                    updateWorkspaceFragments();
                    updateWorkspaceActions();
                    updateAnalysisSteps('input');
                    
                    showNotification(`Клієнт ${state.currentClient.company} обраний. Додайте текст для аналізу.`, 'info');
                }
            }
        } catch (error) {
            console.error('Failed to load analysis history and latest:', error);
        }
    }

    function clearAnalysisDisplay() {
        // Clear current analysis state
        state.currentAnalysis = null;
        state.originalText = '';
        state.selectedFragments = [];
        
        // Clear text input
        if (elements.negotiationText) {
            elements.negotiationText.value = '';
            updateTextStats();
        }
        
        // Hide results section
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'none';
        }
        
        // Clear highlights
        if (elements.highlightsList) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <p>Проблемні моменти з'являться тут після аналізу</p>
                </div>
            `;
        }
        
        // Reset counters
        const counters = ['manipulations-count', 'biases-count', 'fallacies-count', 'recommendations-count'];
        counters.forEach(counterId => {
            const element = $(`#${counterId}`);
            if (element) element.textContent = '0';
        });
        
        // Reset barometer
        if (elements.barometerScore) elements.barometerScore.textContent = '—';
        if (elements.barometerLabel) elements.barometerLabel.textContent = 'Очікування аналізу...';
        if (elements.barometerComment) elements.barometerComment.textContent = '';
        
        // Update workspace
        updateWorkspaceFragments();
        updateWorkspaceActions();
        
        // Reset analysis steps
        updateAnalysisSteps('input');
    }

    function renderAnalysisHistory(analyses) {
        // Analysis history is now only displayed in modal, not in left sidebar
        console.log('📊 Analysis history loaded:', analyses.length, 'analyses (sidebar display removed)');
        // Store analyses in state for modal use
        state.analyses = analyses;
    }

    function getTimeAgo(date) {
        const now = new Date();
        const diffInMilliseconds = now - date;
        const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Щойно';
        if (diffInMinutes === 1) return '1 хв тому';
        if (diffInMinutes < 60) return `${diffInMinutes} хв тому`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours === 1) return '1 год тому';
        if (diffInHours < 24) return `${diffInHours} год тому`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Вчора';
        if (diffInDays < 7) return `${diffInDays} дн тому`;
        
        // For older dates, show formatted date with time
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('uk-UA', options);
    }

    function getComplexityLevel(score) {
        if (score >= 80) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }

    async function confirmDeleteAnalysis(analysisId) {
        showCustomConfirmation(
            'Видалення аналізу',
            'Видалити цей аналіз? Цю дію неможливо скасувати.',
            async () => {
                try {
                    const response = await fetch(`/api/analyses/${analysisId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || 'Помилка видалення аналізу');
                    }

                    // If deleted analysis was current, clear it
                    if (state.currentAnalysis?.id === analysisId) {
                        clearAnalysisDisplay();
                    }

                    // Reload analysis history for current client
                    if (state.currentClient) {
                        await loadAnalysisHistoryAndLatest(state.currentClient.id);
                    }

                    showNotification('Аналіз видалено успішно', 'success');

                } catch (error) {
                    console.error('Delete analysis error:', error);
                    showNotification(error.message || 'Помилка при видаленні аналізу', 'error');
                }
            }
        );
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ===== Analysis Loading =====
    async function loadAnalysis(analysisId) {
        try {
            const response = await fetch(`/api/clients/${state.currentClient.id}/analysis/${analysisId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка завантаження аналізу');
            }

            const normalizedAnalysis = normalizeAnalysis(data.analysis);

            // Set the loaded analysis as current
            state.currentAnalysis = normalizedAnalysis;
            state.originalText = normalizedAnalysis.original_text || '';
            
            // Clear current text and show the analysis text
            if (elements.negotiationText) {
                elements.negotiationText.value = state.originalText;
                updateTextStats();
            }
            
            // Show results section
            if (elements.resultsSection) {
                elements.resultsSection.style.display = 'block';
            }
            
            // Update displays with loaded analysis using displayAnalysisResults
            displayAnalysisResults(normalizedAnalysis);
            
            // Update full text view with highlighting
            if (normalizedAnalysis.highlighted_text) {
                console.log('🔍 Loading analysis with pre-generated highlighted text');
                updateFullTextView(data.analysis.highlighted_text);
            } else if (data.analysis.highlights && state.originalText) {
                console.log('🔍 Generating highlighted text from highlights and original text');
                const highlightedText = generateHighlightedText(state.originalText, data.analysis.highlights);
                updateFullTextView(highlightedText);
                
                // Also store it in current analysis for future use
                state.currentAnalysis.highlighted_text = highlightedText;
            } else {
                console.log('🔍 No highlighting data available, showing plain text');
                updateFullTextView(escapeHtml(state.originalText || ''));
            }
            
            // Update analysis steps to show completed
            updateAnalysisSteps('completed');
            
            // Clear workspace if switching analyses
            state.selectedFragments = [];
            updateWorkspaceFragments();
            updateWorkspaceActions();
            
            showNotification(`Аналіз від ${formatDate(data.analysis.created_at)} завантажено`, 'success');
            
        } catch (error) {
            console.error('Load analysis error:', error);
            showNotification(error.message || 'Помилка завантаження аналізу', 'error');
        }
    }

    async function createNewAnalysis() {
        if (!state.currentClient) {
            showNotification('Спочатку оберіть клієнта', 'warning');
            return;
        }
        
        // Clear current analysis state
        state.currentAnalysis = null;
        state.originalText = null;
        state.selectedFragments = [];
        
        // Clear UI
        if (elements.negotiationText) {
            elements.negotiationText.value = '';
            updateTextStats();
        }
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'none';
        }
        if (elements.highlightsList) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <p>Проблемні моменти з'являться тут після аналізу</p>
                </div>
            `;
        }
        if (elements.fulltextContent) {
            elements.fulltextContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-text"></i></div>
                    <p>Повний текст з підсвічуванням з'явиться тут після аналізу</p>
                </div>
            `;
        }
        
        updateWorkspaceFragments();
        updateWorkspaceActions();
        
        showNotification('Новий аналіз створено. Введіть текст для початку.', 'info');
    }

    async function editClient(clientId, event) {
        console.log('✏️ editClient called with ID:', clientId);
        console.log('✏️ Event object:', event);
        
        // Stop event propagation to prevent client selection
        if (event) {
            event.stopPropagation();
        }
        
        try {
            const client = state.clients.find(c => idsMatch(c.id, clientId));
            console.log('✏️ Found client for editing:', client ? client.company : 'NOT FOUND');
            
            if (!client) {
                console.error('❌ Client not found for editing with ID:', clientId);
                showNotification('Клієнт не знайдений', 'error');
                return;
            }
            
            console.log('✏️ Opening client form for editing...');
            showClientForm(clientId);
        } catch (error) {
            console.error('❌ Edit client error:', error);
            showNotification('Помилка при редагуванні клієнта', 'error');
        }
    }

    function showDeleteClientModal(clientId) {
        console.log('🗑️ showDeleteClientModal called with ID:', clientId);
        
        const client = state.clients.find(c => idsMatch(c.id, clientId));
        if (!client) {
            console.error('❌ Client not found for deletion with ID:', clientId);
            showNotification('Клієнт не знайдений', 'error');
            return;
        }

        // Create delete confirmation modal
        const modal = document.createElement('div');
        modal.className = 'advice-modal'; // Reuse existing modal styles
        modal.innerHTML = `
            <div class="advice-content" style="max-width: 500px;">
                <div class="advice-header">
                    <h3><i class="fas fa-exclamation-triangle" style="color: var(--neon-pink);"></i> Підтвердження видалення</h3>
                    <button class="close-advice" aria-label="Закрити">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body">
                    <p><strong>Ви дійсно хочете видалити клієнта?</strong></p>
                    <div class="client-info-preview">
                        <div class="client-avatar">${(client.company || 'C')[0].toUpperCase()}</div>
                        <div>
                            <div class="client-name"><strong>${client.company || 'Без назви'}</strong></div>
                            <div class="client-meta">${client.sector || 'Без сектору'}</div>
                        </div>
                    </div>
                    <p style="color: var(--neon-pink); margin-top: 1rem;">
                        <i class="fas fa-warning"></i> 
                        <strong>Увага:</strong> Всі аналізи цього клієнта також будуть видалені. Цю дію неможливо скасувати.
                    </p>
                </div>
                <div class="advice-actions">
                    <button class="btn-secondary cancel-delete-btn">
                        <i class="fas fa-times"></i> Скасувати
                    </button>
                    <button class="btn-danger confirm-delete-btn" data-client-id="${clientId}">
                        <i class="fas fa-trash"></i> Видалити клієнта
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-advice').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-delete-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.confirm-delete-btn').addEventListener('click', () => {
            modal.remove();
            performDeleteClient(clientId);
        });

        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async function deleteClient(clientId, event) {
        console.log('🗑️ deleteClient called with ID:', clientId);
        
        // Stop event propagation to prevent client selection
        if (event) {
            event.stopPropagation();
        }
        
        // Show confirmation modal instead of browser confirm
        showDeleteClientModal(clientId);
    }

    async function performDeleteClient(clientId) {
        console.log('🗑️ performDeleteClient called with ID:', clientId);
        try {
            const client = state.clients.find(c => idsMatch(c.id, clientId));
            console.log('🗑️ Found client for deletion:', client ? client.company : 'NOT FOUND');

            console.log('🗑️ Sending delete request...');
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            console.log('🗑️ Delete response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Помилка видалення клієнта');
            }

            // Update state
            state.clients = state.clients.filter(c => c.id !== clientId);
            
            // Cascade delete: Remove all recommendations for this client
            if (state.recommendationsHistory[clientId]) {
                const recommendationsCount = state.recommendationsHistory[clientId].length;
                delete state.recommendationsHistory[clientId];
                console.log(`🗑️ Cascade delete: Removed ${recommendationsCount} recommendations for client ${clientId}`);
                scheduleStateSave();
            }
            
            // Cascade delete: Remove all analyses for this client
            if (state.analysisHistory[clientId]) {
                const analysesCount = state.analysisHistory[clientId].length;
                delete state.analysisHistory[clientId];
                console.log(`🗑️ Cascade delete: Removed ${analysesCount} analyses for client ${clientId}`);
                scheduleStateSave();
            }
            
            // If deleted client was current, clear selection
            if (state.currentClient?.id != null && idsMatch(state.currentClient.id, clientId)) {
                state.currentClient = null;
                state.currentAnalysis = null;
                state.selectedFragments = [];
                updateNavClientInfo(null);
                updateWorkspaceClientInfo(null);
                updateWorkspaceFragments();
                showSection('welcome-screen');
            }

            // Re-render clients list
            renderClientsList();
            updateClientCount();

            showNotification(`Клієнт "${client.company}" видалено успішно`, 'success');

        } catch (error) {
            console.error('Delete client error:', error);
            showNotification(error.message || 'Помилка при видаленні клієнта', 'error');
        }
    }

    // ===== Global Functions =====
    window.showClientForm = showClientForm;
    window.selectClient = selectClient;
    window.editClient = editClient;
    window.deleteClient = deleteClient;
    window.addToWorkspace = addToWorkspace;
    window.removeFromWorkspace = removeFromWorkspace;
    window.shareHighlight = (id) => console.log('Share highlight:', id);
    window.loadAnalysis = loadAnalysis;
    window.createNewAnalysis = createNewAnalysis;
    window.clearFilters = clearFilters;
    window.confirmDeleteAnalysis = confirmDeleteAnalysis;
    window.removeRecommendation = removeRecommendation;
    window.expandRecommendation = expandRecommendation;
    window.copyRecommendation = copyRecommendation;
    window.clearRecommendationsHistory = clearRecommendationsHistory;
    window.confirmClearRecommendations = confirmClearRecommendations;
    
    // Enhanced recommendations functions
    window.openRecommendationsModal = openRecommendationsModal;
    window.closeRecommendationsModal = closeRecommendationsModal;
    window.openRecommendationDetails = openRecommendationDetails;
    window.closeRecommendationDetails = closeRecommendationDetails;
    window.saveRecommendationComment = saveRecommendationComment;
    window.confirmDeleteRecommendation = confirmDeleteRecommendation;
    window.confirmClearAllRecommendations = confirmClearAllRecommendations;
    window.exportRecommendations = exportRecommendations;
    window.showCustomConfirmation = showCustomConfirmation;
    window.closeConfirmationModal = closeConfirmationModal;
    
    // ===== Debug Testing Functions =====
    window.testClientFunctions = function() {
        console.log('🧪 Testing client functions availability:');
        console.log('🧪 selectClient:', typeof window.selectClient);
        console.log('🧪 editClient:', typeof window.editClient);
        console.log('🧪 deleteClient:', typeof window.deleteClient);
        console.log('🧪 Current clients:', state.clients.length);
        if (state.clients.length > 0) {
            console.log('🧪 Testing selectClient with first client...');
            window.selectClient(state.clients[0].id);
        }
    };
    
    window.testEditClient = function(clientId) {
        console.log('🧪 Testing editClient with ID:', clientId);
        window.editClient(clientId || (state.clients[0] && state.clients[0].id));
    };
    
    window.testDeleteClient = function(clientId) {
        console.log('🧪 Testing deleteClient with ID:', clientId);
        window.deleteClient(clientId || (state.clients[0] && state.clients[0].id));
    };

    // ===== State Persistence =====
    function saveAppState() {
        const appState = {
            currentClient: state.currentClient,
            currentAnalysis: state.currentAnalysis,
            selectedFragments: state.selectedFragments,
            recommendationsHistory: state.recommendationsHistory,
            originalText: state.originalText,
            ui: state.ui,
            clients: state.clients, // Include clients for backup
            tokenUsage: state.tokenUsage,
            analysisPreferences: {
                focusPeople: state.analysis.focusPeople,
                question: state.analysis.question,
                highlightMultiplier: state.analysis.highlightMultiplier
            },
            teamContext: {
                currentTeamId: state.team.current?.id || null
            },
            timestamp: new Date().toISOString(),
            version: '1.0' // For future migration compatibility
        };
        
        try {
            const serialized = JSON.stringify(appState);
            
            // Check localStorage availability and space
            if (typeof Storage === "undefined") {
                throw new Error('LocalStorage не підтримується');
            }
            
            // Try to save main state
            localStorage.setItem('teampulse-app-state', serialized);
            
            // Create rotating backup (keep last 3 saves)
            const backupKey = `teampulse-backup-${Date.now() % 3}`;
            localStorage.setItem(backupKey, serialized);
            
            // Clean old backups
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('teampulse-backup-') && 
                    !['teampulse-backup-0', 'teampulse-backup-1', 'teampulse-backup-2'].includes(key)) {
                    localStorage.removeItem(key);
                }
            }
            
        } catch (e) {
            console.warn('Failed to save app state:', e);
            
            // Try to free up space by removing old data
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('teampulse-old-') || key.includes('temp'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                // Try saving again
                localStorage.setItem('teampulse-app-state', JSON.stringify(appState));
            } catch (e2) {
                showNotification('Помилка збереження даних. Місце на диску вичерпано.', 'error');
            }
        }
    }

    function loadAppState() {
        let appState = null;
        let attempts = 0;
        
        // Try to load main state, then backups if main fails
        const stateKeys = ['teampulse-app-state', 'teampulse-backup-0', 'teampulse-backup-1', 'teampulse-backup-2'];
        
        for (const key of stateKeys) {
            attempts++;
            try {
                const savedState = localStorage.getItem(key);
                if (!savedState) continue;
                
                const parsedState = JSON.parse(savedState);
                
                // Validate required properties
                if (!parsedState.timestamp) continue;
                
                // Check if state is not too old (max 7 days for backups, 24 hours for main)
                const savedTime = new Date(parsedState.timestamp);
                const now = new Date();
                const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
                const maxAge = key === 'teampulse-app-state' ? 24 : 168; // 7 days for backups
                
                if (hoursDiff > maxAge) {
                    if (key === 'teampulse-app-state') {
                        localStorage.removeItem(key);
                    }
                    continue;
                }
                
                // Found valid state
                appState = parsedState;
                if (key !== 'teampulse-app-state') {
                    console.log(`🔄 Recovered from backup: ${key}`);
                    showNotification('Відновлено з резервної копії', 'success');
                }
                break;
                
            } catch (e) {
                console.warn(`Failed to load state from ${key}:`, e);
                continue;
            }
        }
        
        if (!appState) {
            console.log('No valid app state found');
            return false;
        }
        
        try {
            // Safely restore state with validation
            
            // Restore client info
            if (appState.currentClient && typeof appState.currentClient === 'object') {
                state.currentClient = normalizeClient(appState.currentClient);
                try {
                    updateNavClientInfo(state.currentClient);
                    updateWorkspaceClientInfo(state.currentClient);
                } catch (e) {
                    console.warn('Error updating client info:', e);
                }
            }

            // Restore clients list if available
            if (appState.clients && Array.isArray(appState.clients)) {
                state.clients = appState.clients.map(normalizeClient);
                try {
                    renderClientsList();
                    updateClientCount();
                } catch (e) {
                    console.warn('Error rendering clients list on restore:', e);
                }
            }
            
            // Restore token usage if available
            if (appState.tokenUsage && typeof appState.tokenUsage === 'object') {
                state.tokenUsage = { ...state.tokenUsage, ...appState.tokenUsage };
                updateTokenDisplay();
            }
            
            // Restore analysis
            if (appState.currentAnalysis && typeof appState.currentAnalysis === 'object') {
                state.currentAnalysis = appState.currentAnalysis;
                if (appState.originalText && typeof appState.originalText === 'string') {
                    state.originalText = appState.originalText;
                }
                
                // Restore analysis UI safely
                try {
                    if (elements.negotiationText) {
                        elements.negotiationText.value = state.originalText || '';
                        updateTextStats();
                    }
                    
                    if (elements.resultsSection) {
                        elements.resultsSection.style.display = 'block';
                    }
                    
                    // Restore displays with error handling
                    if (state.currentAnalysis.highlights) {
                        updateHighlightsDisplay(state.currentAnalysis.highlights);
                    }
                    if (state.currentAnalysis.summary) {
                        updateSummaryDisplay(state.currentAnalysis.summary);
                    }
                    if (state.currentAnalysis.barometer) {
                        updateBarometerDisplay(state.currentAnalysis.barometer);
                    }
                    
                    updateAnalysisSteps('completed');
                    showSection('analysis-dashboard');
                } catch (e) {
                    console.warn('Error restoring analysis UI:', e);
                }
            }

            if (appState.analysisPreferences) {
                state.analysis.focusPeople = Array.isArray(appState.analysisPreferences.focusPeople)
                    ? appState.analysisPreferences.focusPeople
                    : [];
                state.analysis.question = appState.analysisPreferences.question || '';
                state.analysis.highlightMultiplier = appState.analysisPreferences.highlightMultiplier || 1;

                if (elements.analysisQuestion) {
                    elements.analysisQuestion.value = state.analysis.question;
                }
                if (elements.highlightDensity) {
                    elements.highlightDensity.value = state.analysis.highlightMultiplier;
                    elements.highlightDensity.dispatchEvent(new Event('input'));
                }
                renderFocusChips();
            }

            if (appState.teamContext && appState.teamContext.currentTeamId) {
                state.team.pendingTeamId = appState.teamContext.currentTeamId;
            }

            // Restore selected fragments
            if (appState.selectedFragments && Array.isArray(appState.selectedFragments)) {
                state.selectedFragments = appState.selectedFragments;
                try {
                    updateWorkspaceFragments();
                    updateWorkspaceActions();
                } catch (e) {
                    console.warn('Error updating workspace fragments:', e);
                }
            }
            
            // Restore recommendations history
            if (appState.recommendationsHistory && typeof appState.recommendationsHistory === 'object') {
                state.recommendationsHistory = appState.recommendationsHistory;
            }
            
            // Restore UI state
            if (appState.ui && typeof appState.ui === 'object') {
                Object.assign(state.ui, appState.ui);
            }
            
            return true;
        } catch (e) {
            console.warn('Failed to load app state:', e);
            return false;
        }
    }

    // Auto-save state on important changes
    function scheduleStateSave() {
        clearTimeout(scheduleStateSave.timeout);
        scheduleStateSave.timeout = setTimeout(saveAppState, 1000);
    }

    // ===== Analysis History Modal Functions =====
    function openAnalysisHistoryModal(client) {
        if (!client) return;
        
        console.log('🔍 Opening analysis history modal for:', client.company);
        
        const modal = $('#client-analysis-modal');
        const modalClientName = $('#modal-client-name');
        const modalLoading = $('#modal-loading');
        const modalAnalysisList = $('#modal-analysis-list');
        
        if (!modal) return;
        
        // Set client name
        if (modalClientName) {
            modalClientName.textContent = `— ${client.company}`;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Show loading state
        if (modalLoading) {
            modalLoading.style.display = 'flex';
        }
        if (modalAnalysisList) {
            modalAnalysisList.innerHTML = '<div class="loading-state" id="modal-loading"><div class="loading-spinner"></div><p>Завантаження аналізів...</p></div>';
        }
        
        // Load analysis history
        loadClientAnalysisHistory(client.id);
    }
    
    async function loadClientAnalysisHistory(clientId) {
        try {
            const response = await fetch(`/api/clients/${clientId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch client analysis history');
            }
            
            const data = await response.json();
            console.log('🔍 Loaded client analysis history:', data);

            if (data.success) {
                const normalizedClient = normalizeClient(data.client);
                const normalizedAnalyses = (data.analyses || []).map(normalizeAnalysis);
                displayAnalysisHistoryInModal(normalizedClient, normalizedAnalyses);
            } else {
                throw new Error(data.error || 'Failed to load analysis history');
            }
        } catch (error) {
            console.error('Error loading analysis history:', error);
            showAnalysisHistoryError('Помилка завантаження історії аналізів');
        }
    }
    
    function displayAnalysisHistoryInModal(client, analyses) {
        const modalTotalAnalyses = $('#modal-total-analyses');
        const modalAvgComplexity = $('#modal-avg-complexity');
        const modalLastAnalysis = $('#modal-last-analysis');
        const modalAnalysisList = $('#modal-analysis-list');
        
        // Update stats
        if (modalTotalAnalyses) {
            modalTotalAnalyses.textContent = analyses.length;
        }
        
        if (modalAvgComplexity && analyses.length > 0) {
            const avgComplexity = analyses.reduce((sum, analysis) => {
                return sum + (analysis.complexity_score || 0);
            }, 0) / analyses.length;
            modalAvgComplexity.textContent = Math.round(avgComplexity);
        }
        
        if (modalLastAnalysis && analyses.length > 0) {
            const lastAnalysis = new Date(analyses[0].created_at);
            modalLastAnalysis.textContent = formatDate(lastAnalysis);
        }
        
        // Display analysis list
        if (modalAnalysisList) {
            if (analyses.length === 0) {
                modalAnalysisList.innerHTML = `
                    <div class="empty-analysis-state">
                        <i class="fas fa-chart-line"></i>
                        <p>Ще немає аналізів для цього клієнта</p>
                        <button class="btn-primary btn-sm" data-action="create-first-analysis">
                            <i class="fas fa-plus"></i>
                            Створити перший аналіз
                        </button>
                    </div>
                `;
            } else {
                modalAnalysisList.innerHTML = analyses.map(analysis => `
                    <div class="analysis-item" data-analysis-id="${analysis.id}">
                        <div class="analysis-info">
                            <div class="analysis-title">${escapeHtml(analysis.title)}</div>
                            <div class="analysis-meta">
                                <div class="analysis-date">
                                    <i class="fas fa-calendar"></i>
                                    ${formatDate(new Date(analysis.created_at))}
                                </div>
                                ${analysis.complexity_score ? `
                                    <div class="analysis-complexity">
                                        <i class="fas fa-tachometer-alt"></i>
                                        ${analysis.complexity_score}/100
                                    </div>
                                ` : ''}
                                ${analysis.source === 'file' && analysis.original_filename ? `
                                    <div class="analysis-source">
                                        <i class="fas fa-file"></i>
                                        ${escapeHtml(analysis.original_filename)}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="analysis-actions">
                            <button class="action-btn view" data-action="view-analysis-from-modal" data-client-id="${client.id}" data-analysis-id="${analysis.id}" title="Переглянути аналіз">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn delete" data-action="delete-analysis-from-modal" data-client-id="${client.id}" data-analysis-id="${analysis.id}" title="Видалити аналіз">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        // Set up search functionality
        setupAnalysisSearch(analyses);
    }
    
    function setupAnalysisSearch(analyses) {
        const searchInput = $('#analysis-search');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterAnalysisDisplay(analyses, searchTerm);
        });
    }
    
    function filterAnalysisDisplay(analyses, searchTerm) {
        const modalAnalysisList = $('#modal-analysis-list');
        if (!modalAnalysisList) return;
        
        const filteredAnalyses = analyses.filter(analysis => 
            analysis.title.toLowerCase().includes(searchTerm) ||
            (analysis.original_filename && analysis.original_filename.toLowerCase().includes(searchTerm)) ||
            new Date(analysis.created_at).toLocaleDateString().includes(searchTerm)
        );
        
        if (filteredAnalyses.length === 0) {
            modalAnalysisList.innerHTML = `
                <div class="empty-analysis-state">
                    <i class="fas fa-search"></i>
                    <p>Не знайдено аналізів за запитом "${escapeHtml(searchTerm)}"</p>
                </div>
            `;
        } else {
            modalAnalysisList.innerHTML = filteredAnalyses.map(analysis => `
                <div class="analysis-item" data-analysis-id="${analysis.id}">
                    <div class="analysis-info">
                        <div class="analysis-title">${escapeHtml(analysis.title)}</div>
                        <div class="analysis-meta">
                            <div class="analysis-date">
                                <i class="fas fa-calendar"></i>
                                ${formatDate(new Date(analysis.created_at))}
                            </div>
                            ${analysis.complexity_score ? `
                                <div class="analysis-complexity">
                                    <i class="fas fa-tachometer-alt"></i>
                                    ${analysis.complexity_score}/100
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="analysis-actions">
                        <button class="action-btn view" data-action="view-analysis-from-modal" data-client-id="${state.currentClient?.id}" data-analysis-id="${analysis.id}" title="Переглянути аналіз">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn delete" data-action="delete-analysis-from-modal" data-client-id="${state.currentClient?.id}" data-analysis-id="${analysis.id}" title="Видалити аналіз">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    function showAnalysisHistoryError(message) {
        const modalAnalysisList = $('#modal-analysis-list');
        if (modalAnalysisList) {
            modalAnalysisList.innerHTML = `
                <div class="empty-analysis-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${escapeHtml(message)}</p>
                    <button class="btn-secondary btn-sm" data-action="reload-analysis-history" data-client-id="${state.currentClient?.id}">
                        <i class="fas fa-refresh"></i>
                        Спробувати знову
                    </button>
                </div>
            `;
        }
    }
    
    function closeAnalysisHistoryModal() {
        const modal = $('#client-analysis-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Clear search
        const searchInput = $('#analysis-search');
        if (searchInput) {
            searchInput.value = '';
        }
    }
    
    async function viewAnalysisFromModal(clientId, analysisId) {
        console.log('🔍 Loading analysis:', clientId, analysisId);
        
        try {
            // Close modal first
            closeAnalysisHistoryModal();
            
            // Load the analysis
            const response = await fetch(`/api/clients/${clientId}/analysis/${analysisId}`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load analysis');
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Update current analysis state
                state.currentAnalysis = data.analysis;
                
                // Show analysis dashboard
                showView('analysis-dashboard');
                
                // Display the analysis results
                displayAnalysisResults(data.analysis);
                
                // Show results section
                if (elements.resultsSection) {
                    elements.resultsSection.style.display = 'block';
                }
                
                showNotification('Аналіз завантажено успішно', 'success');
            } else {
                throw new Error(data.error || 'Failed to load analysis');
            }
        } catch (error) {
            console.error('Error loading analysis:', error);
            showNotification('Помилка завантаження аналізу', 'error');
        }
    }
    
    async function deleteAnalysisFromModal(clientId, analysisId) {
        showCustomConfirmation(
            'Видалення аналізу',
            'Ви впевнені, що хочете видалити цей аналіз? Цю дію неможливо скасувати.',
            async () => {
                try {
                    const response = await fetch(`/api/clients/${clientId}/analysis/${analysisId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to delete analysis');
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showNotification('Аналіз видалено успішно', 'success');
                        
                        // Reload the analysis history
                        loadClientAnalysisHistory(clientId);
                        
                        // Refresh analyses list in sidebar
                        if (state.currentClient) {
                            loadAnalysisHistory(state.currentClient.id);
                        }
                    } else {
                        throw new Error(data.error || 'Failed to delete analysis');
                    }
                } catch (error) {
                    console.error('Error deleting analysis:', error);
                    showNotification('Помилка видалення аналізу', 'error');
                }
            }
        );
    }
    
    function formatDate(date) {
        // Ensure date is a Date object
        const dateObj = date instanceof Date ? date : new Date(date);
        const now = new Date();
        const diffMs = now - dateObj;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Сьогодні';
        } else if (diffDays === 1) {
            return 'Вчора';
        } else if (diffDays < 7) {
            return `${diffDays} дн. тому`;
        } else {
            return dateObj.toLocaleDateString('uk-UA');
        }
    }

    
    // ===== Team Hub Utilities =====
    async function loadTeamsForClient(clientId, { preserveSelection = false } = {}) {
        if (!clientId) {
            state.team.list = [];
            state.team.current = null;
            state.team.members = [];
            state.team.latestRaci = null;
            state.team.salaryInsights = [];
            renderTeamList();
            updateTeamSelects();
            renderTeamPreview();
            renderFocusChips();
            ensureIntelProfile();
            ensureIntelIntake();
            syncIntelInputsFromState();
            setIntelProcessingStatus('idle');
            renderIntelRoster();
            return;
        }

        try {
            const response = await fetch(`/api/teams/client/${clientId}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Не вдалося завантажити команди');
            }

            state.team.list = Array.isArray(data.teams) ? data.teams : [];

            renderTeamList();
            updateTeamSelects();

            if (state.team.current && !state.team.list.find(team => team.id === state.team.current.id)) {
                state.team.current = null;
                state.team.members = [];
                state.team.latestRaci = null;
                state.team.salaryInsights = [];
            }

            if (state.team.pendingTeamId) {
                const pendingId = state.team.pendingTeamId;
                state.team.pendingTeamId = null;
                if (state.team.list.find(team => team.id === pendingId)) {
                    await selectTeam(pendingId, { silent: true });
                    return;
                }
            }

            if (!state.team.current && state.team.list.length && !preserveSelection) {
                await selectTeam(state.team.list[0].id, { silent: true });
            } else {
                renderTeamPreview();
                renderFocusChips();
                ensureIntelIntake();
                syncIntelInputsFromState();
                setIntelProcessingStatus(state.team.intake.status || 'idle', {
                    summary: state.team.intake.summary,
                    highlights: state.team.intake.highlights || [],
                    processedAt: state.team.intake.lastRunAt
                });
                renderIntelRoster();
            }
        } catch (error) {
            console.error('❌ loadTeamsForClient error:', error);
            showNotification('Не вдалося завантажити команди клієнта', 'error');
        }
    }

    function renderTeamList() {
        const container = elements.teamList;
        if (!container) return;

        const teams = state.team.list || [];
        if (!teams.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-users"></i></div>
                    <p>Створіть або імпортуйте першу команду</p>
                </div>
            `;
            return;
        }

        container.innerHTML = teams.map(team => {
            const isActive = state.team.current?.id === team.id;
            const updatedAt = team.updated_at ? new Date(team.updated_at) : null;
            const formattedDate = updatedAt ? updatedAt.toLocaleDateString('uk-UA') : '';
            return `
                <div class="team-card ${isActive ? 'active' : ''}" data-team-id="${team.id}">
                    <div class="team-card-header">
                        <div>
                            <h3>${team.title || 'Команда без назви'}</h3>
                            <p class="team-description">${team.description || 'Без опису'}</p>
                        </div>
                        <span class="team-count"><i class="fas fa-user-friends"></i> ${team.member_count || 0}</span>
                    </div>
                    <div class="team-card-meta">
                        ${formattedDate ? `<span><i class="fas fa-clock"></i> ${formattedDate}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function selectTeam(teamId, { fromSelector = false, silent = false } = {}) {
        if (!teamId || !state.currentClient) return;

        try {
            const response = await fetch(`/api/teams/${teamId}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Не вдалося завантажити команду');
            }

            const prevTeamId = state.team.current?.id;
            const team = data.team || {};
            team.raw_payload = toObject(team.raw_payload);
            state.team.current = team;
            if (prevTeamId !== team.id) {
                state.team.lastRaciMeta = null;
                state.team.lastSalaryMeta = null;
            }
            state.team.members = (team.members || []).map(member => {
                const responsibilities = Array.isArray(member.responsibilities)
                    ? member.responsibilities
                    : (member.responsibilities || '').split('\n').filter(Boolean);
                const compensation = member.compensation_amount != null
                    ? {
                        amount: Number(member.compensation_amount),
                        currency: member.compensation_currency
                    }
                    : member.compensation || null;

                return {
                    id: member.id,
                    name: member.name || member.full_name || member.fullName || '',
                    role: member.role || '',
                    seniority: member.seniority || '',
                    location: member.location || '',
                    responsibilities,
                    workload_percent: member.workload_percent != null ? Number(member.workload_percent) : null,
                    compensation,
                    metadata: member.metadata || member.raw_metadata || {},
                    raci_actual: member.metadata?.raci_actual || member.raci_actual || null,
                    raci_ideal: member.metadata?.raci_ideal || member.raci_ideal || null,
                    tags: member.metadata?.tags || member.tags || []
                };
            });

            state.team.latestRaci = data.latest_raci || null;
            state.team.salaryInsights = Array.isArray(data.salary_insights) ? data.salary_insights : [];

            const intakePayload = team.raw_payload?.intelligence_intake || {};
            ensureIntelProfile();
            ensureIntelIntake();

            if (intakePayload.profile && typeof intakePayload.profile === 'object') {
                const profile = intakePayload.profile;
                if (profile.company) {
                    state.team.profile.company_name = profile.company.name || state.team.profile.company_name;
                    state.team.profile.company_industry = profile.company.industry || state.team.profile.company_industry;
                    state.team.profile.company_location = profile.company.location || state.team.profile.company_location;
                    state.team.profile.company_focus = profile.company.focus || state.team.profile.company_focus;
                }
                if (profile.team) {
                    state.team.profile.team_name = profile.team.title || state.team.profile.team_name;
                    state.team.profile.team_mission = profile.team.mission || state.team.profile.team_mission;
                    if (Array.isArray(profile.team.tags)) {
                        state.team.profile.team_tags = profile.team.tags.join(', ');
                    }
                }
            }

            state.team.intake.summary = intakePayload.summary || state.team.intake.summary || '';
            state.team.intake.highlights = Array.isArray(intakePayload.highlights)
                ? intakePayload.highlights
                : (state.team.intake.highlights || []);
            state.team.intake.lastRunAt = intakePayload.processed_at || intakePayload.processedAt || state.team.intake.lastRunAt;
            state.team.intake.status = intakePayload.summary ? 'success' : (state.team.intake.status || 'idle');

            syncIntelInputsFromState();

            renderTeamList();
            updateTeamSelects();
            prefillSalaryForm(elements.salaryMemberSelect?.value);
            renderTeamPreview();

            const memberNames = state.team.members.map(member => member.name).filter(Boolean);
            state.analysis.focusPeople = state.analysis.focusPeople.filter(name => memberNames.includes(name));
            if (!state.analysis.focusPeople.length && memberNames.length) {
                state.analysis.focusPeople = memberNames.slice(0, Math.min(3, memberNames.length));
            }
            renderFocusChips();

            if (!silent && !fromSelector) {
                showNotification(`Активна команда: ${team.title || 'без назви'}`, 'success');
            }

            if (state.team.latestRaci) {
                renderRaciOutput(state.team.latestRaci);
            } else {
                clearRaciOutput();
            }
            setIntelProcessingStatus(state.team.intake.status || 'idle', {
                summary: state.team.intake.summary,
                highlights: state.team.intake.highlights,
                processedAt: state.team.intake.lastRunAt
            });
            renderIntelRoster();

            renderSalaryInsightsHistory();
            const latestSalary = state.team.salaryInsights?.[0];
            if (latestSalary && (latestSalary.analysis || latestSalary.utilization)) {
                renderSalaryAnalysis(latestSalary.analysis || latestSalary);
            }
        } catch (error) {
            console.error('❌ selectTeam error:', error);
            if (!silent) {
                showNotification('Не вдалося завантажити команду', 'error');
            }
        }
    }

    function renderTeamPreview() {
        const container = elements.teamPreview;
        if (!container) return;

        const team = state.team.current;
        if (!team) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-diagram-project"></i></div>
                    <p>Оберіть команду щоб побачити структуру</p>
                </div>
            `;
            return;
        }

        const members = state.team.members || [];
        container.innerHTML = `
            <div class="team-preview-header">
                <h3>${team.title || 'Команда без назви'}</h3>
                <span>${members.length} учасників</span>
            </div>
            <p class="team-preview-description">${team.description || 'Без опису'}</p>
            <div class="team-preview-members">
                ${members.map(member => `
                    <div class="team-preview-member">
                        <div>
                            <strong>${member.name || 'Невідомий'}</strong>
                            <span>${member.role || ''}</span>
                        </div>
                        <div class="member-info">
                            ${member.workload_percent != null ? `<span><i class="fas fa-clock"></i> ${member.workload_percent}%</span>` : ''}
                            ${member.seniority ? `<span>${member.seniority}</span>` : ''}
                        </div>
                        <p>${(member.responsibilities || []).slice(0, 2).map(escapeHtml).join('; ')}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function updateTeamSelects() {
        const teams = state.team.list || [];
        const currentId = state.team.current?.id || '';

        const updateSelect = (selectEl, includeEmpty = true) => {
            if (!selectEl) return;
            const previousValue = selectEl.value;
            selectEl.innerHTML = includeEmpty ? '<option value="">Оберіть команду</option>' : '';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = `${team.title || 'Команда без назви'} (${team.member_count || 0})`;
                selectEl.appendChild(option);
            });
            selectEl.value = teams.find(team => team.id === Number(previousValue)) ? previousValue : (currentId || '');
        };

        updateSelect(elements.analysisTeamSelect);
        updateSelect(elements.raciTeamSelect);

        if (elements.salaryMemberSelect) {
            const members = state.team.members || [];
            const previousValue = elements.salaryMemberSelect.value;
            elements.salaryMemberSelect.innerHTML = '<option value="">Оберіть учасника команди</option>';
            members.forEach(member => {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name || member.role || 'Невідомий';
                elements.salaryMemberSelect.appendChild(option);
            });
            if (members.find(m => String(m.id) === previousValue)) {
                elements.salaryMemberSelect.value = previousValue;
            }
        }
    }

    function addManualTeamMember(member = {}) {
        state.team.manualDraft.push({
            name: member.name || '',
            role: member.role || '',
            responsibilities: Array.isArray(member.responsibilities) ? member.responsibilities.join('\n') : (member.responsibilities || ''),
            workload_percent: member.workload_percent ?? '',
            seniority: member.seniority || '',
            location: member.location || '',
            compensation_amount: member.compensation?.amount ?? '',
            compensation_currency: member.compensation?.currency || 'UAH'
        });
        renderManualTeamEditor();
    }

    function removeManualTeamMember(index) {
        state.team.manualDraft.splice(index, 1);
        renderManualTeamEditor();
    }

    function renderManualTeamEditor() {
        const container = elements.manualTeamEditor;
        if (!container) return;

        if (!state.team.manualDraft.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-user-gear"></i></div>
                    <p>Додайте ролі та обов'язки для створення команди</p>
                </div>
            `;
            return;
        }

        container.innerHTML = state.team.manualDraft.map((member, index) => `
            <div class="manual-member-card" data-member-index="${index}">
                <div class="manual-card-header">
                    <h4>Роль ${index + 1}</h4>
                    <button type="button" class="card-remove" data-action="remove-manual-member" data-index="${index}" title="Видалити">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="manual-card-grid">
                    <label>Ім'я
                        <input type="text" name="name" value="${member.name || ''}" placeholder="Повне ім'я">
                    </label>
                    <label>Роль
                        <input type="text" name="role" value="${member.role || ''}" placeholder="Наприклад, Product Manager">
                    </label>
                    <label>Сеніорність
                        <input type="text" name="seniority" value="${member.seniority || ''}" placeholder="L2 / Senior">
                    </label>
                    <label>Локація
                        <input type="text" name="location" value="${member.location || ''}" placeholder="Київ, віддалено">
                    </label>
                    <label>Обов'язки
                        <textarea name="responsibilities" rows="3" placeholder="По одній відповідальності на рядок">${member.responsibilities || ''}</textarea>
                    </label>
                    <label>Зайнятість %
                        <input type="number" name="workload_percent" value="${member.workload_percent ?? ''}" min="0" max="200">
                    </label>
                    <label>Зарплата
                        <div class="input-group">
                            <input type="number" name="compensation_amount" value="${member.compensation_amount ?? ''}" placeholder="Сума">
                            <select name="compensation_currency">
                                ${['UAH', 'USD', 'EUR', 'GBP'].map(currency => `
                                    <option value="${currency}" ${member.compensation_currency === currency ? 'selected' : ''}>${currency}</option>
                                `).join('')}
                            </select>
                        </div>
                    </label>
                </div>
            </div>
        `).join('');
    }

    async function saveManualTeam() {
        if (!state.currentClient) {
            showNotification('Оберіть клієнта перед створенням команди', 'warning');
            return;
        }
        if (!state.team.manualDraft.length) {
            showNotification('Додайте хоча б одну роль перед збереженням команди', 'warning');
            return;
        }

        const members = state.team.manualDraft.map(member => ({
            name: member.name?.trim(),
            role: member.role?.trim(),
            responsibilities: member.responsibilities
                ? member.responsibilities.split('\n').map(line => line.trim()).filter(Boolean)
                : [],
            workload_percent: member.workload_percent === '' ? null : Number(member.workload_percent),
            seniority: member.seniority || '',
            location: member.location || '',
            compensation: member.compensation_amount === '' ? null : {
                amount: Number(member.compensation_amount),
                currency: member.compensation_currency || 'UAH'
            }
        }));

        const payload = {
            client_id: state.currentClient.id,
            title: state.team.manualTitle?.trim() || `Команда ${state.currentClient.company}`,
            description: state.team.manualDescription || '',
            source: 'manual',
            members
        };

        try {
            await createTeam(payload, { setActive: true });
            showNotification('Команду збережено', 'success');
            state.team.manualDraft = [];
            state.team.manualTitle = '';
            state.team.manualDescription = '';
            if (elements.manualTeamTitle) elements.manualTeamTitle.value = '';
            if (elements.manualTeamDescription) elements.manualTeamDescription.value = '';
            renderManualTeamEditor();
        } catch (error) {
            console.error('❌ saveManualTeam error:', error);
            showNotification(error.message || 'Не вдалося зберегти команду', 'error');
        }
    }

    async function handleTeamJsonFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const raw = JSON.parse(text);
            const payload = parseImportedTeamData(raw);
            await createTeam(payload, { setActive: true });
            showNotification('Команду імпортовано успішно', 'success');
        } catch (error) {
            console.error('❌ handleTeamJsonFile error:', error);
            showNotification(error.message || 'Не вдалося імпортувати JSON', 'error');
        } finally {
            event.target.value = '';
        }
    }

    function parseImportedTeamData(raw) {
        if (!state.currentClient) {
            throw new Error('Оберіть клієнта перед імпортом команди');
        }

        let payload = raw;
        if (raw.team) payload = raw.team;

        if (!payload.members || !Array.isArray(payload.members)) {
            throw new Error('JSON повинен містити масив members');
        }

        return {
            client_id: state.currentClient.id,
            title: payload.title || raw.title || `Команда ${state.currentClient.company}`,
            description: payload.description || raw.description || '',
            source: 'imported-json',
            members: payload.members.map(member => ({
                name: member.name || member.full_name || member.fullName,
                role: member.role || member.position,
                responsibilities: Array.isArray(member.responsibilities)
                    ? member.responsibilities
                    : (member.responsibilities_text || member.responsibilities || '')
                        .split('\n')
                        .map(line => line.trim())
                        .filter(Boolean),
                workload_percent: member.workload_percent ?? member.capacity ?? null,
                seniority: member.seniority || member.level || '',
                location: member.location || '',
                compensation: member.compensation || member.salary || null,
                metadata: member.metadata || {}
            }))
        };
    }

    async function createTeam(teamPayload, { setActive = false } = {}) {
        if (!state.currentClient) {
            throw new Error('Оберіть клієнта перед створенням команди');
        }

        const payload = {
            client_id: state.currentClient.id,
            ...teamPayload
        };

        const response = await fetch('/api/teams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Не вдалося зберегти команду');
        }

        await loadTeamsForClient(state.currentClient.id, { preserveSelection: !setActive });
        if (setActive && data.team) {
            await selectTeam(data.team.id, { silent: true });
        }

        return data.team;
    }

    function renderSalaryInsightsHistory() {
        // TODO: включити відображення історії salary аналізів
    }

    // ===== RACI Dashboard =====
    function renderRaciOutput(snapshot) {
        if (!snapshot) {
            clearRaciOutput();
            return;
        }

        state.team.latestRaci = snapshot;
        const view = state.team.latestRaciView || 'actual';
        setRaciView(view);
        renderRaciMeta(snapshot);
        const gapItems = snapshot.gaps?.gap_analysis || (Array.isArray(snapshot.gaps) ? snapshot.gaps : []);
        renderRaciGaps(Array.isArray(gapItems) ? gapItems : []);
        renderRaciQuickWins(snapshot.quick_wins || snapshot.gaps?.quick_wins || []);
        renderRaciRoadmap(snapshot.roadmap || snapshot.gaps?.roadmap || []);
        renderIntelRoster();
    }

    function renderRaciMeta(snapshot) {
        if (!elements.raciMetaInfo) return;

        const summary = snapshot.summary || snapshot.gaps?.summary || snapshot.gaps?.gap_summary || '';
        const alignment = Array.isArray(snapshot.role_alignment) ? snapshot.role_alignment : [];
        const overloaded = alignment.filter(item => (item.status || '').toLowerCase() === 'overloaded').length;
        const balanced = alignment.filter(item => (item.status || '').toLowerCase() === 'balanced').length;
        const underutilized = alignment.filter(item => (item.status || '').toLowerCase() === 'underutilized').length;

        const metaCards = [
            { label: 'Перевантажені', value: overloaded, icon: 'fa-fire' },
            { label: 'Баланс', value: balanced, icon: 'fa-circle-notch' },
            { label: 'Недовантажені', value: underutilized, icon: 'fa-feather' }
        ];

        const generatedAt = snapshot.generated_at ? new Date(snapshot.generated_at).toLocaleString('uk-UA') : '';
        const tokens = state.team.lastRaciMeta?.tokensUsed;
        const duration = state.team.lastRaciMeta?.responseTime;

        const metaFooter = [];
        if (generatedAt) metaFooter.push(`<span><i class="fas fa-history"></i> ${generatedAt}</span>`);
        if (tokens != null) metaFooter.push(`<span><i class="fas fa-bolt"></i> ${tokens} токенів</span>`);
        if (duration != null) metaFooter.push(`<span><i class="fas fa-stopwatch"></i> ${Math.round(duration)} мс</span>`);

        elements.raciMetaInfo.innerHTML = `
            ${summary ? `<div class="matrix-meta-summary">${escapeHtml(summary)}</div>` : ''}
            <div class="matrix-meta-cards">
                ${metaCards.map(card => `
                    <div class="meta-card">
                        <div class="meta-icon"><i class="fas ${card.icon}"></i></div>
                        <div class="meta-value">${card.value}</div>
                        <div class="meta-label">${card.label}</div>
                    </div>
                `).join('')}
            </div>
            ${metaFooter.length ? `<div class="meta-inline">${metaFooter.join('')}</div>` : ''}
        `;
    }

    function setRaciView(view) {
        state.team.latestRaciView = view;
        if (elements.raciViewToggle) {
            elements.raciViewToggle.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });
        }

        const snapshot = state.team.latestRaci;
        if (!snapshot) {
            clearRaciOutput();
            return;
        }

        let rows = snapshot.matrix_actual || [];
        if (view === 'ideal') {
            rows = snapshot.matrix_ideal || [];
        } else if (view === 'diff') {
            rows = computeRaciDiff(snapshot.matrix_actual || [], snapshot.matrix_ideal || []);
        }

        renderRaciMatrix(rows, view);
    }

    function computeRaciDiff(actualRows, idealRows) {
        const diffMap = new Map();
        actualRows.forEach(row => diffMap.set(row.task, { actual: row }));
        idealRows.forEach(row => {
            const entry = diffMap.get(row.task) || {};
            entry.ideal = row;
            diffMap.set(row.task, entry);
        });

        const build = (value) => {
            if (Array.isArray(value)) return value.join(', ');
            return value || '—';
        };

        const buildDiff = (actual, ideal) => {
            const actualStr = build(actual);
            const idealStr = build(ideal);
            if (actualStr === idealStr) {
                return `<span class="unchanged">${escapeHtml(actualStr)}</span>`;
            }
            return `<span class="diff-actual">${escapeHtml(actualStr)}</span> → <span class="diff-ideal">${escapeHtml(idealStr)}</span>`;
        };

        return Array.from(diffMap.entries()).map(([task, entry]) => ({
            task,
            R: buildDiff(entry.actual?.R, entry.ideal?.R),
            A: buildDiff(entry.actual?.A, entry.ideal?.A),
            C: buildDiff(entry.actual?.C, entry.ideal?.C),
            I: buildDiff(entry.actual?.I, entry.ideal?.I),
            notes: entry.actual?.notes || entry.ideal?.notes || ''
        }));
    }

    function renderRaciMatrix(rows, view) {
        if (!elements.raciMatrixTable) return;
        const tbody = elements.raciMatrixTable.querySelector('tbody');
        if (!tbody) return;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="5">Немає даних для відображення</td></tr>`;
            return;
        }

        const buildCell = (value) => {
            if (value == null) return '—';
            if (typeof value === 'string' && value.includes('→') && view === 'diff') {
                return value;
            }
            if (Array.isArray(value)) {
                return escapeHtml(value.join(', '));
            }
            return escapeHtml(String(value));
        };

        tbody.innerHTML = rows.map(row => `
            <tr>
                <td>${escapeHtml(row.task || '')}</td>
                <td>${buildCell(row.R)}</td>
                <td>${buildCell(row.A)}</td>
                <td>${buildCell(row.C)}</td>
                <td>${buildCell(row.I)}</td>
            </tr>
        `).join('');
    }

    function renderRaciGaps(gaps) {
        if (!elements.raciGapsList) return;
        if (!gaps.length) {
            elements.raciGapsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-mountain"></i></div>
                    <p>Запустіть генерацію, щоб побачити розриви</p>
                </div>
            `;
            return;
        }

        elements.raciGapsList.innerHTML = gaps.map(gap => `
            <div class="gap-item impact-${(gap.impact || 'medium').toLowerCase()}">
                <div class="gap-header">
                    <h4>${escapeHtml(gap.task || 'Без назви')}</h4>
                    <span>${escapeHtml((gap.impact || 'medium').toUpperCase())}</span>
                </div>
                <p>${escapeHtml(gap.issue || '')}</p>
                ${Array.isArray(gap.recommendations) ? `<ul>${gap.recommendations.map(rec => `<li>${escapeHtml(rec)}</li>`).join('')}</ul>` : ''}
                ${gap.owner ? `<span class="gap-owner"><i class="fas fa-user-shield"></i> ${escapeHtml(gap.owner)}</span>` : ''}
            </div>
        `).join('');
    }

    function renderRaciQuickWins(list) {
        if (!elements.raciQuickWins) return;
        if (!list.length) {
            elements.raciQuickWins.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-bolt"></i></div>
                    <p>Рекомендації з'являться після аналізу</p>
                </div>
            `;
            return;
        }
        elements.raciQuickWins.innerHTML = `<ul>${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
    }

    function renderRaciRoadmap(roadmap) {
        if (!elements.raciRoadmap) return;
        if (!roadmap.length) {
            elements.raciRoadmap.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-road"></i></div>
                    <p>Етапи впровадження з'являться після аналізу</p>
                </div>
            `;
            return;
        }

        elements.raciRoadmap.innerHTML = roadmap.map(item => `
            <div class="roadmap-item priority-${(item.priority || 'medium').toLowerCase()}">
                <div class="roadmap-header">
                    <h4>${escapeHtml(item.phase || 'Етап')}</h4>
                    <span>${escapeHtml((item.priority || 'medium').toUpperCase())}</span>
                </div>
                ${Array.isArray(item.actions) ? `<ul>${item.actions.map(action => `<li>${escapeHtml(action)}</li>`).join('')}</ul>` : ''}
            </div>
        `).join('');
    }

    async function generateRaciAnalysis() {
        if (!state.team.current) {
            showNotification('Оберіть команду для генерації RACI', 'warning');
            return;
        }

        try {
            elements.generateRaciBtn?.classList.add('btn-loading');
            elements.generateRaciBtn.disabled = true;

            const payload = {
                focus: {
                    people: state.analysis.focusPeople,
                    question: state.analysis.question
                }
            };

            const response = await fetch(`/api/teams/${state.team.current.id}/raci/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Не вдалося згенерувати RACI');
            }

            const output = data.raci?.output || {};
            state.team.lastRaciMeta = data.meta || null;
            const snapshot = {
                id: data.raci?.id,
                generated_at: data.raci?.generated_at,
                matrix_actual: output.matrix_actual || data.raci?.matrix_actual || [],
                matrix_ideal: output.matrix_ideal || data.raci?.matrix_ideal || [],
                gaps: output.gap_analysis || data.raci?.gaps || {},
                summary: output.summary || data.raci?.summary || '',
                role_alignment: output.role_alignment || data.raci?.role_alignment || [],
                quick_wins: output.quick_wins || data.raci?.quick_wins || [],
                roadmap: output.roadmap || data.raci?.roadmap || []
            };

            state.team.lastRaciMeta = data.meta || null;
            renderRaciOutput(snapshot);
            await loadTeamsForClient(state.currentClient.id, { preserveSelection: true });
            showNotification('RACI матрицю оновлено', 'success');
            debouncedLoadTokenUsage();
        } catch (error) {
            console.error('❌ generateRaciAnalysis error:', error);
            showNotification(error.message || 'Не вдалося згенерувати RACI', 'error');
        } finally {
            if (elements.generateRaciBtn) {
                elements.generateRaciBtn.classList.remove('btn-loading');
                elements.generateRaciBtn.disabled = false;
            }
        }
    }

    function clearRaciOutput() {
        if (elements.raciMatrixTable) {
            const tbody = elements.raciMatrixTable.querySelector('tbody');
            if (tbody) tbody.innerHTML = '';
        }
        if (elements.raciGapsList) {
            elements.raciGapsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-mountain"></i></div>
                    <p>Запустіть генерацію, щоб побачити розриви</p>
                </div>
            `;
        }
        if (elements.raciQuickWins) {
            elements.raciQuickWins.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-bolt"></i></div>
                    <p>Рекомендації з'являться після аналізу</p>
                </div>
            `;
        }
        if (elements.raciRoadmap) {
            elements.raciRoadmap.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-road"></i></div>
                    <p>Етапи впровадження з'являться після аналізу</p>
                </div>
            `;
        }
        if (elements.raciMetaInfo) {
            elements.raciMetaInfo.innerHTML = `
                <div class="matrix-meta-summary">Запустіть RACI аналіз, щоб побачити ключові інсайти по ролях.</div>
            `;
        }
        renderIntelRoster();
    }

    // ===== Salary Analytics =====
    function prefillSalaryForm(memberId) {
        const member = (state.team.members || []).find(m => String(m.id) === String(memberId));
        if (!member) {
            elements.salaryAmount && (elements.salaryAmount.value = '');
            elements.salaryHours && (elements.salaryHours.value = '');
            elements.salaryNotes && (elements.salaryNotes.value = '');
            return;
        }

        if (elements.salaryAmount && member.compensation?.amount != null) {
            elements.salaryAmount.value = member.compensation.amount;
        }
        if (elements.salaryCurrency && member.compensation?.currency) {
            elements.salaryCurrency.value = member.compensation.currency;
        }
        if (elements.salaryHours && member.workload_percent != null) {
            const approxHours = Math.round((member.workload_percent / 100) * 40);
            elements.salaryHours.value = approxHours;
        }
        if (elements.salaryNotes) {
            elements.salaryNotes.value = (member.responsibilities || []).join('\n');
        }
    }

    async function generateSalaryAnalysis() {
        if (!state.team.current) {
            showNotification('Оберіть команду для аналізу зарплат', 'warning');
            return;
        }
        const memberId = elements.salaryMemberSelect?.value;
        if (!memberId) {
            showNotification('Оберіть співробітника для аналізу зарплати', 'warning');
            return;
        }

        const amount = parseFloat(elements.salaryAmount?.value || '0');
        const currency = elements.salaryCurrency?.value || 'UAH';
        const hours = parseFloat(elements.salaryHours?.value || '0');
        const notes = elements.salaryNotes?.value || '';

        if (!amount || amount <= 0) {
            showNotification('Вкажіть коректну суму компенсації', 'warning');
            return;
        }

        try {
            elements.generateSalaryBtn?.classList.add('btn-loading');
            elements.generateSalaryBtn.disabled = true;

            const payload = {
                salary: {
                    amount,
                    currency
                },
                workload: {
                    hours_per_week: hours || null
                },
                job_description: notes,
                concern: state.analysis.question || ''
            };

            const response = await fetch(`/api/teams/${state.team.current.id}/members/${memberId}/salary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Не вдалося провести аналіз зарплати');
            }

            state.salary.latest = data.salary;
            state.team.lastSalaryMeta = {
                ...(data.meta || {}),
                processedAt: data.meta?.processedAt || new Date().toISOString()
            };
            renderSalaryAnalysis(data.salary.analysis || data.salary);
            await loadTeamsForClient(state.currentClient.id, { preserveSelection: true });
            showNotification('Аналіз зарплати готовий', 'success');
        } catch (error) {
            console.error('❌ generateSalaryAnalysis error:', error);
            showNotification(error.message || 'Не вдалося провести аналіз зарплати', 'error');
        } finally {
            if (elements.generateSalaryBtn) {
                elements.generateSalaryBtn.classList.remove('btn-loading');
                elements.generateSalaryBtn.disabled = false;
            }
        }
    }

    function renderSalaryAnalysis(analysis) {
        if (!analysis) {
            renderSalaryUtilization({});
            renderSalaryCompensation({});
            renderSalaryRecommendations({});
            renderSalaryLaunchMeta(null);
            renderSalarySignals({});
            renderSalaryMarketWindow({});
            return;
        }
        renderSalaryUtilization(analysis.utilization || {});
        renderSalaryCompensation(analysis.compensation || {});
        renderSalaryRecommendations(analysis.recommendations || {});
        renderSalaryLaunchMeta(analysis);
        renderSalarySignals(analysis.signals || {});
        renderSalaryMarketWindow(analysis.compensation || {});
    }

    function renderSalaryUtilization(utilization) {
        if (elements.salaryUtilizationChart) {
            const buckets = utilization.visual_buckets || [];
            if (!buckets.length) {
                elements.salaryUtilizationChart.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-chart-pie"></i></div>
                        <p>Дані завантаженості з'являться після аналізу</p>
                    </div>
                `;
            } else {
                elements.salaryUtilizationChart.innerHTML = buckets.map(bucket => `
                    <div class="utilization-bar status-${(bucket.status || 'ok').toLowerCase()}">
                        <span style="width: ${Math.min(bucket.percentage || 0, 100)}%"></span>
                        <label>${escapeHtml(bucket.label || '')}</label>
                        <strong>${bucket.percentage || 0}%</strong>
                    </div>
                `).join('');
            }
        }

        if (elements.salaryUtilizationDetails) {
            elements.salaryUtilizationDetails.innerHTML = `
                <p>${escapeHtml(utilization.narrative || 'Завантаженість у нормі')}</p>
                ${Array.isArray(utilization.time_buckets) ? `<ul>${utilization.time_buckets.map(bucket => `<li>${escapeHtml(bucket.label || '')}: ${bucket.percentage || 0}% (${bucket.status || 'balanced'})</li>`).join('')}</ul>` : ''}
            `;
        }
    }

    function renderSalaryCompensation(compensation) {
        if (!elements.salaryCompensation) return;
        const market = compensation.market_range || {};
        elements.salaryCompensation.innerHTML = `
            <div class="compensation-summary">
                <div>
                    <span>Поточна компенсація</span>
                    <strong>${compensation.current_amount != null ? `${compensation.current_amount} ${compensation.currency || ''}` : 'Н/д'}</strong>
                </div>
                <div>
                    <span>Ринок</span>
                    <strong>${market.min != null ? `${market.min} - ${market.max} ${market.currency || ''}` : 'Н/д'}</strong>
                </div>
                <div>
                    <span>Висновок</span>
                    <strong class="alignment-${(compensation.alignment || 'aligned').toLowerCase()}">${escapeHtml(compensation.alignment || 'aligned')}</strong>
                </div>
            </div>
            <p>${escapeHtml(compensation.explanation || '')}</p>
        `;
    }

    function renderSalaryRecommendations(recommendations) {
        if (!elements.salaryRecommendations) return;
        const sections = ['workload', 'compensation', 'development', 'hiring'];
        const hasAny = sections.some(section => Array.isArray(recommendations[section]) && recommendations[section].length);
        const meta = state.team.lastSalaryMeta;

        if (!hasAny && !meta) {
            elements.salaryRecommendations.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-lightbulb"></i></div>
                    <p>Рекомендації з'являться після аналізу</p>
                </div>
            `;
            return;
        }

        const content = sections.map(section => {
            const items = recommendations[section];
            if (!Array.isArray(items) || !items.length) return '';
            const sectionTitles = {
                workload: 'Зайнятість',
                compensation: 'Компенсація',
                development: 'Розвиток',
                hiring: 'Хайринг'
            };
            return `
                <div class="recommendation-block">
                    <h4>${sectionTitles[section]}</h4>
                    <ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </div>
            `;
        }).join('');

        const metaHtml = meta ? `
            <div class="meta-inline salary-meta">
                ${meta.tokensUsed != null ? `<span><i class="fas fa-bolt"></i> ${meta.tokensUsed} токенів</span>` : ''}
                ${meta.responseTime != null ? `<span><i class="fas fa-stopwatch"></i> ${meta.responseTime} мс</span>` : ''}
                ${meta.processedAt ? `<span><i class="fas fa-history"></i> ${new Date(meta.processedAt).toLocaleString('uk-UA')}</span>` : ''}
            </div>
        ` : '';

        elements.salaryRecommendations.innerHTML = `${content}${metaHtml}` || metaHtml;
    }

    function renderSalaryLaunchMeta(analysis) {
        if (!elements.salaryLaunchMeta) return;
        const meta = state.team.lastSalaryMeta || {};
        const items = [];
        if (state.team.current?.title) {
            items.push(`<li><i class="fas fa-diagram-project"></i> ${escapeHtml(state.team.current.title)}</li>`);
        }
        if (analysis?.compensation?.alignment) {
            items.push(`<li><i class="fas fa-scale-balanced"></i> Баланс: ${escapeHtml(analysis.compensation.alignment)}</li>`);
        }
        if (meta.tokensUsed != null) {
            items.push(`<li><i class="fas fa-bolt"></i> ${meta.tokensUsed} токенів</li>`);
        }
        if (meta.responseTime != null) {
            items.push(`<li><i class="fas fa-stopwatch"></i> ${Math.round(meta.responseTime)} мс</li>`);
        }
        if (meta.processedAt) {
            try {
                items.push(`<li><i class="fas fa-history"></i> ${new Date(meta.processedAt).toLocaleString('uk-UA')}</li>`);
            } catch (e) {
                items.push(`<li><i class="fas fa-history"></i> ${escapeHtml(String(meta.processedAt))}</li>`);
            }
        }

        if (!items.length) {
            elements.salaryLaunchMeta.innerHTML = '<li><i class="fas fa-circle-info"></i> Запустіть аналіз, щоб побачити метрики</li>';
        } else {
            elements.salaryLaunchMeta.innerHTML = items.join('');
        }
    }

    function renderSalarySignals(signals) {
        if (!elements.salarySignals) return;
        const sections = [
            { key: 'strengths', title: 'Сильні сторони', icon: 'fa-shield-heart', className: 'positive' },
            { key: 'risks', title: 'Ризики', icon: 'fa-triangle-exclamation', className: 'negative' },
            { key: 'watchouts', title: 'Сигнали уваги', icon: 'fa-eye', className: 'warning' }
        ];

        const content = sections.map(({ key, title, icon, className }) => {
            const list = Array.isArray(signals[key]) ? signals[key] : [];
            if (!list.length) return '';
            return `
                <div class="signal-group ${className}">
                    <h4><i class="fas ${icon}"></i>${title}</h4>
                    <ul>${list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </div>
            `;
        }).join('');

        elements.salarySignals.innerHTML = content || `
            <div class="signal-group">
                <p>Сигнали з'являться після AI аналізу навантаження та компенсації.</p>
            </div>
        `;
    }

    function renderSalaryMarketWindow(compensation) {
        if (!elements.salaryMarketWindow) return;
        const market = compensation.market_range || {};
        const alignment = (compensation.alignment || 'aligned').toLowerCase();
        elements.salaryMarketWindow.innerHTML = `
            <div class="market-line">
                <span>Поточна компенсація</span>
                <strong>${compensation.current_amount != null ? `${compensation.current_amount} ${compensation.currency || ''}` : 'Н/д'}</strong>
            </div>
            <div class="market-line">
                <span>Ринковий діапазон</span>
                <strong>${market.min != null ? `${market.min} - ${market.max} ${market.currency || ''}` : 'Н/д'}</strong>
            </div>
            <div class="market-line alignment-${alignment}">
                <span>Висновок</span>
                <strong>${escapeHtml(compensation.alignment || 'aligned')}</strong>
            </div>
            ${compensation.explanation ? `<p class="market-explanation">${escapeHtml(compensation.explanation)}</p>` : ''}
        `;
    }

    // ===== Persona & Negotiation Insights =====
    function renderPersonaInsights(personaData) {
        state.analysis.persona = personaData;
        if (!elements.personaInsights) return;
        if (!personaData || !Array.isArray(personaData.people) || !personaData.people.length) {
            elements.personaInsights.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-users"></i></div>
                    <p>Обрані ролі та персональні ризики з'являться тут після аналізу</p>
                </div>
            `;
            return;
        }

        const focusFilter = personaData.focus_filter || [];
        const sortedPeople = [...personaData.people].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
        elements.personaInsights.innerHTML = sortedPeople.map(person => {
            const active = focusFilter.includes(person.name) || state.analysis.focusPeople.includes(person.name);
            const riskClass = (person.risk_score || 0) >= 70 ? 'high' : (person.risk_score || 0) >= 40 ? 'medium' : 'low';
            const workloadStatus = person.workload_status ? `workload-${person.workload_status.toLowerCase()}` : '';
            return `
                <div class="persona-card ${active ? 'active' : ''}">
                    <div class="persona-header">
                        <div>
                            <h4>${escapeHtml(person.name || 'Невідомий')}</h4>
                            <span>${escapeHtml(person.role || '')}</span>
                        </div>
                        <span class="risk-badge risk-${riskClass}">${person.risk_score != null ? `${person.risk_score}` : '—'}</span>
                    </div>
                    <div class="persona-tags">
                        ${(person.manipulation_profile || []).slice(0, 4).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                    ${person.biases_detected?.length ? `<div class="persona-section"><strong>Викривлення:</strong> ${person.biases_detected.map(escapeHtml).join(', ')}</div>` : ''}
                    ${person.triggers?.length ? `<div class="persona-section"><strong>Тригери:</strong> ${person.triggers.map(escapeHtml).join(', ')}</div>` : ''}
                    <div class="persona-actions" data-person="${escapeHtml(person.name || '')}">
                        <button class="btn-chip" data-mode="tasks">Задачі</button>
                        <button class="btn-chip" data-mode="compensation">Компенсація</button>
                        <button class="btn-chip" data-mode="hiring">Хайринг</button>
                    </div>
                    <div class="persona-advice" id="person-advice-${escapeHtml(person.name || '').replace(/\s+/g, '-')}"></div>
                </div>
            `;
        }).join('');

        elements.personaInsights.querySelectorAll('.persona-actions .btn-chip').forEach(button => {
            button.addEventListener('click', (event) => {
                const mode = event.currentTarget.dataset.mode;
                const name = event.currentTarget.closest('.persona-actions')?.dataset.person;
                if (name && mode) {
                    requestPersonAdvice(name, mode);
                }
            });
        });
    }

    async function requestPersonAdvice(personName, mode) {
        if (!state.team.current) {
            showNotification('Оберіть команду для персональних порад', 'warning');
            return;
        }

        const member = (state.team.members || []).find(m => m.name === personName);
        if (!member) {
            showNotification('Не вдалося знайти дані про співробітника', 'error');
            return;
        }

        const adviceContainer = document.getElementById(`person-advice-${personName.replace(/\s+/g, '-')}`);
        if (adviceContainer) {
            adviceContainer.innerHTML = '<div class="advice-loading"><i class="fas fa-spinner fa-spin"></i> Генеруємо рекомендації...</div>';
        }

        try {
            const payload = {
                mode,
                member,
                team: {
                    title: state.team.current?.title,
                    size: state.team.members.length
                },
                concern: state.analysis.question || ''
            };

            const response = await fetch('/api/advice/person', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Не вдалося отримати персональну пораду');
            }

            state.analysis.personAdvice[personName] = state.analysis.personAdvice[personName] || {};
            state.analysis.personAdvice[personName][mode] = data.advice;
            renderPersonAdvice(personName, mode, data.advice);
        } catch (error) {
            console.error('❌ requestPersonAdvice error:', error);
            showNotification(error.message || 'Не вдалося отримати персональну пораду', 'error');
            if (adviceContainer) {
                adviceContainer.innerHTML = '<p class="advice-error">Помилка генерації поради</p>';
            }
        }
    }

    function renderPersonAdvice(personName, mode, advice) {
        const container = document.getElementById(`person-advice-${personName.replace(/\s+/g, '-')}`);
        if (!container) return;

        if (!advice) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="advice-block">
                <h5>${mode === 'hiring' ? 'Хайринг' : mode === 'compensation' ? 'Компенсація' : 'Задачі'}:</h5>
                ${advice.summary ? `<p>${escapeHtml(advice.summary)}</p>` : ''}
                ${advice.key_signals ? `<ul>${Object.entries(advice.key_signals).flatMap(([section, items]) => Array.isArray(items) ? items.map(item => `<li><strong>${escapeHtml(section)}:</strong> ${escapeHtml(item)}</li>`) : []).join('')}</ul>` : ''}
                ${advice.recommendations ? `<div class="advice-columns">${Object.entries(advice.recommendations).map(([section, items]) => Array.isArray(items) && items.length ? `<div><strong>${escapeHtml(section)}</strong><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : '').join('')}</div>` : ''}
            </div>
        `;
    }

    function renderBiasClusters(clusters) {
        state.analysis.biasClusters = clusters;
        if (!elements.biasClusters) return;
        if (!Array.isArray(clusters) || !clusters.length) {
            elements.biasClusters.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-brain"></i></div>
                    <p>Групи когнітивних викривлень з'являться тут після аналізу</p>
                </div>
            `;
            return;
        }

        const sortedClusters = [...clusters].sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0));
        elements.biasClusters.innerHTML = sortedClusters.map(cluster => `
            <div class="bias-cluster impact-${(cluster.impact || 'medium').toLowerCase()}">
                <div class="cluster-header">
                    <h4>${escapeHtml(cluster.bias_family || 'Невідомо')}</h4>
                    <span>${cluster.occurrences || 0}×</span>
                </div>
                ${cluster.representative_quotes?.length ? `<blockquote>${escapeHtml(cluster.representative_quotes[0])}</blockquote>` : ''}
                ${cluster.linked_actors?.length ? `<p><strong>Учасники:</strong> ${cluster.linked_actors.map(escapeHtml).join(', ')}</p>` : ''}
                ${cluster.recommended_countermeasures?.length ? `<ul>${cluster.recommended_countermeasures.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
            </div>
        `).join('');
    }

    function renderNegotiationMap(map) {
        state.analysis.negotiationMap = map;
        if (!elements.negotiationMap) return;
        const phases = map?.phases || [];
        if (!phases.length) {
            elements.negotiationMap.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-route"></i></div>
                    <p>Стратегічні фазові рекомендації з'являться тут після аналізу</p>
                </div>
            `;
            return;
        }

        elements.negotiationMap.innerHTML = phases.map(phase => `
            <div class="negotiation-phase">
                <div class="phase-header">
                    <h4>${escapeHtml(phase.phase || '')}</h4>
                    ${phase.goal ? `<span>${escapeHtml(phase.goal)}</span>` : ''}
                </div>
                ${phase.pressure_points?.length ? `<div class="phase-section"><strong>Тиски:</strong> <ul>${phase.pressure_points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul></div>` : ''}
                ${phase.opportunities?.length ? `<div class="phase-section"><strong>Можливості:</strong> <ul>${phase.opportunities.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>` : ''}
                ${phase.owners?.length ? `<div class="phase-section"><strong>Відповідальні:</strong> ${phase.owners.map(escapeHtml).join(', ')}</div>` : ''}
            </div>
        `).join('');
    }
// Make functions available globally for onclick handlers
    window.openAnalysisHistoryModal = openAnalysisHistoryModal;
    window.closeAnalysisHistoryModal = closeAnalysisHistoryModal;
    window.viewAnalysisFromModal = viewAnalysisFromModal;
    window.deleteAnalysisFromModal = deleteAnalysisFromModal;

    // ===== Initialization =====
    function init() {
        console.log('🚀 TeamPulse Turbo Neon - Initializing...');
        
        // Load saved UI state
        const savedState = localStorage.getItem('teampulse-ui-state');
        if (savedState) {
            try {
                Object.assign(state.ui, JSON.parse(savedState));
            } catch (e) {
                console.warn('Failed to parse saved UI state');
            }
        }
        
        // Initialize onboarding
        initOnboarding();
        
        // Setup file handling
        setupFileHandling();
        
        // Setup drag & drop workspace
        setupWorkspaceDrop();
        
        // Bind events
        bindEvents();

        // Prepare client wizard
        renderClientStepper();
        renderModuleGuide();
        loadClientWorkflowGuide();
        
        // Initialize displays
        updateTextStats();
        updateInputMethod('text');
        switchHighlightsView('list');
        
        // Always load initial data
        console.log('🚀 Starting loadClients...');
        loadClients().then(() => {
            console.log('🚀 loadClients completed, clients loaded:', state.clients.length);
            debouncedLoadTokenUsage();
            
            // Try to restore previous app state
            console.log('🚀 Restoring app state...');
            const stateRestored = loadAppState();
            
            // Load current client's analysis history if we have a current client
            if (state.currentClient) {
                console.log('🚀 Loading analysis history for current client:', state.currentClient.company);
                loadAnalysisHistory(state.currentClient.id);
                loadTeamsForClient(state.currentClient.id, { preserveSelection: true });
            } else {
                console.log('🚀 No current client to load analysis for');
            }
            
            console.log('🚀 App initialization completed successfully');
            console.log('🚀 Final state:', {
                clientsLoaded: state.clients.length,
                currentClient: state.currentClient ? state.currentClient.company : 'none',
                stateRestored
            });
        }).catch(error => {
            console.error('🚀 Failed to initialize app:', error);
        });
        
        // Auto-refresh token usage
        setInterval(loadTokenUsage, 30000);
        
        // Handle initial resize
        handleResize();
        
        // Auto-save state periodically
        setInterval(saveAppState, 60000); // Save every minute
        
        // Save state on page unload
        window.addEventListener('beforeunload', saveAppState);
        
        console.log('✨ TeamPulse Turbo Neon - Ready!');
    }

    // Start when authenticated
    window.addEventListener('auth-success', init);

})();
