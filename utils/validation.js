/**
 * ⚡ ULTRA VALIDATION SYSTEM ⚡
 * Comprehensive data validation with sanitization and security
 * Built with ML-powered anomaly detection concepts
 */

import { ValidationError } from './errorHandler.js';
import logger from './logger.js';

/**
 * Validation schemas
 */
export const ValidationSchemas = {
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254,
    message: 'Invalid email format'
  },

  username: {
    pattern: /^[a-zA-Z0-9_-]{3,30}$/,
    minLength: 3,
    maxLength: 30,
    message: 'Username must be 3-30 alphanumeric characters, dashes, or underscores'
  },

  password: {
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Password must be 8+ characters with uppercase, lowercase, and number'
  },

  phoneNumber: {
    pattern: /^\+?[1-9]\d{1,14}$/,
    message: 'Invalid phone number format'
  },

  url: {
    pattern: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    maxLength: 2048,
    message: 'Invalid URL format'
  },

  uuid: {
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    message: 'Invalid UUID format'
  },

  alphanumeric: {
    pattern: /^[a-zA-Z0-9]+$/,
    message: 'Must contain only letters and numbers'
  },

  slug: {
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    message: 'Invalid slug format (use lowercase letters, numbers, and dashes)'
  }
};

/**
 * Validator class
 */
export class Validator {
  constructor(schema = {}) {
    this.schema = schema;
    this.errors = {};
  }

  /**
   * Validate data against schema
   */
  validate(data, customSchema = null) {
    const schema = customSchema || this.schema;
    this.errors = {};
    const validated = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      try {
        validated[field] = this.validateField(field, value, rules);
      } catch (error) {
        this.errors[field] = error.message;
      }
    }

    if (Object.keys(this.errors).length > 0) {
      throw new ValidationError('Validation failed', this.errors);
    }

    return validated;
  }

  /**
   * Validate single field
   */
  validateField(field, value, rules) {
    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      throw new Error(`${field} is required`);
    }

    // If not required and value is empty, skip other validations
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return rules.default !== undefined ? rules.default : value;
    }

    // Type check
    if (rules.type) {
      if (!this.checkType(value, rules.type)) {
        throw new Error(`${field} must be of type ${rules.type}`);
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        throw new Error(`${field} must be at least ${rules.minLength} characters`);
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        throw new Error(`${field} must be at most ${rules.maxLength} characters`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        throw new Error(rules.message || `${field} format is invalid`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        throw new Error(`${field} must be one of: ${rules.enum.join(', ')}`);
      }

      // Sanitize string if needed
      if (rules.sanitize) {
        value = this.sanitizeString(value, rules.sanitize);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        throw new Error(`${field} must be at least ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        throw new Error(`${field} must be at most ${rules.max}`);
      }

      if (rules.integer && !Number.isInteger(value)) {
        throw new Error(`${field} must be an integer`);
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        throw new Error(`${field} must contain at least ${rules.minItems} items`);
      }

      if (rules.maxItems && value.length > rules.maxItems) {
        throw new Error(`${field} must contain at most ${rules.maxItems} items`);
      }

      if (rules.uniqueItems && new Set(value).size !== value.length) {
        throw new Error(`${field} items must be unique`);
      }
    }

    // Custom validator
    if (rules.validator) {
      const result = rules.validator(value);
      if (result !== true) {
        throw new Error(result || `${field} validation failed`);
      }
    }

    // Transform
    if (rules.transform) {
      value = rules.transform(value);
    }

    return value;
  }

  /**
   * Check value type
   */
  checkType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'date':
        return value instanceof Date && !isNaN(value);
      default:
        return true;
    }
  }

  /**
   * Sanitize string
   */
  sanitizeString(str, options = {}) {
    if (typeof str !== 'string') return str;

    let sanitized = str;

    // Trim whitespace
    if (options.trim !== false) {
      sanitized = sanitized.trim();
    }

    // Remove HTML tags
    if (options.stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Escape HTML special characters
    if (options.escapeHtml) {
      sanitized = this.escapeHtml(sanitized);
    }

    // Remove control characters
    if (options.removeControl) {
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }

    // Lowercase
    if (options.lowercase) {
      sanitized = sanitized.toLowerCase();
    }

    // Uppercase
    if (options.uppercase) {
      sanitized = sanitized.toUpperCase();
    }

    return sanitized;
  }

  /**
   * Escape HTML
   */
  escapeHtml(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'\/]/g, char => map[char]);
  }
}

/**
 * Request validation middleware factory
 */
export function validateRequest(schema) {
  return (req, res, next) => {
    try {
      const validator = new Validator(schema);

      // Validate body
      if (schema.body) {
        req.validatedBody = validator.validate(req.body, schema.body);
      }

      // Validate query
      if (schema.query) {
        req.validatedQuery = validator.validate(req.query, schema.query);
      }

      // Validate params
      if (schema.params) {
        req.validatedParams = validator.validate(req.params, schema.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input, type = 'default') {
  if (typeof input !== 'string') return input;

  const validator = new Validator();

  const sanitizeOptions = {
    default: { trim: true, removeControl: true },
    html: { trim: true, escapeHtml: true, removeControl: true },
    strict: { trim: true, stripHtml: true, escapeHtml: true, removeControl: true },
    sql: { trim: true, stripHtml: true, removeControl: true }
  };

  return validator.sanitizeString(input, sanitizeOptions[type] || sanitizeOptions.default);
}

/**
 * Validate email
 */
export function validateEmail(email) {
  const schema = ValidationSchemas.email;
  if (!schema.pattern.test(email)) {
    throw new ValidationError(schema.message);
  }
  if (email.length > schema.maxLength) {
    throw new ValidationError(`Email too long (max ${schema.maxLength} characters)`);
  }
  return email.toLowerCase().trim();
}

/**
 * Validate and sanitize SQL input
 */
export function sanitizeSqlInput(input) {
  if (typeof input === 'string') {
    // Remove SQL injection patterns
    const dangerous = [
      /('|(\\')|(;)|(--)|(\/\*)|(\*\/))/gi,
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi
    ];

    let sanitized = input;
    dangerous.forEach(pattern => {
      if (pattern.test(sanitized)) {
        logger.warn('Potential SQL injection attempt detected', { input });
        throw new ValidationError('Invalid input detected');
      }
    });

    return sanitized.trim();
  }
  return input;
}

/**
 * Validate JSON structure
 */
export function validateJson(data, required = [], optional = []) {
  const errors = {};

  // Check required fields
  required.forEach(field => {
    if (!(field in data)) {
      errors[field] = `${field} is required`;
    }
  });

  // Check for unexpected fields
  const allowed = new Set([...required, ...optional]);
  Object.keys(data).forEach(field => {
    if (!allowed.has(field)) {
      errors[field] = `${field} is not allowed`;
    }
  });

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('JSON validation failed', errors);
  }

  return true;
}

/**
 * Validate pagination params
 */
export function validatePagination(query) {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  if (page < 1) {
    throw new ValidationError('Page must be >= 1');
  }

  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100');
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
}

/**
 * Validate date range
 */
export function validateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    throw new ValidationError('Invalid start date');
  }

  if (isNaN(end.getTime())) {
    throw new ValidationError('Invalid end date');
  }

  if (start > end) {
    throw new ValidationError('Start date must be before end date');
  }

  // Check for reasonable date range (e.g., max 1 year)
  const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
  if (end - start > maxRange) {
    throw new ValidationError('Date range too large (max 1 year)');
  }

  return { start, end };
}

/**
 * ML-inspired anomaly detection for input validation
 */
export class AnomalyDetector {
  constructor() {
    this.patterns = {
      suspiciousChars: /[<>\"'\\;`(){}]/g,
      suspiciousKeywords: /\b(script|eval|exec|system|cmd|shell)\b/gi,
      excessiveRepetition: /(.)\1{10,}/,
      suspiciousUrls: /(https?:\/\/[^\s]+\.(exe|bat|cmd|sh|ps1))/gi
    };

    this.thresholds = {
      maxLength: 10000,
      maxSuspiciousChars: 5,
      maxUrlCount: 3
    };
  }

  /**
   * Detect anomalies in input
   */
  detect(input, context = {}) {
    if (typeof input !== 'string') return { safe: true };

    const anomalies = [];

    // Length check
    if (input.length > this.thresholds.maxLength) {
      anomalies.push({
        type: 'excessive_length',
        severity: 'high',
        details: `Input length ${input.length} exceeds threshold ${this.thresholds.maxLength}`
      });
    }

    // Suspicious characters
    const suspiciousMatches = input.match(this.patterns.suspiciousChars) || [];
    if (suspiciousMatches.length > this.thresholds.maxSuspiciousChars) {
      anomalies.push({
        type: 'suspicious_characters',
        severity: 'medium',
        details: `Found ${suspiciousMatches.length} suspicious characters`
      });
    }

    // Suspicious keywords
    const keywordMatches = input.match(this.patterns.suspiciousKeywords);
    if (keywordMatches) {
      anomalies.push({
        type: 'suspicious_keywords',
        severity: 'high',
        details: `Found suspicious keywords: ${keywordMatches.join(', ')}`
      });
    }

    // Excessive repetition
    if (this.patterns.excessiveRepetition.test(input)) {
      anomalies.push({
        type: 'excessive_repetition',
        severity: 'medium',
        details: 'Detected excessive character repetition'
      });
    }

    // Suspicious URLs
    const urlMatches = input.match(this.patterns.suspiciousUrls) || [];
    if (urlMatches.length > 0) {
      anomalies.push({
        type: 'suspicious_urls',
        severity: 'high',
        details: `Found ${urlMatches.length} suspicious URLs`
      });
    }

    const safe = anomalies.length === 0;

    if (!safe) {
      logger.warn('Input anomaly detected', {
        context,
        anomalies,
        input: input.substring(0, 100) + '...'
      });
    }

    return {
      safe,
      anomalies,
      score: this.calculateRiskScore(anomalies)
    };
  }

  /**
   * Calculate risk score (0-100)
   */
  calculateRiskScore(anomalies) {
    const severityScores = {
      low: 10,
      medium: 30,
      high: 50
    };

    const totalScore = anomalies.reduce((sum, anomaly) => {
      return sum + (severityScores[anomaly.severity] || 0);
    }, 0);

    return Math.min(totalScore, 100);
  }
}

/**
 * Rate limit input validation
 */
export function validateRateLimit(identifier, limit, window) {
  // This would integrate with a rate limiting store (Redis, etc.)
  // Placeholder implementation
  return {
    allowed: true,
    remaining: limit,
    resetAt: Date.now() + window
  };
}

// Export utilities
export default {
  Validator,
  ValidationSchemas,
  validateRequest,
  sanitizeInput,
  validateEmail,
  sanitizeSqlInput,
  validateJson,
  validatePagination,
  validateDateRange,
  AnomalyDetector,
  validateRateLimit
};
