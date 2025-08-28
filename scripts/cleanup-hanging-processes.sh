#!/bin/bash

# Utility script to clean up hanging Node processes from E2E tests and server managers
# This script should be run when you notice hanging processes consuming CPU

set -e

echo "🧹 Cleaning up hanging Node processes..."

# Function to safely kill processes by pattern
kill_by_pattern() {
    local pattern="$1"
    local description="$2"
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "🔍 Found $description processes: $pids"
        
        # First try graceful shutdown
        echo "  Sending TERM signal..."
        kill -TERM $pids 2>/dev/null || true
        
        # Wait up to 5 seconds
        local count=0
        while [ $count -lt 5 ]; do
            local remaining=$(pgrep -f "$pattern" 2>/dev/null || true)
            if [ -z "$remaining" ]; then
                echo "  ✅ Gracefully terminated"
                return 0
            fi
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        local remaining=$(pgrep -f "$pattern" 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            echo "  Force killing remaining processes: $remaining"
            kill -9 $remaining 2>/dev/null || true
            echo "  ✅ Force terminated"
        fi
    else
        echo "✅ No $description processes found"
    fi
}

# Kill server-manager processes
kill_by_pattern "server-manager.cjs" "server-manager"

# Kill any hanging npm/node dev servers
kill_by_pattern "npm run dev" "npm dev"
kill_by_pattern "nodemon.*ts-node" "nodemon"
kill_by_pattern "vite.*dev" "Vite dev"

# Kill any hanging Playwright processes
kill_by_pattern "playwright" "Playwright"

# Kill any hanging test processes
kill_by_pattern "vitest" "Vitest"
kill_by_pattern "jest" "Jest"

# Show remaining Node processes
echo ""
echo "📊 Remaining Node processes:"
ps aux | grep -E "(node|npm)" | grep -v grep | head -10 || echo "No Node processes found"

echo ""
echo "✅ Process cleanup complete!"