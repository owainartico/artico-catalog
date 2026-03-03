# FieldFolio Stock Sync - Windows Task Scheduler Runner
# Runs the sync and posts results to Discord

$ErrorActionPreference = "Continue"
$workDir = "C:\Users\User\.openclaw\workspace"
$logFile = Join-Path $workDir "fieldfolio-sync.log"
Set-Location $workDir

# Log start
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Script started" | Out-File -FilePath $logFile -Append

# Discord webhook URL for #fieldfolio channel
$webhookUrl = "https://discordapp.com/api/webhooks/1478188516633481298/JX7uU1UaQzs2y48x5jWJGVMRTStGTYTzPXFWqaTJCVIA9hUC0DqidP9oZJHP7Kf6leBX"

# Run the sync and capture output
$output = & node zoho-fieldfolio-sync.js 2>&1 | Out-String
"[$timestamp] Sync output length: $($output.Length)" | Out-File -FilePath $logFile -Append

# Check if sync ran or skipped
$exitCode = $LASTEXITCODE
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Prepare Discord message
if ($output -match "already completed today") {
    $message = "FieldFolio Sync ($timestamp) - Already ran today, skipped."
    $color = 3066993  # Green
} elseif ($output -match "Sync complete") {
    # Extract key stats from output
    $lines = $output -split "`n"
    
    $auStock = "?"
    $auVis = "?"
    $nzStock = "?"
    $nzVis = "?"
    $inAU = $false
    $inNZ = $false
    
    foreach ($line in $lines) {
        if ($line -match "Artico Australia") {
            $inAU = $true
            $inNZ = $false
        } elseif ($line -match "Artico New Zealand") {
            $inAU = $false
            $inNZ = $true
        } elseif ($line -match "(\d+) stock changes") {
            if ($inAU) { $auStock = $matches[1] }
            if ($inNZ) { $nzStock = $matches[1] }
        } elseif ($line -match "(\d+) visibility changes") {
            if ($inAU) { $auVis = $matches[1] }
            if ($inNZ) { $nzVis = $matches[1] }
        }
    }
    
    $nl = [Environment]::NewLine
    $message = "FieldFolio Sync Complete ($timestamp)$nl${nl}Artico Australia: $auStock stock, $auVis visibility$nl" + "Artico New Zealand: $nzStock stock, $nzVis visibility"
    $color = 3066993  # Green
} else {
    $message = "FieldFolio Sync FAILED ($timestamp) - Check logs"
    $color = 15158332  # Red
}

# Send to Discord webhook
$payload = @{
    embeds = @(
        @{
            description = $message
            color = $color
        }
    )
} | ConvertTo-Json -Depth 3

"[$timestamp] Attempting webhook" | Out-File -FilePath $logFile -Append

try {
    Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $payload -ContentType "application/json" | Out-Null
    "[$timestamp] Webhook sent successfully" | Out-File -FilePath $logFile -Append
    Write-Host "Discord notification sent"
} catch {
    $errorMsg = $_.Exception.Message
    "[$timestamp] Webhook failed: $errorMsg" | Out-File -FilePath $logFile -Append
    Write-Host "Failed to send Discord notification: $errorMsg"
}

"[$timestamp] Done (exit $exitCode)" | Out-File -FilePath $logFile -Append
exit $exitCode
