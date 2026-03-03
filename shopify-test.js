#!/usr/bin/env node
/**
 * Test Shopify API Connection
 * Verifies credentials and shows basic store info
 */

const fs = require('fs');
const path = require('path');

const CREDENTIALS_FILE = path.join(__dirname, 'shopify-credentials.json');

async function testConnection(store = 'australia') {
  // Load credentials
  if (!fs.existsSync(CREDENTIALS_FILE)) {
    console.error('❌ Credentials file not found. Run shopify-oauth-setup.js first.');
    process.exit(1);
  }
  
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
  
  if (!credentials[store]) {
    console.error(`❌ No credentials found for store: ${store}`);
    console.error(`   Available stores: ${Object.keys(credentials).join(', ')}`);
    process.exit(1);
  }
  
  const { shop, access_token } = credentials[store];
  
  console.log(`🔍 Testing connection to ${shop}...\n`);
  
  // Test 1: Get shop info
  try {
    const shopResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!shopResponse.ok) {
      throw new Error(`HTTP ${shopResponse.status}: ${await shopResponse.text()}`);
    }
    
    const shopData = await shopResponse.json();
    console.log('✅ Shop Info:');
    console.log(`   Name: ${shopData.shop.name}`);
    console.log(`   Domain: ${shopData.shop.domain}`);
    console.log(`   Email: ${shopData.shop.email}`);
    console.log(`   Currency: ${shopData.shop.currency}`);
    console.log(`   Timezone: ${shopData.shop.timezone}`);
  } catch (err) {
    console.error(`❌ Failed to get shop info: ${err.message}`);
    process.exit(1);
  }
  
  // Test 2: Count products
  try {
    const countResponse = await fetch(`https://${shop}/admin/api/2024-01/products/count.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!countResponse.ok) {
      throw new Error(`HTTP ${countResponse.status}: ${await countResponse.text()}`);
    }
    
    const countData = await countResponse.json();
    console.log(`\n✅ Product Count: ${countData.count} products`);
  } catch (err) {
    console.error(`❌ Failed to count products: ${err.message}`);
  }
  
  // Test 3: Get recent orders
  try {
    const ordersResponse = await fetch(`https://${shop}/admin/api/2024-01/orders.json?limit=5&status=any`, {
      headers: {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ordersResponse.ok) {
      throw new Error(`HTTP ${ordersResponse.status}: ${await ordersResponse.text()}`);
    }
    
    const ordersData = await ordersResponse.json();
    console.log(`\n✅ Recent Orders: ${ordersData.orders.length} found`);
    if (ordersData.orders.length > 0) {
      ordersData.orders.slice(0, 3).forEach(order => {
        console.log(`   #${order.order_number} - ${order.financial_status} - $${order.total_price}`);
      });
    }
  } catch (err) {
    console.error(`❌ Failed to get orders: ${err.message}`);
  }
  
  console.log('\n✨ Connection test complete!\n');
}

// Run test
const store = process.argv[2] || 'australia';
testConnection(store);
