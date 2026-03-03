#!/usr/bin/env node
/**
 * Shopify OAuth Setup
 * One-time script to get an access token for Shopify Admin API
 * 
 * Usage:
 *   node shopify-oauth-setup.js
 */

const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  clientId: 'acc793b5162462ed6cf247b3902bfb73',
  clientSecret: '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',
  shop: 'artico-pty-ltd.myshopify.com',
  redirectUri: 'http://localhost:3000/callback',
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
    redirect_uri: CONFIG.redirectUri,
    state: 'nonce-' + Date.now() // Simple state for CSRF protection
  });
  
  return `https://${CONFIG.shop}/admin/oauth/authorize?${params.toString()}`;
}

// Exchange code for access token
async function exchangeCodeForToken(code) {
  const url = `https://${CONFIG.shop}/admin/oauth/access_token`;
  
  const body = JSON.stringify({
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
    code: code
  });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: body
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${response.status} ${error}`);
  }
  
  return await response.json();
}

// Save credentials
function saveCredentials(data) {
  const credentials = {
    australia: {
      shop: CONFIG.shop,
      access_token: data.access_token,
      scope: data.scope,
      created_at: new Date().toISOString()
    }
  };
  
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2));
  console.log(`\n✅ Credentials saved to ${CREDENTIALS_FILE}`);
  console.log(`   Access token: ${data.access_token.substring(0, 20)}...`);
  console.log(`   Scopes: ${data.scope}`);
}

// Start local server to receive callback
function startCallbackServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authorization Failed</h1><p>Error: ${error}</p>`);
          server.close();
          reject(new Error(`Authorization error: ${error}`));
          return;
        }
        
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Missing Code</h1><p>No authorization code received.</p>');
          server.close();
          reject(new Error('No code received'));
          return;
        }
        
        console.log('\n📥 Received authorization code, exchanging for token...');
        
        try {
          const tokenData = await exchangeCodeForToken(code);
          saveCredentials(tokenData);
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Success!</title></head>
              <body style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h1>✅ Authorization Successful!</h1>
                <p>You can close this window and return to your terminal.</p>
                <p style="color: #666; font-size: 14px;">Access token has been saved to shopify-credentials.json</p>
              </body>
            </html>
          `);
          
          server.close();
          resolve(tokenData);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error</h1><p>${err.message}</p>`);
          server.close();
          reject(err);
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(3000, () => {
      console.log('🌐 Local callback server started on http://localhost:3000');
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error('Port 3000 is already in use. Please close other applications using this port.'));
      } else {
        reject(err);
      }
    });
  });
}

// Main
async function main() {
  console.log('🎸 Shopify OAuth Setup for Artico (Australia)\n');
  
  const authUrl = getAuthUrl();
  
  console.log('📋 Step 1: Visit this URL in your browser:');
  console.log(`\n   ${authUrl}\n`);
  console.log('📋 Step 2: Click "Install app" to authorize');
  console.log('📋 Step 3: You\'ll be redirected back here automatically\n');
  console.log('⏳ Waiting for authorization...\n');
  
  try {
    await startCallbackServer();
    console.log('\n✨ Setup complete! You can now use the Shopify API.\n');
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}\n`);
    process.exit(1);
  }
}

main();
