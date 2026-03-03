# FieldFolio Stock Sync

Automatic daily sync of stock levels from Zoho Inventory to FieldFolio.

## Setup Complete ✅

**Script:** `zoho-fieldfolio-sync.js`  
**Scheduler:** Windows Task Scheduler (runs at 8:00 AM daily)  
**Wrapper:** `run-fieldfolio-sync.ps1` (PowerShell script that runs sync + posts to Discord)  
**Delivery:** Discord webhook to #fieldfolio channel

### How It Works

1. **Windows Task Scheduler** runs `run-fieldfolio-sync.ps1` at 8 AM daily
2. PowerShell script executes `node zoho-fieldfolio-sync.js`
3. Results posted to Discord via webhook (no Claude API needed!)
4. Script tracks `.last-sync-run` to prevent duplicate runs

### Advantages Over OpenClaw Cron

- **No Claude API dependency** — runs even when API is rate-limited
- **More reliable** — native Windows scheduling
- **Faster** — no agent overhead
- **Same Discord notifications** — via webhook

## What It Does

1. Authenticates with FieldFolio API
2. Fetches all products from all catalogs
3. Pulls current stock levels from Zoho Inventory
4. Matches products by SKU
5. Bulk updates stock in FieldFolio (both draft AND published)
6. Reports changes

## First Run Results (26 Feb 2026)

- **Artico Australia:** 38 SKUs matched, 24 updated
- **Artico New Zealand:** 36 SKUs matched, 24 updated
- Total items synced from Zoho: 198 SKUs

## Manual Sync

To run manually:
```bash
node zoho-fieldfolio-sync.js
```

## Credentials

- **FieldFolio:** `fieldfolio-credentials.json`
- **Zoho:** `zoho-credentials.json` (via Make webhook)

## Logs

Each run shows:
- SKU-level changes (old → new stock)
- Total matches per catalog
- Success/failure status

## Cron Job

**Name:** FieldFolio Daily Stock Sync  
**ID:** `d56b81e6-1f03-4a74-bd16-fb7b5cb64020`  
**Next run:** Check with `/cron list`

To disable:
```
/cron remove d56b81e6-1f03-4a74-bd16-fb7b5cb64020
```

## Future Enhancements

- Sync pricing
- Sync product descriptions
- Sync images
- Two-way sync (FieldFolio orders → Zoho)
