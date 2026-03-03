// skoocloud-import.js — Daily SkooCloud → Artico CRM CSV import
// Run: node skoocloud-import.js

const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');
const path = require('path');

const CHROMIUM_PATH = String.raw`C:\WINDOWS\system32\config\systemprofile\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe`;

// Discord webhook notification
const DISCORD_WEBHOOK = 'https://discordapp.com/api/webhooks/1478188516633481298/JX7uU1UaQzs2y48x5jWJGVMRTStGTYTzPXFWqaTJCVIA9hUC0DqidP9oZJHP7Kf6leBX';

function sendDiscord(msg) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ content: msg });
    const url = new URL(DISCORD_WEBHOOK);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => { res.resume(); resolve(); });
    req.on('error', () => resolve());
    req.write(data);
    req.end();
  });
}

const SKOO_URL = 'https://databridge.skoocloud.com/report/artico';
const SKOO_USER = 'admin';
const SKOO_PASS = 'nectar56';

const ARTICO_URL = 'https://sales.artico.au/';
const ARTICO_USER = 'owain@artico.net.au';
const ARTICO_PASS = 'artico2026';

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
    // Try common dropdown patterns
    try {
      await page.selectOption('select', { label: 'Calls Report' });
    } catch {
      // Maybe it's a custom dropdown - click and select
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

    // 7-8. Fetch CSV via POST (using page context to preserve cookies)
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

    // 10. Log in to Artico
    log('Logging in to Artico...');
    await artico.fill('input[name="email"], input[type="email"], input[name="username"]', ARTICO_USER);
    await artico.fill('input[name="password"], input[type="password"]', ARTICO_PASS);
    await artico.click('button[type="submit"], input[type="submit"]');
    await artico.waitForLoadState('networkidle');
    log('Logged in to Artico.');

    // 11. Click "Team" tab (bottom nav)
    log('Clicking Team tab...');
    await artico.getByText('Team', { exact: true }).first().click();
    await artico.waitForLoadState('networkidle');

    // 12. Click "Users" tab (top)
    log('Clicking Users tab...');
    await artico.getByText('Users', { exact: true }).first().click();
    await artico.waitForLoadState('networkidle');

    // 13. Click "Import CSV" button
    log('Clicking Import CSV...');
    await artico.getByText('Import CSV').first().click();
    await artico.waitForLoadState('networkidle');

    // 14. Upload CSV via JS
    log('Uploading CSV data...');
    await artico.evaluate((csv) => {
      const file = new File([csv], 'calls-report.csv', { type: 'text/csv' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('#import-file-input');
      input.files = dt.files;
      if (typeof importFileSelected === 'function') {
        importFileSelected();
      } else {
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, csvData);

    // 15. Wait for preview — look for the valid/rows summary
    log('Waiting for import preview...');
    await artico.waitForTimeout(3000);
    const summaryText = await artico.locator('body').textContent();
    const validMatch = summaryText.match(/(\d+)\s*valid/i);
    const rowsMatch = summaryText.match(/(\d+)\s*rows/i);
    const validCount = validMatch ? parseInt(validMatch[1]) : 0;
    const rowCount = rowsMatch ? parseInt(rowsMatch[1]) : 0;
    
    if (validMatch) {
      log(`Preview: ${rowCount} rows, ${validCount} valid`);
    } else {
      log('Warning: Could not find valid row count in preview');
    }

    // If no valid rows, exit gracefully (common on weekends)
    if (validCount === 0) {
      log('No valid rows to import. Exiting quietly (likely no visits yesterday).');
      await browser.close();
      // No Discord notification for empty imports
      process.exit(0);
    }

    // 16. Click "Import All Valid Rows"
    log('Clicking Import All Valid Rows...');
    await artico.getByText('Import All Valid Rows').click();

    // 17. Wait for completion
    log('Waiting for import completion...');
    await artico.getByText(/IMPORT COMPLETE/i).waitFor({ timeout: 60000 });
    log('Import complete!');

    // 18. Log result
    const resultText = await artico.getByText(/IMPORT COMPLETE/i).textContent().catch(() => 'Completed');
    log(`Result: ${resultText.trim()}`);

    await browser.close();
    const summary = `🎸 **Skoocloud Import — ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}**\n${rowCount} rows | ${validCount} valid | Import complete ✅`;
    await sendDiscord(summary);
    log('Done. Exiting successfully.');
    process.exit(0);
  } catch (err) {
    log(`ERROR: ${err.message}`);
    console.error(err.stack);
    await sendDiscord(`🎸 **Skoocloud Import FAILED**\n${err.message}`);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
})();
