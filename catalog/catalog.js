let allProducts = [];
let currentPage = 1;
let totalPages = 0;
const PRODUCTS_PER_PAGE = 6;

// Load products and initialize flipbook
async function init() {
    try {
        const response = await fetch('products.json');
        allProducts = await response.json();
        
        console.log(`Loaded ${allProducts.length} products`);
        
        // Generate pages
        generatePages(allProducts);
        
        // Initialize turn.js flipbook
        $('#flipbook').turn({
            width: 1200,
            height: 800,
            autoCenter: true,
            display: 'double',
            acceleration: true,
            gradients: true,
            elevation: 50,
            when: {
                turned: function(event, page) {
                    currentPage = page;
                    updatePageCounter();
                }
            }
        });
        
        updatePageCounter();
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('flipbook').innerHTML = 
            '<div style="padding: 40px; text-align: center;">Error loading catalog. Please refresh.</div>';
    }
}

// Generate flipbook pages from products
function generatePages(products) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '';
    
    // Cover page
    const cover = document.createElement('div');
    cover.className = 'page cover';
    cover.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%;">
            <h1 style="font-size: 48px; margin-bottom: 20px;">ARTICO</h1>
            <h2 style="font-size: 24px; color: #666;">Product Catalog 2026</h2>
            <p style="margin-top: 40px; color: #999;">${products.length} Products</p>
        </div>
    `;
    flipbook.appendChild(cover);
    
    // Product pages
    for (let i = 0; i < products.length; i += PRODUCTS_PER_PAGE) {
        const pageProducts = products.slice(i, i + PRODUCTS_PER_PAGE);
        const page = createProductPage(pageProducts);
        flipbook.appendChild(page);
    }
    
    totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE) + 1; // +1 for cover
}

// Create a single product page
function createProductPage(products) {
    const page = document.createElement('div');
    page.className = 'page';
    
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product';
        
        const imageHtml = product.has_image && product.image_name
            ? `<img src="images/${product.image_name}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="placeholder" style="display: none;">No Image</div>`
            : `<div class="placeholder">No Image</div>`;
        
        productDiv.innerHTML = `
            ${imageHtml}
            <div class="sku">${product.sku || ''}</div>
            <div class="name">${product.name || 'Unnamed Product'}</div>
            <div class="price">$${formatPrice(product.rrp)}</div>
        `;
        
        page.appendChild(productDiv);
    });
    
    return page;
}

// Format price
function formatPrice(price) {
    if (!price) return '0.00';
    return parseFloat(price).toFixed(2);
}

// Navigation
function nextPage() {
    $('#flipbook').turn('next');
}

function previousPage() {
    $('#flipbook').turn('previous');
}

function updatePageCounter() {
    document.getElementById('page-counter').textContent = 
        `Page ${currentPage} of ${totalPages}`;
}

// Search products
function searchProducts() {
    const query = document.getElementById('search').value.toLowerCase();
    
    if (!query) {
        generatePages(allProducts);
        $('#flipbook').turn('destroy').turn({
            width: 1200,
            height: 800,
            autoCenter: true
        });
        return;
    }
    
    const filtered = allProducts.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query))
    );
    
    console.log(`Found ${filtered.length} products matching "${query}"`);
    
    generatePages(filtered);
    $('#flipbook').turn('destroy').turn({
        width: 1200,
        height: 800,
        autoCenter: true
    });
}

// Handle Enter key in search
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    init();
});
