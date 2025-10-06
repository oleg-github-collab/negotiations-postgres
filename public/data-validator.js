/* ============================================
   DATA VALIDATOR & SANITIZER
   Comprehensive validation before API calls
   ============================================ */

const DataValidator = {
  schemas: {},

  // ============================================
  // SCHEMA DEFINITIONS
  // ============================================

  init() {
    this.defineSchemas();
    console.log('✅ Data Validator initialized with', Object.keys(this.schemas).length, 'schemas');
  },

  defineSchemas() {
    // Prospect schema
    this.schemas.prospect = {
      company: { type: 'string', required: true, minLength: 1, maxLength: 255 },
      negotiator: { type: 'string', required: false, maxLength: 255 },
      sector: { type: 'string', required: false, maxLength: 100 },
      status: { type: 'string', required: false, enum: ['new', 'qualifying', 'promising', 'negotiation', 'risky', 'converted'] },
      risk_level: { type: 'string', required: false, enum: ['low', 'medium', 'high', 'critical'] },
      notes: { type: 'object', required: false }
    };

    // Client schema
    this.schemas.client = {
      company: { type: 'string', required: true, minLength: 1, maxLength: 255 },
      negotiator: { type: 'string', required: false, maxLength: 255 },
      sector: { type: 'string', required: false, maxLength: 100 },
      client_type: { type: 'string', required: false, enum: ['prospect', 'active', 'teamhub'] },
      status: { type: 'string', required: false, enum: ['active', 'inactive', 'pending'] },
      weekly_hours: { type: 'number', required: false, min: 0, max: 168 },
      notes: { type: 'object', required: false }
    };

    // Team schema
    this.schemas.team = {
      title: { type: 'string', required: true, minLength: 1, maxLength: 255 },
      description: { type: 'string', required: false, maxLength: 5000 },
      client_id: { type: 'number', required: true, min: 1 },
      status: { type: 'string', required: false, enum: ['active', 'planning', 'on-hold', 'completed'] },
      members: {
        type: 'array',
        required: false,
        items: {
          name: { type: 'string', required: true, minLength: 1, maxLength: 255 },
          role: { type: 'string', required: false, maxLength: 100 },
          email: { type: 'email', required: false },
          responsibility: { type: 'string', required: false, enum: ['responsible', 'accountable', 'consulted', 'informed'] }
        }
      },
      notes: { type: 'object', required: false }
    };

    // Analysis schema
    this.schemas.analysis = {
      client_id: { type: 'number', required: true, min: 1 },
      title: { type: 'string', required: true, minLength: 1, maxLength: 255 },
      transcript: { type: 'string', required: false, maxLength: 100000 },
      barometer: { type: 'object', required: false },
      notes: { type: 'object', required: false }
    };

    // User schema
    this.schemas.user = {
      username: { type: 'string', required: true, minLength: 3, maxLength: 50, pattern: /^[a-zA-Z0-9_-]+$/ },
      password: { type: 'string', required: true, minLength: 6, maxLength: 100 },
      email: { type: 'email', required: false }
    };
  },

  // ============================================
  // VALIDATION
  // ============================================

  validate(data, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      console.warn(`Schema "${schemaName}" not found`);
      return { valid: true, errors: [] };
    }

    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, rules);

      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  validateField(field, value, rules) {
    const errors = [];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        rule: 'required',
        message: `Поле "${field}" обов'язкове`
      });
      return errors; // Stop further validation if required field is missing
    }

    // Skip validation if value is not provided and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return errors;
    }

    // Type check
    if (rules.type) {
      const typeError = this.validateType(field, value, rules.type);
      if (typeError) errors.push(typeError);
    }

    // Email check
    if (rules.type === 'email') {
      const emailError = this.validateEmail(field, value);
      if (emailError) errors.push(emailError);
    }

    // Min/Max length for strings
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push({
          field,
          rule: 'minLength',
          message: `Поле "${field}" має бути не менше ${rules.minLength} символів`
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push({
          field,
          rule: 'maxLength',
          message: `Поле "${field}" має бути не більше ${rules.maxLength} символів`
        });
      }
    }

    // Min/Max for numbers
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          field,
          rule: 'min',
          message: `Поле "${field}" має бути не менше ${rules.min}`
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          field,
          rule: 'max',
          message: `Поле "${field}" має бути не більше ${rules.max}`
        });
      }
    }

    // Enum check
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field,
        rule: 'enum',
        message: `Поле "${field}" має бути одним з: ${rules.enum.join(', ')}`
      });
    }

    // Pattern check
    if (rules.pattern && typeof value === 'string') {
      if (!rules.pattern.test(value)) {
        errors.push({
          field,
          rule: 'pattern',
          message: `Поле "${field}" має неправильний формат`
        });
      }
    }

    // Array validation
    if (rules.type === 'array' && Array.isArray(value)) {
      if (rules.items) {
        value.forEach((item, index) => {
          for (const [itemField, itemRules] of Object.entries(rules.items)) {
            const itemValue = item[itemField];
            const itemErrors = this.validateField(`${field}[${index}].${itemField}`, itemValue, itemRules);
            errors.push(...itemErrors);
          }
        });
      }
    }

    return errors;
  },

  validateType(field, value, expectedType) {
    let actualType = typeof value;

    if (Array.isArray(value)) {
      actualType = 'array';
    } else if (value === null) {
      actualType = 'null';
    }

    if (actualType !== expectedType) {
      return {
        field,
        rule: 'type',
        message: `Поле "${field}" має бути типу ${expectedType}, отримано ${actualType}`
      };
    }

    return null;
  },

  validateEmail(field, value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        field,
        rule: 'email',
        message: `Поле "${field}" має містити правильну email адресу`
      };
    }
    return null;
  },

  // ============================================
  // SANITIZATION
  // ============================================

  sanitize(data, schemaName) {
    const schema = this.schemas[schemaName];
    if (!schema) {
      return data;
    }

    const sanitized = {};

    for (const [field, rules] of Object.entries(schema)) {
      let value = data[field];

      // Skip if undefined
      if (value === undefined) {
        continue;
      }

      // Sanitize based on type
      if (rules.type === 'string' && typeof value === 'string') {
        value = this.sanitizeString(value, rules);
      } else if (rules.type === 'number') {
        value = this.sanitizeNumber(value);
      } else if (rules.type === 'array' && Array.isArray(value)) {
        if (rules.items) {
          value = value.map(item => {
            const sanitizedItem = {};
            for (const [itemField, itemRules] of Object.entries(rules.items)) {
              if (item[itemField] !== undefined) {
                if (itemRules.type === 'string') {
                  sanitizedItem[itemField] = this.sanitizeString(item[itemField], itemRules);
                } else {
                  sanitizedItem[itemField] = item[itemField];
                }
              }
            }
            return sanitizedItem;
          });
        }
      }

      sanitized[field] = value;
    }

    // Include non-schema fields (like notes, metadata)
    for (const [key, value] of Object.entries(data)) {
      if (!(key in sanitized)) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  },

  sanitizeString(value, rules) {
    if (typeof value !== 'string') {
      value = String(value);
    }

    // Trim whitespace
    value = value.trim();

    // Remove null bytes
    value = value.replace(/\0/g, '');

    // Enforce max length
    if (rules.maxLength && value.length > rules.maxLength) {
      value = value.substring(0, rules.maxLength);
    }

    // Remove potentially dangerous characters for SQL/HTML
    // (Frontend sanitization, backend should also sanitize)
    if (rules.sanitize !== false) {
      // Remove control characters except newlines and tabs
      value = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    }

    return value;
  },

  sanitizeNumber(value) {
    if (typeof value === 'string') {
      value = parseFloat(value);
    }

    if (isNaN(value)) {
      return undefined;
    }

    return value;
  },

  // ============================================
  // HELPERS
  // ============================================

  validateAndSanitize(data, schemaName) {
    // First sanitize
    const sanitized = this.sanitize(data, schemaName);

    // Then validate
    const validation = this.validate(sanitized, schemaName);

    return {
      ...validation,
      data: sanitized
    };
  },

  getSchema(schemaName) {
    return this.schemas[schemaName];
  },

  addSchema(name, schema) {
    this.schemas[name] = schema;
  },

  // Display validation errors to user
  displayErrors(errors, formId) {
    if (!formId) return;

    // Clear previous errors
    document.querySelectorAll(`#${formId} .field-error-message`).forEach(el => {
      el.remove();
    });

    document.querySelectorAll(`#${formId} .field-error`).forEach(el => {
      el.classList.remove('field-error');
    });

    // Show new errors
    errors.forEach(error => {
      // Try to find field by various selectors
      const field = document.querySelector(`#${formId} [name="${error.field}"]`) ||
                   document.querySelector(`#${formId} #${error.field}`);

      if (field) {
        field.classList.add('field-error');

        const errorMsg = document.createElement('div');
        errorMsg.className = 'field-error-message';
        errorMsg.textContent = error.message;

        field.parentElement.appendChild(errorMsg);
      }
    });

    // Show summary notification
    if (errors.length > 0 && window.ErrorHandler) {
      ErrorHandler.showErrorNotification(
        'Помилка валідації',
        `Знайдено ${errors.length} ${this.pluralize(errors.length, 'помилка', 'помилки', 'помилок')}`
      );
    }
  },

  pluralize(count, one, few, many) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => DataValidator.init());
} else {
  DataValidator.init();
}

// Expose globally
window.DataValidator = DataValidator;

console.log('✅ Data Validator loaded successfully');
