/* ============================================
   COMPREHENSIVE ERROR HANDLING & VALIDATION
   Robust error recovery, validation, user feedback
   ============================================ */

const ErrorHandler = {
  errors: [],
  maxErrors: 100,
  retryAttempts: new Map(),
  maxRetries: 3,

  // Initialize error handling
  init() {
    this.setupGlobalErrorHandlers();
    this.setupNetworkMonitoring();
    this.setupValidationRules();
  },

  setupGlobalErrorHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.logError({
        type: 'unhandled_promise',
        message: event.reason?.message || 'Unknown error',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });

      this.showErrorNotification(
        'Виникла неочікувана помилка',
        'Ми вже працюємо над її вирішенням'
      );
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.logError({
        type: 'global_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
    });
  },

  setupNetworkMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.showSuccessNotification('З\'єднання відновлено', 'Тепер ви знову онлайн');
      this.retryFailedRequests();
    });

    window.addEventListener('offline', () => {
      this.showWarningNotification(
        'Немає підключення до інтернету',
        'Деякі функції можуть бути недоступні'
      );
    });
  },

  setupValidationRules() {
    this.validationRules = {
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Введіть коректну email адресу'
      },
      phone: {
        pattern: /^\+?[\d\s\-\(\)]+$/,
        message: 'Введіть коректний номер телефону'
      },
      url: {
        pattern: /^https?:\/\/.+/,
        message: 'Введіть коректний URL (http:// або https://)'
      },
      required: {
        test: (value) => value && value.toString().trim().length > 0,
        message: 'Це поле обов\'язкове'
      },
      minLength: (min) => ({
        test: (value) => value && value.toString().length >= min,
        message: `Мінімальна довжина: ${min} символів`
      }),
      maxLength: (max) => ({
        test: (value) => !value || value.toString().length <= max,
        message: `Максимальна довжина: ${max} символів`
      }),
      min: (min) => ({
        test: (value) => !value || parseFloat(value) >= min,
        message: `Мінімальне значення: ${min}`
      }),
      max: (max) => ({
        test: (value) => !value || parseFloat(value) <= max,
        message: `Максимальне значення: ${max}`
      }),
      integer: {
        test: (value) => !value || Number.isInteger(parseFloat(value)),
        message: 'Введіть ціле число'
      },
      positive: {
        test: (value) => !value || parseFloat(value) > 0,
        message: 'Значення має бути додатнім'
      }
    };
  },

  // ============================================
  // ERROR LOGGING
  // ============================================

  logError(error) {
    this.errors.push(error);

    // Keep only last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Send to server in production
    if (window.location.hostname !== 'localhost') {
      this.sendErrorToServer(error);
    }
  },

  async sendErrorToServer(error) {
    try {
      await fetch('/api/v1/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          error,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to send error to server:', e);
    }
  },

  getErrors() {
    return [...this.errors];
  },

  clearErrors() {
    this.errors = [];
  },

  // ============================================
  // VALIDATION
  // ============================================

  validate(value, rules) {
    const errors = [];

    if (!Array.isArray(rules)) {
      rules = [rules];
    }

    for (const rule of rules) {
      let validator;

      if (typeof rule === 'string') {
        validator = this.validationRules[rule];
      } else if (typeof rule === 'function') {
        validator = { test: rule };
      } else {
        validator = rule;
      }

      if (!validator) {
        console.warn(`Unknown validation rule: ${rule}`);
        continue;
      }

      let isValid;
      if (validator.pattern) {
        isValid = validator.pattern.test(value);
      } else if (validator.test) {
        isValid = validator.test(value);
      } else {
        continue;
      }

      if (!isValid) {
        errors.push(validator.message || 'Validation failed');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return { valid: false, errors: ['Form not found'] };

    const errors = [];
    const fields = form.querySelectorAll('[data-validate]');

    fields.forEach(field => {
      const rules = field.dataset.validate.split(',').map(r => r.trim());
      const value = field.value;
      const label = field.dataset.label || field.name || 'Field';

      const result = this.validate(value, rules);

      if (!result.valid) {
        errors.push({
          field: field.name || field.id,
          label,
          errors: result.errors
        });

        this.showFieldError(field, result.errors[0]);
      } else {
        this.clearFieldError(field);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  },

  showFieldError(field, message) {
    field.classList.add('field-error');

    let errorElement = field.parentElement.querySelector('.field-error-message');
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'field-error-message';
      field.parentElement.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';
  },

  clearFieldError(field) {
    field.classList.remove('field-error');

    const errorElement = field.parentElement.querySelector('.field-error-message');
    if (errorElement) {
      errorElement.style.display = 'none';
    }
  },

  // ============================================
  // API ERROR HANDLING
  // ============================================

  async handleApiError(error, options = {}) {
    const {
      operation = 'operation',
      retry = true,
      showNotification = true
    } = options;

    let message = 'Виникла помилка';
    let details = '';
    let recoverable = true;

    // Parse error
    if (error.response) {
      // HTTP error
      const status = error.response.status;

      switch (status) {
        case 400:
          message = 'Невірні дані';
          details = 'Перевірте введені дані та спробуйте ще раз';
          recoverable = false;
          break;

        case 401:
          message = 'Не авторизовано';
          details = 'Будь ласка, увійдіть в систему';
          recoverable = false;
          this.redirectToLogin();
          break;

        case 403:
          message = 'Доступ заборонено';
          details = 'У вас немає прав для цієї операції';
          recoverable = false;
          break;

        case 404:
          message = 'Не знайдено';
          details = 'Запитуваний ресурс не існує';
          recoverable = false;
          break;

        case 409:
          message = 'Конфлікт даних';
          details = 'Цей запис вже існує або був змінений';
          recoverable = false;
          break;

        case 422:
          message = 'Помилка валідації';
          details = error.response.data?.message || 'Дані не пройшли перевірку';
          recoverable = false;
          break;

        case 429:
          message = 'Забагато запитів';
          details = 'Спробуйте пізніше';
          recoverable = true;
          break;

        case 500:
          message = 'Помилка сервера';
          details = 'Щось пішло не так на сервері';
          recoverable = true;
          break;

        case 503:
          message = 'Сервіс недоступний';
          details = 'Сервер тимчасово недоступний';
          recoverable = true;
          break;

        default:
          message = `Помилка ${status}`;
          details = error.response.data?.message || 'Спробуйте ще раз';
      }
    } else if (error.request) {
      // Network error
      message = 'Помилка з\'єднання';
      details = 'Перевірте підключення до інтернету';
      recoverable = true;
    } else {
      // Other error
      message = error.message || 'Невідома помилка';
      recoverable = false;
    }

    // Log error
    this.logError({
      type: 'api_error',
      operation,
      message,
      details,
      error: error.toString(),
      timestamp: new Date().toISOString()
    });

    // Show notification
    if (showNotification) {
      this.showErrorNotification(message, details);
    }

    // Retry if applicable
    if (retry && recoverable) {
      const shouldRetry = await this.shouldRetryOperation(operation);
      if (shouldRetry) {
        return { retry: true };
      }
    }

    return {
      retry: false,
      message,
      details,
      recoverable
    };
  },

  async shouldRetryOperation(operation) {
    const attempts = this.retryAttempts.get(operation) || 0;

    if (attempts >= this.maxRetries) {
      this.retryAttempts.delete(operation);
      return false;
    }

    this.retryAttempts.set(operation, attempts + 1);

    // Exponential backoff
    const delay = Math.pow(2, attempts) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    return true;
  },

  resetRetryAttempts(operation) {
    this.retryAttempts.delete(operation);
  },

  async retryFailedRequests() {
    // Implement queue of failed requests to retry
    // This would integrate with apiCall function
  },

  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  showErrorNotification(title, message) {
    this.showNotification({
      type: 'error',
      title,
      message,
      duration: 5000
    });
  },

  showWarningNotification(title, message) {
    this.showNotification({
      type: 'warning',
      title,
      message,
      duration: 4000
    });
  },

  showSuccessNotification(title, message) {
    this.showNotification({
      type: 'success',
      title,
      message,
      duration: 3000
    });
  },

  showInfoNotification(title, message) {
    this.showNotification({
      type: 'info',
      title,
      message,
      duration: 3000
    });
  },

  showNotification(options) {
    const {
      type = 'info',
      title,
      message,
      duration = 3000,
      action = null
    } = options;

    const id = `notification-${Date.now()}`;

    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;

    const icon = this.getNotificationIcon(type);

    notification.innerHTML = `
      <div class="notification-icon">
        <i class="${icon}"></i>
      </div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        ${message ? `<div class="notification-message">${message}</div>` : ''}
      </div>
      ${action ? `
        <button class="notification-action" onclick="${action.onclick}">
          ${action.label}
        </button>
      ` : ''}
      <button class="notification-close" onclick="ErrorHandler.closeNotification('${id}')">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Add to container
    let container = document.getElementById('notifications-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notifications-container';
      container.className = 'notifications-container';
      document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('notification-visible'), 10);

    // Auto-close
    if (duration > 0) {
      setTimeout(() => this.closeNotification(id), duration);
    }

    return id;
  },

  closeNotification(id) {
    const notification = document.getElementById(id);
    if (!notification) return;

    notification.classList.remove('notification-visible');
    setTimeout(() => notification.remove(), 300);
  },

  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'fas fa-check-circle';
      case 'error': return 'fas fa-exclamation-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'info': return 'fas fa-info-circle';
      default: return 'fas fa-info-circle';
    }
  },

  // ============================================
  // CONFIRMATION DIALOGS
  // ============================================

  async confirm(options) {
    const {
      title = 'Підтвердіть дію',
      message,
      confirmText = 'Підтвердити',
      cancelText = 'Скасувати',
      danger = false
    } = options;

    return new Promise((resolve) => {
      const id = `confirm-${Date.now()}`;

      const dialog = document.createElement('div');
      dialog.id = id;
      dialog.className = 'confirmation-dialog';

      dialog.innerHTML = `
        <div class="confirmation-backdrop"></div>
        <div class="confirmation-content ${danger ? 'confirmation-danger' : ''}">
          <div class="confirmation-header">
            <h3>${title}</h3>
          </div>
          <div class="confirmation-body">
            <p>${message}</p>
          </div>
          <div class="confirmation-footer">
            <button class="btn btn-secondary" id="${id}-cancel">
              ${cancelText}
            </button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="${id}-confirm">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      document.getElementById(`${id}-confirm`).onclick = () => {
        dialog.remove();
        resolve(true);
      };

      document.getElementById(`${id}-cancel`).onclick = () => {
        dialog.remove();
        resolve(false);
      };

      dialog.querySelector('.confirmation-backdrop').onclick = () => {
        dialog.remove();
        resolve(false);
      };
    });
  },

  // ============================================
  // RECOVERY ACTIONS
  // ============================================

  redirectToLogin() {
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 2000);
  },

  reloadPage() {
    window.location.reload();
  },

  // ============================================
  // DATA RECOVERY
  // ============================================

  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(`teampulse_${key}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      return false;
    }
  },

  loadFromLocalStorage(key, maxAge = 3600000) {
    try {
      const item = localStorage.getItem(`teampulse_${key}`);
      if (!item) return null;

      const { data, timestamp } = JSON.parse(item);
      const age = Date.now() - new Date(timestamp).getTime();

      if (age > maxAge) {
        localStorage.removeItem(`teampulse_${key}`);
        return null;
      }

      return data;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
  },

  clearLocalStorage(key) {
    try {
      localStorage.removeItem(`teampulse_${key}`);
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  }
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ErrorHandler.init());
} else {
  ErrorHandler.init();
}

// Expose globally
window.ErrorHandler = ErrorHandler;

// Export for use in apiCall
window.showNotification = (message, type = 'info') => {
  if (type === 'success') {
    ErrorHandler.showSuccessNotification(message);
  } else if (type === 'error') {
    ErrorHandler.showErrorNotification(message);
  } else if (type === 'warning') {
    ErrorHandler.showWarningNotification(message);
  } else {
    ErrorHandler.showInfoNotification(message);
  }
};
