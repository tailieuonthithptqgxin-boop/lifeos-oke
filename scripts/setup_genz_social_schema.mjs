import pg from 'pg';

async function setup() {
  const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  console.log('Ensuring Gen Z social columns on posts table...');
  await client.query(`
    ALTER TABLE "posts"
    ADD COLUMN IF NOT EXISTS "is_anonymous" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "anonymous_nickname" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "category" VARCHAR(50) DEFAULT 'HOT',
    ADD COLUMN IF NOT EXISTS "is_pinned" BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS "achievement_card" JSONB DEFAULT NULL;
  `);

  console.log('Ensuring user_status_notes table for 24h status notes...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS "user_status_notes" (
      "id" TEXT PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "text" VARCHAR(60) NOT NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "expires_at" TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "idx_user_status_notes_expires" ON "user_status_notes"("expires_at");
    CREATE INDEX IF NOT EXISTS "idx_user_status_notes_user" ON "user_status_notes"("user_id");
  `);

  console.log('✅ Gen Z Social schema setup completed successfully!');
  await client.end();
  process.exit(0);
}

setup().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
