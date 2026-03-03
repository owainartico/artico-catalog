# Shopify API Reference

**Credentials:** `shopify-credentials.json`  
**API Version:** 2024-01  
**Auth:** Use `X-Shopify-Access-Token` header with access token from credentials file

## Australia Store

- **Shop:** `artico-pty-ltd.myshopify.com`
- **Domain:** `artico.com.au`
- **Products:** ~1,260
- **Scopes:** read/write products, inventory, orders, draft orders; read customers

## Scripts

- `shopify-test.js` — test connection and show store info
- `shopify-oauth-setup.js` — OAuth flow for getting access tokens (completed for AU)

## API Pattern

```
GET https://{shop}/admin/api/2024-01/{endpoint}.json
Headers: X-Shopify-Access-Token: {access_token}
```

## Common Endpoints

- `/products`
- `/products/count`
- `/inventory_levels`
- `/orders`
- `/customers`
- `/draft_orders`

## Notes

**New Zealand store:** Not yet configured (repeat OAuth process with NZ shop URL when ready).
