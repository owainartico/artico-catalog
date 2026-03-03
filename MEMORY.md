# MEMORY.md

## Credentials

**ALL credentials stored in:** `CREDENTIALS.md` (workspace root)  
- GitHub (owainartico)
- Render (dashboard access)
- Zoho OAuth (client ID, secret, refresh token)
- Database connection strings (artico-data, demand-planner-db)
- Application passwords

## Active Integrations

**Zoho:** OAuth credentials in `CREDENTIALS.md`. Direct API access (no Make.com). API docs → `reference/zoho-api.md`

**FieldFolio:** Credentials in `fieldfolio-credentials.json`. Daily stock sync runs 8:00 AM via Windows Task Scheduler. API docs → `reference/fieldfolio-api.md`

**Shopify:** Credentials in `shopify-credentials.json`. Australia store live. NZ not configured yet. API docs → `reference/shopify-api.md`

## OpenClaw Configuration

**Skills policy:** Never install community skills from clawhub.com. Use built-in skills only (discord, healthcheck, skill-creator, weather).

## Current Projects

None active.

## Coding Workflow

**All coding tasks route through Claude Code CLI** (90% cheaper, optimized for dev work):
- Path: `C:\Users\User\AppData\Roaming\npm\claude.cmd`
- Version: 2.1.52
- Usage: `claude.cmd -p "task description"`
- Applies to: All channels (Telegram, Discord, webchat)

## Lessons Learned

None yet.
