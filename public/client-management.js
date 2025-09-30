// Enhanced Client Management with Real-time Updates
(() => {
    'use strict';

    // Enhanced client deletion with immediate UI updates
    async function deleteClientEnhanced(clientId, event) {
        console.log('🗑️ Enhanced deleteClient called with ID:', clientId);

        // Stop event propagation to prevent client selection
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        try {
            // Find client data before deletion
            const client = window.state?.clients?.find(c => c.id == clientId) ||
                          window.appState?.clients?.find(c => c.id == clientId);

            if (!client) {
                throw new Error('Клієнт не знайдено в локальному стані');
            }

            console.log('🗑️ Found client for deletion:', client.company);

            // Show confirmation with enhanced modal
            const confirmed = await showEnhancedDeleteConfirmation(client);
            if (!confirmed) {
                console.log('🗑️ Client deletion cancelled by user');
                return;
            }

            // Show loading state immediately
            const clientElement = document.querySelector(`[data-client-id="${clientId}"]`);
            if (clientElement) {
                clientElement.style.opacity = '0.5';
                clientElement.style.pointerEvents = 'none';

                const loadingSpinner = document.createElement('div');
                loadingSpinner.className = 'inline-spinner';
                loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                clientElement.appendChild(loadingSpinner);
            }

            // Show progress notification
            if (window.showNotification) {
                window.showNotification(`Видалення клієнта "${client.company}"...`, 'info');
            }

            console.log('🗑️ Sending delete request...');
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('🗑️ Delete response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Помилка видалення клієнта');
            }

            // Immediate UI updates
            await performClientDeletionUpdates(clientId, client);

            // Success notification
            if (window.showNotification) {
                window.showNotification(`Клієнт "${client.company}" видалено успішно`, 'success');
            }

            console.log('✅ Client deletion completed successfully');

        } catch (error) {
            console.error('❌ Delete client error:', error);

            // Restore UI state on error
            const clientElement = document.querySelector(`[data-client-id="${clientId}"]`);
            if (clientElement) {
                clientElement.style.opacity = '';
                clientElement.style.pointerEvents = '';

                const spinner = clientElement.querySelector('.inline-spinner');
                if (spinner) {
                    spinner.remove();
                }
            }

            if (window.showNotification) {
                window.showNotification(error.message || 'Помилка при видаленні клієнта', 'error');
            }
        }
    }

    // Enhanced confirmation modal
    function showEnhancedDeleteConfirmation(client) {
        return new Promise((resolve) => {
            // Create enhanced modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay enhanced-delete-modal';
            modal.innerHTML = `
                <div class="modal-container delete-confirmation-modal">
                    <div class="modal-header">
                        <div class="warning-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h2>Підтвердження видалення</h2>
                        <button class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="modal-body">
                        <div class="client-info">
                            <div class="client-avatar">
                                ${client.company.charAt(0).toUpperCase()}
                            </div>
                            <div class="client-details">
                                <h3>${client.company}</h3>
                                <p>${client.business_sector || 'Без сектору'}</p>
                            </div>
                        </div>

                        <div class="warning-content">
                            <p><strong>Це дія незворотна!</strong></p>
                            <p>Будуть видалені:</p>
                            <ul>
                                <li><i class="fas fa-brain"></i> Всі аналізи переговорів</li>
                                <li><i class="fas fa-lightbulb"></i> Історія рекомендацій</li>
                                <li><i class="fas fa-archive"></i> Архів документів</li>
                                <li><i class="fas fa-chart-line"></i> Статистика та звіти</li>
                            </ul>
                        </div>

                        <div class="type-confirmation">
                            <label>Для підтвердження введіть назву компанії:</label>
                            <input type="text" id="delete-confirmation-input" placeholder="${client.company}" autocomplete="off">
                            <small>Це додаткова захисна перевірка</small>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button class="btn-secondary cancel-btn">
                            <i class="fas fa-times"></i>
                            Скасувати
                        </button>
                        <button class="btn-danger confirm-btn" disabled>
                            <i class="fas fa-trash"></i>
                            Видалити назавжди
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Get elements
            const confirmInput = modal.querySelector('#delete-confirmation-input');
            const confirmBtn = modal.querySelector('.confirm-btn');
            const cancelBtn = modal.querySelector('.cancel-btn');
            const closeBtn = modal.querySelector('.modal-close');

            // Enable confirm button only when company name is typed correctly
            confirmInput.addEventListener('input', () => {
                const isValid = confirmInput.value.trim().toLowerCase() === client.company.toLowerCase();
                confirmBtn.disabled = !isValid;

                if (isValid) {
                    confirmBtn.classList.add('ready');
                } else {
                    confirmBtn.classList.remove('ready');
                }
            });

            // Event handlers
            const cleanup = () => {
                modal.remove();
            };

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            closeBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            });

            // Keyboard handling
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(false);
                } else if (e.key === 'Enter' && !confirmBtn.disabled) {
                    cleanup();
                    resolve(true);
                }
            });

            // Focus on input
            setTimeout(() => {
                confirmInput.focus();
            }, 100);
        });
    }

    // Perform all client deletion UI updates
    async function performClientDeletionUpdates(clientId, client) {
        console.log('🔄 Performing client deletion UI updates...');

        // Update all application states
        if (window.state && window.state.clients) {
            window.state.clients = window.state.clients.filter(c => c.id != clientId);
        }
        if (window.appState && window.appState.clients) {
            window.appState.clients = window.appState.clients.filter(c => c.id != clientId);
        }
        if (window.clients) {
            window.clients = window.clients.filter(c => c.id != clientId);
        }

        // Remove from right sidebar immediately
        const sidebarClientItems = document.querySelectorAll(`.client-item[data-client-id="${clientId}"]`);
        sidebarClientItems.forEach(item => {
            item.style.transition = 'all 0.3s ease';
            item.style.opacity = '0';
            item.style.transform = 'translateX(100%)';
            setTimeout(() => {
                item.remove();

                // Update sidebar client count
                updateSidebarClientCount();

                // If this was the selected client, clear selection
                if (item.classList.contains('selected')) {
                    clearClientSelection();
                }
            }, 300);
        });

        // Remove from UI immediately
        const clientElements = document.querySelectorAll(`[data-client-id="${clientId}"]`);
        clientElements.forEach(element => {
            element.style.transition = 'all 0.3s ease';
            element.style.opacity = '0';
            element.style.transform = 'translateX(-100%)';

            setTimeout(() => {
                element.remove();
            }, 300);
        });

        // Update client count
        if (window.updateClientCount) {
            window.updateClientCount();
        }

        // Clear current client if it was deleted
        const isCurrentClient = window.state?.currentClient?.id == clientId ||
                              window.appState?.currentClient?.id == clientId;

        if (isCurrentClient) {
            console.log('🔄 Clearing current client selection...');

            // Clear state
            if (window.state) {
                window.state.currentClient = null;
                window.state.currentAnalysis = null;
                window.state.selectedFragments = [];
            }
            if (window.appState) {
                window.appState.currentClient = null;
                window.appState.currentAnalysis = null;
            }

            // Clear UI
            clearClientUI();

            // Hide archive section
            const archiveSection = document.getElementById('archive-section');
            if (archiveSection) {
                archiveSection.style.display = 'none';
            }

            // Show welcome screen
            showWelcomeScreen();
        }

        // Cascade delete: Remove recommendations
        if (window.state?.recommendationsHistory && window.state.recommendationsHistory[clientId]) {
            delete window.state.recommendationsHistory[clientId];
            console.log('🔄 Cleared recommendations for deleted client');
        }

        // Cascade delete: Clear archive data
        if (window.archiveState && window.archiveState.analyses) {
            window.archiveState.analyses = window.archiveState.analyses.filter(
                a => a.client_id != clientId
            );
        }

        // Re-render clients list
        if (window.renderClientsList) {
            await window.renderClientsList();
        } else {
            renderClientsListFallback();
        }

        // Save updated state
        if (window.saveAppState) {
            window.saveAppState();
        }

        console.log('✅ Client deletion UI updates completed');
    }

    // Clear client-related UI
    function clearClientUI() {
        // Clear nav client info
        const navClientInfo = document.getElementById('nav-client-info');
        if (navClientInfo) {
            navClientInfo.style.display = 'none';
        }

        // Clear workspace client info
        const workspaceClientInfo = document.querySelector('.workspace-client-info');
        if (workspaceClientInfo) {
            workspaceClientInfo.style.display = 'none';
        }

        // Clear analysis results
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }

    // Show welcome screen
    function showWelcomeScreen() {
        // Hide all sections first
        const sections = document.querySelectorAll('.tab-pane, .product-section');
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Show welcome screen
        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'block';
        }

        // Update product switcher
        const productItems = document.querySelectorAll('.product-item');
        productItems.forEach(item => item.classList.remove('active'));

        const welcomeItem = document.querySelector('[data-target="welcome-screen"]');
        if (welcomeItem) {
            welcomeItem.classList.add('active');
        }
    }

    // Fallback client list rendering
    function renderClientsListFallback() {
        const clientsList = document.getElementById('client-list');
        if (!clientsList) return;

        const clients = window.state?.clients || window.appState?.clients || [];

        if (clients.length === 0) {
            clientsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <p>Ще немає клієнтів</p>
                    <button class="btn-primary btn-sm" onclick="showClientForm()">
                        <i class="fas fa-plus"></i>
                        Додати клієнта
                    </button>
                </div>
            `;
            return;
        }

        clientsList.innerHTML = clients.map(client => `
            <div class="client-item" data-client-id="${client.id}" onclick="selectClient(${client.id})">
                <div class="client-avatar">${client.company.charAt(0).toUpperCase()}</div>
                <div class="client-info">
                    <div class="client-name">${client.company}</div>
                    <div class="client-meta">${client.business_sector || 'Без сектору'}</div>
                </div>
                <div class="client-actions">
                    <button class="btn-icon" onclick="editClient(${client.id}, event)" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="deleteClientEnhanced(${client.id}, event)" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Update sidebar client count
    function updateSidebarClientCount() {
        const clientListContainer = document.querySelector('.client-list');
        if (!clientListContainer) return;

        const remainingClients = clientListContainer.querySelectorAll('.client-item');
        const countElement = document.querySelector('.sidebar-header .client-count');

        if (countElement) {
            countElement.textContent = remainingClients.length;
        }

        // Show empty state if no clients
        if (remainingClients.length === 0) {
            showEmptyClientState();
        }
    }

    // Clear client selection
    function clearClientSelection() {
        // Remove selected class from all client items
        document.querySelectorAll('.client-item.selected').forEach(item => {
            item.classList.remove('selected');
        });

        // Clear main content area
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

        // Update global state
        if (window.selectedClientId) {
            window.selectedClientId = null;
        }
        if (window.currentClient) {
            window.currentClient = null;
        }
    }

    // Show empty client state
    function showEmptyClientState() {
        const clientListContainer = document.querySelector('.client-list');
        if (!clientListContainer) return;

        clientListContainer.innerHTML = `
            <div class="empty-client-state">
                <div class="empty-icon">
                    <i class="fas fa-plus-circle"></i>
                </div>
                <h4>Немає клієнтів</h4>
                <p>Додайте першого клієнта для початку роботи</p>
                <button class="btn-primary btn-sm" onclick="document.getElementById('company').focus()">
                    <i class="fas fa-plus"></i>
                    Додати клієнта
                </button>
            </div>
        `;
    }

    // Enhanced client selection with real-time updates
    async function selectClientEnhanced(clientId) {
        console.log('👤 Enhanced selectClient called with ID:', clientId);

        try {
            const clients = window.state?.clients || window.appState?.clients || [];
            const client = clients.find(c => c.id == clientId);

            if (!client) {
                throw new Error('Клієнт не знайдено');
            }

            // Update state
            if (window.state) {
                window.state.currentClient = client;
            }
            if (window.appState) {
                window.appState.currentClient = client;
            }

            // Update UI immediately
            updateClientSelectionUI(client);

            // Load additional data
            await loadClientData(clientId);

            // Save state
            if (window.saveAppState) {
                window.saveAppState();
            }

        } catch (error) {
            console.error('❌ Client selection error:', error);
            if (window.showNotification) {
                window.showNotification(error.message || 'Помилка вибору клієнта', 'error');
            }
        }
    }

    // Update client selection UI
    function updateClientSelectionUI(client) {
        // Update nav info
        const navClientInfo = document.getElementById('nav-client-info');
        const navClientName = document.getElementById('nav-client-name');
        const navClientSector = document.getElementById('nav-client-sector');
        const navClientAvatar = document.getElementById('nav-client-avatar');

        if (navClientInfo) navClientInfo.style.display = 'block';
        if (navClientName) navClientName.textContent = client.company;
        if (navClientSector) navClientSector.textContent = client.business_sector || '—';
        if (navClientAvatar) navClientAvatar.textContent = client.company.charAt(0).toUpperCase();

        // Update client selection in list
        document.querySelectorAll('.client-item').forEach(item => {
            item.classList.remove('selected');
        });

        const selectedItem = document.querySelector(`[data-client-id="${client.id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }

        // Show analysis dashboard
        const analysisSection = document.getElementById('analysis-dashboard');
        if (analysisSection) {
            analysisSection.style.display = 'block';
        }

        // Hide welcome screen
        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }
    }

    // Load client-specific data
    async function loadClientData(clientId) {
        // Load archive if available
        if (window.loadArchive) {
            await window.loadArchive(clientId);
        }

        // Load analysis history if available
        if (window.loadAnalysisHistory) {
            await window.loadAnalysisHistory(clientId);
        }

        // Load teams if available
        if (window.loadTeamsForClient) {
            await window.loadTeamsForClient(clientId);
        }
    }

    // Global functions
    window.deleteClientEnhanced = deleteClientEnhanced;
    window.selectClientEnhanced = selectClientEnhanced;

    // Override existing functions if they exist
    if (window.deleteClient) {
        window.deleteClient = deleteClientEnhanced;
    }
    if (window.selectClient) {
        window.selectClient = selectClientEnhanced;
    }

    // CSS for enhanced delete modal
    const deleteModalCSS = `
        .enhanced-delete-modal .modal-container {
            max-width: 500px;
        }

        .enhanced-delete-modal .modal-header {
            background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
            color: white;
            border-bottom: none;
        }

        .enhanced-delete-modal .warning-icon {
            font-size: 1.5rem;
            margin-right: 0.5rem;
        }

        .enhanced-delete-modal .client-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: var(--surface-secondary);
            border-radius: 8px;
            margin-bottom: 1.5rem;
        }

        .enhanced-delete-modal .client-avatar {
            width: 50px;
            height: 50px;
            background: var(--neon-purple);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 1.2rem;
        }

        .enhanced-delete-modal .client-details h3 {
            margin: 0 0 0.25rem 0;
            color: var(--text-primary);
        }

        .enhanced-delete-modal .client-details p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .enhanced-delete-modal .warning-content {
            margin-bottom: 1.5rem;
        }

        .enhanced-delete-modal .warning-content ul {
            list-style: none;
            padding: 0;
            margin: 1rem 0;
        }

        .enhanced-delete-modal .warning-content li {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0;
            color: var(--text-secondary);
        }

        .enhanced-delete-modal .warning-content i {
            color: var(--neon-pink);
            width: 16px;
        }

        .enhanced-delete-modal .type-confirmation {
            background: var(--surface-tertiary);
            padding: 1rem;
            border-radius: 8px;
            border-left: 4px solid var(--neon-pink);
        }

        .enhanced-delete-modal .type-confirmation label {
            display: block;
            font-weight: 500;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }

        .enhanced-delete-modal .type-confirmation input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--surface-primary);
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }

        .enhanced-delete-modal .type-confirmation small {
            color: var(--text-tertiary);
            font-size: 0.8rem;
        }

        .enhanced-delete-modal .confirm-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .enhanced-delete-modal .confirm-btn.ready {
            background: #ff4757;
            border-color: #ff4757;
            box-shadow: 0 0 0 2px rgba(255, 71, 87, 0.2);
        }

        .inline-spinner {
            position: absolute;
            top: 50%;
            right: 1rem;
            transform: translateY(-50%);
            color: var(--neon-purple);
        }
    `;

    // Add CSS to page
    const style = document.createElement('style');
    style.textContent = deleteModalCSS;
    document.head.appendChild(style);

    console.log('✨ Enhanced client management ready');

})();