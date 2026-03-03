const { Pool } = require('pg');

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.SHARED_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const { rows } = await pool.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public'`
    );
    console.log('Existing tables:', rows.map(r => r.table_name));
    return rows;
  } finally {
    await pool.end();
  }
}

checkTables().catch(console.error);