/**
 * Middleware for VPS Bridge
 * Handles authentication, logging, and error handling
 * 
 * SECURITY NOTE:
 * - requireInternalToken is intentionally neutralized (no-op)
 * - Security is enforced via network isolation (localhost binding only)
 * - No API key authentication is performed on incoming requests
 */

const { v4: uuidv4 } = require('uuid');
const { logger, logRequestStart, logRequestComplete, logRequestError } = require('./logger');

// ============================================================================
// REQUEST ENRICHMENT MIDDLEWARE
// ============================================================================

/**
 * Enriches incoming requests with metadata
 * Attaches request_id and startTime to req object
 */
function enrichRequest(req, res, next) {
  const startTime = Date.now();
  
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = startTime;
  
  // Extract metadata from request body
  const organizationId = req.body?.organization_id;
  
  if (!organizationId) {
    const error = new Error('Missing required field: organization_id');
    error.statusCode = 400;
    error.errorCode = 'BAD_REQUEST';
    error.details = { field: 'organization_id', expected: 'string' };
    return next(error);
  }
  
  // Log request start
  logRequestStart(requestId, req.path, organizationId, 'openrouter', req.path);
  
  next();
}

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Logs request completion with latency and status
 */
function logRequest(req, res, next) {
  // Capture original res.json to intercept response
  const originalJson = res.json.bind(res);
  
  res.json = function(body) {
    const latencyMs = Date.now() - req.startTime;
    const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'error';
    
    logRequestComplete(
      req.requestId,
      req.path,
      req.body?.organization_id,
      latencyMs,
      status
    );
    
    return originalJson(body);
  };
  
  next();
}

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Centralized error handling middleware
 * Converts all errors to standardized Error_Envelope format
 */
function errorHandler(err, req, res, next) {
  const requestId = req.requestId || 'unknown';
  const endpoint = req.path || 'unknown';
  const organizationId = req.body?.organization_id || 'unknown';
  
  // Determine error category and construct error envelope
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Unexpected error. Please try again.';
  let details = err.details || null;
  
  // Log full error with stack trace
  logRequestError(requestId, endpoint, organizationId, err, errorCode);
  
  // Construct Error_Envelope
  const errorEnvelope = {
    error: true,
    code: errorCode,
    message: message,
    details: details
  };
  
  // Never include stack traces in client response
  res.status(statusCode).json(errorEnvelope);
}

// ============================================================================
// INTERNAL TOKEN AUTHENTICATION MIDDLEWARE (NEUTRALIZED)
// ============================================================================

/**
 * Validates internal token from x-internal-token header.
 * Public endpoints listed in PUBLIC_PATHS bypass the check.
 * 
 * NOTE: This middleware has been neutralized for internal-only service.
 * Security is now enforced via network isolation (127.0.0.1 binding).
 */
const PUBLIC_PATHS = new Set(['/health', '/deep-health']);

function requireInternalToken(internalToken) {
  return (req, res, next) => {
    // Neutralized - always allow access for internal-only service
    // Security is now enforced via network isolation (127.0.0.1 binding)
    return next();
  };
}

module.exports = {
  enrichRequest,
  logRequest,
  errorHandler,
  requireInternalToken
};