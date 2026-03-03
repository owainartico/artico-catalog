# Artico Catalog - Auto-Updating Flipbook

Static HTML flipbook catalog that auto-updates from Zoho Inventory.

## What's Built

- **1,377 products** from Zoho (sorted by catalog_order)
- **Page-flip animation** (turn.js)
- **Search functionality** (SKU, name, brand, category)
- **Mobile responsive**
- **Handles missing images** (94% have images)

## Files

- `index.html` — Main flipbook page
- `style.css` — Styling
- `catalog.js` — Flipbook logic
- `products.json` — Product data (from Zoho)
- `images/` — (needs to be added)

## Next Steps

### 1. Add Product Images

The catalog expects images in `catalog/images/` folder named exactly as they appear in Zoho's `image_name` field.

**Option A: Manual Copy**
```bash
# Copy images from WorkDrive to catalog/images/
```

**Option B: Auto-Sync Script** (recommended)
Create a script that:
1. Pulls image list from WorkDrive
2. Matches to Zoho products
3. Downloads/syncs to `catalog/images/`

### 2. Test Locally

```bash
# Serve the catalog folder
cd catalog
python -m http.server 8000
# Or use any static server
```

Open: http://localhost:8000

### 3. Deploy to Hosting

**GitHub Pages (Free)**
1. Push `catalog/` folder to GitHub repo
2. Enable GitHub Pages in repo settings
3. Point catalog.artico.com.au to GitHub Pages

**Netlify (Free)**
1. Drop `catalog/` folder into Netlify
2. Get deploy URL
3. Point catalog.artico.com.au to Netlify

**Vercel/Cloudflare Pages** (also free options)

### 4. Auto-Update Setup

Create a script that runs daily:
```bash
# 1. Pull latest Zoho products
node pull-zoho-inventory.js

# 2. Rebuild catalog manifest
node build-catalog-manifest.js

# 3. Copy to catalog/
cp catalog-manifest.json catalog/products.json

# 4. Sync images (if needed)

# 5. Deploy
git commit -am "Auto-update $(date)"
git push
```

Can run this:
- As a cron job
- Via GitHub Actions
- Via Netlify build hook
- Manual trigger when needed

## Customization

### Change Products Per Page
Edit `catalog.js`:
```javascript
const PRODUCTS_PER_PAGE = 6; // Change to 4, 8, 9, etc.
```

### Update Branding
- Replace "ARTICO" logo in `index.html`
- Adjust colors in `style.css`
- Add company info to cover page

### Add Product Details
Edit `createProductPage()` in `catalog.js` to show:
- Brand
- Stock status
- Category
- Description

## Missing Images (88 products)

See `missing-images-report.txt` for list.

Options:
- Add placeholder images
- Hide products without images
- Upload images to WorkDrive

## Browser Support

- Chrome/Edge (latest)
- Safari (latest)
- Firefox (latest)
- Mobile browsers (iOS Safari, Chrome)

Turn.js requires jQuery (loaded via CDN).

## Performance

- **Load time:** ~1-2 seconds (1377 products)
- **Images:** Lazy-loaded by browser
- **Search:** Instant client-side filtering

## Cost

**Free** (static hosting, no server costs).

Compare to PaperTurn: $X/month savings.
