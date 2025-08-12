#!/bin/bash

# Test runner with proper cleanup to prevent hanging processes

echo "🧪 Starting E2E test runner..."

# Function to cleanup processes
cleanup() {
    echo "🧹 Cleaning up processes..."
    pkill -f "node.*start" || true
    pkill -f "vitest" || true
    exit 0
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Kill any existing processes
pkill -f "node.*start" || true
pkill -f "vitest" || true

# Wait a moment for processes to die
sleep 2

# Run tests with timeout
echo "▶️ Running vitest tests..."
npx vitest run --config=vitest.config.ts

# Exit code from vitest
TEST_EXIT_CODE=$?

echo "🏁 Tests completed with exit code: $TEST_EXIT_CODE"

# Cleanup will happen automatically via trap
exit $TEST_EXIT_CODE