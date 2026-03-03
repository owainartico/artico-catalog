#!/usr/bin/env node
// Quick script to exchange authorization code for access token

const fs = require('fs');
const path = require('path');

const CONFIG = {
  clientId: 'acc793b5162462ed6cf247b3902bfb73',
  clientSecret: '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',
  shop: 'artico-pty-ltd.myshopify.com',
  code: '91b1ba8770509935febff0fa9091c47a'
};

async function exchangeCode() {
  const url = `https://${CONFIG.shop}/admin/oauth/access_token`;
  
  const body = JSON.stringify({
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
    code: CONFIG.code
  });
  
  console.log(`🔄 Exchanging code for access token...`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: body
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed: ${response.status} ${error}`);
  }
  
  const data = await response.json();
  
  // Save credentials
  const credentials = {
    australia: {
      shop: CONFIG.shop,
      access_token: data.access_token,
      scope: data.scope,
      created_at: new Date().toISOString()
    }
  };
  
  const credFile = path.join(__dirname, 'shopify-credentials.json');
  fs.writeFileSync(credFile, JSON.stringify(credentials, null, 2));
  
  console.log(`\n✅ Success!`);
  console.log(`   Access token: ${data.access_token.substring(0, 25)}...`);
  console.log(`   Scopes: ${data.scope}`);
  console.log(`\n💾 Saved to: shopify-credentials.json\n`);
}

exchangeCode().catch(err => {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
});
