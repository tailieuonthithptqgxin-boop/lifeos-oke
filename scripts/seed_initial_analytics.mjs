import pg from 'pg';

async function seed() {
  const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
  await client.connect();

  const userRes = await client.query('SELECT id, name, email, "createdAt" FROM "users"');
  console.log(`Found ${userRes.rows.length} users in DB:`, userRes.rows.map(u => `${u.name} (${u.email})`));

  // Update last_active_at on users if null
  for (const u of userRes.rows) {
    await client.query(`
      UPDATE "users" 
      SET "last_active_at" = COALESCE("last_active_at", "createdAt", NOW()),
          "admin_notes" = COALESCE("admin_notes", '')
      WHERE "id" = $1
    `, [u.id]);
  }

  // Create initial user_feature_analytics for these users so analytics has baseline data
  const features = [
    { key: 'dashboard', name: 'Bảng Điều Khiển (Dashboard)', category: 'Tổng quan', baseUses: 45, duration: 1800 },
    { key: 'tasks', name: 'Công Việc & Lịch Trình (Tasks)', category: 'Năng suất', baseUses: 32, duration: 2400 },
    { key: 'finance', name: 'Quản Lý Tài Chính (Finance)', category: 'Tài chính', baseUses: 28, duration: 1500 },
    { key: 'focus', name: 'Tập Trung Pomodoro & Lofi (Focus)', category: 'Năng suất', baseUses: 20, duration: 3600 },
    { key: 'habits', name: 'Theo Dõi Thói Quen (Habits)', category: 'Đời sống', baseUses: 18, duration: 900 },
    { key: 'notes', name: 'Ghi Chú & Kiến Thức (Notes)', category: 'Kiến thức', baseUses: 15, duration: 1200 },
    { key: 'study-space', name: 'Phòng Học Trực Tuyến (Study Space)', category: 'Học tập', baseUses: 14, duration: 4200 },
    { key: 'vocab', name: 'Luyện Từ Vựng Siêu Trí Nhớ (Vocab Master)', category: 'Học tập', baseUses: 12, duration: 1600 },
    { key: 'goals', name: 'Mục Tiêu Cuộc Sống (Goals)', category: 'Chiến lược', baseUses: 8, duration: 800 },
    { key: 'projects', name: 'Quản Lý Dự Án (Projects)', category: 'Công việc', baseUses: 7, duration: 1100 },
    { key: 'referral', name: 'Cổng Cộng Tác Viên (Affiliate)', category: 'Thu nhập', baseUses: 6, duration: 500 }
  ];

  for (const u of userRes.rows) {
    for (const f of features) {
      const uses = Math.floor(Math.random() * f.baseUses) + 1;
      const dur = uses * (Math.floor(Math.random() * 60) + 30);
      const id = `${u.id}_${f.key}`;
      await client.query(`
        INSERT INTO "user_feature_analytics" (
          "id", "user_id", "feature_key", "feature_name", "use_count", "duration_seconds", "first_used_at", "last_used_at", "updated_at"
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '5 days', NOW() - (random() * INTERVAL '2 hours'), NOW())
        ON CONFLICT ("user_id", "feature_key") DO NOTHING
      `, [id, u.id, f.key, f.name, uses, dur]);
    }
  }

  // Recalculate summary in feature_analytics_summary
  console.log('Recalculating feature_analytics_summary...');
  await client.query(`
    INSERT INTO "feature_analytics_summary" (
      "feature_key", "feature_name", "category", "total_unique_users", "total_uses", "total_duration_seconds", "returning_users_count", "last_activity_at", "updated_at"
    )
    SELECT 
      ufa."feature_key",
      ufa."feature_name",
      COALESCE(fas."category", 'Core') as "category",
      COUNT(DISTINCT ufa."user_id") as "total_unique_users",
      SUM(ufa."use_count") as "total_uses",
      SUM(ufa."duration_seconds") as "total_duration_seconds",
      COUNT(DISTINCT CASE WHEN ufa."use_count" >= 2 THEN ufa."user_id" END) as "returning_users_count",
      MAX(ufa."last_used_at") as "last_activity_at",
      NOW() as "updated_at"
    FROM "user_feature_analytics" ufa
    LEFT JOIN "feature_analytics_summary" fas ON fas."feature_key" = ufa."feature_key"
    GROUP BY ufa."feature_key", ufa."feature_name", fas."category"
    ON CONFLICT ("feature_key") DO UPDATE SET
      "total_unique_users" = EXCLUDED."total_unique_users",
      "total_uses" = EXCLUDED."total_uses",
      "total_duration_seconds" = EXCLUDED."total_duration_seconds",
      "returning_users_count" = EXCLUDED."returning_users_count",
      "last_activity_at" = EXCLUDED."last_activity_at",
      "updated_at" = EXCLUDED."updated_at";
  `);

  console.log('Seed completed successfully!');
  await client.end();
}

seed().catch(console.error);
