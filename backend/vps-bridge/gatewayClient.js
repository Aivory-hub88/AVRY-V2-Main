/**
 * Internal n8n Gateway Client
 * Routes plain chat requests to internal gateway instead of OpenRouter
 */

const { post } = require('./lib/http');
const { logger } = require('./logger');

const { N8N_WEBHOOK_BASE } = require('./n8nClient');

// Gateway configuration — uses the same n8n base as the rest of the Bridge
const GATEWAY_CONFIG = {
  url: `${N8N_WEBHOOK_BASE}/webhook/755fcac8-dc36-49e3-9553-67e62bac82e8`,
  timeout: 60000 // 60 seconds
};

/**
 * Send a plain text message to the internal gateway
 * @param {string} message - User message
 * @param {string} requestId - Request ID for logging
 * @returns {Promise<string>} - AI response text
 */
async function sendToGateway(message, requestId) {
  try {
    logger.debug('Sending request to internal gateway', { 
      request_id: requestId,
      gateway_url: GATEWAY_CONFIG.url,
      message_length: message.length
    });
    
    const response = await post(
      GATEWAY_CONFIG.url,
      { message },
      {
        timeout: GATEWAY_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.debug('Received response from gateway', { 
      request_id: requestId,
      status: response.status,
      model: response?.model
    });
    
    // Extract response from gateway format
    if (!response || !response.response) {
      const err = new Error('Invalid response from gateway: missing response field');
      err.statusCode = 502;
      err.errorCode = 'GATEWAY_INVALID_RESPONSE';
      throw err;
    }
    
    return response.response;
    
  } catch (error) {
    logger.error('Gateway request failed', { 
      request_id: requestId,
      error: error.message,
      code: error.code,
      status: error.statusCode
    });
    
    // Map gateway errors to standard error format
    if (error.statusCode && error.errorCode) {
      throw error;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
      const err = new Error('Internal gateway temporarily unavailable. Please try again.');
      err.statusCode = 503;
      err.errorCode = 'GATEWAY_UNAVAILABLE';
      throw err;
    }
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      const err = new Error('Gateway request timed out. Please try again.');
      err.statusCode = 504;
      err.errorCode = 'GATEWAY_TIMEOUT';
      throw err;
    }
    
    if (error.statusCode && error.statusCode >= 500) {
      const err = new Error('Internal gateway error. Please try again.');
      err.statusCode = 502;
      err.errorCode = 'GATEWAY_ERROR';
      throw err;
    }
    
    // Generic error
    const err = new Error('Failed to process request through gateway.');
    err.statusCode = 500;
    err.errorCode = 'INTERNAL_SERVER_ERROR';
    throw err;
  }
}

/**
 * Health check for gateway availability
 * @returns {Promise<boolean>}
 */
async function gatewayHealthCheck() {
  try {
    const response = await post(
      GATEWAY_CONFIG.url,
      { message: 'health check' },
      { timeout: 5000 }
    );
    return response.status === 200;
  } catch (error) {
    logger.warn('Gateway health check failed', { error: error.message });
    return false;
  }
}

module.exports = {
  sendToGateway,
  gatewayHealthCheck,
  GATEWAY_CONFIG
};
