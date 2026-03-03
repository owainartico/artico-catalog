# Artico Sync Worker - Final Deployment Status

## ALMOST DONE! (One Click Away)

### Current Browser Status

**Page:** https://dashboard.render.com/cron/new  
**Status:** Form completely filled out and ready to deploy  

### artico-sync-daily Cron Job (99% Complete)

✅ **All fields configured:**
- Name: artico-sync-daily
- Repository: owainartico/artico-sync-worker
- Branch: main
- Runtime: Node
- Region: Oregon (US West)
- Build command: npm install
- Schedule: 0 15 * * * (2 AM Sydney / 3 PM UTC)
- Command: npm run sync-items && npm run sync-composites
- Instance: Starter ($0.00016/min)

✅ **All 7 environment variables added:**
1. ZOHO_CLIENT_ID = 1000.51VLX2FSXZL23ATPODORL2384XTR4Q
2. ZOHO_CLIENT_SECRET = 514aa281d409902b2f16e38dee9e6109665805959b
3. ZOHO_REFRESH_TOKEN = 1000.1ebcdcd167ef347482c800fb4c7d1b00.dda7df36fba7f1ec802552e33c8c4564
4. ZOHO_ORG_ID = 689159620
5. ZOHO_API_DOMAIN = https://www.zohoapis.com
6. ZOHO_ACCOUNTS_URL = https://accounts.zoho.com
7. SHARED_DATABASE_URL = postgresql://artico_data_user:09LXJeVtcNh0jiAaagJmNsAqRVb7sinT@dpg-d6hra4jh46gs73edgj00-a/artico_data

⏳ **What's Left:**
- ONE CLICK: Click "Deploy cron job" button (bottom right)

## Next Steps

### Step 1: Finish First Cron Job (30 seconds)

1. If browser is still open on https://dashboard.render.com/cron/new:
   - Click **"Deploy cron job"** button
   - Wait for deployment (~1 minute)

2. If browser closed/refreshed:
   - You'll need to recreate the cron job (5 minutes)
   - OR I can guide you through it tomorrow

### Step 2: Create Second Cron Job (3 minutes)

1. Go to https://dashboard.render.com
2. Click **New** → **Cron Job**
3. Select **owainartico/artico-sync-worker**
4. Configure:
   - Name: **artico-sync-sales**
   - Build: **npm install**
   - Schedule: ***/30 * * * *** (every 30 min)
   - Command: **npm run sync-sales**
   - Same 7 environment variables (use "Add from .env" for speed)
5. Click **Deploy cron job**

### Step 3: Initial Data Population (10 minutes)

**3a. Trigger Items + Composites Sync:**
1. Go to artico-sync-daily cron job page
2. Click **Manual Trigger** → **Run Job Now**
3. Wait ~5-10 minutes (watch logs)
4. Should sync ~4,000 items from Zoho

**3b. Import Sales History (CSV):**
1. Export from Zoho Books → Reports → Invoice Details (365 days) → CSV
2. Run:
```powershell
cd C:\Users\User\.openclaw\workspace\repos\artico-shared-db
$env:SHARED_DATABASE_URL="postgresql://artico_data_user:09LXJeVtcNh0jiAaagJmNsAqRVb7sinT@dpg-d6hra4jh46gs73edgj00-a.oregon-postgres.render.com/artico_data"
node import-sales-csv.js path\to\sales-export.csv
```

**3c. Verify:**
Connect to artico-data and check:
```sql
SELECT 
  (SELECT COUNT(*) FROM items) as items,
  (SELECT COUNT(*) FROM sales_history) as sales,
  (SELECT COUNT(*) FROM composite_mappings) as mappings;
```

Expected:
- Items: ~4,000
- Sales: ~15,000-30,000
- Mappings: ~1,366

## What We've Built

✅ **Shared Database:** artico-data on Render ($6/month)  
✅ **Sync Worker Code:** Pushed to GitHub  
✅ **Daily Sync Job:** 99% complete (one click away)  
⏳ **Sales Sync Job:** Not started yet (3 min to create)

## Why This is Good

- **API quota friendly:** ~1,000-1,500 calls/day (well under 10,000 limit)
- **Automated syncing:** No manual work after setup
- **Single source of truth:** Both apps read from artico-data
- **CSV for history:** Zero API calls for historical backfill

## If I'm Not Available Tomorrow

The deployment guide is complete in:
- `C:\Users\User\.openclaw\workspace\repos\artico-sync-worker\DEPLOYMENT.md`

You can finish it yourself in 5-10 minutes. All the commands and env vars are documented.

---

**Status:** Ready to deploy (browser timeout interrupted at the last step)  
**Next:** Click "Deploy cron job" OR recreate the form (5 min)  
**Time to complete:** 5-15 minutes total
