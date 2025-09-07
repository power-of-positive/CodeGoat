#!/bin/bash

# Navigate to project root
cd ../..

# Build the project first
echo "Building project..."
npm run build

# Start the server in the background
echo "Starting server..."
NODE_ENV=test PORT=3001 node dist/src/index.js > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Navigate back to test directory
cd tests/api-e2e

# Run the simple test
echo "Running simple test..."
NODE_ENV=test npx jest simple-test.spec.ts --forceExit

# Capture the test exit code
TEST_EXIT_CODE=$?

# Kill the server
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

# Exit with the test exit code
exit $TEST_EXIT_CODE