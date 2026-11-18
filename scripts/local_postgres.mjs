import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../.local_postgres_data');

export const localPg = new EmbeddedPostgres({
  port: 5433,
  user: 'lifeos_user',
  password: 'lifeos_secure_password_2026',
  database: 'lifeos_db',
  dataPath: dataDir,
  persistent: true
});

export async function startLocalPostgres() {
  try {
    if (!localPg.initialised) {
      await localPg.initialise();
    }
  } catch (e) {
    // Already initialized
  }
  await localPg.start();
  console.log('✅ Local PostgreSQL server is running at postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startLocalPostgres().then(() => {
    console.log('Local DB ready for tests. Press Ctrl+C to stop.');
  }).catch(console.error);
}
