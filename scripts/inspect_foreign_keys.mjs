import pg from 'pg';

const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
await client.connect();

const res = await client.query(`
  SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
  FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('online_classes', 'online_class_participants', 'google_calendar_integrations', 'posts', 'post_comments', 'post_reactions', 'communities', 'community_members', 'conversations', 'direct_messages', 'friendships', 'user_blocks', 'reports', 'user_status_notes', 'user_pets')
`);

console.table(res.rows);
await client.end();
