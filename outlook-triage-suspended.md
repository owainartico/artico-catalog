# Outlook Triage - Suspended

**Status:** Services paused, infrastructure preserved  
**Date:** 2026-02-28  
**Cost:** $0/month (was $7/month)

---

## What Was Suspended

✅ **outlook-triage-worker** - Background email processor  
✅ **outlook-triage-web** - OAuth/API web service  
✅ **outlook-triage-db** - PostgreSQL database (free tier, can keep running or suspend)

---

## Code Preserved

**GitHub repo:** https://github.com/owainartico/outlook-triage  
**Local copy:** `C:\Users\User\.openclaw\workspace\repos\outlook-triage`

**Latest version:** Simple triage system (archives junk, flags important, no drafts)

---

## How to Restart Later

### Via Render Dashboard

1. Go to: https://dashboard.render.com
2. Find services:
   - `outlook-triage-worker`
   - `outlook-triage-web`
3. Click each service → **Resume**
4. Wait ~2 minutes for deploy
5. Visit: https://outlook-triage-web.onrender.com/auth/login
6. Sign in with Microsoft account
7. Done — it'll start processing emails within 5 minutes

### Cost When Running

- Worker: ~$7/month (Standard plan)
- Web: $0 (can use Free tier if you want)
- Database: $0 (Free tier, 1GB)

**Total:** ~$7/month when active

---

## What It Does (When Active)

**Auto-archives:**
- Newsletters, no-reply, marketing emails → "Auto-Archived" folder

**Flags important:**
- Emails with: quote, invoice, urgent, pricing, complaint → flagged in inbox

**Leaves alone:**
- Everything else stays untouched

---

## Alternative: Native Outlook Rules

If you want something simpler without servers, I can write Outlook rules that do the same thing:

**Pros:**
- Free forever
- No maintenance
- Built into Outlook
- Same result

**Cons:**
- Runs on your device only (not cloud)
- Less flexible
- Manual setup required

Want the Outlook rules instead? Takes 2 minutes to set up.

---

## Files to Keep

Keep these for reference:
- `outlook-triage-rebuild-summary.md` - What the system does
- `outlook-triage-suspended.md` - This file
- `repos/outlook-triage/` - Full codebase

Everything else (old worker logic, database models) can be ignored.

---

**Next:** Suspend services in Render dashboard.
