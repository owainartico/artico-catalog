# Demand Planner — Product Spec & Architecture

**App:** demand.artico.au (standalone)
**Date:** 2026-02-26
**Status:** Draft

---

## 1. Overview

A standalone web app for Artico's demand planner / supply chain manager to automate forecasting, generate reorder recommendations, build purchase orders by supplier, manage item lifecycle, and track orders post-placement.

**Two supply streams:**
1. **Finished goods** — ordered from ~30 suppliers in China, 90-day lead time, monthly ordering cycle (first week of month)
2. **Raw materials** — for Salt & Wattle Studio (in-house factory), calculated from factory demand via Zoho composite item ratios

**Scale:** ~1,000 active SKUs, ~30 suppliers.

---

## 2. Data Sources

All data pulled from Zoho via the existing Make webhook.

| Source | Data | Zoho App |
|--------|------|----------|
| Sales history | Invoice line items, quantities, dates | Zoho Books |
| Current inventory | Stock on hand per item | Zoho Inventory |
| Item master | SKU details, supplier, cost, composite mappings | Zoho Inventory |
| Purchase orders | Existing open POs | Zoho Books |
| Composite items | Raw material ratios for factory items | Zoho Inventory |
| Sales orders | Open/pending sales orders (committed demand) | Zoho Books |

---

## 3. Core Modules

### 3.1 Forecast Engine

Generates demand forecasts per SKU based on historical sales.

**Inputs:**
- 12-24 months of sales history (invoice line items from Zoho Books)
- Seasonality patterns (detected automatically or manually flagged)
- Current open sales orders (committed demand)

**Forecast methods:**
- **Moving average** (default) — weighted average of last 3/6/12 months
- **Trend-adjusted** — linear trend overlay on moving average
- **Seasonal decomposition** — for items with clear seasonal patterns (e.g. Christmas)

**Outputs per SKU:**
- Forecast monthly demand (units) for next 6 months
- Average daily velocity
- Trend direction (↑ growing, → stable, ↓ declining)
- Confidence indicator (high/medium/low based on data consistency)
- Projected stock-out date (current stock ÷ daily velocity)

**Stored locally in app DB** — recalculated on demand or on a schedule (weekly). Raw sales data cached to avoid hammering Zoho on every page load.

### 3.2 Reorder Recommendations

Runs monthly (or on-demand) to generate a prioritised list of items to reorder.

**Calculation:**
```
Required stock = (forecast_daily_velocity × (lead_time_days + safety_stock_days))
Reorder qty    = required_stock - current_stock - incoming_stock (open POs)
```

**Safety stock:** configurable per item or category, default = 30 days of forecast demand.

**Item flags:**

| Flag | Criteria | Colour |
|------|----------|--------|
| 🔴 Critical | Stock-out within lead time, no open PO | Red |
| 🟠 Reorder now | Stock-out within lead time + safety, no open PO | Orange |
| 🟡 Upcoming | Reorder needed this cycle | Yellow |
| 🟢 Healthy | Sufficient stock | Green |
| ⚫ Dead stock | < 1 unit/month velocity for 6+ months | Grey |
| 🚫 Discontinue candidate | Dead stock + high holding cost or low margin | Strikethrough |

**MOQ handling:**
- If reorder qty < supplier MOQ, flag it and suggest:
  - Round up to MOQ (show cost impact)
  - Bundle with other items from same supplier
  - Skip this cycle (show projected stock-out impact)

### 3.3 Order Builder

Interactive tool to build purchase orders from recommendations.

**Workflow:**
1. View recommendations filtered by supplier/brand/urgency
2. Select items to order (bulk select by supplier, or cherry-pick)
3. Adjust quantities (pre-filled from forecast, editable)
4. Review grouped by supplier — one PO per supplier
5. Submit → creates draft POs in Zoho Books

**Supplier grouping logic:**
- Each item has a primary supplier in Zoho
- Order builder groups selected items by supplier automatically
- Shows PO total per supplier
- Flags if a supplier PO is under their MOQ threshold

**Draft PO creation (Zoho Books):**
- Reference: `Forecast-YYYY-MM-<supplier_code>`
- Line items: item_id, quantity, rate (from Zoho item cost)
- Status: Draft (not sent until manually approved in Zoho)
- Notes: auto-generated summary of forecast basis

### 3.4 Item Lifecycle Management

Manage the status of every SKU in the catalogue.

**Statuses:**
- `active` — in catalogue, included in forecasts
- `slow_mover` — auto-flagged when velocity drops below threshold
- `discontinued` — excluded from forecasts and reorder recommendations
- `new` — recently added, insufficient data for forecasting (< 3 months history)

**Actions:**
- Mark as discontinued → stops showing in reorder recommendations
- Mark as slow mover → still shows but with warning
- Reactivate discontinued item
- Bulk status changes (e.g. discontinue all items in a product line)

**Auto-flagging rules:**
- Item sells < 1 unit/month for 6 consecutive months → auto-flag as `slow_mover`
- Item has zero sales for 12 months → suggest `discontinued`
- New item with < 3 months history → flag as `new`, use manual forecast override

### 3.5 Post-Order Tracker

Track POs from placement through to delivery.

**Statuses:**
```
draft → sent → confirmed → in_production → shipped → in_transit → received → closed
```

**Data sources:**
- PO status from Zoho Books (draft/sent/received)
- Manual status updates for production/shipping milestones
- Optional: shipping tracking integration (future)

**Dashboard view:**
- Timeline of all open POs
- Expected arrival dates (order date + lead time)
- Alerts for overdue POs (past expected arrival)
- Quick action: mark as received (triggers Zoho receive)

### 3.6 Factory Demand (MRP Lite)

Calculates raw material requirements for factory-produced items.

**Flow:**
1. Forecast demand for factory-made finished goods (same engine as 3.1)
2. Add committed demand from custom orders pipeline (from sales app)
3. Pull composite item ratios from Zoho Inventory (e.g. 1 magnet = 1/10 plywood sheet)
4. Multiply out → raw material requirements per period
5. Check current raw material stock in Zoho
6. Generate raw material reorder recommendations
7. Feed into Order Builder (same flow as finished goods)

**Custom order integration:**
- Pull `in_production` and `customer_approved` custom orders from sales app
- Extract item quantities → factory demand
- This ensures raw materials are ordered ahead of confirmed custom work

---

## 4. Database Schema

**Local app database (PostgreSQL on Render).**

Zoho is the source of truth for items, stock, and POs. The demand planner caches and enriches locally.

```sql
-- ─────────────────────────────────────────
-- ITEMS CACHE (synced from Zoho Inventory)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS items (
  id                SERIAL PRIMARY KEY,
  zoho_item_id      VARCHAR(50) UNIQUE NOT NULL,
  sku               VARCHAR(100),
  name              VARCHAR(500) NOT NULL,
  brand             VARCHAR(100),           -- chapter_and_light, shall_we_bloom, salt_and_wattle
  category          VARCHAR(100),           -- magnets, bookmarks, cards, etc.
  supplier_name     VARCHAR(255),
  supplier_id       VARCHAR(50),            -- Zoho vendor ID
  unit_cost         NUMERIC(10,2),
  unit_price        NUMERIC(10,2),
  current_stock     NUMERIC(10,2) DEFAULT 0,
  incoming_stock    NUMERIC(10,2) DEFAULT 0, -- from open POs
  is_composite      BOOLEAN DEFAULT FALSE,   -- factory item with BOM
  moq               INTEGER,                 -- minimum order quantity
  lead_time_days    INTEGER DEFAULT 90,
  safety_stock_days INTEGER DEFAULT 30,
  lifecycle_status  VARCHAR(20) DEFAULT 'active'
                      CHECK (lifecycle_status IN ('active', 'slow_mover', 'discontinued', 'new')),
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_sku ON items(sku);
CREATE INDEX IF NOT EXISTS idx_items_supplier ON items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_items_brand ON items(brand);
CREATE INDEX IF NOT EXISTS idx_items_lifecycle ON items(lifecycle_status);

-- ─────────────────────────────────────────
-- COMPOSITE ITEM MAPPINGS (from Zoho)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS composite_mappings (
  id                  SERIAL PRIMARY KEY,
  finished_item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  raw_material_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity_per_unit   NUMERIC(10,4) NOT NULL,  -- e.g. 0.1 (1/10 of a sheet)
  last_synced_at      TIMESTAMPTZ,
  UNIQUE (finished_item_id, raw_material_id)
);

-- ─────────────────────────────────────────
-- SALES HISTORY (cached from Zoho Books invoices)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_history (
  id              SERIAL PRIMARY KEY,
  zoho_invoice_id VARCHAR(50),
  item_id         INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity        NUMERIC(10,2) NOT NULL,
  amount          NUMERIC(10,2),
  invoice_date    DATE NOT NULL,
  customer_name   VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_history_item ON sales_history(item_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_date ON sales_history(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_history_invoice ON sales_history(zoho_invoice_id);

-- ─────────────────────────────────────────
-- FORECASTS (generated by forecast engine)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forecasts (
  id                  SERIAL PRIMARY KEY,
  item_id             INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  forecast_month      DATE NOT NULL,            -- first day of month
  forecast_qty        NUMERIC(10,2) NOT NULL,
  daily_velocity      NUMERIC(10,4),
  trend_direction     VARCHAR(10) CHECK (trend_direction IN ('up', 'stable', 'down')),
  confidence          VARCHAR(10) CHECK (confidence IN ('high', 'medium', 'low')),
  method              VARCHAR(30) DEFAULT 'moving_average',
  generated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (item_id, forecast_month)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_item ON forecasts(item_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_month ON forecasts(forecast_month);

-- ─────────────────────────────────────────
-- REORDER RECOMMENDATIONS (generated per cycle)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reorder_recommendations (
  id                  SERIAL PRIMARY KEY,
  cycle_date          DATE NOT NULL,              -- e.g. 2026-03-01
  item_id             INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  current_stock       NUMERIC(10,2),
  incoming_stock      NUMERIC(10,2),
  forecast_demand     NUMERIC(10,2),              -- demand over lead time + safety
  recommended_qty     NUMERIC(10,2),
  urgency             VARCHAR(20)
                        CHECK (urgency IN ('critical', 'reorder_now', 'upcoming', 'healthy', 'dead_stock', 'discontinue')),
  stockout_date       DATE,                        -- projected stock-out
  moq_flag            BOOLEAN DEFAULT FALSE,       -- true if recommended qty < MOQ
  notes               TEXT,
  status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'adjusted', 'skipped')),
  ordered_qty         NUMERIC(10,2),               -- actual qty ordered (if different)
  generated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (cycle_date, item_id)
);

CREATE INDEX IF NOT EXISTS idx_reorder_cycle ON reorder_recommendations(cycle_date);
CREATE INDEX IF NOT EXISTS idx_reorder_urgency ON reorder_recommendations(urgency);

-- ─────────────────────────────────────────
-- ORDER BATCHES (groups of POs created together)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_batches (
  id              SERIAL PRIMARY KEY,
  cycle_date      DATE NOT NULL,
  created_by      VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ORDER BATCH ITEMS (links recommendations to POs)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_batch_items (
  id                  SERIAL PRIMARY KEY,
  batch_id            INTEGER NOT NULL REFERENCES order_batches(id) ON DELETE CASCADE,
  recommendation_id   INTEGER REFERENCES reorder_recommendations(id),
  item_id             INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_id         VARCHAR(50),
  quantity            NUMERIC(10,2) NOT NULL,
  unit_cost           NUMERIC(10,2),
  zoho_po_id          VARCHAR(50),              -- Zoho PO ID once created
  zoho_po_number      VARCHAR(50),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_batch_items_batch ON order_batch_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_order_batch_items_supplier ON order_batch_items(supplier_id);

-- ─────────────────────────────────────────
-- PO TRACKER (tracks POs post-creation)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_tracker (
  id                  SERIAL PRIMARY KEY,
  zoho_po_id          VARCHAR(50) UNIQUE NOT NULL,
  zoho_po_number      VARCHAR(50),
  supplier_name       VARCHAR(255),
  supplier_id         VARCHAR(50),
  total_amount        NUMERIC(12,2),
  item_count          INTEGER,
  order_date          DATE,
  expected_date       DATE,                       -- order_date + lead_time
  actual_ship_date    DATE,
  actual_receive_date DATE,
  tracking_number     VARCHAR(255),
  shipping_carrier    VARCHAR(100),
  status              VARCHAR(30) DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'sent', 'confirmed', 'in_production',
                          'shipped', 'in_transit', 'received', 'closed'
                        )),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_tracker_status ON po_tracker(status);
CREATE INDEX IF NOT EXISTS idx_po_tracker_supplier ON po_tracker(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_tracker_expected ON po_tracker(expected_date);

-- ─────────────────────────────────────────
-- PO TRACKER EVENTS (status change log)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_tracker_events (
  id              SERIAL PRIMARY KEY,
  po_id           INTEGER NOT NULL REFERENCES po_tracker(id) ON DELETE CASCADE,
  old_status      VARCHAR(30),
  new_status      VARCHAR(30) NOT NULL,
  notes           TEXT,
  created_by      VARCHAR(100),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_events_po ON po_tracker_events(po_id);

-- ─────────────────────────────────────────
-- SYNC LOG (tracks Zoho data sync runs)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id              SERIAL PRIMARY KEY,
  sync_type       VARCHAR(50) NOT NULL,           -- items, sales_history, stock_levels, composite_mappings
  status          VARCHAR(20) NOT NULL,           -- running, success, error
  records_synced  INTEGER DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- APP SETTINGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key             VARCHAR(100) PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults
INSERT INTO app_settings (key, value) VALUES
  ('default_lead_time_days', '90'),
  ('default_safety_stock_days', '30'),
  ('forecast_months_history', '12'),
  ('forecast_months_ahead', '6'),
  ('slow_mover_threshold_monthly', '1'),
  ('slow_mover_months', '6'),
  ('order_cycle_day', '1')
ON CONFLICT (key) DO NOTHING;
```

---

## 5. API Endpoints

### 5.1 Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Overview stats: items needing reorder, stock health, upcoming stock-outs, open POs |
| `GET` | `/api/dashboard/alerts` | Critical alerts: stock-outs within lead time, overdue POs |

### 5.2 Items

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/items` | List items with filters (brand, category, supplier, lifecycle, search) |
| `GET` | `/api/items/:id` | Item detail with sales history, forecast, stock info |
| `PATCH` | `/api/items/:id` | Update item settings (lead_time, safety_stock, MOQ, lifecycle_status) |
| `PATCH` | `/api/items/:id/lifecycle` | Change lifecycle status (active/slow_mover/discontinued) |
| `POST` | `/api/items/bulk-lifecycle` | Bulk lifecycle change |
| `GET` | `/api/items/:id/sales-history` | Monthly sales breakdown |
| `GET` | `/api/items/:id/forecast` | Forecast data with chart-ready format |

### 5.3 Sync

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/sync/items` | Sync items + stock levels from Zoho Inventory |
| `POST` | `/api/sync/sales` | Sync sales history from Zoho Books invoices |
| `POST` | `/api/sync/composites` | Sync composite item mappings from Zoho |
| `POST` | `/api/sync/all` | Run all syncs |
| `GET` | `/api/sync/status` | Last sync times and status |

### 5.4 Forecasts

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/forecasts/generate` | Generate/regenerate forecasts for all active items |
| `GET` | `/api/forecasts` | List forecasts with filters |
| `PATCH` | `/api/forecasts/:itemId` | Manual forecast override |

### 5.5 Reorder Recommendations

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/reorder/generate` | Generate recommendations for current cycle |
| `GET` | `/api/reorder` | List recommendations with filters (urgency, supplier, brand) |
| `GET` | `/api/reorder/summary` | Summary by supplier (count, total value) |
| `PATCH` | `/api/reorder/:id` | Update recommendation (adjust qty, skip, accept) |

### 5.6 Order Builder

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/orders/preview` | Preview POs grouped by supplier from selected recommendations |
| `POST` | `/api/orders/create` | Create draft POs in Zoho Books |
| `GET` | `/api/orders/batches` | List past order batches |
| `GET` | `/api/orders/batches/:id` | Batch detail with POs created |

### 5.7 PO Tracker

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/po-tracker` | List tracked POs with filters (status, supplier, date range) |
| `GET` | `/api/po-tracker/:id` | PO detail with events timeline |
| `PATCH` | `/api/po-tracker/:id` | Update PO status, tracking info, dates |
| `POST` | `/api/po-tracker/:id/events` | Add status event |
| `POST` | `/api/po-tracker/sync` | Sync PO statuses from Zoho |

### 5.8 Factory / MRP

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/factory/demand` | Factory finished goods demand (forecast + custom orders) |
| `GET` | `/api/factory/materials` | Raw material requirements (calculated from composites) |
| `GET` | `/api/factory/materials/reorder` | Raw material reorder recommendations |

---

## 6. Frontend Views

Standalone SPA, same vanilla JS pattern as artico-sales. Mobile-responsive but primarily desktop for the demand planner.

### 6.1 Navigation

Sidebar (desktop) / hamburger menu (mobile):
- **Dashboard** — overview, alerts
- **Forecast** — item-level forecasts with charts
- **Reorder** — recommendations + order builder
- **PO Tracker** — open orders tracking
- **Factory** — MRP / raw material requirements
- **Items** — item management, lifecycle
- **Settings** — sync, configuration

### 6.2 Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  DEMAND PLANNER                           [Sync Now ↻]  │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ 🔴 12    │ 🟠 34    │ 🟡 89    │ ⚫ 45    │ 📦 8 Open   │
│ Critical │ Reorder  │ Upcoming │ Dead     │ POs         │
│          │ Now      │          │ Stock    │             │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                                                         │
│  ALERTS                                                 │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🔴 SKU-1234 Compact Lens Magnets — stock-out in  │  │
│  │    12 days, no open PO. Reorder 500 from          │  │
│  │    Supplier ABC.                          [Order]  │  │
│  ├───────────────────────────────────────────────────┤  │
│  │ 🔴 SKU-5678 Bloom Tea Towel — stock-out in       │  │
│  │    8 days, PO #4521 delayed.        [View PO]     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  STOCK-OUT TIMELINE (next 90 days)                      │
│  ──●────●───●──●────────●───────────────●───── →        │
│   Mar 5  Mar 12  Mar 20           Apr 15                │
│   3 items 2 items 1 item           5 items              │
│                                                         │
│  TOP MOVERS (last 30 days)         DECLINING            │
│  1. Compact Lens Magnets  ↑ 23%    1. Old Bookmarks ↓   │
│  2. Bloom Bookmarks       ↑ 15%    2. Plain Cards   ↓   │
│  3. Cat Keyrings          ↑ 12%    3. Basic Magnets ↓   │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Forecast View

Item-level forecast with sparkline/chart:
- Search/filter items
- Each item shows: SKU, name, current stock, daily velocity, trend, projected stock-out
- Click to expand: monthly sales chart (12 months history + 6 months forecast), editable forecast override

### 6.4 Reorder View

Two-panel layout:
- **Left:** Filterable list of recommendations sorted by urgency
- **Right:** Order builder cart — selected items grouped by supplier with editable quantities

Bottom bar: "Create X Draft POs" button with total value.

### 6.5 PO Tracker

Kanban-style board:
```
| Draft | Sent | Confirmed | In Production | Shipped | In Transit | Received |
| card  | card | card      | card          | card    | card       | card     |
| card  |      | card      |               | card    |            |          |
```

Each card: supplier name, PO number, item count, total value, expected date, days until/overdue.

### 6.6 Factory View

Two sections:
1. **Finished goods demand** — forecast for factory-produced items
2. **Raw materials** — calculated requirements with current stock, showing surplus/deficit

---

## 7. Zoho Integration Details

### 7.1 Data Sync — Items

```
POST webhook: {"app": "inventory", "method": "GET", "url": "/v1/items?page=1&per_page=200"}
```
Paginate through all items. For each:
- Map to local items table
- Set supplier from `vendor_name` / `vendor_id`
- Set `is_composite` from item type
- Update `current_stock` from `actual_available_stock`

### 7.2 Data Sync — Composite Mappings

```
POST webhook: {"app": "inventory", "method": "GET", "url": "/v1/items/<item_id>"}
```
For each composite item, fetch detail to get `mapped_items` array with quantities.

### 7.3 Data Sync — Sales History

```
POST webhook: {"app": "books", "method": "GET", "url": "/v3/invoices?page=1&per_page=200&date_start=2025-01-01&date_end=2026-02-26"}
```
For each invoice, extract line items: item_id, quantity, date.

### 7.4 Draft PO Creation

```
POST webhook: {
  "app": "books",
  "method": "POST",
  "url": "/v3/purchaseorders",
  "body": {
    "vendor_id": "<supplier_zoho_id>",
    "reference_number": "Forecast-2026-03-SUPPLIER",
    "line_items": [
      {"item_id": "<zoho_item_id>", "quantity": 500, "rate": 1.20}
    ],
    "notes": "Auto-generated by Demand Planner. Forecast-based reorder."
  }
}
```

**Note:** The Make webhook currently only supports GET (read-only). PO creation will need a write-enabled webhook or direct Zoho API access. Flag this for Owain.

---

## 8. Forecast Algorithm Detail

### 8.1 Moving Average (Default)

```javascript
function movingAverage(salesHistory, months = 6) {
  // Weight recent months more heavily
  const weights = [3, 2.5, 2, 1.5, 1, 1]; // most recent first
  const totalWeight = weights.slice(0, months).reduce((a, b) => a + b, 0);

  let weightedSum = 0;
  for (let i = 0; i < months && i < salesHistory.length; i++) {
    weightedSum += salesHistory[i].quantity * weights[i];
  }

  return weightedSum / totalWeight;
}
```

### 8.2 Trend Detection

```javascript
function detectTrend(salesHistory, months = 6) {
  // Simple linear regression on monthly quantities
  const data = salesHistory.slice(0, months).reverse(); // oldest first
  const n = data.length;
  const sumX = data.reduce((s, _, i) => s + i, 0);
  const sumY = data.reduce((s, d) => s + d.quantity, 0);
  const sumXY = data.reduce((s, d, i) => s + i * d.quantity, 0);
  const sumX2 = data.reduce((s, _, i) => s + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgMonthly = sumY / n;

  // Threshold: slope > 5% of average = trending
  if (slope > avgMonthly * 0.05) return 'up';
  if (slope < -avgMonthly * 0.05) return 'down';
  return 'stable';
}
```

### 8.3 Stock-Out Projection

```javascript
function projectStockout(currentStock, incomingStock, dailyVelocity) {
  if (dailyVelocity <= 0) return null; // no demand
  const totalAvailable = currentStock + incomingStock;
  const daysUntilStockout = totalAvailable / dailyVelocity;
  const stockoutDate = addDays(new Date(), daysUntilStockout);
  return stockoutDate;
}
```

---

## 9. File & Folder Structure

```
demand-planner/
├── server.js                    # Express app, migrations, boot
├── package.json
├── .env                         # DB connection, webhook URL, secrets
├── db/
│   └── migrations/
│       └── 001_initial.sql      # Schema from Section 4
├── src/
│   ├── routes/
│   │   ├── dashboard.js
│   │   ├── items.js
│   │   ├── sync.js
│   │   ├── forecasts.js
│   │   ├── reorder.js
│   │   ├── orders.js
│   │   ├── poTracker.js
│   │   └── factory.js
│   ├── services/
│   │   ├── zoho.js              # Zoho API via Make webhook
│   │   ├── forecast.js          # Forecast engine
│   │   ├── reorder.js           # Reorder calculation
│   │   └── sync.js              # Data sync orchestration
│   └── middleware/
│       └── auth.js              # Simple auth (single user or shared key)
├── public/
│   ├── index.html
│   ├── app.js                   # SPA frontend
│   └── style.css
└── README.md
```

---

## 10. Implementation Phases

### Phase 1: Foundation + Data Sync (~3 days)
- [ ] Project scaffold (Express, PostgreSQL, Render config)
- [ ] Database schema migration
- [ ] Zoho sync: items, stock levels, sales history
- [ ] Items list view with search/filter
- [ ] Basic dashboard with stock health summary

### Phase 2: Forecast Engine (~2 days)
- [ ] Forecast generation (moving average + trend)
- [ ] Forecast API endpoints
- [ ] Forecast view with sales history charts
- [ ] Stock-out projection
- [ ] Manual forecast override

### Phase 3: Reorder Recommendations (~2 days)
- [ ] Reorder calculation engine
- [ ] Recommendation list view with urgency flags
- [ ] MOQ handling and flags
- [ ] Item lifecycle auto-flagging (slow mover / discontinue candidates)

### Phase 4: Order Builder (~2 days)
- [ ] Order builder UI (select items → group by supplier → review)
- [ ] Draft PO creation in Zoho (requires write webhook)
- [ ] Order batch history

### Phase 5: PO Tracker (~2 days)
- [ ] PO tracker with kanban board
- [ ] Status updates (manual + Zoho sync)
- [ ] Expected date tracking and overdue alerts
- [ ] Event timeline per PO

### Phase 6: Factory MRP (~2 days)
- [ ] Composite item sync from Zoho
- [ ] Factory demand calculation (forecast + custom orders)
- [ ] Raw material requirements roll-up
- [ ] Raw material reorder recommendations
- [ ] Integration with Order Builder

### Phase 7: Polish (~1 day)
- [ ] Dashboard alerts and notifications
- [ ] Export to CSV/PDF
- [ ] Settings page (lead times, safety stock defaults, sync schedule)
- [ ] Mobile responsive refinements

---

## 11. Auth

Lightweight — this is an internal tool for one or two people.

Options:
1. **Shared password** — single login, no user management
2. **Reuse artico-sales auth** — if both apps share the DB or use SSO
3. **API key** — for headless access (cron syncs, etc.)

Recommend option 1 for MVP. Simple password set via env var.

---

## 12. Deployment

Same pattern as existing apps:
- **Platform:** Render (Web Service)
- **Runtime:** Node.js
- **Database:** Render PostgreSQL
- **Persistent disk:** Not needed (no file uploads)
- **Domain:** demand.artico.au
- **Auto-deploy:** GitHub push to master

Environment variables:
```
DATABASE_URL=postgresql://...
ZOHO_WEBHOOK_URL=https://hook.us1.make.com/2lt6dqdnb3zdoqfgpneneahbrcddq174
APP_PASSWORD=<shared password>
SESSION_SECRET=<random string>
```

---

## 13. Key Technical Decisions

1. **Cache sales data locally** — Zoho API is slow via webhook relay. Sync periodically, forecast from local data.

2. **Forecast recalculation on-demand** — not real-time. Run weekly or when user triggers. Keeps it simple and predictable.

3. **Draft POs only** — never auto-send POs. Always create as draft in Zoho for human review before sending to suppliers.

4. **Supplier grouping from Zoho item data** — each item's vendor mapping comes from Zoho. No duplicate supplier management.

5. **Factory demand via composite mappings** — Zoho already defines what raw materials go into each factory product. We consume that data, not duplicate it.

6. **Write access to Zoho** — currently the Make webhook is read-only. PO creation (Phase 4) needs either a write-enabled webhook scenario in Make, or direct Zoho OAuth. Flag early.

---

## 14. Open Questions

1. **Zoho write access** — Can we extend the Make webhook to support POST/write operations? Or do we need direct OAuth?
2. **Seasonality** — Are there clear seasonal patterns (Christmas spike)? Should we hard-code seasonal indices or detect automatically?
3. **Multiple warehouses** — Is stock held in one location or distributed?
4. **Currency** — Are supplier costs in AUD, USD, CNY? Do we need conversion?
5. **Approval workflow** — Does anyone need to approve POs before they're created as drafts in Zoho, or is the demand planner autonomous?
