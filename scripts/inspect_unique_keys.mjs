import pg from 'pg';

const client = new pg.Client('postgresql://lifeos_user:lifeos_secure_password_2026@127.0.0.1:5433/lifeos_db?schema=public');
await client.connect();

const res = await client.query(`
  SELECT
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name
  FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
    AND tc.table_name IN ('online_classes', 'online_class_participants', 'google_calendar_integrations', 'posts', 'post_comments', 'post_reactions', 'communities', 'community_members', 'conversations', 'direct_messages', 'friendships', 'user_blocks', 'reports', 'user_status_notes', 'user_pets')
`);

console.table(res.rows);
await client.end();
