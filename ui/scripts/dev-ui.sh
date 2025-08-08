#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output with timestamp
print_info() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} ${BLUE}[UI]${NC} $1"
}

print_success() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} ${GREEN}[UI]${NC} $1"
}

print_error() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} ${RED}[UI]${NC} $1"
}

print_warning() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} ${YELLOW}[UI]${NC} $1"
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        print_warning "Found existing UI server on port $port (PID: $pid)"
        print_info "Killing process..."
        kill -9 $pid 2>/dev/null
        sleep 1
        print_success "Process killed"
    fi
}

# Cleanup function
cleanup() {
    echo ""
    print_info "Shutting down UI dev server..."
    kill_port 5173
    print_success "UI dev server stopped"
    exit 0
}

# Trap signals
trap cleanup INT TERM EXIT

# Clear screen
clear

# Print header
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║       ${BLUE}UI Development Server Manager${CYAN}       ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check current directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    print_error "This script must be run from the ui directory"
    exit 1
fi

# Kill any existing process on port 5173
print_info "Checking for existing processes..."
kill_port 5173

# Start the dev server
print_info "Starting UI dev server..."
echo ""
print_success "Server starting on http://localhost:5173"
print_info "Press Ctrl+C to stop the server"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo ""

# Run with nodemon for better logging and restart capability
exec nodemon