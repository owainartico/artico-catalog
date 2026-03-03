# Run this script from YOUR PowerShell (not as admin needed)
# Right-click this file → Run with PowerShell

schtasks /create `
  /tn "Shopify Visibility Sync" `
  /tr "powershell.exe -ExecutionPolicy Bypass -File 'C:\Users\User\.openclaw\workspace\run-shopify-sync.ps1'" `
  /sc daily `
  /st 08:00 `
  /f

Write-Host ""
Write-Host "✅ Task created!" -ForegroundColor Green
Write-Host ""
Write-Host "The Shopify sync will now run automatically every day at 8:00 AM"
Write-Host "and post results to Discord #artico-shopify channel."
Write-Host ""
Write-Host "To test it now, run:"
Write-Host '  schtasks /run /tn "Shopify Visibility Sync"'
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
