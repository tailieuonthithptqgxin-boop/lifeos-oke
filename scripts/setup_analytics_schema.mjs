import pg from 'pg';

async function setup() {
  const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  // 1. Check referral columns
  const refCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referral_relationships'");
  console.log('referral_relationships columns:', refCols.rows.map(r => r.column_name));

  const refProfCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'referral_profiles'");
  console.log('referral_profiles columns:', refProfCols.rows.map(r => r.column_name));

  // 2. Add columns to users if not present
  console.log('Ensuring columns on users table...');
  await client.query(`
    ALTER TABLE "users" 
    ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS "admin_notes" TEXT DEFAULT '';
  `);

  // 3. Create user_feature_analytics table
  console.log('Creating user_feature_analytics table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS "user_feature_analytics" (
      "id" VARCHAR(64) PRIMARY KEY,
      "user_id" TEXT NOT NULL,
      "feature_key" VARCHAR(64) NOT NULL,
      "feature_name" VARCHAR(128) NOT NULL,
      "use_count" INT NOT NULL DEFAULT 1,
      "duration_seconds" INT NOT NULL DEFAULT 0,
      "first_used_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "last_used_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "uq_user_feature" UNIQUE ("user_id", "feature_key")
    );

    CREATE INDEX IF NOT EXISTS "idx_ufa_user_id" ON "user_feature_analytics"("user_id");
    CREATE INDEX IF NOT EXISTS "idx_ufa_feature_key" ON "user_feature_analytics"("feature_key");
    CREATE INDEX IF NOT EXISTS "idx_ufa_last_used_at" ON "user_feature_analytics"("last_used_at");
  `);

  // 4. Create feature_analytics_summary table
  console.log('Creating feature_analytics_summary table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS "feature_analytics_summary" (
      "feature_key" VARCHAR(64) PRIMARY KEY,
      "feature_name" VARCHAR(128) NOT NULL,
      "category" VARCHAR(64) NOT NULL DEFAULT 'Core',
      "total_unique_users" INT NOT NULL DEFAULT 0,
      "total_uses" INT NOT NULL DEFAULT 0,
      "total_duration_seconds" BIGINT NOT NULL DEFAULT 0,
      "returning_users_count" INT NOT NULL DEFAULT 0,
      "last_activity_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // 5. Seed standard features in summary table if empty
  const countRes = await client.query('SELECT COUNT(*) FROM "feature_analytics_summary"');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    console.log('Seeding standard features in feature_analytics_summary...');
    const standardFeatures = [
      { key: 'dashboard', name: 'Bảng Điều Khiển (Dashboard)', category: 'Tổng quan' },
      { key: 'tasks', name: 'Công Việc & Lịch Trình (Tasks)', category: 'Năng suất' },
      { key: 'finance', name: 'Quản Lý Tài Chính (Finance)', category: 'Tài chính' },
      { key: 'focus', name: 'Tập Trung Pomodoro & Lofi (Focus)', category: 'Năng suất' },
      { key: 'habits', name: 'Theo Dõi Thói Quen (Habits)', category: 'Đời sống' },
      { key: 'notes', name: 'Ghi Chú & Kiến Thức (Notes)', category: 'Kiến thức' },
      { key: 'study-space', name: 'Phòng Học Trực Tuyến (Study Space)', category: 'Học tập' },
      { key: 'classroom', name: 'Lớp Học Online & Meet (Classroom)', category: 'Học tập' },
      { key: 'vocab', name: 'Luyện Từ Vựng Siêu Trí Nhớ (Vocab Master)', category: 'Học tập' },
      { key: 'goals', name: 'Mục Tiêu Cuộc Sống (Goals)', category: 'Chiến lược' },
      { key: 'projects', name: 'Quản Lý Dự Án (Projects)', category: 'Công việc' },
      { key: 'journey', name: 'Hành Trình & Cấp Độ RPG (Journey)', category: 'Game hóa' },
      { key: 'connect', name: 'Không Gian Kết Nối Bạn Bè (Connect)', category: 'Mạng xã hội' },
      { key: 'feed', name: 'Bảng Tin Cộng Đồng (Community Feed)', category: 'Mạng xã hội' },
      { key: 'referral', name: 'Cổng Cộng Tác Viên (Affiliate)', category: 'Thu nhập' },
      { key: 'automation', name: 'Tự Động Hóa Quy Trình (Automation)', category: 'Tiện ích' },
      { key: 'decision', name: 'Động Cơ Ra Quyết Định (Decision)', category: 'Tư duy' },
      { key: 'marketplace', name: 'Kho Ứng Dụng & Gói Mẫu (Marketplace)', category: 'Hệ sinh thái' }
    ];

    for (const f of standardFeatures) {
      await client.query(`
        INSERT INTO "feature_analytics_summary" ("feature_key", "feature_name", "category", "updated_at")
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT ("feature_key") DO UPDATE SET "feature_name" = EXCLUDED."feature_name", "category" = EXCLUDED."category"
      `, [f.key, f.name, f.category]);
    }
  }

  console.log('✅ Database schema setup for Product Analytics completed successfully!');
  await client.end();
}

setup().catch(err => {
  console.error('Schema setup error:', err);
  process.exit(1);
});
