#!/bin/bash

##############################################################################
# Production Health Check Script
#
# Comprehensive health check for CodeGoat production deployment:
# - Application status
# - Database connectivity
# - Backup system
# - Disk space
# - Memory usage
# - Log errors
# - API endpoints
#
# Usage: bash scripts/production-health-check.sh
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
MIN_DISK_SPACE_MB=1000
MAX_MEMORY_PERCENT=80

# Counters
PASSED=0
FAILED=0
WARNINGS=0

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; ((PASSED++)); }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; ((WARNINGS++)); }
log_error() { echo -e "${RED}[✗]${NC} $1"; ((FAILED++)); }
log_section() { echo -e "\n${CYAN}══ $1 ══${NC}"; }

echo "═══════════════════════════════════════════════════════════════"
echo "         CodeGoat Production Health Check"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test 1: Application Service
log_section "Application Service"

if systemctl is-active --quiet codegoat 2>/dev/null; then
    log_success "Application service is running"

    # Check uptime
    UPTIME=$(systemctl show codegoat --property=ActiveEnterTimestamp --value 2>/dev/null)
    if [[ -n "$UPTIME" ]]; then
        log_info "Started: $UPTIME"
    fi
else
    log_error "Application service is not running"
    log_info "Start with: sudo systemctl start codegoat"
fi

# Test 2: Database
log_section "Database"

DB_PATH="./prisma/kanban-prod.db"
if [[ -f "$DB_PATH" ]]; then
    log_success "Database file exists"

    # Check size
    DB_SIZE=$(du -h "$DB_PATH" | awk '{print $1}')
    log_info "Database size: $DB_SIZE"

    # Check integrity
    if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null | grep -q "ok"; then
        log_success "Database integrity check passed"
    else
        log_error "Database integrity check failed"
    fi

    # Check table count
    TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null)
    log_info "Database tables: $TABLE_COUNT"
else
    log_error "Database file not found: $DB_PATH"
fi

# Test 3: Backup System
log_section "Backup System"

if systemctl is-active --quiet database-backup.timer 2>/dev/null; then
    log_success "Backup timer is active"

    # Check recent backups
    BACKUP_COUNT=$(find ./backups -name "*backup-auto-*.db" -type f -mtime -1 2>/dev/null | wc -l)
    if [[ $BACKUP_COUNT -gt 0 ]]; then
        log_success "Recent backups found ($BACKUP_COUNT in last 24h)"
    else
        log_warning "No backups in last 24 hours"
    fi
else
    log_warning "Backup timer not active"
fi

# Test 4: Disk Space
log_section "Disk Space"

DISK_USAGE=$(df -m . | tail -1)
AVAILABLE_MB=$(echo "$DISK_USAGE" | awk '{print $4}')
USED_PERCENT=$(echo "$DISK_USAGE" | awk '{print $5}' | tr -d '%')

log_info "Available: ${AVAILABLE_MB}MB"
log_info "Used: ${USED_PERCENT}%"

if [[ $AVAILABLE_MB -lt $MIN_DISK_SPACE_MB ]]; then
    log_warning "Low disk space (< ${MIN_DISK_SPACE_MB}MB)"
elif [[ $USED_PERCENT -gt 90 ]]; then
    log_warning "High disk usage (> 90%)"
else
    log_success "Disk space adequate"
fi

# Test 5: Memory Usage
log_section "Memory Usage"

if command -v free &>/dev/null; then
    MEM_INFO=$(free | grep Mem)
    TOTAL_MEM=$(echo "$MEM_INFO" | awk '{print $2}')
    USED_MEM=$(echo "$MEM_INFO" | awk '{print $3}')
    MEM_PERCENT=$((USED_MEM * 100 / TOTAL_MEM))

    log_info "Memory usage: ${MEM_PERCENT}%"

    if [[ $MEM_PERCENT -gt $MAX_MEMORY_PERCENT ]]; then
        log_warning "High memory usage (> ${MAX_MEMORY_PERCENT}%)"
    else
        log_success "Memory usage normal"
    fi
fi

# Test 6: Application Process
log_section "Application Process"

if pgrep -f "node.*codegoat" > /dev/null 2>&1; then
    log_success "Application process found"

    # Get process info
    PID=$(pgrep -f "node.*codegoat" | head -1)
    if [[ -n "$PID" ]]; then
        CPU=$(ps -p "$PID" -o %cpu= 2>/dev/null | tr -d ' ')
        MEM=$(ps -p "$PID" -o %mem= 2>/dev/null | tr -d ' ')
        log_info "PID: $PID | CPU: ${CPU}% | Memory: ${MEM}%"
    fi
else
    log_error "Application process not found"
fi

# Test 7: API Endpoints
log_section "API Endpoints"

# Check if curl is available
if command -v curl &>/dev/null; then
    # Test health endpoint
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")

    if [[ "$HTTP_CODE" == "200" ]]; then
        log_success "API health endpoint responding"
    else
        log_error "API health endpoint not responding (HTTP $HTTP_CODE)"
    fi

    # Test API root
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/settings" 2>/dev/null || echo "000")

    if [[ "$HTTP_CODE" == "200" ]]; then
        log_success "API endpoints accessible"
    else
        log_warning "API endpoints may not be accessible (HTTP $HTTP_CODE)"
    fi
else
    log_info "curl not available - skipping API tests"
fi

# Test 8: Log Files
log_section "Log Files"

LOG_DIR="./logs"
if [[ -d "$LOG_DIR" ]]; then
    log_success "Log directory exists"

    # Check for recent errors
    if [[ -f "$LOG_DIR/app.log" ]]; then
        RECENT_ERRORS=$(grep -i "error" "$LOG_DIR/app.log" 2>/dev/null | tail -5 | wc -l)
        if [[ $RECENT_ERRORS -gt 0 ]]; then
            log_warning "Found $RECENT_ERRORS recent errors in logs"
            log_info "Check: tail -f $LOG_DIR/app.log"
        else
            log_success "No recent errors in logs"
        fi
    fi

    # Check log size
    LOG_SIZE=$(du -sm "$LOG_DIR" 2>/dev/null | awk '{print $1}')
    if [[ $LOG_SIZE -gt 100 ]]; then
        log_warning "Log directory is large (${LOG_SIZE}MB)"
        log_info "Consider running: npm run logs:clean:optimized"
    else
        log_info "Log directory size: ${LOG_SIZE}MB"
    fi
else
    log_warning "Log directory not found"
fi

# Test 9: Environment Configuration
log_section "Environment Configuration"

if [[ -f ".env.production" ]]; then
    log_success "Production environment file exists"

    # Check for required variables (without showing values)
    if grep -q "^DATABASE_URL=" .env.production 2>/dev/null; then
        log_success "DATABASE_URL configured"
    else
        log_error "DATABASE_URL not configured"
    fi

    if grep -q "^NODE_ENV=production" .env.production 2>/dev/null; then
        log_success "NODE_ENV set to production"
    else
        log_warning "NODE_ENV not set to production"
    fi
else
    log_error "Production environment file not found"
fi

# Test 10: System Load
log_section "System Load"

if command -v uptime &>/dev/null; then
    LOAD=$(uptime | awk -F'load average:' '{print $2}')
    log_info "System load:$LOAD"

    LOAD_1MIN=$(echo "$LOAD" | awk -F',' '{print $1}' | tr -d ' ')
    if (( $(echo "$LOAD_1MIN > $(nproc)" | bc -l 2>/dev/null || echo "0") )); then
        log_warning "High system load"
    else
        log_success "System load normal"
    fi
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "         Health Check Summary"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo ""

if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}⚠️  CRITICAL ISSUES DETECTED${NC}"
    echo ""
    echo "Recommended actions:"
    echo "  1. Check service status: sudo systemctl status codegoat"
    echo "  2. View logs: sudo journalctl -u codegoat -n 100"
    echo "  3. Check disk space: df -h"
    echo "  4. Verify database: sqlite3 prisma/kanban-prod.db 'PRAGMA integrity_check;'"
    echo ""
    exit 1
elif [[ $WARNINGS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Warnings detected - review recommended${NC}"
    echo ""
    exit 0
else
    echo -e "${GREEN}✅ All systems operational${NC}"
    echo ""
    exit 0
fi
