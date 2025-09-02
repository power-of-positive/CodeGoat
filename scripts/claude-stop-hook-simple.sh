#!/bin/bash

# Simple Claude Code Stop Hook - Checks uncommitted files FIRST
# This bypasses the complex validation pipeline to ensure uncommitted files are always checked

set -e

# Redirect logging to stderr, keep stdout for JSON response
exec 3>&1
exec 1>&2

echo "🔍 Simple stop hook - checking for uncommitted files..."

# Change to project directory
cd "/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat"

# Check for uncommitted files FIRST
if [[ -n $(git status --porcelain) ]]; then
    echo "❌ Uncommitted files detected:"
    git status --short
    echo "📝 Please commit your changes before stopping Claude Code"
    
    # Return block decision to stdout
    printf '{"decision": "block", "reason": "Uncommitted files detected - please commit changes before stopping"}' >&3
    exit 2
fi

echo "✅ No uncommitted files - allowing completion"
printf '{"decision": "approve"}' >&3
exit 0