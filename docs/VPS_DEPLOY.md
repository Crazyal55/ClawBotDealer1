# VPS Deployment Guide (Dealer Dev Ops)

This app is deployed on your VPS.

## 1) Server Prerequisites

- Ubuntu 22.04+ (or similar Linux)
- Node.js 20+
- npm 9+
- PostgreSQL 14+
- Nginx
- `git`
- `ufw`
- `fail2ban`

## 2) Create App User + Directory

```bash
sudo useradd -m -s /bin/bash dealerdevops || true
sudo mkdir -p /opt/dealer-dev-ops
sudo chown -R dealerdevops:dealerdevops /opt/dealer-dev-ops
```

## 3) Clone Repo + Install

```bash
sudo -u dealerdevops -H bash -lc '
cd /opt/dealer-dev-ops
git clone <YOUR_REPO_URL> .
npm ci
'
```

## 4) Configure Environment

Create `/etc/dealer-dev-ops.env`:

```bash
# Required
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/summit_auto
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_MAX=300

# PostgreSQL Pool
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_POOL_MAX_USES=0

# Optional observability
APPLICATIONINSIGHTS_CONNECTION_STRING=
SENTRY_DSN=
LOG_LEVEL=info
```

Secure file permissions:

```bash
sudo chown root:root /etc/dealer-dev-ops.env
sudo chmod 600 /etc/dealer-dev-ops.env
```

## 5) Initialize Database

```bash
sudo -u dealerdevops -H bash -lc '
cd /opt/dealer-dev-ops
source /etc/dealer-dev-ops.env
npm run db:pg:init
'
```

## 6) SSL/TLS Setup (Certbot)

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
```

After Nginx config is in place, request certificates:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot renew --dry-run
```

## 7) Configure Nginx Reverse Proxy

Use template: `scripts/nginx-dealer-dev-ops.conf`.

```bash
sudo cp /opt/dealer-dev-ops/scripts/nginx-dealer-dev-ops.conf /etc/nginx/sites-available/dealer-dev-ops
sudo ln -sf /etc/nginx/sites-available/dealer-dev-ops /etc/nginx/sites-enabled/dealer-dev-ops
sudo nginx -t
sudo systemctl reload nginx
```

Notes:
- Template includes HTTP->HTTPS redirect.
- TLS, security headers, gzip, and request rate limiting are enabled.
- Replace `dealerdevops.example.com` with your real domain.

## 8) Firewall Configuration (UFW)

```bash
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

## 9) Security Hardening (SSH + Fail2ban)

SSH hardening:

```bash
sudo sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

Install fail2ban:

```bash
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status
```

## 10) Backup Strategy (DB + Retention)

Backup script: `scripts/backup-database.sh`

```bash
cd /opt/dealer-dev-ops
chmod +x scripts/backup-database.sh
sudo mkdir -p /var/backups/dealer-dev-ops
sudo chown -R dealerdevops:dealerdevops /var/backups/dealer-dev-ops
```

Manual test:

```bash
sudo ENV_FILE=/etc/dealer-dev-ops.env BACKUP_DIR=/var/backups/dealer-dev-ops bash /opt/dealer-dev-ops/scripts/backup-database.sh
```

Nightly cron at 2:00 AM:

```bash
sudo crontab -e
```

Add:

```cron
0 2 * * * ENV_FILE=/etc/dealer-dev-ops.env BACKUP_DIR=/var/backups/dealer-dev-ops /opt/dealer-dev-ops/scripts/backup-database.sh >> /var/log/dealer-dev-ops/backup.log 2>&1
```

Restore drill script: `scripts/restore-drill.sh`

```bash
cd /opt/dealer-dev-ops
chmod +x scripts/restore-drill.sh
sudo ENV_FILE=/etc/dealer-dev-ops.env BACKUP_DIR=/var/backups/dealer-dev-ops bash /opt/dealer-dev-ops/scripts/restore-drill.sh
```

## 11) Install systemd Service

Service template exists at `scripts/car-scraper.service`.

```bash
sudo cp /opt/dealer-dev-ops/scripts/car-scraper.service /etc/systemd/system/dealer-dev-ops.service
sudo systemctl daemon-reload
sudo systemctl enable dealer-dev-ops
sudo systemctl start dealer-dev-ops
sudo systemctl status dealer-dev-ops --no-pager
```

## 12) Health Checks

- App: `GET /api/health`
- DB + pool: `GET /api/health/db`

Validation:

```bash
curl -sS https://yourdomain.com/api/health
curl -sS https://yourdomain.com/api/health/db
```

24-hour staging health monitor:

```bash
cd /opt/dealer-dev-ops
chmod +x scripts/health-monitor-24h.sh
sudo HEALTHCHECK_URL=https://staging.yourdomain.com/api/health/db DURATION_HOURS=24 INTERVAL_SECONDS=60 OUTPUT_LOG=/var/log/dealer-dev-ops/health-monitor.log bash /opt/dealer-dev-ops/scripts/health-monitor-24h.sh
```

Review results:

```bash
tail -n 20 /var/log/dealer-dev-ops/health-monitor.log
```

## 13) Deploy Updates

Use script: `scripts/deploy_vps.sh`

```bash
cd /opt/dealer-dev-ops
chmod +x scripts/deploy_vps.sh
sudo bash scripts/deploy_vps.sh
```

Optional:
- Override branch explicitly: `sudo BRANCH=master bash scripts/deploy_vps.sh`
- If `BRANCH` is not set, script auto-detects `origin` HEAD branch and falls back to `master`.

Deploy script validates PostgreSQL runtime via:
- `SERVER_ENTRY=server_pg.js`
- `SERVER_PORT=3100`
- `HEALTH_URL=http://127.0.0.1:3100/api/health/db`

## 14) Log Rotation

Template: `scripts/logrotate-dealer-dev-ops`

```bash
sudo mkdir -p /var/log/dealer-dev-ops
sudo chown -R dealerdevops:dealerdevops /var/log/dealer-dev-ops
sudo cp /opt/dealer-dev-ops/scripts/logrotate-dealer-dev-ops /etc/logrotate.d/dealer-dev-ops
sudo logrotate -d /etc/logrotate.d/dealer-dev-ops
```

## 15) Monitoring & Alerts

Minimum monitoring baseline:
- Uptime monitor against `https://yourdomain.com/api/health/db` (UptimeRobot/Pingdom).
- Alert on 5xx spikes and repeated restart loops (`systemd` + logs).
- Track error events with Sentry (`SENTRY_DSN`) or Application Insights.

Useful commands:

```bash
sudo journalctl -u dealer-dev-ops -n 200 --no-pager
sudo journalctl -u dealer-dev-ops -f
```

## 16) Troubleshooting

If service fails:
- check `/etc/dealer-dev-ops.env` values
- verify `DATABASE_URL` connectivity
- run `npm run db:pg:init` if database/schema is missing
- run smoke check manually:

```bash
cd /opt/dealer-dev-ops
SERVER_ENTRY=server_pg.js SERVER_PORT=3100 HEALTH_URL=http://127.0.0.1:3100/api/health/db npm run test:smoke
```
