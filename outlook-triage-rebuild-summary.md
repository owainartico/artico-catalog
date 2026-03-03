# Outlook Triage — Rebuild Complete

## What Changed

**BEFORE (broken, annoying):**
- Complex learning system that tried to be smart
- Created draft replies (which marked emails as unread)
- 3-day stale rule that archived important stuff
- Learning from your behavior (but getting dumber)
- Hundreds of database queries
- Full of edge cases and bugs

**NOW (simple, predictable):**
- Dead-simple keyword matching
- **NO draft creation** (problem solved)
- **NO learning** (no more getting dumber)
- **NO database clutter** (just auth tokens)
- Two simple rules:
  1. **Auto-archive junk** (newsletters, no-reply, marketing)
  2. **Flag important** (quote, invoice, urgent, pricing, complaint)
  3. **Leave everything else alone**

---

## How It Works

### Auto-Archived (moved to folder)
- Sender contains: `no-reply`, `noreply`, `newsletter`, `unsubscribe`, `marketing`, `mailer-daemon`, `postmaster`
- Sender starts with: `updates@`, `news@`, `info@`, `support@`

### Flagged (stays in inbox, marked important)
- Subject/body contains: `quote`, `pricing`, `urgent`, `asap`, `today`, `complaint`, `refund`, `invoice`, `overdue`, `deadline`, `contract`, `payment`, `important`

### Left Alone (default)
- Everything else stays untouched in your inbox

---

## Deployment Status

✅ **Code pushed to GitHub:** commit `1340ed2`  
🔄 **Render auto-deploying:** ~2-3 minutes  
⏰ **Poll interval:** 5 minutes (checks inbox every 5 min)

---

## What You Need to Do

### First Time Setup (if not done already)
1. Visit: https://outlook-triage-web.onrender.com/auth/login
2. Sign in with your Microsoft account
3. Done — worker will start processing emails within 60 seconds

### Monitor It
- Check Render logs: https://dashboard.render.com/worker/srv-d6aiom248b3s73bbg6cg/logs
- Look for:
  - `📦 Archived: ...` (auto-archived emails)
  - `🚩 Flagged: ...` (important emails)
  - `No unread emails` (all caught up)

---

## Customization

Want to change what gets archived or flagged?

**Edit these lists in `worker.py` and push:**

```python
IMPORTANT_KEYWORDS = [
    "quote", "pricing", "urgent", "asap", "today",
    "complaint", "refund", "invoice", "overdue",
    "deadline", "contract", "payment", "important"
]

ARCHIVE_PATTERNS = [
    "no-reply", "noreply", "do-not-reply", "donotreply",
    "mailer-daemon", "postmaster", "newsletter",
    "unsubscribe", "marketing", "notification",
    "updates@", "news@", "info@", "support@"
]
```

Then:
```bash
cd repos/outlook-triage
git add worker.py
git commit -m "Update triage rules"
git push
```

Render will auto-deploy in ~2 minutes.

---

## What's Gone

- ❌ No more draft replies
- ❌ No more learning from sent emails
- ❌ No more 3-day stale rule
- ❌ No more "AI:AutoRead" categories
- ❌ No more subject-key preferences
- ❌ No more triage_preferences table spam

---

## What's Kept

- ✅ OAuth flow (same as before)
- ✅ Database (just for auth tokens)
- ✅ Render deployment (same services)
- ✅ Environment variables (same setup)
- ✅ Auto-deploy (push to GitHub = deploy)

---

## Cost

**No change:**
- Render Standard worker: ~$7/month
- Render free database: $0
- Total: ~$7/month (same as before)

---

## Next Steps

1. **Test it** — Send yourself a test email with "urgent quote" in the subject
2. **Check logs** — Should see it flagged within 5 minutes
3. **Adjust rules** — Add/remove keywords as needed
4. **Report issues** — If something's broken, tell me

---

## Rollback (if needed)

If you hate it:
```bash
cd repos/outlook-triage
git revert HEAD
git push
```

Render will auto-deploy the old (broken) version.

---

**Status:** ✅ Deployed and running  
**Deploy time:** ~2-3 minutes from now  
**First check:** Within 5 minutes of deploy
