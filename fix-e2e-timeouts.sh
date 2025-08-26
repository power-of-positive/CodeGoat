#!/bin/bash

# Fix all E2E test files that use networkidle
FILES=$(find ui/e2e -name "*.spec.ts" -type f)

for file in $FILES; do
  echo "Processing $file..."
  # Replace networkidle with domcontentloaded  
  sed -i '' "s/waitForLoadState('networkidle')/waitForLoadState('domcontentloaded')/g" "$file"
  sed -i '' 's/waitForLoadState("networkidle")/waitForLoadState("domcontentloaded")/g' "$file"
done

echo "Fixed all E2E test timeouts!"