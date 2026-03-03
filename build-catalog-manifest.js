#!/usr/bin/env node
/**
 * Build catalog manifest from Zoho products
 * Maps products to images and creates catalog-ready JSON
 */

const fs = require('fs');

const products = JSON.parse(fs.readFileSync('zoho-products.json', 'utf8'));

console.log('Building catalog manifest...');

// Filter: active products with catalog_order
const catalogProducts = products.filter(p => 
  p.status === 'active' && 
  p.cf_catalog_order !== undefined && 
  p.cf_catalog_order !== null &&
  p.cf_catalog_order !== ''
);

console.log(`Found ${catalogProducts.length} catalog products (active + has catalog_order)`);

// Sort by catalog_order
catalogProducts.sort((a, b) => {
  const orderA = parseFloat(a.cf_catalog_order) || 0;
  const orderB = parseFloat(b.cf_catalog_order) || 0;
  return orderA - orderB;
});

// Build manifest
const manifest = catalogProducts.map(p => ({
  sku: p.sku,
  name: p.name || p.item_name,
  catalog_order: parseFloat(p.cf_catalog_order) || 0,
  brand: p.cf_brand,
  category: p.cf_product_category,
  rrp: p.cf_rrp_unformatted || p.rate,
  stock: p.stock_on_hand,
  
  // Image info
  has_image: p.has_attachment,
  image_name: p.image_name,
  image_document_id: p.image_document_id,
  
  // For matching
  unit_barcode: p.cf_unit_barcode,
  ean: p.ean,
  upc: p.upc,
  
  // Raw Zoho data (for debugging)
  _zoho_id: p.item_id
}));

// Save manifest
fs.writeFileSync('catalog-manifest.json', JSON.stringify(manifest, null, 2));
console.log('Saved catalog-manifest.json');

// Generate missing images report
const withImages = manifest.filter(p => p.has_image);
const withoutImages = manifest.filter(p => !p.has_image);

const report = [
  `Catalog Product Summary`,
  `======================`,
  ``,
  `Total catalog products: ${manifest.length}`,
  `With images: ${withImages.length}`,
  `Without images: ${withoutImages.length}`,
  ``,
  `Missing Images (${withoutImages.length} products):`,
  `================`,
  ``
];

withoutImages.forEach(p => {
  report.push(`[${p.sku}] ${p.name}`);
  report.push(`  Category: ${p.category || 'N/A'}`);
  report.push(`  Order: ${p.catalog_order}`);
  report.push(``);
});

fs.writeFileSync('missing-images-report.txt', report.join('\n'));
console.log('Saved missing-images-report.txt');

console.log('\nCatalog Manifest Summary:');
console.log(`  Products in catalog: ${manifest.length}`);
console.log(`  With images: ${withImages.length} (${Math.round(withImages.length/manifest.length*100)}%)`);
console.log(`  Without images: ${withoutImages.length}`);
console.log(`  First product order: ${manifest[0]?.catalog_order}`);
console.log(`  Last product order: ${manifest[manifest.length-1]?.catalog_order}`);
