# Catalog Replacement Project — Progress Notes

## Current Status: Data Discovery

### ✅ What I've Found

**Zoho Inventory:**
- 200+ products per page, multiple pages
- Each product has:
  - `sku` (e.g., "3D004", "3D017")
  - `name` (e.g., "3D Bkmk - Dinosaurs")
  - `rate` (wholesale price)
  - `stock_on_hand`
  - `image_name` (e.g., "3D004.png")
  - `image_document_id` (Zoho internal ID)
  - Custom fields: `cf_catalog_order`, `cf_rrp`, `cf_brand`, etc.

**WorkDrive Image Folder:**
- Found: `2026/Catalog Images/`
- Contains hundreds of product images
- **Mixed naming patterns:**
  - Product codes: `BF11.png`, `BM11.png`, `CB07.png`
  - Barcodes: `9351095017697.png`, `9351095017703.png`
  - Descriptive: `Australian Natives.png`, `Bookmark 001.jpg`
  - Numbers: `1.png`, `2.png`, `3.png`
- File types: `.png`, `.jpg`, `.webp`

**InDesign Files:**
- Latest: `Artico Catalog Australia 2026 February 002.indd` (Feb 18, 2026)
- Downloaded for layout analysis

### ❓ Still Need

1. **Image matching logic:**
   - How does Zoho's `image_name` field map to WorkDrive filenames?
   - Example: SKU "3D004" → which file? `3D004.png`? `9351095002594.png` (barcode)?

2. **Product order source:**
   - Use `cf_catalog_order` from Zoho?
   - Or extract page order from InDesign file?

### 🛠️ What I'll Build

**Phase 1: Data Pipeline**
- Script to pull full Zoho Inventory
- Fetch/download product images from WorkDrive
- Generate JSON manifest matching SKUs → images

**Phase 2: Catalog Generator**
- HTML/CSS/JS flipbook using turn.js
- Your branding (Artico logo, colors, fonts)
- Product layout matching current catalog
- Search/filter functionality

**Phase 3: Auto-Update**
- Cron job to regenerate catalog daily (or on-demand)
- Compares Zoho data, rebuilds if changed
- Deploys to hosting

**Phase 4: Hosting**
- GitHub Pages (free) or Netlify (free)
- Point catalog.artico.com.au DNS to new site

### Next Steps

Reply with:
1. WorkDrive folder path for product images
2. Whether `cf_catalog_order` is correct for product sequencing
3. If you can upload/share current PDF (or email it to wherever makes sense)

Then I'll start building Phase 1.
