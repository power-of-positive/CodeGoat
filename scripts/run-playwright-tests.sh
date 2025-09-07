#!/bin/bash

# Run Playwright tests with a timeout
# This script ensures tests don't hang indefinitely

cd ui || exit 1

# Set timeout for the entire test run (150 seconds)
TIMEOUT=150

echo "Running Playwright E2E tests with ${TIMEOUT}s timeout..."

# Use timeout command with proper exit handling
if command -v timeout >/dev/null 2>&1; then
    # Linux/GNU timeout
    timeout --preserve-status ${TIMEOUT} npx playwright test
elif command -v gtimeout >/dev/null 2>&1; then
    # macOS with GNU coreutils
    gtimeout --preserve-status ${TIMEOUT} npx playwright test
else
    # Fallback to npx playwright test with Node.js timeout
    npx playwright test
fi

EXIT_CODE=$?

if [ $EXIT_CODE -eq 124 ] || [ $EXIT_CODE -eq 137 ]; then
    echo "Playwright tests timed out after ${TIMEOUT} seconds"
    exit 1
elif [ $EXIT_CODE -ne 0 ]; then
    echo "Playwright tests failed with exit code: $EXIT_CODE"
    exit $EXIT_CODE
else
    echo "Playwright tests passed successfully!"
    exit 0
fi