#!/usr/bin/env node
/**
 * Shopify OAuth Setup - New Zealand Store
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  clientId: 'acc793b5162462ed6cf247b3902bfb73',
  clientSecret: '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',
  shop: 'artico-new-zealand.myshopify.com',
  scopes: [
    'read_products',
    'write_products',
    'read_inventory',
    'write_inventory',
    'read_orders',
    'write_orders',
    'read_customers',
    'read_draft_orders',
    'write_draft_orders'
  ].join(',')
};

const CREDENTIALS_FILE = path.join(__dirname, 'shopify-credentials.json');

// Generate authorization URL
function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: CONFIG.clientId,
    scope: CONFIG.scopes,
    redirect_uri: 'http://localhost:3000/callback',
    state: 'nonce-' + Date.now()
  });
  
  return `https://${CONFIG.shop}/admin/oauth/authorize?${params.toString()}`;
}

console.log('🎸 Shopify OAuth Setup - New Zealand Store\n');
console.log('📋 Visit this URL and click "Install app":\n');
console.log(getAuthUrl());
console.log('\n📋 After clicking "Install app", copy the FULL URL from your browser');
console.log('   (it will fail to load, but copy it anyway)');
console.log('📋 Paste it here and I\'ll extract the code manually.\n');
