# Zoho API Reference

**Direct API (preferred):** Credentials in `zoho-credentials.json`. Use refresh token to get access tokens from `https://accounts.zoho.com/oauth/v2/token`. Read-only access to Books, Inventory, CRM, Projects, Campaigns, WorkDrive. Ask before any writes.

**Legacy Make webhook (still works):** POST to https://hook.us1.make.com/2lt6dqdnb3zdoqfgpneneahbrcddq174 with Content-Type application/json.

## Zoho Books

`{"app": "books", "method": "GET", "url": "/v3/ENDPOINT"}`

**Endpoints:**
- /v3/invoices
- /v3/salesorders
- /v3/contacts
- /v3/items
- /v3/bills
- /v3/expenses
- /v3/creditnotes
- /v3/estimates
- /v3/customerpayments
- /v3/reports/profitandloss
- /v3/reports/balancesheet

**Filters:**
- ?status=overdue
- ?status=open
- ?customer_name=QBD
- ?search_text=compact+lenses
- ?date_start=2025-01-01&date_end=2025-06-30
- ?page=1&per_page=25

## Zoho Inventory

`{"app": "inventory", "method": "GET", "url": "/v1/ENDPOINT"}`

**Endpoints:**
- /v1/items
- /v1/salesorders
- /v1/purchaseorders
- /v1/contacts
- /v1/itemgroups
- /v1/packages
- /v1/shipmentorders

## Zoho Campaigns

`{"app": "campaigns", "method": "GET", "url": "/v1.1/ENDPOINT"}`

**Endpoints:**
- /v1.1/recentsentcampaigns
- /v1.1/getmailinglists
- /v1.1/campaigndetails?campaignkey=KEY

## Zoho WorkDrive

**Browse:** `{"app": "workdrive", "method": "GET", "url": "/v1/ENDPOINT"}`
- /v1/files/RESOURCE_ID/files to list folders

**Django folder ID:** vz86yc1f316fa2fa64f46bb55c8112f0352f7

**Upload (Django folder only):** `{"app": "workdrive_upload", "filename": "name.csv", "content": "data"}`
- Also: workdrive_mkdir, workdrive_trash, workdrive_rename

**Download (any file):** `{"app": "workdrive_download", "resource_id": "<resource_id>"}` 
- Returns temporary public download URL
- Then download with curl/Invoke-WebRequest, no auth needed

## Zoho Projects

`{"app": "projects", "method": "GET", "url": "/restapi/portal/artico618/ENDPOINT"}`

**Endpoints:**
- /restapi/portal/artico618/projects/
- /restapi/portal/artico618/projects/PROJECT_ID/tasks/
- /restapi/portal/artico618/projects/PROJECT_ID/milestones/
- /restapi/portal/artico618/projects/PROJECT_ID/tasklists/

## Notes

- All read queries are GET only
- Write operations only work in Django WorkDrive folder
- Artico org ID: 689159620
