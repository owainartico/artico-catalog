# FieldFolio API Reference

**API Base:** `https://app.fieldfolio.com/api/v1`  
**Credentials:** `fieldfolio-credentials.json` (owain@artico.net.au)  
**Auth:** POST to `/user_sessions` with email/password → returns `user_credential` token

## Active Catalogs

- Artico Australia (ID: 223) — 1,179 products
- Artico New Zealand (ID: 233) — 996 products

## Key Endpoints

- `GET /catalogs/{id}/products` — fetch products (paginated)
- `PATCH /catalogs/{id}/varieties/bulk_update` — update stock levels (updates draft AND published immediately)
- `POST /catalogs/{id}/products` — create products
- `PATCH /catalogs/{id}/products/{id}` — update products
- `POST /catalogs/{id}/products/publish` — publish catalog changes

## Daily Stock Sync

- **Script:** `zoho-fieldfolio-sync.js` (wrapper: `run-fieldfolio-sync.ps1`)
- **Runs:** 8:00 AM daily via Windows Task Scheduler (task name: "FieldFolio Daily Stock Sync")
- **Reports to:** Discord #fieldfolio via webhook (no Claude API needed)
- **Syncs:** 
  - Stock levels: Zoho Inventory → FieldFolio (SKU-matched, bulk update)
  - Visibility: Based on `cf_in_pixsell` field ("Yes" = visible, "No" = hidden)
- **OpenClaw cron jobs:** Disabled (now using Windows scheduler for reliability)

**Full docs:** `fieldfolio-sync-README.md`
