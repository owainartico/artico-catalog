# Product Classification Analysis & Recommendations

**Date:** 2026-02-26  
**Context:** Demand Planner requires strict classification for forecasting, reorder grouping, and supplier management

---

## Current State Analysis

### Data Quality (100 active items sampled)

**UPDATE:** Vendor data EXISTS but is NOT included in the `/v1/items` list endpoint. It's only available in the detailed item endpoint (`/v1/items/{item_id}`). This means:
- Items ARE linked to vendors in Zoho
- The demand planner sync needs to fetch each item's detail to get `vendor_id` and `vendor_name`
- This will slow down the initial sync (100 items = 100 API calls vs 1 paginated call)

| Field | Populated | Missing | Quality Issue |
|-------|-----------|---------|---------------|
| **vendor_name** | Unknown | Unknown | 🟡 **Data exists but not in list endpoint** — need to modify sync |
| **brand** | 92% (92/100) | 8% | 🟡 Mostly good, some cleanup needed |
| **cf_product_category** | 94% (94/100) | 6% | 🟢 Good coverage |
| **cf_discontinued** | ~100% | 0% | 🟢 Well maintained |
| **status** | 100% | 0% | 🟢 Clean (active/inactive) |

### Key Findings

1. **❌ No supplier data** — Items aren't linked to vendors in Zoho, even though 50+ vendors exist. This breaks:
   - Supplier grouping in order builder
   - Supplier performance tracking
   - Automated PO draft creation

2. **✅ Brand classification is decent** — `brand` and `cf_brand` fields are mostly populated
   - Examples: "Compact Lenses", "Beatrix Potter Adventures", "Retro Humour"
   - A few items missing brand (8%)

3. **✅ Product category exists** — Custom field `cf_product_category` is well-maintained
   - Examples: "Reading Glasses", "Jigsaw Puzzles", "Calendars & Diaries"
   - Could be standardized further (some inconsistency: "Puzzles Jigsaw" vs "Jigsaw Puzzles")

4. **✅ Lifecycle tracking works** — `cf_discontinued` field captures deleted/discontinued items

---

## Problems This Causes for Demand Planner

### 1. **Reorder recommendations can't group by supplier**
Without vendor linkage, the app can't:
- Show "Order from XYZ Supplier: 23 items urgent"
- Build draft POs grouped by supplier
- Track which suppliers have slow turnaround or quality issues

### 2. **Forecasting is generic**
Without supplier info, you can't:
- Factor in lead times per supplier (some suppliers might be 60 days, others 120 days)
- Track supplier seasonality (e.g., Chinese New Year shutdowns)
- Flag supplier-specific stockouts

### 3. **Order builder is broken**
The PO creation flow assumes items → suppliers linkage. Without it:
- Manual supplier assignment for every order
- No validation that items are from the right supplier
- Can't pre-fill PO details from supplier contact info

---

## Recommendations

### ✅ **Priority 1: Link Items to Vendors — RESOLVED**

**Problem (RESOLVED):** Vendor data exists in Zoho but wasn't being synced

**Solution:** Updated demand planner sync to use 2-phase approach:
1. Fast sync: Fetch all items from list endpoint (basic data)
2. Detailed sync: Fetch vendor data for active items only (slower but complete)

**Status:** Fixed and deployed. Next sync will populate vendor data for all active items.

**Note:** Vendor linkage in Zoho is per-item. If an item is purchased from multiple suppliers, Zoho only stores one "preferred vendor". For multi-source items, you'll need to track alternate suppliers separately (could add a custom field `cf_alternate_vendors`).

---

### 🟡 **Priority 2: Standardize Product Categories**

**Problem:** Minor inconsistencies in `cf_product_category`:
- "Jigsaw Puzzles" vs "Puzzles Jigsaw"
- Some categories are too granular ("Peter Rabbit", "Claire Coxon Art Deco")
- No hierarchy (no way to roll up "Peter Rabbit" → "Kids Books")

**Solution:**

#### Step 1: Define a category taxonomy
Example structure:
```
└── Chapter & Light
    ├── Stationery
    │   ├── Calendars & Diaries
    │   ├── Pens
    │   └── Notebooks
    ├── Gifts
    │   ├── Jigsaw Puzzles
    │   ├── Games
    │   └── Scratch Maps
    ├── Reading Accessories
    │   └── Reading Glasses
    └── Kids
        ├── Beatrix Potter
        └── Peter Rabbit

└── Shall We Bloom
    ├── Apparel
    ├── Home Decor
    └── Stationery

└── Salt & Wattle (Factory)
    ├── Magnets
    ├── Ornaments
    └── Raw Materials
```

#### Step 2: Add custom fields
- `cf_category_L1` (e.g., "Gifts")
- `cf_category_L2` (e.g., "Jigsaw Puzzles")
- `cf_brand_line` (e.g., "Chapter & Light", "Shall We Bloom", "Salt & Wattle")

This lets you:
- Filter/group by brand line (external vs factory)
- Roll up forecasts by category
- Spot trends ("Gifts are up 20% this quarter")

---

### 🟢 **Priority 3: Add Lead Time & Reorder Point Fields**

**Problem:** Demand planner assumes 90-day lead time for everything. Reality varies:
- Some Chinese suppliers: 60 days
- Others: 120 days
- Factory raw materials: 30 days

**Solution:** Add custom fields to items:
- `cf_lead_time_days` (default 90, override per item)
- `cf_reorder_point` (manual override for min stock level)
- `cf_order_multiple` (pack size — some suppliers require ordering in multiples of 12, 24, etc.)

Zoho already has a `reorder_level` field but it's not consistently used.

**Action:** Decide if you want to use the built-in `reorder_level` or add a custom field for more control.

---

### 🟢 **Priority 4: Lifecycle Flags (Minor Improvements)**

**Current:** `cf_discontinued` field has values like "DELETED", and `status` is "active" or "inactive"

**Enhancement:** Add a more nuanced lifecycle field:
- `cf_lifecycle_stage`:
  - **Active** — Current, reorder normally
  - **Phasing Out** — Don't reorder, sell through existing stock
  - **Discontinued** — No longer sold
  - **Seasonal** — Only reorder in certain months
  - **New** — Recently launched, high priority for stock

This helps the demand planner:
- Skip "phasing out" items from reorder recommendations
- Flag seasonal items for pre-season ordering
- Prioritize new products

---

## Supplier Classification (New Section)

Since you have ~50 vendors, you should also classify **suppliers** themselves:

### Recommended Supplier Fields (add to Zoho Contacts)

| Field | Purpose | Example Values |
|-------|---------|----------------|
| `cf_supplier_type` | Distinguish manufacturers vs logistics | "Manufacturer", "Freight Forwarder", "Local Service" |
| `cf_supplier_location` | Where they're based | "China - Guangdong", "Australia - VIC", "USA" |
| `cf_default_lead_time_days` | How long orders usually take | 90, 60, 30 |
| `cf_min_order_value_usd` | Minimum order threshold | 5000, 10000 |
| `cf_payment_terms` | Standard terms | "30% deposit, 70% on shipping", "Net 30" |
| `cf_supplier_tier` | Priority/quality rating | "Tier 1" (preferred), "Tier 2" (backup), "Tier 3" (phase out) |
| `cf_production_shutdown_months` | Seasonal closures | "Feb" (Chinese New Year), "Dec-Jan" |

**Why this matters:**
- Demand planner can warn "Supplier X shuts down in February, order early"
- Can calculate whether an order meets minimum order value
- Can group suppliers by tier (prefer Tier 1 when possible)

---

## Implementation Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ **Link all items to vendors** (Option A or B above)
2. ✅ **Add `cf_lead_time_days` field** to items
3. ✅ **Run initial sync** and verify data quality in demand planner

### Phase 2: Category Cleanup (Week 2-3)
1. Define category taxonomy (1-2 levels deep)
2. Add `cf_category_L1` and `cf_brand_line` fields
3. Bulk update all items
4. Update demand planner UI to show category filters

### Phase 3: Supplier Enhancement (Week 3-4)
1. Add supplier custom fields (lead time, location, tier, etc.)
2. Populate for top 20 suppliers
3. Update demand planner to factor in supplier-specific lead times

### Phase 4: Lifecycle Refinement (Ongoing)
1. Add `cf_lifecycle_stage` field
2. Tag seasonal items
3. Update reorder logic to respect lifecycle

---

## Quick Wins You Can Do Today

1. **Export active items** → add vendor column → re-import (fixes 80% of the problem)
2. **Set default lead time** to 90 days in demand planner settings (covers most items)
3. **Tag top 10 fast-movers** with accurate reorder points

---

## Questions for Owain

1. **Do you have a master list of item→supplier mappings?** (e.g., Excel sheet, or can we derive it from PO history?)
2. **Are most of your Chinese suppliers 90 days, or does it vary a lot?**
3. **Do you want seasonal products flagged separately?** (e.g., calendars only reorder Aug-Nov)
4. **Should factory items (Salt & Wattle) be in a separate category entirely, or mixed with external products?**
5. **What's your preferred way to classify brands?** Keep `brand` as product line (e.g., "Compact Lenses") and add `cf_business_line` for Chapter & Light / Shall We Bloom / Salt & Wattle?

---

## Summary

**✅ Vendor linkage:** FIXED — sync now fetches vendor data for active items  
**Next priorities:**
1. Standardize product categories (add hierarchy: L1/L2, brand line)
2. Add lead time fields (per-item override for 90-day default)
3. Enhanced lifecycle stages (Seasonal, Phasing Out, New)
4. Supplier metadata (tier, location, shutdown periods)

Let me know which option you want for vendor linkage and I can help script it or guide the manual process.
