/**
 * Comprehensive Keyboard Shortcuts System
 * Vim-inspired navigation with modern shortcuts
 */

const KeyboardShortcuts = {
    // State
    enabled: true,
    vimMode: false,
    shortcuts: new Map(),
    contexts: new Map(),
    currentContext: 'global',
    recording: false,
    recordedKeys: [],

    // Configuration
    showHelpOnStart: false,
    caseSensitive: false,

    /**
     * Initialize keyboard shortcuts
     */
    init() {
        this.registerDefaultShortcuts();
        this.attachGlobalListeners();
        this.loadUserPreferences();
        console.log('✅ Keyboard Shortcuts initialized');
    },

    /**
     * Register default shortcuts
     */
    registerDefaultShortcuts() {
        // Global Navigation
        this.register('global', 'g h', () => this.goToTab('prospects'), 'Перейти до Prospects');
        this.register('global', 'g c', () => this.goToTab('clients'), 'Перейти до Clients');
        this.register('global', 'g t', () => this.goToTab('teams'), 'Перейти до Teams');

        // Search & Filter
        this.register('global', 'Ctrl+k', () => this.openCommandPalette(), 'Відкрити Command Palette');
        this.register('global', 'Ctrl+f', () => this.openSearch(), 'Розширений пошук');
        this.register('global', '/', () => this.focusQuickSearch(), 'Швидкий пошук');

        // Create Actions
        this.register('global', 'c p', () => this.createProspect(), 'Створити Prospect');
        this.register('global', 'c c', () => this.createClient(), 'Створити Client');
        this.register('global', 'c t', () => this.createTeam(), 'Створити Team');
        this.register('global', 'c n', () => this.createNote(), 'Створити нотатку');

        // Bulk Operations
        this.register('global', 'Shift+b', () => this.toggleBulkMode(), 'Режим множинного вибору');
        this.register('global', 'Ctrl+a', (e) => {
            if (window.BulkOperations?.isActive) {
                e.preventDefault();
                window.BulkOperations.selectAll();
            }
        }, 'Вибрати все (в режимі bulk)');

        // View Controls
        this.register('global', 'v g', () => this.switchView('grid'), 'Grid вигляд');
        this.register('global', 'v k', () => this.switchView('kanban'), 'Kanban вигляд');
        this.register('global', 'v l', () => this.switchView('list'), 'List вигляд');
        this.register('global', 'v t', () => this.switchView('timeline'), 'Timeline вигляд');

        // Navigation (Vim-style)
        this.register('vim', 'j', () => this.navigateDown(), 'Вниз');
        this.register('vim', 'k', () => this.navigateUp(), 'Вгору');
        this.register('vim', 'h', () => this.navigateLeft(), 'Вліво');
        this.register('vim', 'l', () => this.navigateRight(), 'Вправо');
        this.register('vim', 'g g', () => this.navigateToTop(), 'На початок');
        this.register('vim', 'G', () => this.navigateToBottom(), 'В кінець');

        // Selection (Vim-style)
        this.register('vim', 'Enter', () => this.selectItem(), 'Вибрати елемент');
        this.register('vim', 'Escape', () => this.deselectItem(), 'Скасувати вибір');

        // UI Controls
        this.register('global', '?', () => this.showHelp(), 'Показати довідку');
        this.register('global', 'Ctrl+s', (e) => {
            e.preventDefault();
            this.saveCurrentContext();
        }, 'Зберегти');
        this.register('global', 'Escape', () => this.closeModals(), 'Закрити модальне вікно');

        // Refresh
        this.register('global', 'r r', () => this.refresh(), 'Оновити сторінку');
        this.register('global', 'Ctrl+r', (e) => {
            e.preventDefault();
            this.refresh();
        }, 'Оновити сторінку');

        // Undo/Redo
        this.register('global', 'Ctrl+z', (e) => {
            e.preventDefault();
            this.undo();
        }, 'Скасувати');
        this.register('global', 'Ctrl+Shift+z', (e) => {
            e.preventDefault();
            this.redo();
        }, 'Повторити');

        // Export
        this.register('global', 'e x', () => this.exportData(), 'Експортувати');

        // Settings
        this.register('global', ',', () => this.openSettings(), 'Налаштування');

        // Toggle Vim Mode
        this.register('global', 'Ctrl+Shift+v', () => this.toggleVimMode(), 'Перемкнути Vim режим');
    },

    /**
     * Register a keyboard shortcut
     */
    register(context, keys, callback, description = '') {
        if (!this.contexts.has(context)) {
            this.contexts.set(context, new Map());
        }

        const contextShortcuts = this.contexts.get(context);
        contextShortcuts.set(keys.toLowerCase(), {
            keys,
            callback,
            description,
            context
        });
    },

    /**
     * Unregister a shortcut
     */
    unregister(context, keys) {
        const contextShortcuts = this.contexts.get(context);
        if (contextShortcuts) {
            contextShortcuts.delete(keys.toLowerCase());
        }
    },

    /**
     * Attach global event listeners
     */
    attachGlobalListeners() {
        let keySequence = [];
        let sequenceTimer = null;

        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Ignore if typing in input fields (except for special keys)
            if (this.isTypingContext(e.target) && !this.isSpecialKey(e)) {
                return;
            }

            // Build key string
            const keyStr = this.buildKeyString(e);

            // Add to sequence
            keySequence.push(keyStr);

            // Clear sequence after 1 second
            clearTimeout(sequenceTimer);
            sequenceTimer = setTimeout(() => {
                keySequence = [];
            }, 1000);

            // Try to match shortcuts
            const sequence = keySequence.join(' ');
            this.tryMatchShortcut(sequence, e);

            // Also try single key
            if (keySequence.length === 1) {
                this.tryMatchShortcut(keyStr, e);
            }
        });
    },

    /**
     * Check if in typing context
     */
    isTypingContext(element) {
        const tagName = element.tagName.toLowerCase();
        return (
            tagName === 'input' ||
            tagName === 'textarea' ||
            element.isContentEditable
        );
    },

    /**
     * Check if special key
     */
    isSpecialKey(e) {
        return (
            e.ctrlKey ||
            e.metaKey ||
            e.key === 'Escape' ||
            e.key === 'F1' ||
            e.key === 'F2'
        );
    },

    /**
     * Build key string from event
     */
    buildKeyString(e) {
        const parts = [];

        if (e.ctrlKey) parts.push('Ctrl');
        if (e.metaKey) parts.push('Cmd');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey && e.key.length > 1) parts.push('Shift');

        // Add the key
        let key = e.key;
        if (key === ' ') key = 'Space';
        if (key.length === 1 && !this.caseSensitive) {
            key = key.toLowerCase();
        }
        parts.push(key);

        return parts.join('+');
    },

    /**
     * Try to match and execute shortcut
     */
    tryMatchShortcut(sequence, event) {
        // Try vim context first if enabled
        if (this.vimMode) {
            const vimShortcuts = this.contexts.get('vim');
            if (vimShortcuts && vimShortcuts.has(sequence.toLowerCase())) {
                const shortcut = vimShortcuts.get(sequence.toLowerCase());
                event.preventDefault();
                shortcut.callback(event);
                return true;
            }
        }

        // Try current context
        const contextShortcuts = this.contexts.get(this.currentContext);
        if (contextShortcuts && contextShortcuts.has(sequence.toLowerCase())) {
            const shortcut = contextShortcuts.get(sequence.toLowerCase());
            event.preventDefault();
            shortcut.callback(event);
            return true;
        }

        // Try global context
        const globalShortcuts = this.contexts.get('global');
        if (globalShortcuts && globalShortcuts.has(sequence.toLowerCase())) {
            const shortcut = globalShortcuts.get(sequence.toLowerCase());
            event.preventDefault();
            shortcut.callback(event);
            return true;
        }

        return false;
    },

    /**
     * Switch context
     */
    setContext(context) {
        this.currentContext = context;
    },

    /**
     * Enable/disable shortcuts
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    },

    /**
     * Toggle Vim mode
     */
    toggleVimMode() {
        this.vimMode = !this.vimMode;

        if (window.showNotification) {
            showNotification(
                `Vim режим ${this.vimMode ? 'увімкнено' : 'вимкнено'}`,
                'info'
            );
        }

        this.saveUserPreferences();
    },

    /**
     * Show help modal
     */
    showHelp() {
        const modal = document.createElement('div');
        modal.className = 'keyboard-shortcuts-help-modal';

        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-keyboard"></i> Клавіатурні скорочення</h2>
                    <button class="modal-close-btn" onclick="this.closest('.keyboard-shortcuts-help-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${this.renderShortcutsList()}
                </div>
                <div class="modal-footer">
                    <label class="vim-mode-toggle">
                        <input type="checkbox"
                               ${this.vimMode ? 'checked' : ''}
                               onchange="KeyboardShortcuts.toggleVimMode()">
                        <span>Увімкнути Vim режим</span>
                    </label>
                    <button class="btn-primary" onclick="this.closest('.keyboard-shortcuts-help-modal').remove()">
                        Закрити
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close on overlay click
        modal.querySelector('.modal-overlay').onclick = () => modal.remove();

        // Close on Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    },

    /**
     * Render shortcuts list
     */
    renderShortcutsList() {
        const sections = [
            { name: 'Навігація', context: 'global', filter: (s) => s.keys.startsWith('g ') },
            { name: 'Пошук', context: 'global', filter: (s) => s.description.includes('пошук') || s.description.includes('Пошук') },
            { name: 'Створення', context: 'global', filter: (s) => s.keys.startsWith('c ') },
            { name: 'Вигляди', context: 'global', filter: (s) => s.keys.startsWith('v ') },
            { name: 'Дії', context: 'global', filter: (s) => !s.keys.startsWith('g ') && !s.keys.startsWith('c ') && !s.keys.startsWith('v ') },
            { name: 'Vim режим', context: 'vim', filter: () => true }
        ];

        return sections.map(section => {
            const shortcuts = this.getShortcutsForSection(section.context, section.filter);
            if (shortcuts.length === 0) return '';

            return `
                <div class="shortcuts-section">
                    <h3>${section.name}</h3>
                    <div class="shortcuts-list">
                        ${shortcuts.map(s => `
                            <div class="shortcut-item">
                                <div class="shortcut-keys">
                                    ${this.renderKeySequence(s.keys)}
                                </div>
                                <div class="shortcut-description">${s.description}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Get shortcuts for section
     */
    getShortcutsForSection(context, filter) {
        const contextShortcuts = this.contexts.get(context);
        if (!contextShortcuts) return [];

        return Array.from(contextShortcuts.values()).filter(filter);
    },

    /**
     * Render key sequence
     */
    renderKeySequence(keys) {
        return keys.split(' ').map(key => {
            const parts = key.split('+');
            return parts.map(part => `<kbd>${part}</kbd>`).join('<span class="key-plus">+</span>');
        }).join('<span class="key-then">then</span>');
    },

    // Action implementations
    goToTab(tab) {
        const tabButton = document.querySelector(`[data-tab="${tab}"]`);
        if (tabButton) tabButton.click();
    },

    openCommandPalette() {
        if (window.CommandPalette) {
            CommandPalette.open();
        }
    },

    openSearch() {
        if (window.AdvancedSearch) {
            AdvancedSearch.open();
        }
    },

    focusQuickSearch() {
        const searchInput = document.querySelector('#prospect-search, #teamhub-search');
        if (searchInput) searchInput.focus();
    },

    createProspect() {
        const createBtn = document.querySelector('#create-prospect-btn, [data-action="create-prospect"]');
        if (createBtn) createBtn.click();
    },

    createClient() {
        const createBtn = document.querySelector('#add-active-client-btn');
        if (createBtn) createBtn.click();
    },

    createTeam() {
        // Implementation depends on team creation UI
        console.log('Create team shortcut triggered');
    },

    createNote() {
        // Implementation depends on notes UI
        console.log('Create note shortcut triggered');
    },

    toggleBulkMode() {
        if (window.BulkOperations) {
            if (BulkOperations.isActive) {
                BulkOperations.deactivate();
            } else {
                // Determine entity type from current tab
                const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab || 'prospect';
                BulkOperations.activate(activeTab);
            }
        }
    },

    switchView(view) {
        const viewBtn = document.querySelector(`[data-view="${view}"]`);
        if (viewBtn) viewBtn.click();
    },

    navigateDown() {
        // Vim-style navigation
        window.scrollBy({ top: 100, behavior: 'smooth' });
    },

    navigateUp() {
        window.scrollBy({ top: -100, behavior: 'smooth' });
    },

    navigateLeft() {
        // Navigate to previous card/item
        console.log('Navigate left');
    },

    navigateRight() {
        // Navigate to next card/item
        console.log('Navigate right');
    },

    navigateToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    navigateToBottom() {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    },

    selectItem() {
        // Select focused item
        console.log('Select item');
    },

    deselectItem() {
        // Deselect item
        this.closeModals();
    },

    showHelp() {
        // Already implemented above
        this.showHelp();
    },

    saveCurrentContext() {
        // Trigger save in current context
        const saveBtn = document.querySelector('[data-action="save"], .save-btn');
        if (saveBtn) {
            saveBtn.click();
        } else if (window.AutoSave) {
            AutoSave.syncAll();
        }
    },

    closeModals() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal, [class*="modal-container"]');
        modals.forEach(modal => {
            if (modal.classList.contains('active') || modal.style.display !== 'none') {
                const closeBtn = modal.querySelector('[class*="close"]');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    modal.remove();
                }
            }
        });
    },

    refresh() {
        location.reload();
    },

    undo() {
        // Implementation depends on undo system
        console.log('Undo');
    },

    redo() {
        // Implementation depends on redo system
        console.log('Redo');
    },

    exportData() {
        // Open export dialog
        console.log('Export data');
    },

    openSettings() {
        const settingsBtn = document.querySelector('#settings-btn');
        if (settingsBtn) settingsBtn.click();
    },

    /**
     * Save user preferences
     */
    saveUserPreferences() {
        try {
            localStorage.setItem('keyboardShortcutsPreferences', JSON.stringify({
                vimMode: this.vimMode,
                enabled: this.enabled
            }));
        } catch (error) {
            console.error('Failed to save keyboard shortcuts preferences:', error);
        }
    },

    /**
     * Load user preferences
     */
    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('keyboardShortcutsPreferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.vimMode = prefs.vimMode || false;
                this.enabled = prefs.enabled !== false;
            }
        } catch (error) {
            console.error('Failed to load keyboard shortcuts preferences:', error);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KeyboardShortcuts.init());
} else {
    KeyboardShortcuts.init();
}

// Export for global access
window.KeyboardShortcuts = KeyboardShortcuts;
