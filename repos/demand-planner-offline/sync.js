/**
 * Zoho Data Sync - Client-Side
 * Fetches data from Zoho via Make webhook and stores in IndexedDB
 */

const MAKE_WEBHOOK = 'https://hook.us1.make.com/2lt6dqdnb3zdoqfgpneneahbrcddq174';

// Sync all data from Zoho
async function syncAll(onProgress) {
  try {
    onProgress?.('Starting sync...', 0);
    
    await syncItems(onProgress);
    await syncSales(onProgress);
    
    await saveSetting('last_sync_date', new Date().toISOString());
    
    onProgress?.('Sync complete!', 100);
    return { success: true };
  } catch (err) {
    console.error('[sync] Error:', err);
    return { success: false, error: err.message };
  }
}

// Sync items from Zoho Inventory
async function syncItems(onProgress) {
  onProgress?.('Syncing items...', 10);
  
  const items = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(MAKE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'inventory',
        method: 'GET',
        url: `/v1/items?page=${page}&per_page=200`
      })
    });
    
    const data = await response.json();
    const pageItems = data.items || [];
    
    if (pageItems.length === 0) {
      hasMore = false;
    } else {
      // Fetch detailed item data for vendor info
      for (const item of pageItems) {
        try {
          const detailResponse = await fetch(MAKE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app: 'inventory',
              method: 'GET',
              url: `/v1/items/${item.item_id}`
            })
          });
          
          const detailData = await detailResponse.json();
          const detailedItem = detailData.item;
          
          // Extract planning group from custom fields
          let planningGroup = null;
          if (detailedItem.custom_fields) {
            const pgField = detailedItem.custom_fields.find(f => f.api_name === 'cf_discontinued');
            if (pgField) planningGroup = pgField.value;
          }
          
          // Skip discontinued items
          if (planningGroup === '9Z Do Not Reorder- Discontinued' || planningGroup === 'DELETED') {
            continue;
          }
          
          items.push({
            zoho_item_id: item.item_id,
            sku: item.sku,
            name: item.name,
            brand: item.brand || item.group_name,
            category: item.category_name || detailedItem.cf_product_category,
            supplier_name: detailedItem.vendor_name,
            supplier_id: detailedItem.vendor_id,
            planning_group: planningGroup,
            current_stock: parseFloat(item.actual_available_stock || item.stock_on_hand || 0),
            unit_cost_usd: parseFloat(item.purchase_rate || 0),
            unit_price_aud: parseFloat(item.rate || 0),
            status: item.status,
            moq: detailedItem.minimum_order_quantity || null,
            is_composite: item.item_type === 'composite'
          });
          
          onProgress?.(`Syncing items... ${items.length}`, 10 + (items.length / 40));
          
        } catch (err) {
          console.warn(`Failed to fetch detail for ${item.item_id}:`, err.message);
        }
        
        // Rate limit
        if (items.length % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      page++;
    }
  }
  
  onProgress?.(`Saving ${items.length} items...`, 45);
  await clearItems();
  await saveItems(items);
  
  onProgress?.(`Items synced: ${items.length}`, 50);
  return items.length;
}

// Sync sales from Zoho Books
async function syncSales(onProgress, daysBack = 90) {
  onProgress?.('Syncing sales...', 50);
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const dateStart = startDate.toISOString().split('T')[0];
  const dateEnd = new Date().toISOString().split('T')[0];
  
  const salesRecords = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(MAKE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'books',
        method: 'GET',
        url: `/v3/invoices?date_start=${dateStart}&date_end=${dateEnd}&status=paid&page=${page}&per_page=200`
      })
    });
    
    const data = await response.json();
    const invoices = data.invoices || [];
    
    if (invoices.length === 0) {
      hasMore = false;
    } else {
      for (const inv of invoices) {
        try {
          const detailResponse = await fetch(MAKE_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              app: 'books',
              method: 'GET',
              url: `/v3/invoices/${inv.invoice_id}`
            })
          });
          
          const detailData = await detailResponse.json();
          const invoice = detailData.invoice;
          
          for (const line of invoice.line_items || []) {
            if (!line.item_id || !line.quantity || line.quantity <= 0) continue;
            
            salesRecords.push({
              zoho_invoice_id: inv.invoice_id,
              item_id: line.item_id,
              quantity: parseFloat(line.quantity),
              amount: parseFloat(line.item_total || 0),
              invoice_date: inv.date || inv.invoice_date,
              customer_name: inv.customer_name
            });
          }
          
          onProgress?.(`Syncing sales... ${salesRecords.length}`, 50 + (salesRecords.length / 20));
          
        } catch (err) {
          console.warn(`Failed to fetch invoice ${inv.invoice_id}:`, err.message);
        }
        
        // Rate limit
        if (salesRecords.length % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      page++;
    }
  }
  
  onProgress?.(`Saving ${salesRecords.length} sales records...`, 90);
  await clearSales();
  await saveSales(salesRecords);
  
  onProgress?.(`Sales synced: ${salesRecords.length}`, 95);
  return salesRecords.length;
}

// Check last sync status
async function getLastSync() {
  const lastSync = await getSetting('last_sync_date');
  if (!lastSync) return null;
  
  const date = new Date(lastSync);
  const now = new Date();
  const hoursAgo = Math.floor((now - date) / (1000 * 60 * 60));
  
  return {
    date: lastSync,
    hoursAgo,
    formatted: date.toLocaleString()
  };
}
