# Production Deployment Checklist

**Project**: CodeGoat AI Proxy Server
**Version**: 1.0.0
**Date**: ___________
**Deploy By**: ___________

---

## Pre-Deployment Checklist

### 1. Server Preparation ✓

- [ ] Server meets minimum requirements:
  - [ ] Ubuntu 20.04+ or similar Linux distribution
  - [ ] Node.js 18+ installed
  - [ ] npm installed
  - [ ] SQLite3 installed
  - [ ] systemd available
  - [ ] Minimum 2GB RAM
  - [ ] Minimum 10GB disk space
- [ ] Server has internet connectivity
- [ ] SSH access configured
- [ ] Firewall configured (if applicable)

### 2. Prerequisites Installation ✓

```bash
# Check Node.js version (require 18+)
node --version

# Check npm
npm --version

# Check SQLite
sqlite3 --version

# Check systemd
systemctl --version
```

### 3. Code Preparation ✓

- [ ] Latest code pulled from repository
- [ ] All tests passing locally:
  - [ ] `npm run lint` ✓
  - [ ] `npm run type-check` ✓
  - [ ] `npm test` ✓
- [ ] Dependencies up to date
- [ ] Database migrations ready
- [ ] Documentation reviewed

---

## Deployment Steps

### Step 1: Transfer Files

**Option A: Git Clone (Recommended)**
```bash
cd /tmp
git clone <repository-url> codegoat
cd codegoat
```

**Option B: SCP Transfer**
```bash
# On local machine
tar czf codegoat.tar.gz --exclude=node_modules --exclude=.git .
scp codegoat.tar.gz user@server:/tmp/
```

- [ ] Files transferred successfully
- [ ] Correct branch/tag deployed

### Step 2: Run Automated Setup

```bash
cd /tmp/codegoat
sudo bash scripts/setup-production.sh
```

**Checklist during setup:**
- [ ] Service user created (`codegoat`)
- [ ] Files copied to `/opt/codegoat`
- [ ] Dependencies installed
- [ ] Database initialized
- [ ] Backup system installed
- [ ] Application service created

**Expected Output:**
```
✓ Service user created
✓ Files copied to /opt/codegoat
✓ Dependencies installed
✓ Database initialized
✓ Initial backup created
✓ Backup automation installed
✓ Application service created
```

### Step 3: Configure Environment

```bash
sudo nano /opt/codegoat/.env.production
```

**Required Configuration:**
- [ ] `NODE_ENV=production` ✓
- [ ] `PORT=3000` (or your port) ✓
- [ ] `DATABASE_URL` configured ✓
- [ ] `OPENROUTER_API_KEY` added 🔑
- [ ] `OPENAI_API_KEY` added 🔑
- [ ] `LOG_LEVEL=info` ✓

**Verify configuration:**
```bash
# Check file exists
ls -la /opt/codegoat/.env.production

# Verify permissions (should be 640)
stat -c %a /opt/codegoat/.env.production

# Verify ownership (should be codegoat:codegoat)
ls -l /opt/codegoat/.env.production
```

- [ ] Environment file configured
- [ ] API keys added
- [ ] File permissions correct (640)
- [ ] File ownership correct

### Step 4: Start Application

```bash
# Start application service
sudo systemctl start codegoat

# Enable start on boot
sudo systemctl enable codegoat

# Check status
sudo systemctl status codegoat
```

- [ ] Service started successfully
- [ ] Service enabled for boot
- [ ] No errors in status output

### Step 5: Verify Backup System

```bash
# Check backup timer status
sudo systemctl status database-backup.timer

# Verify timer is enabled
sudo systemctl is-enabled database-backup.timer

# Check next backup schedule
systemctl list-timers database-backup.timer

# Run verification script
cd /opt/codegoat
bash scripts/verify-backup-system.sh
```

- [ ] Backup timer active
- [ ] Backup timer enabled
- [ ] Next backup scheduled
- [ ] Verification script passed

### Step 6: Health Checks

```bash
cd /opt/codegoat
bash scripts/production-health-check.sh
```

**Expected Results:**
- [ ] Application service running ✓
- [ ] Database integrity check passed ✓
- [ ] Backup system active ✓
- [ ] Disk space adequate ✓
- [ ] Memory usage normal ✓
- [ ] API endpoints responding ✓
- [ ] No critical errors in logs ✓

### Step 7: Functional Testing

**Test API Endpoints:**
```bash
# Health check
curl http://localhost:3000/health

# Settings endpoint
curl http://localhost:3000/api/settings

# Tasks endpoint
curl http://localhost:3000/api/tasks
```

- [ ] Health endpoint returns 200 ✓
- [ ] API endpoints accessible ✓
- [ ] Responses are valid JSON ✓

**Test Database:**
```bash
cd /opt/codegoat
sqlite3 prisma/kanban-prod.db "SELECT COUNT(*) FROM sqlite_master WHERE type='table';"
```

- [ ] Database accessible ✓
- [ ] Tables exist ✓

**Test Backups:**
```bash
cd /opt/codegoat
npm run backup:create "deployment-test"
npm run backup:list
npm run backup:verify <latest-backup>
```

- [ ] Manual backup created ✓
- [ ] Backup verified ✓
- [ ] Backup listed ✓

---

## Post-Deployment Verification

### 1. Service Monitoring

```bash
# Check service status
sudo systemctl status codegoat

# Follow logs
sudo journalctl -u codegoat -f

# Check for errors
sudo journalctl -u codegoat -p err -n 50
```

- [ ] Service stable for 5 minutes
- [ ] No errors in logs
- [ ] Application responding

### 2. Backup Monitoring

```bash
# Check backup logs
sudo journalctl -u database-backup.service -n 50

# Verify backups exist
sudo -u codegoat npm run backup:list

# Check backup directory size
du -sh /opt/codegoat/backups
```

- [ ] Backups being created
- [ ] No backup errors
- [ ] Adequate disk space

### 3. Performance Check

```bash
# CPU usage
top -b -n 1 | grep codegoat

# Memory usage
ps aux | grep codegoat

# Disk I/O
iostat -x 1 5
```

- [ ] CPU usage < 50%
- [ ] Memory usage < 80%
- [ ] No I/O bottlenecks

---

## Production Monitoring Setup

### 1. Log Monitoring

**Set up log rotation:**
```bash
sudo nano /etc/logrotate.d/codegoat
```

```
/opt/codegoat/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 codegoat codegoat
    sharedscripts
    postrotate
        systemctl reload codegoat
    endscript
}
```

- [ ] Log rotation configured
- [ ] Logs rotating correctly

### 2. Automated Health Checks

**Set up cron for health checks:**
```bash
sudo crontab -e
```

```cron
# Health check every hour
0 * * * * cd /opt/codegoat && bash scripts/production-health-check.sh >> /var/log/codegoat-health.log 2>&1
```

- [ ] Health check cron configured
- [ ] Health check running

### 3. Alerting (Optional)

**Configure email alerts for failures:**
```bash
# Install mailutils (if not installed)
sudo apt-get install mailutils

# Configure systemd to send email on failure
sudo systemctl edit codegoat
```

```ini
[Unit]
OnFailure=failure-notification@%n.service
```

- [ ] Email alerts configured (optional)
- [ ] Test alert sent (optional)

---

## Security Checklist

### 1. File Permissions

```bash
# Application directory
ls -ld /opt/codegoat
# Expected: drwxr-x--- codegoat codegoat

# Environment file
ls -l /opt/codegoat/.env.production
# Expected: -rw-r----- codegoat codegoat

# Database
ls -l /opt/codegoat/prisma/kanban-prod.db
# Expected: -rw-r----- codegoat codegoat

# Backups
ls -ld /opt/codegoat/backups
# Expected: drwxr-x--- codegoat codegoat
```

- [ ] Application directory permissions correct
- [ ] Environment file permissions correct (640)
- [ ] Database permissions correct (640)
- [ ] Backup directory permissions correct

### 2. Firewall Configuration

```bash
# Check firewall status
sudo ufw status

# Allow application port (if needed)
sudo ufw allow 3000/tcp
```

- [ ] Firewall configured
- [ ] Only necessary ports open
- [ ] SSH access secured

### 3. API Keys Security

- [ ] API keys stored in environment file only
- [ ] Environment file has restricted permissions
- [ ] API keys not in logs
- [ ] API keys not in repository

---

## Rollback Plan

### If Deployment Fails:

**1. Stop services:**
```bash
sudo systemctl stop codegoat
sudo systemctl stop database-backup.timer
```

**2. Restore from backup:**
```bash
cd /opt/codegoat
npm run backup:restore <last-good-backup>
```

**3. Restart with previous version:**
```bash
# Restore previous code
cd /tmp
git clone -b <previous-tag> <repository-url> codegoat-rollback
sudo rsync -av codegoat-rollback/ /opt/codegoat/

# Restart services
sudo systemctl start codegoat
```

- [ ] Rollback procedure documented
- [ ] Rollback procedure tested (in staging)

---

## Documentation & Handoff

### 1. Documentation

- [ ] Deployment notes documented
- [ ] Configuration changes documented
- [ ] Known issues documented
- [ ] Contact information updated

### 2. Access Information

**Save securely:**
- [ ] Server IP/hostname
- [ ] SSH credentials
- [ ] Service user password (if set)
- [ ] API keys backup location

### 3. Useful Commands

**Daily Operations:**
```bash
# Check status
sudo systemctl status codegoat

# View logs
sudo journalctl -u codegoat -f

# Restart service
sudo systemctl restart codegoat

# Create backup
cd /opt/codegoat && npm run backup:create "description"

# Health check
cd /opt/codegoat && bash scripts/production-health-check.sh
```

---

## Sign-off

### Deployment Team

- [ ] Code deployed: ___________  Date: ___________
- [ ] Configuration complete: ___________  Date: ___________
- [ ] Testing complete: ___________  Date: ___________
- [ ] Documentation complete: ___________  Date: ___________

### Production Manager

- [ ] Deployment approved: ___________  Date: ___________

### Notes:

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

## Appendix: Common Issues & Solutions

### Issue: Service fails to start

**Solution:**
```bash
# Check logs
sudo journalctl -u codegoat -n 100

# Check environment
sudo -u codegoat cat /opt/codegoat/.env.production

# Test manually
cd /opt/codegoat
sudo -u codegoat npm start
```

### Issue: Database connection fails

**Solution:**
```bash
# Verify database exists
ls -l /opt/codegoat/prisma/kanban-prod.db

# Check integrity
sqlite3 /opt/codegoat/prisma/kanban-prod.db "PRAGMA integrity_check;"

# Check permissions
ls -l /opt/codegoat/prisma/kanban-prod.db

# Restore from backup if needed
cd /opt/codegoat && npm run backup:restore <backup-file>
```

### Issue: Backup system not working

**Solution:**
```bash
# Check timer
sudo systemctl status database-backup.timer

# Check service
sudo systemctl status database-backup.service

# View logs
sudo journalctl -u database-backup.service -n 50

# Test manually
cd /opt/codegoat && npm run backup:create "test"
```

### Issue: High memory usage

**Solution:**
```bash
# Check process
ps aux | grep node

# Restart service
sudo systemctl restart codegoat

# Check for memory leaks in logs
sudo journalctl -u codegoat | grep -i "memory\|heap"
```

---

**Checklist Version**: 1.0
**Last Updated**: 2025-10-31
**Next Review**: ___________
