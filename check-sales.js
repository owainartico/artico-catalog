const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://artico_data_user:09LXJeVtcNh0jiAaagJmNsAqRVb7sinT@dpg-d6hra4jh46gs73edgj00-a.oregon-postgres.render.com/artico_data',
});

async function checkSales() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) as total_sales,
        MIN(invoice_date) as earliest,
        MAX(invoice_date) as latest,
        COUNT(DISTINCT item_id) as unique_items
      FROM sales_history
    `);
    
    console.log('Sales History Status:');
    console.log('=====================');
    console.log('Total records:', rows[0].total_sales);
    console.log('Date range:', rows[0].earliest, '→', rows[0].latest);
    console.log('Unique items:', rows[0].unique_items);
    
    // Check recent sync log
    const { rows: syncLog } = await pool.query(`
      SELECT operation, status, records_processed, error_message, started_at, completed_at
      FROM sync_log
      WHERE operation LIKE '%sales%'
      ORDER BY started_at DESC
      LIMIT 5
    `);
    
    console.log('\nRecent Sales Syncs:');
    console.log('===================');
    syncLog.forEach(log => {
      console.log(`${log.started_at.toISOString()}: ${log.operation} - ${log.status} (${log.records_processed || 0} records)`);
      if (log.error_message) console.log(`  Error: ${log.error_message}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSales();
