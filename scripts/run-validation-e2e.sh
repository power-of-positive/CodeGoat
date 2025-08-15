#!/bin/bash

# Run E2E tests in CI mode with better failure tolerance
export CI=true
cd ui && npx playwright test --reporter=list --max-failures=5 --workers=1