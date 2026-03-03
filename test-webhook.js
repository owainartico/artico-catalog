const webhook = "https://discordapp.com/api/webhooks/1478188516633481298/JX7uU1UaQzs2y48x5jWJGVMRTStGTYTzPXFWqaTJCVIA9hUC0DqidP9oZJHP7Kf6leBX";

const message = {
  content: `✅ **Shopify Visibility Sync** (australia) completed successfully\n\n` +
           `**Zoho items:** 3984\n` +
           `**Shopify products:** 1260\n` +
           `**Matched (in Zoho):** 1255\n` +
           `**Published:** 0\n` +
           `**Drafted:** 175\n` +
           `**Not in Zoho (drafted):** 5\n` +
           `**Errors:** 0`
};

fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(message)
})
.then(res => {
  console.log(`Webhook response: ${res.status}`);
  if (!res.ok) {
    return res.text().then(text => { throw new Error(text); });
  }
  console.log('✓ Notification sent successfully');
})
.catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
