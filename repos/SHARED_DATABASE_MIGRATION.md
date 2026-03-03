# Shared Database Migration Plan

## Goal
Create a single source of truth for Zoho data (items, sales, customers) that both the demand planner and sales app can access.

## Architecture

### New: artico-data (Shared Database)
**Purpose:** Single source of truth for all Zoho data

**Tables:**
- `items` - All inventory items from Zoho
- `sales_history` - All invoice line items from Zoho Books
- `composite_mappings` - Item → component relationships
- `customers` - Customer data from Zoho (future)
- `vendors` - Vendor data from Zoho (future)

**Access:**
- Demand planner: READ/WRITE (runs sync jobs)
- Sales app: READ only

### Updated: demand-planner-db (App-Specific)
**Tables to KEEP:**
- `forecasts` - Demand forecasting calculations
- `reorder_recommendations` - Reorder suggestions
- `planning_groups` - Planning group settings
- `po_tracker` - Purchase order tracking
- `po_tracker_events` - PO status history
- `order_batches` - Order batch records
- `order_batch_items` - Order batch line items
- `app_settings` - App settings
- `sync_log` - Sync job history
- `migrations` - Migration tracking

**Tables to MOVE to artico-data:**
- `items` → artico-data.items
- `sales_history` → artico-data.sales_history
- `composite_mappings` → artico-data.composite_mappings

### Updated: sales-app-db (App-Specific)
**Tables to KEEP:**
- User settings
- Saved filters
- UI preferences

**Tables to REMOVE (use artico-data instead):**
- Items (if exists)
- Orders (if exists)

## Migration Steps

### Phase 1: Create Shared Database
1. Create PostgreSQL database on Render: `artico-data`
2. Upgrade to Starter plan ($7/month for persistence)
3. Create initial schema (items, sales_history, composite_mappings)

### Phase 2: Migrate Demand Planner Data
1. Dump data from demand-planner-db:
   - items (3,984 records)
   - sales_history (~8 months of data)
   - composite_mappings (1,366 records)
2. Load into artico-data
3. Verify data integrity
4. Update demand planner connection:
   - Add SHARED_DATABASE_URL environment variable
   - Update sync.js to write to shared DB
   - Update forecast/reorder services to read from shared DB
   - Keep app-specific tables in demand-planner-db

### Phase 3: Update Sales App
1. Add SHARED_DATABASE_URL environment variable
2. Update sales app to read items/sales from shared DB
3. Remove duplicate sync logic (if any)
4. Test data access

### Phase 4: Cleanup
1. Drop moved tables from demand-planner-db (after verification)
2. Update documentation
3. Monitor both apps for connection issues

## Connection Strategy

**Demand Planner** (two databases):
```javascript
const sharedPool = new Pool({ connectionString: process.env.SHARED_DATABASE_URL });
const appPool = new Pool({ connectionString: process.env.DATABASE_URL });

// Use sharedPool for: items, sales_history, composite_mappings
// Use appPool for: forecasts, reorder_recommendations, etc.
```

**Sales App** (two databases):
```javascript
const sharedPool = new Pool({ connectionString: process.env.SHARED_DATABASE_URL });
const appPool = new Pool({ connectionString: process.env.DATABASE_URL });

// Use sharedPool for: items, sales_history (read-only)
// Use appPool for: user settings, filters, etc.
```

## Benefits

1. **Single Zoho sync** - Only demand planner syncs, saves API quota
2. **Data consistency** - Both apps always see same Zoho data
3. **Easier maintenance** - Update sync logic in one place
4. **Better scalability** - Easy to add new apps that need Zoho data
5. **Separation of concerns** - Shared data vs app-specific data

## Costs

- Current: $7/month (demand-planner-db on Starter)
- After: $14/month ($7 for demand-planner-db + $7 for artico-data)
- Sales app DB: Can stay on Free tier (minimal data)

## Rollback Plan

If issues arise:
1. Keep old tables in demand-planner-db temporarily
2. Switch connection back to DATABASE_URL
3. Drop shared database if needed

## Timeline

- Phase 1: 10 minutes (create DB, schema)
- Phase 2: 30 minutes (migrate data, update demand planner)
- Phase 3: 20 minutes (update sales app)
- Phase 4: 10 minutes (cleanup)

**Total: ~70 minutes**

## Next Steps

1. Create artico-data database on Render
2. Run schema migrations
3. Copy data from demand-planner-db
4. Update environment variables
5. Deploy both apps
6. Verify data access
7. Celebrate! 🎸
