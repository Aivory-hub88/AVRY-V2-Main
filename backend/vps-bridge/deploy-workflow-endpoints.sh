#!/bin/bash
# VPS Bridge Workflow Endpoints Deployment Script
# Purpose: Deploy handleWorkflowRequest function and /workflows/* endpoints to VPS

set -e  # Exit on error

VPS_HOST="43.156.108.96"
VPS_USER="ubuntu"
VPS_PATH="/opt/aivory/vps-bridge"
LOCAL_FILE="vps-bridge/server.js"
 +++++++ REPLACE
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=========================================="
echo "VPS Bridge Workflow Endpoints Deployment"
echo "=========================================="
echo ""

# Step 1: Check local file exists
echo "Step 1: Checking local file..."
if [ ! -f "$LOCAL_FILE" ]; then
    echo "❌ ERROR: $LOCAL_FILE not found"
    exit 1
fi
echo "✅ Local file found: $LOCAL_FILE"

# Verify endpoints are present
echo ""
echo "Step 2: Verifying workflow endpoints in local file..."
if grep -q "handleWorkflowRequest" "$LOCAL_FILE" && \
   grep -q "/workflows/generate" "$LOCAL_FILE" && \
   grep -q "/workflows/repair" "$LOCAL_FILE" && \
   grep -q "/workflows/edit" "$LOCAL_FILE"; then
    echo "✅ All workflow endpoints found in local file"
else
    echo "❌ ERROR: Missing workflow endpoints in local file"
    exit 1
fi

# Step 3: Create backup on VPS
echo ""
echo "Step 3: Creating backup on VPS..."
BACKUP_CMD="cp $VPS_PATH/server.js $VPS_PATH/server.js.bak.$TIMESTAMP"
sshpass -p "$VPS_PASS" ssh $VPS_USER@$VPS_HOST "$BACKUP_CMD"
echo "✅ Backup created: $VPS_PATH/server.js.bak.$TIMESTAMP"

# Step 4: Sync file to VPS
echo ""
echo "Step 4: Syncing server.js to VPS..."
sshpass -p "$VPS_PASS" rsync -avz "$LOCAL_FILE" $VPS_USER@$VPS_HOST:$VPS_PATH/server.js
echo "✅ File synced to VPS"

# Step 5: Syntax check
echo ""
echo "Step 5: Running syntax check..."
SYNTAX_CMD="cd $VPS_PATH && node --check server.js && echo SYNTAX_OK"
SYNTAX_OUTPUT=$(sshpass -p "$VPS_PASS" ssh $VPS_USER@$VPS_HOST "$SYNTAX_CMD")
if echo "$SYNTAX_OUTPUT" | grep -q "SYNTAX_OK"; then
    echo "✅ Syntax check passed"
else
    echo "❌ ERROR: Syntax check failed"
    echo "Restoring backup..."
    sshpass -p "$VPS_PASS" ssh $VPS_USER@$VPS_HOST "cp $VPS_PATH/server.js.bak.$TIMESTAMP $VPS_PATH/server.js"
    echo "✅ Backup restored"
    exit 1
fi

# Step 6: Restart VPS Bridge
echo ""
echo "Step 6: Restarting VPS Bridge..."
RESTART_CMD="pm2 restart vps-bridge && pm2 logs vps-bridge --lines 30 --nostream"
sshpass -p "$VPS_PASS" ssh $VPS_USER@$VPS_HOST "$RESTART_CMD"
echo "✅ VPS Bridge restarted"

# Step 7: Health check
echo ""
echo "Step 7: Running health check..."
sleep 3  # Wait for service to start
HEALTH_CHECK=$(curl -sS http://$VPS_HOST:3003/health)
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check response: $HEALTH_CHECK"
fi

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Backup file: $VPS_PATH/server.js.bak.$TIMESTAMP"
echo ""
echo "To rollback if needed:"
echo "  ssh $VPS_USER@$VPS_HOST 'cp $VPS_PATH/server.js.bak.$TIMESTAMP $VPS_PATH/server.js && pm2 restart vps-bridge'"
echo ""
echo "Test new endpoints:"
echo "  curl -X POST http://$VPS_HOST:3003/workflows/generate \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"user_request\":\"Create a workflow\"}'"