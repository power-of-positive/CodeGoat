#!/bin/bash

# Script to start development servers
# This script should be run from the root directory of the project

echo "🚀 Starting development servers..."

# Check if we're in the root directory
if [ ! -f "package.json" ] || [ ! -d "ui" ]; then
    echo "❌ Error: This script must be run from the root directory of the project"
    echo "   Make sure you're in the directory containing package.json and the ui/ folder"
    exit 1
fi

# Function to start backend server
start_backend() {
    echo ""
    echo "🔧 Starting backend server..."
    echo "   Running: npm run start"
    
    # Start backend in background
    npm run start &
    BACKEND_PID=$!
    echo "   Backend server started (PID: $BACKEND_PID)"
}

# Function to start UI server
start_ui() {
    echo ""
    echo "🎨 Starting UI dev server..."
    echo "   Running: cd ui && npm run dev"
    
    # Start UI in background
    cd ui && npm run dev &
    UI_PID=$!
    echo "   UI server started (PID: $UI_PID)"
    
    # Go back to root directory
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "   Backend server stopped"
    fi
    
    if [ ! -z "$UI_PID" ]; then
        kill $UI_PID 2>/dev/null
        echo "   UI server stopped"
    fi
    
    echo "✅ All servers stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Start servers
start_backend
start_ui

# Wait a moment for servers to start
sleep 2

# Display server information
echo ""
echo "🎉 Development servers are running!"
echo ""
echo "📍 Server URLs:"
echo "   Backend: http://localhost:3000"
echo "   UI: http://localhost:5173"
echo ""
echo "💡 Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait