# Demand Planner Testing Results
**Date:** 2026-02-26 21:05 AEDT  
**URL:** https://supply.artico.au  
**Password:** artico2026

---

## ✅ Working Features

### 1. **Items Sync - Partially Working**
- ✅ 3,984 items synced successfully
- ✅ Items page loads and shows all items
- ✅ Status filter works (active, discontinued, etc.)
- ⚠️ **Issue:** Supplier column shows "-" for all items
  - Phase 2 of sync (detailed vendor fetch) may not have completed
  - Need to investigate why vendor data isn't populating

### 2. **Planning Groups - Partially Populated**
- ✅ Planning group field is being extracted
- ⚠️ **Issue:** "zDiscontinued" appearing in BRAND column
  - Suggests planning group value ("9Z Do Not Reorder-Discontinued") is somehow ending up in brand field
  - May be a mapping issue in the sync code

### 3. **UI Components**
- ✅ Login works
- ✅ Navigation works (Dashboard, Items, Settings, etc.)
- ✅ Settings page loads with sync controls
- ✅ Sync buttons present and clickable

---

## ❌ Issues Found

### 1. **Settings API Failing (401 Unauthorized)**
**Error:** `Failed to load resource: the server responded with a status of 401 ()`  
**Endpoint:** `/api/settings`

**Impact:**
- Planning Group Settings section doesn't render
- Can't view or edit lead time + buffer configuration
- Settings values can't be saved

**Likely Cause:**
- Settings endpoint might not have proper auth middleware
- Or settings table doesn't exist (migration 002 not applied)

**Fix Needed:**
Check Render logs for:
```
- Migration 002 status
- Settings endpoint auth configuration
- Database table creation errors
```

### 2. **Sales History Sync Failed**
**Status:** `error · 0 records · 26 Feb 2026`

**Impact:**
- No sales data = no forecasts can be generated
- Forecast engine will fail or return "insufficient_data" for all items

**Likely Causes:**
1. **Zoho Books API issue** - wrong endpoint or missing permissions
2. **Data format mismatch** - invoice structure changed
3. **Date range issue** - trying to fetch too much history at once

**Fix Needed:**
- Check Render logs for sales sync error details
- Test Zoho Books `/v3/invoices` endpoint manually
- Verify date range params

### 3. **Vendor Data Not Syncing**
**Observed:** All items show "-" in Supplier column

**Likely Cause:**
- Phase 2 of sync (detailed item fetch for vendor data) timing out or failing
- Rate limiting from Zoho (100+ items × detailed fetch = slow)
- Error in the vendor extraction from custom_fields

**Fix Needed:**
- Check Render logs for vendor sync phase errors
- Consider batching vendor sync (process 50 items at a time, commit, continue)
- Add retry logic for failed vendor fetches

### 4. **Planning Group Mapping Issue**
**Observed:** "zDiscontinued" in BRAND column (should be in planning_group column)

**Likely Cause:**
- Sync code might be setting `brand` instead of `planning_group` when extracting from `cf_discontinued` field
- Or frontend is displaying planning_group data in the wrong column

**Fix Needed:**
Check `src/services/sync.js` line where planning group is extracted:
```javascript
// Should be:
planning_group = pgField.value;

// NOT:
brand = pgField.value;
```

---

## 🔍 Next Steps

### Immediate (to unblock testing):

1. **Check Render logs** for:
   - Migration 002 status (`ALTER TABLE items ADD COLUMN planning_group`)
   - Sales sync error details
   - Vendor sync phase 2 completion status

2. **Fix settings API** (highest priority):
   - Verify migration 002 applied
   - Check if `/api/settings` endpoint has auth middleware
   - Test settings endpoint manually: `curl https://supply.artico.au/api/settings`

3. **Fix sales sync**:
   - Review sync code for Zoho Books endpoint
   - Add error handling + logging
   - Start with small date range (last 30 days) to test

4. **Fix vendor sync**:
   - Add progress logging to phase 2
   - Implement retry logic for failed fetches
   - Consider background job for vendor sync (don't block main sync)

### Testing Sequence (once fixes applied):

1. **Run full sync** → Settings → "Sync All"
   - Verify items, sales, vendors all succeed
   
2. **Check Items page**:
   - Supplier column populated
   - Planning group shows correct values
   - Brand column shows actual brand names

3. **Generate Forecasts** → Settings → "Generate Forecasts"
   - Should process ~3,984 items
   - Check for quality flags (good/fair/poor/insufficient)

4. **Generate Recommendations** → Settings → "Generate Recommendations"
   - Should respect planning group lead times
   - Check reorder thresholds

5. **View Reorder page**:
   - Should show grouped view by planning group
   - Verify Main Runners, China Standard, FYTM, Factory sections appear
   - Check notes show planning group info + forecast quality

---

## 📊 Summary

**Deploy Status:** ✅ All code deployed to Render  
**Database Migration:** ❓ Need to verify migration 002 applied  
**Data Sync:** ⚠️ Items OK, Sales failed, Vendors incomplete  
**UI:** ✅ Working, Settings section missing due to API error  
**Forecast Engine:** ⏭️ Can't test until sales data syncs  
**Reorder Logic:** ⏭️ Can't test until forecasts generated  

**Blockers:**
1. Sales sync failing → no forecast data
2. Settings API 401 → can't configure lead times
3. Vendor sync incomplete → supplier grouping won't work

**Recommendation:**
- Focus on fixing sales sync first (highest priority)
- Then fix settings API
- Then re-run full sync + forecast + reorder generation
