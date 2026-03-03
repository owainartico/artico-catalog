# Windows Task Scheduler Setup - Shopify Sync

## Create the Scheduled Task

1. Press **Win + R**, type `taskschd.msc`, press Enter

2. Click **"Create Task"** (right sidebar, not "Create Basic Task")

### General Tab

- **Name:** `Shopify Visibility Sync`
- **Description:** `Daily sync of product visibility from Zoho to Shopify`
- **Security options:**
  - ☑ Run whether user is logged on or not
  - ☑ Run with highest privileges
  - Configure for: Windows 10

### Triggers Tab

Click **New**:
- Begin the task: **On a schedule**
- Settings: **Daily**
- Start: Choose today's date, **8:00:00 AM**
- Recur every: **1 days**
- ☑ Enabled
- Click **OK**

### Actions Tab

Click **New**:
- Action: **Start a program**
- Program/script: `powershell.exe`
- Add arguments: `-ExecutionPolicy Bypass -File "C:\Users\User\.openclaw\workspace\run-shopify-sync.ps1"`
- Start in: `C:\Users\User\.openclaw\workspace`
- Click **OK**

### Conditions Tab

- Power section:
  - ☐ Start the task only if the computer is on AC power (uncheck this)
  - ☐ Stop if the computer switches to battery power (uncheck this)

- Network section:
  - ☐ Start only if the following network connection is available (leave unchecked)

### Settings Tab

- ☑ Allow task to be run on demand
- ☑ Run task as soon as possible after a scheduled start is missed
- If the task fails, restart every: **1 hour**
- Attempt to restart up to: **3 times**
- ☐ Stop the task if it runs longer than: (uncheck - let it complete)
- If the running task does not end when requested, force it to stop: ☑

### Save

Click **OK**

You'll be prompted to enter your **Windows password** - this is required for "Run whether user is logged on or not"

## Test the Task

Right-click the task → **Run**

Check:
1. Console window appears (may flash quickly)
2. After ~15 minutes, check #artico-shopify Discord channel for the completion report

## View Task History

1. Right-click the task → **Properties**
2. **History** tab
3. Look for:
   - Task Started (Event ID 100)
   - Task Completed (Event ID 102)
   - Any errors (Event ID 103)

## Troubleshooting

### Task runs but no notification
- Check the History tab for errors
- Manually run: `.\run-shopify-sync.ps1` from PowerShell
- Check if webhook URL is correct in the script

### Task doesn't run at scheduled time
- Check Triggers tab - ensure "Enabled" is checked
- Check Conditions tab - ensure AC power requirement is unchecked
- Check Task Scheduler service is running: `services.msc` → Task Scheduler

### Permission errors
- Ensure "Run with highest privileges" is checked
- Re-enter your Windows password when saving the task

## Viewing Logs

Task output isn't captured by Task Scheduler by default. To see logs:

**Option 1: Add logging to the PowerShell script**

Edit `run-shopify-sync.ps1`:
```powershell
$logFile = "C:\Users\User\.openclaw\workspace\shopify-sync.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"[$timestamp] Starting Shopify sync..." | Out-File -Append $logFile
node zoho-shopify-sync.js australia 2>&1 | Out-File -Append $logFile
"[$timestamp] Sync completed with exit code: $LASTEXITCODE" | Out-File -Append $logFile
```

**Option 2: Check Discord**

The completion report in Discord includes all the stats you need.

## Disable/Pause the Sync

Right-click the task → **Disable**

To re-enable: Right-click → **Enable**

## Delete the Task

Right-click the task → **Delete**
