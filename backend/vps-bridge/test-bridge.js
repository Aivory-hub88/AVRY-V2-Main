/**
 * Test script for Aivory Bridge Service
 * Run from MacBook: node test-bridge.js
 */

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://43.156.108.96:3001';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.response = { status: res.status, data: body };
    throw err;
  }
  return { data: body };
}

async function testBridge() {
  console.log('🧪 Testing Aivory Bridge Service');
  console.log('='.repeat(60));

  try {
    // Test 1: Health Check
    console.log('\n[TEST 1] Health Check');
    const healthRes = await fetchJSON(`${BRIDGE_URL}/health`);
    console.log('✅ Health check passed:', healthRes.data);

    // Test 2: Chat without API key (should fail)
    console.log('\n[TEST 2] Chat without API key (should fail)');
    try {
      await fetchJSON(`${BRIDGE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });
      console.log('❌ Should have failed without API key');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ Correctly rejected unauthorized request');
      } else {
        console.log('❌ Unexpected error:', err.message);
      }
    }

    // Test 3: Chat with API key
    console.log('\n[TEST 3] Chat with API key');
    const chatRes = await fetchJSON(`${BRIDGE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        message: 'Analyze my company AI readiness. We have 50 employees, use some cloud services, but no AI strategy yet.',
        sessionId: 'test-session-123',
        context: {
          tier: 'operator',
          userId: 'test-user',
        },
      }),
    });
    console.log('✅ Chat request successful');
    console.log('Response:', JSON.stringify(chatRes.data, null, 2));

    // Test 4: Get session
    console.log('\n[TEST 4] Get session history');
    const sessionRes = await fetchJSON(`${BRIDGE_URL}/api/session/test-session-123`, {
      headers: { 'X-Api-Key': API_KEY },
    });
    console.log('✅ Session retrieved');
    console.log('Messages:', sessionRes.data.data.messages.length);

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testBridge();