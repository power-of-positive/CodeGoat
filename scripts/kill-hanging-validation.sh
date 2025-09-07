#!/bin/bash

# Kill hanging validation processes

echo "🔍 Looking for hanging validation processes..."

# Kill validate-task.ts processes
pkill -f "validate-task.ts" 2>/dev/null && echo "✅ Killed validate-task.ts processes"

# Kill hanging npm test processes
pkill -f "npm test" 2>/dev/null && echo "✅ Killed npm test processes"

# Kill hanging jest processes
pkill -f "jest" 2>/dev/null && echo "✅ Killed jest processes"

# Kill hanging vitest processes
pkill -f "vitest" 2>/dev/null && echo "✅ Killed vitest processes"

# Kill hanging playwright processes
pkill -f "playwright" 2>/dev/null && echo "✅ Killed playwright processes"

# Kill hanging tsx processes related to validation
pkill -f "tsx.*validate" 2>/dev/null && echo "✅ Killed tsx validation processes"

# Kill hanging ts-node processes related to validation
pkill -f "ts-node.*validate" 2>/dev/null && echo "✅ Killed ts-node validation processes"

echo "✨ Cleanup complete!"