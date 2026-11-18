import pg from 'pg';

const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
await client.connect();

async function getCols(tableName) {
  const res = await client.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  console.log('=== ' + tableName + ' ===');
  for (const r of res.rows) {
    console.log(`  ${r.column_name}: ${r.data_type} (${r.udt_name}) null=${r.is_nullable} def=${r.column_default}`);
  }
}

await getCols('feature_analytics_summary');
await getCols('user_feature_analytics');
await client.end();
