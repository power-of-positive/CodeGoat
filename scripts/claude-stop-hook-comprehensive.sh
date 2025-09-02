#!/bin/bash

# Robust Claude Code Stop Hook - Calls the simple TypeScript validation
# This script is a wrapper that calls the simple TypeScript validation

set -e

# Change to project directory
PROJECT_DIR="/Users/rustameynaliyev/Scientist/Research/personal_projects/codegoat"
cd "$PROJECT_DIR"

# Colors for logging
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔥 Starting comprehensive Claude Code validation pipeline...${NC}" >&2

# Call the comprehensive validation runner that runs ALL stages
npx tsx scripts/run-all-validation.ts