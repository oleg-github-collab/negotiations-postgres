/**
 * Application Initialization and Integration Manager
 * Ensures all systems are connected and working properly
 */

const AppInit = {
    initialized: false,
    modules: {},
    baseURL: '/api',

    /**
     * Initialize the entire application
     */
    async init() {
        if (this.initialized) {
            console.warn('⚠️ Application already initialized');
            return;
        }

        console.log('🚀 Starting application initialization...');

        try {
            // Step 1: Check authentication
            await this.checkAuthentication();

            // Step 2: Initialize core utilities
            this.initializeCoreUtilities();

            // Step 3: Initialize UI components
            this.initializeUIComponents();

            // Step 4: Load initial data
            await this.loadInitialData();

            // Step 5: Attach global event handlers
            this.attachGlobalEventHandlers();

            // Step 6: Initialize advanced features
            this.initializeAdvancedFeatures();

            this.initialized = true;
            console.log('✅ Application initialized successfully');

            // Fire ready event
            window.dispatchEvent(new CustomEvent('app-ready'));

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.showInitializationError(error);
        }
    },

    /**
     * Check authentication status
     */
    async checkAuthentication() {
        console.log('🔐 Checking authentication...');

        try {
            const response = await fetch('/api/clients');

            if (!response.ok) {
                if (response.status === 401) {
                    console.log('🔐 Not authenticated, redirecting to login');
                    window.location.href = '/login.html';
                    throw new Error('Not authenticated');
                }
                throw new Error(`Auth check failed: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                window.location.href = '/login.html';
                throw new Error('Auth check unsuccessful');
            }

            console.log('✅ Authentication verified');
        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            throw error;
        }
    },

    /**
     * Initialize core utilities
     */
    initializeCoreUtilities() {
        console.log('🔧 Initializing core utilities...');

        // Initialize DataValidator if available
        if (window.DataValidator) {
            DataValidator.init();
            this.modules.validator = DataValidator;
        }

        // Initialize APIClient if available
        if (window.APIClient) {
            APIClient.baseURL = this.baseURL;
            this.modules.apiClient = APIClient;
        }

        // Initialize ErrorHandler if available
        if (window.ErrorHandler) {
            ErrorHandler.setupGlobalErrorHandlers();
            this.modules.errorHandler = ErrorHandler;
        }

        // Initialize AutoSave if available
        if (window.AutoSave) {
            AutoSave.init();
            this.modules.autoSave = AutoSave;
        }

        console.log('✅ Core utilities initialized');
    },

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        console.log('🎨 Initializing UI components...');

        // Initialize ProspectsManager
        if (window.ProspectsManager) {
            ProspectsManager.init();
            this.modules.prospects = ProspectsManager;
        }

        // Initialize KanbanBoard
        if (window.KanbanBoard) {
            KanbanBoard.init();
            this.modules.kanban = KanbanBoard;
        }

        // Initialize TeamHub
        if (window.TeamHub) {
            TeamHub.init();
            this.modules.teamHub = TeamHub;
        }

        // Initialize TeamManagement
        if (window.TeamManagement) {
            TeamManagement.init();
            this.modules.teamManagement = TeamManagement;
        }

        console.log('✅ UI components initialized');
    },

    /**
     * Load initial data
     */
    async loadInitialData() {
        console.log('📊 Loading initial data...');

        try {
            // Get current active tab
            const activeTab = document.querySelector('.nav-tab.active');
            const currentTab = activeTab?.dataset.tab || 'prospects';

            // Load data based on active tab
            if (currentTab === 'prospects' && this.modules.prospects) {
                await this.modules.prospects.loadProspects();
            } else if (currentTab === 'clients' && this.modules.teamHub) {
                await this.modules.teamHub.loadClients();
            }

            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            // Don't throw - app can still work without initial data
        }
    },

    /**
     * Attach global event handlers
     */
    attachGlobalEventHandlers() {
        console.log('🔗 Attaching global event handlers...');

        // Tab switching
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', async (e) => {
                const tabName = tab.dataset.tab;

                // Update active tab
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding panel
                document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                const panel = document.getElementById(`${tabName}-panel`);
                if (panel) {
                    panel.classList.add('active');
                }

                // Load data for the tab
                await this.onTabSwitch(tabName);
            });
        });

        // Search button - opens Command Palette
        const searchBtn = document.getElementById('search-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (window.CommandPalette) {
                    CommandPalette.open();
                } else if (window.AdvancedSearch) {
                    AdvancedSearch.open('prospect');
                }
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.logout) {
                    window.logout();
                }
            });
        }

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        // Notifications button
        const notificationsBtn = document.getElementById('notifications-btn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }

        // Add Active Client button
        const addClientBtn = document.getElementById('add-active-client-btn');
        if (addClientBtn) {
            addClientBtn.addEventListener('click', () => {
                this.showCreateClientModal();
            });
        }

        console.log('✅ Global event handlers attached');
    },

    /**
     * Initialize advanced features
     */
    initializeAdvancedFeatures() {
        console.log('✨ Initializing advanced features...');

        // Initialize Command Palette
        if (window.CommandPalette) {
            CommandPalette.init();
            this.modules.commandPalette = CommandPalette;
        }

        // Initialize Advanced Search
        if (window.AdvancedSearch) {
            AdvancedSearch.init();
            this.modules.advancedSearch = AdvancedSearch;
        }

        // Initialize Bulk Operations
        if (window.BulkOperations) {
            BulkOperations.init();
            this.modules.bulkOperations = BulkOperations;
        }

        // Initialize Keyboard Shortcuts
        if (window.KeyboardShortcuts) {
            KeyboardShortcuts.init();
            this.modules.keyboardShortcuts = KeyboardShortcuts;
        }

        // Initialize Onboarding Tour
        if (window.OnboardingTour) {
            OnboardingTour.init();
            this.modules.onboardingTour = OnboardingTour;

            // Check if user is new
            const hasSeenTour = localStorage.getItem('hasSeenWelcomeTour');
            if (!hasSeenTour) {
                // Show tour after a short delay
                setTimeout(() => {
                    OnboardingTour.startTour('welcome');
                }, 1000);
            }
        }

        // Initialize RichTextEditor
        if (window.RichTextEditor) {
            RichTextEditor.init();
            this.modules.richTextEditor = RichTextEditor;
        }

        console.log('✅ Advanced features initialized');
    },

    /**
     * Handle tab switching
     */
    async onTabSwitch(tabName) {
        console.log(`🔄 Switching to tab: ${tabName}`);

        try {
            switch (tabName) {
                case 'prospects':
                    if (this.modules.prospects) {
                        await this.modules.prospects.loadProspects();
                    }
                    break;

                case 'clients':
                    if (this.modules.teamHub) {
                        await this.modules.teamHub.loadClients();
                    }
                    break;
            }
        } catch (error) {
            console.error(`❌ Error loading ${tabName} data:`, error);
            this.showError(`Помилка завантаження даних для вкладки ${tabName}`);
        }
    },

    /**
     * Show settings modal
     */
    showSettings() {
        console.log('⚙️ Opening settings...');

        // Create settings modal
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-cog"></i> Налаштування</h2>
                    <button class="modal-close-btn" onclick="this.closest('.settings-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h3>Інтерфейс</h3>
                        <label class="setting-item">
                            <input type="checkbox" id="vim-mode-setting" ${window.KeyboardShortcuts?.vimMode ? 'checked' : ''}>
                            <span>Vim режим навігації</span>
                        </label>
                        <label class="setting-item">
                            <input type="checkbox" id="show-onboarding-setting">
                            <span>Показати інтро при наступному вході</span>
                        </label>
                    </div>
                    <div class="settings-section">
                        <h3>Дані</h3>
                        <button class="btn-secondary" onclick="AppInit.clearCache()">
                            <i class="fas fa-trash"></i>
                            Очистити кеш
                        </button>
                        <button class="btn-secondary" onclick="AppInit.resetOnboarding()">
                            <i class="fas fa-redo"></i>
                            Скинути інтро
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="this.closest('.settings-modal').remove()">
                        Закрити
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Attach event listeners
        const vimModeSetting = modal.querySelector('#vim-mode-setting');
        if (vimModeSetting) {
            vimModeSetting.addEventListener('change', (e) => {
                if (window.KeyboardShortcuts) {
                    if (e.target.checked) {
                        KeyboardShortcuts.vimMode = true;
                    } else {
                        KeyboardShortcuts.vimMode = false;
                    }
                    KeyboardShortcuts.saveUserPreferences();
                }
            });
        }

        // Close on overlay click
        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            modal.remove();
        });
    },

    /**
     * Show notifications
     */
    showNotifications() {
        console.log('🔔 Opening notifications...');
        // Placeholder for notifications feature
        alert('Notifications feature - Coming soon!');
    },

    /**
     * Show create client modal
     */
    showCreateClientModal() {
        console.log('➕ Opening create client modal...');

        if (window.showModal) {
            showModal('create-client-modal');
        } else {
            console.warn('showModal function not available');
        }
    },

    /**
     * Clear cache
     */
    clearCache() {
        console.log('🗑️ Clearing cache...');

        try {
            // Clear localStorage except auth
            const auth = sessionStorage.getItem('teampulse-auth');
            localStorage.clear();
            if (auth) {
                sessionStorage.setItem('teampulse-auth', auth);
            }

            // Clear API cache
            if (window.APIClient) {
                APIClient.cache.clear();
            }

            alert('Кеш очищено!');
        } catch (error) {
            console.error('Error clearing cache:', error);
            alert('Помилка очищення кешу');
        }
    },

    /**
     * Reset onboarding
     */
    resetOnboarding() {
        console.log('🔄 Resetting onboarding...');

        localStorage.removeItem('hasSeenWelcomeTour');
        localStorage.removeItem('hasSeenProspectsTour');
        localStorage.removeItem('hasSeenTeamHubTour');

        alert('Інтро скинуто! Перезавантажте сторінку для повторного показу.');
    },

    /**
     * Show error message
     */
    showError(message) {
        if (window.showNotification) {
            showNotification(message, 'error');
        } else {
            console.error(message);
            alert(message);
        }
    },

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        const errorMessage = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #1a1a2e;
                border: 2px solid #f44336;
                border-radius: 12px;
                padding: 30px;
                max-width: 500px;
                text-align: center;
                z-index: 10000;
                color: white;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f44336; margin-bottom: 20px;"></i>
                <h2 style="margin: 0 0 15px 0; color: white;">Помилка ініціалізації</h2>
                <p style="margin: 0 0 20px 0; color: rgba(255,255,255,0.7);">
                    Не вдалося завантажити додаток. Будь ласка, перезавантажте сторінку.
                </p>
                <button onclick="location.reload()" style="
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    Перезавантажити
                </button>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', errorMessage);
    }
};

// Auto-initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for auth to complete
        window.addEventListener('auth-success', () => {
            AppInit.init();
        });
    });
} else {
    // If DOM already loaded, check if we're authenticated
    const isAuth = sessionStorage.getItem('teampulse-auth');
    if (isAuth) {
        AppInit.init();
    } else {
        window.addEventListener('auth-success', () => {
            AppInit.init();
        });
    }
}

// Export globally
window.AppInit = AppInit;
