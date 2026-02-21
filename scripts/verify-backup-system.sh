#!/bin/bash

##############################################################################
# Backup System Verification Script
#
# This script verifies that the backup system is working correctly:
# - Checks systemd timer is active
# - Verifies recent backups exist
# - Tests backup integrity
# - Checks disk space
# - Validates backup age
#
# Usage: bash scripts/verify-backup-system.sh
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MAX_BACKUP_AGE_HOURS=2
MIN_BACKUPS=1
MIN_DISK_SPACE_MB=1000

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

echo "═══════════════════════════════════════════════════════════════"
echo "         Backup System Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test 1: Check systemd timer
log_info "Checking systemd backup timer..."
if systemctl is-active --quiet database-backup.timer 2>/dev/null; then
    log_success "Systemd timer is active"

    # Show next scheduled backup
    NEXT_BACKUP=$(systemctl status database-backup.timer 2>/dev/null | grep "Trigger:" | awk '{print $2, $3, $4}')
    log_info "Next backup scheduled: $NEXT_BACKUP"
else
    log_warning "Systemd timer not active or not installed"
    log_info "Run: sudo systemctl start database-backup.timer"
fi

echo ""

# Test 2: Check backup directory
log_info "Checking backup directory..."
BACKUP_DIR="./backups"

if [[ ! -d "$BACKUP_DIR" ]]; then
    log_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

log_success "Backup directory exists"

# Count backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.db" -type f 2>/dev/null | wc -l)
log_info "Found $BACKUP_COUNT backup files"

if [[ $BACKUP_COUNT -lt $MIN_BACKUPS ]]; then
    log_warning "Less than $MIN_BACKUPS backups found"
else
    log_success "Sufficient backups available"
fi

echo ""

# Test 3: Check recent backup
log_info "Checking for recent backups..."
LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*backup-auto-*.db" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | awk '{print $2}')

if [[ -z "$LATEST_BACKUP" ]]; then
    log_warning "No automatic backups found"
else
    log_success "Latest backup: $(basename "$LATEST_BACKUP")"

    # Check backup age
    BACKUP_AGE_SECONDS=$(($(date +%s) - $(stat -f %m "$LATEST_BACKUP" 2>/dev/null || stat -c %Y "$LATEST_BACKUP")))
    BACKUP_AGE_HOURS=$((BACKUP_AGE_SECONDS / 3600))

    if [[ $BACKUP_AGE_HOURS -gt $MAX_BACKUP_AGE_HOURS ]]; then
        log_warning "Latest backup is $BACKUP_AGE_HOURS hours old (expected < $MAX_BACKUP_AGE_HOURS hours)"
    else
        log_success "Backup is recent (${BACKUP_AGE_HOURS} hours old)"
    fi
fi

echo ""

# Test 4: Verify backup integrity
log_info "Verifying backup integrity..."

if [[ -n "$LATEST_BACKUP" ]]; then
    if sqlite3 "$LATEST_BACKUP" "PRAGMA integrity_check;" | grep -q "ok"; then
        log_success "Backup integrity check passed"
    else
        log_error "Backup integrity check failed!"
        exit 1
    fi
else
    log_warning "No backup to verify"
fi

echo ""

# Test 5: Check disk space
log_info "Checking disk space..."

BACKUP_SIZE=$(du -sm "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
AVAILABLE_SPACE=$(df -m "$BACKUP_DIR" | tail -1 | awk '{print $4}')

log_info "Backup directory size: ${BACKUP_SIZE}MB"
log_info "Available disk space: ${AVAILABLE_SPACE}MB"

if [[ $AVAILABLE_SPACE -lt $MIN_DISK_SPACE_MB ]]; then
    log_warning "Low disk space (< ${MIN_DISK_SPACE_MB}MB available)"
    log_info "Consider cleaning old backups: npm run backup:cleanup"
else
    log_success "Sufficient disk space available"
fi

echo ""

# Test 6: Check backup logs
log_info "Checking recent backup logs..."

if command -v journalctl &>/dev/null; then
    RECENT_LOGS=$(journalctl -u database-backup.service --since "24 hours ago" 2>/dev/null | grep -E "(started|completed|failed)" | tail -5)

    if [[ -n "$RECENT_LOGS" ]]; then
        echo "$RECENT_LOGS"
    else
        log_info "No recent backup logs found"
    fi
fi

echo ""

# Test 7: List recent backups
log_info "Recent backups:"
npm run backup:list 2>/dev/null | tail -10

echo ""

# Summary
echo "═══════════════════════════════════════════════════════════════"
log_success "Backup system verification complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  • Backup count: $BACKUP_COUNT"
echo "  • Backup directory: $BACKUP_DIR (${BACKUP_SIZE}MB)"
echo "  • Available space: ${AVAILABLE_SPACE}MB"
echo ""
echo "Commands:"
echo "  • Create backup: npm run backup:create 'description'"
echo "  • List backups: npm run backup:list"
echo "  • Check status: npm run backup:status"
echo "  • View logs: sudo journalctl -u database-backup.service -n 50"
echo ""
