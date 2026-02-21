# Production Deployment Guide

This guide covers deploying CodeGoat to production with automatic database backups and monitoring.

## Quick Start (Automated)

**For a fully automated setup**, use the production setup script:

```bash
# Download or clone the repository
git clone <repository-url> /tmp/codegoat
cd /tmp/codegoat

# Run automated setup (requires root)
sudo bash scripts/setup-production.sh
```

This will automatically:
- ✅ Create service user
- ✅ Install dependencies
- ✅ Initialize database
- ✅ Configure automatic backups
- ✅ Create systemd services
- ✅ Verify installation

**After setup completes**, edit your API keys:
```bash
sudo nano /opt/codegoat/.env.production
# Add: OPENROUTER_API_KEY and OPENAI_API_KEY
```

Then start the service:
```bash
sudo systemctl start codegoat
sudo systemctl enable codegoat
```

For manual setup or troubleshooting, continue with the sections below.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Automated Setup](#automated-setup)
3. [Manual Setup](#manual-setup)
4. [Database Backup Configuration](#database-backup-configuration)
5. [Service Management](#service-management)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Security Considerations](#security-considerations)
8. [Helpful Scripts](#helpful-scripts)

## Prerequisites

- Linux server (Ubuntu 20.04+ or similar)
- Node.js 18+
- npm or yarn
- SQLite3
- systemd (for automatic backups)
- Sufficient disk space for backups (recommend 10x database size)

## Initial Setup

### 1. Create Application User

```bash
# Create dedicated user for the application
sudo useradd -r -m -s /bin/bash codegoat
sudo mkdir -p /opt/codegoat
sudo chown codegoat:codegoat /opt/codegoat
```

### 2. Deploy Application

```bash
# Switch to application user
sudo su - codegoat

# Clone or copy application
cd /opt/codegoat
git clone <repository-url> .

# Install dependencies
npm install --production

# Set up environment
cp .env.example .env
nano .env  # Configure environment variables
```

### 3. Configure Environment

Edit `/opt/codegoat/.env`:

```bash
# Database
KANBAN_DATABASE_URL="file:./prisma/kanban.db"

# Server
PORT=3000
NODE_ENV=production

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Backup
BACKUP_DIR=./backups
```

### 4. Initialize Database

```bash
# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Verify database
sqlite3 prisma/kanban.db "PRAGMA integrity_check;"
```

### 5. Create Initial Backup

```bash
# Create first backup
npm run backup:create "initial-deployment"

# Verify backup
npm run backup:verify-all
npm run backup:status
```

## Database Backup Configuration

### Option 1: systemd Timer (Recommended)

This provides the most reliable automatic backup solution for production.

#### 1. Install Service Files

```bash
# Copy service files (as root)
sudo cp deployment/database-backup.service /etc/systemd/system/
sudo cp deployment/database-backup.timer /etc/systemd/system/
```

#### 2. Configure Service

Edit `/etc/systemd/system/database-backup.service`:

```ini
[Unit]
Description=CodeGoat Database Backup Service
After=network.target

[Service]
Type=oneshot
User=codegoat
WorkingDirectory=/opt/codegoat
ExecStart=/usr/bin/npm run backup:scheduled:run
StandardOutput=journal
StandardError=journal
SyslogIdentifier=codegoat-backup

[Install]
WantedBy=multi-user.target
```

**Important**: Update `WorkingDirectory` to match your installation path!

#### 3. Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer (start on boot)
sudo systemctl enable database-backup.timer

# Start timer
sudo systemctl start database-backup.timer

# Verify timer is active
sudo systemctl status database-backup.timer
sudo systemctl list-timers database-backup.timer
```

#### 4. Test Backup

```bash
# Trigger backup manually
sudo systemctl start database-backup.service

# Check status
sudo systemctl status database-backup.service

# View logs
sudo journalctl -u database-backup.service -n 50
```

#### 5. Customize Schedule

To change backup frequency, edit `/etc/systemd/system/database-backup.timer`:

```ini
[Timer]
# Hourly (default)
OnCalendar=hourly

# Or daily at 2 AM
# OnCalendar=daily
# OnCalendar=02:00

# Or every 6 hours
# OnCalendar=*-*-* 00,06,12,18:00:00

# Or custom schedule (every 30 minutes)
# OnCalendar=*:0/30
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart database-backup.timer
```

### Option 2: Cron Job

Alternative for systems without systemd.

#### 1. Edit Crontab

```bash
# As application user
crontab -e
```

#### 2. Add Backup Job

```cron
# Backup every hour
0 * * * * cd /opt/codegoat && npm run backup:scheduled:run 2>&1 | logger -t codegoat-backup

# Or daily at 2 AM
# 0 2 * * * cd /opt/codegoat && npm run backup:scheduled:run 2>&1 | logger -t codegoat-backup

# Or every 6 hours
# 0 */6 * * * cd /opt/codegoat && npm run backup:scheduled:run 2>&1 | logger -t codegoat-backup
```

#### 3. Verify Cron Job

```bash
# List cron jobs
crontab -l

# Check cron logs
grep codegoat-backup /var/log/syslog
```

### Option 3: PM2 with Cron

If using PM2 for process management:

#### 1. Create PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'codegoat',
      script: './src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'codegoat-backup',
      script: 'npm',
      args: 'run backup:scheduled:run',
      cron_restart: '0 * * * *', // Every hour
      autorestart: false,
      watch: false,
    },
  ],
};
```

#### 2. Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Service Management

### systemd Commands

```bash
# Start/stop/restart service
sudo systemctl start database-backup.service
sudo systemctl stop database-backup.service
sudo systemctl restart database-backup.service

# Enable/disable timer
sudo systemctl enable database-backup.timer
sudo systemctl disable database-backup.timer

# Check status
sudo systemctl status database-backup.timer
sudo systemctl status database-backup.service

# View logs
sudo journalctl -u database-backup.service
sudo journalctl -u database-backup.service -f  # Follow logs

# List all timers
sudo systemctl list-timers

# Show next backup time
systemctl status database-backup.timer | grep Trigger
```

### Manual Backup Operations

```bash
# Create manual backup
npm run backup:create "before-update-v2.0"

# List backups
npm run backup:list

# Check status
npm run backup:status

# Verify backups
npm run backup:verify-all

# Clean up old backups
npm run backup:cleanup
```

## Monitoring and Maintenance

### Health Checks

Create a monitoring script `/opt/codegoat/scripts/health-check.sh`:

```bash
#!/bin/bash

# Check database integrity
echo "Checking database integrity..."
sqlite3 /opt/codegoat/prisma/kanban.db "PRAGMA integrity_check;" || exit 1

# Check backup age
echo "Checking backup age..."
LATEST_BACKUP=$(ls -t /opt/codegoat/backups/kanban-backup-auto-* 2>/dev/null | head -1)
if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backups found!"
    exit 1
fi

BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")))
MAX_AGE=$((2 * 60 * 60))  # 2 hours

if [ $BACKUP_AGE -gt $MAX_AGE ]; then
    echo "ERROR: Latest backup is too old (${BACKUP_AGE}s)"
    exit 1
fi

echo "Health check passed"
exit 0
```

Make executable:
```bash
chmod +x scripts/health-check.sh
```

### Monitoring with systemd

Add to `/etc/systemd/system/database-backup.service`:

```ini
[Service]
# Send notification on failure
OnFailure=backup-failure-notification.service

# Restart on failure
Restart=on-failure
RestartSec=300
```

Create notification service `/etc/systemd/system/backup-failure-notification.service`:

```ini
[Unit]
Description=Backup Failure Notification

[Service]
Type=oneshot
ExecStart=/usr/local/bin/notify-backup-failure.sh
```

### Disk Space Monitoring

```bash
# Check backup directory size
du -sh /opt/codegoat/backups

# Check available disk space
df -h /opt/codegoat

# Set up alert for low disk space
cat > /opt/codegoat/scripts/check-disk-space.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(df /opt/codegoat | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "WARNING: Disk usage at ${USAGE}%"
    # Send alert (email, slack, etc.)
fi
EOF

chmod +x scripts/check-disk-space.sh
```

### Log Monitoring

```bash
# View backup logs
sudo journalctl -u database-backup.service --since "1 hour ago"

# Monitor for errors
sudo journalctl -u database-backup.service -p err

# Export logs
sudo journalctl -u database-backup.service --since "7 days ago" > backup-logs.txt
```

### Backup Verification

Set up automatic backup verification:

```bash
# Add to crontab
0 3 * * * cd /opt/codegoat && npm run backup:verify-all 2>&1 | logger -t backup-verification
```

## Security Considerations

### File Permissions

```bash
# Set proper permissions
sudo chown -R codegoat:codegoat /opt/codegoat
sudo chmod 750 /opt/codegoat
sudo chmod 640 /opt/codegoat/.env
sudo chmod 640 /opt/codegoat/prisma/kanban.db
sudo chmod 750 /opt/codegoat/backups
sudo chmod 640 /opt/codegoat/backups/*.db
```

### Backup Encryption

For sensitive data, encrypt backups:

```bash
# Install gpg
sudo apt-get install gnupg

# Generate key
gpg --gen-key

# Encrypt backup
gpg --encrypt --recipient your-email@example.com \
  backups/kanban-backup-manual-2025-10-31T14-30-00-000Z.db

# Decrypt when needed
gpg --decrypt \
  backups/kanban-backup-manual-2025-10-31T14-30-00-000Z.db.gpg \
  > restored.db
```

### Remote Backup Storage

Copy backups to remote storage:

```bash
# Using rsync
rsync -avz --delete /opt/codegoat/backups/ \
  backup-server:/backups/codegoat/

# Using AWS S3
aws s3 sync /opt/codegoat/backups/ \
  s3://your-bucket/codegoat-backups/

# Using rclone (supports many cloud providers)
rclone sync /opt/codegoat/backups/ \
  remote:codegoat-backups/
```

Automate with cron:
```bash
# Daily at 3 AM
0 3 * * * rsync -avz /opt/codegoat/backups/ backup-server:/backups/codegoat/
```

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3000/tcp  # Application port
sudo ufw enable
```

## Helpful Scripts

This project includes several utility scripts to simplify production deployment and monitoring:

### Automated Production Setup

**Script**: `scripts/setup-production.sh`

Fully automates production deployment with a single command:

```bash
# Standard installation
sudo bash scripts/setup-production.sh

# Custom installation path
sudo INSTALL_PATH=/var/www/codegoat bash scripts/setup-production.sh

# Skip backup automation
sudo bash scripts/setup-production.sh --skip-backup

# Skip database initialization
sudo bash scripts/setup-production.sh --skip-db

# Show help
sudo bash scripts/setup-production.sh --help
```

**What it does:**
- ✅ Creates dedicated service user (`codegoat`)
- ✅ Installs application to `/opt/codegoat` (or custom path)
- ✅ Installs Node.js dependencies
- ✅ Initializes production database with Prisma migrations
- ✅ Creates initial database backup
- ✅ Installs systemd backup automation (timer + service)
- ✅ Creates application systemd service
- ✅ Verifies installation

**Environment Variables:**
- `INSTALL_PATH` - Installation directory (default: `/opt/codegoat`)
- `SERVICE_USER` - Service user name (default: `codegoat`)

**After running:**
1. Edit `/opt/codegoat/.env.production` to add API keys
2. Start service: `sudo systemctl start codegoat`
3. Enable on boot: `sudo systemctl enable codegoat`

### Backup System Verification

**Script**: `scripts/verify-backup-system.sh`

Verifies that the backup system is working correctly:

```bash
cd /opt/codegoat
bash scripts/verify-backup-system.sh
```

**What it checks:**
- ✅ Systemd timer is active and scheduled
- ✅ Backup directory exists and has backups
- ✅ Recent backups exist (< 2 hours old)
- ✅ Backup integrity (SQLite integrity check)
- ✅ Sufficient disk space available (> 1GB)
- ✅ Recent backup logs from systemd journal

**Exit codes:**
- `0` - All checks passed
- `1` - Critical issues detected

### Production Health Check

**Script**: `scripts/production-health-check.sh`

Comprehensive health check for production deployment:

```bash
cd /opt/codegoat
bash scripts/production-health-check.sh

# With custom API URL
API_URL=http://localhost:8080 bash scripts/production-health-check.sh
```

**What it checks:**

**Application:**
- ✅ Service status and uptime
- ✅ Process status (CPU, memory usage)
- ✅ API endpoint health checks

**Database:**
- ✅ Database file exists
- ✅ Database integrity (PRAGMA integrity_check)
- ✅ Table count validation

**Backup System:**
- ✅ Backup timer active
- ✅ Recent backups exist (< 24 hours)
- ✅ Backup count verification

**System Resources:**
- ✅ Disk space (> 1GB available)
- ✅ Memory usage (< 80%)
- ✅ System load average
- ✅ Log file size

**Configuration:**
- ✅ Environment file exists
- ✅ Required variables configured
- ✅ NODE_ENV set to production

**Exit codes:**
- `0` - All systems operational (warnings OK)
- `1` - Critical issues detected

**Summary output:**
```
  Passed:   15
  Warnings: 2
  Failed:   0
```

### Production Deployment Checklist

**Document**: `deployment/PRODUCTION-CHECKLIST.md`

Step-by-step checklist for production deployment:

```bash
# View the checklist
cat deployment/PRODUCTION-CHECKLIST.md

# Or open in editor
nano deployment/PRODUCTION-CHECKLIST.md
```

**Sections:**
1. **Pre-Deployment** - Prerequisites and preparation
2. **Deployment Steps** - File transfer, setup, configuration
3. **Post-Deployment** - Verification and monitoring
4. **Monitoring Setup** - Log rotation, health checks, alerting
5. **Security** - Permissions, firewall, API keys
6. **Rollback Plan** - Emergency procedures
7. **Sign-off** - Documentation and handoff

Use this checklist to ensure all deployment steps are completed and verified.

### Automated Workflow Example

Complete deployment from scratch:

```bash
# 1. Clone repository
git clone <repository-url> /tmp/codegoat
cd /tmp/codegoat

# 2. Run automated setup (as root)
sudo bash scripts/setup-production.sh

# 3. Configure API keys
sudo nano /opt/codegoat/.env.production
# Add: OPENROUTER_API_KEY and OPENAI_API_KEY

# 4. Start application
sudo systemctl start codegoat
sudo systemctl enable codegoat

# 5. Verify backup system
cd /opt/codegoat
bash scripts/verify-backup-system.sh

# 6. Run health check
bash scripts/production-health-check.sh

# 7. Monitor logs
sudo journalctl -u codegoat -f
```

## Troubleshooting

### Backup Not Running

```bash
# Check timer status
sudo systemctl status database-backup.timer

# Check service status
sudo systemctl status database-backup.service

# View recent logs
sudo journalctl -u database-backup.service -n 100

# Test manually
sudo systemctl start database-backup.service

# Check timer schedule
systemctl list-timers --all
```

### Permission Errors

```bash
# Fix ownership
sudo chown -R codegoat:codegoat /opt/codegoat

# Fix permissions
sudo chmod 750 /opt/codegoat/backups
sudo chmod 640 /opt/codegoat/backups/*.db
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Check backup directory
du -sh /opt/codegoat/backups

# Clean up old backups
cd /opt/codegoat
npm run backup:cleanup

# Remove old logs
find /opt/codegoat/logs -name "*.log" -mtime +30 -delete
```

## Additional Resources

- [Database Management Guide](../docs/database-management.md)
- [Backup System Documentation](../docs/backup-system.md)
- [systemd Timer Documentation](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

## Support

For deployment issues:
1. Check systemd logs: `sudo journalctl -u database-backup.service`
2. Verify backup status: `npm run backup:status`
3. Test manual backup: `npm run backup:create "test"`
4. Review this guide for common problems
5. Report issues at https://github.com/anthropics/claude-code/issues
