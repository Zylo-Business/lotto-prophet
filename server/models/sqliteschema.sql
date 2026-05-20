PRAGMA foreign_keys = ON;

-- =================
-- Days Table
-- =================
CREATE TABLE days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,        -- YYYY-MM-DD
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    day INTEGER NOT NULL,
    weekday INTEGER NOT NULL,         -- 0=Sunday … 6=Saturday
    weekday_name TEXT NOT NULL
);

CREATE INDEX idx_days_date ON days(date);

-- =================
-- Draws Table
-- =================
CREATE TABLE draws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_number INTEGER NOT NULL UNIQUE,
    day_id INTEGER NOT NULL,
    FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
);

CREATE INDEX idx_draws_day ON draws(day_id);

-- =================
-- Number Sets (N / M)
-- =================
CREATE TABLE number_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    draw_id INTEGER NOT NULL,
    set_type TEXT NOT NULL CHECK (set_type IN ('N', 'M')),
    FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE
);

CREATE INDEX idx_number_sets_draw ON number_sets(draw_id);

-- =================
-- Numbers Table (Normalized)
-- =================
CREATE TABLE numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number_set_id INTEGER NOT NULL,
    position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
    value INTEGER NOT NULL,
    FOREIGN KEY (number_set_id) REFERENCES number_sets(id) ON DELETE CASCADE
);

CREATE INDEX idx_numbers_value ON numbers(value);
CREATE INDEX idx_numbers_set ON numbers(number_set_id);

-- =================
-- Flat View for Easy Reads
-- =================
CREATE VIEW v_draws_flat AS
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
JOIN days dy        ON d.day_id = dy.id
JOIN number_sets s  ON s.draw_id = d.id
JOIN numbers n      ON n.number_set_id = s.id
GROUP BY d.id
ORDER BY d.event_number;
