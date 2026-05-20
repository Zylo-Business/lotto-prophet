import { Router, type Request, type Response } from 'express';
import { dbAll } from '../db/db.js';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────

/** Parse a "row1", "row2", etc. query param into a number[] of length numCols */
function parseRowParam(param: string | undefined, numCols: number): number[] {
  if (!param || !param.trim()) return new Array(numCols).fill(0);
  const vals = param.split(',').map((s) => {
    const n = parseInt(s.trim(), 10);
    return !isNaN(n) && n >= 1 && n <= 90 ? n : 0;
  });
  while (vals.length < numCols) vals.push(0);
  return vals.slice(0, numCols);
}

/** True if at least one cell in the pattern grid is non-zero */
function hasNonZero(rows: number[][]): boolean {
  return rows.some((row) => row.some((v) => v !== 0));
}

/** Resolve column names from the columns query param */
function getColumnNames(mode: string): string[] {
  if (mode === 'machine') return ['M1', 'M2', 'M3', 'M4', 'M5'];
  if (mode === 'all') return ['N1', 'N2', 'N3', 'N4', 'N5', 'M1', 'M2', 'M3', 'M4', 'M5'];
  return ['N1', 'N2', 'N3', 'N4', 'N5'];
}

// ─── Lapping‑2 computation ──────────────────────────────────────────

/**
 * Two-lapping analysis.
 *
 * When patternRows is provided and non-empty:
 *   Column-specific matching — for each column c, slide a 2-row window
 *   through the data and check if data[r][c] matches patternRows[0][c]
 *   AND data[r+1][c] matches patternRows[1][c]. A value of 0 in the
 *   pattern means "wildcard — match anything at that position".
 *
 * When patternRows is absent or all-zero:
 *   Default mode — detect ANY identical value in the same column across
 *   two consecutive draws.
 */
function computeLapping2(
  data: number[][],
  patternRows?: number[][],
): { highlights: boolean[][]; lappingRows: number[] } {
  const maxRow = data.length;
  const maxCol = data[0]?.length ?? 0;
  const highlights: boolean[][] = Array.from({ length: maxRow }, () =>
    Array(maxCol).fill(false),
  );
  const lappingRowSet = new Set<number>();
  const usePattern = patternRows && patternRows.length >= 2 && hasNonZero(patternRows);

  if (usePattern) {
    for (let c = 0; c < maxCol; c++) {
      const p0 = patternRows![0][c] ?? 0;
      const p1 = patternRows![1][c] ?? 0;
      if (p0 === 0 && p1 === 0) continue;

      for (let r = 0; r <= maxRow - 2; r++) {
        let match = true;
        if (p0 !== 0 && data[r][c] !== p0) match = false;
        if (p1 !== 0 && data[r + 1][c] !== p1) match = false;
        if (match) {
          if (p0 !== 0) highlights[r][c] = true;
          if (p1 !== 0) highlights[r + 1][c] = true;
          lappingRowSet.add(r);
          lappingRowSet.add(r + 1);
        }
      }
    }
  } else {
    // Default: identical consecutive values in same column
    for (let r = 1; r < maxRow; r++) {
      let rowHasLapping = false;
      for (let c = 0; c < maxCol; c++) {
        const val = data[r][c];
        if (val !== 0 && val === data[r - 1][c]) {
          highlights[r][c] = true;
          highlights[r - 1][c] = true;
          rowHasLapping = true;
        }
      }
      if (rowHasLapping) lappingRowSet.add(r);
    }
  }

  return { highlights, lappingRows: Array.from(lappingRowSet).sort((a, b) => a - b) };
}

// ─── Lapping‑3 computation ──────────────────────────────────────────

/** Default 3-row pattern (from the original lapping-3 reference) */
const DEFAULT_L3_PATTERN: number[][] = [
  [61, 60, 17, 8, 75], // Row 1 (bottom)
  [55, 28, 11, 6, 47], // Row 2 (middle)
  [53, 29, 22, 75, 82], // Row 3 (top)
];

/**
 * Three-lapping analysis.
 *
 * Column-specific matching — for each column c, slide a 3-row window
 * and check data[r][c] vs patternRows[0][c], data[r+1][c] vs patternRows[1][c],
 * data[r+2][c] vs patternRows[2][c].  0 = wildcard.
 */
function computeLapping3(
  data: number[][],
  patternRows: number[][],
): { highlights: boolean[][]; lappingRows: number[] } {
  const maxRow = data.length;
  const maxCol = data[0]?.length ?? 0;
  const highlights: boolean[][] = Array.from({ length: maxRow }, () =>
    Array(maxCol).fill(false),
  );
  const lappingRowSet = new Set<number>();

  for (let c = 0; c < maxCol; c++) {
    const p0 = patternRows[0]?.[c] ?? 0;
    const p1 = patternRows[1]?.[c] ?? 0;
    const p2 = patternRows[2]?.[c] ?? 0;
    if (p0 === 0 && p1 === 0 && p2 === 0) continue;

    for (let r = 0; r <= maxRow - 3; r++) {
      let match = true;
      if (p0 !== 0 && data[r][c] !== p0) match = false;
      if (p1 !== 0 && data[r + 1][c] !== p1) match = false;
      if (p2 !== 0 && data[r + 2][c] !== p2) match = false;
      if (match) {
        if (p0 !== 0) highlights[r][c] = true;
        if (p1 !== 0) highlights[r + 1][c] = true;
        if (p2 !== 0) highlights[r + 2][c] = true;
        lappingRowSet.add(r);
        lappingRowSet.add(r + 1);
        lappingRowSet.add(r + 2);
      }
    }
  }

  return { highlights, lappingRows: Array.from(lappingRowSet).sort((a, b) => a - b) };
}

// ─── Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/tools/lapping-2/:source
 *
 * Query params:
 *   columns = "main" | "machine" | "all"
 *   limit   = number (default 200, max 2000)
 *   row1    = comma-separated numbers for Row 1 (column-aligned)
 *   row2    = comma-separated numbers for Row 2
 *
 * If row1/row2 are provided, column-specific pattern matching is used.
 * Otherwise all identical-consecutive-value lapping is detected.
 */
router.get('/lapping-2/:source', async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const columnsParam = (req.query.columns as string) || 'main';
    const limit = Math.max(2, Math.min(2000, parseInt(req.query.limit as string) || 200));
    const columnNames = getColumnNames(columnsParam);
    const numCols = columnNames.length;

    const row1 = parseRowParam(req.query.row1 as string, numCols);
    const row2 = parseRowParam(req.query.row2 as string, numCols);
    const patternRows = [row1, row2];

    const rows = await dbAll(
      `SELECT * FROM v_draws_flat WHERE source = ? ORDER BY event_number DESC LIMIT ${limit}`,
      [source],
    );

    if (rows.length < 2) {
      return res.json({
        source, columns: columnsParam, total: rows.length,
        draws: rows, grid: [], columnNames,
        highlights: [], lappingRows: [], patternRows,
      });
    }

    const grid = rows.map((row) => columnNames.map((col) => Number(row[col]) || 0));
    const { highlights, lappingRows } = computeLapping2(grid, patternRows);

    res.json({
      source, columns: columnsParam, total: rows.length,
      draws: rows, grid, columnNames,
      highlights, lappingRows, patternRows,
    });
  } catch (err) {
    console.error('Error in lapping-2:', err);
    res.status(500).json({ error: 'Failed to run lapping-2 analysis' });
  }
});

/**
 * GET /api/tools/lapping-3/:source
 *
 * Query params:
 *   columns = "main" | "machine" | "all"
 *   limit   = number (default 200, max 2000)
 *   row1    = comma-separated numbers for Row 1
 *   row2    = comma-separated numbers for Row 2
 *   row3    = comma-separated numbers for Row 3
 *
 * If no rows are provided, the default lapping-3 pattern is used.
 */
router.get('/lapping-3/:source', async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const columnsParam = (req.query.columns as string) || 'main';
    const limit = Math.max(3, Math.min(2000, parseInt(req.query.limit as string) || 200));
    const columnNames = getColumnNames(columnsParam);
    const numCols = columnNames.length;

    const row1Raw = req.query.row1 as string | undefined;
    const row2Raw = req.query.row2 as string | undefined;
    const row3Raw = req.query.row3 as string | undefined;
    const hasUserRows = !!(row1Raw || row2Raw || row3Raw);

    let patternRows: number[][];
    if (hasUserRows) {
      patternRows = [
        parseRowParam(row1Raw, numCols),
        parseRowParam(row2Raw, numCols),
        parseRowParam(row3Raw, numCols),
      ];
    } else {
      // Pad/trim default pattern to numCols
      patternRows = DEFAULT_L3_PATTERN.map((row) => {
        const padded = [...row];
        while (padded.length < numCols) padded.push(0);
        return padded.slice(0, numCols);
      });
    }

    const rows = await dbAll(
      `SELECT * FROM v_draws_flat WHERE source = ? ORDER BY event_number DESC LIMIT ${limit}`,
      [source],
    );

    if (rows.length < 3) {
      return res.json({
        source, columns: columnsParam, total: rows.length,
        draws: rows, grid: [], columnNames,
        highlights: [], lappingRows: [], patternRows,
      });
    }

    const grid = rows.map((row) => columnNames.map((col) => Number(row[col]) || 0));
    const { highlights, lappingRows } = computeLapping3(grid, patternRows);

    res.json({
      source, columns: columnsParam, total: rows.length,
      draws: rows, grid, columnNames,
      highlights, lappingRows, patternRows,
    });
  } catch (err) {
    console.error('Error in lapping-3:', err);
    res.status(500).json({ error: 'Failed to run lapping-3 analysis' });
  }
});

export default router;
