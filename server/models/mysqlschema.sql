CREATE TABLE days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE UNIQUE NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    day INT NOT NULL,
    weekday INT NOT NULL,
    weekday_name VARCHAR(10) NOT NULL
);

CREATE TABLE draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_number INT UNIQUE NOT NULL,
    day_id INT NOT NULL,
    FOREIGN KEY (day_id) REFERENCES days(id)
);

CREATE TABLE number_sets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    draw_id INT NOT NULL,
    set_type ENUM('N','M') NOT NULL,
    FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE
);

CREATE TABLE numbers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number_set_id INT NOT NULL,
    position INT NOT NULL,
    value INT NOT NULL,
    FOREIGN KEY (number_set_id) REFERENCES number_sets(id) ON DELETE CASCADE
);


CREATE VIEW v_draws_flat AS
SELECT
    d.event_number,
    dy.date,
    MAX(CASE WHEN s.set_type='N' AND n.position=1 THEN n.value END) AS N1,
    MAX(CASE WHEN s.set_type='N' AND n.position=2 THEN n.value END) AS N2,
    MAX(CASE WHEN s.set_type='N' AND n.position=3 THEN n.value END) AS N3,
    MAX(CASE WHEN s.set_type='N' AND n.position=4 THEN n.value END) AS N4,
    MAX(CASE WHEN s.set_type='N' AND n.position=5 THEN n.value END) AS N5,
    MAX(CASE WHEN s.set_type='M' AND n.position=1 THEN n.value END) AS M1,
    MAX(CASE WHEN s.set_type='M' AND n.position=2 THEN n.value END) AS M2,
    MAX(CASE WHEN s.set_type='M' AND n.position=3 THEN n.value END) AS M3,
    MAX(CASE WHEN s.set_type='M' AND n.position=4 THEN n.value END) AS M4,
    MAX(CASE WHEN s.set_type='M' AND n.position=5 THEN n.value END) AS M5
FROM draws d
JOIN days dy ON d.day_id = dy.id
JOIN number_sets s ON s.draw_id = d.id
JOIN numbers n ON n.number_set_id = s.id
GROUP BY d.id;
