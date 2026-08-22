/**
 * Structured Logging Configuration
 * Winston logger with comprehensive request/error logging
 */

const winston = require('winston');
const { config } = require('./config');

// ============================================================================
// LOGGER CONFIGURATION
// ============================================================================

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vps-bridge' },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: 'combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ============================================================================
// LOGGING HELPERS
// ============================================================================

/**
 * Log request start
 */
function logRequestStart(requestId, endpoint, organizationId, modelTag, useCase) {
  logger.info('Request started', {
    request_id: requestId,
    endpoint,
    organization_id: organizationId,
    model_tag: modelTag,
    use_case: useCase,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log request completion
 */
function logRequestComplete(requestId, endpoint, organizationId, latencyMs, status) {
  logger.info('Request completed', {
    request_id: requestId,
    endpoint,
    organization_id: organizationId,
    latency_ms: latencyMs,
    status,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log request error
 */
function logRequestError(requestId, endpoint, organizationId, error, errorCode) {
  logger.error('Request failed', {
    request_id: requestId,
    endpoint,
    organization_id: organizationId,
    error_code: errorCode,
    error_message: error.message,
    stack_trace: error.stack,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log validation warning
 */
function logValidationWarning(requestId, schemaType, errors) {
  logger.warn('Response validation failed', {
    request_id: requestId,
    schema_type: schemaType,
    validation_errors: errors,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  logger,
  logRequestStart,
  logRequestComplete,
  logRequestError,
  logValidationWarning
};
