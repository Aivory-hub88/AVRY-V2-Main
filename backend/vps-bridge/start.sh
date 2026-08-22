#!/bin/bash

# VPS Bridge Startup Script
# This script starts the VPS Bridge server with proper environment configuration

echo "🚀 Starting VPS Bridge..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please copy .env.example to .env and configure your environment variables"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🎉 Starting server on port 3001..."
node server.js
