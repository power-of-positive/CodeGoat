#!/bin/bash

# Start the E2E tests
cd ui
npm run test:e2e &
TEST_PID=$!

# Set timeout duration (120 seconds)
TIMEOUT=120
ELAPSED=0

# Wait for tests or timeout
while [ $ELAPSED -lt $TIMEOUT ]; do
    if ! ps -p $TEST_PID > /dev/null 2>&1; then
        # Process finished
        wait $TEST_PID
        EXIT_CODE=$?
        echo "Tests completed with exit code: $EXIT_CODE"
        exit $EXIT_CODE
    fi
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

# Timeout reached, kill the process
echo "Tests timed out after ${TIMEOUT} seconds"
kill -TERM $TEST_PID 2>/dev/null || true
sleep 2
kill -KILL $TEST_PID 2>/dev/null || true

# Also kill any playwright processes
pkill -f "playwright" || true

exit 1