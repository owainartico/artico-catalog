#!/usr/bin/env node
/**
 * Zoho → Shopify Visibility Sync
 * 
 * Syncs product visibility based on Zoho's cf_in_pixsell custom field:
 * - "Yes" → Published (visible in Shopify store)
 * - "No" → Draft (hidden from store)
 * 
 * Matches products by SKU
 * Reports to Discord webhook
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ZOHO_CREDS_FILE = path.join(__dirname, 'zoho-credentials.json');
const SHOPIFY_CREDS_FILE = path.join(__dirname, 'shopify-credentials.json');
const DISCORD_WEBHOOK = process.env.SHOPIFY_DISCORD_WEBHOOK || 'https://discordapp.com/api/webhooks/1478188516633481298/JX7uU1UaQzs2y48x5jWJGVMRTStGTYTzPXFWqaTJCVIA9hUC0DqidP9oZJHP7Kf6leBX';

// Store selection (default: australia)
const STORE = process.argv[2] || 'australia';

// Stats
const stats = {
  zohoProducts: 0,
  shopifyProducts: 0,
  matched: 0,
  published: 0,
  drafted: 0,
  errors: 0,
  skipped: 0
};

// Logging
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function logError(message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
  stats.errors++;
}

// Load Zoho access token
async function getZohoAccessToken() {
  const creds = JSON.parse(fs.readFileSync(ZOHO_CREDS_FILE, 'utf8'));
  
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: creds.refresh_token,
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      grant_type: 'refresh_token'
    })
  });
  
  if (!response.ok) {
    throw new Error(`Zoho auth failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.access_token;
}

// Fetch all items from Zoho Inventory
async function fetchZohoItems(accessToken) {
  log('Fetching items from Zoho Inventory...');
  
  const items = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const url = `https://www.zohoapis.com/inventory/v1/items?organization_id=689159620&page=${page}&per_page=200`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Zoho API error: ${response.status}`);
    }
    
    const data = await response.json();
    items.push(...data.items);
    
    hasMore = data.page_context.has_more_page;
    page++;
    
    log(`  Fetched page ${page - 1}, ${items.length} items so far...`);
  }
  
  stats.zohoProducts = items.length;
  log(`✓ Fetched ${items.length} items from Zoho`);
  
  return items;
}

// Fetch all products from Shopify
async function fetchShopifyProducts(shop, accessToken) {
  log('Fetching products from Shopify...');
  
  const products = [];
  let url = `https://${shop}/admin/api/2024-01/products.json?limit=250`;
  
  while (url) {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }
    
    const data = await response.json();
    products.push(...data.products);
    
    // Check for next page
    const linkHeader = response.headers.get('Link');
    url = null;
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      }
    }
    
    log(`  Fetched ${products.length} products so far...`);
  }
  
  stats.shopifyProducts = products.length;
  log(`✓ Fetched ${products.length} products from Shopify`);
  
  return products;
}

// Update Shopify product status
async function updateShopifyProductStatus(shop, accessToken, productId, shouldBePublished, currentStatus) {
  const newStatus = shouldBePublished ? 'active' : 'draft';
  
  // Skip if already correct
  if (currentStatus === newStatus) {
    return { updated: false, reason: 'already correct' };
  }
  
  const url = `https://${shop}/admin/api/2024-01/products/${productId}.json`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      product: {
        id: productId,
        status: newStatus
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return { updated: true, newStatus };
}

// Main sync function
async function syncVisibility() {
  log('=== Zoho → Shopify Visibility Sync ===');
  log(`Store: ${STORE}`);
  
  // Load credentials
  const shopifyCreds = JSON.parse(fs.readFileSync(SHOPIFY_CREDS_FILE, 'utf8'));
  if (!shopifyCreds[STORE]) {
    throw new Error(`No Shopify credentials found for store: ${STORE}`);
  }
  
  const { shop, access_token } = shopifyCreds[STORE];
  log(`Shopify store: ${shop}`);
  
  // Get Zoho access token
  const zohoToken = await getZohoAccessToken();
  
  // Fetch data
  const zohoItems = await fetchZohoItems(zohoToken);
  const shopifyProducts = await fetchShopifyProducts(shop, access_token);
  
  // Build SKU → visibility map from Zoho
  const zohoVisibility = new Map();
  for (const item of zohoItems) {
    const sku = item.sku;
    const inPixsell = item.cf_in_pixsell || '';
    const shouldBeVisible = inPixsell.toLowerCase() === 'yes';
    
    if (sku) {
      zohoVisibility.set(sku, shouldBeVisible);
    }
  }
  
  log(`\nProcessing ${shopifyProducts.length} Shopify products...`);
  
  // Update Shopify products
  for (const product of shopifyProducts) {
    // Get primary variant SKU
    const sku = product.variants && product.variants[0] ? product.variants[0].sku : null;
    
    if (!sku) {
      stats.skipped++;
      continue; // Skip products without SKU
    }
    
    let shouldBePublished = false;
    
    if (zohoVisibility.has(sku)) {
      stats.matched++;
      shouldBePublished = zohoVisibility.get(sku);
    } else {
      // Product not in Zoho → should be drafted
      stats.skipped++;
      shouldBePublished = false;
    }
    const currentStatus = product.status;
    
    try {
      const result = await updateShopifyProductStatus(
        shop,
        access_token,
        product.id,
        shouldBePublished,
        currentStatus
      );
      
      if (result.updated) {
        if (shouldBePublished) {
          stats.published++;
          log(`  ✓ Published: ${product.title} (${sku})`);
        } else {
          stats.drafted++;
          log(`  ✓ Drafted: ${product.title} (${sku})`);
        }
      }
    } catch (err) {
      logError(`Failed to update ${product.title} (${sku}): ${err.message}`);
    }
    
    // Rate limit: ~2 requests/second
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log('\n=== Sync Complete ===');
  log(`Zoho items: ${stats.zohoProducts}`);
  log(`Shopify products: ${stats.shopifyProducts}`);
  log(`Matched: ${stats.matched}`);
  log(`Published: ${stats.published}`);
  log(`Drafted: ${stats.drafted}`);
  log(`Skipped: ${stats.skipped}`);
  log(`Errors: ${stats.errors}`);
  
  return stats;
}

// Send Discord notification
async function notifyDiscord(stats) {
  if (!DISCORD_WEBHOOK) {
    log('No Discord webhook configured, skipping notification');
    return;
  }
  
  const emoji = stats.errors > 0 ? '⚠️' : '✅';
  const status = stats.errors > 0 ? 'completed with errors' : 'completed successfully';
  
  const message = {
    content: `${emoji} **Shopify Visibility Sync** (${STORE}) ${status}\n\n` +
             `**Zoho items:** ${stats.zohoProducts}\n` +
             `**Shopify products:** ${stats.shopifyProducts}\n` +
             `**Matched (in Zoho):** ${stats.matched}\n` +
             `**Published:** ${stats.published}\n` +
             `**Drafted:** ${stats.drafted}\n` +
             `**Not in Zoho (drafted):** ${stats.skipped}\n` +
             `**Errors:** ${stats.errors}`
  };
  
  try {
    const response = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      logError(`Discord notification failed: ${response.status}`);
    } else {
      log('Discord notification sent to #artico-shopify');
    }
  } catch (err) {
    logError(`Discord notification error: ${err.message}`);
  }
}

// Run sync
syncVisibility()
  .then(stats => notifyDiscord(stats))
  .then(() => {
    process.exit(stats.errors > 0 ? 1 : 0);
  })
  .catch(err => {
    logError(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
