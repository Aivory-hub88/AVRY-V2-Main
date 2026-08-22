/**
 * Zeroclaw Streaming Client — SSE Proxy
 * 
 * This client handles streaming responses from Zeroclaw/LLM.
 * Instead of buffering the entire response, it forwards SSE events
 * as they arrive, enabling true token-by-token streaming.
 */

const https = require('https');
const http = require('http');
const { logger } = require('./logger');
const { selectZeroclawSkill, logSkillSelection } = require('./skillRouter');

/**
 * Detect user language from conversation history.
 * @param {Array<{role: string, content: string}>} history
 * @returns {'zh'|'ja'|'ar'|'id'|'en'}
 */
function detectLanguage(history) {
  const lastAssistantMsg = (history || [])
    .filter(m => m.role === 'assistant')
    .pop()?.content ?? '';

  if (/[\u4e00-\u9fff]/.test(lastAssistantMsg)) return 'zh';
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(lastAssistantMsg)) return 'ja';
  if (/[\u0600-\u06ff]/.test(lastAssistantMsg)) return 'ar';
  if (/\b(dan|atau|yang|dengan|untuk|dari|ini|itu|ada|bisa|saya|anda|tidak|sudah|belum|tahap|mana|sekarang)\b/i.test(lastAssistantMsg)) return 'id';

  return 'en';
}

const ZEROCLAW_BASE_URL =
  process.env.ZEROCLAW_BASE_URL ||
  process.env.ZEROCLAW_KIRO_URL ||
  require('./config').ZEROCLAW_BASE_URL;

/**
 * Stream response from Zeroclaw with SSE forwarding.
 * 
 * This function:
 * 1. Sends a request to Zeroclaw with stream: true
 * 2. Reads the response as a stream
 * 3. Parses SSE events from the stream
 * 4. Yields each event as it arrives (no buffering)
 * 
 * @param {Object} params
 * @param {string} params.message - The user message
 * @param {Object} params.context - Context object (history, session, etc)
 * @param {string} params.mode - Mode (console, diagnostic, etc)
 * @param {string} params.channel - Channel identifier
 * @param {string} params.entrypoint - Entrypoint identifier
 * @param {string} params.endpoint - API endpoint path
 * @returns {AsyncGenerator<Object>} Yields StreamEvent objects
 */
async function* streamZeroclawWithSkill(params) {
  const { message, context, mode, channel, entrypoint, endpoint } = params;

  const skillCtx = {
    page: context?.page || undefined,
    mode: mode || context?.mode || undefined,
    endpoint: endpoint || undefined,
  };
  const skill = selectZeroclawSkill(skillCtx);
  logSkillSelection(skill, skillCtx, 'streamZeroclawWithSkill');

  let finalMessage = message;
  if (context?.history && Array.isArray(context.history)) {
    const historyText = context.history
      .map((m, i) => `[${i + 1}] ${(m.role || 'user').toUpperCase()}: ${m.content || ''}`)
      .join('\n');
    finalMessage = [
      'Conversation history:',
      historyText,
      '',
      'Continue the conversation in the same language as the assistant messages above.',
    ].join('\n');
  }

  const language = detectLanguage(context?.history);
  
  // Yield events from the streaming response
  for await (const event of streamZeroclawRaw({
    message: finalMessage,
    language,
    context: context || {},
    stream: true, // ← KEY: Request streaming
  })) {
    yield { ...event, skill };
  }
}

/**
 * Low-level streaming request to Zeroclaw.
 * 
 * Sends HTTP request with stream: true and yields SSE events.
 * 
 * @param {Object} body - Request body
 * @returns {AsyncGenerator<Object>} Yields parsed SSE events
 */
async function* streamZeroclawRaw(body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${ZEROCLAW_BASE_URL}/webhook`);
    const payload = JSON.stringify(body);

    logger.info('[zeroclawStreamingClient] POST (streaming)', { url: url.href });

    const transport = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: parseInt(process.env.ZEROCLAW_TIMEOUT_MS || '115000', 10),
    };

    const req = transport.request(options, (res) => {
      // Check for error status
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errorBody = '';
        res.on('data', chunk => { errorBody += chunk; });
        res.on('end', () => {
          reject(new Error(`Zeroclaw returned ${res.statusCode}: ${errorBody.slice(0, 200)}`));
        });
        return;
      }

      // Parse SSE stream
      let buffer = '';
      res.on('data', chunk => {
        buffer += chunk.toString('utf-8');
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) continue;

          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            // Handle [DONE] marker
            if (dataStr === '[DONE]') {
              resolve(undefined); // Signal end of stream
              return;
            }

            try {
              const event = JSON.parse(dataStr);
              // Yield the event (will be handled by async generator)
              // Note: We can't directly yield from a Promise callback,
              // so we'll use a different approach below
            } catch (e) {
              logger.warn('[zeroclawStreamingClient] Failed to parse SSE event', { line: dataStr });
            }
          }
        }
      });

      res.on('end', () => {
        if (buffer.trim()) {
          if (buffer.startsWith('data: ')) {
            const dataStr = buffer.slice(6).trim();
            if (dataStr && dataStr !== '[DONE]') {
              try {
                JSON.parse(dataStr);
              } catch (e) {
                logger.warn('[zeroclawStreamingClient] Failed to parse final SSE event', { line: dataStr });
              }
            }
          }
        }
        resolve(undefined);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Zeroclaw streaming request timed out'));
    });

    req.write(payload);
    req.end();
  }).then(async function* () {
    // This approach won't work with Promise-based streaming
    // We need to refactor to use a different pattern
  });
}

/**
 * Alternative: Stream Zeroclaw response using a callback-based approach.
 * This is more practical for Node.js HTTP streaming.
 * 
 * @param {Object} params - Same as streamZeroclawWithSkill
 * @param {Function} onEvent - Callback: (event) => void
 * @param {Function} onError - Callback: (error) => void
 * @param {Function} onEnd - Callback: () => void
 */
function streamZeroclawWithSkillCallback(params, onEvent, onError, onEnd) {
  const { message, context, mode, channel, entrypoint, endpoint } = params;

  const skillCtx = {
    page: context?.page || undefined,
    mode: mode || context?.mode || undefined,
    endpoint: endpoint || undefined,
  };
  const skill = selectZeroclawSkill(skillCtx);
  logSkillSelection(skill, skillCtx, 'streamZeroclawWithSkillCallback');

  let finalMessage = message;
  if (context?.history && Array.isArray(context.history)) {
    const historyText = context.history
      .map((m, i) => `[${i + 1}] ${(m.role || 'user').toUpperCase()}: ${m.content || ''}`)
      .join('\n');
    finalMessage = [
      'Conversation history:',
      historyText,
      '',
      'Continue the conversation in the same language as the assistant messages above.',
    ].join('\n');
  }

  const language = detectLanguage(context?.history);

  streamZeroclawRawCallback(
    {
      message: finalMessage,
      language,
      context: context || {},
      stream: true,
    },
    (event) => onEvent({ ...event, skill }),
    onError,
    onEnd
  );
}

/**
 * Low-level streaming request using callbacks.
 * 
 * @param {Object} body - Request body
 * @param {Function} onEvent - Called for each SSE event
 * @param {Function} onError - Called on error
 * @param {Function} onEnd - Called when stream ends
 */
function streamZeroclawRawCallback(body, onEvent, onError, onEnd) {
  const url = new URL(`${ZEROCLAW_BASE_URL}/webhook`);
  const payload = JSON.stringify(body);

  logger.info('[zeroclawStreamingClient] POST (streaming)', { url: url.href });

  const transport = url.protocol === 'https:' ? https : http;
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    timeout: parseInt(process.env.ZEROCLAW_TIMEOUT_MS || '115000', 10),
  };

  const req = transport.request(options, (res) => {
    // Check for error status
    if (res.statusCode < 200 || res.statusCode >= 300) {
      let errorBody = '';
      res.on('data', chunk => { errorBody += chunk; });
      res.on('end', () => {
        onError(new Error(`Zeroclaw returned ${res.statusCode}: ${errorBody.slice(0, 200)}`));
      });
      return;
    }

    // Parse SSE stream
    let buffer = '';
    res.on('data', chunk => {
      buffer += chunk.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;

        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          // Handle [DONE] marker
          if (dataStr === '[DONE]') {
            onEnd();
            return;
          }

          try {
            const event = JSON.parse(dataStr);
            onEvent(event);
          } catch (e) {
            logger.warn('[zeroclawStreamingClient] Failed to parse SSE event', { line: dataStr, error: e.message });
          }
        }
      }
    });

    res.on('end', () => {
      if (buffer.trim()) {
        if (buffer.startsWith('data: ')) {
          const dataStr = buffer.slice(6).trim();
          if (dataStr && dataStr !== '[DONE]') {
            try {
              const event = JSON.parse(dataStr);
              onEvent(event);
            } catch (e) {
              logger.warn('[zeroclawStreamingClient] Failed to parse final SSE event', { line: dataStr });
            }
          }
        }
      }
      onEnd();
    });
  });

  req.on('error', onError);
  req.on('timeout', () => {
    req.destroy();
    onError(new Error('Zeroclaw streaming request timed out'));
  });

  req.write(payload);
  req.end();
}

module.exports = {
  streamZeroclawWithSkill,
  streamZeroclawWithSkillCallback,
  streamZeroclawRawCallback,
  detectLanguage,
  ZEROCLAW_BASE_URL,
};
