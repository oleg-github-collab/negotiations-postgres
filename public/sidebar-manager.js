// Dual Sidebar Management System
// Manages separate left sidebars for negotiations and team hub

class SidebarManager {
    constructor() {
        this.currentModule = 'negotiations';
        this.sidebarStates = {
            leftNegotiations: { collapsed: false, visible: true },
            leftTeamHub: { collapsed: false, visible: false },
            right: { collapsed: false, visible: true }
        };
        this.init();
    }

    init() {
        this.createDualSidebars();
        this.setupToggleButtons();
        this.setupEventListeners();
        this.updateSidebarVisibility();
    }

    // Create separate sidebars for each module
    createDualSidebars() {
        const mainLayout = document.querySelector('.main-layout');
        if (!mainLayout) return;

        // Create negotiations sidebar
        const negotiationsSidebar = this.createNegotiationsSidebar();

        // Create team hub sidebar
        const teamHubSidebar = this.createTeamHubSidebar();

        // Insert sidebars before main content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.parentNode.insertBefore(negotiationsSidebar, mainContent);
            mainContent.parentNode.insertBefore(teamHubSidebar, mainContent);
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

    // Setup toggle buttons
    setupToggleButtons() {
        // Left sidebar toggles
        document.addEventListener('click', (e) => {
            if (e.target.matches('#toggle-negotiations-sidebar, #toggle-negotiations-sidebar *')) {
                this.toggleSidebar('leftNegotiations');
            } else if (e.target.matches('#toggle-teamhub-sidebar, #toggle-teamhub-sidebar *')) {
                this.toggleSidebar('leftTeamHub');
            }
        });

        // Right sidebar toggle (add to header)
        this.addRightSidebarToggle();
    }

    // Add right sidebar toggle to header
    addRightSidebarToggle() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-right-sidebar';
        toggleBtn.className = 'btn-ghost sidebar-toggle-header';
        toggleBtn.innerHTML = `
            <i class="fas fa-sidebar"></i>
            <span>Архів</span>
        `;
        toggleBtn.title = 'Показати/сховати архів аналізів';

        toggleBtn.addEventListener('click', () => {
            this.toggleSidebar('right');
        });

        headerActions.appendChild(toggleBtn);
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
        const negotiationsSearch = document.getElementById('negotiations-search');
        const teamhubSearch = document.getElementById('teamhub-search');

        if (negotiationsSearch) {
            negotiationsSearch.addEventListener('input', (e) => {
                this.filterClients('negotiations', e.target.value);
            });
        }

        if (teamhubSearch) {
            teamhubSearch.addEventListener('input', (e) => {
                this.filterClients('teamhub', e.target.value);
            });
        }
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
            }
        });
    }

    // Switch between modules
    switchModule(module) {
        const oldModule = this.currentModule;

        if (module === 'team-hub') {
            this.currentModule = 'teamhub';
        } else {
            this.currentModule = 'negotiations';
        }

        if (oldModule !== this.currentModule) {
            this.updateSidebarVisibility();
            this.updateRightSidebarVisibility();
        }
    }

    // Update sidebar visibility based on current module
    updateSidebarVisibility() {
        const negotiationsSidebar = document.getElementById('negotiations-sidebar');
        const teamhubSidebar = document.getElementById('teamhub-sidebar');

        if (this.currentModule === 'negotiations') {
            if (negotiationsSidebar) {
                negotiationsSidebar.style.display = 'flex';
                this.sidebarStates.leftNegotiations.visible = true;
            }
            if (teamhubSidebar) {
                teamhubSidebar.style.display = 'none';
                this.sidebarStates.leftTeamHub.visible = false;
            }
        } else if (this.currentModule === 'teamhub') {
            if (negotiationsSidebar) {
                negotiationsSidebar.style.display = 'none';
                this.sidebarStates.leftNegotiations.visible = false;
            }
            if (teamhubSidebar) {
                teamhubSidebar.style.display = 'flex';
                this.sidebarStates.leftTeamHub.visible = true;
            }
        }
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
            case 'right':
                sidebar = document.querySelector('.right-sidebar');
                toggleBtn = document.getElementById('toggle-right-sidebar');
                break;
        }

        if (sidebar && toggleBtn) {
            this.animateSidebarToggle(sidebar, toggleBtn, state.collapsed);
        }
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
        const rightCollapsed = this.sidebarStates.right.collapsed;
        const rightVisible = this.sidebarStates.right.visible;

        // Adjust main content margins
        let marginLeft = leftCollapsed ? '80px' : '320px';
        let marginRight = (rightVisible && !rightCollapsed) ? '350px' : '20px';

        mainContent.style.marginLeft = marginLeft;
        mainContent.style.marginRight = marginRight;
        mainContent.style.transition = 'margin 0.3s ease';
    }

    // Check if left sidebar is collapsed
    isLeftSidebarCollapsed() {
        if (this.currentModule === 'negotiations') {
            return this.sidebarStates.leftNegotiations.collapsed;
        } else {
            return this.sidebarStates.leftTeamHub.collapsed;
        }
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
}

// Initialize sidebar manager
const sidebarManager = new SidebarManager();

// Export globally
if (typeof window !== 'undefined') {
    window.sidebarManager = sidebarManager;
    window.SidebarManager = SidebarManager;
}

console.log('✨ Dual Sidebar Manager initialized');