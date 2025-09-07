#!/bin/bash

# Test validation re-trigger logging
echo "=== Testing validation re-trigger logging ==="
echo ""

# Clean up old test files
rm -f logs/claude-session-test-*.json logs/claude-session-test-*.txt

# Run the script with validation enabled
echo "Running Claude with validation (will likely fail and re-trigger)..."
echo ""

# Use a simple prompt that won't do much, so validation fails quickly
npx tsx scripts/run-claude-prompt.ts "echo test" 2>&1 | tee test-output.log

echo ""
echo "=== Checking created files ==="

# Find the session files created
SESSION_FILES=$(ls -la logs/claude-session-*.json 2>/dev/null | tail -5)
echo "Recent session files:"
echo "$SESSION_FILES"

echo ""
echo "=== Checking if re-trigger output was captured ==="

# Look for the most recent session file
LATEST_JSON=$(ls -t logs/claude-session-*.json 2>/dev/null | head -1)

if [ -n "$LATEST_JSON" ]; then
    echo "Latest session file: $LATEST_JSON"
    echo "File size: $(wc -c < "$LATEST_JSON") bytes"
    echo ""
    echo "Number of session_id entries:"
    grep -o '"session_id"' "$LATEST_JSON" | wc -l
    echo ""
    echo "Unique session IDs:"
    grep -o '"session_id":"[^"]*"' "$LATEST_JSON" | sort -u
    echo ""
    echo "First 500 chars of file:"
    head -c 500 "$LATEST_JSON"
    echo ""
    echo ""
    echo "Last 500 chars of file:"
    tail -c 500 "$LATEST_JSON"
else
    echo "No session files found!"
fi

echo ""
echo "=== Checking console output for re-trigger ==="
grep -A5 "Re-triggering" test-output.log || echo "No re-trigger found in output"

echo ""
echo "=== Checking for output capture messages ==="
grep "Output captured:" test-output.log || echo "No capture messages found"

# Clean up
rm -f test-output.log