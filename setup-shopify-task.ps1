# Create Windows Task Scheduler task for Shopify sync
# Run this script once to set up the daily 8 AM sync

$ErrorActionPreference = "Stop"

$taskName = "Shopify Visibility Sync"
$description = "Daily sync of product visibility from Zoho to Shopify"

# Task action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -File `"C:\Users\User\.openclaw\workspace\run-shopify-sync.ps1`"" `
    -WorkingDirectory "C:\Users\User\.openclaw\workspace"

# Task trigger (daily at 8:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 8:00AM

# Task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 60)

# Register the task (will run as current user with highest privileges)
Write-Host "Creating scheduled task: $taskName"
Register-ScheduledTask `
    -TaskName $taskName `
    -Description $description `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -User $env:USERNAME `
    -RunLevel Highest `
    -Force

Write-Host "`n✅ Task created successfully!"
Write-Host "   - Name: $taskName"
Write-Host "   - Schedule: Daily at 8:00 AM"
Write-Host "   - Next run: Tomorrow at 8:00 AM"
Write-Host "`nTo test it now, run: schtasks /run /tn `"$taskName`""
