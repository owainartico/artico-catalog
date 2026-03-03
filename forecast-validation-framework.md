# Demand Planner Forecast Validation Framework

**Purpose:** Validate forecast accuracy against historical ordering patterns

---

## Sample Item Analysis

### SKU 35801: TRAVEL BOOK REST - BLUE

**Planning Group:** `5 IF by Air`  
**Brand:** IF for Books  
**Status:** Active

**Current Inventory:**
- Stock on hand: **15 units**
- Reorder level (Zoho): **110 units**
- **Gap:** 95 units below reorder point

**Pricing:**
- Cost: $6.08 USD
- Price: $11.34 AUD  
- Margin: 46%

**Planning Group Settings (IF by Air):**
- Lead time: 60 days (air freight from UK)
- Safety buffer: 30 days
- **Total reorder threshold: 90 days**

---

## Forecast Validation Methodology

### Step 1: Calculate Implied Velocity from Reorder Level

If reorder level = 110 and threshold = 90 days:

**Implied velocity = 110 ÷ 90 = 1.22 units/day**

This means Zoho's reorder level suggests this item sells ~37 units/month.

### Step 2: Compare Against Forecast Engine Output

Once sales data syncs, the forecast engine will:

1. **Pull ALL sales history** for SKU 35801
2. **Calculate monthly distribution %** (Jan: X%, Feb: Y%, etc.)
3. **Determine annual velocity**
4. **Project monthly forecast** = annual_velocity × monthly_%

**Validation Check:**
- Does forecast velocity ≈ 1.22 units/day?
- If significantly different (>30% variance), investigate why:
  - Trending up/down?
  - Seasonal item?
  - Reorder level outdated?

### Step 3: Check Against Actual PO History

Pull last 3-6 POs for SKU 35801:
- How much was ordered each time?
- How frequently?
- Were orders placed when stock hit ~110 units?

**Expected pattern for IF by Air:**
- Orders every ~90 days
- Order quantity ≈ 110-150 units (3-4 months of cover)
- Batched with other IF by Air items to meet £7k minimum

### Step 4: Validate IF by Air Minimum Order Logic

**Total IF by Air items needing reorder:**
- Sum all IF by Air recommendations
- Calculate total value in GBP
- If < £7,000, app should show alert: "Add £X more to meet minimum"

**Example:**
```
IF by Air Recommendations:
- SKU 35801: 110 units × £4.50 = £495
- SKU 35802: 200 units × £8.00 = £1,600
- SKU 35803: 150 units × £6.50 = £975
---
Total: £3,070 / £7,000
Alert: "Need £3,930 more to meet IF by Air minimum order value"
```

---

## Validation Checklist

### Once Sales Data Syncs:

- [ ] Run Generate Forecasts
- [ ] Check SKU 35801 forecast quality (should be "good" or "fair")
- [ ] Compare forecast velocity to 1.22 units/day baseline
- [ ] Review monthly pattern (is it seasonal?)

### Once Forecasts Generated:

- [ ] Run Generate Recommendations
- [ ] Check if SKU 35801 appears (should, since 15 < 110)
- [ ] Verify recommended qty ≈ 95-110 units
- [ ] Check planning group = "IF by Air" or "5 IF by Air"
- [ ] Verify lead time threshold = 90 days (60 + 30)

### Reorder Page Checks:

- [ ] SKU 35801 appears in "IF by Air" section
- [ ] Notes show "IF by Air · 60d lead + 30d buffer"
- [ ] If total IF by Air < £7k, alert shows
- [ ] Can select items and create draft PO

---

## Expected Results for SKU 35801

### Scenario: No sales history (current state)

**Forecast Quality:** `insufficient_data`  
**Velocity:** 0 units/day  
**Recommendation:** ⚠️ "No sales history — manual review required"

**Action:** Skip auto-reorder, use Zoho's reorder level (110) as reference

### Scenario: 6 months sales history

**Forecast Quality:** `fair`  
**Velocity:** ~1.0-1.5 units/day (estimated)  
**Recommendation:** Order 95-120 units  
**Urgency:** `reorder_now` or `upcoming` (depends on velocity)

### Scenario: 12+ months sales history, stable pattern

**Forecast Quality:** `good`  
**Velocity:** 1.22 units/day (matches reorder level)  
**Recommendation:** Order 110 units  
**Urgency:** `upcoming` (if > 90 days stock) or `reorder_now` (if < 90 days)

**Monthly Pattern Example:**
```json
{
  "jan": 0.08, "feb": 0.08, "mar": 0.09,
  "apr": 0.08, "may": 0.08, "jun": 0.08,
  "jul": 0.09, "aug": 0.09, "sep": 0.08,
  "oct": 0.08, "nov": 0.09, "dec": 0.08
}
```
(Fairly flat — not seasonal, sells consistently year-round)

---

## Other IF by Air Items to Check

**Next steps:**
1. Query all items where `cf_discontinued LIKE '%IF by Air%'`
2. Pull their current stock, reorder levels, costs
3. Calculate total value to validate £7k threshold logic
4. Check if any are below reorder level (urgent orders needed)

**Expected count:** Unknown (sample found 1, likely 10-50 total)

---

## Validation Summary

**Before sales sync:**
- ✅ IF by Air items exist in Zoho
- ✅ Planning group field populated correctly
- ✅ Reorder levels defined (110 for SKU 35801)
- ⏭️ Can't validate velocity until sales data syncs

**After sales sync:**
- Compare forecast velocity to implied velocity from reorder level
- Check forecast quality flags
- Validate monthly patterns make sense
- Test full reorder flow for IF by Air batch

**After PO creation:**
- Compare recommended qty to actual order history
- Validate £7k minimum logic
- Check if orders align with forecast projections

---

## Action Items

1. **Fix sales sync** (highest priority)
   - Currently failing with 0 records
   - Blocks all forecast validation

2. **Query all IF by Air items**
   - Get count, total value, stock status
   - Prepare for minimum order alert testing

3. **Document actual ordering patterns** (manual, from Owain)
   - How often do you order IF by Air items?
   - Typical order value?
   - Do you batch with other items to hit £7k?

4. **Test end-to-end once data syncs:**
   - Sync → Forecast → Recommendations → PO Creation
   - Validate at each step
