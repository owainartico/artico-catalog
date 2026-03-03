const { Pool } = require('pg');

async function checkConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SHARED_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('Successfully connected to database');
    
    // Basic table verification
    const { rows } = await client.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'`
    );
    console.log('Existing tables:', rows.map(r => r.table_name));
    
    await client.release();
    return rows;
  } catch (err) {
    console.error('Connection failed:', err.message);
    return false;
  } finally {
    await pool.end();
  }
}

checkConnection().catch(console.error);