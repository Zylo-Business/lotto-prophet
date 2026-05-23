/**
 * One-time migration script: MySQL → PostgreSQL
 *
 * Reads all data from the local MySQL `lotto` database and inserts it
 * into the Neon PostgreSQL database defined by DATABASE_URL.
 *
 * Usage:
 *   tsx utils/migrate-mysql-to-postgres.ts
 *
 * Safe to re-run — uses ON CONFLICT DO NOTHING for all inserts.
 * After a clean run, all PostgreSQL sequences are reset to MAX(id).
 */

import dotenv from 'dotenv';
dotenv.config({ override: true });

import mysql from 'mysql2/promise';
import pkg from 'pg';
import { initDb } from '../db/db.js';

const { Pool } = pkg;

const mysqlPool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'lotto',
  waitForConnections: true,
  connectionLimit: 5,
});

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

async function mysqlAll(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await mysqlPool.execute(sql, params);
  return rows as any[];
}

let pgClient: pkg.PoolClient = null!;

// Insert rows in chunks to avoid overwhelming Neon's connection
async function batchInsert(
  table: string,
  rows: any[],
  columns: string[],
  valuesFn: (row: any) => any[],
  chunkSize = 200,
) {
  if (rows.length === 0) { console.log('  ✓ 0 rows'); return; }
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const placeholders: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    for (const row of chunk) {
      const rowValues = valuesFn(row);
      placeholders.push(`(${rowValues.map(() => `$${paramIdx++}`).join(',')})`);
      values.push(...rowValues);
    }

    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders.join(',')} ON CONFLICT DO NOTHING`;
    await pgClient.query(sql, values);
    inserted += chunk.length;
    process.stdout.write(`\r  ${inserted}/${rows.length}`);
  }
  console.log(`  ✓ ${inserted} rows`);
}

async function migrate() {
  console.log('\n=== MySQL → PostgreSQL Migration ===\n');

  console.log('Initializing PostgreSQL schema...');
  await initDb();
  console.log('Schema ready.\n');

  // Acquire a single dedicated connection so session settings persist
  pgClient = await pgPool.connect();

  // Drop FK constraints to allow inserting in any order
  console.log('Dropping FK constraints...');
  await pgClient.query(`ALTER TABLE draws DROP CONSTRAINT IF EXISTS draws_day_id_fkey`);
  await pgClient.query(`ALTER TABLE number_sets DROP CONSTRAINT IF EXISTS number_sets_draw_id_fkey`);
  await pgClient.query(`ALTER TABLE numbers DROP CONSTRAINT IF EXISTS numbers_number_set_id_fkey`);
  await pgClient.query(`ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_user_id_fkey`);
  await pgClient.query(`ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_fkey`);
  await pgClient.query(`ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_course_id_fkey`);
  await pgClient.query(`ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey`);
  await pgClient.query(`ALTER TABLE user_progress DROP CONSTRAINT IF EXISTS user_progress_lesson_id_fkey`);
  await pgClient.query(`ALTER TABLE community_groups DROP CONSTRAINT IF EXISTS community_groups_owner_id_fkey`);
  await pgClient.query(`ALTER TABLE community_group_members DROP CONSTRAINT IF EXISTS community_group_members_group_id_fkey`);
  await pgClient.query(`ALTER TABLE community_group_members DROP CONSTRAINT IF EXISTS community_group_members_user_id_fkey`);
  await pgClient.query(`ALTER TABLE community_group_posts DROP CONSTRAINT IF EXISTS community_group_posts_group_id_fkey`);
  await pgClient.query(`ALTER TABLE community_group_posts DROP CONSTRAINT IF EXISTS community_group_posts_user_id_fkey`);
  await pgClient.query(`ALTER TABLE community_post_comments DROP CONSTRAINT IF EXISTS community_post_comments_post_id_fkey`);
  await pgClient.query(`ALTER TABLE community_post_comments DROP CONSTRAINT IF EXISTS community_post_comments_user_id_fkey`);
  await pgClient.query(`ALTER TABLE community_post_likes DROP CONSTRAINT IF EXISTS community_post_likes_post_id_fkey`);
  await pgClient.query(`ALTER TABLE community_post_likes DROP CONSTRAINT IF EXISTS community_post_likes_user_id_fkey`);
  await pgClient.query(`ALTER TABLE community_group_bans DROP CONSTRAINT IF EXISTS community_group_bans_group_id_fkey`);
  await pgClient.query(`ALTER TABLE community_group_bans DROP CONSTRAINT IF EXISTS community_group_bans_user_id_fkey`);
  console.log('FK constraints dropped.\n');

  // ── 1. days ──────────────────────────────────────────────────────────
  console.log('Migrating: days');
  const days = await mysqlAll('SELECT * FROM days ORDER BY id');
  await batchInsert('days', days,
    ['id', 'date', 'year', 'month', 'day', 'weekday', 'weekday_name'],
    (r) => [r.id, r.date, r.year, r.month, r.day, r.weekday, r.weekday_name],
  );

  // ── 2. users ─────────────────────────────────────────────────────────
  console.log('Migrating: users');
  const users = await mysqlAll('SELECT * FROM users ORDER BY id');
  await batchInsert('users', users,
    ['id', 'firstname', 'surname', 'email', 'country_code', 'mobile_number',
     'referral_code', 'password_hash', 'date_of_birth', 'reset_token', 'reset_token_expires', 'created_at'],
    (r) => [r.id, r.firstname, r.surname, r.email, r.country_code, r.mobile_number,
            r.referral_code, r.password_hash, r.date_of_birth, r.reset_token,
            r.reset_token_expires, r.created_at],
  );

  // ── 3. draws ─────────────────────────────────────────────────────────
  console.log('Migrating: draws');
  const draws = await mysqlAll('SELECT * FROM draws ORDER BY id');
  await batchInsert('draws', draws,
    ['id', 'event_number', 'day_id', 'source', 'file_name'],
    (r) => [r.id, r.event_number, r.day_id, r.source, r.file_name],
  );

  // ── 4. number_sets ───────────────────────────────────────────────────
  console.log('Migrating: number_sets');
  const numberSets = await mysqlAll('SELECT * FROM number_sets ORDER BY id');
  await batchInsert('number_sets', numberSets,
    ['id', 'draw_id', 'set_type'],
    (r) => [r.id, r.draw_id, r.set_type],
  );

  // ── 5. numbers ───────────────────────────────────────────────────────
  console.log('Migrating: numbers');
  const numbers = await mysqlAll('SELECT * FROM numbers ORDER BY id');
  await batchInsert('numbers', numbers,
    ['id', 'number_set_id', 'position', 'value'],
    (r) => [r.id, r.number_set_id, r.position, r.value],
    100, // smaller chunk — numbers table is very large
  );

  // ── 6. predictions ───────────────────────────────────────────────────
  console.log('Migrating: predictions');
  const predictions = await mysqlAll('SELECT * FROM predictions ORDER BY id');
  await batchInsert('predictions', predictions,
    ['id', 'user_id', 'predicted_numbers', 'prediction_date'],
    (r) => [r.id, r.user_id, r.predicted_numbers, r.prediction_date],
  );

  // ── 7. push_tokens ───────────────────────────────────────────────────
  console.log('Migrating: push_tokens');
  const pushTokens = await mysqlAll('SELECT * FROM push_tokens ORDER BY id');
  await batchInsert('push_tokens', pushTokens,
    ['id', 'user_id', 'token', 'platform', 'created_at'],
    (r) => [r.id, r.user_id, r.token, r.platform, r.created_at],
  );

  // ── 8. courses ───────────────────────────────────────────────────────
  console.log('Migrating: courses');
  const courses = await mysqlAll('SELECT * FROM courses ORDER BY id');
  await batchInsert('courses', courses,
    ['id', 'level', 'level_name', 'title', 'slug', 'description', 'icon', 'sort_order', 'is_published', 'created_at'],
    (r) => [r.id, r.level, r.level_name, r.title, r.slug, r.description,
            r.icon, r.sort_order, r.is_published, r.created_at],
  );

  // ── 9. lessons ───────────────────────────────────────────────────────
  console.log('Migrating: lessons');
  const lessons = await mysqlAll('SELECT * FROM lessons ORDER BY id');
  await batchInsert('lessons', lessons,
    ['id', 'course_id', 'title', 'slug', 'content', 'sort_order', 'is_published', 'created_at'],
    (r) => [r.id, r.course_id, r.title, r.slug, r.content,
            r.sort_order, r.is_published, r.created_at],
  );

  // ── 10. user_progress ────────────────────────────────────────────────
  console.log('Migrating: user_progress');
  const progress = await mysqlAll('SELECT * FROM user_progress ORDER BY id');
  await batchInsert('user_progress', progress,
    ['id', 'user_id', 'lesson_id', 'completed_at'],
    (r) => [r.id, r.user_id, r.lesson_id, r.completed_at],
  );

  // ── 11. community_groups ─────────────────────────────────────────────
  console.log('Migrating: community_groups');
  const groups = await mysqlAll('SELECT * FROM community_groups ORDER BY id');
  await batchInsert('community_groups', groups,
    ['id', 'name', 'description', 'owner_id', 'is_private', 'join_code', 'created_at'],
    (r) => [r.id, r.name, r.description, r.owner_id, r.is_private, r.join_code, r.created_at],
  );

  // ── 12. community_group_members ──────────────────────────────────────
  console.log('Migrating: community_group_members');
  const members = await mysqlAll('SELECT * FROM community_group_members ORDER BY id');
  await batchInsert('community_group_members', members,
    ['id', 'group_id', 'user_id', 'role', 'joined_at'],
    (r) => [r.id, r.group_id, r.user_id, r.role || 'member', r.joined_at],
  );

  // ── 13. community_group_posts ────────────────────────────────────────
  console.log('Migrating: community_group_posts');
  const posts = await mysqlAll('SELECT * FROM community_group_posts ORDER BY id');
  await batchInsert('community_group_posts', posts,
    ['id', 'group_id', 'user_id', 'title', 'body', 'post_type', 'predicted_numbers', 'created_at', 'is_pinned', 'is_locked'],
    (r) => [r.id, r.group_id, r.user_id, r.title, r.body,
            r.post_type, r.predicted_numbers, r.created_at, r.is_pinned, r.is_locked],
  );

  // ── 14. community_post_comments ──────────────────────────────────────
  console.log('Migrating: community_post_comments');
  const comments = await mysqlAll('SELECT * FROM community_post_comments ORDER BY id');
  await batchInsert('community_post_comments', comments,
    ['id', 'post_id', 'user_id', 'body', 'created_at'],
    (r) => [r.id, r.post_id, r.user_id, r.body, r.created_at],
  );

  // ── 15. community_post_likes ─────────────────────────────────────────
  console.log('Migrating: community_post_likes');
  const likes = await mysqlAll('SELECT * FROM community_post_likes ORDER BY id').catch(() => []);
  await batchInsert('community_post_likes', likes,
    ['id', 'post_id', 'user_id', 'created_at'],
    (r) => [r.id, r.post_id, r.user_id, r.created_at],
  );

  // ── 16. community_group_bans ─────────────────────────────────────────
  console.log('Migrating: community_group_bans');
  const bans = await mysqlAll('SELECT * FROM community_group_bans ORDER BY id').catch(() => []);
  await batchInsert('community_group_bans', bans,
    ['id', 'group_id', 'user_id', 'banned_by', 'reason', 'created_at'],
    (r) => [r.id, r.group_id, r.user_id, r.banned_by, r.reason, r.created_at],
  );

  // Remove orphaned draws (day_id not in days) and their dependent rows
  console.log('Cleaning up orphaned draws...');
  const orphaned = await pgClient.query(
    `SELECT COUNT(*) FROM draws WHERE day_id NOT IN (SELECT id FROM days)`
  );
  const orphanCount = parseInt(orphaned.rows[0].count, 10);
  if (orphanCount > 0) {
    console.log(`  Removing ${orphanCount} orphaned draws and their number_sets/numbers...`);
    await pgClient.query(`
      DELETE FROM numbers WHERE number_set_id IN (
        SELECT ns.id FROM number_sets ns
        JOIN draws d ON ns.draw_id = d.id
        WHERE d.day_id NOT IN (SELECT id FROM days)
      )
    `);
    await pgClient.query(`
      DELETE FROM number_sets WHERE draw_id IN (
        SELECT id FROM draws WHERE day_id NOT IN (SELECT id FROM days)
      )
    `);
    await pgClient.query(`DELETE FROM draws WHERE day_id NOT IN (SELECT id FROM days)`);
  }
  console.log('Orphan cleanup done.\n');

  // Restore FK constraints
  console.log('Restoring FK constraints...');
  await pgClient.query(`ALTER TABLE draws ADD CONSTRAINT draws_day_id_fkey FOREIGN KEY (day_id) REFERENCES days(id)`);
  await pgClient.query(`ALTER TABLE number_sets ADD CONSTRAINT number_sets_draw_id_fkey FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE`);
  await pgClient.query(`ALTER TABLE numbers ADD CONSTRAINT numbers_number_set_id_fkey FOREIGN KEY (number_set_id) REFERENCES number_sets(id) ON DELETE CASCADE`);
  await pgClient.query(`ALTER TABLE predictions ADD CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)`);
  await pgClient.query(`ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`);
  await pgClient.query(`ALTER TABLE lessons ADD CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE`);
  await pgClient.query(`ALTER TABLE user_progress ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)`);
  await pgClient.query(`ALTER TABLE user_progress ADD CONSTRAINT user_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES lessons(id)`);
  await pgClient.query(`ALTER TABLE community_groups ADD CONSTRAINT community_groups_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id)`);
  await pgClient.query(`ALTER TABLE community_group_members ADD CONSTRAINT community_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES community_groups(id)`);
  await pgClient.query(`ALTER TABLE community_group_members ADD CONSTRAINT community_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)`);
  await pgClient.query(`ALTER TABLE community_group_posts ADD CONSTRAINT community_group_posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES community_groups(id)`);
  await pgClient.query(`ALTER TABLE community_group_posts ADD CONSTRAINT community_group_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)`);
  await pgClient.query(`ALTER TABLE community_post_comments ADD CONSTRAINT community_post_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_group_posts(id)`);
  await pgClient.query(`ALTER TABLE community_post_comments ADD CONSTRAINT community_post_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)`);
  await pgClient.query(`ALTER TABLE community_post_likes ADD CONSTRAINT community_post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES community_group_posts(id)`);
  await pgClient.query(`ALTER TABLE community_post_likes ADD CONSTRAINT community_post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)`);
  await pgClient.query(`ALTER TABLE community_group_bans ADD CONSTRAINT community_group_bans_group_id_fkey FOREIGN KEY (group_id) REFERENCES community_groups(id)`);
  await pgClient.query(`ALTER TABLE community_group_bans ADD CONSTRAINT community_group_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id)`);
  console.log('FK constraints restored.\n');

  // ── Reset all sequences ───────────────────────────────────────────────
  console.log('\nResetting PostgreSQL sequences...');
  const tables = [
    'days', 'users', 'draws', 'number_sets', 'numbers', 'predictions',
    'push_tokens', 'courses', 'lessons', 'user_progress',
    'community_groups', 'community_group_members', 'community_group_posts',
    'community_post_comments', 'community_post_likes', 'community_group_bans',
  ];
  for (const table of tables) {
    await pgPool.query(
      `SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)`,
    ).catch(() => {});
  }
  console.log('Sequences reset.\n');

  console.log('=== Migration complete! ===\n');
}

migrate()
  .catch((err) => {
    console.error('\nMigration failed:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    if (pgClient) pgClient.release();
    await mysqlPool.end();
    await pgPool.end();
  });
