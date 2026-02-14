# Azure Setup Guide (Dealer Dev Ops)

This guide is for running Dealer Dev Ops fully on Azure, including cloud DB.

## Target Azure Architecture

- Compute/API: Azure App Service (Linux, Node 18+)
- Database: Azure Database for PostgreSQL Flexible Server
- Secrets: Azure Key Vault
- Storage (optional for assets/log exports): Azure Storage Account (Blob)
- Monitoring: Application Insights + Log Analytics
- DNS/SSL (optional): Azure Front Door or App Service custom domain
- AI (future chatbot model): Azure OpenAI (optional, when ready)

---

## 1) Prerequisites

- Azure subscription
- `az` CLI installed and logged in
- GitHub repo access
- Node 18+ local environment

```bash
az login
az account set --subscription "<YOUR_SUBSCRIPTION_ID_OR_NAME>"
```

---

## 2) Create Resource Group

```bash
az group create \
  --name rg-dealerdevops-prod \
  --location eastus
```

---

## 3) Create Azure PostgreSQL Flexible Server

Use Flexible Server (recommended for app workloads).

```bash
az postgres flexible-server create \
  --resource-group rg-dealerdevops-prod \
  --name pg-dealerdevops-prod \
  --location eastus \
  --admin-user pgadmin \
  --admin-password "<STRONG_PASSWORD>" \
  --sku-name Standard_D2ds_v4 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 16 \
  --public-access 0.0.0.0
```

Create app DB:

```bash
az postgres flexible-server db create \
  --resource-group rg-dealerdevops-prod \
  --server-name pg-dealerdevops-prod \
  --database-name summit_auto
```

Build connection string:

```text
postgresql://pgadmin:<PASSWORD>@pg-dealerdevops-prod.postgres.database.azure.com:5432/summit_auto?sslmode=require
```

Notes:
- Azure Postgres requires SSL (`sslmode=require`).
- Restrict firewall/network access after deployment.

---

## 4) Initialize SQL Schema/Data

From local machine (or CI runner), set `DATABASE_URL` and run:

```bash
npm install
DATABASE_URL="postgresql://pgadmin:<PASSWORD>@pg-dealerdevops-prod.postgres.database.azure.com:5432/summit_auto?sslmode=require" npm run db:pg:init
```

This project uses:
- `docs/placeholder_data.sql`
- `scripts/init-postgres.js`

---

## 5) Create Key Vault and Store Secrets

```bash
az keyvault create \
  --name kv-dealerdevops-prod \
  --resource-group rg-dealerdevops-prod \
  --location eastus
```

Store key secrets:

```bash
az keyvault secret set --vault-name kv-dealerdevops-prod --name DATABASE-URL --value "<DATABASE_URL>"
az keyvault secret set --vault-name kv-dealerdevops-prod --name NODE-ENV --value "production"
```

---

## 6) Create App Service Plan + Web App

```bash
az appservice plan create \
  --name asp-dealerdevops-prod \
  --resource-group rg-dealerdevops-prod \
  --is-linux \
  --sku P1v3

az webapp create \
  --name app-dealerdevops-prod \
  --resource-group rg-dealerdevops-prod \
  --plan asp-dealerdevops-prod \
  --runtime "NODE|18-lts"
```

Set startup command (PostgreSQL runtime path):

```bash
az webapp config set \
  --resource-group rg-dealerdevops-prod \
  --name app-dealerdevops-prod \
  --startup-file "npm run start:pg"
```

Set app settings:

```bash
az webapp config appsettings set \
  --resource-group rg-dealerdevops-prod \
  --name app-dealerdevops-prod \
  --settings \
    NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL="<DATABASE_URL>"
```

---

## 7) Deploy from GitHub

Option A: Local push via App Service deployment center  
Option B: GitHub Actions (recommended, already scaffolded in `.github/workflows/azure-webapp.yaml`)

GitHub Actions secrets required:
- `AZURE_WEBAPP_NAME`
- `AZURE_WEBAPP_PUBLISH_PROFILE`

If desired, add deployment slot (`staging`) before production swap.

---

## 8) Monitoring and Logs

Enable Application Insights:

```bash
az monitor app-insights component create \
  --app ai-dealerdevops-prod \
  --location eastus \
  --resource-group rg-dealerdevops-prod \
  --application-type web
```

Enable App Service logs:

```bash
az webapp log config \
  --name app-dealerdevops-prod \
  --resource-group rg-dealerdevops-prod \
  --application-logging filesystem \
  --level information
```

Stream logs:

```bash
az webapp log tail \
  --name app-dealerdevops-prod \
  --resource-group rg-dealerdevops-prod
```

---

## 9) Security Hardening Checklist

- Restrict DB firewall to App Service outbound IPs only
- Move secrets to Key Vault references in App Service settings
- Enforce HTTPS only on App Service
- Add CORS allowlist (avoid `*` in production)
- Rotate DB/admin credentials
- Add daily DB backup policy checks

---

## 10) Multi-Environment Layout (Recommended)

- `rg-dealerdevops-dev`
- `rg-dealerdevops-staging`
- `rg-dealerdevops-prod`

Each environment gets:
- its own App Service app
- its own PostgreSQL Flexible Server/database
- its own Key Vault

---

## 11) Future Azure Components (When Ready)

- Azure OpenAI for chatbot model serving
- pgvector extension on Azure Postgres (if available for your server/region)
  - If not available/desired, use a managed vector service later
- Azure Front Door for global routing/WAF

---

## 12) Project-Specific Env Vars

Required for PostgreSQL runtime:

- `DATABASE_URL`
- `NODE_ENV=production`
- `PORT=3000` (App Service often injects this; keep server compatible)

Optional:

- `CORS_ORIGINS` (comma-separated allowlist)
- `RATE_LIMIT_MAX`
- future chatbot/model keys (prefer Key Vault references)

---

## Quick Rollout Order

1. Create RG
2. Create PostgreSQL Flexible Server + DB
3. Run `npm run db:pg:init` against Azure DB
4. Create App Service Plan + Web App
5. Set app settings/secrets
6. Deploy app
7. Verify:
   - `/api/health`
   - `/api/dealerships/overview`
   - `/api/inventory`
