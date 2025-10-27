/**
 * ⚡ ULTRA ERROR HANDLER ⚡
 * Enterprise-grade error handling with retry logic, fallbacks, and monitoring
 * Built by world-class full-stack engineers
 */

import logger, { logError, logDetailedError } from './logger.js';

// Error types classification
export const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  DATABASE: 'DATABASE_ERROR',
  NETWORK: 'NETWORK_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHZ_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  INTERNAL: 'INTERNAL_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR'
};

// Custom error classes
export class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL, statusCode = 500, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, ErrorTypes.VALIDATION, 400);
    this.details = details;
  }
}

export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, ErrorTypes.DATABASE, 500);
    this.originalError = originalError;
  }
}

export class NetworkError extends AppError {
  constructor(message, originalError = null) {
    super(message, ErrorTypes.NETWORK, 503);
    this.originalError = originalError;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ErrorTypes.AUTHENTICATION, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, ErrorTypes.AUTHORIZATION, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, ErrorTypes.NOT_FOUND, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, ErrorTypes.RATE_LIMIT, 429);
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'Operation timed out') {
    super(message, ErrorTypes.TIMEOUT, 408);
  }
}

// Retry configuration
const RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorTypes.NETWORK,
    ErrorTypes.TIMEOUT,
    ErrorTypes.EXTERNAL_API
  ]
};

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, options = {}) {
  const config = { ...RetryConfig, ...options };
  let lastError;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt or error is not retryable
      if (attempt === config.maxRetries || !isRetryableError(error, config)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelay
      );

      logger.warn(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`, {
        error: error.message,
        type: error.type
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error, config) {
  if (error instanceof AppError) {
    return config.retryableErrors.includes(error.type);
  }

  // Network errors
  if (error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED') {
    return true;
  }

  // HTTP 5xx errors are retryable
  if (error.statusCode >= 500 && error.statusCode < 600) {
    return true;
  }

  return false;
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new AppError('Circuit breaker is OPEN', ErrorTypes.INTERNAL, 503);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        logger.info('Circuit breaker closed after successful recovery');
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.error('Circuit breaker opened due to repeated failures', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold
      });
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Async error boundary wrapper
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  // Log error
  if (err instanceof AppError && err.isOperational) {
    logger.warn('Operational error', {
      type: err.type,
      message: err.message,
      statusCode: err.statusCode,
      path: req.path,
      method: req.method
    });
  } else {
    logDetailedError('Unexpected error', err, {
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      user: req.user?.username
    });
  }

  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';

  let statusCode = 500;
  let response = {
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  };

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response = {
      success: false,
      error: err.message,
      type: err.type,
      timestamp: err.timestamp,
      ...(err.details && { details: err.details })
    };
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    response = {
      success: false,
      error: 'Validation failed',
      type: ErrorTypes.VALIDATION,
      details: err.errors || err.message,
      timestamp: new Date().toISOString()
    };
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    response = {
      success: false,
      error: 'Resource already exists',
      type: ErrorTypes.DATABASE,
      timestamp: new Date().toISOString()
    };
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    response = {
      success: false,
      error: 'Referenced resource does not exist',
      type: ErrorTypes.DATABASE,
      timestamp: new Date().toISOString()
    };
  }

  // Add stack trace in development
  if (!isProduction && err.stack) {
    response.stack = err.stack.split('\n').slice(0, 10);
  }

  // Add request ID for debugging
  if (req.id) {
    response.requestId = req.id;
  }

  res.status(statusCode).json(response);
}

/**
 * Not found handler
 */
export function notFoundHandler(req, res, next) {
  const error = new NotFoundError('Endpoint');
  error.path = req.path;
  next(error);
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(server, db) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Set timeout for forced shutdown
    const forceShutdownTimeout = setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000); // 30 seconds

    try {
      // Close database connections
      if (db && db.close) {
        await db.close();
        logger.info('Database connections closed');
      }

      clearTimeout(forceShutdownTimeout);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error);
      clearTimeout(forceShutdownTimeout);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', { promise, reason });
  });
}

/**
 * Health check with dependencies
 */
export async function healthCheck(dependencies = {}) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  // Check each dependency
  for (const [name, checkFn] of Object.entries(dependencies)) {
    try {
      const result = await Promise.race([
        checkFn(),
        timeout(5000, `${name} health check timed out`)
      ]);

      health.checks[name] = {
        status: 'healthy',
        ...result
      };
    } catch (error) {
      health.checks[name] = {
        status: 'unhealthy',
        error: error.message
      };
      health.status = 'degraded';
    }
  }

  return health;
}

// Helper functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function timeout(ms, message) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError(message)), ms);
  });
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch (error) {
    logger.warn('JSON parse failed', { error: error.message });
    return fallback;
  }
}

/**
 * Rate limit check helper
 */
export function checkRateLimit(key, limit, window) {
  // Implementation would use Redis or in-memory store
  // This is a placeholder
  return {
    allowed: true,
    remaining: limit,
    resetTime: Date.now() + window
  };
}

export default {
  ErrorTypes,
  AppError,
  ValidationError,
  DatabaseError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  retryWithBackoff,
  CircuitBreaker,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  setupGracefulShutdown,
  healthCheck,
  safeJsonParse,
  checkRateLimit
};
