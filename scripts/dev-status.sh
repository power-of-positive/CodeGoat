#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to check process on port
check_port() {
    local port=$1
    local service=$2
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        echo -e "${GREEN}✓${NC} $service (port $port) - PID: ${CYAN}$pid${NC}"
        ps -p $pid -o command= | sed 's/^/    /'
    else
        echo -e "${RED}✗${NC} $service (port $port) - ${RED}Not running${NC}"
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pid" ]; then
        kill -9 $pid 2>/dev/null
        echo -e "${GREEN}Killed process on port $port (PID: $pid)${NC}"
    else
        echo -e "${YELLOW}No process found on port $port${NC}"
    fi
}

# Clear screen
clear

# Header
echo -e "${CYAN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      ${BLUE}Development Server Status${CYAN}            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if any argument provided
if [ "$1" == "kill" ]; then
    echo -e "${YELLOW}Killing all development servers...${NC}"
    echo ""
    kill_port 3000
    kill_port 5173
    echo ""
    echo -e "${GREEN}All servers stopped${NC}"
else
    # Show status
    echo -e "${BLUE}Current Status:${NC}"
    echo ""
    check_port 3000 "Backend Server"
    echo ""
    check_port 5173 "UI Dev Server"
    echo ""
    
    # Show options
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Options:${NC}"
    echo "  • Run '${CYAN}./scripts/dev-status.sh kill${NC}' to stop all servers"
    echo "  • Run '${CYAN}./scripts/dev.sh${NC}' to start all servers"
    echo "  • Run '${CYAN}./ui/scripts/dev-ui.sh${NC}' from ui folder to start UI only"
fi

echo ""