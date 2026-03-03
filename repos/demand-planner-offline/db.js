/**
 * IndexedDB Wrapper for Offline Demand Planner
 * Stores: items, sales_history, forecasts, recommendations, settings
 */

const DB_NAME = 'demand_planner';
const DB_VERSION = 1;

let db = null;

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Items store
      if (!db.objectStoreNames.contains('items')) {
        const itemsStore = db.createObjectStore('items', { keyPath: 'zoho_item_id' });
        itemsStore.createIndex('sku', 'sku', { unique: false });
        itemsStore.createIndex('status', 'status', { unique: false });
        itemsStore.createIndex('planning_group', 'planning_group', { unique: false });
      }

      // Sales history store
      if (!db.objectStoreNames.contains('sales_history')) {
        const salesStore = db.createObjectStore('sales_history', { keyPath: 'id', autoIncrement: true });
        salesStore.createIndex('item_id', 'item_id', { unique: false });
        salesStore.createIndex('invoice_date', 'invoice_date', { unique: false });
      }

      // Forecasts store
      if (!db.objectStoreNames.contains('forecasts')) {
        const forecastStore = db.createObjectStore('forecasts', { keyPath: 'id', autoIncrement: true });
        forecastStore.createIndex('item_id', 'item_id', { unique: false });
        forecastStore.createIndex('forecast_month', 'forecast_month', { unique: false });
      }

      // Recommendations store
      if (!db.objectStoreNames.contains('recommendations')) {
        const recsStore = db.createObjectStore('recommendations', { keyPath: 'id', autoIncrement: true });
        recsStore.createIndex('item_id', 'item_id', { unique: false });
        recsStore.createIndex('urgency', 'urgency', { unique: false });
        recsStore.createIndex('cycle_date', 'cycle_date', { unique: false });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// Items
async function saveItems(items) {
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  
  for (const item of items) {
    await store.put(item);
  }
  
  await tx.complete;
}

async function getItems(filter = {}) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const request = store.getAll();

    request.onsuccess = () => {
      let items = request.result;
      
      // Apply filters
      if (filter.status) {
        items = items.filter(i => i.status === filter.status);
      }
      if (filter.planning_group) {
        items = items.filter(i => i.planning_group === filter.planning_group);
      }
      if (filter.active_only) {
        items = items.filter(i => i.status === 'active' || !i.status);
      }
      
      resolve(items);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function getItem(zoho_item_id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readonly');
    const store = tx.objectStore('items');
    const request = store.get(zoho_item_id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearItems() {
  const tx = db.transaction('items', 'readwrite');
  await tx.objectStore('items').clear();
}

// Sales History
async function saveSales(salesRecords) {
  const tx = db.transaction('sales_history', 'readwrite');
  const store = tx.objectStore('sales_history');
  
  for (const record of salesRecords) {
    await store.put(record);
  }
}

async function getSales(itemId = null) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sales_history', 'readonly');
    const store = tx.objectStore('sales_history');
    
    if (itemId) {
      const index = store.index('item_id');
      const request = index.getAll(itemId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
  });
}

async function clearSales() {
  const tx = db.transaction('sales_history', 'readwrite');
  await tx.objectStore('sales_history').clear();
}

// Forecasts
async function saveForecasts(forecasts) {
  const tx = db.transaction('forecasts', 'readwrite');
  const store = tx.objectStore('forecasts');
  
  for (const forecast of forecasts) {
    await store.put(forecast);
  }
}

async function getForecasts(itemId = null) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('forecasts', 'readonly');
    const store = tx.objectStore('forecasts');
    
    if (itemId) {
      const index = store.index('item_id');
      const request = index.getAll(itemId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
  });
}

async function clearForecasts() {
  const tx = db.transaction('forecasts', 'readwrite');
  await tx.objectStore('forecasts').clear();
}

// Recommendations
async function saveRecommendations(recommendations) {
  const tx = db.transaction('recommendations', 'readwrite');
  const store = tx.objectStore('recommendations');
  
  for (const rec of recommendations) {
    await store.put(rec);
  }
}

async function getRecommendations(filter = {}) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('recommendations', 'readonly');
    const store = tx.objectStore('recommendations');
    const request = store.getAll();

    request.onsuccess = () => {
      let recs = request.result;
      
      // Apply filters
      if (filter.urgency) {
        recs = recs.filter(r => r.urgency === filter.urgency);
      }
      
      resolve(recs);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function clearRecommendations() {
  const tx = db.transaction('recommendations', 'readwrite');
  await tx.objectStore('recommendations').clear();
}

// Settings
async function saveSetting(key, value) {
  const tx = db.transaction('settings', 'readwrite');
  const store = tx.objectStore('settings');
  await store.put({ key, value });
}

async function getSetting(key, defaultValue = null) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? request.result.value : defaultValue);
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function getAllSettings() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const request = store.getAll();

    request.onsuccess = () => {
      const settings = {};
      request.result.forEach(item => {
        settings[item.key] = item.value;
      });
      resolve(settings);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Stats
async function getStats() {
  const items = await getItems({ active_only: true });
  const sales = await getSales();
  const forecasts = await getForecasts();
  const recommendations = await getRecommendations();

  return {
    items: items.length,
    sales: sales.length,
    forecasts: forecasts.length,
    recommendations: recommendations.length,
    lastSync: await getSetting('last_sync_date')
  };
}
