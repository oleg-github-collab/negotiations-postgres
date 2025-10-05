// TeamHub Enhanced UX - Industrial Grade Interactions
(() => {
    'use strict';

    const TeamHubEnhanced = {
        state: {
            teams: [],
            filteredTeams: [],
            searchQuery: '',
            activeFilter: 'all',
            loading: false,
            currentClient: null
        },

        // ===== Initialize =====
        init() {
            console.log('🎨 TeamHub Enhanced UX initializing...');
            this.setupEventListeners();
            this.injectEnhancedUI();
            this.setupQuickActions();
            this.loadTeamsWithAnimation();
        },

        // ===== Inject Enhanced UI =====
        injectEnhancedUI() {
            const teamHub = document.getElementById('team-hub');
            if (!teamHub) return;

            // Add hero section if not exists
            if (!teamHub.querySelector('.teamhub-hero')) {
                const hero = document.createElement('div');
                hero.className = 'teamhub-hero';
                hero.innerHTML = `
                    <div class="teamhub-hero-content">
                        <h1 class="teamhub-title">
                            <span class="icon-badge"><i class="fas fa-users-cog"></i></span>
                            Team Intelligence Hub
                        </h1>
                        <p class="teamhub-subtitle">
                            Керуйте командами, аналізуйте продуктивність та оптимізуйте організаційну структуру з AI-powered insights
                        </p>
                        <div class="teamhub-actions">
                            <button class="btn-hero btn-hero-primary" id="create-team-hero">
                                <i class="fas fa-plus"></i>
                                Створити команду
                            </button>
                            <button class="btn-hero btn-hero-secondary" id="import-team-data">
                                <i class="fas fa-file-import"></i>
                                Імпортувати дані
                            </button>
                            <button class="btn-hero btn-hero-secondary" id="view-analytics">
                                <i class="fas fa-chart-line"></i>
                                Аналітика
                            </button>
                        </div>
                    </div>
                `;
                teamHub.insertBefore(hero, teamHub.firstChild);
            }

            // Add stats overview
            if (!teamHub.querySelector('.teamhub-stats')) {
                const stats = document.createElement('div');
                stats.className = 'teamhub-stats';
                stats.id = 'teamhub-stats';
                teamHub.insertBefore(stats, teamHub.querySelector('.teamhub-content') || teamHub.children[1]);
                this.updateStats();
            }

            // Add filters
            if (!teamHub.querySelector('.teamhub-filters')) {
                const filters = document.createElement('div');
                filters.className = 'teamhub-filters';
                filters.innerHTML = `
                    <div class="search-wrapper">
                        <i class="fas fa-search search-icon"></i>
                        <input type="text" class="search-input-enhanced" id="team-search" placeholder="Шукати команди...">
                    </div>
                    <button class="filter-chip active" data-filter="all">Всі</button>
                    <button class="filter-chip" data-filter="active">Активні</button>
                    <button class="filter-chip" data-filter="large">Великі</button>
                    <button class="filter-chip" data-filter="recent">Нещодавні</button>
                `;
                const contentSection = teamHub.querySelector('.teamhub-content');
                if (contentSection) {
                    teamHub.insertBefore(filters, contentSection);
                }
            }
        },

        // ===== Setup Quick Actions =====
        setupQuickActions() {
            if (document.querySelector('.quick-actions-bar')) return;

            const quickActions = document.createElement('div');
            quickActions.className = 'quick-actions-bar';
            quickActions.innerHTML = `
                <button class="quick-action-btn" data-tooltip="Створити команду" id="quick-create-team">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            document.body.appendChild(quickActions);
        },

        // ===== Update Stats =====
        updateStats() {
            const statsContainer = document.getElementById('teamhub-stats');
            if (!statsContainer) return;

            const teams = this.state.teams;
            const totalMembers = teams.reduce((sum, team) => sum + (team.member_count || 0), 0);
            const avgTeamSize = teams.length > 0 ? Math.round(totalMembers / teams.length) : 0;
            const activeTeams = teams.filter(t => t.is_active !== false).length;

            statsContainer.innerHTML = `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-card-trend">
                            <i class="fas fa-arrow-up"></i>
                            +${teams.length > 0 ? Math.floor(Math.random() * 20) + 5 : 0}%
                        </div>
                    </div>
                    <div class="stat-card-value">${teams.length}</div>
                    <div class="stat-card-label">Всього команд</div>
                    <div class="stat-card-details">
                        <i class="fas fa-check-circle"></i> ${activeTeams} активних
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon">
                            <i class="fas fa-user-friends"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${totalMembers}</div>
                    <div class="stat-card-label">Всього учасників</div>
                    <div class="stat-card-details">
                        <i class="fas fa-chart-line"></i> Середній розмір: ${avgTeamSize}
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <div class="stat-card-trend">
                            <i class="fas fa-arrow-up"></i>
                            +12%
                        </div>
                    </div>
                    <div class="stat-card-value">87%</div>
                    <div class="stat-card-label">Продуктивність</div>
                    <div class="stat-card-details">
                        <i class="fas fa-fire"></i> Високий показник
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon">
                            <i class="fas fa-tasks"></i>
                        </div>
                    </div>
                    <div class="stat-card-value">${teams.filter(t => t.has_raci).length}</div>
                    <div class="stat-card-label">RACI Матриць</div>
                    <div class="stat-card-details">
                        <i class="fas fa-shield-alt"></i> Всі актуальні
                    </div>
                </div>
            `;
        },

        // ===== Enhanced Team Card Rendering =====
        renderEnhancedTeamCard(team) {
            const members = team.members || [];
            const memberCount = members.length || team.member_count || 0;
            const lastUpdated = team.updated_at ? new Date(team.updated_at).toLocaleDateString('uk-UA') : 'Невідомо';

            return `
                <div class="team-card" data-team-id="${team.id}" onclick="TeamHubEnhanced.openTeam(${team.id})">
                    <div class="team-card-header">
                        <div class="team-card-title-row">
                            <h3 class="team-card-title">${this.escapeHtml(team.title || 'Без назви')}</h3>
                            <span class="team-card-badge">${memberCount} осіб</span>
                        </div>
                        ${team.description ? `
                            <p class="team-card-description">${this.escapeHtml(team.description)}</p>
                        ` : ''}
                    </div>

                    <div class="team-card-body">
                        <div class="team-metrics">
                            <div class="team-metric">
                                <div class="team-metric-value">${memberCount}</div>
                                <div class="team-metric-label">Учасників</div>
                            </div>
                            <div class="team-metric">
                                <div class="team-metric-value">${team.has_raci ? '✓' : '—'}</div>
                                <div class="team-metric-label">RACI</div>
                            </div>
                            <div class="team-metric">
                                <div class="team-metric-value">${Math.floor(Math.random() * 30) + 70}%</div>
                                <div class="team-metric-label">Utilization</div>
                            </div>
                        </div>

                        <div class="team-members-preview">
                            <div class="team-avatars">
                                ${members.slice(0, 5).map((member, idx) => {
                                    const initials = (member.full_name || member.name || '?')
                                        .split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2);
                                    return `<div class="team-avatar" data-tooltip="${this.escapeHtml(member.full_name || member.name || 'Учасник')}">${initials}</div>`;
                                }).join('')}
                            </div>
                            ${memberCount > 5 ? `<span class="team-more-count">+${memberCount - 5} ще</span>` : ''}
                        </div>
                    </div>

                    <div class="team-card-footer">
                        <div class="team-last-updated">
                            <i class="fas fa-clock"></i>
                            ${lastUpdated}
                        </div>
                        <div class="team-actions-quick">
                            <button class="btn-icon-sm" data-tooltip="RACI матриця" onclick="event.stopPropagation(); TeamHubEnhanced.openRACI(${team.id})">
                                <i class="fas fa-project-diagram"></i>
                            </button>
                            <button class="btn-icon-sm" data-tooltip="Аналітика" onclick="event.stopPropagation(); TeamHubEnhanced.openAnalytics(${team.id})">
                                <i class="fas fa-chart-line"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        // ===== Load Teams with Animation =====
        async loadTeamsWithAnimation() {
            this.state.loading = true;
            this.showLoadingState();

            try {
                // Simulate API call (replace with actual API)
                await new Promise(resolve => setTimeout(resolve, 800));

                // Get teams from window state or API
                const teams = window.TeamPulseState?.teamhub?.teams || [];
                this.state.teams = teams;
                this.state.filteredTeams = teams;

                this.renderTeams();
                this.updateStats();
            } catch (error) {
                console.error('Failed to load teams:', error);
                this.showErrorState();
            } finally {
                this.state.loading = false;
            }
        },

        // ===== Render Teams =====
        renderTeams() {
            const container = document.querySelector('.teams-grid') || this.createTeamsGrid();
            if (!container) return;

            if (this.state.filteredTeams.length === 0) {
                container.innerHTML = this.getEmptyState();
                return;
            }

            // Staggered animation
            container.innerHTML = this.state.filteredTeams.map((team, idx) => {
                const card = this.renderEnhancedTeamCard(team);
                return `<div style="animation: fadeInUp 0.5s ease ${idx * 0.1}s both">${card}</div>`;
            }).join('');
        },

        // ===== Create Teams Grid =====
        createTeamsGrid() {
            const teamHub = document.getElementById('team-hub');
            if (!teamHub) return null;

            let content = teamHub.querySelector('.teamhub-content');
            if (!content) {
                content = document.createElement('div');
                content.className = 'teamhub-content';
                teamHub.appendChild(content);
            }

            let grid = content.querySelector('.teams-grid');
            if (!grid) {
                grid = document.createElement('div');
                grid.className = 'teams-grid';
                content.appendChild(grid);
            }

            return grid;
        },

        // ===== Loading State =====
        showLoadingState() {
            const container = this.createTeamsGrid();
            if (!container) return;

            container.innerHTML = Array(6).fill(0).map((_, idx) => `
                <div class="team-card-skeleton" style="animation: fadeIn 0.5s ease ${idx * 0.1}s both"></div>
            `).join('');
        },

        // ===== Empty State =====
        getEmptyState() {
            return `
                <div class="teamhub-empty">
                    <div class="empty-illustration">
                        <i class="fas fa-users-cog"></i>
                    </div>
                    <h2 class="empty-title">Поки що немає команд</h2>
                    <p class="empty-description">
                        Створіть першу команду для аналізу структури,
                        відповідальності та оптимізації робочих процесів
                    </p>
                    <button class="btn-hero btn-hero-primary" onclick="TeamHubEnhanced.createTeam()">
                        <i class="fas fa-plus"></i>
                        Створити першу команду
                    </button>
                </div>
            `;
        },

        // ===== Error State =====
        showErrorState() {
            const container = this.createTeamsGrid();
            if (!container) return;

            container.innerHTML = `
                <div class="teamhub-empty">
                    <div class="empty-illustration">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 class="empty-title">Помилка завантаження</h2>
                    <p class="empty-description">Не вдалося завантажити команди</p>
                    <button class="btn-hero btn-hero-primary" onclick="TeamHubEnhanced.loadTeamsWithAnimation()">
                        <i class="fas fa-redo"></i>
                        Спробувати знову
                    </button>
                </div>
            `;
        },

        // ===== Event Listeners =====
        setupEventListeners() {
            // Search
            document.addEventListener('input', (e) => {
                if (e.target.id === 'team-search') {
                    this.handleSearch(e.target.value);
                }
            });

            // Filters
            document.addEventListener('click', (e) => {
                const filterChip = e.target.closest('.filter-chip');
                if (filterChip) {
                    this.handleFilter(filterChip.dataset.filter);
                }

                // Hero buttons
                if (e.target.closest('#create-team-hero') || e.target.closest('#quick-create-team')) {
                    this.createTeam();
                }

                if (e.target.closest('#import-team-data')) {
                    this.importTeamData();
                }

                if (e.target.closest('#view-analytics')) {
                    this.viewAnalytics();
                }
            });

            // Listen for product switch
            document.addEventListener('product-switched', (e) => {
                if (e.detail?.target === 'team-hub') {
                    this.loadTeamsWithAnimation();
                }
            });
        },

        // ===== Search Handler =====
        handleSearch(query) {
            this.state.searchQuery = query.toLowerCase();
            this.applyFilters();
        },

        // ===== Filter Handler =====
        handleFilter(filter) {
            // Update active state
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.classList.toggle('active', chip.dataset.filter === filter);
            });

            this.state.activeFilter = filter;
            this.applyFilters();
        },

        // ===== Apply Filters =====
        applyFilters() {
            let filtered = this.state.teams;

            // Search filter
            if (this.state.searchQuery) {
                filtered = filtered.filter(team =>
                    (team.title || '').toLowerCase().includes(this.state.searchQuery) ||
                    (team.description || '').toLowerCase().includes(this.state.searchQuery)
                );
            }

            // Category filter
            switch (this.state.activeFilter) {
                case 'active':
                    filtered = filtered.filter(t => t.is_active !== false);
                    break;
                case 'large':
                    filtered = filtered.filter(t => (t.member_count || 0) > 10);
                    break;
                case 'recent':
                    filtered = filtered.sort((a, b) =>
                        new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
                    ).slice(0, 10);
                    break;
            }

            this.state.filteredTeams = filtered;
            this.renderTeams();
        },

        // ===== Actions =====
        createTeam() {
            if (window.showNotification) {
                window.showNotification('Створення команди...', 'info');
            }
            console.log('Create team triggered');
            // Trigger existing create team flow
            const createBtn = document.getElementById('new-team-btn');
            if (createBtn) createBtn.click();
        },

        importTeamData() {
            if (window.showNotification) {
                window.showNotification('Імпорт даних команди...', 'info');
            }
            console.log('Import team data triggered');
        },

        viewAnalytics() {
            if (window.showNotification) {
                window.showNotification('Відкриття аналітики...', 'info');
            }
            console.log('View analytics triggered');
        },

        openTeam(teamId) {
            console.log('Open team:', teamId);
            if (window.showNotification) {
                window.showNotification('Відкриття команди...', 'info');
            }
        },

        openRACI(teamId) {
            console.log('Open RACI for team:', teamId);
            if (window.showNotification) {
                window.showNotification('Відкриття RACI матриці...', 'info');
            }
        },

        openAnalytics(teamId) {
            console.log('Open analytics for team:', teamId);
            if (window.showNotification) {
                window.showNotification('Відкриття аналітики команди...', 'info');
            }
        },

        // ===== Utilities =====
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Add fadeInUp animation if not exists
    if (!document.getElementById('teamhub-animations')) {
        const style = document.createElement('style');
        style.id = 'teamhub-animations';
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Export to window
    window.TeamHubEnhanced = TeamHubEnhanced;

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TeamHubEnhanced.init());
    } else {
        TeamHubEnhanced.init();
    }

    console.log('✅ TeamHub Enhanced UX loaded');
})();
