# Skoocloud Calls Report → Artico Sales Import

**Schedule:** Daily at 11:00 AM AEST/AEDT (Australia/Melbourne)

## Credentials

### Skoocloud Reporting
- URL: https://databridge.skoocloud.com/report/artico
- Username: admin
- Password: nectar56

### Artico Sales Platform
- URL: https://sales.artico.au/
- Username: owain@artico.net.au
- Password: U6dK3iCAXmE7yTc

## Steps

### STEP 1: Log into Skoocloud Reporting
- Navigate to https://databridge.skoocloud.com/report/artico
- Log in with credentials above
- Wait for page to fully load

### STEP 2: Get the Calls Report for Yesterday
- Default report is "Rep Activity Summary"
- Click report dropdown → select "Calls Report"
- Click "yesterday" button for date range
- Wait for report to load (~40-50 rows)

### STEP 3: Fetch the CSV Data
- Use JavaScript POST to https://databridge.skoocloud.com/report/rpt-diary.php
- Parameters: section=15, rep=(empty), filtercust=(empty), filterstamp=(empty), sort=-, output=csv
- Returns ~13,800-14,000 chars of CSV data
- Store in memory

### STEP 4: Log into Artico Sales Platform
- Open new tab → https://sales.artico.au/
- Log in with credentials above (may already be authenticated)

### STEP 5: Navigate to Import CSV Page
- Click "Team" tab (bottom nav)
- Click "Users" tab (top)
- Click "Import CSV" button

### STEP 6: Upload and Import
- On "Import Visits CSV" page, use JavaScript to:
  - Create File object from CSV data
  - Set file on hidden input #import-file-input
  - Call global importFileSelected()
- Preview shows first 20 rows
- Expected: "43 rows | 38 valid | 5 non-Zoho skipped" (approximate)
- Click "Import All Valid Rows"
- Wait for completion: "✓ XX visits imported"

### STEP 7: Verify Success
- Page should show "IMPORT COMPLETE - XX visits imported"

## Notes
- Yesterday's data only, never today
- CSV has 8 header rows before data
- Non-Zoho rows are expected to be skipped
- Timezone: Australia/Melbourne
- If import fails, check credentials and session state
