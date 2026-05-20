import mysql from 'mysql2/promise';

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Default phpMyAdmin password is empty
  database: 'lotto',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
export const pool = mysql.createPool(dbConfig);

// Database operations
export const dbRun = async (sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> => {
  const [result] = await pool.execute(sql, params) as any;
  return { lastID: result.insertId, changes: result.affectedRows };
};

export const dbAll = async (sql: string, params: any[] = []): Promise<any[]> => {
  const [rows] = await pool.execute(sql, params);
  return rows as any[];
};

export const dbGet = async (sql: string, params: any[] = []): Promise<any> => {
  const [rows] = await pool.execute(sql, params) as any;
  return rows[0] || null;
};

// Initialize database tables
export const initDb = async () => {
  // Create database if not exists (need a separate connection without database)
  const tempPool = mysql.createPool({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
  });
  await tempPool.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
  await tempPool.end();

  // Days table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS days (
      id INT AUTO_INCREMENT PRIMARY KEY,
      date VARCHAR(10) NOT NULL UNIQUE,
      year INT NOT NULL,
      month INT NOT NULL,
      day INT NOT NULL,
      weekday INT NOT NULL,
      weekday_name VARCHAR(20) NOT NULL
    )
  `);
  await pool.execute('CREATE INDEX idx_days_date ON days(date)').catch(() => {});

  // Draws table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS draws (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_number INT NOT NULL UNIQUE,
      day_id INT NOT NULL,
      FOREIGN KEY (day_id) REFERENCES days(id)
    )
  `);
  await pool.execute('CREATE INDEX idx_draws_day ON draws(day_id)').catch(() => {});

  // Number sets table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS number_sets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      draw_id INT NOT NULL,
      set_type ENUM('N','M') NOT NULL,
      FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE
    )
  `);
  await pool.execute('CREATE INDEX idx_number_sets_draw ON number_sets(draw_id)').catch(() => {});

  // Numbers table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS numbers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      number_set_id INT NOT NULL,
      position INT NOT NULL CHECK (position BETWEEN 1 AND 5),
      value INT NOT NULL,
      FOREIGN KEY (number_set_id) REFERENCES number_sets(id) ON DELETE CASCADE
    )
  `);
  await pool.execute('CREATE INDEX idx_numbers_value ON numbers(value)').catch(() => {});
  await pool.execute('CREATE INDEX idx_numbers_set ON numbers(number_set_id)').catch(() => {});

  // Users table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      firstname VARCHAR(100) NOT NULL,
      surname VARCHAR(100) NOT NULL,
      email VARCHAR(190) UNIQUE NOT NULL,
      country_code VARCHAR(10) NOT NULL,
      mobile_number VARCHAR(15) NOT NULL,
      referral_code VARCHAR(50),
      password_hash VARCHAR(255) NOT NULL,
      date_of_birth DATE NOT NULL,
      reset_token VARCHAR(255),
      reset_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_mobile (country_code, mobile_number)
    )
  `);
  await pool.execute('CREATE INDEX idx_users_email ON users(email)').catch(() => {});
  await pool.execute('CREATE INDEX idx_users_mobile ON users(country_code, mobile_number)').catch(() => {});
  await pool.execute('CREATE INDEX idx_users_reset_token ON users(reset_token)').catch(() => {});
  `);

  // Predictions table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      predicted_numbers TEXT NOT NULL,
      prediction_date DATE DEFAULT (CURRENT_DATE),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // Flat view for easy reads
  await pool.execute(`
    CREATE OR REPLACE VIEW v_draws_flat AS
    SELECT
      d.event_number,
      dy.date,
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 1 THEN n.value END) AS N1,
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 2 THEN n.value END) AS N2,
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 3 THEN n.value END) AS N3,
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 4 THEN n.value END) AS N4,
      MAX(CASE WHEN s.set_type = 'N' AND n.position = 5 THEN n.value END) AS N5,
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 1 THEN n.value END) AS M1,
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 2 THEN n.value END) AS M2,
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 3 THEN n.value END) AS M3,
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 4 THEN n.value END) AS M4,
      MAX(CASE WHEN s.set_type = 'M' AND n.position = 5 THEN n.value END) AS M5
    FROM draws d
    JOIN days dy ON d.day_id = dy.id
    JOIN number_sets s ON s.draw_id = d.id
    JOIN numbers n ON n.number_set_id = s.id
    GROUP BY d.id
    ORDER BY d.event_number
  `);

  // Insert sample data if table is empty
  const drawCount = await dbGet('SELECT COUNT(*) as count FROM draws');
  if (drawCount.count === 0) {
    await insertSampleData();
  }
};

// Insert sample lotto draw data
const insertSampleData = async () => {
  // Insert day
  const dayResult = await dbRun(
    'INSERT INTO days (date, year, month, day, weekday, weekday_name) VALUES (?, ?, ?, ?, ?, ?)',
    ['2025-04-03', 2025, 4, 3, 4, 'Thursday']
  );
  const dayId = dayResult.lastID;

  // Insert draw
  const drawResult = await dbRun(
    'INSERT INTO draws (event_number, day_id) VALUES (?, ?)',
    [1, dayId]
  );
  const drawId = drawResult.lastID;

  // Insert N numbers (main numbers)
  const nSetResult = await dbRun(
    'INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)',
    [drawId, 'N']
  );
  const nSetId = nSetResult.lastID;

  const nNumbers = [86, 21, 40, 24, 72];
  for (let i = 0; i < nNumbers.length; i++) {
    await dbRun(
      'INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)',
      [nSetId, i + 1, nNumbers[i]]
    );
  }

  // Insert M numbers (mega numbers)
  const mSetResult = await dbRun(
    'INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)',
    [drawId, 'M']
  );
  const mSetId = mSetResult.lastID;

  const mNumbers = [50, 66, 57, 68, 58];
  for (let i = 0; i < mNumbers.length; i++) {
    await dbRun(
      'INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)',
      [mSetId, i + 1, mNumbers[i]]
    );
  }

  console.log('Inserted sample lotto draw data');
};

// Close database connection
export const closeDb = async (): Promise<void> => {
  await pool.end();
};
