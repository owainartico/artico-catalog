#!/usr/bin/env node
/**
 * Pull complete Zoho Inventory product catalog
 * Saves to zoho-products.json
 */

const https = require('https');
const fs = require('fs');

const WEBHOOK_URL = 'https://hook.us1.make.com/2lt6dqdnb3zdoqfgpneneahbrcddq174';

async function fetchZohoPage(page = 1, perPage = 200) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      app: 'inventory',
      method: 'GET',
      url: `/v1/items?per_page=${perPage}&page=${page}`
    });

    const req = https.request(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function pullAllProducts() {
  const allProducts = [];
  let page = 1;
  let hasMore = true;

  console.log('Pulling Zoho Inventory products...');

  while (hasMore) {
    console.log(`  Fetching page ${page}...`);
    const response = await fetchZohoPage(page);
    
    if (response.items && response.items.length > 0) {
      allProducts.push(...response.items);
      console.log(`    Got ${response.items.length} products (total: ${allProducts.length})`);
    }

    hasMore = response.page_context?.has_more_page || false;
    page++;

    // Rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\nTotal products fetched: ${allProducts.length}`);

  // Save to file
  fs.writeFileSync('zoho-products.json', JSON.stringify(allProducts, null, 2));
  console.log('Saved to zoho-products.json');

  // Generate summary
  const activeProducts = allProducts.filter(p => p.status === 'active');
  const withImages = allProducts.filter(p => p.has_attachment);
  const catalogOrdered = allProducts.filter(p => p.cf_catalog_order);

  console.log('\nSummary:');
  console.log(`  Total: ${allProducts.length}`);
  console.log(`  Active: ${activeProducts.length}`);
  console.log(`  With images: ${withImages.length}`);
  console.log(`  With catalog_order: ${catalogOrdered.length}`);

  return allProducts;
}

pullAllProducts().catch(console.error);
