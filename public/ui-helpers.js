/**
 * UI Helper Functions
 * Global utilities for notifications, toasts, modals, etc.
 */

// ============================================
// TOAST NOTIFICATIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    document.querySelectorAll('.toast-notification').forEach(toast => {
        toast.remove();
    });

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show notification (alias for showToast)
 */
function showNotification(message, type = 'info', duration = 3000) {
    showToast(message, type, duration);
}

// ============================================
// MODAL MANAGEMENT
// ============================================

/**
 * Show modal by ID
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal not found: ${modalId}`);
        return;
    }

    modal.style.display = 'flex';
    modal.classList.add('active');

    // Focus first input
    setTimeout(() => {
        const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);

    // Close on overlay click
    const overlay = modal.querySelector('.modal-overlay');
    if (overlay) {
        overlay.onclick = () => hideModal(modalId);
    }

    // Close on Escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            hideModal(modalId);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

/**
 * Hide modal by ID
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

/**
 * Close all modals
 */
function closeAllModals() {
    document.querySelectorAll('.modal.active, [class*="modal"].active').forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
}

// ============================================
// CONFIRMATION DIALOGS
// ============================================

/**
 * Show confirmation dialog
 */
function showConfirmDialog(message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';
    dialog.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-question-circle"></i> Підтвердження</h3>
            </div>
            <div class="modal-body">
                <p>${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary cancel-btn">Скасувати</button>
                <button class="btn-primary confirm-btn">Підтвердити</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    const confirmBtn = dialog.querySelector('.confirm-btn');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const overlay = dialog.querySelector('.modal-overlay');

    const cleanup = () => {
        dialog.remove();
    };

    confirmBtn.onclick = () => {
        if (onConfirm) onConfirm();
        cleanup();
    };

    cancelBtn.onclick = () => {
        if (onCancel) onCancel();
        cleanup();
    };

    overlay.onclick = () => {
        if (onCancel) onCancel();
        cleanup();
    };

    // Handle Escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            if (onCancel) onCancel();
            cleanup();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

/**
 * Show simple confirm (returns promise)
 */
function confirm(message) {
    return new Promise((resolve) => {
        showConfirmDialog(message, () => resolve(true), () => resolve(false));
    });
}

// ============================================
// LOADING INDICATORS
// ============================================

let loadingOverlay = null;

/**
 * Show loading overlay
 */
function showLoading(message = 'Завантаження...') {
    if (loadingOverlay) {
        hideLoading();
    }

    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;

    document.body.appendChild(loadingOverlay);
    setTimeout(() => loadingOverlay.classList.add('active'), 10);
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
        setTimeout(() => {
            loadingOverlay?.remove();
            loadingOverlay = null;
        }, 300);
    }
}

/**
 * Show loading on button
 */
function setButtonLoading(button, loading = true) {
    if (loading) {
        button.dataset.originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Завантаження...';
    } else {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        delete button.dataset.originalText;
    }
}

// ============================================
// FORM HELPERS
// ============================================

/**
 * Get form data as object
 */
function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error(`Form not found: ${formId}`);
        return null;
    }

    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        // Handle multiple values (checkboxes, multi-select)
        if (data[key]) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]];
            }
            data[key].push(value);
        } else {
            data[key] = value;
        }
    }

    return data;
}

/**
 * Reset form
 */
function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        // Clear any validation errors
        form.querySelectorAll('.error-message').forEach(error => {
            error.textContent = '';
            error.style.display = 'none';
        });
    }
}

/**
 * Show form validation error
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Find or create error message element
    let errorEl = field.parentElement.querySelector('.error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        field.parentElement.appendChild(errorEl);
    }

    errorEl.textContent = message;
    errorEl.style.display = 'block';
    field.classList.add('error');
}

/**
 * Clear field error
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const errorEl = field.parentElement.querySelector('.error-message');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    field.classList.remove('error');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format date for display
 */
function formatDate(dateString, format = 'long') {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (format === 'relative') {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'щойно';
        if (diffMins < 60) return `${diffMins} хв тому`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} год тому`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} дн тому`;
    }

    if (format === 'short') {
        return date.toLocaleDateString('uk-UA');
    }

    return date.toLocaleString('uk-UA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Copy to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Скопійовано в буфер обміну', 'success');
        return true;
    } catch (error) {
        console.error('Failed to copy:', error);
        showToast('Помилка копіювання', 'error');
        return false;
    }
}

/**
 * Download data as file
 */
function downloadFile(data, filename, type = 'text/plain') {
    const blob = new Blob([data], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate email
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate URL
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// ============================================
// EXPORT GLOBALLY
// ============================================

window.showToast = showToast;
window.showNotification = showNotification;
window.showModal = showModal;
window.hideModal = hideModal;
window.closeAllModals = closeAllModals;
window.showConfirmDialog = showConfirmDialog;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.setButtonLoading = setButtonLoading;
window.getFormData = getFormData;
window.resetForm = resetForm;
window.showFieldError = showFieldError;
window.clearFieldError = clearFieldError;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.debounce = debounce;
window.throttle = throttle;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.formatFileSize = formatFileSize;
window.isValidEmail = isValidEmail;
window.isValidUrl = isValidUrl;

console.log('✅ UI Helpers loaded');
