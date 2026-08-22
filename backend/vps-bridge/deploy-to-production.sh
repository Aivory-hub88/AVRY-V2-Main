#!/bin/bash

# VPS Bridge Production Deployment Script
# This script automates deployment to the production server

set -e  # Exit on error

# Configuration
PROD_SERVER="43.156.108.96"
PROD_USER="root"  # Change this to your SSH user
DEPLOY_PATH="/opt/aivory/vps-bridge"
LOCAL_PATH="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 VPS Bridge Production Deployment"
echo "===================================="
echo ""
echo "Production Server: $PROD_SERVER"
echo "Deploy Path: $DEPLOY_PATH"
echo "Local Path: $LOCAL_PATH"
echo ""

# Check if SSH key is configured
echo "📡 Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$PROD_USER@$PROD_SERVER" exit 2>/dev/null; then
    echo "❌ Cannot connect to production server"
    echo "Please ensure:"
    echo "  1. SSH key is configured"
    echo "  2. Server is accessible"
    echo "  3. User has correct permissions"
    exit 1
fi
echo "✅ SSH connection successful"
echo ""

# Create deployment directory if it doesn't exist
echo "📁 Creating deployment directory..."
ssh "$PROD_USER@$PROD_SERVER" "mkdir -p $DEPLOY_PATH"
echo "✅ Directory ready"
echo ""

# Copy files to production server
echo "📦 Copying files to production server..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '*.log' \
    "$LOCAL_PATH/" \
    "$PROD_USER@$PROD_SERVER:$DEPLOY_PATH/"
echo "✅ Files copied"
echo ""

# Install dependencies
echo "📦 Installing dependencies on production server..."
ssh "$PROD_USER@$PROD_SERVER" "cd $DEPLOY_PATH && npm install --production"
echo "✅ Dependencies installed"
echo ""

# Check if .env exists
echo "🔍 Checking environment configuration..."
if ssh "$PROD_USER@$PROD_SERVER" "test -f $DEPLOY_PATH/.env"; then
    echo "✅ .env file exists"
else
    echo "⚠️  .env file not found"
    echo "Creating .env from .env.example..."
    ssh "$PROD_USER@$PROD_SERVER" "cd $DEPLOY_PATH && cp .env.example .env"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file on production server:"
    echo "   ssh $PROD_USER@$PROD_SERVER"
    echo "   nano $DEPLOY_PATH/.env"
    echo ""
    read -p "Press Enter after configuring .env file..."
fi
echo ""

# Check if PM2 is installed
echo "🔍 Checking PM2..."
if ssh "$PROD_USER@$PROD_SERVER" "command -v pm2 >/dev/null 2>&1"; then
    echo "✅ PM2 is installed"
else
    echo "📦 Installing PM2..."
    ssh "$PROD_USER@$PROD_SERVER" "npm install -g pm2"
    echo "✅ PM2 installed"
fi
echo ""

# Stop existing process if running
echo "🛑 Stopping existing VPS Bridge process..."
ssh "$PROD_USER@$PROD_SERVER" "cd $DEPLOY_PATH && pm2 stop vps-bridge 2>/dev/null || true"
echo "✅ Stopped"
echo ""

# Start VPS Bridge with PM2
echo "🚀 Starting VPS Bridge..."
ssh "$PROD_USER@$PROD_SERVER" "cd $DEPLOY_PATH && pm2 start server.js --name vps-bridge"
echo "✅ Started"
echo ""

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
ssh "$PROD_USER@$PROD_SERVER" "pm2 save"
echo "✅ Saved"
echo ""

# Configure PM2 to start on boot
echo "🔧 Configuring auto-start on boot..."
ssh "$PROD_USER@$PROD_SERVER" "pm2 startup systemd -u $PROD_USER --hp /home/$PROD_USER 2>/dev/null || true"
echo "✅ Configured"
echo ""

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3
echo ""

# Test health check
echo "🏥 Testing health check..."
HEALTH_CHECK=$(ssh "$PROD_USER@$PROD_SERVER" "curl -s http://localhost:3003/health" || echo "failed")

if echo "$HEALTH_CHECK" | grep -q '"status":"ok"'; then
    echo "✅ Health check passed!"
    echo "$HEALTH_CHECK" | jq . 2>/dev/null || echo "$HEALTH_CHECK"
else
    echo "❌ Health check failed!"
    echo "Response: $HEALTH_CHECK"
    echo ""
    echo "Checking logs..."
    ssh "$PROD_USER@$PROD_SERVER" "cd $DEPLOY_PATH && pm2 logs vps-bridge --lines 20 --nostream"
    exit 1
fi
echo ""

# Configure firewall
echo "🔥 Configuring firewall..."
if ssh "$PROD_USER@$PROD_SERVER" "command -v ufw >/dev/null 2>&1"; then
    ssh "$PROD_USER@$PROD_SERVER" "sudo ufw allow 3001/tcp 2>/dev/null || true"
    echo "✅ Firewall configured"
else
    echo "⚠️  UFW not found, skipping firewall configuration"
fi
echo ""

# Show PM2 status
echo "📊 PM2 Status:"
ssh "$PROD_USER@$PROD_SERVER" "pm2 status"
echo ""

# Test from local machine
echo "🌐 Testing from local machine..."
sleep 2
if curl -s --max-time 5 "http://$PROD_SERVER:3001/health" | grep -q '"status":"ok"'; then
    echo "✅ Production server is accessible from internet!"
else
    echo "⚠️  Cannot access production server from internet"
    echo "This might be due to:"
    echo "  1. Firewall blocking port 3001"
    echo "  2. Server not binding to 0.0.0.0"
    echo "  3. Network configuration"
    echo ""
    echo "Server is running locally on production, but not accessible externally."
fi
echo ""

# Final summary
echo "===================================="
echo "🎉 Deployment Complete!"
echo "===================================="
echo ""
echo "Production Server: http://$PROD_SERVER:3001"
echo "Health Check: http://$PROD_SERVER:3001/health"
echo ""
echo "Next Steps:"
echo "  1. Test all endpoints using TESTING_GUIDE.md"
echo "  2. Update Next.js frontend .env.local:"
echo "     VPS_BRIDGE_URL=http://43.156.108.96:3003"
echo "  3. Monitor logs: ssh $PROD_USER@$PROD_SERVER 'pm2 logs vps-bridge'"
echo "  4. Check status: ssh $PROD_USER@$PROD_SERVER 'pm2 status'"
echo ""
echo "Useful Commands:"
echo "  View logs:    ssh $PROD_USER@$PROD_SERVER 'pm2 logs vps-bridge'"
echo "  Restart:      ssh $PROD_USER@$PROD_SERVER 'pm2 restart vps-bridge'"
echo "  Stop:         ssh $PROD_USER@$PROD_SERVER 'pm2 stop vps-bridge'"
echo "  Monitor:      ssh $PROD_USER@$PROD_SERVER 'pm2 monit'"
echo ""
