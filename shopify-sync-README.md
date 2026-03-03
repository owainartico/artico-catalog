# Zoho → Shopify Visibility Sync

Automatically sync product visibility between Zoho Inventory and Shopify based on the `cf_in_pixsell` custom field.

## What It Does

- Reads all items from Zoho Inventory
- Checks `cf_in_pixsell` custom field value
- Matches products by SKU in Shopify
- Updates Shopify product status:
  - **"Yes"** → Published (active, visible in store)
  - **"No"** → Draft (hidden from store)
- Reports results to Discord

## Setup

### 1. Discord Webhook

✅ **Already configured** - posts to #artico-shopify channel

### 2. Test the Sync

```powershell
# Test run (Australia store)
node zoho-shopify-sync.js australia

# Or use the wrapper
.\run-shopify-sync.ps1
```

### 3. Schedule Daily Sync (Windows Task Scheduler)

1. Open **Task Scheduler**
2. Create Task → **General** tab:
   - Name: `Shopify Visibility Sync`
   - Run whether user is logged on or not
   - Run with highest privileges

3. **Triggers** tab → New:
   - Daily at 8:00 AM
   - Repeat task every: (leave blank for once daily)

4. **Actions** tab → New:
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\Users\User\.openclaw\workspace\run-shopify-sync.ps1"`
   - Start in: `C:\Users\User\.openclaw\workspace`

5. **Conditions** tab:
   - Uncheck "Start only if on AC power"

6. Click OK, enter your Windows password

## How It Works

### Zoho Side

- Fetches all items from Zoho Inventory
- Reads `cf_in_pixsell` custom field (managed in Zoho Books/Inventory)
- Builds a map of SKU → visibility

### Shopify Side

- Fetches all products from Shopify
- For each product with a matching SKU:
  - If `cf_in_pixsell = "Yes"` → set status to `active` (published)
  - If `cf_in_pixsell = "No"` → set status to `draft` (hidden)
- Products without SKUs are skipped (unchanged)
  - Products NOT in Zoho are drafted (hidden from store)

### Rate Limiting

- Waits 500ms between Shopify API calls (~2 requests/second)
- Well within Shopify's rate limits (2 requests/second standard)

## Credentials

### Zoho
- Uses `zoho-credentials.json` (same as FieldFolio sync)
- Automatically refreshes access token

### Shopify
- Uses `shopify-credentials.json`
- Australia store configured
- New Zealand will use same credentials file when set up

## Logs

- Console output shows:
  - Progress (fetching, matching, updating)
  - Each product published/drafted
  - Any errors
- Discord notification includes:
  - Total items processed
  - Products matched
  - Published/drafted counts
  - Errors (if any)

## Adding New Zealand

Once NZ Shopify access is configured:

```powershell
# Run for both stores
node zoho-shopify-sync.js australia
node zoho-shopify-sync.js new_zealand
```

Or update `run-shopify-sync.ps1` to run both.

## Troubleshooting

### "No Shopify credentials found"
- Ensure `shopify-credentials.json` exists
- Check the store name matches: `australia` or `new_zealand`

### "Zoho auth failed"
- Run `node zoho-get-token.js` to refresh Zoho credentials

### Products not updating
- Check SKU matches exactly between Zoho and Shopify
- Verify `cf_in_pixsell` field value is exactly "Yes" or "No" (case-insensitive)
- Check console logs for errors

### Rate limit errors
- Increase the delay in the script (change 500 to 1000ms)
- Shopify standard limit is 2 req/s, we're safely under that

## Manual Operations

### Test without Discord notification
```powershell
$env:SHOPIFY_DISCORD_WEBHOOK = ""
node zoho-shopify-sync.js australia
```

### Check specific product
Add logging to see SKU matching:
- Edit script, add `log()` calls
- Run manually and watch console

### Dry run (read-only)
Currently the script always writes. To add dry-run mode:
- Comment out the `updateShopifyProductStatus` call
- Uncomment the log line to see what *would* change

## Files

- `zoho-shopify-sync.js` — main sync script
- `run-shopify-sync.ps1` — wrapper for Task Scheduler
- `shopify-credentials.json` — Shopify API tokens
- `zoho-credentials.json` — Zoho API refresh token
- `shopify-sync-README.md` — this file

## Notes

- Products in Shopify but NOT in Zoho are left unchanged
- Products without SKUs are skipped
- The `cf_in_pixsell` field is the single source of truth for visibility
- Updates are immediate (no publish/draft delay)
- Same script will work for all stores once configured
