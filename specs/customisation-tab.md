# Customisation Tab — Product Spec & Architecture

**App:** sales.artico.au (Artico Sales)
**Date:** 2026-02-25
**Status:** Draft

---

## 1. Overview

A new "Custom" tab in the sales app bottom navigation for managing custom-branded merchandise orders end-to-end: brief intake → design iteration → customer presentation → production deployment → status tracking.

**Custom orders** are when bookstores/retailers provide artwork or ideas, and Artico's factory (Salt & Wattle Studio) produces branded merchandise — magnets, bookmarks, cards, keyrings, ornaments, tote bags, tea towels.

### Product Types

| Slug | Display Name |
|------|-------------|
| `magnets` | Magnets |
| `bookmarks` | Bookmarks |
| `cards` | Cards |
| `keyrings` | Keyrings |
| `ornaments` | Ornaments |
| `tote_bags` | Tote Bags |
| `tea_towels` | Tea Towels |

---

## 2. Order Lifecycle & Statuses

```
brief_submitted → in_design → mockups_ready → sent_to_customer → customer_approved → in_production → complete
```

| Status | Meaning | Triggered By |
|--------|---------|-------------|
| `brief_submitted` | New order created with brief details | Rep creates order |
| `in_design` | Designer (Owain) is working on mockups | Designer picks up order |
| `mockups_ready` | Internal designs complete, ready for review | Designer marks ready |
| `sent_to_customer` | Presentation link/PDF sent to customer | Rep sends presentation |
| `customer_approved` | Customer has approved the designs | Rep marks approved |
| `in_production` | PO created in Zoho, factory is producing | "Deploy to Production" clicked |
| `complete` | All items produced and delivered | Synced from Zoho PO status |

---

## 3. Database Schema

Migration file: `db/migrations/011_custom_orders.sql`

```sql
-- =============================================================
-- Artico Sales — Custom Orders
-- Migration: 011_custom_orders.sql
-- =============================================================

-- ─────────────────────────────────────────
-- CUSTOM ORDERS (one per customer brief)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_orders (
  id              SERIAL PRIMARY KEY,
  ref_code        VARCHAR(20) UNIQUE NOT NULL,         -- e.g. "CUS-0042"
  title           VARCHAR(255) NOT NULL,               -- short name for the order
  customer_name   VARCHAR(255) NOT NULL,               -- display name
  zoho_contact_id VARCHAR(255),                        -- Zoho contact ID (nullable if new customer)
  store_id        INTEGER REFERENCES stores(id) ON DELETE SET NULL,
  rep_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          VARCHAR(30) NOT NULL DEFAULT 'brief_submitted'
                    CHECK (status IN (
                      'brief_submitted', 'in_design', 'mockups_ready',
                      'sent_to_customer', 'customer_approved',
                      'in_production', 'complete'
                    )),
  brief           TEXT,                                -- written brief / description
  brief_audio_url VARCHAR(500),                        -- optional voice memo path
  zoho_po_id      VARCHAR(255),                        -- Zoho PO ID once created
  zoho_po_number  VARCHAR(100),                        -- Zoho PO number for display
  presentation_token VARCHAR(64),                      -- unique token for shareable link
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_orders_rep_id   ON custom_orders(rep_id);
CREATE INDEX IF NOT EXISTS idx_custom_orders_status   ON custom_orders(status);
CREATE INDEX IF NOT EXISTS idx_custom_orders_ref_code ON custom_orders(ref_code);
CREATE INDEX IF NOT EXISTS idx_custom_orders_pres_token ON custom_orders(presentation_token);

-- ─────────────────────────────────────────
-- CUSTOM ORDER ITEMS (products in the order)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_order_items (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES custom_orders(id) ON DELETE CASCADE,
  product_type    VARCHAR(50) NOT NULL
                    CHECK (product_type IN (
                      'magnets', 'bookmarks', 'cards', 'keyrings',
                      'ornaments', 'tote_bags', 'tea_towels'
                    )),
  quantity        INTEGER NOT NULL DEFAULT 0,
  unit_price      NUMERIC(10,2),                       -- filled in at quoting stage
  notes           TEXT,
  zoho_item_id    VARCHAR(255),                        -- Zoho Inventory item ID once created
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_order_items_order ON custom_order_items(order_id);

-- ─────────────────────────────────────────
-- CUSTOM ORDER FILES (briefs, designs, production files)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_order_files (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES custom_orders(id) ON DELETE CASCADE,
  item_id         INTEGER REFERENCES custom_order_items(id) ON DELETE SET NULL,
  category        VARCHAR(30) NOT NULL
                    CHECK (category IN ('reference', 'design', 'mockup', 'production', 'presentation')),
  filename        VARCHAR(255) NOT NULL,
  file_path       VARCHAR(500) NOT NULL,               -- path on persistent disk
  mime_type       VARCHAR(100),
  file_size       INTEGER,                             -- bytes
  uploaded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_order_files_order ON custom_order_files(order_id);
CREATE INDEX IF NOT EXISTS idx_custom_order_files_cat   ON custom_order_files(category);

-- ─────────────────────────────────────────
-- CUSTOM ORDER COMMENTS (conversation thread)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_order_comments (
  id              SERIAL PRIMARY KEY,
  order_id        INTEGER NOT NULL REFERENCES custom_orders(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_order_comments_order ON custom_order_comments(order_id);

-- ─────────────────────────────────────────
-- SEQUENCE FOR REF CODES
-- ─────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS custom_order_ref_seq START 1;
```

---

## 4. API Endpoints

All routes mounted at `/api/custom-orders`. Auth required for all.

### 4.1 Orders CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/custom-orders` | All authed | List orders (reps: own only; managers/execs: all) |
| `POST` | `/api/custom-orders` | All authed | Create new order |
| `GET` | `/api/custom-orders/:id` | Owner or manager+ | Get order detail |
| `PATCH` | `/api/custom-orders/:id` | Owner or manager+ | Update order fields |
| `PATCH` | `/api/custom-orders/:id/status` | Owner or manager+ | Transition status |
| `DELETE` | `/api/custom-orders/:id` | Manager+ only | Soft delete / cancel |

#### `GET /api/custom-orders`

Query params: `?status=in_design&rep_id=3`

Response:
```json
{
  "orders": [
    {
      "id": 1,
      "ref_code": "CUS-0001",
      "title": "Better Read Bookmarks",
      "customer_name": "Better Read Than Dead",
      "status": "in_design",
      "rep_name": "Deanne",
      "item_count": 3,
      "created_at": "2026-02-25T05:00:00Z",
      "updated_at": "2026-02-25T06:00:00Z"
    }
  ]
}
```

#### `POST /api/custom-orders`

Request body:
```json
{
  "title": "Better Read Bookmarks",
  "customer_name": "Better Read Than Dead",
  "zoho_contact_id": "460000000012345",
  "store_id": 42,
  "brief": "Customer wants bookmarks and magnets featuring their shop cat Milo...",
  "items": [
    { "product_type": "bookmarks", "quantity": 500, "notes": "Standard size" },
    { "product_type": "magnets", "quantity": 300 }
  ]
}
```

Response: Full order object with `ref_code` generated as `CUS-XXXX`.

#### `PATCH /api/custom-orders/:id/status`

Request: `{ "status": "in_design" }`

Validates transition is legal (forward-only, with allowed skips). Returns updated order.

### 4.2 Files

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/custom-orders/:id/files` | Upload file(s) — multipart/form-data |
| `GET` | `/api/custom-orders/:id/files` | List files for order |
| `GET` | `/api/custom-orders/:id/files/:fileId/download` | Download file |
| `DELETE` | `/api/custom-orders/:id/files/:fileId` | Delete file |

Upload request: `multipart/form-data` with fields:
- `file` — the file(s)
- `category` — `reference` | `design` | `mockup` | `production` | `presentation`
- `item_id` — optional, links file to specific item

Files stored at: `/data/custom-orders/<order_id>/<category>/<filename>`

### 4.3 Comments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/custom-orders/:id/comments` | List comments |
| `POST` | `/api/custom-orders/:id/comments` | Add comment |

### 4.4 Presentation (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/custom-orders/:id/presentation` | Owner/manager | Generate presentation data |
| `GET` | `/p/:token` | **Public** (no auth) | Customer-facing presentation page |
| `POST` | `/p/:token/approve` | **Public** | Customer approves designs |
| `POST` | `/p/:token/feedback` | **Public** | Customer requests changes |

The presentation page is a standalone HTML page (no app chrome) showing mockups with approve/request-changes buttons.

### 4.5 Production Deploy

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/custom-orders/:id/deploy` | Manager+ only — creates Zoho PO + inventory items |

This endpoint:
1. Creates items in Zoho Inventory (if `zoho_item_id` is null on order items)
2. Creates a Purchase Order in Zoho Books with reference `Factory Custom-<ref_code>`
3. Stores `zoho_po_id` and `zoho_po_number` on the order
4. Sets status to `in_production`

The factory tracker app auto-picks up POs with reference starting "Factory Custom-".

### 4.6 Status Sync

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/custom-orders/:id/production-status` | Fetch live status from Zoho PO |

Calls Zoho Books API to get PO status. If PO is received/closed → mark order `complete`.

---

## 5. Frontend Views

### 5.1 Tab Bar Addition

Add to bottom nav (after Planner, before Team):

```html
<button class="tab-bar__item" data-tab="custom">
  <svg><!-- paintbrush/palette icon --></svg>
  <span>Custom</span>
</button>
```

New page container: `<div id="page-custom" class="page hidden">`

### 5.2 Screens

#### A. Order List (default view)

- Status filter pills at top: All | Brief | Design | Mockups | Sent | Approved | Production | Complete
- Cards showing: ref_code, title, customer_name, status badge, product type icons, date
- FAB (floating action button) bottom-right: "+ New Custom Order"
- Reps see own orders; managers/execs see all with rep name shown

#### B. New Order Form

Full-screen modal / slide-up:
1. **Customer** — search-as-you-type against Zoho contacts (reuse existing store search), or free-text for new
2. **Title** — short name
3. **Products** — toggle chips for each product type, with quantity fields
4. **Brief** — textarea for description
5. **Reference Images** — file upload area (drag or tap), camera capture on mobile
6. **Voice Brief** — optional record button (uses MediaRecorder API, saves as .webm)
7. Submit → creates order, status = `brief_submitted`

#### C. Order Detail

Scrollable single-page with sections:

1. **Header** — ref_code, title, customer, status badge with progress bar
2. **Brief** — description text, reference images gallery, audio player if voice brief
3. **Products** — list of items with quantities, expandable for notes/pricing
4. **Design Files** — upload area for designer, grouped by item. Drag-to-upload.
5. **Comments** — threaded conversation between rep and designer
6. **Actions** — contextual buttons based on status:
   - `brief_submitted`: "Start Design" (→ in_design)
   - `in_design`: "Mark Mockups Ready" (→ mockups_ready)
   - `mockups_ready`: "Send to Customer" (generates link, → sent_to_customer)
   - `sent_to_customer`: "Customer Approved" / "Needs Changes" (→ customer_approved / back to in_design)
   - `customer_approved`: "Deploy to Production" (→ in_production)
   - `in_production`: live production status from factory, auto-completes
7. **Timeline** — status change history with timestamps

#### D. Customer Presentation (Public Page)

Standalone page at `/p/<token>`:
- Artico branding header
- Order title, customer name
- Grid/carousel of mockup images per product type
- Approve button (big green) → confirmation dialog
- "Request Changes" button → text field for feedback
- Mobile-optimised, works without login

### 5.3 Navigation Integration

In `app.js`:
```js
// Add to loadPage switch:
case 'custom': loadCustomOrders(); break;
```

---

## 6. Data Flow Diagrams

### 6.1 Order Creation

```
Rep (mobile)
  │
  ├─ POST /api/custom-orders  { title, customer, items, brief }
  │    └─ INSERT custom_orders + custom_order_items
  │    └─ Generate ref_code: CUS-XXXX (from sequence)
  │    └─ Return order with id
  │
  ├─ POST /api/custom-orders/:id/files  (reference images)
  │    └─ Save to /data/custom-orders/<id>/reference/
  │    └─ INSERT custom_order_files
  │
  └─ Response: order created, status = brief_submitted
```

### 6.2 Design → Presentation → Approval

```
Designer (Owain)
  │
  ├─ PATCH status → in_design
  ├─ POST files (category: design/mockup)
  ├─ POST comments (feedback loop with rep)
  ├─ PATCH status → mockups_ready
  │
Rep
  ├─ Reviews mockups
  ├─ PATCH status → sent_to_customer
  │    └─ Generates presentation_token (crypto.randomBytes(32).toString('hex'))
  │    └─ Rep copies/shares link: https://sales.artico.au/p/<token>
  │
Customer (public page)
  ├─ Views /p/<token>
  ├─ POST /p/<token>/approve
  │    └─ Updates status → customer_approved
  └─ POST /p/<token>/feedback
       └─ Creates comment, status → in_design
```

### 6.3 Production Deploy

```
Manager/Exec
  │
  POST /api/custom-orders/:id/deploy
  │
  ├─ For each item where zoho_item_id IS NULL:
  │    POST /inventory/v1/items  → create in Zoho Inventory
  │    UPDATE custom_order_items SET zoho_item_id
  │
  ├─ POST /books/v3/purchaseorders
  │    reference_number: "Factory Custom-CUS-0042"
  │    vendor: Salt & Wattle Studio vendor ID
  │    line_items: [ { item_id, quantity, rate } ]
  │
  ├─ UPDATE custom_orders SET zoho_po_id, zoho_po_number, status = 'in_production'
  │
  └─ Factory Tracker (factory.artico.au) auto-picks up PO
       (filters: reference starts with "Factory")
       Tracks through: Ready → Printing → Heat Press → Laser → QC → Packaging → Stock
```

### 6.4 Status Sync

```
Sales App                           Zoho Books                    Factory Tracker
  │                                    │                              │
  ├─ GET /api/custom-orders/:id/       │                              │
  │  production-status                 │                              │
  │    └─ GET /purchaseorders/:poId ───┤                              │
  │    └─ Returns PO status/received   │                              │
  │                                    │◄── Updates PO status ────────┤
  │    └─ If PO received → mark        │    (receive API call)        │
  │       order complete               │                              │
```

---

## 7. File Storage

Base path: `/data/custom-orders/` (on Render persistent disk, same as existing setup)

```
/data/custom-orders/
  └── <order_id>/
      ├── reference/        ← customer-provided images
      ├── design/           ← working design files
      ├── mockup/           ← final mockup images
      ├── production/       ← print-ready files, laser paths
      ├── presentation/     ← generated presentation assets
      └── audio/            ← voice brief recordings
```

Use `multer` for file upload handling (already a common Express pattern). Max file size: 20MB per file.

---

## 8. Auth & Permissions

Extends existing `requireAuth` / `requireRole` middleware.

| Action | Rep | Manager | Executive |
|--------|-----|---------|-----------|
| Create order | ✅ (own) | ✅ | ✅ |
| View own orders | ✅ | ✅ | ✅ |
| View all orders | ❌ | ✅ | ✅ |
| Edit order | Own only | ✅ | ✅ |
| Upload files | Own only | ✅ | ✅ |
| Add comments | Own only | ✅ | ✅ |
| Change status | Own only | ✅ | ✅ |
| Deploy to production | ❌ | ✅ | ✅ |
| Delete/cancel order | ❌ | ✅ | ✅ |

Helper middleware for order access:
```js
async function requireOrderAccess(req, res, next) {
  const order = await pool.query('SELECT rep_id FROM custom_orders WHERE id = $1', [req.params.id]);
  if (!order.rows[0]) return res.status(404).json({ error: 'Order not found' });
  if (req.session.role === 'rep' && order.rows[0].rep_id !== req.session.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.order = order.rows[0];
  next();
}
```

---

## 9. File & Folder Structure (New Code)

```
src/
  routes/
    customOrders.js          ← CRUD, status, comments, file upload routes
  services/
    customOrders.js          ← business logic, Zoho integration for deploy
  middleware/
    upload.js                ← multer config for file uploads

public/
  app.js                     ← add custom tab navigation + all custom order UI
  style.css                  ← add custom order styles

db/
  migrations/
    011_custom_orders.sql    ← schema from Section 3
```

### Route Registration (server.js)

```js
const customOrderRoutes = require('./routes/customOrders');
app.use('/api/custom-orders', customOrderRoutes);

// Public presentation route (no auth)
app.get('/p/:token', servePresentation);
app.post('/p/:token/approve', handleApproval);
app.post('/p/:token/feedback', handleFeedback);
```

---

## 10. Implementation Phases

### Phase 1: Foundation (MVP) — ~3 days
- [ ] Migration 011: create all 4 tables + sequence
- [ ] `src/routes/customOrders.js` — CRUD + list + status transitions
- [ ] Frontend: Custom tab in nav, order list view, new order form
- [ ] Frontend: Order detail view (header, brief, products, status)
- [ ] File upload (reference images only)
- [ ] Comments system

### Phase 2: Design Workflow — ~2 days
- [ ] Design file upload (mockup/design categories)
- [ ] Image gallery component in order detail
- [ ] Status transition buttons in order detail
- [ ] Simple timeline/activity log

### Phase 3: Customer Presentation — ~2 days
- [ ] Presentation token generation on "Send to Customer"
- [ ] Public `/p/:token` page — standalone HTML
- [ ] Approve/feedback endpoints
- [ ] Customer feedback → comment + status change

### Phase 4: Production Deploy — ~2 days
- [ ] Zoho Inventory item creation
- [ ] Zoho Books PO creation with "Factory Custom-" reference
- [ ] Production status polling from Zoho PO
- [ ] Auto-complete when PO received

### Phase 5: Polish — ~1 day
- [ ] Voice brief recording (MediaRecorder API)
- [ ] Pull-to-refresh on order list
- [ ] Push-style notifications for status changes (badge on tab)
- [ ] Mobile camera capture for reference images
- [ ] Search/filter on order list

---

## 11. UI Specifications

### Colour Usage (matches existing app)
- Status badges: Orange `#E8501A` for active states, Navy `#1B3A6B` for headers
- `brief_submitted`: Grey
- `in_design`: Orange
- `mockups_ready`: Blue
- `sent_to_customer`: Purple
- `customer_approved`: Green
- `in_production`: Navy
- `complete`: Dark green with checkmark

### Card Component (Order List)
```
┌─────────────────────────────────┐
│ CUS-0042          [In Design]   │
│ Better Read Bookmarks           │
│ Better Read Than Dead           │
│ 📑🧲🔖  ·  3 items  ·  2d ago  │
└─────────────────────────────────┘
```

### Status Progress Bar
```
● ─── ● ─── ◐ ─── ○ ─── ○ ─── ○ ─── ○
Brief  Design Mockup  Sent  Approved Prod Complete
```

### New Order Form (mobile)
```
┌─────────────────────────────────┐
│ ← New Custom Order              │
├─────────────────────────────────┤
│ Customer     [🔍 Search...    ] │
│ Title        [                ] │
│                                 │
│ Products:                       │
│ [✓ Magnets ] [  Bookmarks    ] │
│ [  Cards   ] [✓ Keyrings    ] │
│ [  Ornaments] [ Tote Bags   ] │
│ [  Tea Towels]                 │
│                                 │
│ Qty: Magnets [300]             │
│ Qty: Keyrings [200]           │
│                                 │
│ Brief:                          │
│ ┌─────────────────────────────┐ │
│ │ Customer wants their shop   │ │
│ │ cat Milo on everything...   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Reference Images:               │
│ [📷 Add Photos]                │
│ ┌───┐ ┌───┐ ┌───┐             │
│ │ 🖼 │ │ 🖼 │ │ 🖼 │             │
│ └───┘ └───┘ └───┘             │
│                                 │
│ [🎤 Record Voice Brief]        │
│                                 │
│ [     Submit Brief     ]        │
└─────────────────────────────────┘
```

---

## 12. Key Technical Decisions

1. **Ref codes** use a Postgres sequence (`CUS-XXXX`) — simple, no collisions, human-readable.

2. **Presentation tokens** are 32-byte random hex — unguessable, no auth needed. Tokens are generated lazily when rep first sends to customer.

3. **File storage** on Render persistent disk (same pattern as existing app). Not S3 — keeps it simple and matches current infra.

4. **Factory integration** via Zoho PO reference prefix `Factory Custom-CUS-XXXX`. The factory tracker already filters POs by `ref.startsWith('factory')` so custom orders will appear automatically.

5. **No WebSocket/SSE** for status updates — polling on page load is sufficient for MVP. Tab badge can use a lightweight poll.

6. **Voice briefs** stored as `.webm` files. Transcription is future work (could use Whisper API).

7. **All frontend code in app.js** — follows existing pattern (no build step, vanilla JS, single file).
