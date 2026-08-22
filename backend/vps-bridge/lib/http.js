/**
 * HTTP Client Wrapper using native fetch
 * Zero dependencies - uses Node.js 18+ native fetch
 */

/**
 * Base request function with timeout and error handling
 * @param {string} method - HTTP method
 * @param {string} url - Full URL
 * @param {Object} options - Request options
 * @param {Object} options.body - Body to stringify as JSON
 * @param {Object} options.headers - Additional headers
 * @param {number} options.timeout - Timeout in ms (default: 10000)
 * @returns {Promise<any>} - Parsed JSON response
 */
async function request(method, url, { body, headers, timeout = 10000 } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    clearTimeout(id);

    if (!res.ok) {
      let errorBody = '';
      try {
        errorBody = await res.text();
      } catch {
        // Ignore text parsing errors
      }
      const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
      error.statusCode = res.status;
      error.responseBody = errorBody;
      throw error;
    }

    // Handle empty response (e.g., 204 No Content)
    if (res.status === 204) {
      return null;
    }

    // Read response as text first to handle empty or non-JSON responses
    const text = await res.text();
    
    // Return null for empty body
    if (!text || text.trim() === '') {
      return null;
    }
    
    // Try to parse as JSON, return raw text on parse failure
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * GET request
 */
async function get(url, { headers, timeout } = {}) {
  return request('GET', url, { headers, timeout });
}

/**
 * POST request
 */
async function post(url, body, { headers, timeout } = {}) {
  return request('POST', url, { body, headers, timeout });
}

/**
 * PUT request
 */
async function put(url, body, { headers, timeout } = {}) {
  return request('PUT', url, { body, headers, timeout });
}

/**
 * PATCH request
 */
async function patch(url, body, { headers, timeout } = {}) {
  return request('PATCH', url, { body, headers, timeout });
}

/**
 * DELETE request
 */
async function del(url, { headers, timeout } = {}) {
  return request('DELETE', url, { headers, timeout });
}

/**
 * POST request that returns raw Response object for streaming
 * @param {string} url - Full URL
 * @param {Object} body - Body to stringify as JSON
 * @param {Object} options - Additional options
 * @param {Object} options.headers - Additional headers
 * @param {number} options.timeout - Timeout in ms (default: 0 = no timeout for streams)
 * @returns {Promise<Response>} - Raw fetch Response object
 */
async function streamPost(url, body, { headers, timeout = 0 } = {}) {
  const controller = new AbortController();
  const id = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: timeout > 0 ? controller.signal : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (id) clearTimeout(id);

    if (!res.ok) {
      let errorBody = '';
      try {
        errorBody = await res.text();
      } catch {
        // Ignore text parsing errors
      }
      const error = new Error(`HTTP ${res.status}: ${res.statusText}`);
      error.statusCode = res.status;
      error.responseBody = errorBody;
      throw error;
    }

    return res;
  } catch (error) {
    if (id) clearTimeout(id);
    throw error;
  }
}

module.exports = {
  get,
  post,
  put,
  patch,
  del,
  streamPost,
};
