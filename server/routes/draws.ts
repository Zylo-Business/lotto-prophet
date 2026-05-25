import { Router, type Request, type Response } from 'express';
import { dbAll } from '../db/db.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

/**
 * GET /api/draws/sources
 * Returns distinct draw source names from the database.
 * e.g. [{ source: 'alpha', draw_count: 1200 }, { source: 'lucky', draw_count: 800 }]
 */
router.get('/sources', authenticate, async (_req: Request, res: Response) => {
  try {
    const rows = await dbAll(`
      SELECT source, file_name, COUNT(*) as draw_count
      FROM draws
      GROUP BY source, file_name
      ORDER BY source, file_name
    `);

    // Group by source
    const grouped: Record<string, any> = {};
    for (const row of rows) {
      if (!grouped[row.source]) {
        grouped[row.source] = {
          source: row.source,
          draw_count: 0,
          files: [],
        };
      }
      grouped[row.source].draw_count += row.draw_count;
      grouped[row.source].files.push({ file_name: row.file_name, draw_count: row.draw_count });
    }

    res.json(Object.values(grouped));
  } catch (err) {
    console.error('Error fetching draw sources:', err);
    res.status(500).json({ error: 'Failed to fetch draw sources' });
  }
});

/**
 * GET /api/draws/:source
 * Returns all draws for a given source (e.g. 'alpha' or 'lucky'),
 * using the flat view for easy consumption.
 * Supports optional query params: ?limit=30&offset=0
 */
router.get('/:source', authenticate, async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const fileName = (req.query.file_name as string) || null;
    const limit = Math.max(1, Math.min(200, parseInt(req.query.limit as string) || 30));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const filters: string[] = ['source = ?'];
    const params: any[] = [source];
    if (fileName) {
      filters.push('file_name = ?');
      params.push(fileName);
    }
    const whereClause = filters.join(' AND ');

    const countResult = await dbAll(
      `SELECT COUNT(*) as total FROM v_draws_flat WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    const draws = await dbAll(
      `SELECT * FROM v_draws_flat WHERE ${whereClause} ORDER BY event_number DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({ source, file_name: fileName, total, limit, offset, draws });
  } catch (err) {
    console.error('Error fetching draws:', err);
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

export default router;
