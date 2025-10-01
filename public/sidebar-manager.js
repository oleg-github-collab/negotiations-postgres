// Dual Sidebar Management System
// Manages separate left sidebars for negotiations and team hub

class SidebarManager {
    constructor() {
        this.currentModule = 'negotiations';
        this.sidebarStates = {
            leftNegotiations: { collapsed: false, visible: true },
            leftTeamHub: { collapsed: false, visible: false },
            leftRaci: { collapsed: false, visible: false },
            leftSalary: { collapsed: false, visible: false },
            right: { collapsed: false, visible: true }
        };
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeSidebars());
        } else {
            this.initializeSidebars();
        }
    }

    initializeSidebars() {
        this.createDualSidebars();
        this.setupToggleButtons();
        this.setupEventListeners();
        this.updateSidebarVisibility();
        this.updateLayoutSpacing();

        // Load initial clients for negotiations
        setTimeout(() => {
            this.loadClients('negotiations');
        }, 500);
    }

    // Create separate sidebars for each module
    createDualSidebars() {
        const appContainer = document.querySelector('.app-container');
        if (!appContainer) return;

        // Hide legacy sidebar
        const legacySidebar = document.getElementById('sidebar-left');
        if (legacySidebar) {
            legacySidebar.style.display = 'none';
        }

        // Create all module sidebars
        const negotiationsSidebar = this.createNegotiationsSidebar();
        const teamHubSidebar = this.createTeamHubSidebar();
        const raciSidebar = this.createRaciSidebar();
        const salarySidebar = this.createSalarySidebar();

        // Insert sidebars before main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            appContainer.insertBefore(negotiationsSidebar, mainContent);
            appContainer.insertBefore(teamHubSidebar, mainContent);
            appContainer.insertBefore(raciSidebar, mainContent);
            appContainer.insertBefore(salarySidebar, mainContent);
        }
    }

    // Create negotiations sidebar
    createNegotiationsSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'negotiations-sidebar';
        sidebar.className = 'left-sidebar negotiations-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-title">
                    <i class="fas fa-handshake neon-icon"></i>
                    <div class="title-content">
                        <h2>Клієнти переговорів</h2>
                        <p>Зовнішні клієнти для аналізу</p>
                    </div>
                </div>
                <div class="sidebar-controls">
                    <span class="client-count" id="negotiations-client-count">0</span>
                    <button class="sidebar-toggle-btn" id="toggle-negotiations-sidebar" title="Згорнути/розгорнути">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
            </div>

            <div class="sidebar-content">
                <div class="sidebar-actions">
                    <button class="btn-primary add-client-btn" id="add-negotiations-client">
                        <i class="fas fa-plus"></i>
                        <span class="btn-text">Додати клієнта</span>
                    </button>
                    <button class="btn-secondary import-btn" id="import-negotiations">
                        <i class="fas fa-upload"></i>
                        <span class="btn-text">Імпорт</span>
                    </button>
                </div>

                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="negotiations-search" placeholder="Пошук клієнтів...">
                        <button class="search-clear" id="clear-negotiations-search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="filters-section">
                    <div class="filter-tabs">
                        <button class="filter-tab active" data-filter="all">
                            <span>Всі</span>
                            <span class="tab-count" id="all-negotiations-count">0</span>
                        </button>
                        <button class="filter-tab" data-filter="active">
                            <span>Активні</span>
                            <span class="tab-count" id="active-negotiations-count">0</span>
                        </button>
                        <button class="filter-tab" data-filter="completed">
                            <span>Завершені</span>
                            <span class="tab-count" id="completed-negotiations-count">0</span>
                        </button>
                    </div>
                </div>

                <div class="client-list-container">
                    <div class="client-list" id="negotiations-client-list">
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-handshake"></i>
                            </div>
                            <h4>Немає клієнтів для переговорів</h4>
                            <p>Додайте першого клієнта для аналізу переговорів</p>
                            <button class="btn-primary btn-sm" onclick="sidebarManager.showAddClientForm('negotiations')">
                                <i class="fas fa-plus"></i>
                                Додати клієнта
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return sidebar;
    }

    // Create team hub sidebar
    createTeamHubSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'teamhub-sidebar';
        sidebar.className = 'left-sidebar teamhub-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-title">
                    <i class="fas fa-users neon-icon"></i>
                    <div class="title-content">
                        <h2>Діючі проєкти</h2>
                        <p>Внутрішні команди та структури</p>
                    </div>
                </div>
                <div class="sidebar-controls">
                    <span class="client-count" id="teamhub-client-count">0</span>
                    <button class="sidebar-toggle-btn" id="toggle-teamhub-sidebar" title="Згорнути/розгорнути">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
            </div>

            <div class="sidebar-content">
                <div class="sidebar-actions">
                    <button class="btn-primary add-client-btn" id="add-teamhub-client">
                        <i class="fas fa-plus"></i>
                        <span class="btn-text">Створити проєкт</span>
                    </button>
                    <button class="btn-secondary import-btn" id="import-teamhub">
                        <i class="fas fa-upload"></i>
                        <span class="btn-text">Імпорт команд</span>
                    </button>
                </div>

                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="teamhub-search" placeholder="Пошук проєктів...">
                        <button class="search-clear" id="clear-teamhub-search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="project-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-project-diagram"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-projects">0</div>
                            <div class="stat-label">Проєктів</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-user-friends"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-members">0</div>
                            <div class="stat-label">Учасників</div>
                        </div>
                    </div>
                </div>

                <div class="client-list-container">
                    <div class="client-list" id="teamhub-client-list">
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <h4>Немає діючих проєктів</h4>
                            <p>Створіть перший проєкт для управління командами</p>
                            <button class="btn-primary btn-sm" onclick="sidebarManager.showAddClientForm('teamhub')">
                                <i class="fas fa-plus"></i>
                                Створити проєкт
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return sidebar;
    }

    // Create RACI sidebar
    createRaciSidebar() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'raci-sidebar';
        sidebar.className = 'left-sidebar raci-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-title">
                    <i class="fas fa-sitemap neon-icon"></i>
                    <div class="title-content">
                        <h2>RACI матриці</h2>
                        <p>Розподіл ролей та відповідальності</p>
                    </div>
                </div>
                <div class="sidebar-controls">
                    <span class="client-count" id="raci-client-count">0</span>
                    <button class="sidebar-toggle-btn" id="toggle-raci-sidebar" title="Згорнути/розгорнути">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
            </div>

            <div class="sidebar-content">
                <div class="sidebar-actions">
                    <button class="btn-primary add-client-btn" id="add-raci-client">
                        <i class="fas fa-plus"></i>
                        <span class="btn-text">Створити RACI</span>
                    </button>
                    <button class="btn-secondary import-btn" id="import-raci">
                        <i class="fas fa-upload"></i>
                        <span class="btn-text">Імпорт матриці</span>
                    </button>
                </div>

                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="raci-search" placeholder="Пошук матриць...">
                        <button class="search-clear" id="clear-raci-search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="project-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-diagram-project"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-raci-matrices">0</div>
                            <div class="stat-label">Матриць</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-users-gear"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-raci-roles">0</div>
                            <div class="stat-label">Ролей</div>
                        </div>
                    </div>
                </div>

                <div class="client-list-container">
                    <div class="client-list" id="raci-client-list">
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-sitemap"></i>
                            </div>
                            <h4>Немає RACI матриць</h4>
                            <p>Створіть першу матрицю для аналізу розподілу ролей</p>
                            <button class="btn-primary btn-sm" onclick="sidebarManager.showAddClientForm('raci')">
                                <i class="fas fa-plus"></i>
                                Створити RACI
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return sidebar;
    }

    // Create Salary Analysis sidebar
    createSalarySidebar() {
        const sidebar = document.createElement('aside');
        sidebar.id = 'salary-sidebar';
        sidebar.className = 'left-sidebar salary-sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="sidebar-title">
                    <i class="fas fa-dollar-sign neon-icon"></i>
                    <div class="title-content">
                        <h2>Аналіз зарплат</h2>
                        <p>Оцінка компенсацій та витрат</p>
                    </div>
                </div>
                <div class="sidebar-controls">
                    <span class="client-count" id="salary-client-count">0</span>
                    <button class="sidebar-toggle-btn" id="toggle-salary-sidebar" title="Згорнути/розгорнути">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
            </div>

            <div class="sidebar-content">
                <div class="sidebar-actions">
                    <button class="btn-primary add-client-btn" id="add-salary-client">
                        <i class="fas fa-plus"></i>
                        <span class="btn-text">Новий аналіз</span>
                    </button>
                    <button class="btn-secondary import-btn" id="import-salary">
                        <i class="fas fa-upload"></i>
                        <span class="btn-text">Імпорт даних</span>
                    </button>
                </div>

                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="salary-search" placeholder="Пошук аналізів...">
                        <button class="search-clear" id="clear-salary-search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="project-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="total-salary-analyses">0</div>
                            <div class="stat-label">Аналізів</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-money-bill-trend-up"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="avg-salary">—</div>
                            <div class="stat-label">Середня ЗП</div>
                        </div>
                    </div>
                </div>

                <div class="client-list-container">
                    <div class="client-list" id="salary-client-list">
                        <div class="empty-state">
                            <div class="empty-icon">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                            <h4>Немає аналізів зарплат</h4>
                            <p>Створіть перший аналіз для оцінки компенсацій</p>
                            <button class="btn-primary btn-sm" onclick="sidebarManager.showAddClientForm('salary')">
                                <i class="fas fa-plus"></i>
                                Новий аналіз
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return sidebar;
    }

    // Setup toggle buttons
    setupToggleButtons() {
        // Left sidebar toggles
        document.addEventListener('click', (e) => {
            if (e.target.matches('#toggle-negotiations-sidebar, #toggle-negotiations-sidebar *')) {
                this.toggleSidebar('leftNegotiations');
            } else if (e.target.matches('#toggle-teamhub-sidebar, #toggle-teamhub-sidebar *')) {
                this.toggleSidebar('leftTeamHub');
            } else if (e.target.matches('#toggle-raci-sidebar, #toggle-raci-sidebar *')) {
                this.toggleSidebar('leftRaci');
            } else if (e.target.matches('#toggle-salary-sidebar, #toggle-salary-sidebar *')) {
                this.toggleSidebar('leftSalary');
            }
        });

        // Right sidebar toggle (add to header)
        this.addRightSidebarToggle();
    }

    // Add right sidebar toggle to header
    addRightSidebarToggle() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        // Create container for sidebar toggles
        const sidebarToggles = document.createElement('div');
        sidebarToggles.className = 'sidebar-toggles';
        sidebarToggles.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';

        // Left sidebar toggle
        const leftToggleBtn = document.createElement('button');
        leftToggleBtn.id = 'header-toggle-left-sidebar';
        leftToggleBtn.className = 'btn-ghost sidebar-toggle-header';
        leftToggleBtn.innerHTML = `
            <i class="fas fa-bars"></i>
            <span>Клієнти</span>
        `;
        leftToggleBtn.title = 'Показати/сховати лівий сайдбар';

        leftToggleBtn.addEventListener('click', () => {
            const moduleMap = {
                'negotiations': 'leftNegotiations',
                'teamhub': 'leftTeamHub',
                'raci': 'leftRaci',
                'salary': 'leftSalary'
            };
            this.toggleSidebar(moduleMap[this.currentModule] || 'leftNegotiations');
        });

        // Right sidebar toggle
        const rightToggleBtn = document.createElement('button');
        rightToggleBtn.id = 'toggle-right-sidebar';
        rightToggleBtn.className = 'btn-ghost sidebar-toggle-header';
        rightToggleBtn.innerHTML = `
            <i class="fas fa-history"></i>
            <span>Архів</span>
        `;
        rightToggleBtn.title = 'Показати/сховати архів аналізів';

        rightToggleBtn.addEventListener('click', () => {
            this.toggleSidebar('right');
        });

        sidebarToggles.appendChild(leftToggleBtn);
        sidebarToggles.appendChild(rightToggleBtn);
        headerActions.appendChild(sidebarToggles);
    }

    // Setup event listeners
    setupEventListeners() {
        // Module change listener
        document.addEventListener('moduleChange', (event) => {
            this.switchModule(event.detail.module);
        });

        // Search functionality
        this.setupSearchListeners();

        // Filter tabs
        this.setupFilterTabs();

        // Add client buttons
        this.setupAddClientButtons();
    }

    // Setup search listeners
    setupSearchListeners() {
        const searches = {
            'negotiations-search': 'negotiations',
            'teamhub-search': 'teamhub',
            'raci-search': 'raci',
            'salary-search': 'salary'
        };

        Object.entries(searches).forEach(([id, module]) => {
            const searchInput = document.getElementById(id);
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    this.filterClients(module, e.target.value);
                });
            }
        });

        // Setup clear search buttons
        const clearButtons = {
            'clear-negotiations-search': 'negotiations-search',
            'clear-teamhub-search': 'teamhub-search',
            'clear-raci-search': 'raci-search',
            'clear-salary-search': 'salary-search'
        };

        Object.entries(clearButtons).forEach(([btnId, inputId]) => {
            const btn = document.getElementById(btnId);
            const input = document.getElementById(inputId);
            if (btn && input) {
                btn.addEventListener('click', () => {
                    input.value = '';
                    input.dispatchEvent(new Event('input'));
                });
            }
        });
    }

    // Setup filter tabs
    setupFilterTabs() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.filter-tab, .filter-tab *')) {
                const tab = e.target.closest('.filter-tab');
                const filter = tab.dataset.filter;
                this.applyFilter('negotiations', filter);
            }
        });
    }

    // Setup add client buttons
    setupAddClientButtons() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('#add-negotiations-client, #add-negotiations-client *')) {
                this.showAddClientForm('negotiations');
            } else if (e.target.matches('#add-teamhub-client, #add-teamhub-client *')) {
                this.showAddClientForm('teamhub');
            } else if (e.target.matches('#add-raci-client, #add-raci-client *')) {
                this.showAddClientForm('raci');
            } else if (e.target.matches('#add-salary-client, #add-salary-client *')) {
                this.showAddClientForm('salary');
            }
        });

        // Setup import buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('#import-negotiations, #import-negotiations *')) {
                this.handleImport('negotiations');
            } else if (e.target.matches('#import-teamhub, #import-teamhub *')) {
                this.handleImport('teamhub');
            } else if (e.target.matches('#import-raci, #import-raci *')) {
                this.handleImport('raci');
            } else if (e.target.matches('#import-salary, #import-salary *')) {
                this.handleImport('salary');
            }
        });

        // Setup client item clicks
        document.addEventListener('click', (e) => {
            const clientItem = e.target.closest('.client-item');
            if (clientItem && !e.target.closest('.client-actions')) {
                const clientId = clientItem.dataset.clientId;
                const module = clientItem.dataset.module;
                this.selectClient(clientId, module);
            }
        });
    }

    // Switch between modules
    switchModule(module) {
        const oldModule = this.currentModule;

        // Map module names to internal identifiers
        const moduleMap = {
            'analysis-dashboard': 'negotiations',
            'team-hub': 'teamhub',
            'raci-matrix': 'raci',
            'salary-analysis': 'salary'
        };

        this.currentModule = moduleMap[module] || module;

        console.log(`🔄 Module switch: ${oldModule} → ${this.currentModule}`);

        if (oldModule !== this.currentModule) {
            this.updateSidebarVisibility();
            this.updateRightSidebarVisibility();
            this.loadDataForModule(this.currentModule);
        }
    }

    // Update sidebar visibility based on current module
    updateSidebarVisibility() {
        const sidebars = {
            negotiations: document.getElementById('negotiations-sidebar'),
            teamhub: document.getElementById('teamhub-sidebar'),
            raci: document.getElementById('raci-sidebar'),
            salary: document.getElementById('salary-sidebar')
        };

        console.log('🔄 Updating sidebar visibility for module:', this.currentModule);

        // Hide all sidebars first
        Object.entries(sidebars).forEach(([key, sidebar]) => {
            if (sidebar) {
                sidebar.style.display = 'none';
                const stateKey = `left${key.charAt(0).toUpperCase() + key.slice(1)}`;
                if (this.sidebarStates[stateKey]) {
                    this.sidebarStates[stateKey].visible = false;
                }
            }
        });

        // Show current module sidebar
        const currentSidebar = sidebars[this.currentModule];
        if (currentSidebar) {
            currentSidebar.style.display = 'flex';
            currentSidebar.style.visibility = 'visible';
            const stateKey = `left${this.currentModule.charAt(0).toUpperCase() + this.currentModule.slice(1)}`;
            if (this.sidebarStates[stateKey]) {
                this.sidebarStates[stateKey].visible = true;
            }
            console.log(`✅ ${this.currentModule} sidebar shown`);
        }

        this.updateLayoutSpacing();
    }

    // Update right sidebar visibility
    updateRightSidebarVisibility() {
        const rightSidebar = document.querySelector('.right-sidebar');
        const rightToggleBtn = document.getElementById('toggle-right-sidebar');

        if (this.currentModule === 'teamhub') {
            // Hide right sidebar in team hub
            if (rightSidebar) {
                rightSidebar.style.display = 'none';
                this.sidebarStates.right.visible = false;
            }
            if (rightToggleBtn) {
                rightToggleBtn.style.display = 'none';
            }
        } else {
            // Show right sidebar in negotiations
            if (rightSidebar) {
                rightSidebar.style.display = this.sidebarStates.right.collapsed ? 'none' : 'flex';
                this.sidebarStates.right.visible = true;
            }
            if (rightToggleBtn) {
                rightToggleBtn.style.display = 'flex';
            }
        }
    }

    // Toggle sidebar
    toggleSidebar(sidebarType) {
        const state = this.sidebarStates[sidebarType];
        state.collapsed = !state.collapsed;

        let sidebar, toggleBtn;

        switch (sidebarType) {
            case 'leftNegotiations':
                sidebar = document.getElementById('negotiations-sidebar');
                toggleBtn = document.getElementById('toggle-negotiations-sidebar');
                break;
            case 'leftTeamHub':
                sidebar = document.getElementById('teamhub-sidebar');
                toggleBtn = document.getElementById('toggle-teamhub-sidebar');
                break;
            case 'leftRaci':
                sidebar = document.getElementById('raci-sidebar');
                toggleBtn = document.getElementById('toggle-raci-sidebar');
                break;
            case 'leftSalary':
                sidebar = document.getElementById('salary-sidebar');
                toggleBtn = document.getElementById('toggle-salary-sidebar');
                break;
            case 'right':
                sidebar = document.querySelector('.right-sidebar');
                toggleBtn = document.getElementById('toggle-right-sidebar');
                break;
        }

        if (sidebar && toggleBtn) {
            this.animateSidebarToggle(sidebar, toggleBtn, state.collapsed);
        }

        console.log(`🔄 Sidebar toggled: ${sidebarType}, collapsed: ${state.collapsed}`);
    }

    // Animate sidebar toggle
    animateSidebarToggle(sidebar, toggleBtn, collapsed) {
        const icon = toggleBtn.querySelector('i');
        const content = sidebar.querySelector('.sidebar-content');
        const btnTexts = sidebar.querySelectorAll('.btn-text');

        if (collapsed) {
            // Collapse
            sidebar.classList.add('collapsed');
            if (content) content.style.display = 'none';
            if (icon) {
                if (sidebar.classList.contains('right-sidebar')) {
                    icon.className = 'fas fa-chevron-left';
                } else {
                    icon.className = 'fas fa-chevron-right';
                }
            }
            btnTexts.forEach(text => text.style.display = 'none');
        } else {
            // Expand
            sidebar.classList.remove('collapsed');
            if (content) content.style.display = 'block';
            if (icon) {
                if (sidebar.classList.contains('right-sidebar')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-left';
                }
            }
            btnTexts.forEach(text => text.style.display = 'inline');
        }

        // Update layout
        this.updateLayoutSpacing();
    }

    // Update layout spacing
    updateLayoutSpacing() {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        const leftCollapsed = this.isLeftSidebarCollapsed();
        const leftVisible = this.isLeftSidebarVisible();
        const rightCollapsed = this.sidebarStates.right.collapsed;
        const rightVisible = this.sidebarStates.right.visible;

        console.log('📐 Layout spacing update:', {
            leftVisible,
            leftCollapsed,
            rightVisible,
            rightCollapsed
        });

        // Adjust main content margins
        let marginLeft = '20px';
        if (leftVisible) {
            marginLeft = leftCollapsed ? '80px' : '320px';
        }

        let marginRight = '20px';
        if (rightVisible && !rightCollapsed) {
            marginRight = '350px';
        }

        mainContent.style.marginLeft = marginLeft;
        mainContent.style.marginRight = marginRight;
        mainContent.style.transition = 'margin 0.3s ease';

        console.log('📐 Applied margins:', { marginLeft, marginRight });
    }

    // Check if left sidebar is visible
    isLeftSidebarVisible() {
        const stateMap = {
            'negotiations': 'leftNegotiations',
            'teamhub': 'leftTeamHub',
            'raci': 'leftRaci',
            'salary': 'leftSalary'
        };
        const stateKey = stateMap[this.currentModule];
        return stateKey ? this.sidebarStates[stateKey].visible : false;
    }

    // Check if left sidebar is collapsed
    isLeftSidebarCollapsed() {
        const stateMap = {
            'negotiations': 'leftNegotiations',
            'teamhub': 'leftTeamHub',
            'raci': 'leftRaci',
            'salary': 'leftSalary'
        };
        const stateKey = stateMap[this.currentModule];
        return stateKey ? this.sidebarStates[stateKey].collapsed : false;
    }

    // Filter clients
    filterClients(module, searchTerm) {
        const clientList = document.getElementById(`${module}-client-list`);
        if (!clientList) return;

        const clients = clientList.querySelectorAll('.client-item');
        const term = searchTerm.toLowerCase();

        clients.forEach(client => {
            const name = client.querySelector('.client-name')?.textContent.toLowerCase() || '';
            const meta = client.querySelector('.client-meta')?.textContent.toLowerCase() || '';

            if (name.includes(term) || meta.includes(term)) {
                client.style.display = 'flex';
            } else {
                client.style.display = 'none';
            }
        });
    }

    // Apply filter
    applyFilter(module, filter) {
        const tabs = document.querySelectorAll('.filter-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === filter);
        });

        // Apply filter logic here
        this.filterClientsByStatus(module, filter);
    }

    // Filter clients by status
    filterClientsByStatus(module, status) {
        const clientList = document.getElementById(`${module}-client-list`);
        if (!clientList) return;

        const clients = clientList.querySelectorAll('.client-item');

        clients.forEach(client => {
            if (status === 'all') {
                client.style.display = 'flex';
            } else {
                // Implement status-based filtering
                const clientStatus = client.dataset.status || 'active';
                client.style.display = clientStatus === status ? 'flex' : 'none';
            }
        });
    }

    // Show add client form
    showAddClientForm(module) {
        // Set context for client creation
        if (window.clientTypeManager) {
            window.clientTypeManager.currentModule = module;
        }

        // Focus on company input
        const companyInput = document.getElementById('company');
        if (companyInput) {
            companyInput.focus();
        }

        // Trigger form display if needed
        const clientForm = document.querySelector('.client-form-container');
        if (clientForm && clientForm.style.display === 'none') {
            clientForm.style.display = 'block';
        }
    }

    // Load clients for current module
    async loadClients(module) {
        const clientType = module === 'teamhub' ? 'team' : 'negotiation';

        try {
            const response = await fetch(`/api/clients?type=${clientType}&active=true`);
            if (!response.ok) throw new Error('Failed to load clients');

            const data = await response.json();
            this.renderClients(module, data.clients || []);

        } catch (error) {
            console.error(`❌ Failed to load ${module} clients:`, error);
        }
    }

    // Render clients in sidebar
    renderClients(module, clients) {
        const clientList = document.getElementById(`${module}-client-list`);
        if (!clientList) return;

        if (clients.length === 0) {
            clientList.innerHTML = this.getEmptyStateHTML(module);
            return;
        }

        clientList.innerHTML = clients.map(client => this.renderClientItem(client, module)).join('');
        this.updateClientCounts(module, clients);
    }

    // Render individual client item
    renderClientItem(client, module) {
        const icon = module === 'teamhub' ? 'fas fa-users' : 'fas fa-handshake';
        const metricLabel = module === 'teamhub' ? 'команд' : 'аналізів';
        const metricCount = module === 'teamhub' ? (client.teams_count || 0) : (client.analyses_count || 0);

        return `
            <div class="client-item" data-client-id="${client.id}" data-module="${module}">
                <div class="client-avatar">
                    <i class="${icon}"></i>
                </div>
                <div class="client-info">
                    <div class="client-name">${client.company}</div>
                    <div class="client-meta">${client.negotiator || client.sector || 'Без опису'}</div>
                    <div class="client-stats">
                        <span class="stat">
                            <i class="fas fa-chart-bar"></i>
                            ${metricCount} ${metricLabel}
                        </span>
                    </div>
                </div>
                <div class="client-actions">
                    <button class="btn-icon btn-xs" onclick="event.stopPropagation(); sidebarManager.editClient('${client.id}', '${module}')" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-xs btn-danger" onclick="event.stopPropagation(); sidebarManager.deleteClient('${client.id}', '${module}')" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Get empty state HTML
    getEmptyStateHTML(module) {
        if (module === 'teamhub') {
            return `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h4>Немає діючих проєктів</h4>
                    <p>Створіть перший проєкт для управління командами</p>
                    <button class="btn-primary btn-sm" onclick="sidebarManager.showAddClientForm('teamhub')">
                        <i class="fas fa-plus"></i>
                        Створити проєкт
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-handshake"></i>
                    </div>
                    <h4>Немає клієнтів для переговорів</h4>
                    <p>Додайте першого клієнта для аналізу переговорів</p>
                    <button class="btn-primary btn-sm" onclick="sidebarManager.showAddClientForm('negotiations')">
                        <i class="fas fa-plus"></i>
                        Додати клієнта
                    </button>
                </div>
            `;
        }
    }

    // Update client counts
    updateClientCounts(module, clients) {
        const countElement = document.getElementById(`${module}-client-count`);
        if (countElement) {
            countElement.textContent = clients.length;
        }

        // Update filter tab counts
        if (module === 'negotiations') {
            const activeCount = clients.filter(c => !c.completed).length;
            const completedCount = clients.filter(c => c.completed).length;

            const allCountEl = document.getElementById('all-negotiations-count');
            const activeCountEl = document.getElementById('active-negotiations-count');
            const completedCountEl = document.getElementById('completed-negotiations-count');

            if (allCountEl) allCountEl.textContent = clients.length;
            if (activeCountEl) activeCountEl.textContent = activeCount;
            if (completedCountEl) completedCountEl.textContent = completedCount;
        }
    }

    // Edit client
    editClient(clientId, module) {
        console.log(`Editing client ${clientId} in ${module} module`);
        // Implement edit functionality
    }

    // Delete client
    deleteClient(clientId, module) {
        if (window.deleteClientEnhanced) {
            window.deleteClientEnhanced(clientId);
        }
    }

    // Load data for specific module
    async loadDataForModule(module) {
        console.log(`📊 Loading data for module: ${module}`);

        switch (module) {
            case 'negotiations':
                await this.loadClients('negotiations');
                break;
            case 'teamhub':
                await this.loadTeamHubData();
                break;
            case 'raci':
                await this.loadRaciData();
                break;
            case 'salary':
                await this.loadSalaryData();
                break;
        }
    }

    // Load TeamHub data
    async loadTeamHubData() {
        try {
            const response = await fetch('/api/clients?type=team&active=true');
            if (!response.ok) throw new Error('Failed to load team hub data');

            const data = await response.json();
            this.renderClients('teamhub', data.clients || []);

            // Update stats
            const totalProjects = data.clients?.length || 0;
            const totalMembers = data.clients?.reduce((sum, client) => sum + (client.members_count || 0), 0) || 0;

            const totalProjectsEl = document.getElementById('total-projects');
            const totalMembersEl = document.getElementById('total-members');

            if (totalProjectsEl) totalProjectsEl.textContent = totalProjects;
            if (totalMembersEl) totalMembersEl.textContent = totalMembers;

        } catch (error) {
            console.error('❌ Failed to load team hub data:', error);
        }
    }

    // Load RACI data
    async loadRaciData() {
        try {
            const response = await fetch('/api/teams');
            if (!response.ok) throw new Error('Failed to load RACI data');

            const data = await response.json();
            const teams = data.teams || [];

            // Render RACI matrices
            const raciList = document.getElementById('raci-client-list');
            if (!raciList) return;

            if (teams.length === 0) {
                raciList.innerHTML = this.getEmptyStateHTML('raci');
                return;
            }

            raciList.innerHTML = teams.map(team => `
                <div class="client-item" data-client-id="${team.id}" data-module="raci">
                    <div class="client-avatar">
                        <i class="fas fa-sitemap"></i>
                    </div>
                    <div class="client-info">
                        <div class="client-name">${team.title || 'Без назви'}</div>
                        <div class="client-meta">${team.description || 'RACI матриця'}</div>
                        <div class="client-stats">
                            <span class="stat">
                                <i class="fas fa-users"></i>
                                ${team.members_count || 0} ролей
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');

            // Update counts
            const totalRaciEl = document.getElementById('total-raci-matrices');
            const totalRolesEl = document.getElementById('total-raci-roles');
            const raciCountEl = document.getElementById('raci-client-count');

            const totalRoles = teams.reduce((sum, team) => sum + (team.members_count || 0), 0);

            if (totalRaciEl) totalRaciEl.textContent = teams.length;
            if (totalRolesEl) totalRolesEl.textContent = totalRoles;
            if (raciCountEl) raciCountEl.textContent = teams.length;

        } catch (error) {
            console.error('❌ Failed to load RACI data:', error);
        }
    }

    // Load Salary Analysis data
    async loadSalaryData() {
        try {
            const response = await fetch('/api/teams?with_salary=true');
            if (!response.ok) throw new Error('Failed to load salary data');

            const data = await response.json();
            const teams = data.teams || [];

            // Render salary analyses
            const salaryList = document.getElementById('salary-client-list');
            if (!salaryList) return;

            if (teams.length === 0) {
                salaryList.innerHTML = this.getEmptyStateHTML('salary');
                return;
            }

            salaryList.innerHTML = teams.map(team => `
                <div class="client-item" data-client-id="${team.id}" data-module="salary">
                    <div class="client-avatar">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="client-info">
                        <div class="client-name">${team.title || 'Без назви'}</div>
                        <div class="client-meta">Аналіз компенсацій</div>
                        <div class="client-stats">
                            <span class="stat">
                                <i class="fas fa-users"></i>
                                ${team.members_count || 0} учасників
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');

            // Update counts
            const totalAnalysesEl = document.getElementById('total-salary-analyses');
            const salaryCountEl = document.getElementById('salary-client-count');

            if (totalAnalysesEl) totalAnalysesEl.textContent = teams.length;
            if (salaryCountEl) salaryCountEl.textContent = teams.length;

            // Calculate average salary
            const avgSalaryEl = document.getElementById('avg-salary');
            if (avgSalaryEl) {
                // This would need actual salary data from the API
                avgSalaryEl.textContent = '—';
            }

        } catch (error) {
            console.error('❌ Failed to load salary data:', error);
        }
    }

    // Select client/item
    selectClient(clientId, module) {
        console.log(`✅ Selected client ${clientId} in ${module} module`);

        // Remove previous selection
        document.querySelectorAll('.client-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to clicked item
        const selectedItem = document.querySelector(`.client-item[data-client-id="${clientId}"][data-module="${module}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Trigger appropriate action based on module
        if (window.app) {
            switch (module) {
                case 'negotiations':
                    if (window.app.selectClient) {
                        window.app.selectClient(clientId);
                    }
                    break;
                case 'teamhub':
                    if (window.app.selectTeam) {
                        window.app.selectTeam(clientId);
                    }
                    break;
                case 'raci':
                    if (window.app.loadRaciMatrix) {
                        window.app.loadRaciMatrix(clientId);
                    }
                    break;
                case 'salary':
                    if (window.app.loadSalaryAnalysis) {
                        window.app.loadSalaryAnalysis(clientId);
                    }
                    break;
            }
        }
    }

    // Handle import
    handleImport(module) {
        console.log(`📥 Import requested for ${module} module`);

        // Create file input dynamically
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = module === 'raci' || module === 'salary' ? '.csv,.xlsx,.xls' : '.txt,.pdf,.doc,.docx';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            console.log(`📁 File selected: ${file.name}`);

            // Here you would implement the actual import logic
            // For now, just show a notification
            if (window.showNotification) {
                window.showNotification(`Імпорт файлу "${file.name}" для модуля ${module}`, 'info');
            }
        };

        input.click();
    }
}

// Initialize sidebar manager
const sidebarManager = new SidebarManager();

// Export globally
if (typeof window !== 'undefined') {
    window.sidebarManager = sidebarManager;
    window.SidebarManager = SidebarManager;
}

console.log('✨ Dual Sidebar Manager initialized');