import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const { Pool, types } = pkg;

// Return COUNT(*) as number instead of string
types.setTypeParser(20, (val: string) => parseInt(val, 10));

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function toPositional(sql: string): string {
  let i = 0;
  let result = '';
  let j = 0;
  while (j < sql.length) {
    const ch = sql[j];
    if (ch === "'") {
      // Copy the entire single-quoted string literal without touching its contents
      result += ch;
      j++;
      while (j < sql.length) {
        const c = sql[j];
        result += c;
        j++;
        if (c === "'") {
          if (sql[j] === "'") {
            // Escaped quote '' — stay inside the literal
            result += sql[j];
            j++;
          } else {
            break; // End of string literal
          }
        }
      }
    } else if (ch === '?') {
      result += `$${++i}`;
      j++;
    } else {
      result += ch;
      j++;
    }
  }
  return result;
}

export const dbRun = async (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  const trimmed = sql.trim();
  const isInsert = /^INSERT/i.test(trimmed);
  const pgSql = toPositional(isInsert ? `${trimmed} RETURNING id` : trimmed);
  const result = await pool.query(pgSql, params);
  return {
    lastID: isInsert ? (result.rows[0]?.id ?? 0) : 0,
    changes: result.rowCount ?? 0,
  };
};

export const dbAll = async (sql: string, params: any[] = []): Promise<any[]> => {
  const result = await pool.query(toPositional(sql), params);
  return result.rows;
};

export const dbGet = async (sql: string, params: any[] = []): Promise<any> => {
  const result = await pool.query(toPositional(sql), params);
  return result.rows[0] || null;
};

export const initDb = async () => {
  // days table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS days (
      id SERIAL PRIMARY KEY,
      date VARCHAR(10) NOT NULL UNIQUE,
      year INT NOT NULL,
      month INT NOT NULL,
      day INT NOT NULL,
      weekday INT NOT NULL,
      weekday_name VARCHAR(20) NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_days_date ON days(date)`);

  // draws table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS draws (
      id SERIAL PRIMARY KEY,
      event_number INT NOT NULL,
      day_id INT NOT NULL REFERENCES days(id),
      source VARCHAR(50) NOT NULL DEFAULT 'alpha',
      file_name VARCHAR(255) NOT NULL DEFAULT ''
    )
  `);
  await pool.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'alpha'`);
  await pool.query(`ALTER TABLE draws ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NOT NULL DEFAULT ''`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_draws_source ON draws(source)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_draws_day ON draws(day_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_draws_file_name ON draws(file_name)`);

  // number_sets table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS number_sets (
      id SERIAL PRIMARY KEY,
      draw_id INT NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
      set_type VARCHAR(1) NOT NULL CHECK (set_type IN ('N', 'M'))
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_number_sets_draw ON number_sets(draw_id)`);

  // numbers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS numbers (
      id SERIAL PRIMARY KEY,
      number_set_id INT NOT NULL REFERENCES number_sets(id) ON DELETE CASCADE,
      position INT NOT NULL,
      value INT NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_numbers_value ON numbers(value)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_numbers_set ON numbers(number_set_id)`);

  // users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      firstname VARCHAR(100) NOT NULL,
      surname VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      country_code VARCHAR(10) NOT NULL,
      mobile_number VARCHAR(20) NOT NULL,
      referral_code VARCHAR(50) DEFAULT NULL,
      password_hash VARCHAR(255) NOT NULL,
      date_of_birth DATE NOT NULL,
      reset_token VARCHAR(255) DEFAULT NULL,
      reset_token_expires TIMESTAMP DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (country_code, mobile_number)
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL`);

  // predictions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      predicted_numbers TEXT NOT NULL,
      prediction_date DATE DEFAULT CURRENT_DATE
    )
  `);

  // push_tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL UNIQUE,
      platform VARCHAR(20) DEFAULT 'unknown',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // courses table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      level INT NOT NULL,
      level_name VARCHAR(100) NOT NULL,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      description TEXT DEFAULT NULL,
      icon VARCHAR(50) DEFAULT '📚',
      sort_order INT DEFAULT 0,
      is_published SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug)`);

  // lessons table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lessons (
      id SERIAL PRIMARY KEY,
      course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      content TEXT DEFAULT NULL,
      sort_order INT DEFAULT 0,
      is_published SMALLINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (course_id, slug)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id)`);

  // user_progress table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_progress (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, lesson_id)
    )
  `);

  // community_groups table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_private SMALLINT NOT NULL DEFAULT 0,
      join_code VARCHAR(100) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_groups_owner ON community_groups(owner_id)`);

  // community_group_members table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_group_members (
      id SERIAL PRIMARY KEY,
      group_id INT NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (group_id, user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_group_members_group ON community_group_members(group_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_group_members_user ON community_group_members(user_id)`);

  // community_group_posts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_group_posts (
      id SERIAL PRIMARY KEY,
      group_id INT NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      post_type VARCHAR(20) NOT NULL DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'forecast')),
      predicted_numbers VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_pinned SMALLINT NOT NULL DEFAULT 0,
      is_locked SMALLINT NOT NULL DEFAULT 0
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_group_posts_group ON community_group_posts(group_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_group_posts_user ON community_group_posts(user_id)`);
  await pool.query(`ALTER TABLE community_group_posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL`);

  // community_post_images table (supports up to 5 images per post)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_post_images (
      id SERIAL PRIMARY KEY,
      post_id INT NOT NULL REFERENCES community_group_posts(id) ON DELETE CASCADE,
      image_url VARCHAR(500) NOT NULL,
      sort_order INT DEFAULT 0
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_post_images_post ON community_post_images(post_id)`);

  // community_post_comments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_post_comments (
      id SERIAL PRIMARY KEY,
      post_id INT NOT NULL REFERENCES community_group_posts(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_post_comments_post ON community_post_comments(post_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_post_comments_user ON community_post_comments(user_id)`);

  // community_group_bans table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_group_bans (
      id SERIAL PRIMARY KEY,
      group_id INT NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      banned_by INT REFERENCES users(id) ON DELETE SET NULL,
      reason VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_group_bans_group ON community_group_bans(group_id)`);

  // community_post_likes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS community_post_likes (
      id SERIAL PRIMARY KEY,
      post_id INT NOT NULL REFERENCES community_group_posts(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (post_id, user_id)
    )
  `).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_post_likes_post ON community_post_likes(post_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_community_post_likes_user ON community_post_likes(user_id)`);

  // Flat view for easy reads — drop first so column renames always apply
  await pool.query(`DROP VIEW IF EXISTS v_draws_flat CASCADE`);
  await pool.query(`
    CREATE VIEW v_draws_flat AS
    SELECT
      d.event_number,
      dy.date,
      d.source,
      d.file_name,
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 1 THEN n.value END) AS "N1",
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 2 THEN n.value END) AS "N2",
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 3 THEN n.value END) AS "N3",
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 4 THEN n.value END) AS "N4",
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 5 THEN n.value END) AS "N5",
      SUM(CASE WHEN s.set_type = 'N' THEN n.value ELSE 0 END) AS n_sum,
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 1 THEN n.value END) AS "M1",
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 2 THEN n.value END) AS "M2",
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 3 THEN n.value END) AS "M3",
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 4 THEN n.value END) AS "M4",
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 5 THEN n.value END) AS "M5",
      SUM(CASE WHEN s.set_type = 'M' THEN n.value ELSE 0 END) AS m_sum
    FROM draws d
    JOIN days dy ON d.day_id = dy.id
    JOIN number_sets s ON s.draw_id = d.id
    JOIN numbers n ON n.number_set_id = s.id
    GROUP BY d.id, d.event_number, dy.date, d.source, d.file_name
    ORDER BY d.event_number
  `);

  // refresh_tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)`);

  // Seed default courses if empty
  const courseCount = await pool.query('SELECT COUNT(*) as count FROM courses');
  if (Number(courseCount.rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO courses (level, level_name, title, slug, description, icon, sort_order, is_published) VALUES
      (1, 'Foundation',         'Foundation',            'foundation',    'Master the fundamentals of lottery analysis. Learn probability basics, number patterns, and how to read draw data effectively.', '🎓', 1, 1),
      (2, 'Lapping',            'Lapping',               'lapping',       'Advanced pattern recognition and lapping techniques. Discover recurring sequences and learn systematic tracking methods.', '🔄', 2, 1),
      (3, 'Game Theory with AI','Game Theory with AI',   'game-theory-ai','Apply game theory principles combined with artificial intelligence to analyze draws and build predictive models.', '🤖', 3, 1)
    `);
  }

  // Seed lessons for Lapping course if none exist
  const lappingCourse = await dbGet('SELECT id FROM courses WHERE slug = ?', ['lapping']);
  if (lappingCourse) {
    const lessonCount = await pool.query(
      toPositional('SELECT COUNT(*) as count FROM lessons WHERE course_id = ?'),
      [lappingCourse.id],
    );
    if (Number(lessonCount.rows[0].count) === 0) {
      await pool.query(
        toPositional(`INSERT INTO lessons (course_id, title, slug, content, sort_order, is_published) VALUES
        (?, 'Understanding Lapping', 'understanding-lapping',
         'What is Lapping?\n\nLapping occurs when the same number appears directly under another in the same column across consecutive events.\n\nExample:\nEV.1  →  75\nEV.2  →  75  ← Lapping\n\nTypes of Lapping:\n\n🔹 Two Lapping — 2 consecutive vertical matches in the same column position.\n🔹 Three Lapping — 3 consecutive vertical matches. Stronger signal.\n🔹 Four Lapping — Very rare. Requires historical verification before acting.\n\nLapping is one of the most powerful pattern recognition techniques in lottery analysis. When a number repeats in the same position across consecutive draws, it signals vertical continuation pressure — a tendency for that column to maintain or shift in a predictable way.',
         1, 1),
        (?, 'Two Lapping Strategy', 'two-lapping-strategy',
         'How to Detect Two Lapping:\n\n1. Arrange draws vertically by event number.\n2. Check each column (N1–N5 or M1–M5).\n3. Compare EV(n) with EV(n-1) in the same column.\n4. If the values are identical, you have found a two-lapping.\n\nForecast Rule:\n👉 The number that appears under (after) a lapping position in the next event becomes a strong candidate for prediction.\n\nPractice Exercise:\n• Pull the last 20 events from any draw source.\n• Mark all two-lapping occurrences.\n• Record what number appeared in that column in the next event.\n• Track how often the pattern produces actionable candidates.\n\nUse the Lapping 2 tool under Tools to automate this detection across all your draw sources.',
         2, 1),
        (?, 'Three Lapping Strategy', 'three-lapping-strategy',
         'Three Lapping occurs when the same column shows matching pattern values across 3 consecutive events.\n\nWhy is Three Lapping Stronger?\n\n• It indicates sustained vertical continuation pressure.\n• The longer a pattern holds, the more significant the signal.\n• Three lapping is more reliable than two lapping for forecasting.\n\nForecast Rule:\n👉 Play the next event under the triple lapping position.\n👉 Always verify by checking historical occurrence of the same pattern.\n\nThe Lapping 3 tool uses a specific pattern matrix to scan your draws. When 3 consecutive rows in a column match the pattern reference values, those cells are highlighted.\n\nPractice:\n• Run the Lapping 3 tool on different sources.\n• Note which columns get highlighted.\n• Cross-reference with actual next-event results.',
         3, 1),
        (?, 'Four Lapping (Advanced)', 'four-lapping-advanced',
         'Four Lapping Characteristics:\n\n• Extremely rare — only occurs in unusual draw sequences.\n• High attention event when detected.\n• Must verify historical repetition before acting.\n\nExpert Rule:\n⚠️ Do NOT auto-play based on four lapping alone.\n✅ Confirm pattern repetition history across multiple sources.\n✅ Check if the same four-lapping pattern has occurred before.\n✅ If historical confirmation exists, treat it as a high-confidence signal.\n\nFour lapping represents the strongest form of vertical continuation. When it appears, it deserves extra analysis and careful position tracking.',
         4, 1),
        (?, 'Expert Decision Framework', 'expert-decision-framework',
         'Expert analysts evaluate lapping using these criteria:\n\n1. Number of Lapping (2, 3, or 4)\n   → Higher count = stronger signal.\n\n2. Historical Replay\n   → Has this exact pattern occurred before? What happened next?\n\n3. Column Position (Machine Alignment)\n   → Which column (N1–N5 or M1–M5) shows the lapping?\n   → Some columns are historically more predictable.\n\n4. Event Timing\n   → Which event number (EV.1, EV.2, etc.) shows the pattern?\n   → Certain events within a cycle carry more weight.\n\nCombining these factors produces a confidence score for each lapping-based prediction. Never rely on a single factor — always cross-reference multiple dimensions.',
         5, 1),
        (?, 'Practical Analytics with Tools', 'practical-analytics',
         'Using Lotto Prophet Tools for Lapping Analysis:\n\n🔧 Lapping 2 Tool\n• Select a draw source and column mode (Main, Machine, or All).\n• The tool scans consecutive draws for identical values in the same column.\n• Highlighted balls show where lapping was detected.\n• Use the side navigation to jump directly to lapping rows.\n\n🔧 Lapping 3 Tool\n• Works with a pattern reference matrix.\n• Scans 3-row windows per column against the pattern.\n• Highlighted cells indicate pattern matches.\n• Use the side navigation to navigate matched rows.\n\n📊 Best Practices:\n• Start with 200 draws for a good balance of speed and coverage.\n• Compare Main vs Machine columns for different perspectives.\n• Use the lapping count in the stats bar to gauge pattern density.\n• Cross-reference lapping results with your own predictions.',
         6, 1)`),
        [lappingCourse.id, lappingCourse.id, lappingCourse.id, lappingCourse.id, lappingCourse.id, lappingCourse.id],
      );
      console.log('Seeded 6 lessons for the Lapping course.');
    }
  }

  console.log('Database initialized — all tables ready.');
};

export const closeDb = async (): Promise<void> => {
  await pool.end();
};
