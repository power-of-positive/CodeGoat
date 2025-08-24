#!/bin/bash

# Claude Supervisor Wrapper Script
# Usage: ./scripts/run-supervised-claude.sh [prompt|--interactive] [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
MAX_ATTEMPTS=10
TIMEOUT_MINUTES=30
INTERACTIVE=false
PROMPT=""

# Function to show usage
show_usage() {
    echo -e "${BLUE}🎯 Claude Supervisor Wrapper${NC}"
    echo ""
    echo "Usage:"
    echo "  $0 \"Your prompt here\" [--max-attempts N] [--timeout N]"
    echo "  $0 --interactive [options]"
    echo "  $0 --preset PRESET_NAME [options]"
    echo ""
    echo "Presets:"
    echo "  fix-tests           - Fix all failing tests"
    echo "  increase-coverage   - Increase test coverage to 80%"
    echo "  fix-validation      - Fix all validation issues"
    echo "  complete-tasks      - Complete all remaining tasks"
    echo ""
    echo "Options:"
    echo "  --interactive       Start in interactive mode"
    echo "  --max-attempts N    Maximum retry attempts (default: 10)"
    echo "  --timeout N         Session timeout in minutes (default: 30)"
    echo "  --help              Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 \"Fix all failing tests and ensure validation passes\""
    echo "  $0 --preset fix-tests --max-attempts 15"
    echo "  $0 --interactive"
}

# Function to get preset prompt
get_preset_prompt() {
    local preset=$1
    case $preset in
        fix-tests)
            echo "Fix all failing tests and ensure they pass. Focus on TypeScript errors, missing imports, and test configuration issues. Do not stop until all validation stages are green."
            ;;
        increase-coverage)
            echo "Increase test coverage to 80% and ensure all tests still pass. Add comprehensive tests for uncovered code paths. Fix any issues that arise during testing."
            ;;
        fix-validation)
            echo "Fix all validation pipeline issues including linting errors, type checking failures, and test failures. Ensure complete validation success before stopping."
            ;;
        complete-tasks)
            echo "Complete all remaining tasks in the todo list and ensure all validation stages pass. Work systematically through each task."
            ;;
        *)
            echo -e "${RED}❌ Unknown preset: $preset${NC}" >&2
            echo "Available presets: fix-tests, increase-coverage, fix-validation, complete-tasks" >&2
            exit 1
            ;;
    esac
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_usage
            exit 0
            ;;
        --interactive)
            INTERACTIVE=true
            shift
            ;;
        --preset)
            PROMPT=$(get_preset_prompt "$2")
            shift 2
            ;;
        --max-attempts)
            MAX_ATTEMPTS="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT_MINUTES="$2"
            shift 2
            ;;
        --*)
            echo -e "${RED}❌ Unknown option: $1${NC}" >&2
            show_usage >&2
            exit 1
            ;;
        *)
            if [[ -z "$PROMPT" ]]; then
                PROMPT="$1"
            else
                echo -e "${RED}❌ Multiple prompts provided${NC}" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

# Validate arguments
if [[ "$INTERACTIVE" == "false" && -z "$PROMPT" ]]; then
    echo -e "${RED}❌ No prompt provided and not in interactive mode${NC}" >&2
    show_usage >&2
    exit 1
fi

# Change to project directory
cd "$PROJECT_ROOT"

# Ensure log directory exists
mkdir -p logs/supervisor

# Build arguments for the TypeScript script
ARGS=()

if [[ "$INTERACTIVE" == "true" ]]; then
    ARGS+=(--interactive)
elif [[ -n "$PROMPT" ]]; then
    ARGS+=("$PROMPT")
fi

ARGS+=(--max-attempts "$MAX_ATTEMPTS")
ARGS+=(--timeout "$TIMEOUT_MINUTES")

# Show configuration
echo -e "${BLUE}🎯 Claude Supervisor Configuration:${NC}"
echo -e "  Max Attempts: ${YELLOW}$MAX_ATTEMPTS${NC}"
echo -e "  Timeout: ${YELLOW}${TIMEOUT_MINUTES}m${NC}"
echo -e "  Interactive: ${YELLOW}$INTERACTIVE${NC}"
echo -e "  Working Dir: ${YELLOW}$PROJECT_ROOT${NC}"
if [[ -n "$PROMPT" ]]; then
    echo -e "  Prompt: ${YELLOW}${PROMPT:0:80}...${NC}"
fi
echo ""

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found${NC}" >&2
    echo "Please ensure Node.js and npm are installed" >&2
    exit 1
fi

# Check if @anthropic-ai/claude-code is available
if ! npx @anthropic-ai/claude-code@latest --version &> /dev/null; then
    echo -e "${RED}❌ @anthropic-ai/claude-code not available${NC}" >&2
    echo "Please ensure @anthropic-ai/claude-code is installed" >&2
    exit 1
fi

if [[ ! -f "scripts/claude-stop-hook.ts" ]]; then
    echo -e "${RED}❌ Validation hook not found${NC}" >&2
    echo "scripts/claude-stop-hook.ts is required for validation" >&2
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Set up signal handling for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}🛑 Received interrupt signal, shutting down...${NC}"
    # The TypeScript process will handle its own cleanup
    exit 130
}
trap cleanup SIGINT SIGTERM

# Run the supervisor
echo -e "${GREEN}🚀 Starting Claude Supervisor...${NC}"
echo -e "${YELLOW}💡 Tip: In interactive mode, type 'help' for commands${NC}"
echo ""

# Execute the TypeScript supervisor
exec npx ts-node scripts/claude-supervisor.ts "${ARGS[@]}"