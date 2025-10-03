// TeamPulse Turbo - Best Hire Module Integration
(() => {
    'use strict';

    const API_BASE = '/api/v1/best-hire';

    // Best Hire State
    const bestHireState = {
        currentClient: null,
        positions: [],
        selectedPosition: null,
        resumes: [],
        analytics: null,
        channels: [],
        bottlenecks: []
    };

    // API Calls
    async function apiCall(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
        try {
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
        } catch (error) {
            console.error('Best Hire API Error:', error);
            throw error;
        }
    }

    // Load Best Hire data for client
    async function loadBestHireData(clientId) {
        if (!clientId) {
            renderEmptyState();
            return;
        }

        try {
            bestHireState.currentClient = clientId;

            // Load positions and analytics in parallel
            const [positionsRes, analyticsRes] = await Promise.all([
                apiCall(`/positions/client/${clientId}`),
                apiCall(`/analytics/client/${clientId}`)
            ]);

            bestHireState.positions = positionsRes.positions || [];
            bestHireState.analytics = analyticsRes.analytics || null;

            renderBestHireDashboard();
        } catch (error) {
            console.error('Failed to load Best Hire data:', error);
            showNotification('Помилка завантаження Best Hire даних', 'error');
            renderEmptyState();
        }
    }

    // Render Best Hire Dashboard
    function renderBestHireDashboard() {
        renderAnalytics();
        renderPositions();
        renderBottlenecks();
        renderChannels();
    }

    // Render Analytics Overview
    function renderAnalytics() {
        const container = document.getElementById('best-hire-analytics');
        if (!container) return;

        const analytics = bestHireState.analytics;

        if (!analytics) {
            container.innerHTML = '<div class="empty-state"><p>Немає даних для аналітики</p></div>';
            return;
        }

        const totalResumes = analytics.resumes_by_stage
            ? analytics.resumes_by_stage.reduce((sum, stage) => sum + (stage.count || 0), 0)
            : 0;

        container.innerHTML = `
            <div class="analytics-card">
                <div class="analytics-icon">
                    <i class="fas fa-briefcase"></i>
                </div>
                <div class="analytics-content">
                    <div class="analytics-value">${analytics.positions?.open_positions || 0}</div>
                    <div class="analytics-label">Відкритих позицій</div>
                </div>
            </div>
            <div class="analytics-card">
                <div class="analytics-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="analytics-content">
                    <div class="analytics-value">${totalResumes}</div>
                    <div class="analytics-label">Резюме всього</div>
                </div>
            </div>
            <div class="analytics-card">
                <div class="analytics-icon">
                    <i class="fas fa-user-check"></i>
                </div>
                <div class="analytics-content">
                    <div class="analytics-value">${analytics.positions?.filled_positions || 0}</div>
                    <div class="analytics-label">Закритих позицій</div>
                </div>
            </div>
            <div class="analytics-card">
                <div class="analytics-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="analytics-content">
                    <div class="analytics-value">${analytics.bottlenecks?.length || 0}</div>
                    <div class="analytics-label">Активних боттлнеків</div>
                </div>
            </div>
        `;
    }

    // Render Positions
    function renderPositions() {
        const container = document.getElementById('best-hire-positions');
        if (!container) return;

        const positions = bestHireState.positions;

        if (positions.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-briefcase"></i>
                    <p>Немає відкритих позицій</p>
                    <button class="btn-primary btn-sm" onclick="window.BestHireModule.createPosition()">
                        <i class="fas fa-plus"></i> Створити позицію
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = positions.map(position => `
            <div class="position-card" onclick="window.BestHireModule.openPosition(${position.id})">
                <div class="position-header">
                    <h3>${escapeHtml(position.title)}</h3>
                    <span class="position-status ${getStatusColor(position.status)}">${position.status}</span>
                </div>
                <div class="position-details">
                    <div class="position-meta">
                        <i class="fas fa-map-marker-alt"></i> ${escapeHtml(position.location || 'Не вказано')}
                    </div>
                    ${position.salary_min && position.salary_max ? `
                    <div class="position-meta">
                        <i class="fas fa-money-bill-wave"></i>
                        ${position.salary_min}-${position.salary_max} ${position.salary_currency}
                    </div>
                    ` : ''}
                    <div class="position-meta">
                        <i class="fas fa-users"></i> ${position.total_resumes || 0} кандидатів
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Render Bottlenecks
    function renderBottlenecks() {
        const container = document.getElementById('best-hire-bottlenecks');
        if (!container) return;

        const analytics = bestHireState.analytics;
        const bottlenecks = analytics?.bottlenecks || [];

        if (bottlenecks.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-check-circle" style="color: #22c55e;"></i>
                    <p>Немає активних боттлнеків</p>
                </div>
            `;
            return;
        }

        container.innerHTML = bottlenecks.map(bottleneck => `
            <div class="bottleneck-card severity-${bottleneck.severity}">
                <div class="bottleneck-header">
                    <div>
                        <h4>${escapeHtml(bottleneck.bottleneck_type)}</h4>
                        <p class="bottleneck-desc">${escapeHtml(bottleneck.description || '')}</p>
                    </div>
                    <span class="severity-badge ${bottleneck.severity}">${bottleneck.severity}</span>
                </div>
                <div class="bottleneck-meta">
                    <span><i class="fas fa-clock"></i> ${bottleneck.days_delayed || 0} днів затримки</span>
                    ${bottleneck.cost_impact > 0 ? `
                    <span><i class="fas fa-dollar-sign"></i> ${bottleneck.cost_impact} ${bottleneck.cost_currency}</span>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Render Recruiting Channels
    function renderChannels() {
        const container = document.getElementById('best-hire-channels');
        if (!container) return;

        const analytics = bestHireState.analytics;
        const channels = analytics?.channels || [];

        if (channels.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <i class="fas fa-chart-bar"></i>
                    <p>Немає даних по каналах</p>
                </div>
            `;
            return;
        }

        container.innerHTML = channels.map(channel => `
            <div class="channel-card">
                <h4>${escapeHtml(channel.channel_name)}</h4>
                <div class="channel-stats">
                    <div class="channel-stat">
                        <span class="stat-value">${channel.candidates_hired || 0}</span>
                        <span class="stat-label">Найнято</span>
                    </div>
                    <div class="channel-stat">
                        <span class="stat-value">${channel.candidates_sourced || 0}</span>
                        <span class="stat-label">Залучено</span>
                    </div>
                    <div class="channel-stat">
                        <span class="stat-value">${channel.conversion_percent || 0}%</span>
                        <span class="stat-label">Конверсія</span>
                    </div>
                    ${channel.cost_per_hire ? `
                    <div class="channel-stat">
                        <span class="stat-value">${channel.cost_per_hire} ${channel.cost_currency}</span>
                        <span class="stat-label">Cost/Hire</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    // Render Empty State
    function renderEmptyState() {
        const containers = [
            'best-hire-analytics',
            'best-hire-positions',
            'best-hire-bottlenecks',
            'best-hire-channels'
        ];

        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-tie fa-3x"></i>
                        <h3>Оберіть клієнта</h3>
                        <p>Виберіть клієнта для перегляду Best Hire даних</p>
                    </div>
                `;
            }
        });
    }

    // Create new position
    async function createPosition() {
        if (!bestHireState.currentClient) {
            showNotification('Спочатку оберіть клієнта', 'warning');
            return;
        }

        const title = prompt('Назва позиції:');
        if (!title) return;

        try {
            await apiCall('/positions', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: bestHireState.currentClient,
                    title,
                    status: 'open',
                    priority: 'medium'
                })
            });

            showNotification('Позицію створено', 'success');
            loadBestHireData(bestHireState.currentClient);
        } catch (error) {
            showNotification('Помилка створення позиції', 'error');
        }
    }

    // Open position details
    function openPosition(positionId) {
        console.log('Opening position:', positionId);
        showNotification('Деталі позиції (в розробці)', 'info');
    }

    // Utility Functions
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function getStatusColor(status) {
        const colors = {
            open: 'green',
            filled: 'blue',
            paused: 'yellow',
            closed: 'gray'
        };
        return colors[status] || 'gray';
    }

    function showNotification(message, type = 'info') {
        console.log(`[${type.toUpperCase()}]`, message);
        // Integration with main notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        }
    }

    // Export module functions
    window.BestHireModule = {
        load: loadBestHireData,
        createPosition,
        openPosition,
        state: bestHireState
    };

    // Initialize when Best Hire dashboard is shown
    document.addEventListener('product-switched', (e) => {
        if (e.detail?.target === 'best-hire-dashboard') {
            const currentClient = window.TeamPulseState?.currentClient;
            if (currentClient) {
                loadBestHireData(currentClient.id);
            }
        }
    });

    console.log('✅ Best Hire Module loaded');
})();
