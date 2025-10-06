/**
 * Bulk Operations System
 * Enable multi-select and batch operations on entities
 */

const BulkOperations = {
    // State
    isActive: false,
    selectedItems: new Set(),
    entityType: null,
    selectionMode: 'checkbox', // 'checkbox' or 'shift-click'

    // Available operations
    operations: {
        prospect: [
            {
                id: 'change-status',
                label: 'Змінити статус',
                icon: 'fa-flag',
                requiresInput: true,
                inputType: 'select',
                options: [
                    { value: 'new', label: 'Новий' },
                    { value: 'qualifying', label: 'Кваліфікація' },
                    { value: 'promising', label: 'Перспективний' },
                    { value: 'negotiation', label: 'Переговори' },
                    { value: 'risky', label: 'Ризиковий' },
                    { value: 'converted', label: 'Конвертовано' }
                ]
            },
            {
                id: 'change-risk',
                label: 'Змінити рівень ризику',
                icon: 'fa-exclamation-triangle',
                requiresInput: true,
                inputType: 'select',
                options: [
                    { value: 'low', label: 'Низький' },
                    { value: 'medium', label: 'Середній' },
                    { value: 'high', label: 'Високий' },
                    { value: 'critical', label: 'Критичний' }
                ]
            },
            {
                id: 'add-tags',
                label: 'Додати теги',
                icon: 'fa-tags',
                requiresInput: true,
                inputType: 'tags'
            },
            {
                id: 'assign-user',
                label: 'Призначити відповідального',
                icon: 'fa-user',
                requiresInput: true,
                inputType: 'user-select'
            },
            {
                id: 'export',
                label: 'Експортувати',
                icon: 'fa-download',
                requiresInput: true,
                inputType: 'export-format',
                options: [
                    { value: 'csv', label: 'CSV' },
                    { value: 'xlsx', label: 'Excel' },
                    { value: 'json', label: 'JSON' },
                    { value: 'pdf', label: 'PDF' }
                ]
            },
            {
                id: 'archive',
                label: 'Архівувати',
                icon: 'fa-archive',
                requiresConfirmation: true,
                confirmMessage: 'Архівувати вибрані prospects?'
            },
            {
                id: 'delete',
                label: 'Видалити',
                icon: 'fa-trash',
                requiresConfirmation: true,
                confirmMessage: 'Видалити вибрані prospects? Цю дію не можна скасувати.',
                danger: true
            }
        ],
        client: [
            {
                id: 'change-sector',
                label: 'Змінити сферу',
                icon: 'fa-industry',
                requiresInput: true,
                inputType: 'select',
                options: [
                    { value: 'it', label: 'IT' },
                    { value: 'finance', label: 'Фінанси' },
                    { value: 'healthcare', label: 'Охорона здоров\'я' },
                    { value: 'retail', label: 'Роздрібна торгівля' },
                    { value: 'manufacturing', label: 'Виробництво' }
                ]
            },
            {
                id: 'add-tags',
                label: 'Додати теги',
                icon: 'fa-tags',
                requiresInput: true,
                inputType: 'tags'
            },
            {
                id: 'export',
                label: 'Експортувати',
                icon: 'fa-download',
                requiresInput: true,
                inputType: 'export-format',
                options: [
                    { value: 'csv', label: 'CSV' },
                    { value: 'xlsx', label: 'Excel' },
                    { value: 'json', label: 'JSON' }
                ]
            },
            {
                id: 'archive',
                label: 'Архівувати',
                icon: 'fa-archive',
                requiresConfirmation: true,
                confirmMessage: 'Архівувати вибраних клієнтів?'
            }
        ],
        team: [
            {
                id: 'add-members',
                label: 'Додати учасників',
                icon: 'fa-user-plus',
                requiresInput: true,
                inputType: 'member-select'
            },
            {
                id: 'export',
                label: 'Експортувати',
                icon: 'fa-download',
                requiresInput: true,
                inputType: 'export-format',
                options: [
                    { value: 'csv', label: 'CSV' },
                    { value: 'xlsx', label: 'Excel' }
                ]
            },
            {
                id: 'delete',
                label: 'Видалити',
                icon: 'fa-trash',
                requiresConfirmation: true,
                confirmMessage: 'Видалити вибрані команди?',
                danger: true
            }
        ]
    },

    /**
     * Initialize bulk operations
     */
    init() {
        this.setupGlobalShortcuts();
        console.log('✅ Bulk Operations initialized');
    },

    /**
     * Setup keyboard shortcuts
     */
    setupGlobalShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + A - Select all
            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && this.isActive) {
                e.preventDefault();
                this.selectAll();
            }

            // Escape - Exit bulk mode
            if (e.key === 'Escape' && this.isActive) {
                this.deactivate();
            }

            // Delete - Delete selected
            if (e.key === 'Delete' && this.selectedItems.size > 0) {
                this.executeOperation('delete');
            }
        });
    },

    /**
     * Activate bulk operations mode
     */
    activate(entityType) {
        this.isActive = true;
        this.entityType = entityType;
        this.selectedItems.clear();
        this.renderToolbar();
        this.attachCheckboxes();

        if (window.showNotification) {
            showNotification('Режим вибору активовано', 'info');
        }
    },

    /**
     * Deactivate bulk operations mode
     */
    deactivate() {
        this.isActive = false;
        this.selectedItems.clear();
        this.removeToolbar();
        this.removeCheckboxes();

        if (window.showNotification) {
            showNotification('Режим вибору вимкнено', 'info');
        }
    },

    /**
     * Toggle item selection
     */
    toggleSelection(itemId) {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            this.selectedItems.add(itemId);
        }

        this.updateUI();
    },

    /**
     * Select all items
     */
    selectAll() {
        const items = this.getAllItemsOnPage();
        items.forEach(itemId => this.selectedItems.add(itemId));
        this.updateUI();
    },

    /**
     * Deselect all items
     */
    deselectAll() {
        this.selectedItems.clear();
        this.updateUI();
    },

    /**
     * Get all items on current page
     */
    getAllItemsOnPage() {
        const items = [];
        document.querySelectorAll('[data-item-id]').forEach(el => {
            items.push(el.dataset.itemId);
        });
        return items;
    },

    /**
     * Render bulk operations toolbar
     */
    renderToolbar() {
        let toolbar = document.getElementById('bulk-operations-toolbar');

        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.id = 'bulk-operations-toolbar';
            toolbar.className = 'bulk-operations-toolbar';
            document.body.appendChild(toolbar);
        }

        const operations = this.operations[this.entityType] || [];

        toolbar.innerHTML = `
            <div class="bulk-toolbar-content">
                <div class="bulk-toolbar-info">
                    <button class="bulk-close-btn" onclick="BulkOperations.deactivate()">
                        <i class="fas fa-times"></i>
                    </button>
                    <span class="bulk-selected-count">
                        Вибрано: <strong id="selected-count">0</strong>
                    </span>
                    <button class="bulk-select-all-btn" onclick="BulkOperations.selectAll()">
                        <i class="fas fa-check-double"></i>
                        Вибрати все
                    </button>
                    <button class="bulk-deselect-all-btn" onclick="BulkOperations.deselectAll()">
                        <i class="fas fa-times-circle"></i>
                        Скасувати
                    </button>
                </div>

                <div class="bulk-toolbar-actions">
                    ${operations.map(op => `
                        <button class="bulk-action-btn ${op.danger ? 'danger' : ''}"
                                onclick="BulkOperations.executeOperation('${op.id}')"
                                ${this.selectedItems.size === 0 ? 'disabled' : ''}>
                            <i class="fas ${op.icon}"></i>
                            ${op.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        toolbar.classList.add('active');
    },

    /**
     * Remove toolbar
     */
    removeToolbar() {
        const toolbar = document.getElementById('bulk-operations-toolbar');
        if (toolbar) {
            toolbar.classList.remove('active');
            setTimeout(() => toolbar.remove(), 300);
        }
    },

    /**
     * Attach checkboxes to items
     */
    attachCheckboxes() {
        document.querySelectorAll('[data-item-id]').forEach(el => {
            if (el.querySelector('.bulk-checkbox')) return;

            const checkbox = document.createElement('div');
            checkbox.className = 'bulk-checkbox';
            checkbox.innerHTML = '<i class="fas fa-check"></i>';
            checkbox.onclick = (e) => {
                e.stopPropagation();
                this.toggleSelection(el.dataset.itemId);
            };

            el.style.position = 'relative';
            el.appendChild(checkbox);
        });
    },

    /**
     * Remove checkboxes
     */
    removeCheckboxes() {
        document.querySelectorAll('.bulk-checkbox').forEach(cb => cb.remove());
    },

    /**
     * Update UI based on selection
     */
    updateUI() {
        // Update count
        const countEl = document.getElementById('selected-count');
        if (countEl) {
            countEl.textContent = this.selectedItems.size;
        }

        // Update checkboxes
        document.querySelectorAll('[data-item-id]').forEach(el => {
            const checkbox = el.querySelector('.bulk-checkbox');
            if (!checkbox) return;

            if (this.selectedItems.has(el.dataset.itemId)) {
                checkbox.classList.add('checked');
                el.classList.add('bulk-selected');
            } else {
                checkbox.classList.remove('checked');
                el.classList.remove('bulk-selected');
            }
        });

        // Update action buttons state
        document.querySelectorAll('.bulk-action-btn').forEach(btn => {
            btn.disabled = this.selectedItems.size === 0;
        });
    },

    /**
     * Execute bulk operation
     */
    async executeOperation(operationId) {
        if (this.selectedItems.size === 0) {
            if (window.showNotification) {
                showNotification('Виберіть елементи для операції', 'warning');
            }
            return;
        }

        const operation = this.operations[this.entityType]?.find(op => op.id === operationId);
        if (!operation) {
            console.error('Operation not found:', operationId);
            return;
        }

        // Handle confirmation
        if (operation.requiresConfirmation) {
            if (!confirm(operation.confirmMessage)) {
                return;
            }
        }

        // Handle input requirement
        let inputValue = null;
        if (operation.requiresInput) {
            inputValue = await this.getOperationInput(operation);
            if (inputValue === null) return; // User cancelled
        }

        // Execute operation
        try {
            await this.performOperation(operationId, inputValue);

            if (window.showNotification) {
                showNotification(
                    `${operation.label} виконано для ${this.selectedItems.size} елементів`,
                    'success'
                );
            }

            this.deactivate();
        } catch (error) {
            console.error('Bulk operation failed:', error);
            if (window.showNotification) {
                showNotification('Помилка виконання операції', 'error');
            }
        }
    },

    /**
     * Get input for operation
     */
    async getOperationInput(operation) {
        return new Promise((resolve) => {
            const modal = this.createInputModal(operation);
            document.body.appendChild(modal);

            // Handle submit
            const submitBtn = modal.querySelector('.modal-submit-btn');
            submitBtn.onclick = () => {
                const value = this.getInputValue(operation, modal);
                modal.remove();
                resolve(value);
            };

            // Handle cancel
            const cancelBtn = modal.querySelector('.modal-cancel-btn');
            cancelBtn.onclick = () => {
                modal.remove();
                resolve(null);
            };
        });
    },

    /**
     * Create input modal
     */
    createInputModal(operation) {
        const modal = document.createElement('div');
        modal.className = 'bulk-operation-modal';

        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${operation.label}</h3>
                    <button class="modal-close-btn modal-cancel-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Застосувати до ${this.selectedItems.size} елементів</p>
                    ${this.renderOperationInput(operation)}
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-cancel-btn">Скасувати</button>
                    <button class="btn-primary modal-submit-btn">Застосувати</button>
                </div>
            </div>
        `;

        return modal;
    },

    /**
     * Render operation input
     */
    renderOperationInput(operation) {
        switch (operation.inputType) {
            case 'select':
                return `
                    <select class="operation-input" id="bulk-operation-input">
                        <option value="">Виберіть опцію</option>
                        ${operation.options.map(opt => `
                            <option value="${opt.value}">${opt.label}</option>
                        `).join('')}
                    </select>
                `;

            case 'tags':
                return `
                    <input type="text"
                           class="operation-input"
                           id="bulk-operation-input"
                           placeholder="Введіть теги через кому">
                `;

            case 'user-select':
                return `
                    <select class="operation-input" id="bulk-operation-input">
                        <option value="">Виберіть користувача</option>
                        <!-- Users will be loaded dynamically -->
                    </select>
                `;

            case 'export-format':
                return `
                    <select class="operation-input" id="bulk-operation-input">
                        ${operation.options.map(opt => `
                            <option value="${opt.value}">${opt.label}</option>
                        `).join('')}
                    </select>
                `;

            default:
                return '';
        }
    },

    /**
     * Get input value from modal
     */
    getInputValue(operation, modal) {
        const input = modal.querySelector('#bulk-operation-input');

        switch (operation.inputType) {
            case 'tags':
                return input.value.split(',').map(tag => tag.trim()).filter(tag => tag);

            default:
                return input.value;
        }
    },

    /**
     * Perform the actual operation
     */
    async performOperation(operationId, inputValue) {
        const itemIds = Array.from(this.selectedItems);

        switch (operationId) {
            case 'change-status':
                await this.bulkUpdateField('status', inputValue, itemIds);
                break;

            case 'change-risk':
                await this.bulkUpdateField('risk_level', inputValue, itemIds);
                break;

            case 'change-sector':
                await this.bulkUpdateField('sector', inputValue, itemIds);
                break;

            case 'add-tags':
                await this.bulkAddTags(inputValue, itemIds);
                break;

            case 'assign-user':
                await this.bulkUpdateField('assigned_to', inputValue, itemIds);
                break;

            case 'export':
                await this.bulkExport(inputValue, itemIds);
                break;

            case 'archive':
                await this.bulkArchive(itemIds);
                break;

            case 'delete':
                await this.bulkDelete(itemIds);
                break;

            default:
                throw new Error('Unknown operation: ' + operationId);
        }

        // Refresh the view
        this.refreshView();
    },

    /**
     * Bulk update field
     */
    async bulkUpdateField(field, value, itemIds) {
        const endpoint = `/${this.entityType}s/bulk-update`;

        await APIClient.post(endpoint, {
            ids: itemIds,
            updates: { [field]: value }
        });
    },

    /**
     * Bulk add tags
     */
    async bulkAddTags(tags, itemIds) {
        const endpoint = `/${this.entityType}s/bulk-add-tags`;

        await APIClient.post(endpoint, {
            ids: itemIds,
            tags: tags
        });
    },

    /**
     * Bulk export
     */
    async bulkExport(format, itemIds) {
        const endpoint = `/${this.entityType}s/export`;

        const response = await APIClient.post(endpoint, {
            ids: itemIds,
            format: format
        }, { responseType: 'blob' });

        // Download file
        const blob = new Blob([response.data], {
            type: this.getExportMimeType(format)
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${this.entityType}_${Date.now()}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Get export MIME type
     */
    getExportMimeType(format) {
        const types = {
            csv: 'text/csv',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            json: 'application/json',
            pdf: 'application/pdf'
        };
        return types[format] || 'application/octet-stream';
    },

    /**
     * Bulk archive
     */
    async bulkArchive(itemIds) {
        const endpoint = `/${this.entityType}s/bulk-archive`;

        await APIClient.post(endpoint, {
            ids: itemIds
        });
    },

    /**
     * Bulk delete
     */
    async bulkDelete(itemIds) {
        const endpoint = `/${this.entityType}s/bulk-delete`;

        await APIClient.post(endpoint, {
            ids: itemIds
        });
    },

    /**
     * Refresh the view
     */
    refreshView() {
        switch (this.entityType) {
            case 'prospect':
                if (window.ProspectsManager) {
                    ProspectsManager.loadProspects();
                }
                break;

            case 'client':
                if (window.TeamHub) {
                    TeamHub.loadClients();
                }
                break;

            case 'team':
                if (window.TeamManagement) {
                    TeamManagement.loadTeams();
                }
                break;
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BulkOperations.init());
} else {
    BulkOperations.init();
}

// Export for global access
window.BulkOperations = BulkOperations;
