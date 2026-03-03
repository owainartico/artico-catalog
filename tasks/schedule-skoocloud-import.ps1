# Schedule SkooCloud Import - Daily at 11:00 AM AEST
# Run this script once as Administrator to create the scheduled task

$taskName = "SkooCloud Daily Import"
$scriptPath = "C:\Users\User\.openclaw\workspace\tasks\skoocloud-import.js"
$nodePath = (Get-Command node).Source

$action = New-ScheduledTaskAction -Execute $nodePath -Argument "`"$scriptPath`"" -WorkingDirectory "C:\Users\User\.openclaw\workspace\tasks"
$trigger = New-ScheduledTaskTrigger -Daily -At "11:00AM"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -AllowStartIfOnBatteries

# Register under current user
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -User "User" -RunLevel Highest -Description "Daily SkooCloud calls report import to Artico CRM" -Force

Write-Host "Scheduled task '$taskName' created successfully. Runs daily at 11:00 AM."
