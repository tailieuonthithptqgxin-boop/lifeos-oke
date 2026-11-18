import pg from 'pg';

const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
await client.connect();

const res = await client.query(`
  SELECT column_name, data_type, udt_name, is_nullable, column_default 
  FROM information_schema.columns 
  WHERE table_name = 'users' 
  ORDER BY ordinal_position
`);
console.log('=== users ===');
for (const r of res.rows) {
  console.log('  ' + r.column_name + ': ' + r.data_type + ' (' + r.udt_name + ')');
}
await client.end();
