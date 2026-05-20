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
dotenv.config();

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
});

async function mysqlAll(sql: string, params: any[] = []): Promise<any[]> {
  const [rows] = await mysqlPool.execute(sql, params);
  return rows as any[];
}

async function migrate() {
  console.log('\n=== MySQL → PostgreSQL Migration ===\n');

  // Ensure PostgreSQL schema exists
  console.log('Initializing PostgreSQL schema...');
  await initDb();
  console.log('Schema ready.\n');

  // ── 1. days ──────────────────────────────────────────────────────────
  console.log('Migrating: days');
  const days = await mysqlAll('SELECT * FROM days ORDER BY id');
  let count = 0;
  for (const row of days) {
    await pgPool.query(
      `INSERT INTO days (id, date, year, month, day, weekday, weekday_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [row.id, row.date, row.year, row.month, row.day, row.weekday, row.weekday_name],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 2. users ─────────────────────────────────────────────────────────
  console.log('Migrating: users');
  const users = await mysqlAll('SELECT * FROM users ORDER BY id');
  count = 0;
  for (const row of users) {
    await pgPool.query(
      `INSERT INTO users (id, firstname, surname, email, country_code, mobile_number,
        referral_code, password_hash, date_of_birth, reset_token, reset_token_expires, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
      [row.id, row.firstname, row.surname, row.email, row.country_code, row.mobile_number,
       row.referral_code, row.password_hash, row.date_of_birth, row.reset_token,
       row.reset_token_expires, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 3. draws ─────────────────────────────────────────────────────────
  console.log('Migrating: draws');
  const draws = await mysqlAll('SELECT * FROM draws ORDER BY id');
  count = 0;
  for (const row of draws) {
    await pgPool.query(
      `INSERT INTO draws (id, event_number, day_id, source, file_name)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [row.id, row.event_number, row.day_id, row.source, row.file_name],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 4. number_sets ───────────────────────────────────────────────────
  console.log('Migrating: number_sets');
  const numberSets = await mysqlAll('SELECT * FROM number_sets ORDER BY id');
  count = 0;
  for (const row of numberSets) {
    await pgPool.query(
      `INSERT INTO number_sets (id, draw_id, set_type)
       VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [row.id, row.draw_id, row.set_type],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 5. numbers ───────────────────────────────────────────────────────
  console.log('Migrating: numbers');
  const numbers = await mysqlAll('SELECT * FROM numbers ORDER BY id');
  count = 0;
  for (const row of numbers) {
    await pgPool.query(
      `INSERT INTO numbers (id, number_set_id, position, value)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [row.id, row.number_set_id, row.position, row.value],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 6. predictions ───────────────────────────────────────────────────
  console.log('Migrating: predictions');
  const predictions = await mysqlAll('SELECT * FROM predictions ORDER BY id');
  count = 0;
  for (const row of predictions) {
    await pgPool.query(
      `INSERT INTO predictions (id, user_id, predicted_numbers, prediction_date)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [row.id, row.user_id, row.predicted_numbers, row.prediction_date],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 7. push_tokens ───────────────────────────────────────────────────
  console.log('Migrating: push_tokens');
  const pushTokens = await mysqlAll('SELECT * FROM push_tokens ORDER BY id');
  count = 0;
  for (const row of pushTokens) {
    await pgPool.query(
      `INSERT INTO push_tokens (id, user_id, token, platform, created_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [row.id, row.user_id, row.token, row.platform, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 8. courses ───────────────────────────────────────────────────────
  console.log('Migrating: courses');
  const courses = await mysqlAll('SELECT * FROM courses ORDER BY id');
  count = 0;
  for (const row of courses) {
    await pgPool.query(
      `INSERT INTO courses (id, level, level_name, title, slug, description, icon, sort_order, is_published, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [row.id, row.level, row.level_name, row.title, row.slug, row.description,
       row.icon, row.sort_order, row.is_published, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 9. lessons ───────────────────────────────────────────────────────
  console.log('Migrating: lessons');
  const lessons = await mysqlAll('SELECT * FROM lessons ORDER BY id');
  count = 0;
  for (const row of lessons) {
    await pgPool.query(
      `INSERT INTO lessons (id, course_id, title, slug, content, sort_order, is_published, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
      [row.id, row.course_id, row.title, row.slug, row.content,
       row.sort_order, row.is_published, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 10. user_progress ────────────────────────────────────────────────
  console.log('Migrating: user_progress');
  const progress = await mysqlAll('SELECT * FROM user_progress ORDER BY id');
  count = 0;
  for (const row of progress) {
    await pgPool.query(
      `INSERT INTO user_progress (id, user_id, lesson_id, completed_at)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [row.id, row.user_id, row.lesson_id, row.completed_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 11. community_groups ─────────────────────────────────────────────
  console.log('Migrating: community_groups');
  const groups = await mysqlAll('SELECT * FROM community_groups ORDER BY id');
  count = 0;
  for (const row of groups) {
    await pgPool.query(
      `INSERT INTO community_groups (id, name, description, owner_id, is_private, join_code, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
      [row.id, row.name, row.description, row.owner_id,
       row.is_private, row.join_code, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 12. community_group_members ──────────────────────────────────────
  console.log('Migrating: community_group_members');
  const members = await mysqlAll('SELECT * FROM community_group_members ORDER BY id');
  count = 0;
  for (const row of members) {
    await pgPool.query(
      `INSERT INTO community_group_members (id, group_id, user_id, role, joined_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [row.id, row.group_id, row.user_id, row.role || 'member', row.joined_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 13. community_group_posts ────────────────────────────────────────
  console.log('Migrating: community_group_posts');
  const posts = await mysqlAll('SELECT * FROM community_group_posts ORDER BY id');
  count = 0;
  for (const row of posts) {
    await pgPool.query(
      `INSERT INTO community_group_posts (id, group_id, user_id, title, body, post_type, predicted_numbers, created_at, is_pinned, is_locked)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [row.id, row.group_id, row.user_id, row.title, row.body,
       row.post_type, row.predicted_numbers, row.created_at,
       row.is_pinned, row.is_locked],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 14. community_post_comments ──────────────────────────────────────
  console.log('Migrating: community_post_comments');
  const comments = await mysqlAll('SELECT * FROM community_post_comments ORDER BY id');
  count = 0;
  for (const row of comments) {
    await pgPool.query(
      `INSERT INTO community_post_comments (id, post_id, user_id, body, created_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [row.id, row.post_id, row.user_id, row.body, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 15. community_post_likes ─────────────────────────────────────────
  console.log('Migrating: community_post_likes');
  const likes = await mysqlAll('SELECT * FROM community_post_likes ORDER BY id').catch(() => []);
  count = 0;
  for (const row of likes) {
    await pgPool.query(
      `INSERT INTO community_post_likes (id, post_id, user_id, created_at)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [row.id, row.post_id, row.user_id, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

  // ── 16. community_group_bans ─────────────────────────────────────────
  console.log('Migrating: community_group_bans');
  const bans = await mysqlAll('SELECT * FROM community_group_bans ORDER BY id').catch(() => []);
  count = 0;
  for (const row of bans) {
    await pgPool.query(
      `INSERT INTO community_group_bans (id, group_id, user_id, banned_by, reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
      [row.id, row.group_id, row.user_id, row.banned_by, row.reason, row.created_at],
    );
    count++;
  }
  console.log(`  ✓ ${count} rows`);

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
    console.error('\nMigration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await mysqlPool.end();
    await pgPool.end();
  });
