#!/bin/bash
# VPS Bridge Thin Proxy Deployment Script
# Run this on the VPS to deploy the thin proxy

set -e

echo "=========================================="
echo "VPS Bridge Thin Proxy Deployment"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Please run as ubuntu user, not root"
    exit 1
fi

# Stop existing service
echo "🛑 Stopping existing vps-bridge.service..."
sudo systemctl stop vps-bridge.service || true

# Backup old files
echo "💾 Backing up old files..."
if [ -f /home/ubuntu/vps-bridge/server.js ]; then
    sudo cp /home/ubuntu/vps-bridge/server.js /home/ubuntu/vps-bridge/server.js.backup.$(date +%Y%m%d_%H%M%S)
fi
if [ -f /etc/systemd/system/vps-bridge.service ]; then
    sudo cp /etc/systemd/system/vps-bridge.service /etc/systemd/system/vps-bridge.service.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy new systemd unit file
echo "📝 Installing new systemd unit file..."
sudo cp /home/ubuntu/vps-bridge/vps-bridge.service /etc/systemd/system/vps-bridge.service

# Reload systemd
echo "🔄 Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable service
echo "✅ Enabling vps-bridge.service..."
sudo systemctl enable vps-bridge.service

# Start service
echo "🚀 Starting vps-bridge.service..."
sudo systemctl start vps-bridge.service

# Wait a moment for service to start
sleep 2

# Check status
echo ""
echo "=========================================="
echo "Service Status:"
echo "=========================================="
sudo systemctl status vps-bridge.service --no-pager

echo ""
echo "=========================================="
echo "Recent Logs:"
echo "=========================================="
sudo journalctl -u vps-bridge.service -n 20 --no-pager

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "To view logs: sudo journalctl -u vps-bridge.service -f"
echo "To restart: sudo systemctl restart vps-bridge.service"
echo "To stop: sudo systemctl stop vps-bridge.service"