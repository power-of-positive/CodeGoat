#!/bin/bash

##############################################################################
# Production Setup Script for CodeGoat
#
# This script sets up the production environment including:
# - Database initialization
# - Environment configuration
# - Automatic backup system
# - Service verification
#
# Usage: sudo bash scripts/setup-production.sh [options]
#
# Options:
#   --skip-backup    Skip backup system installation
#   --skip-db        Skip database initialization
#   --help          Show this help message
##############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INSTALL_USER="${SUDO_USER:-$(whoami)}"
SKIP_BACKUP=false
SKIP_DB=false

# Default installation paths (can be customized)
INSTALL_PATH="${INSTALL_PATH:-/opt/codegoat}"
SERVICE_USER="${SERVICE_USER:-codegoat}"

##############################################################################
# Helper Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_dependencies() {
    log_info "Checking dependencies..."

    local missing_deps=()

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node (v18+)")
    else
        local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -lt 18 ]]; then
            missing_deps+=("node v18+ (current: v$node_version)")
        fi
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    fi

    # Check SQLite
    if ! command -v sqlite3 &> /dev/null; then
        missing_deps+=("sqlite3")
    fi

    # Check systemd (for backup automation)
    if [[ "$SKIP_BACKUP" == false ]] && ! command -v systemctl &> /dev/null; then
        log_warning "systemd not found - backup automation will be skipped"
        SKIP_BACKUP=true
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies and try again"
        exit 1
    fi

    log_success "All dependencies satisfied"
}

create_service_user() {
    log_info "Creating service user: $SERVICE_USER"

    if id "$SERVICE_USER" &>/dev/null; then
        log_info "User $SERVICE_USER already exists"
    else
        useradd -r -m -s /bin/bash "$SERVICE_USER"
        log_success "Created user $SERVICE_USER"
    fi
}

setup_installation_directory() {
    log_info "Setting up installation directory: $INSTALL_PATH"

    # Create directory if it doesn't exist
    mkdir -p "$INSTALL_PATH"

    # Copy files if not already in install path
    if [[ "$PROJECT_ROOT" != "$INSTALL_PATH" ]]; then
        log_info "Copying files to $INSTALL_PATH..."
        rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'dist' \
              "$PROJECT_ROOT/" "$INSTALL_PATH/"
        log_success "Files copied"
    fi

    # Set ownership
    chown -R "$SERVICE_USER:$SERVICE_USER" "$INSTALL_PATH"
    log_success "Ownership set to $SERVICE_USER"
}

setup_environment() {
    log_info "Setting up production environment..."

    local env_file="$INSTALL_PATH/.env.production"

    if [[ -f "$env_file" ]]; then
        log_warning "Production .env already exists, skipping"
        return
    fi

    # Copy template
    cp "$INSTALL_PATH/.env.production.example" "$env_file"

    log_info "Please edit $env_file to add your API keys:"
    log_info "  - OPENROUTER_API_KEY"
    log_info "  - OPENAI_API_KEY"

    # Set permissions
    chmod 640 "$env_file"
    chown "$SERVICE_USER:$SERVICE_USER" "$env_file"

    log_success "Environment file created: $env_file"
}

install_dependencies() {
    log_info "Installing Node.js dependencies..."

    cd "$INSTALL_PATH"

    # Install as service user
    su - "$SERVICE_USER" -c "cd $INSTALL_PATH && npm install --production"

    log_success "Dependencies installed"
}

initialize_database() {
    if [[ "$SKIP_DB" == true ]]; then
        log_info "Skipping database initialization"
        return
    fi

    log_info "Initializing production database..."

    cd "$INSTALL_PATH"

    # Set production database URL
    export DATABASE_URL="file:./prisma/kanban-prod.db"
    export KANBAN_DATABASE_URL="$DATABASE_URL"

    # Run migrations as service user
    su - "$SERVICE_USER" -c "cd $INSTALL_PATH && export DATABASE_URL='file:./prisma/kanban-prod.db' && npx prisma migrate deploy"

    # Generate Prisma client
    su - "$SERVICE_USER" -c "cd $INSTALL_PATH && npx prisma generate"

    # Verify database
    su - "$SERVICE_USER" -c "cd $INSTALL_PATH && sqlite3 prisma/kanban-prod.db 'PRAGMA integrity_check;'"

    log_success "Database initialized"

    # Create initial backup
    log_info "Creating initial backup..."
    su - "$SERVICE_USER" -c "cd $INSTALL_PATH && npm run backup:create 'initial-production-setup'"

    log_success "Initial backup created"
}

install_backup_automation() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log_info "Skipping backup automation setup"
        return
    fi

    log_info "Installing backup automation..."

    # Update service file with actual paths
    local service_file="$INSTALL_PATH/deployment/database-backup.service"
    local timer_file="$INSTALL_PATH/deployment/database-backup.timer"

    # Create temporary service file with actual paths
    sed "s|WorkingDirectory=.*|WorkingDirectory=$INSTALL_PATH|g" "$service_file" > /tmp/database-backup.service
    sed "s|User=.*|User=$SERVICE_USER|g" /tmp/database-backup.service > /tmp/database-backup.service.tmp
    mv /tmp/database-backup.service.tmp /tmp/database-backup.service

    # Copy to systemd
    cp /tmp/database-backup.service /etc/systemd/system/
    cp "$timer_file" /etc/systemd/system/

    # Reload systemd
    systemctl daemon-reload

    # Enable and start timer
    systemctl enable database-backup.timer
    systemctl start database-backup.timer

    log_success "Backup automation installed and started"

    # Show status
    log_info "Backup timer status:"
    systemctl status database-backup.timer --no-pager | head -10

    # Test backup
    log_info "Testing backup system..."
    systemctl start database-backup.service

    # Wait a moment for backup to complete
    sleep 2

    # Check if backup was created
    if su - "$SERVICE_USER" -c "cd $INSTALL_PATH && npm run backup:list | tail -1 | grep -q 'scheduled'"; then
        log_success "Backup system test passed"
    else
        log_warning "Backup system test failed - please check logs: journalctl -u database-backup.service"
    fi
}

create_application_service() {
    log_info "Creating application systemd service..."

    cat > /etc/systemd/system/codegoat.service <<EOF
[Unit]
Description=CodeGoat AI Proxy Server
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_PATH
EnvironmentFile=$INSTALL_PATH/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=codegoat

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_PATH
ReadWritePaths=$INSTALL_PATH/logs
ReadWritePaths=$INSTALL_PATH/prisma
ReadWritePaths=$INSTALL_PATH/backups

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    log_success "Application service created"
}

show_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    log_success "Production setup complete!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "📍 Installation Path: $INSTALL_PATH"
    echo "👤 Service User: $SERVICE_USER"
    echo "💾 Database: $INSTALL_PATH/prisma/kanban-prod.db"
    echo "📦 Backups: $INSTALL_PATH/backups/"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Edit configuration file:"
    echo "   sudo nano $INSTALL_PATH/.env.production"
    echo "   - Add your OPENROUTER_API_KEY"
    echo "   - Add your OPENAI_API_KEY"
    echo ""
    echo "2. Start the application:"
    echo "   sudo systemctl start codegoat"
    echo "   sudo systemctl enable codegoat  # Start on boot"
    echo ""
    echo "3. Check application status:"
    echo "   sudo systemctl status codegoat"
    echo "   sudo journalctl -u codegoat -f  # Follow logs"
    echo ""
    echo "4. Verify backup system:"
    echo "   sudo systemctl status database-backup.timer"
    echo "   sudo journalctl -u database-backup.service"
    echo ""
    echo "5. Manual backup commands:"
    echo "   cd $INSTALL_PATH"
    echo "   sudo -u $SERVICE_USER npm run backup:create 'description'"
    echo "   sudo -u $SERVICE_USER npm run backup:list"
    echo "   sudo -u $SERVICE_USER npm run backup:status"
    echo ""
    echo "📚 Documentation:"
    echo "   - Deployment: $INSTALL_PATH/deployment/README.md"
    echo "   - Database: $INSTALL_PATH/docs/database-management.md"
    echo "   - Backups: $INSTALL_PATH/docs/backup-system.md"
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
}

show_help() {
    cat << EOF
Production Setup Script for CodeGoat

Usage: sudo bash scripts/setup-production.sh [options]

Options:
  --skip-backup       Skip backup system installation
  --skip-db           Skip database initialization
  --install-path PATH Custom installation path (default: /opt/codegoat)
  --service-user USER Custom service user (default: codegoat)
  --help             Show this help message

Examples:
  # Standard installation
  sudo bash scripts/setup-production.sh

  # Custom installation path
  sudo INSTALL_PATH=/var/www/codegoat bash scripts/setup-production.sh

  # Skip backup automation
  sudo bash scripts/setup-production.sh --skip-backup

Environment Variables:
  INSTALL_PATH    Installation directory (default: /opt/codegoat)
  SERVICE_USER    Service user name (default: codegoat)

EOF
}

##############################################################################
# Main Script
##############################################################################

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --install-path)
                INSTALL_PATH="$2"
                shift 2
                ;;
            --service-user)
                SERVICE_USER="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    echo "═══════════════════════════════════════════════════════════════"
    echo "         CodeGoat Production Setup"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    # Run setup steps
    check_root
    check_dependencies
    create_service_user
    setup_installation_directory
    setup_environment
    install_dependencies
    initialize_database
    install_backup_automation
    create_application_service

    # Show summary
    show_summary
}

# Run main function
main "$@"
