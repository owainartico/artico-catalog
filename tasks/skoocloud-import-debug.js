// skoocloud-import-debug.js — Debug version with screenshots
// Run: node skoocloud-import-debug.js

const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');
const path = require('path');

const CHROMIUM_PATH = String.raw`C:\WINDOWS\system32\config\systemprofile\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe`;

const SKOO_URL = 'https://databridge.skoocloud.com/report/artico';
const SKOO_USER = 'admin';
const SKOO_PASS = 'nectar56';

const ARTICO_URL = 'https://sales.artico.au/';
const ARTICO_USER = 'owain@artico.net.au';
const ARTICO_PASS = 'U6dK3iCAXmE7yTc';

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney' })}] ${msg}`);
}

(async () => {
  let browser;
  try {
    // 1. Launch browser
    log('Launching Chromium...');
    browser = await chromium.launch({
      executablePath: CHROMIUM_PATH,
      headless: true,
    });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    context.setDefaultTimeout(30000);
    const page = await context.newPage();

    // 2. Navigate to SkooCloud
    log('Navigating to SkooCloud...');
    await page.goto(SKOO_URL, { waitUntil: 'networkidle' });

    // 3. Log in
    log('Logging in to SkooCloud...');
    await page.fill('input[name="username"], input[type="text"]', SKOO_USER);
    await page.fill('input[name="password"], input[type="password"]', SKOO_PASS);
    await page.click('button[type="submit"], input[type="submit"], .login-btn, #login-btn');
    await page.waitForLoadState('networkidle');
    log('Logged in to SkooCloud.');

    // 4-5. Select "Calls Report" from dropdown
    log('Selecting Calls Report...');
    try {
      await page.selectOption('select', { label: 'Calls Report' });
    } catch {
      const dropdown = page.locator('select, .dropdown, [data-role="dropdown"]').first();
      await dropdown.click();
      await page.locator('text=Calls Report').click();
    }
    await page.waitForLoadState('networkidle');
    log('Calls Report selected.');

    // 6. Click "yesterday" button
    log('Clicking Yesterday button...');
    await page.getByRole('cell', { name: 'yesterday' }).click();
    await page.waitForLoadState('networkidle');
    log('Yesterday report loaded.');

    // 7-8. Fetch CSV via POST
    log('Fetching CSV data...');
    const csvData = await page.evaluate(async () => {
      const params = new URLSearchParams();
      params.set('section', '15');
      params.set('rep', '');
      params.set('filtercust', '');
      params.set('filterstamp', '');
      params.set('sort', '-');
      params.set('output', 'csv');
      const resp = await fetch('https://databridge.skoocloud.com/report/rpt-diary.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      return await resp.text();
    });
    log(`CSV fetched: ${csvData.length} chars, ${csvData.split('\n').length} lines.`);

    if (!csvData || csvData.length < 10) {
      throw new Error('CSV data is empty or too short');
    }

    // 9. Open Artico in new tab
    log('Navigating to Artico CRM...');
    const artico = await context.newPage();
    await artico.goto(ARTICO_URL, { waitUntil: 'networkidle' });
    await artico.screenshot({ path: 'artico-1-initial.png', fullPage: true });
    log('Screenshot: artico-1-initial.png');

    // 10. Log in to Artico
    log('Logging in to Artico...');
    await artico.fill('input[name="email"], input[type="email"], input[name="username"]', ARTICO_USER);
    await artico.fill('input[name="password"], input[type="password"]', ARTICO_PASS);
    await artico.screenshot({ path: 'artico-2-login-filled.png', fullPage: true });
    log('Screenshot: artico-2-login-filled.png');
    
    await artico.click('button[type="submit"], input[type="submit"]');
    await artico.waitForLoadState('networkidle');
    await artico.screenshot({ path: 'artico-3-after-login.png', fullPage: true });
    log('Screenshot: artico-3-after-login.png');
    log('Logged in to Artico.');

    // Wait a bit for any animations
    await artico.waitForTimeout(2000);
    await artico.screenshot({ path: 'artico-4-wait-complete.png', fullPage: true });
    log('Screenshot: artico-4-wait-complete.png');

    // Check what's visible
    const bodyText = await artico.locator('body').textContent();
    log(`Body contains Team: ${bodyText.includes('Team')}`);
    
    // Try to find all Team elements
    const teamElements = await artico.getByText('Team', { exact: true }).count();
    log(`Found ${teamElements} "Team" elements`);
    
    // Get all their states
    for (let i = 0; i < teamElements; i++) {
      const elem = artico.getByText('Team', { exact: true }).nth(i);
      const visible = await elem.isVisible().catch(() => false);
      const box = await elem.boundingBox().catch(() => null);
      log(`Team element ${i}: visible=${visible}, box=${JSON.stringify(box)}`);
    }

    // 11. Click "Team" tab (bottom nav)
    log('Attempting to click Team tab...');
    await artico.screenshot({ path: 'artico-5-before-team-click.png', fullPage: true });
    await artico.getByText('Team', { exact: true }).first().click();
    await artico.waitForLoadState('networkidle');
    await artico.screenshot({ path: 'artico-6-after-team-click.png', fullPage: true });
    log('Screenshot: artico-6-after-team-click.png');

    log('Success! Check screenshots in tasks folder.');
    await browser.close();
    process.exit(0);
  } catch (err) {
    log(`ERROR: ${err.message}`);
    console.error(err.stack);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
})();
