/**
 * Forecast Engine - Client-Side
 * Calculates sales velocity, seasonality, and reorder recommendations
 */

// Planning group lead times and buffers
const PLANNING_GROUP_PARAMS = {
  '1 MAIN RUNNER': { leadTime: 90, buffer: 90 },
  '2 China Standard': { leadTime: 90, buffer: 60 },
  'FYTM  - From You To Me': { leadTime: 120, buffer: 60 },
  ' New Range': { leadTime: 90, buffer: 60 },
  '5 IF by Air': { leadTime: 60, buffer: 30 },
  '9 Local Manufacture': { leadTime: 14, buffer: 30 },
  '9C Consumables Manufacturing': { leadTime: 14, buffer: 30 },
  '9D Consumables Pick Packing': { leadTime: 14, buffer: 30 }
};

// Generate forecasts for all items
async function generateForecasts(onProgress) {
  onProgress?.('Loading items...', 0);
  const items = await getItems({ active_only: true });
  
  onProgress?.('Loading sales history...', 5);
  const allSales = await getSales();
  
  // Group sales by item
  const salesByItem = {};
  for (const sale of allSales) {
    if (!salesByItem[sale.item_id]) salesByItem[sale.item_id] = [];
    salesByItem[sale.item_id].push(sale);
  }
  
  const forecasts = [];
  let processed = 0;
  
  onProgress?.('Generating forecasts...', 10);
  await clearForecasts();
  
  for (const item of items) {
    const itemSales = salesByItem[item.zoho_item_id] || [];
    const forecast = await generateItemForecast(item, itemSales);
    
    if (forecast) {
      forecasts.push(...forecast);
    }
    
    processed++;
    if (processed % 50 === 0) {
      onProgress?.(`Processing items... ${processed}/${items.length}`, 10 + (processed / items.length * 80));
    }
  }
  
  onProgress?.('Saving forecasts...', 90);
  await saveForecasts(forecasts);
  
  onProgress?.(`Forecasts generated: ${forecasts.length}`, 100);
  return forecasts.length;
}

// Generate forecast for a single item
async function generateItemForecast(item, salesRecords) {
  if (!salesRecords || salesRecords.length === 0) {
    return null; // No sales = no forecast
  }
  
  // Calculate total sales and date range
  const totalSales = salesRecords.reduce((sum, r) => sum + r.quantity, 0);
  const sortedSales = salesRecords.sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date));
  
  const firstDate = new Date(sortedSales[0].invoice_date);
  const lastDate = new Date(sortedSales[sortedSales.length - 1].invoice_date);
  const daysCovered = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
  const monthsCovered = daysCovered / 30.4375;
  
  // Need at least 3 months of data
  if (monthsCovered < 3) {
    return null;
  }
  
  // Calculate monthly distribution (seasonality pattern)
  const monthlyTotals = Array(12).fill(0);
  for (const record of salesRecords) {
    const month = new Date(record.invoice_date).getMonth(); // 0-11
    monthlyTotals[month] += record.quantity;
  }
  
  // Convert to percentages
  const monthlyPattern = monthlyTotals.map(total => total / totalSales);
  
  // Check if pattern is seasonal (variation > 2% from average)
  const avgPct = 1 / 12;
  const isSeasonal = monthlyPattern.some(pct => Math.abs(pct - avgPct) > 0.02);
  
  // Calculate annual velocity
  const yearsOfHistory = monthsCovered / 12;
  const annualVelocity = totalSales / yearsOfHistory;
  
  // Calculate coefficient of variation for quality
  const monthlyActuals = {};
  for (const record of salesRecords) {
    const monthKey = new Date(record.invoice_date).toISOString().slice(0, 7); // YYYY-MM
    monthlyActuals[monthKey] = (monthlyActuals[monthKey] || 0) + record.quantity;
  }
  
  const monthlyValues = Object.values(monthlyActuals);
  const monthlyAvg = totalSales / monthsCovered;
  const variance = monthlyValues.reduce((sum, val) => sum + Math.pow(val - monthlyAvg, 2), 0) / monthlyValues.length;
  const coefficientOfVariation = monthlyAvg > 0 ? Math.sqrt(variance) / monthlyAvg : 0;
  
  // Determine forecast quality
  let quality;
  if (monthsCovered >= 12 && coefficientOfVariation < 0.5) {
    quality = 'good';
  } else if (monthsCovered >= 6 && coefficientOfVariation < 1.0) {
    quality = 'fair';
  } else if (monthsCovered >= 3) {
    quality = 'poor';
  } else {
    quality = 'insufficient_data';
  }
  
  // Generate monthly forecasts for next 6 months
  const forecasts = [];
  const now = new Date();
  
  for (let i = 0; i < 6; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const monthIdx = forecastDate.getMonth();
    
    const monthlyQty = annualVelocity * monthlyPattern[monthIdx];
    const dailyVelocity = monthlyQty / 30.4375;
    
    forecasts.push({
      item_id: item.zoho_item_id,
      forecast_month: forecastDate.toISOString().split('T')[0],
      forecast_qty: Math.round(monthlyQty * 100) / 100,
      daily_velocity: Math.round(dailyVelocity * 100) / 100,
      confidence: quality === 'good' ? 'high' : quality === 'fair' ? 'medium' : 'low',
      is_seasonal: isSeasonal,
      monthly_pattern: monthlyPattern
    });
  }
  
  return forecasts;
}

// Generate reorder recommendations
async function generateRecommendations(onProgress) {
  onProgress?.('Loading items...', 0);
  const items = await getItems({ active_only: true });
  
  onProgress?.('Loading forecasts...', 10);
  const allForecasts = await getForecasts();
  
  // Group forecasts by item (next month only)
  const forecastsByItem = {};
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthKey = nextMonth.toISOString().slice(0, 7);
  
  for (const forecast of allForecasts) {
    const forecastMonth = forecast.forecast_month.slice(0, 7);
    if (forecastMonth === nextMonthKey) {
      forecastsByItem[forecast.item_id] = forecast;
    }
  }
  
  const recommendations = [];
  let processed = 0;
  
  onProgress?.('Calculating recommendations...', 20);
  await clearRecommendations();
  
  for (const item of items) {
    const forecast = forecastsByItem[item.zoho_item_id];
    if (!forecast || !forecast.daily_velocity || forecast.daily_velocity <= 0) {
      continue; // No velocity = no recommendation
    }
    
    const params = PLANNING_GROUP_PARAMS[item.planning_group] || { leadTime: 90, buffer: 60 };
    const dailyVelocity = forecast.daily_velocity;
    const currentStock = item.current_stock || 0;
    const totalThreshold = params.leadTime + params.buffer;
    
    // Calculate days until stockout
    const daysUntilStockout = currentStock / dailyVelocity;
    
    // Determine urgency
    let urgency;
    if (daysUntilStockout < params.leadTime) {
      urgency = 'critical';
    } else if (daysUntilStockout < totalThreshold) {
      urgency = 'reorder_now';
    } else if (daysUntilStockout < totalThreshold + 30) {
      urgency = 'upcoming';
    } else {
      urgency = 'healthy';
    }
    
    // Calculate recommended quantity
    const targetStock = dailyVelocity * totalThreshold;
    const recommendedQty = Math.max(0, Math.round(targetStock - currentStock));
    
    // Calculate stockout date
    const stockoutDate = new Date();
    stockoutDate.setDate(stockoutDate.getDate() + Math.floor(daysUntilStockout));
    
    recommendations.push({
      item_id: item.zoho_item_id,
      item_name: item.name,
      sku: item.sku,
      planning_group: item.planning_group,
      supplier_name: item.supplier_name,
      urgency,
      current_stock: currentStock,
      daily_velocity: dailyVelocity,
      days_until_stockout: Math.floor(daysUntilStockout),
      stockout_date: stockoutDate.toISOString().split('T')[0],
      recommended_qty: recommendedQty,
      lead_time: params.leadTime,
      buffer: params.buffer,
      cycle_date: new Date().toISOString().split('T')[0]
    });
    
    processed++;
    if (processed % 50 === 0) {
      onProgress?.(`Processing... ${processed}/${items.length}`, 20 + (processed / items.length * 70));
    }
  }
  
  onProgress?.('Saving recommendations...', 90);
  await saveRecommendations(recommendations);
  
  onProgress?.(`Recommendations generated: ${recommendations.length}`, 100);
  return recommendations.length;
}
