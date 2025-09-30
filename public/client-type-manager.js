// Client Type Management System
// Separates negotiations clients from team/internal clients

class ClientTypeManager {
    constructor() {
        this.currentModule = 'negotiations'; // 'negotiations' or 'teams'
        this.clientCache = {
            negotiations: [],
            teams: []
        };
        this.init();
    }

    init() {
        this.setupModuleSwitching();
        this.setupClientCreation();
        this.loadClientsForCurrentModule();
    }

    // Setup module switching
    setupModuleSwitching() {
        // Listen for module changes
        document.addEventListener('moduleChange', (event) => {
            const newModule = event.detail.module;
            if (newModule === 'team-hub') {
                this.switchToModule('teams');
            } else if (newModule === 'negotiations' || newModule === 'analysis') {
                this.switchToModule('negotiations');
            }
        });
    }

    // Switch between modules
    switchToModule(module) {
        if (this.currentModule === module) return;

        console.log(`🔄 Switching client context from ${this.currentModule} to ${module}`);
        this.currentModule = module;

        // Update sidebar header
        this.updateSidebarHeader();

        // Load appropriate clients
        this.loadClientsForCurrentModule();

        // Clear current selection
        this.clearClientSelection();

        // Update UI elements
        this.updateModuleSpecificUI();
    }

    // Update sidebar header based on module
    updateSidebarHeader() {
        const sidebarHeader = document.querySelector('.sidebar-header h2');
        const sidebarDescription = document.querySelector('.sidebar-header p');

        if (sidebarHeader && sidebarDescription) {
            if (this.currentModule === 'negotiations') {
                sidebarHeader.innerHTML = '<i class="fas fa-handshake"></i> Клієнти переговорів';
                sidebarDescription.textContent = 'Зовнішні клієнти для аналізу переговорів';
            } else if (this.currentModule === 'teams') {
                sidebarHeader.innerHTML = '<i class="fas fa-users"></i> Внутрішні проєкти';
                sidebarDescription.textContent = 'Команди та внутрішні структури';
            }
        }
    }

    // Load clients for current module
    async loadClientsForCurrentModule() {
        try {
            const clientType = this.currentModule === 'negotiations' ? 'negotiation' : 'team';
            const response = await fetch(`/api/clients?type=${clientType}&active=true`);

            if (!response.ok) {
                throw new Error('Failed to load clients');
            }

            const data = await response.json();
            this.clientCache[this.currentModule] = data.clients || [];

            // Update global state
            if (window.state) {
                window.state.clients = this.clientCache[this.currentModule];
            }
            if (window.appState) {
                window.appState.clients = this.clientCache[this.currentModule];
            }

            // Render clients in sidebar
            this.renderClientsSidebar();

        } catch (error) {
            console.error('❌ Failed to load clients for module:', error);
            this.showNotification('Не вдалося завантажити клієнтів', 'error');
        }
    }

    // Render clients in sidebar
    renderClientsSidebar() {
        const clientList = document.querySelector('.client-list');
        if (!clientList) return;

        const clients = this.clientCache[this.currentModule];

        if (!clients || clients.length === 0) {
            clientList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        clientList.innerHTML = clients.map(client => this.renderClientItem(client)).join('');

        // Update client count
        this.updateClientCount(clients.length);
    }

    // Render individual client item
    renderClientItem(client) {
        const isActive = window.selectedClientId === client.id;
        const moduleIcon = this.currentModule === 'negotiations' ? 'fas fa-handshake' : 'fas fa-users';

        return `
            <div class="client-item ${isActive ? 'selected' : ''}"
                 data-client-id="${client.id}"
                 data-client-type="${client.client_type || 'negotiation'}"
                 onclick="clientTypeManager.selectClient(${client.id})">
                <div class="client-avatar">
                    <i class="${moduleIcon}"></i>
                </div>
                <div class="client-info">
                    <div class="client-name">${client.company}</div>
                    <div class="client-meta">
                        ${client.negotiator || client.sector || 'Без опису'}
                    </div>
                    ${this.currentModule === 'teams' ?
                        `<div class="client-teams-count">
                            <i class="fas fa-user-group"></i>
                            ${client.teams_count || 0} команд
                        </div>` :
                        `<div class="client-analyses-count">
                            <i class="fas fa-brain"></i>
                            ${client.analyses_count || 0} аналізів
                        </div>`
                    }
                </div>
                <div class="client-actions">
                    <button class="btn-icon btn-xs" onclick="event.stopPropagation(); clientTypeManager.editClient(${client.id})" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-xs btn-danger" onclick="event.stopPropagation(); clientTypeManager.deleteClient(${client.id})" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Get empty state HTML
    getEmptyStateHTML() {
        if (this.currentModule === 'negotiations') {
            return `
                <div class="empty-client-state">
                    <div class="empty-icon">
                        <i class="fas fa-handshake"></i>
                    </div>
                    <h4>Немає клієнтів для переговорів</h4>
                    <p>Додайте першого клієнта для аналізу переговорів</p>
                    <button class="btn-primary btn-sm" onclick="clientTypeManager.showCreateClientModal()">
                        <i class="fas fa-plus"></i>
                        Додати клієнта
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="empty-client-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <h4>Немає внутрішніх проєктів</h4>
                    <p>Створіть перший проєкт для управління командами</p>
                    <button class="btn-primary btn-sm" onclick="clientTypeManager.showCreateClientModal()">
                        <i class="fas fa-plus"></i>
                        Створити проєкт
                    </button>
                </div>
            `;
        }
    }

    // Setup client creation based on module
    setupClientCreation() {
        // Override default client creation
        const originalAddClient = window.addClient;
        window.addClient = (...args) => {
            return this.createClient(...args);
        };

        // Listen for form submissions
        const clientForm = document.querySelector('.client-form');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleClientFormSubmit(e);
            });
        }
    }

    // Handle client form submission
    async handleClientFormSubmit(event) {
        const formData = new FormData(event.target);
        const clientData = Object.fromEntries(formData.entries());

        // Add client type based on current module
        clientData.client_type = this.currentModule === 'negotiations' ? 'negotiation' : 'team';

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                throw new Error('Failed to create client');
            }

            const data = await response.json();
            this.showNotification(
                this.currentModule === 'negotiations'
                    ? 'Клієнта для переговорів створено успішно'
                    : 'Внутрішній проєкт створено успішно',
                'success'
            );

            // Reload clients for current module
            await this.loadClientsForCurrentModule();

            // Select the new client
            if (data.client) {
                this.selectClient(data.client.id);
            }

            // Reset form
            event.target.reset();

        } catch (error) {
            console.error('❌ Failed to create client:', error);
            this.showNotification('Не вдалося створити клієнта', 'error');
        }
    }

    // Create client with type
    async createClient(clientData) {
        clientData.client_type = this.currentModule === 'negotiations' ? 'negotiation' : 'team';

        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                throw new Error('Failed to create client');
            }

            const data = await response.json();
            await this.loadClientsForCurrentModule();
            return data.client;

        } catch (error) {
            console.error('❌ Failed to create client:', error);
            throw error;
        }
    }

    // Select client
    async selectClient(clientId) {
        try {
            // Remove previous selection
            document.querySelectorAll('.client-item.selected').forEach(item => {
                item.classList.remove('selected');
            });

            // Add selection to current item
            const clientItem = document.querySelector(`[data-client-id="${clientId}"]`);
            if (clientItem) {
                clientItem.classList.add('selected');
            }

            // Find client data
            const client = this.clientCache[this.currentModule].find(c => c.id === clientId);
            if (!client) {
                throw new Error('Client not found');
            }

            // Update global state
            window.selectedClientId = clientId;
            window.currentClient = client;
            if (window.state) {
                window.state.currentClient = client;
            }

            // Load module-specific data
            if (this.currentModule === 'negotiations') {
                await this.loadNegotiationData(clientId);
            } else if (this.currentModule === 'teams') {
                await this.loadTeamData(clientId);
            }

            // Update main content
            this.updateMainContent(client);

            this.showNotification(`Обрано: ${client.company}`, 'success');

        } catch (error) {
            console.error('❌ Failed to select client:', error);
            this.showNotification('Не вдалося обрати клієнта', 'error');
        }
    }

    // Load negotiation-specific data
    async loadNegotiationData(clientId) {
        try {
            // Load negotiations for client
            const response = await fetch(`/api/negotiations/client/${clientId}`);
            if (response.ok) {
                const data = await response.json();
                if (window.state) {
                    window.state.negotiations = data.negotiations || [];
                }
            }
        } catch (error) {
            console.error('❌ Failed to load negotiation data:', error);
        }
    }

    // Load team-specific data
    async loadTeamData(clientId) {
        try {
            // Load teams for client
            if (window.loadTeamsForClient) {
                await window.loadTeamsForClient(clientId);
            }
        } catch (error) {
            console.error('❌ Failed to load team data:', error);
        }
    }

    // Update main content based on module
    updateMainContent(client) {
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        if (this.currentModule === 'negotiations') {
            this.showNegotiationInterface(client);
        } else if (this.currentModule === 'teams') {
            this.showTeamInterface(client);
        }
    }

    // Show negotiation interface
    showNegotiationInterface(client) {
        // Trigger existing negotiation UI
        if (window.selectClient) {
            window.selectClient(client.id);
        }
    }

    // Show team interface
    showTeamInterface(client) {
        // Trigger existing team hub UI
        if (window.selectProduct) {
            window.selectProduct('team-hub');
        }
    }

    // Update module-specific UI
    updateModuleSpecificUI() {
        // Update form labels and placeholders
        this.updateFormLabels();

        // Update button texts
        this.updateButtonTexts();

        // Show/hide module-specific fields
        this.toggleModuleFields();
    }

    // Update form labels based on module
    updateFormLabels() {
        const companyLabel = document.querySelector('label[for="company"]');
        if (companyLabel) {
            companyLabel.textContent = this.currentModule === 'negotiations'
                ? 'Назва компанії'
                : 'Назва проєкту';
        }

        const negotiatorLabel = document.querySelector('label[for="negotiator"]');
        if (negotiatorLabel) {
            negotiatorLabel.textContent = this.currentModule === 'negotiations'
                ? 'Переговорник'
                : 'Менеджер проєкту';
        }
    }

    // Update button texts
    updateButtonTexts() {
        const addClientBtn = document.querySelector('.add-client-btn');
        if (addClientBtn) {
            if (this.currentModule === 'negotiations') {
                addClientBtn.innerHTML = '<i class="fas fa-plus"></i> Додати клієнта';
            } else {
                addClientBtn.innerHTML = '<i class="fas fa-plus"></i> Створити проєкт';
            }
        }
    }

    // Toggle module-specific fields
    toggleModuleFields() {
        // Negotiation-specific fields
        const negotiationFields = document.querySelectorAll('.negotiation-only');
        negotiationFields.forEach(field => {
            field.style.display = this.currentModule === 'negotiations' ? 'block' : 'none';
        });

        // Team-specific fields
        const teamFields = document.querySelectorAll('.team-only');
        teamFields.forEach(field => {
            field.style.display = this.currentModule === 'teams' ? 'block' : 'none';
        });
    }

    // Show create client modal
    showCreateClientModal() {
        // Focus on company input to start client creation
        const companyInput = document.getElementById('company');
        if (companyInput) {
            companyInput.focus();
        }
    }

    // Edit client
    editClient(clientId) {
        const client = this.clientCache[this.currentModule].find(c => c.id === clientId);
        if (!client) return;

        // Populate form with client data
        this.populateClientForm(client);
    }

    // Populate client form
    populateClientForm(client) {
        const form = document.querySelector('.client-form');
        if (!form) return;

        Object.keys(client).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = client[key] || '';
            }
        });
    }

    // Delete client
    async deleteClient(clientId) {
        if (window.deleteClientEnhanced) {
            await window.deleteClientEnhanced(clientId);
        } else if (window.deleteClient) {
            await window.deleteClient(clientId);
        }

        // Reload clients after deletion
        await this.loadClientsForCurrentModule();
    }

    // Clear client selection
    clearClientSelection() {
        document.querySelectorAll('.client-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        window.selectedClientId = null;
        window.currentClient = null;
        if (window.state) {
            window.state.currentClient = null;
        }
    }

    // Update client count
    updateClientCount(count) {
        const countElement = document.querySelector('.client-count, .teams-counter');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // Export for debugging
    exportDebugInfo() {
        return {
            currentModule: this.currentModule,
            clientCache: this.clientCache,
            selectedClient: window.currentClient
        };
    }
}

// Initialize client type manager
const clientTypeManager = new ClientTypeManager();

// Export globally
if (typeof window !== 'undefined') {
    window.clientTypeManager = clientTypeManager;
    window.ClientTypeManager = ClientTypeManager;
}

console.log('✨ Client Type Manager initialized');