import pg from 'pg';

async function testNotes() {
  const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
  await client.connect();

  const notes = await client.query('SELECT * FROM user_status_notes');
  console.log('User status notes count:', notes.rows.length);

  await client.end();
  process.exit(0);
}

testNotes().catch(e => {
  console.error(e);
  process.exit(1);
});
