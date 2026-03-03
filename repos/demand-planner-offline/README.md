# Demand Planner - Offline Version

**100% client-side demand planning app**

No database, no backend, no deployment headaches - all data stored in your browser.

## Features

- ✅ Sync items, sales, vendors from Zoho (via Make webhook)
- ✅ Full sales history analysis + monthly seasonality
- ✅ Planning group support (IF by Air, FYTM, China Standard, Factory, etc.)
- ✅ Reorder recommendations with customizable lead times
- ✅ Works offline after initial sync
- ✅ All data stored in browser (IndexedDB)

## How to Use

1. Open `index.html` in your browser
2. Go to Settings → "Sync from Zoho"
3. Wait for sync to complete (~1-2 minutes first time)
4. Data is now cached - works offline!

## Data Storage

- **IndexedDB** (~5-10MB): items, sales history, forecasts
- **localStorage** (~50KB): settings, planning group config

## vs Database Version

| Feature | Offline | Database |
|---------|---------|----------|
| Deployment | Static files | Node.js + PostgreSQL |
| Cost | Free | $6/month (database) |
| Speed | Instant | API latency |
| Reliability | ✅ Perfect | ❌ Database issues |
| Offline | ✅ Yes | ❌ No |
| Multi-user | ❌ No | ✅ Yes |

## Technical Details

**Storage:**
- Items: ~4,000 records (~2MB)
- Sales history: ~10,000 records (~3MB)
- Forecasts: ~24,000 records (~5MB)
- Total: ~10MB (well within IndexedDB limits)

**Sync:**
- Pulls data from Zoho via Make webhook
- Incremental sync (only new/changed records)
- Progress indicator during sync

**Forecast Engine:**
- Client-side JavaScript (port of Node.js version)
- Same monthly seasonality algorithm
- Results cached in IndexedDB

## Files

- `index.html` - Main app
- `app.js` - App logic + page rendering
- `db.js` - IndexedDB wrapper
- `sync.js` - Zoho data sync
- `forecast.js` - Forecast engine (client-side)
- `style.css` - UI styles

## Deployment

**Option 1: Local**
- Just open `index.html` in browser
- Data persists across sessions

**Option 2: GitHub Pages (free)**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin [your-repo]
git push -u origin main
# Enable GitHub Pages in repo settings
```

**Option 3: Netlify/Vercel (free)**
- Drag & drop the folder
- Auto-deploy on push

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (iOS 12.2+)
- Mobile: ✅ Works great (bottom nav)

## Security

- All data stays in YOUR browser
- No server = no data breach risk
- Zoho credentials only used via Make webhook (never stored)

## Limitations

- Single-user only (no collaboration)
- Data only on one device (unless manually synced)
- IndexedDB limit ~50-100MB (plenty for demand planning)

---

**Built for Artico by Django** 🎸
