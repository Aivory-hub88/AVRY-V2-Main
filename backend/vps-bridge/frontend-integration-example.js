/**
 * Frontend Integration Example for Aivory Dashboard
 * Replace all direct LLM calls with these bridge calls
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://43.156.108.96:3001';
const API_KEY = import.meta.env.VITE_BRIDGE_API_KEY;

if (!API_KEY) {
  console.error('❌ VITE_BRIDGE_API_KEY not set in .env.local');
}

// ============================================================================
// BRIDGE CLIENT
// ============================================================================

class AivoryBridgeClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.sessionId = this.generateSessionId();
  }
  
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async chat(message, context = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey
        },
        body: JSON.stringify({
          message,
          sessionId: this.sessionId,
          context
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.data; // Returns the enriched JSON from PicoClaw
      
    } catch (error) {
      console.error('Bridge chat error:', error);
      throw error;
    }
  }
  
  async getSession() {
    try {
      const response = await fetch(`${this.baseUrl}/api/session/${this.sessionId}`, {
        headers: {
          'X-Api-Key': this.apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
      
    } catch (error) {
      console.error('Get session error:', error);
      throw error;
    }
  }
  
  async clearSession() {
    try {
      await fetch(`${this.baseUrl}/api/session/${this.sessionId}`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': this.apiKey
        }
      });
      
      this.sessionId = this.generateSessionId();
      
    } catch (error) {
      console.error('Clear session error:', error);
      throw error;
    }
  }
  
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check error:', error);
      return { status: 'error', error: error.message };
    }
  }
}

// ============================================================================
// INITIALIZE CLIENT
// ============================================================================

const bridgeClient = new AivoryBridgeClient(BRIDGE_URL, API_KEY);

// ============================================================================
// EXAMPLE USAGE IN CONSOLE CHAT
// ============================================================================

// BEFORE (REMOVE THIS):
/*
async function sendMessageOLD(message) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`, // ❌ EXPOSED KEY!
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: message }]
    })
  });
  return await response.json();
}
*/

// AFTER (USE THIS):
async function sendMessage(message) {
  try {
    // Show loading state
    showLoadingIndicator();
    
    // Call bridge (NO API KEYS EXPOSED)
    const result = await bridgeClient.chat(message, {
      tier: getCurrentTier(),
      userId: getCurrentUserId()
    });
    
    // Hide loading
    hideLoadingIndicator();
    
    // Display result
    displayDiagnosticResult(result);
    
    return result;
    
  } catch (error) {
    hideLoadingIndicator();
    showErrorToast(error.message);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: DIAGNOSTIC FLOW
// ============================================================================

async function runDiagnostic(userAnswers) {
  const message = `
    Analyze AI readiness based on these answers:
    ${JSON.stringify(userAnswers, null, 2)}
    
    Provide:
    - Overall score (0-100)
    - Diagnosis summary
    - Detailed blueprint with recommendations
    - Suggested workflows
  `;
  
  try {
    const result = await bridgeClient.chat(message, {
      type: 'diagnostic',
      tier: 'operator'
    });
    
    // Result structure from PicoClaw:
    // {
    //   score: 75,
    //   diagnosis: "Your company shows moderate AI readiness...",
    //   blueprint: { ... },
    //   workflows: [ ... ],
    //   recommendations: [ ... ]
    // }
    
    return result;
    
  } catch (error) {
    console.error('Diagnostic failed:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: WORKFLOW GENERATION
// ============================================================================

async function generateWorkflow(description) {
  const message = `
    Generate an n8n workflow for: ${description}
    
    Return JSON with:
    - workflow name
    - nodes array
    - connections
    - configuration
  `;
  
  try {
    const result = await bridgeClient.chat(message, {
      type: 'workflow_generation'
    });
    
    return result.workflow || result;
    
  } catch (error) {
    console.error('Workflow generation failed:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE: CONSOLE INTEGRATION
// ============================================================================

// Replace in console.js sendMessage function:
async function sendMessageConsole() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message to UI
  addMessage('user', message);
  
  // Clear input
  input.value = '';
  
  // Show typing indicator
  showTypingIndicator();
  
  try {
    // Call bridge instead of direct LLM
    const response = await bridgeClient.chat(message, {
      tier: ConsoleState.tier,
      user_id: ConsoleState.userId
    });
    
    // Hide typing indicator
    hideTypingIndicator();
    
    // Add AI response
    addMessage('assistant', response.diagnosis || JSON.stringify(response, null, 2));
    
    // If there's a score, show it
    if (response.score !== undefined) {
      showScoreBadge(response.score);
    }
    
    // If there's a blueprint, show it
    if (response.blueprint) {
      showBlueprint(response.blueprint);
    }
    
  } catch (error) {
    hideTypingIndicator();
    addMessage('assistant', `⚠️ Error: ${error.message}`);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showLoadingIndicator() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) indicator.style.display = 'flex';
}

function hideLoadingIndicator() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) indicator.style.display = 'none';
}

function showErrorToast(message) {
  const toast = document.createElement('div');
  toast.className = 'error-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 5000);
}

function getCurrentTier() {
  return sessionStorage.getItem('user_tier') || 'builder';
}

function getCurrentUserId() {
  return sessionStorage.getItem('user_id') || 'demo_user';
}

function displayDiagnosticResult(result) {
  // Update score display
  if (result.score !== undefined) {
    document.getElementById('scoreValue').textContent = result.score;
  }
  
  // Update diagnosis
  if (result.diagnosis) {
    document.getElementById('diagnosisText').textContent = result.diagnosis;
  }
  
  // Show blueprint
  if (result.blueprint) {
    renderBlueprint(result.blueprint);
  }
  
  // Show workflows
  if (result.workflows) {
    renderWorkflows(result.workflows);
  }
}

// ============================================================================
// HEALTH CHECK ON LOAD
// ============================================================================

async function checkBridgeHealth() {
  try {
    const health = await bridgeClient.healthCheck();
    
    if (health.status === 'healthy') {
      console.log('✅ Bridge service connected');
    } else {
      console.warn('⚠️ Bridge service unhealthy:', health);
      showWarningBanner('AI service may be unavailable');
    }
  } catch (error) {
    console.error('❌ Bridge service unreachable:', error);
    showErrorBanner('Cannot connect to AI service');
  }
}

// Run health check on page load
document.addEventListener('DOMContentLoaded', () => {
  checkBridgeHealth();
});

// ============================================================================
// EXPORT
// ============================================================================

export { bridgeClient, sendMessage, runDiagnostic, generateWorkflow };
