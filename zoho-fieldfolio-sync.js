#!/usr/bin/env node
/**
 * Zoho Inventory → FieldFolio Stock Sync
 * Syncs stock levels daily from Zoho to FieldFolio
 */

const fs = require('fs');
const path = require('path');

// Load credentials
const zohoCredsPath = path.join(__dirname, 'zoho-credentials.json');
const fieldfolioCredsPath = path.join(__dirname, 'fieldfolio-credentials.json');

if (!fs.existsSync(zohoCredsPath)) {
  console.error('❌ zoho-credentials.json not found');
  process.exit(1);
}

if (!fs.existsSync(fieldfolioCredsPath)) {
  console.error('❌ fieldfolio-credentials.json not found');
  console.error('Create it with: { "email": "owain@artico.net.au", "password": "..." }');
  process.exit(1);
}

const zohoCreds = JSON.parse(fs.readFileSync(zohoCredsPath, 'utf8'));
const fieldfolioCreds = JSON.parse(fs.readFileSync(fieldfolioCredsPath, 'utf8'));

// FieldFolio API client
class FieldFolioAPI {
  constructor() {
    this.baseUrl = 'https://app.fieldfolio.com/api/v1';
    this.userCredential = null;
  }

  async authenticate() {
    const response = await fetch(`${this.baseUrl}/user_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        user_session: {
          email: fieldfolioCreds.email,
          password: fieldfolioCreds.password
        }
      })
    });

    if (!response.ok) {
      throw new Error(`FieldFolio auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.userCredential = data.user_credential;
    console.log('✅ FieldFolio authenticated');
  }

  async getCatalogs() {
    const response = await fetch(`${this.baseUrl}/catalogs?user_credentials=${this.userCredential}`, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Failed to get catalogs: ${response.status}`);
    }

    return response.json();
  }

  async getProducts(catalogId, version = 'published') {
    let allProducts = [];
    let page = 1;
    const pageSize = 30;

    while (true) {
      const response = await fetch(
        `${this.baseUrl}/catalogs/${catalogId}/products?page=${page}&page_size=${pageSize}&version=${version}&user_credentials=${this.userCredential}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Failed to get products: ${response.status}`);
      }

      const data = await response.json();
      const products = data.products || [];
      
      if (products.length === 0) break;
      
      allProducts = allProducts.concat(products);
      
      if (products.length < pageSize) break;
      page++;
    }

    console.log(`📦 Fetched ${allProducts.length} products from FieldFolio catalog ${catalogId}`);
    return allProducts;
  }

  async bulkUpdateStock(catalogId, varietyUpdates) {
    const response = await fetch(
      `${this.baseUrl}/catalogs/${catalogId}/varieties/bulk_update?user_credentials=${this.userCredential}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ varieties: varietyUpdates })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to bulk update stock: ${response.status} - ${text}`);
    }

    return response.json();
  }

  async updateProductVisibility(catalogId, productId, hidden) {
    const response = await fetch(
      `${this.baseUrl}/catalogs/${catalogId}/products/${productId}?user_credentials=${this.userCredential}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          id: productId,
          product: { hidden: hidden ? 1 : 0 }
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to update product visibility: ${response.status} - ${text}`);
    }

    return response.json();
  }

  async publishCatalog(catalogId) {
    const response = await fetch(
      `${this.baseUrl}/catalogs/${catalogId}/products/publish?user_credentials=${this.userCredential}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({})
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to publish catalog: ${response.status} - ${text}`);
    }

    // Publish returns empty response (202 Accepted), just return success
    return { ok: true };
  }
}

// Zoho API client (using Make webhook)
class ZohoAPI {
  constructor() {
    this.webhookUrl = 'https://hook.us1.make.com/2lt6dqdnb3zdoqfgpneneahbrcddq174';
  }

  async getInventoryItems() {
    let allItems = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'inventory',
          method: 'GET',
          url: `/v1/items?page=${page}&per_page=${perPage}`
        })
      });

      if (!response.ok) {
        throw new Error(`Zoho API failed: ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];
      
      if (items.length === 0) break;
      
      allItems = allItems.concat(items);
      console.log(`  📄 Page ${page}: ${items.length} items`);
      
      // Zoho page info
      const hasMore = data.page_context?.has_more_page;
      if (hasMore === false) break;
      if (items.length < perPage) break;
      
      page++;
    }

    console.log(`📦 Fetched ${allItems.length} total items from Zoho Inventory`);
    return allItems;
  }
}

// Check if sync already ran today
function hasRunToday() {
  const lastRunFile = path.join(__dirname, '.last-sync-run');
  
  if (!fs.existsSync(lastRunFile)) {
    return false;
  }

  const lastRunDate = fs.readFileSync(lastRunFile, 'utf8').trim();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  return lastRunDate === today;
}

// Record successful run
function recordRun() {
  const today = new Date().toISOString().split('T')[0];
  const lastRunFile = path.join(__dirname, '.last-sync-run');
  fs.writeFileSync(lastRunFile, today, 'utf8');
}

// Main sync function
async function syncStock() {
  // Check if already ran today
  if (hasRunToday()) {
    console.log('✅ Sync already completed today. Skipping.\n');
    return;
  }

  console.log('🔄 Starting Zoho → FieldFolio stock sync...\n');

  const fieldfolio = new FieldFolioAPI();
  const zoho = new ZohoAPI();

  try {
    // 1. Authenticate with FieldFolio
    await fieldfolio.authenticate();

    // 2. Get FieldFolio catalogs
    const catalogsData = await fieldfolio.getCatalogs();
    const catalogs = catalogsData.catalogs || [];
    
    if (catalogs.length === 0) {
      console.log('⚠️  No catalogs found in FieldFolio');
      return;
    }

    console.log(`📚 Found ${catalogs.length} catalog(s)\n`);

    // 3. Get Zoho inventory
    const zohoItems = await zoho.getInventoryItems();

    // Build SKU → stock & visibility lookup
    const zohoDataBySku = {};
    for (const item of zohoItems) {
      zohoDataBySku[item.sku] = {
        stock: parseFloat(item.available_stock) || 0,
        inPixsell: item.cf_in_pixsell || 'No'
      };
    }

    console.log(`\n📊 Zoho data loaded for ${Object.keys(zohoDataBySku).length} SKUs\n`);

    // 4. Process each catalog
    for (const catalog of catalogs) {
      console.log(`\n🔍 Processing catalog: ${catalog.name} (ID: ${catalog.id})`);
      
      const products = await fieldfolio.getProducts(catalog.id, 'draft');
      
      // Map varieties to update & track visibility changes
      const varietyUpdates = {};
      const visibilityUpdates = {}; // productId → hidden state
      let matchCount = 0;
      let stockChangeCount = 0;
      let visibilityChangeCount = 0;

      for (const product of products) {
        if (!product.varieties) continue;

        for (const variety of product.varieties) {
          const sku = variety.sku;
          
          if (!sku || !(sku in zohoDataBySku)) continue;
          
          matchCount++;
          const zohoData = zohoDataBySku[sku];
          const currentStock = parseFloat(variety.stock_on_hand) || 0;

          // Stock update
          if (zohoData.stock !== currentStock) {
            varietyUpdates[variety.id] = {
              stock_on_hand: zohoData.stock
            };
            stockChangeCount++;
            console.log(`  📝 ${sku}: ${currentStock} → ${zohoData.stock}`);
          }

          // Visibility update (based on cf_in_pixsell)
          const shouldBeHidden = zohoData.inPixsell === 'No';
          const isCurrentlyHidden = product.hidden === 1;

          if (shouldBeHidden !== isCurrentlyHidden) {
            visibilityUpdates[product.id] = shouldBeHidden;
            visibilityChangeCount++;
            const action = shouldBeHidden ? 'HIDE' : 'SHOW';
            console.log(`  👁️  ${sku}: ${action}`);
          }
        }
      }

      console.log(`\n  ✓ Matched ${matchCount} SKUs`);
      console.log(`  ✓ ${stockChangeCount} stock changes needed`);
      console.log(`  ✓ ${visibilityChangeCount} visibility changes needed`);

      // 5. Bulk update stock if there are changes (max 500 per batch)
      const varietyIds = Object.keys(varietyUpdates);
      if (varietyIds.length > 0) {
        const batchSize = 500;
        const batches = [];
        
        for (let i = 0; i < varietyIds.length; i += batchSize) {
          const batchIds = varietyIds.slice(i, i + batchSize);
          const batchUpdates = {};
          for (const id of batchIds) {
            batchUpdates[id] = varietyUpdates[id];
          }
          batches.push(batchUpdates);
        }

        console.log(`\n  ⏳ Updating ${varietyIds.length} varieties in ${batches.length} batch(es)...`);
        
        for (let i = 0; i < batches.length; i++) {
          console.log(`    📦 Batch ${i + 1}/${batches.length}: ${Object.keys(batches[i]).length} varieties`);
          await fieldfolio.bulkUpdateStock(catalog.id, batches[i]);
        }
        
        console.log(`  ✅ Stock updated successfully`);
      } else {
        console.log(`  ℹ️  No stock changes needed`);
      }

      // 6. Update visibility (individual product updates)
      const productIds = Object.keys(visibilityUpdates);
      let needsPublish = false;
      
      if (productIds.length > 0) {
        console.log(`\n  ⏳ Updating visibility for ${productIds.length} products...`);
        
        for (const productId of productIds) {
          const shouldHide = visibilityUpdates[productId];
          await fieldfolio.updateProductVisibility(catalog.id, productId, shouldHide);
        }
        
        console.log(`  ✅ Visibility updated successfully`);
        needsPublish = true;
      } else {
        console.log(`  ℹ️  No visibility changes needed`);
      }

      // 7. Publish catalog if visibility changed
      if (needsPublish) {
        console.log(`\n  📢 Publishing catalog changes...`);
        await fieldfolio.publishCatalog(catalog.id);
        console.log(`  ✅ Catalog published`);
      }
    }

    console.log('\n✅ Sync complete!\n');
    
    // Record successful run
    recordRun();

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    throw error;
  }
}

// Run sync
syncStock().catch(err => {
  console.error(err);
  process.exit(1);
});
