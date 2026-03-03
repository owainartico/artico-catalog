# Zoho → Shopify Visibility Sync
# Wrapper script for Windows Task Scheduler

$ErrorActionPreference = "Stop"

# Change to script directory
Set-Location "C:\Users\User\.openclaw\workspace"

# Run sync for Australia store (webhook is hardcoded in the script)
Write-Host "Starting Shopify visibility sync (Australia)..."
node zoho-shopify-sync.js australia

# Exit with node's exit code
exit $LASTEXITCODE
