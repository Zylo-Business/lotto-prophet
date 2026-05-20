/**
 * Google Drive Sync Script
 *
 * Downloads Excel files from Google Drive folder and loads lotto draw data into the MySQL database.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import XLSX from 'xlsx';
import { pool, dbRun, dbGet, initDb } from '../db/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google Drive folder IDs - Use env vars
const DRIVE_FOLDERS = [
  { name: 'nla', id: process.env.GOOGLE_DRIVE_FOLDER_ID_NLA },
  { name: 'nla rush', id: process.env.GOOGLE_DRIVE_FOLDER_ID_NLA_RUSH },
  { name: 'alpha', id: process.env.GOOGLE_DRIVE_FOLDER_ID_ALPHA },
  { name: 'alpha one', id: process.env.GOOGLE_DRIVE_FOLDER_ID_ALPHA_ONE },
  { name: 'alpha express', id: process.env.GOOGLE_DRIVE_FOLDER_ID_ALPHA_EXPRESS },
].filter(f => f.id); // Only include if ID is set

/** Parse M/D/YYYY or Excel serial number → YYYY-MM-DD */
function normDate(raw: string | number): string {
  if (typeof raw === 'number' || (!isNaN(Number(raw)) && !raw.toString().includes('/'))) {
    const serial = Number(raw);
    // Excel base date is 1899-12-30
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  
  const parts = raw.toString().trim().split('/');
  if (parts.length !== 3) throw new Error(`Bad date: ${raw}`);
  const [m, d, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ParsedRow {
  eventNumber: number;
  date: string;
  nNumbers: number[];
  mNumbers: number[];
}

type ExcelFormat = 'alpha' | 'lucky';

function detectFormat(headerRow: any[]): ExcelFormat {
  if (headerRow[1] && (headerRow[1].toString().includes('#') || headerRow[0] === '')) {
    return 'lucky';
  }
  return 'alpha';
}

function parseAlphaRow(row: any[], eventNum: number): ParsedRow | null {
  const dateRaw = row[0]?.toString().trim();
  if (!dateRaw || !/^\d/.test(dateRaw)) return null;

  const nNumbers: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const v = parseInt(row[i], 10);
    if (isNaN(v)) return null;
    nNumbers.push(v);
  }

  const mNumbers: number[] = [];
  for (let i = 9; i <= 13; i++) {
    const v = parseInt(row[i], 10);
    if (isNaN(v)) mNumbers.push(0);
    else mNumbers.push(v);
  }

  return { eventNumber: eventNum, date: normDate(dateRaw), nNumbers, mNumbers };
}

function parseLuckyRow(row: any[]): ParsedRow | null {
  const evRaw = row[1]?.toString().trim();
  if (!evRaw) return null;
  const evMatch = evRaw.match(/(\d+)/);
  if (!evMatch) return null;
  const eventNumber = parseInt(evMatch[1], 10);

  const dateRaw = row[2]?.toString().trim();
  if (!dateRaw || !/^\d/.test(dateRaw)) return null;

  const nNumbers: number[] = [];
  for (let i = 3; i <= 7; i++) {
    const v = parseInt(row[i], 10);
    if (isNaN(v)) return null;
    nNumbers.push(v);
  }

  const mNumbers: number[] = [];
  for (let i = 11; i <= 15; i++) {
    const v = parseInt(row[i], 10);
    if (isNaN(v)) mNumbers.push(0);
    else mNumbers.push(v);
  }

  return { eventNumber, date: normDate(dateRaw), nNumbers, mNumbers };
}

function parseExcel(buffer: Buffer, fileName: string): { rows: ParsedRow[], source: string } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length < 2) throw new Error(`Excel file ${fileName} has no data rows`);

  const headerRow = jsonData[0] as any[];
  const format = detectFormat(headerRow);
  const rows: ParsedRow[] = [];
  let autoEvent = 1;

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    let parsed: ParsedRow | null = null;
    if (format === 'alpha') {
      parsed = parseAlphaRow(row, autoEvent);
      if (parsed) autoEvent++;
    } else {
      parsed = parseLuckyRow(row);
    }
    if (parsed) rows.push(parsed);
  }
  return { rows, source: format };
}

async function listExcelFilesInFolder(drive: any, folderId: string): Promise<{ id: string, name: string }[]> {
  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false`,
    fields: 'files(id,name)',
  });
  return response.data.files || [];
}

async function downloadFile(drive: any, fileId: string): Promise<Buffer> {
  const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(response.data as ArrayBuffer);
}

async function insertRows(rows: ParsedRow[], folderName: string, fileName: string) {
  const fileBaseName = path.basename(fileName, path.extname(fileName));
  const source = fileBaseName; // Use the file name as the source name

  let inserted = 0;
  let skipped = 0;

  try {
    for (const row of rows) {
      const existing = await dbGet(
        `SELECT d.id FROM draws d JOIN days dy ON d.day_id = dy.id WHERE dy.date = ? AND d.event_number = ? AND d.source = ? AND d.file_name = ?`,
        [row.date, row.eventNumber, source, fileBaseName]
      );
      if (existing) {
        skipped++;
        continue;
      }

      const dt = new Date(row.date + 'T00:00:00Z');
      const weekday = dt.getUTCDay();
      const weekdayName = WEEKDAY_NAMES[weekday];

      await pool.query(
        `INSERT INTO days (date, year, month, day, weekday, weekday_name) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (date) DO NOTHING`,
        [row.date, dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), weekday, weekdayName]
      );

      const dayRow = await dbGet('SELECT id FROM days WHERE date = ?', [row.date]);
      const dayId = dayRow.id;

      const drawResult = await dbRun(
        'INSERT INTO draws (event_number, day_id, source, file_name) VALUES (?, ?, ?, ?)',
        [row.eventNumber, dayId, source, fileBaseName]
      );
      const drawId = drawResult.lastID;

      const nSetResult = await dbRun('INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)', [drawId, 'N']);
      const nSetId = nSetResult.lastID;
      for (let p = 0; p < row.nNumbers.length; p++) {
        await dbRun('INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)', [nSetId, p + 1, row.nNumbers[p]]);
      }

      const mSetResult = await dbRun('INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)', [drawId, 'M']);
      const mSetId = mSetResult.lastID;
      for (let p = 0; p < row.mNumbers.length; p++) {
        await dbRun('INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)', [mSetId, p + 1, row.mNumbers[p]]);
      }

      inserted++;
    }

    console.log(`[${source}] ${fileBaseName}: Inserted: ${inserted}, Skipped: ${skipped}`);
  } catch (err: any) {
    console.error(`Error inserting rows for ${fileName}:`, err);
    console.error(`Skipping ${fileName} due to errors. No partial data will be kept.`);
  }
}

async function clearDatabase() {
  console.log('Clearing existing draw data from database...');
  await pool.query('TRUNCATE TABLE numbers, number_sets, draws, days RESTART IDENTITY CASCADE');
}

export async function syncGoogleDrive() {
  try {
    console.log('Starting Google Drive sync...');
    if (DRIVE_FOLDERS.length === 0) {
      console.warn('No Google Drive folder IDs configured. Skipping sync.');
      return;
    }

    const credentialsPath = path.resolve(process.cwd(), 'credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      console.warn('credentials.json not found at', credentialsPath);
      console.warn('Skipping Google Drive sync until credentials.json is provided.');
      return;
    }

    let credentials;
    try {
      credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    } catch (err) {
      console.error('Error parsing credentials.json:', (err as Error).message || err);
      return;
    }

    let auth;
    try {
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });
    } catch (err) {
      console.error('Error creating Google Auth:', (err as Error).message || err);
      return;
    }

    let drive;
    try {
      drive = google.drive({ version: 'v3', auth });
    } catch (err) {
      console.error('Error creating Google Drive client:', (err as Error).message || err);
      return;
    }

    await initDb();
    console.log(`Found ${DRIVE_FOLDERS.length} configured folders`);

    const args = process.argv.slice(2);
    const shouldWipe = args.includes('--wipe') || args.includes('--reset') || process.env.SYNC_DROP_DB === 'true';
    if (shouldWipe) {
      await clearDatabase();
    }

    for (const folder of DRIVE_FOLDERS) {
      console.log(`Processing folder: ${folder.name}`);
      let files = await listExcelFilesInFolder(drive, folder.id!);
      files = files.filter(f => !path.basename(f.name).startsWith('~$'));
      console.log(`  Found ${files.length} Excel files in ${folder.name} (excluding temp files)`);

      for (const file of files) {
        console.log(`    Processing: ${file.name}`);
        try {
          const buffer = await downloadFile(drive, file.id);
          const { rows } = parseExcel(buffer, file.name);
          await insertRows(rows, folder.name, file.name);
        } catch (error) {
          console.error(`    Error processing ${file.name}:`, error);
        }
      }
    }
    console.log('Sync complete.');
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Allow running directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncGoogleDrive().catch(console.error);
}
