# VPS Deployment Guide (Dealer Dev Ops)

This app is deployed on your VPS.

## 1) Server Prerequisites

- Ubuntu 22.04+ (or similar Linux)
- Node.js 20+
- npm 9+
- PostgreSQL 14+
- Nginx
- `git`

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
NODE_ENV=production
PORT=3000

DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/summit_auto
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT_MS=30000
DB_POOL_CONNECTION_TIMEOUT_MS=5000
DB_POOL_MAX_USES=0

CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_MAX=300
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

## 6) Install systemd Service

Service template exists at `scripts/car-scraper.service`.

```bash
sudo cp /opt/dealer-dev-ops/scripts/car-scraper.service /etc/systemd/system/dealer-dev-ops.service
sudo systemctl daemon-reload
sudo systemctl enable dealer-dev-ops
sudo systemctl start dealer-dev-ops
sudo systemctl status dealer-dev-ops --no-pager
```

## 7) Configure Nginx Reverse Proxy

Use template: `scripts/nginx-dealer-dev-ops.conf`.

```bash
sudo cp /opt/dealer-dev-ops/scripts/nginx-dealer-dev-ops.conf /etc/nginx/sites-available/dealer-dev-ops
sudo ln -sf /etc/nginx/sites-available/dealer-dev-ops /etc/nginx/sites-enabled/dealer-dev-ops
sudo nginx -t
sudo systemctl reload nginx
```

Then issue TLS cert:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 8) Health Checks

- App health: `GET /api/health`
- DB + pool health: `GET /api/health/db`

## 9) Deploy Updates

Use script: `scripts/deploy_vps.sh`

```bash
cd /opt/dealer-dev-ops
chmod +x scripts/deploy_vps.sh
sudo bash scripts/deploy_vps.sh
```

The deploy script validates the PostgreSQL runtime with:
- `SERVER_ENTRY=server_pg.js`
- `SERVER_PORT=3100`
- `HEALTH_URL=http://127.0.0.1:3100/api/health/db`

## 10) Logs + Troubleshooting

```bash
sudo journalctl -u dealer-dev-ops -n 200 --no-pager
sudo journalctl -u dealer-dev-ops -f
```

If service fails:
- check `/etc/dealer-dev-ops.env` values
- verify `DATABASE_URL` connectivity
- run `npm run test:smoke` inside `/opt/dealer-dev-ops`
