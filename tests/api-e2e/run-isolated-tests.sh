#!/bin/bash

# Script to run API E2E tests in isolation with proper server management

echo "🧪 Starting API E2E tests with isolated server..."

# Function to cleanup processes
cleanup() {
    echo "🧹 Cleaning up processes..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
    fi
    pkill -f "node.*dist/src/index.js" || true
    exit 0
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Navigate to project root
cd ../..

# Build the project first
echo "📦 Building project..."
npm run build || exit 1

# Start the server in the background with test environment
echo "🚀 Starting test server on port 3001..."
NODE_ENV=test PORT=3001 node dist/src/index.js &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ Server is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Server failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Navigate to test directory
cd tests/api-e2e

# Run tests with appropriate timeout and settings
echo "▶️ Running API E2E tests..."
NODE_ENV=test NODE_OPTIONS='--max-old-space-size=4096' npx jest \
    --forceExit \
    --detectOpenHandles \
    --maxWorkers=1 \
    --testTimeout=60000 \
    --bail=false

# Exit code from jest
TEST_EXIT_CODE=$?

echo "🏁 Tests completed with exit code: $TEST_EXIT_CODE"

# Cleanup will happen automatically via trap
exit $TEST_EXIT_CODE