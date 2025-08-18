#!/bin/bash

# End-to-end test for stage reordering functionality
# This simulates what the frontend reordering functionality should do

set -e

echo "🚀 Testing Stage Reordering End-to-End Functionality"
echo "=================================================="

API_BASE="http://localhost:3000/api/settings/validation/stages"

echo "📊 Getting initial stage order..."
INITIAL_STAGES=$(curl -s "$API_BASE")
echo "First few stages:"
echo "$INITIAL_STAGES" | jq '.stages[0:3] | .[] | {id, name, priority}' || echo "Failed to parse initial stages"

echo ""
echo "🔄 Testing reordering: Moving 'Code Linting' (priority 1) down by swapping with 'Type Checking' (priority 2)"

# Get the current stages
LINT_STAGE=$(echo "$INITIAL_STAGES" | jq '.stages[] | select(.id == "lint")')
TYPECHECK_STAGE=$(echo "$INITIAL_STAGES" | jq '.stages[] | select(.id == "typecheck")')

echo "Current lint stage: $(echo "$LINT_STAGE" | jq '{id, name, priority}')"
echo "Current typecheck stage: $(echo "$TYPECHECK_STAGE" | jq '{id, name, priority}')"

# Extract priorities
LINT_PRIORITY=$(echo "$LINT_STAGE" | jq '.priority')
TYPECHECK_PRIORITY=$(echo "$TYPECHECK_STAGE" | jq '.priority')

echo "Swapping priorities: lint($LINT_PRIORITY) ↔ typecheck($TYPECHECK_PRIORITY)"

# Update lint stage with typecheck's priority (moving it down)
UPDATED_LINT=$(echo "$LINT_STAGE" | jq ". + {priority: $TYPECHECK_PRIORITY}")
echo "Updating lint stage..."
LINT_RESULT=$(curl -s -X PUT "$API_BASE/lint" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_LINT")

if echo "$LINT_RESULT" | jq -e '.stage' > /dev/null; then
  echo "✅ Lint stage updated successfully"
else
  echo "❌ Failed to update lint stage:"
  echo "$LINT_RESULT"
  exit 1
fi

# Update typecheck stage with lint's priority (moving it up)  
UPDATED_TYPECHECK=$(echo "$TYPECHECK_STAGE" | jq ". + {priority: $LINT_PRIORITY}")
echo "Updating typecheck stage..."
TYPECHECK_RESULT=$(curl -s -X PUT "$API_BASE/typecheck" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_TYPECHECK")

if echo "$TYPECHECK_RESULT" | jq -e '.stage' > /dev/null; then
  echo "✅ Typecheck stage updated successfully"
else
  echo "❌ Failed to update typecheck stage:"
  echo "$TYPECHECK_RESULT"
  exit 1
fi

echo ""
echo "📋 Verifying new order..."
FINAL_STAGES=$(curl -s "$API_BASE")
echo "Updated stages:"
echo "$FINAL_STAGES" | jq '.stages[0:3] | .[] | {id, name, priority}' || echo "Failed to parse final stages"

# Verify the swap worked
NEW_LINT_PRIORITY=$(echo "$FINAL_STAGES" | jq '.stages[] | select(.id == "lint") | .priority')
NEW_TYPECHECK_PRIORITY=$(echo "$FINAL_STAGES" | jq '.stages[] | select(.id == "typecheck") | .priority')

echo ""
echo "🔍 Verification:"
echo "  Lint priority: $LINT_PRIORITY → $NEW_LINT_PRIORITY (expected: $TYPECHECK_PRIORITY)"
echo "  Typecheck priority: $TYPECHECK_PRIORITY → $NEW_TYPECHECK_PRIORITY (expected: $LINT_PRIORITY)"

if [ "$NEW_LINT_PRIORITY" -eq "$TYPECHECK_PRIORITY" ] && [ "$NEW_TYPECHECK_PRIORITY" -eq "$LINT_PRIORITY" ]; then
  echo "✅ Reordering verification PASSED!"
  SWAP_SUCCESS=true
else
  echo "❌ Reordering verification FAILED!"
  SWAP_SUCCESS=false
fi

echo ""
echo "🔙 Restoring original order..."
# Restore original order
RESTORE_LINT=$(echo "$LINT_STAGE" | jq ". + {priority: $LINT_PRIORITY}")
RESTORE_TYPECHECK=$(echo "$TYPECHECK_STAGE" | jq ". + {priority: $TYPECHECK_PRIORITY}")

curl -s -X PUT "$API_BASE/lint" \
  -H "Content-Type: application/json" \
  -d "$RESTORE_LINT" > /dev/null

curl -s -X PUT "$API_BASE/typecheck" \
  -H "Content-Type: application/json" \
  -d "$RESTORE_TYPECHECK" > /dev/null

echo "Original order restored."

echo ""
echo "📊 FINAL RESULT"
echo "==============="
if $SWAP_SUCCESS; then
  echo "🎉 Stage reordering functionality works correctly!"
  echo "✅ Task #70 backend functionality is COMPLETE"
  echo ""
  echo "Next steps:"
  echo "1. Open http://localhost:5175"  
  echo "2. Navigate to Settings"
  echo "3. Test the up/down arrow buttons manually"
  echo "4. Verify the UI updates and changes persist"
else
  echo "❌ Stage reordering functionality has issues"
  exit 1
fi