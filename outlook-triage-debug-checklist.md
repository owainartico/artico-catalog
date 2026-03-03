# Outlook Triage — Debug Checklist

## System Overview

**Repo:** `owainartico/outlook-triage`  
**Render services:**
- Web: `outlook-triage-web` (port 10000)
- Worker: `outlook-triage-worker` (background process)
- Database: `outlook-triage-db` (PostgreSQL with pgvector)

**Last commits:**
- 6ab6b88: Auto-fix DATABASE_URL for asyncpg
- cf3b256: Fix alembic env.py
- bac5b9e: Simplify preDeployCommand

---

## 1. Check Render Deployment Status

### Web Service
- [ ] Go to Render dashboard → `outlook-triage-web`
- [ ] Check if service is **Active** (green)
- [ ] Check recent deploys for errors
- [ ] View logs for startup errors

### Worker Service
- [ ] Go to Render dashboard → `outlook-triage-worker`
- [ ] Check if service is **Active** (green)
- [ ] Check logs for:
  - "Worker starting, poll interval=60s"
  - Sync activity (should happen every 60s)
  - Errors (Graph API calls, database, auth)

### Database
- [ ] Check `outlook-triage-db` is running
- [ ] Verify DATABASE_URL is set correctly in both services

---

## 2. Check Environment Variables

Both web + worker need these set in Render:

### Required (missing = service won't work)
- [ ] `MS_CLIENT_ID` — Azure app client ID
- [ ] `MS_CLIENT_SECRET` — Azure app secret
- [ ] `MS_TENANT_ID` — Azure tenant ID
- [ ] `MS_REDIRECT_URI` — Should be `https://outlook-triage-web.onrender.com/auth/callback` (or your actual Render URL)
- [ ] `FERNET_KEY` — Encryption key for refresh tokens
- [ ] `DATABASE_URL` — Must use `postgresql+asyncpg://...` scheme (Render gives `postgresql://`)
- [ ] `DATABASE_URL_SYNC` — Can use plain `postgresql://...`

### Optional (system works without these)
- [ ] `OPENAI_API_KEY` — If missing, uses placeholder replies
- [ ] `OPENAI_MODEL` — Defaults to gpt-4o-mini

**Common issue:** Render auto-generates `DATABASE_URL` as `postgresql://...` but the app needs `postgresql+asyncpg://...`  
**Fix:** Manually set DATABASE_URL with the asyncpg scheme (same host/creds, different prefix)

---

## 3. Check OAuth Setup

### Azure AD App Registration
- [ ] Go to Azure Portal → App registrations → your app
- [ ] Check **Redirect URIs** includes your Render callback URL
- [ ] Check **API permissions** has:
  - Mail.ReadWrite (delegated)
  - Mail.Send (delegated)
  - User.Read (delegated)
  - offline_access (delegated)
- [ ] Check **Certificates & secrets** has an active client secret
- [ ] Verify Client ID, Tenant ID, Secret match Render env vars

### First-Time Auth
- [ ] Visit `https://outlook-triage-web.onrender.com/auth/login`
- [ ] Should redirect to Microsoft login
- [ ] After successful login, should show JSON with account ID
- [ ] Check database → `accounts` table should have 1 row

---

## 4. Check Worker Activity

### Logs to look for (in `outlook-triage-worker` logs):

**Good signs:**
```
Worker starting, poll interval=60s
Account 1: synced 47 messages
Synced inbox for account 1: 12 messages
Synced sentitems for account 1: 5 messages
Classify -> ignored: newsletter@example.com (Weekly Digest)
AI:AutoRead -> mark read + move: automated@example.com (Order Confirmation)
Learned (sender@domain.com, *) -> needs_reply [sent_reply]
```

**Bad signs:**
```
Error processing account 1
401 Unauthorized
SQLALCHEMY_DATABASE_URI not set
Failed to mark/move email
```

---

## 5. Common Problems

### Problem: Worker not syncing
**Symptoms:** No "synced X messages" logs  
**Causes:**
- OAuth refresh token expired → Re-auth at `/auth/login`
- Graph API credentials wrong → Check MS_CLIENT_ID/SECRET/TENANT_ID
- Database connection failing → Check DATABASE_URL

### Problem: Emails not being triaged
**Symptoms:** Emails sync but no triage_result set  
**Causes:**
- Worker not running (check Render dashboard)
- Error in triage logic (check worker logs for exceptions)
- No account row in database (run `/auth/login` first)

### Problem: Drafts not being created
**Symptoms:** Emails triaged as needs_owain but no drafts in Outlook  
**Causes:**
- Graph API permissions missing (Mail.Send)
- OpenAI API key invalid (system falls back to placeholder, but draft should still create)
- Check worker logs for "Failed to create draft"

### Problem: 401 Unauthorized from Graph API
**Causes:**
- Refresh token expired → Re-auth
- Wrong tenant ID
- App registration missing permissions

### Problem: Database errors
**Causes:**
- DATABASE_URL using wrong scheme (needs postgresql+asyncpg://)
- Migrations didn't run (check web service predeploy logs)
- Database plan too small (free plan should be fine for now)

---

## 6. Manual Testing

### Test sync + triage manually (on Render shell or local):
```python
# In Python console with DATABASE_URL set:
from app.db import async_session
from app.models import Account
from app.graph import GraphClient
from app.sync import run_full_sync
from sqlalchemy import select
import asyncio

async def test_sync():
    async with async_session() as db:
        result = await db.execute(select(Account))
        account = result.scalar_one()
        client = GraphClient(account, db)
        count = await run_full_sync(account, client, db)
        print(f"Synced {count} messages")

asyncio.run(test_sync())
```

### Check database directly:
```sql
-- Count emails by triage result
SELECT triage_result, COUNT(*) FROM emails GROUP BY triage_result;

-- List recent emails
SELECT sender_address, subject, triage_result, folder 
FROM emails 
ORDER BY received_at DESC 
LIMIT 20;

-- Check learned preferences
SELECT sender_address, subject_key, preference, source 
FROM triage_preferences;

-- Check drafts created
SELECT COUNT(*) FROM draft_records;
```

---

## 7. What to Check Right Now

1. **Is the worker running?** Check Render logs for `outlook-triage-worker`
2. **Has OAuth been completed?** Check database → `accounts` table (should have 1 row)
3. **Is DATABASE_URL correct?** Must use `postgresql+asyncpg://...` scheme
4. **Are emails syncing?** Check worker logs for "synced X messages"
5. **Are emails being triaged?** Query database → `SELECT COUNT(*) FROM emails WHERE triage_result IS NOT NULL;`

---

## Next Steps

**Tell me what you see when you check:**
1. Render dashboard status (are services green?)
2. Worker logs (paste last 50 lines)
3. Any error messages

I'll help you fix whatever's broken.
