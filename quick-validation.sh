#!/bin/bash
set -e

echo "🔍 Running Quick Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "1. Linting..."
npm run lint > /dev/null 2>&1 && echo "   ✅ Lint passed" || { echo "   ❌ Lint failed"; exit 1; }

echo "2. Type checking..."
npm run type-check > /dev/null 2>&1 && echo "   ✅ Type check passed" || { echo "   ❌ Type check failed"; exit 1; }

echo "3. TypeScript preference..."
npm run typescript-check > /dev/null 2>&1 && echo "   ✅ TypeScript preference passed" || { echo "   ❌ TypeScript preference failed"; exit 1; }

echo "4. Backend tests..."
npm test -- --testPathPattern="config|analytics|settings|tasks" --no-coverage > /dev/null 2>&1 && echo "   ✅ Backend tests passed" || { echo "   ❌ Backend tests failed"; exit 1; }

echo ""
echo "✨ All essential validation checks passed!"
