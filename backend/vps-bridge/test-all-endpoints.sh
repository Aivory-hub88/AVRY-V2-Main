#!/bin/bash

# VPS Bridge Endpoint Test Script
# Tests all main endpoints and logs results

echo "=========================================="
echo "VPS Bridge Endpoint Test Script"
echo "=========================================="
echo ""

# Configuration
BRIDGE_URL="http://127.0.0.1:3003"
LOG_FILE="endpoint-test-results.log"

# Clear previous log
> "$LOG_FILE"

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo "Testing: $name"
    echo "Endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BRIDGE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BRIDGE_URL$endpoint")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    
    # Extract body (everything except last line)
    body=$(echo "$response" | sed '$d')
    
    # Get first 300 chars of body
    body_preview=$(echo "$body" | head -c 300)
    
    echo "Status: $status_code"
    echo "Response (first 300 chars):"
    echo "$body_preview"
    echo ""
    
    # Log to file
    echo "========================================" >> "$LOG_FILE"
    echo "Test: $name" >> "$LOG_FILE"
    echo "Command: curl -X $method $BRIDGE_URL$endpoint" >> "$LOG_FILE"
    echo "Status: $status_code" >> "$LOG_FILE"
    echo "Response: $body_preview" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

# Test 1: /health
test_endpoint "Health Check" "GET" "/health"

# Test 2: /deep-health
test_endpoint "Deep Health Check" "GET" "/deep-health"

# Test 3: /diagnostics/run
test_endpoint "Deep Diagnostic" "POST" "/diagnostics/run" '{
    "mode": "deep",
    "organization_id": "test-org-123",
    "company_name": "Test Company",
    "phases": ["infrastructure", "security", "performance"]
}'

# Test 4: /diagnostics/free/run
test_endpoint "Free Diagnostic" "POST" "/diagnostics/free/run" '{
    "organization_id": "test-org-123",
    "company_name": "Test Company"
}'

# Test 5: /blueprints/generate
test_endpoint "Blueprint Generation" "POST" "/blueprints/generate" '{
    "organization_id": "test-org-123",
    "company_name": "Test Company",
    "industry": "Technology",
    "size": "Small"
}'

# Test 6: /aria
test_endpoint "ARIA Chat" "POST" "/aria" '{
    "message": "Hello, this is a test message"
}'

# Test 7: /aria/stream (streaming endpoint - just check if it accepts request)
test_endpoint "ARIA Stream" "POST" "/aria/stream" '{
    "message": "Hello, this is a test message"
}'

# Test 8: /workflows/synthesize
test_endpoint "Workflow Synthesize" "POST" "/workflows/synthesize" '{
    "organization_id": "test-org-123",
    "workflow_name": "Test Workflow",
    "description": "A test workflow"
}'

# Test 9: /workflows/deploy
test_endpoint "Workflow Deploy" "POST" "/workflows/deploy" '{
    "organization_id": "test-org-123",
    "workflow_id": "test-workflow-123"
}'

# Test 10: /workflows/clarify
test_endpoint "Workflow Clarify" "POST" "/workflows/clarify" '{
    "organization_id": "test-org-123",
    "workflow_id": "test-workflow-123",
    "question": "How does this work?"
}'

# Test 11: /blueprints/generate-workflow
test_endpoint "Blueprint Generate Workflow" "POST" "/blueprints/generate-workflow" '{
    "organization_id": "test-org-123",
    "blueprint_id": "test-blueprint-123"
}'

echo "=========================================="
echo "All tests completed!"
echo "Results saved to: $LOG_FILE"
echo "=========================================="
echo ""
echo "To check PM2 logs for errors:"
echo "  pm2 flush vps-bridge"
echo "  pm2 logs vps-bridge --lines 50"
echo ""
echo "Look for:"
echo "  - 'Unauthorized: Invalid or missing API key' errors"
echo "  - 'Unexpected end of JSON input' errors"