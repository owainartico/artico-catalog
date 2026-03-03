const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: String.raw`C:\WINDOWS\system32\config\systemprofile\AppData\Local\ms-playwright\chromium-1208\chrome-win64\chrome.exe`,
    headless: true
  });
  const page = await browser.newPage();

  // Set cookie/token then go to API docs
  await page.goto('https://app.fieldfolio.com');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Try setting the auth cookie
  await page.context().addCookies([{
    name: 'user_credential',
    value: '9oLs6gWXfpY0Oe635ggb',
    domain: 'app.fieldfolio.com',
    path: '/'
  }]);

  await page.goto('https://app.fieldfolio.com/api');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  await page.screenshot({ path: 'fieldfolio-api.png', fullPage: true });
  
  const text = await page.locator('body').innerText();
  console.log(text.substring(0, 8000));

  await browser.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
