// Enhanced Client Deletion System
// Provides comprehensive deletion confirmation with data preview

class EnhancedDeletion {
    constructor() {
        this.init();
    }

    init() {
        this.createDeletionModal();
        this.setupEventListeners();
    }

    // Create comprehensive deletion modal
    createDeletionModal() {
        const modal = document.createElement('div');
        modal.id = 'enhanced-deletion-modal';
        modal.className = 'modal-overlay deletion-modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-container deletion-container">
                <div class="modal-header deletion-header">
                    <div class="warning-indicator">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="header-content">
                        <h3>Підтвердження видалення</h3>
                        <p>Ця дія призведе до незворотного видалення всіх даних</p>
                    </div>
                    <button class="modal-close" onclick="enhancedDeletion.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="modal-body deletion-body">
                    <div class="client-preview" id="deletion-client-preview">
                        <!-- Client info will be populated here -->
                    </div>

                    <div class="data-impact-section">
                        <h4><i class="fas fa-database"></i> Що буде видалено</h4>
                        <div class="impact-grid" id="deletion-impact-grid">
                            <!-- Impact items will be populated here -->
                        </div>
                    </div>

                    <div class="warning-section">
                        <div class="warning-box">
                            <i class="fas fa-exclamation-circle"></i>
                            <div>
                                <strong>Увага!</strong>
                                <p>Після видалення ці дані неможливо буде відновити. Переконайтеся, що ви експортували важливу інформацію.</p>
                            </div>
                        </div>
                    </div>

                    <div class="export-option" id="deletion-export-option">
                        <button class="btn-secondary export-before-delete">
                            <i class="fas fa-download"></i>
                            Експортувати дані перед видаленням
                        </button>
                    </div>

                    <div class="confirmation-section">
                        <div class="confirmation-input">
                            <label for="deletion-confirmation">
                                Для підтвердження введіть назву:
                                <strong id="deletion-company-name"></strong>
                            </label>
                            <input
                                type="text"
                                id="deletion-confirmation"
                                placeholder="Введіть точну назву для підтвердження"
                                autocomplete="off"
                            >
                            <div class="confirmation-feedback" id="deletion-feedback"></div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer deletion-footer">
                    <button class="btn-secondary" onclick="enhancedDeletion.closeModal()">
                        <i class="fas fa-times"></i>
                        Скасувати
                    </button>
                    <button class="btn-danger deletion-confirm-btn" id="deletion-confirm-btn" disabled>
                        <i class="fas fa-trash"></i>
                        <span class="loading-text">Видалити назавжди</span>
                        <div class="btn-loading" style="display: none;">
                            <i class="fas fa-spinner fa-spin"></i>
                            Видаляємо...
                        </div>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Setup event listeners
    setupEventListeners() {
        // Confirmation input validation
        document.addEventListener('input', (e) => {
            if (e.target.id === 'deletion-confirmation') {
                this.validateConfirmation();
            }
        });

        // Export button
        document.addEventListener('click', (e) => {
            if (e.target.matches('.export-before-delete, .export-before-delete *')) {
                this.exportClientData();
            } else if (e.target.matches('#deletion-confirm-btn:not([disabled]), #deletion-confirm-btn:not([disabled]) *')) {
                this.confirmDeletion();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('enhanced-deletion-modal');
            if (modal && modal.style.display !== 'none' && e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // Show deletion modal for client
    async showDeletionModal(clientId) {
        try {
            // Load client data and related information
            const clientData = await this.loadClientDataForDeletion(clientId);

            this.currentClientId = clientId;
            this.currentClientData = clientData;

            // Populate modal with client information
            this.populateClientPreview(clientData);
            this.populateDataImpact(clientData);
            this.setupConfirmation(clientData);

            // Show modal
            const modal = document.getElementById('enhanced-deletion-modal');
            modal.style.display = 'flex';

            // Focus on confirmation input after a delay
            setTimeout(() => {
                const confirmInput = document.getElementById('deletion-confirmation');
                if (confirmInput) {
                    confirmInput.focus();
                }
            }, 300);

        } catch (error) {
            console.error('❌ Failed to load client data for deletion:', error);
            this.showErrorMessage('Не вдалося завантажити дані клієнта');
        }
    }

    // Load comprehensive client data
    async loadClientDataForDeletion(clientId) {
        const [clientResponse, analysesResponse, teamsResponse] = await Promise.allSettled([
            fetch(`/api/clients/${clientId}`),
            fetch(`/api/negotiations/client/${clientId}/analyses`),
            fetch(`/api/teams/client/${clientId}`)
        ]);

        const clientData = clientResponse.status === 'fulfilled' && clientResponse.value.ok
            ? await clientResponse.value.json()
            : { client: null };

        const analysesData = analysesResponse.status === 'fulfilled' && analysesResponse.value.ok
            ? await analysesResponse.value.json()
            : { analyses: [] };

        const teamsData = teamsResponse.status === 'fulfilled' && teamsResponse.value.ok
            ? await teamsResponse.value.json()
            : { teams: [] };

        return {
            client: clientData.client,
            analyses: analysesData.analyses || [],
            teams: teamsData.teams || [],
            totalAnalyses: analysesData.analyses?.length || 0,
            totalTeams: teamsData.teams?.length || 0
        };
    }

    // Populate client preview section
    populateClientPreview(data) {
        const previewContainer = document.getElementById('deletion-client-preview');
        if (!previewContainer || !data.client) return;

        const client = data.client;
        const clientType = client.client_type === 'team' ? 'Внутрішній проєкт' : 'Клієнт переговорів';
        const icon = client.client_type === 'team' ? 'fas fa-users' : 'fas fa-handshake';

        previewContainer.innerHTML = `
            <div class="client-info-card">
                <div class="client-header">
                    <div class="client-avatar-large">
                        <i class="${icon}"></i>
                    </div>
                    <div class="client-details">
                        <h4>${client.company}</h4>
                        <div class="client-meta">
                            <span class="client-type">${clientType}</span>
                            ${client.negotiator ? `<span class="client-negotiator">${client.negotiator}</span>` : ''}
                            ${client.sector ? `<span class="client-sector">${client.sector}</span>` : ''}
                        </div>
                        <div class="client-dates">
                            <span>Створено: ${new Date(client.created_at).toLocaleDateString('uk-UA')}</span>
                            ${client.updated_at !== client.created_at ?
                                `<span>Оновлено: ${new Date(client.updated_at).toLocaleDateString('uk-UA')}</span>` : ''
                            }
                        </div>
                    </div>
                </div>

                ${client.notes ? `
                    <div class="client-notes">
                        <strong>Нотатки:</strong>
                        <p>${client.notes}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Populate data impact section
    populateDataImpact(data) {
        const impactContainer = document.getElementById('deletion-impact-grid');
        if (!impactContainer) return;

        const impacts = [];

        // Client record
        impacts.push({
            icon: 'fas fa-user',
            title: 'Профіль клієнта',
            count: 1,
            description: 'Основна інформація, контакти, налаштування',
            severity: 'high'
        });

        // Analyses
        if (data.totalAnalyses > 0) {
            impacts.push({
                icon: 'fas fa-brain',
                title: 'Аналізи переговорів',
                count: data.totalAnalyses,
                description: 'AI аналізи, рекомендації, барометр угод',
                severity: 'critical'
            });
        }

        // Teams
        if (data.totalTeams > 0) {
            impacts.push({
                icon: 'fas fa-users',
                title: 'Команди та учасники',
                count: data.totalTeams,
                description: 'Структура команд, RACI матриці, зарплати',
                severity: 'critical'
            });
        }

        // Historical data
        impacts.push({
            icon: 'fas fa-history',
            title: 'Історія взаємодій',
            count: '?',
            description: 'Журнали дій, історія змін, архів',
            severity: 'medium'
        });

        impactContainer.innerHTML = impacts.map(impact => `
            <div class="impact-item severity-${impact.severity}">
                <div class="impact-icon">
                    <i class="${impact.icon}"></i>
                </div>
                <div class="impact-content">
                    <div class="impact-header">
                        <span class="impact-title">${impact.title}</span>
                        <span class="impact-count">${impact.count}</span>
                    </div>
                    <p class="impact-description">${impact.description}</p>
                </div>
                <div class="severity-indicator">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
            </div>
        `).join('');
    }

    // Setup confirmation input
    setupConfirmation(data) {
        const companyNameEl = document.getElementById('deletion-company-name');
        const confirmInput = document.getElementById('deletion-confirmation');

        if (companyNameEl && data.client) {
            companyNameEl.textContent = data.client.company;
            this.expectedConfirmation = data.client.company;
        }

        if (confirmInput) {
            confirmInput.value = '';
            confirmInput.placeholder = `Введіть "${this.expectedConfirmation}" для підтвердження`;
        }

        this.validateConfirmation();
    }

    // Validate confirmation input
    validateConfirmation() {
        const confirmInput = document.getElementById('deletion-confirmation');
        const confirmBtn = document.getElementById('deletion-confirm-btn');
        const feedback = document.getElementById('deletion-feedback');

        if (!confirmInput || !confirmBtn || !feedback) return;

        const inputValue = confirmInput.value.trim();
        const isValid = inputValue === this.expectedConfirmation;

        if (inputValue === '') {
            feedback.innerHTML = '';
            confirmBtn.disabled = true;
        } else if (isValid) {
            feedback.innerHTML = '<i class="fas fa-check"></i> Підтвердження правильне';
            feedback.className = 'confirmation-feedback valid';
            confirmBtn.disabled = false;
        } else {
            feedback.innerHTML = '<i class="fas fa-times"></i> Назва не співпадає';
            feedback.className = 'confirmation-feedback invalid';
            confirmBtn.disabled = true;
        }
    }

    // Export client data before deletion
    async exportClientData() {
        if (!this.currentClientData) return;

        try {
            const data = this.currentClientData;
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${data.client.company}_backup_${timestamp}.json`;

            const exportData = {
                client: data.client,
                analyses: data.analyses,
                teams: data.teams,
                exportDate: new Date().toISOString(),
                exportType: 'pre_deletion_backup'
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            link.click();

            this.showSuccessMessage('Дані експортовано успішно');

        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showErrorMessage('Не вдалося експортувати дані');
        }
    }

    // Confirm deletion
    async confirmDeletion() {
        const confirmBtn = document.getElementById('deletion-confirm-btn');
        if (!confirmBtn || confirmBtn.disabled) return;

        try {
            // Show loading state
            this.setLoadingState(true);

            // Perform deletion
            const response = await fetch(`/api/clients/${this.currentClientId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Помилка видалення клієнта');
            }

            const result = await response.json();

            // Update UI immediately
            await this.performPostDeletionUpdates();

            // Show success message
            this.showSuccessMessage('Клієнта та всі пов\'язані дані видалено успішно');

            // Close modal
            this.closeModal();

        } catch (error) {
            console.error('❌ Deletion failed:', error);
            this.showErrorMessage(error.message || 'Не вдалося видалити клієнта');
        } finally {
            this.setLoadingState(false);
        }
    }

    // Perform post-deletion UI updates
    async performPostDeletionUpdates() {
        const clientId = this.currentClientId;

        // Remove from all sidebars
        const clientItems = document.querySelectorAll(`[data-client-id="${clientId}"]`);
        clientItems.forEach(item => {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(-100%)';
            setTimeout(() => item.remove(), 300);
        });

        // Update global state
        if (window.state?.clients) {
            window.state.clients = window.state.clients.filter(c => c.id != clientId);
        }
        if (window.appState?.clients) {
            window.appState.clients = window.appState.clients.filter(c => c.id != clientId);
        }

        // Clear selection if this was the selected client
        if (window.selectedClientId == clientId) {
            window.selectedClientId = null;
            window.currentClient = null;
            this.clearMainContent();
        }

        // Reload sidebar data
        if (window.sidebarManager) {
            const module = this.currentClientData.client.client_type === 'team' ? 'teamhub' : 'negotiations';
            await window.sidebarManager.loadClients(module);
        }

        // Update right sidebar if it exists
        if (window.loadEnhancedAnalysisHistory) {
            await window.loadEnhancedAnalysisHistory();
        }
    }

    // Clear main content
    clearMainContent() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="empty-selection">
                    <div class="empty-icon">
                        <i class="fas fa-hand-pointer"></i>
                    </div>
                    <h3>Оберіть клієнта</h3>
                    <p>Виберіть клієнта зі списку для початку роботи</p>
                </div>
            `;
        }
    }

    // Set loading state
    setLoadingState(loading) {
        const confirmBtn = document.getElementById('deletion-confirm-btn');
        if (!confirmBtn) return;

        const loadingText = confirmBtn.querySelector('.loading-text');
        const loadingSpinner = confirmBtn.querySelector('.btn-loading');

        if (loading) {
            confirmBtn.disabled = true;
            if (loadingText) loadingText.style.display = 'none';
            if (loadingSpinner) loadingSpinner.style.display = 'flex';
        } else {
            confirmBtn.disabled = false;
            if (loadingText) loadingText.style.display = 'inline';
            if (loadingSpinner) loadingSpinner.style.display = 'none';
        }
    }

    // Close modal
    closeModal() {
        const modal = document.getElementById('enhanced-deletion-modal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Reset state
        this.currentClientId = null;
        this.currentClientData = null;
        this.expectedConfirmation = null;

        // Clear form
        const confirmInput = document.getElementById('deletion-confirmation');
        if (confirmInput) {
            confirmInput.value = '';
        }
    }

    // Show success message
    showSuccessMessage(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    // Show error message
    showErrorMessage(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Initialize enhanced deletion system
const enhancedDeletion = new EnhancedDeletion();

// Export globally
if (typeof window !== 'undefined') {
    window.enhancedDeletion = enhancedDeletion;
    window.EnhancedDeletion = EnhancedDeletion;

    // Override existing deleteClient functions
    window.deleteClientEnhanced = function(clientId) {
        return enhancedDeletion.showDeletionModal(clientId);
    };
}

console.log('✨ Enhanced Deletion System initialized');