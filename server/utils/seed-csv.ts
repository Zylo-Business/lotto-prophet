/**
 * CSV Seed Script
 *
 * Loads lotto draw data from CSV files into the MySQL database.
 * Handles two CSV formats:
 *
 * Format A ("alpha m.csv"):
 *   Date,N1,N2,N3,N4,N5,Sum,Median,,M1,M2,M3,M4,M5,
 *   No event number — auto-incremented.
 *
 * Format B ("lucky.csv"):
 *   GameName,EventNum,Date,N1,N2,N3,N4,N5,Sum,Median,,M1,M2,M3,M4,M5
 *   Has game name prefix and "EV.  X" event numbers.
 *
 * Usage:
 *   npx ts-node --esm utils/seed-csv.ts                         # seeds alpha m.csv
 *   npx ts-node --esm utils/seed-csv.ts "db/lucky.csv"          # seeds lucky.csv
 *   npx ts-node --esm utils/seed-csv.ts "db/alpha m.csv" --clear  # clears then seeds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, dbRun, dbGet, initDb, closeDb } from '../db/db.js';

// ---------- helpers ----------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Parse M/D/YYYY → YYYY-MM-DD */
function normDate(raw: string): string {
  const parts = raw.trim().split('/');
  if (parts.length !== 3) throw new Error(`Bad date: ${raw}`);
  const [m, d, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ParsedRow {
  eventNumber: number;
  date: string;       // YYYY-MM-DD
  nNumbers: number[];  // 5 main numbers
  mNumbers: number[];  // 5 mega numbers
}

// ---------- CSV detection & parsing ----------

type CsvFormat = 'alpha' | 'lucky';

function detectFormat(headerLine: string): CsvFormat {
  // lucky.csv header starts with ",#,Date,..."
  // alpha m.csv header starts with "Date,N1,..."
  if (headerLine.includes('#') || headerLine.startsWith(',')) {
    return 'lucky';
  }
  return 'alpha';
}

function parseAlphaRow(cols: string[], eventNum: number): ParsedRow | null {
  // Cols: Date,N1,N2,N3,N4,N5,Sum,Median,,M1,M2,M3,M4,M5,
  // idx:   0   1  2  3  4  5  6    7    8  9 10 11 12 13
  const dateRaw = cols[0]?.trim();
  if (!dateRaw || !/^\d/.test(dateRaw)) return null;

  const nNumbers: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const v = parseInt(cols[i], 10);
    if (isNaN(v)) return null;
    nNumbers.push(v);
  }

  const mNumbers: number[] = [];
  for (let i = 9; i <= 13; i++) {
    const v = parseInt(cols[i], 10);
    if (isNaN(v)) mNumbers.push(0); // fallback
    else mNumbers.push(v);
  }

  return {
    eventNumber: eventNum,
    date: normDate(dateRaw),
    nNumbers,
    mNumbers,
  };
}

function parseLuckyRow(cols: string[]): ParsedRow | null {
  // Cols: GameName, EventNum, Date, N1-N5, Sum, Median, _, M1-M5
  // idx:    0         1        2    3-7     8     9     10  11-15
  const evRaw = cols[1]?.trim();
  if (!evRaw) return null;
  const evMatch = evRaw.match(/(\d+)/);
  if (!evMatch) return null;
  const eventNumber = parseInt(evMatch[1], 10);

  const dateRaw = cols[2]?.trim();
  if (!dateRaw || !/^\d/.test(dateRaw)) return null;

  const nNumbers: number[] = [];
  for (let i = 3; i <= 7; i++) {
    const v = parseInt(cols[i], 10);
    if (isNaN(v)) return null;
    nNumbers.push(v);
  }

  const mNumbers: number[] = [];
  for (let i = 11; i <= 15; i++) {
    const v = parseInt(cols[i], 10);
    if (isNaN(v)) mNumbers.push(0);
    else mNumbers.push(v);
  }

  return {
    eventNumber,
    date: normDate(dateRaw),
    nNumbers,
    mNumbers,
  };
}

interface ParseResult {
  rows: ParsedRow[];
  source: string; // 'alpha' | 'lucky'
}

function parseCSV(filePath: string): ParseResult {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) throw new Error('CSV has no data rows');

  const format = detectFormat(lines[0]);
  console.log(`Detected format: ${format} (${path.basename(filePath)})`);

  const rows: ParsedRow[] = [];
  let autoEvent = 1;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    let parsed: ParsedRow | null = null;

    if (format === 'alpha') {
      parsed = parseAlphaRow(cols, autoEvent);
      if (parsed) autoEvent++;
    } else {
      parsed = parseLuckyRow(cols);
    }

    if (parsed) rows.push(parsed);
  }

  console.log(`Parsed ${rows.length} rows from ${path.basename(filePath)}`);
  return { rows, source: format };
}

// ---------- database insertion ----------

async function insertRows(rows: ParsedRow[], source: string) {
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    try {
      // Check if draw already exists for this date + event + source
      const existing = await dbGet(
        `SELECT d.id FROM draws d JOIN days dy ON d.day_id = dy.id WHERE dy.date = ? AND d.event_number = ? AND d.source = ?`,
        [row.date, row.eventNumber, source]
      );
      if (existing) {
        skipped++;
        continue;
      }

      // Upsert day
      const dt = new Date(row.date + 'T00:00:00Z');
      const weekday = dt.getUTCDay();
      const weekdayName = WEEKDAY_NAMES[weekday];

      await pool.query(
        `INSERT INTO days (date, year, month, day, weekday, weekday_name) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (date) DO NOTHING`,
        [row.date, dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), weekday, weekdayName]
      );

      const dayRow = await dbGet('SELECT id FROM days WHERE date = ?', [row.date]);
      const dayId = dayRow.id;

      // Insert draw
      const drawResult = await dbRun(
        'INSERT INTO draws (event_number, day_id, source) VALUES (?, ?, ?)',
        [row.eventNumber, dayId, source]
      );
      const drawId = drawResult.lastID;

      // Insert N number set
      const nSetResult = await dbRun(
        'INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)',
        [drawId, 'N']
      );
      const nSetId = nSetResult.lastID;
      for (let p = 0; p < row.nNumbers.length; p++) {
        await dbRun(
          'INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)',
          [nSetId, p + 1, row.nNumbers[p]]
        );
      }

      // Insert M number set
      const mSetResult = await dbRun(
        'INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)',
        [drawId, 'M']
      );
      const mSetId = mSetResult.lastID;
      for (let p = 0; p < row.mNumbers.length; p++) {
        await dbRun(
          'INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)',
          [mSetId, p + 1, row.mNumbers[p]]
        );
      }

      inserted++;
    } catch (err: any) {
      console.error(`Row event#${row.eventNumber} date=${row.date}: ${err.message}`);
    }
  }

  console.log(`\n[${source}] Inserted: ${inserted}, Skipped (duplicates): ${skipped}`);
}

// ---------- main ----------

async function main() {
  const args = process.argv.slice(2);
  const clearFlag = args.includes('--clear');
  const csvArg = args.find(a => !a.startsWith('--'));
  const csvPath = csvArg
    ? path.resolve(process.cwd(), csvArg)
    : path.resolve(__dirname, '..', 'db', 'alpha m.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  console.log(`\nSeeding from: ${csvPath}`);
  console.log(`Clear existing data: ${clearFlag}\n`);

  // Ensure tables exist
  await initDb();

  if (clearFlag) {
    console.log('Clearing existing draw data...');
    await pool.query('TRUNCATE TABLE numbers, number_sets, draws, days RESTART IDENTITY CASCADE');
    console.log('Cleared.\n');
  }

  const { rows, source } = parseCSV(csvPath);
  await insertRows(rows, source);

  const countResult = await dbGet('SELECT COUNT(*) as total FROM draws');
  console.log(`\nTotal draws in database: ${countResult.total}`);

  await closeDb();
  console.log('Done.');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
