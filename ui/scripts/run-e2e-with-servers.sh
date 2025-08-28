#!/bin/bash

# E2E test runner with improved server management
set -e

echo "🚀 Starting E2E tests with managed servers..."

# Set test environment
export NODE_ENV=e2e-test
export KANBAN_DATABASE_URL="file:./prisma/kanban-test.db"
export DATABASE_URL="file:./prisma/kanban-test.db"
export AI_REVIEWER_ENABLED=false
export LOG_LEVEL=error
export PORT=3001
export VITE_API_URL="http://localhost:3001"

# Initialize test database
echo "Setting up test database..."
(cd .. && npx prisma db push --force-reset --skip-generate > /dev/null 2>&1) || {
    echo "Warning: Could not initialize test database, continuing anyway..."
}

# Use our server manager
node scripts/server-manager.cjs &
SERVER_PID=$!

# Wait for servers to be ready
sleep 5

# Function to cleanup
cleanup() {
    echo "Cleaning up..."
    if [ ! -z "$SERVER_PID" ]; then
        kill -TERM $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

# Run E2E tests
echo "Running E2E tests..."
if [ -n "$1" ]; then
    echo "Running specific test: $1"
    npx playwright test "$1" --reporter=html --timeout=120000
else
    echo "Running all E2E tests..."
    npx playwright test --reporter=html --timeout=120000
fi

E2E_EXIT_CODE=$?

if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo "✅ E2E tests passed!"
    echo ""
    echo "📊 To view the detailed HTML report, run:"
    echo "   npx playwright show-report"
else
    echo "❌ E2E tests failed!"
    echo ""
    echo "📊 To view the detailed HTML report with failure details, run:"
    echo "   npx playwright show-report"
fi

exit $E2E_EXIT_CODE