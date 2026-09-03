#!/bin/bash

# Test script for Agents CRUD endpoints
# Usage: ./test-agents.sh [api-key] [base-url]

API_KEY="${1:-test-key-123}"
BASE_URL="${2:-http://localhost:3003}"

echo "🧪 Testing Agents CRUD Endpoints"
echo "================================"
echo "API Key: $API_KEY"
echo "Base URL: $BASE_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: List agents (empty)
echo -e "${YELLOW}Test 1: List agents (empty)${NC}"
RESPONSE=$(curl -sS "$BASE_URL/agents" \
  -H "X-Api-Key: $API_KEY")
echo "$RESPONSE" | jq .
echo ""

# Test 2: Create agent
echo -e "${YELLOW}Test 2: Create agent${NC}"
CREATE_RESPONSE=$(curl -sS "$BASE_URL/agents" \
  -X POST \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "model": "claude-3.5-sonnet",
    "provider": "openrouter",
    "runtime": "zeroclaw",
    "description": "A test agent for workflow integration",
    "status": "active",
    "tags": ["test", "workflow"]
  }')
echo "$CREATE_RESPONSE" | jq .
AGENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id')
echo "Created agent ID: $AGENT_ID"
echo ""

# Test 3: List agents (should show 1)
echo -e "${YELLOW}Test 3: List agents (should show 1)${NC}"
curl -sS "$BASE_URL/agents" \
  -H "X-Api-Key: $API_KEY" | jq .
echo ""

# Test 4: Get specific agent
echo -e "${YELLOW}Test 4: Get specific agent${NC}"
curl -sS "$BASE_URL/agents/$AGENT_ID" \
  -H "X-Api-Key: $API_KEY" | jq .
echo ""

# Test 5: Update agent
echo -e "${YELLOW}Test 5: Update agent${NC}"
curl -sS "$BASE_URL/agents/$AGENT_ID" \
  -X PATCH \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated description",
    "tags": ["test", "workflow", "updated"]
  }' | jq .
echo ""

# Test 6: Search agents
echo -e "${YELLOW}Test 6: Search agents (q=test)${NC}"
curl -sS "$BASE_URL/agents?q=test" \
  -H "X-Api-Key: $API_KEY" | jq .
echo ""

# Test 7: Filter by status
echo -e "${YELLOW}Test 7: Filter by status (active)${NC}"
curl -sS "$BASE_URL/agents?status=active" \
  -H "X-Api-Key: $API_KEY" | jq .
echo ""

# Test 8: Delete agent (soft delete)
echo -e "${YELLOW}Test 8: Delete agent (soft delete)${NC}"
curl -sS "$BASE_URL/agents/$AGENT_ID" \
  -X DELETE \
  -H "X-Api-Key: $API_KEY" \
  -w "\nStatus: %{http_code}\n"
echo ""

# Test 9: Verify soft delete (agent should not appear in list)
echo -e "${YELLOW}Test 9: Verify soft delete (agent should not appear)${NC}"
curl -sS "$BASE_URL/agents" \
  -H "X-Api-Key: $API_KEY" | jq .
echo ""

# Test 10: Error handling - missing required fields
echo -e "${YELLOW}Test 10: Error handling - missing required fields${NC}"
curl -sS "$BASE_URL/agents" \
  -X POST \
  -H "X-Api-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Incomplete Agent"
  }' | jq .
echo ""

# Test 11: Error handling - agent not found
echo -e "${YELLOW}Test 11: Error handling - agent not found${NC}"
curl -sS "$BASE_URL/agents/nonexistent-id" \
  -H "X-Api-Key: $API_KEY" | jq .
echo ""

echo -e "${GREEN}✅ All tests completed!${NC}"
