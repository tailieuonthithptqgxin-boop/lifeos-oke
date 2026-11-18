import pg from 'pg';

async function check() {
  const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
  console.log('Columns in users:\n', res.rows.map(r => `  - ${r.column_name} (${r.data_type})`).join('\n'));
  
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('Tables:', tables.rows.map(t => t.table_name));
  await client.end();
}

check().catch(console.error);
