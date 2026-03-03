# Demand Planner - Offline Conversion Plan

**Status:** Started (15% complete)  
**Estimated Time:** 2-3 hours remaining  
**Current blockers:** Database sync failing, data disappearing

---

## ✅ What's Done (Today)

1. Built full demand planner (12 commits, 3,835 lines)
2. Fixed sales sync, planning groups, mobile UI
3. Identified database reliability issues
4. Created offline app structure:
   - ✅ index.html (main structure)
   - ✅ README.md (documentation)
   - ⏳ db.js (IndexedDB wrapper) - IN PROGRESS
   - ⏳ sync.js (Zoho sync)
   - ⏳ forecast.js (client-side engine)
   - ⏳ app.js (main logic)
   - ⏳ style.css (UI)

---

## 📋 Remaining Work

### 1. IndexedDB Wrapper (db.js) - 30 mins
```javascript
// Core functions needed:
- initDB() - Create object stores
- saveItems(items[]) - Bulk insert items
- getItems(filter) - Query items
- saveSales(records[]) - Store sales history
- getForecasts(itemId) - Retrieve forecasts
- getSettings() / saveSettings()
```

### 2. Zoho Sync (sync.js) - 45 mins
```javascript
// Sync from Zoho via Make webhook
- syncItems() - Fetch items from Inventory
- syncSales() - Fetch invoices from Books
- syncVendors() - Fetch vendors
// Show progress: "Syncing items... 234/4000"
```

### 3. Forecast Engine (forecast.js) - 45 mins
```javascript
// Port from Node.js to JavaScript
- calculateMonthlyPattern(salesHistory)
- generateForecast(item, pattern)
- calculateVelocity(sales, days)
- detectSeasonality(pattern)
- getReorderRecommendations(items, forecasts)
```

### 4. Main App Logic (app.js) - 30 mins
```javascript
// Page rendering + navigation
- renderDashboard()
- renderForecast()
- renderReorder() - with planning group sections
- renderItems()
- renderSettings()
```

### 5. UI Styles (style.css) - 15 mins
- Copy from existing demand-planner/public/style.css
- Minor adjustments for offline mode

### 6. Testing - 15 mins
- Sync 4,000 items
- Generate forecasts
- Test reorder recommendations
- Verify offline functionality

---

## 🎯 Decision Point

**Option A: Continue Now**
- I build all remaining files tonight
- Takes ~2-3 more hours
- You'll have working offline app by end of session

**Option B: Resume Tomorrow**
- Save progress, pick up fresh tomorrow
- I'll complete the conversion in one focused session
- Less rushed, better testing

**Option C: Hybrid Approach**
- I build the core pieces tonight (db.js, sync.js)
- Get it to a "data syncs successfully" state
- Polish the UI/features tomorrow

---

## 📊 Why Offline is Better

| Issue | Database Version | Offline Version |
|-------|------------------|-----------------|
| Items sync failing | ❌ Can't fix reliably | ✅ No database needed |
| Data disappearing | ❌ PostgreSQL issues | ✅ Browser is reliable |
| Deployment complexity | ❌ Node.js + DB | ✅ Just HTML files |
| Cost | ❌ $6/month | ✅ Free |
| Speed | ❌ API latency | ✅ Instant |
| Works offline | ❌ No | ✅ Yes |

---

## 💾 Current File Structure

```
demand-planner-offline/
├── index.html          ✅ Done
├── README.md           ✅ Done
├── db.js               ⏳ Next
├── sync.js             ⏳ Pending
├── forecast.js         ⏳ Pending
├── app.js              ⏳ Pending
└── style.css           ⏳ Pending
```

---

## 🔄 Migration Path

Once offline version is working:

1. Test side-by-side with current app
2. Verify forecast accuracy matches spreadsheets
3. Switch supply.artico.au to offline version
4. Archive database version
5. Cancel Render database ($6/month saved)

---

**What would you like me to do?**
- A) Keep building tonight (2-3 hours)
- B) Resume tomorrow (fresh start)
- C) Just get data sync working tonight, polish tomorrow
