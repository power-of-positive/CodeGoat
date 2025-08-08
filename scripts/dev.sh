#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        print_warning "Found process on port $port (PID: $pid), killing it..."
        kill -9 $pid 2>/dev/null
        sleep 1
    fi
}

# Trap Ctrl+C to cleanup
cleanup() {
    print_info "Shutting down development servers..."
    
    # Kill all child processes
    jobs -p | xargs -r kill 2>/dev/null
    
    # Kill processes on specific ports
    kill_port 3000
    kill_port 5173
    
    print_success "Development servers stopped"
    exit 0
}

trap cleanup INT TERM

# Check if nodemon is installed
if ! command -v nodemon &> /dev/null; then
    print_error "nodemon is not installed. Installing..."
    npm install -g nodemon
fi

# Kill any existing processes on our ports
print_info "Cleaning up existing processes..."
kill_port 3000
kill_port 5173

# Start the backend server with nodemon
print_info "Starting backend server on port 3000..."
cd "$(dirname "$0")/.." # Go to project root
nodemon --exec "npm run start" --watch src --ext ts,js,json --delay 1000 --verbose &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start the UI dev server with nodemon
print_info "Starting UI dev server on port 5173..."
cd ui
npm run dev:watch &
UI_PID=$!

# Print status
print_success "Development servers started!"
echo ""
print_info "Backend server: http://localhost:3000"
print_info "UI dev server: http://localhost:5173"
echo ""
print_info "Press Ctrl+C to stop all servers"
echo ""

# Show combined logs
print_info "Showing combined logs..."
echo "========================================="

# Wait for processes
wait $BACKEND_PID $UI_PID