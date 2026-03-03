/**
 * Demand Planner - Offline App
 * Main application logic and UI rendering
 */

let currentPage = 'dashboard';
let isLoading = false;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  await initDB();
  setupNavigation();
  await loadPage('dashboard');
});

// Setup navigation
function setupNavigation() {
  // Sidebar navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const page = e.currentTarget.dataset.page;
      navigateTo(page);
    });
  });
  
  // Bottom nav (mobile)
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const page = e.currentTarget.dataset.page;
      navigateTo(page);
    });
  });
}

// Navigate to page
async function navigateTo(page) {
  // Update active state
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('nav-item--active', n.dataset.page === page);
  });
  document.querySelectorAll('.bottom-nav-item').forEach(n => {
    n.classList.toggle('bottom-nav-item--active', n.dataset.page === page);
  });
  
  currentPage = page;
  await loadPage(page);
}

// Load page content
async function loadPage(page) {
  const content = document.getElementById('page-content');
  content.innerHTML = '<div class="loading">Loading...</div>';
  
  try {
    switch (page) {
      case 'dashboard':
        await renderDashboard(content);
        break;
      case 'forecast':
        await renderForecast(content);
        break;
      case 'reorder':
        await renderReorder(content);
        break;
      case 'items':
        await renderItems(content);
        break;
      case 'settings':
        await renderSettings(content);
        break;
    }
  } catch (err) {
    content.innerHTML = `<div class="error">Error loading page: ${err.message}</div>`;
  }
}

// Render Dashboard
async function renderDashboard(content) {
  const stats = await getStats();
  const recs = await getRecommendations();
  
  const urgencyCounts = {
    critical: recs.filter(r => r.urgency === 'critical').length,
    reorder_now: recs.filter(r => r.urgency === 'reorder_now').length,
    upcoming: recs.filter(r => r.urgency === 'upcoming').length,
    healthy: recs.filter(r => r.urgency === 'healthy').length
  };
  
  const criticalItems = recs.filter(r => r.urgency === 'critical').slice(0, 10);
  
  content.innerHTML = `
    <div class="page-header">
      <h1>Dashboard</h1>
      <button class="btn btn--primary" onclick="navigateTo('settings')">🔄 Sync Data</button>
    </div>
    
    ${stats.items === 0 ? `
      <div class="empty-state">
        <div class="empty-state__icon">📦</div>
        <div class="empty-state__title">No data yet</div>
        <div class="empty-state__desc">Sync your data from Zoho to get started</div>
        <button class="btn btn--primary" onclick="navigateTo('settings')">Go to Settings</button>
      </div>
    ` : `
      <div class="stat-grid">
        <div class="stat-card stat-card--critical">
          <div class="stat-card__value">${urgencyCounts.critical}</div>
          <div class="stat-card__label">CRITICAL</div>
        </div>
        <div class="stat-card stat-card--warning">
          <div class="stat-card__value">${urgencyCounts.reorder_now}</div>
          <div class="stat-card__label">REORDER NOW</div>
        </div>
        <div class="stat-card stat-card--info">
          <div class="stat-card__value">${urgencyCounts.upcoming}</div>
          <div class="stat-card__label">UPCOMING</div>
        </div>
        <div class="stat-card stat-card--success">
          <div class="stat-card__value">${urgencyCounts.healthy}</div>
          <div class="stat-card__label">HEALTHY</div>
        </div>
      </div>
      
      ${criticalItems.length > 0 ? `
        <div class="card" style="margin-top:var(--space-5)">
          <div class="section-title">⚠️ Critical Alerts</div>
          <div class="alert-list">
            ${criticalItems.map(item => `
              <div class="alert-item">
                <div class="alert-item__icon">🔴</div>
                <div class="alert-item__content">
                  <div class="alert-item__title">${esc(item.item_name)}</div>
                  <div class="alert-item__desc">${esc(item.sku)} • Stock: ${item.current_stock} • Stockout: ${item.stockout_date}</div>
                </div>
                <button class="btn btn--sm btn--primary">Order</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <div class="card" style="margin-top:var(--space-5)">
        <div class="section-title">📊 Data Summary</div>
        <div class="info-list">
          <div class="info-item">
            <span>Active Items:</span>
            <strong>${stats.items}</strong>
          </div>
          <div class="info-item">
            <span>Sales Records:</span>
            <strong>${stats.sales}</strong>
          </div>
          <div class="info-item">
            <span>Forecasts:</span>
            <strong>${stats.forecasts}</strong>
          </div>
          <div class="info-item">
            <span>Last Sync:</span>
            <strong>${stats.lastSync ? new Date(stats.lastSync).toLocaleString() : 'Never'}</strong>
          </div>
        </div>
      </div>
    `}
  `;
}

// Render Forecast
async function renderForecast(content) {
  const forecasts = await getForecasts();
  const items = await getItems({ active_only: true });
  const itemsById = {};
  items.forEach(i => itemsById[i.zoho_item_id] = i);
  
  // Get next month forecasts only
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthKey = nextMonth.toISOString().slice(0, 7);
  
  const nextMonthForecasts = forecasts.filter(f => f.forecast_month.slice(0, 7) === nextMonthKey);
  
  content.innerHTML = `
    <div class="page-header">
      <h1>Forecast</h1>
      <button class="btn btn--primary" onclick="refreshForecasts()">🔄 Regenerate</button>
    </div>
    
    ${nextMonthForecasts.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state__icon">📈</div>
        <div class="empty-state__title">No forecasts</div>
        <div class="empty-state__desc">Generate forecasts in Settings</div>
      </div>
    ` : `
      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Brand</th>
              <th>Stock</th>
              <th>Velocity</th>
              <th>Forecast (Next Month)</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${nextMonthForecasts.map(f => {
              const item = itemsById[f.item_id];
              if (!item) return '';
              return `
                <tr>
                  <td>
                    <div style="font-weight:600">${esc(item.name)}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">${esc(item.sku)}</div>
                  </td>
                  <td>${esc(item.brand || '-')}</td>
                  <td>${item.current_stock}</td>
                  <td>${f.daily_velocity.toFixed(1)}/day</td>
                  <td>${f.forecast_qty.toFixed(0)} units</td>
                  <td><span class="badge badge--${f.confidence}">${f.confidence}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

// Render Reorder
async function renderReorder(content) {
  const recs = await getRecommendations();
  const criticalAndReorder = recs.filter(r => r.urgency === 'critical' || r.urgency === 'reorder_now');
  
  // Group by planning group
  const grouped = {};
  criticalAndReorder.forEach(rec => {
    const pg = rec.planning_group || 'Other';
    if (!grouped[pg]) grouped[pg] = [];
    grouped[pg].push(rec);
  });
  
  const groupOrder = [
    '1 MAIN RUNNER',
    '2 China Standard',
    'FYTM  - From You To Me',
    ' New Range',
    '5 IF by Air',
    '9 Local Manufacture',
    'Other'
  ];
  
  const groupIcons = {
    '1 MAIN RUNNER': '⭐',
    '2 China Standard': '📦',
    'FYTM  - From You To Me': '🚢',
    ' New Range': '🆕',
    '5 IF by Air': '✈️',
    '9 Local Manufacture': '🏭',
    'Other': '📌'
  };
  
  content.innerHTML = `
    <div class="page-header">
      <h1>Reorder Recommendations</h1>
      <button class="btn btn--primary" onclick="refreshRecommendations()">🔄 Regenerate</button>
    </div>
    
    ${criticalAndReorder.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state__icon">🛒</div>
        <div class="empty-state__title">No reorders needed</div>
        <div class="empty-state__desc">All items are stocked well</div>
      </div>
    ` : `
      ${groupOrder.map(groupName => {
        const items = grouped[groupName];
        if (!items || items.length === 0) return '';
        
        const critical = items.filter(i => i.urgency === 'critical').length;
        const totalValue = items.reduce((sum, i) => sum + (i.recommended_qty * 0), 0); // No pricing yet
        
        return `
          <div class="card" style="margin-bottom:var(--space-4)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-3);padding-bottom:var(--space-3);border-bottom:1px solid var(--border)">
              <div>
                <div style="font-size:1.125rem;font-weight:600">
                  ${groupIcons[groupName] || '📦'} ${esc(groupName)}
                </div>
                <div style="font-size:0.75rem;color:var(--text-secondary)">${items.length} items</div>
              </div>
              ${critical > 0 ? `<div style="color:var(--critical);font-weight:600">🔴 ${critical} critical</div>` : ''}
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Supplier</th>
                    <th>Stock</th>
                    <th>Velocity</th>
                    <th>Days Left</th>
                    <th>Rec'd Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map(r => `
                    <tr>
                      <td>
                        <div style="font-weight:600">${esc(r.item_name)}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${esc(r.sku)}</div>
                      </td>
                      <td>${esc(r.supplier_name || '-')}</td>
                      <td>${r.current_stock}</td>
                      <td>${r.daily_velocity.toFixed(1)}/day</td>
                      <td style="${r.urgency === 'critical' ? 'color:var(--critical);font-weight:600' : ''}">${r.days_until_stockout} days</td>
                      <td><strong>${r.recommended_qty}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }).join('')}
    `}
  `;
}

// Render Items
async function renderItems(content) {
  const items = await getItems({ active_only: true });
  
  content.innerHTML = `
    <div class="page-header">
      <h1>Items</h1>
      <div>${items.length} active items</div>
    </div>
    
    <div class="card table-wrap">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Brand</th>
            <th>Planning Group</th>
            <th>Stock</th>
            <th>Supplier</th>
          </tr>
        </thead>
        <tbody>
          ${items.slice(0, 500).map(item => `
            <tr>
              <td>${esc(item.sku)}</td>
              <td>${esc(item.name)}</td>
              <td>${esc(item.brand || '-')}</td>
              <td>${esc(item.planning_group || '-')}</td>
              <td>${item.current_stock}</td>
              <td>${esc(item.supplier_name || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// Render Settings
async function renderSettings(content) {
  const stats = await getStats();
  const lastSync = await getLastSync();
  
  content.innerHTML = `
    <div class="page-header">
      <h1>Settings</h1>
    </div>
    
    <div class="card">
      <div class="section-title">🔄 Data Sync</div>
      <div class="info-list" style="margin-bottom:var(--space-4)">
        <div class="info-item">
          <span>Items:</span>
          <strong>${stats.items}</strong>
        </div>
        <div class="info-item">
          <span>Sales Records:</span>
          <strong>${stats.sales}</strong>
        </div>
        <div class="info-item">
          <span>Last Sync:</span>
          <strong>${lastSync ? lastSync.formatted + ` (${lastSync.hoursAgo}h ago)` : 'Never'}</strong>
        </div>
      </div>
      <div id="sync-progress" style="display:none;margin-bottom:var(--space-4)">
        <div class="progress-bar">
          <div class="progress-bar__fill" id="sync-progress-bar"></div>
        </div>
        <div id="sync-status" style="text-align:center;margin-top:var(--space-2);font-size:0.875rem;color:var(--text-secondary)"></div>
      </div>
      <button class="btn btn--primary" onclick="runSync()">Sync from Zoho</button>
    </div>
    
    <div class="card" style="margin-top:var(--space-4)">
      <div class="section-title">📈 Forecasting</div>
      <div class="info-list" style="margin-bottom:var(--space-4)">
        <div class="info-item">
          <span>Forecasts:</span>
          <strong>${stats.forecasts}</strong>
        </div>
        <div class="info-item">
          <span>Recommendations:</span>
          <strong>${stats.recommendations}</strong>
        </div>
      </div>
      <button class="btn btn--primary" onclick="runForecastGeneration()">Generate Forecasts</button>
      <button class="btn btn--primary" onclick="runRecommendationGeneration()" style="margin-left:var(--space-2)">Generate Recommendations</button>
    </div>
  `;
}

// Actions
async function runSync() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Syncing...';
  
  const progressEl = document.getElementById('sync-progress');
  const progressBar = document.getElementById('sync-progress-bar');
  const statusEl = document.getElementById('sync-status');
  
  progressEl.style.display = 'block';
  
  const result = await syncAll((status, percent) => {
    statusEl.textContent = status;
    progressBar.style.width = percent + '%';
  });
  
  if (result.success) {
    toast('Sync complete!', 'success');
    await loadPage('settings');
  } else {
    toast('Sync failed: ' + result.error, 'error');
  }
  
  btn.disabled = false;
  btn.textContent = 'Sync from Zoho';
}

async function runForecastGeneration() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  toast('Generating forecasts...', 'info');
  
  await generateForecasts((status, percent) => {
    console.log(status, percent);
  });
  
  toast('Forecasts generated!', 'success');
  await loadPage('settings');
  
  btn.disabled = false;
  btn.textContent = 'Generate Forecasts';
}

async function runRecommendationGeneration() {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  toast('Generating recommendations...', 'info');
  
  await generateRecommendations((status, percent) => {
    console.log(status, percent);
  });
  
  toast('Recommendations generated!', 'success');
  await loadPage('settings');
  
  btn.disabled = false;
  btn.textContent = 'Generate Recommendations';
}

async function refreshForecasts() {
  toast('Regenerating forecasts...', 'info');
  await runForecastGeneration();
  await loadPage('forecast');
}

async function refreshRecommendations() {
  toast('Regenerating recommendations...', 'info');
  await runRecommendationGeneration();
  await loadPage('reorder');
}

// Helpers
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
