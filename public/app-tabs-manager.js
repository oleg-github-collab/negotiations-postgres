// TeamPulse Turbo - Tab Management System
// Manages three main tabs: Переговори (Negotiations), Тімхаб (TeamHub), Best Hire

(() => {
    'use strict';

    // ===== Global State =====
    window.TeamPulseState = {
        currentTab: 'negotiations', // negotiations | teamhub | besthire
        currentClient: null,
        clients: [],

        // Negotiations tab state
        negotiations: {
            sessions: [],
            currentSession: null,
            analyses: [],
            filters: {
                status: '',
                search: '',
                person_filter: ''
            }
        },

        // TeamHub tab state
        teamhub: {
            teams: [],
            currentTeam: null,
            members: [],
            raciSnapshots: [],
            salaryInsights: []
        },

        // Best Hire tab state
        besthire: {
            positions: [],
            currentPosition: null,
            resumes: [],
            currentResume: null,
            channels: [],
            bottlenecks: [],
            analytics: null,
            filters: {
                positionStatus: '',
                resumeStage: '',
                search: ''
            }
        },

        ui: {
            leftSidebarCollapsed: false,
            rightSidebarCollapsed: false,
            loading: false
        }
    };

    // ===== API Helpers =====
    const API = {
        async call(endpoint, options = {}) {
            const url = endpoint.startsWith('http') ? endpoint : `/api/v1${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }

            return response.json();
        },

        get(endpoint) {
            return this.call(endpoint);
        },

        post(endpoint, data) {
            return this.call(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        put(endpoint, data) {
            return this.call(endpoint, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        patch(endpoint, data) {
            return this.call(endpoint, {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
        },

        delete(endpoint) {
            return this.call(endpoint, { method: 'DELETE' });
        }
    };

    window.TeamPulseAPI = API;

    // ===== Tab Management =====
    const TabManager = {
        init() {
            this.setupTabListeners();
            this.loadInitialData();
        },

        setupTabListeners() {
            document.querySelectorAll('[data-tab]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tab = e.currentTarget.dataset.tab;
                    this.switchTab(tab);
                });
            });
        },

        switchTab(tabName) {
            window.TeamPulseState.currentTab = tabName;

            // Update tab buttons
            document.querySelectorAll('[data-tab]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.style.display = content.dataset.tabContent === tabName ? 'block' : 'none';
            });

            // Load tab data
            this.loadTabData(tabName);
        },

        async loadTabData(tabName) {
            switch (tabName) {
                case 'negotiations':
                    await NegotiationsTab.load();
                    break;
                case 'teamhub':
                    await TeamHubTab.load();
                    break;
                case 'besthire':
                    await BestHireTab.load();
                    break;
            }
        },

        async loadInitialData() {
            try {
                // Load all clients
                const clientsRes = await API.get('/clients');
                window.TeamPulseState.clients = clientsRes.clients || [];
                this.renderClientList();

                // Load default tab
                this.switchTab('negotiations');
            } catch (error) {
                console.error('Failed to load initial data:', error);
                showNotification('Помилка завантаження даних', 'error');
            }
        },

        renderClientList() {
            const container = document.getElementById('client-list');
            if (!container) return;

            const clients = window.TeamPulseState.clients;

            if (clients.length === 0) {
                container.innerHTML = '<div class="empty-state">Немає клієнтів</div>';
                return;
            }

            container.innerHTML = clients.map(client => `
                <div class="client-item ${client.id === window.TeamPulseState.currentClient?.id ? 'active' : ''}"
                     data-client-id="${client.id}"
                     onclick="TabManager.selectClient(${client.id})">
                    <div class="client-item-header">
                        <span class="client-name">${escapeHtml(client.company)}</span>
                        <span class="client-type-badge ${client.client_type || 'negotiation'}">
                            ${client.client_type === 'active' ? 'Активний' : 'Потенційний'}
                        </span>
                    </div>
                    ${client.negotiator ? `<div class="client-meta">${escapeHtml(client.negotiator)}</div>` : ''}
                </div>
            `).join('');
        },

        async selectClient(clientId) {
            const client = window.TeamPulseState.clients.find(c => c.id === clientId);
            if (!client) return;

            window.TeamPulseState.currentClient = client;
            this.renderClientList();

            // Reload current tab data
            await this.loadTabData(window.TeamPulseState.currentTab);
        }
    };

    window.TabManager = TabManager;

    // ===== Negotiations Tab =====
    const NegotiationsTab = {
        async load() {
            if (!window.TeamPulseState.currentClient) {
                this.renderEmpty();
                return;
            }

            try {
                const clientId = window.TeamPulseState.currentClient.id;

                // Load negotiations for client
                const res = await API.get(`/negotiations/client/${clientId}`);
                window.TeamPulseState.negotiations.sessions = res.negotiations || [];

                this.render();
            } catch (error) {
                console.error('Failed to load negotiations:', error);
                showNotification('Помилка завантаження переговорів', 'error');
            }
        },

        render() {
            const container = document.getElementById('negotiations-content');
            if (!container) return;

            const sessions = window.TeamPulseState.negotiations.sessions;

            if (sessions.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments fa-3x"></i>
                        <h3>Немає переговорів</h3>
                        <p>Створіть новий сеанс переговорів для аналізу</p>
                        <button class="btn-primary" onclick="NegotiationsTab.createSession()">
                            <i class="fas fa-plus"></i> Новий сеанс
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="negotiations-header">
                    <h2>Переговори з ${escapeHtml(window.TeamPulseState.currentClient.company)}</h2>
                    <button class="btn-primary" onclick="NegotiationsTab.createSession()">
                        <i class="fas fa-plus"></i> Новий сеанс
                    </button>
                </div>
                <div class="negotiations-list">
                    ${sessions.map(session => this.renderSessionCard(session)).join('')}
                </div>
            `;
        },

        renderSessionCard(session) {
            return `
                <div class="session-card" onclick="NegotiationsTab.openSession(${session.id})">
                    <div class="session-header">
                        <h3>${escapeHtml(session.title)}</h3>
                        <span class="session-status ${session.status}">${this.getStatusLabel(session.status)}</span>
                    </div>
                    <div class="session-meta">
                        <span><i class="fas fa-file-alt"></i> ${session.analysis_count || 0} аналізів</span>
                        <span><i class="fas fa-clock"></i> ${formatDate(session.updated_at)}</span>
                    </div>
                </div>
            `;
        },

        getStatusLabel(status) {
            const labels = {
                active: 'Активні',
                completed: 'Завершені',
                cancelled: 'Скасовані',
                paused: 'Призупинені'
            };
            return labels[status] || status;
        },

        renderEmpty() {
            const container = document.getElementById('negotiations-content');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-tie fa-3x"></i>
                        <h3>Оберіть клієнта</h3>
                        <p>Виберіть клієнта зліва для перегляду переговорів</p>
                    </div>
                `;
            }
        },

        async createSession() {
            // Implementation for creating new negotiation session
            console.log('Create session for client:', window.TeamPulseState.currentClient);
            showNotification('Створення сеансу переговорів...', 'info');
        },

        async openSession(sessionId) {
            // Implementation for opening session details
            console.log('Open session:', sessionId);
        }
    };

    window.NegotiationsTab = NegotiationsTab;

    // ===== TeamHub Tab =====
    const TeamHubTab = {
        async load() {
            if (!window.TeamPulseState.currentClient) {
                this.renderEmpty();
                return;
            }

            try {
                const clientId = window.TeamPulseState.currentClient.id;

                // Load teams for client
                const res = await API.get(`/teams/client/${clientId}`);
                window.TeamPulseState.teamhub.teams = res.teams || [];

                this.render();
            } catch (error) {
                console.error('Failed to load teams:', error);
                showNotification('Помилка завантаження команд', 'error');
            }
        },

        render() {
            const container = document.getElementById('teamhub-content');
            if (!container) return;

            const teams = window.TeamPulseState.teamhub.teams;

            if (teams.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users fa-3x"></i>
                        <h3>Немає команд</h3>
                        <p>Створіть команду для управління персоналом</p>
                        <button class="btn-primary" onclick="TeamHubTab.createTeam()">
                            <i class="fas fa-plus"></i> Нова команда
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="teamhub-header">
                    <h2>Команди ${escapeHtml(window.TeamPulseState.currentClient.company)}</h2>
                    <button class="btn-primary" onclick="TeamHubTab.createTeam()">
                        <i class="fas fa-plus"></i> Нова команда
                    </button>
                </div>
                <div class="teams-list">
                    ${teams.map(team => this.renderTeamCard(team)).join('')}
                </div>
            `;
        },

        renderTeamCard(team) {
            return `
                <div class="team-card" onclick="TeamHubTab.openTeam(${team.id})">
                    <div class="team-header">
                        <h3>${escapeHtml(team.title)}</h3>
                        <span class="team-members-count">${team.member_count || 0} членів</span>
                    </div>
                    ${team.description ? `<p class="team-description">${escapeHtml(team.description)}</p>` : ''}
                    <div class="team-meta">
                        <span><i class="fas fa-clock"></i> ${formatDate(team.updated_at)}</span>
                    </div>
                </div>
            `;
        },

        renderEmpty() {
            const container = document.getElementById('teamhub-content');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-tie fa-3x"></i>
                        <h3>Оберіть клієнта</h3>
                        <p>Виберіть клієнта зліва для перегляду команд</p>
                    </div>
                `;
            }
        },

        async createTeam() {
            console.log('Create team for client:', window.TeamPulseState.currentClient);
            showNotification('Створення команди...', 'info');
        },

        async openTeam(teamId) {
            console.log('Open team:', teamId);
        }
    };

    window.TeamHubTab = TeamHubTab;

    // ===== Best Hire Tab =====
    const BestHireTab = {
        async load() {
            if (!window.TeamPulseState.currentClient) {
                this.renderEmpty();
                return;
            }

            try {
                const clientId = window.TeamPulseState.currentClient.id;

                // Load positions and analytics
                const [positionsRes, analyticsRes] = await Promise.all([
                    API.get(`/best-hire/positions/client/${clientId}`),
                    API.get(`/best-hire/analytics/client/${clientId}`)
                ]);

                window.TeamPulseState.besthire.positions = positionsRes.positions || [];
                window.TeamPulseState.besthire.analytics = analyticsRes.analytics || null;

                this.render();
            } catch (error) {
                console.error('Failed to load Best Hire data:', error);
                showNotification('Помилка завантаження Best Hire', 'error');
            }
        },

        render() {
            const container = document.getElementById('besthire-content');
            if (!container) return;

            const positions = window.TeamPulseState.besthire.positions;
            const analytics = window.TeamPulseState.besthire.analytics;

            container.innerHTML = `
                <div class="besthire-header">
                    <h2>Best Hire - ${escapeHtml(window.TeamPulseState.currentClient.company)}</h2>
                    <button class="btn-primary" onclick="BestHireTab.createPosition()">
                        <i class="fas fa-plus"></i> Нова позиція
                    </button>
                </div>

                ${analytics ? this.renderAnalytics(analytics) : ''}

                <div class="positions-section">
                    <h3>Відкриті позиції</h3>
                    ${positions.length === 0 ? this.renderEmptyPositions() : this.renderPositions(positions)}
                </div>
            `;
        },

        renderAnalytics(analytics) {
            return `
                <div class="analytics-grid">
                    <div class="analytics-card">
                        <div class="analytics-icon"><i class="fas fa-briefcase"></i></div>
                        <div class="analytics-content">
                            <div class="analytics-value">${analytics.positions?.open_positions || 0}</div>
                            <div class="analytics-label">Відкритих позицій</div>
                        </div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-icon"><i class="fas fa-file-alt"></i></div>
                        <div class="analytics-content">
                            <div class="analytics-value">${this.getTotalResumes(analytics)}</div>
                            <div class="analytics-label">Резюме всього</div>
                        </div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-icon"><i class="fas fa-user-check"></i></div>
                        <div class="analytics-content">
                            <div class="analytics-value">${analytics.positions?.filled_positions || 0}</div>
                            <div class="analytics-label">Закритих позицій</div>
                        </div>
                    </div>
                    <div class="analytics-card">
                        <div class="analytics-icon"><i class="fas fa-exclamation-triangle"></i></div>
                        <div class="analytics-content">
                            <div class="analytics-value">${analytics.bottlenecks?.length || 0}</div>
                            <div class="analytics-label">Активних боттлнеків</div>
                        </div>
                    </div>
                </div>
            `;
        },

        getTotalResumes(analytics) {
            if (!analytics.resumes_by_stage) return 0;
            return analytics.resumes_by_stage.reduce((sum, stage) => sum + (stage.count || 0), 0);
        },

        renderPositions(positions) {
            return `
                <div class="positions-grid">
                    ${positions.map(pos => this.renderPositionCard(pos)).join('')}
                </div>
            `;
        },

        renderPositionCard(position) {
            const statusColors = {
                open: 'green',
                filled: 'blue',
                paused: 'yellow',
                closed: 'gray'
            };

            return `
                <div class="position-card" onclick="BestHireTab.openPosition(${position.id})">
                    <div class="position-header">
                        <h3>${escapeHtml(position.title)}</h3>
                        <span class="position-status ${statusColors[position.status]}">${position.status}</span>
                    </div>
                    <div class="position-details">
                        <div class="position-meta">
                            <i class="fas fa-map-marker-alt"></i> ${escapeHtml(position.location || 'Не вказано')}
                        </div>
                        <div class="position-meta">
                            <i class="fas fa-money-bill-wave"></i>
                            ${position.salary_min && position.salary_max
                                ? `${position.salary_min}-${position.salary_max} ${position.salary_currency}`
                                : 'Не вказано'}
                        </div>
                        <div class="position-meta">
                            <i class="fas fa-users"></i> ${position.total_resumes || 0} кандидатів
                        </div>
                    </div>
                </div>
            `;
        },

        renderEmptyPositions() {
            return `
                <div class="empty-state-small">
                    <i class="fas fa-briefcase"></i>
                    <p>Немає відкритих позицій</p>
                </div>
            `;
        },

        renderEmpty() {
            const container = document.getElementById('besthire-content');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-tie fa-3x"></i>
                        <h3>Оберіть клієнта</h3>
                        <p>Виберіть клієнта зліва для перегляду Best Hire</p>
                    </div>
                `;
            }
        },

        async createPosition() {
            console.log('Create position for client:', window.TeamPulseState.currentClient);
            showNotification('Створення позиції...', 'info');
        },

        async openPosition(positionId) {
            console.log('Open position:', positionId);
        }
    };

    window.BestHireTab = BestHireTab;

    // ===== Utility Functions =====
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}]`, message);
        // TODO: Implement proper notification system
    }

    // ===== Initialize on DOM Ready =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TabManager.init());
    } else {
        TabManager.init();
    }
})();
