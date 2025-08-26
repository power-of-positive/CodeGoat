#!/bin/bash

# Simple, reliable E2E test runner - no server management
set -e

echo "🧪 Running E2E tests (no server required)..."

# Run just the basic smoke tests that don't need servers
npx playwright test basic-smoke.spec.ts --reporter=line --timeout=10000

E2E_EXIT_CODE=$?

if [ $E2E_EXIT_CODE -eq 0 ]; then
    echo "✅ E2E tests passed!"
else
    echo "❌ E2E tests failed with exit code $E2E_EXIT_CODE"
fi

exit $E2E_EXIT_CODE