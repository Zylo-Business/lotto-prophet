import { Router, type Request, type Response } from 'express';
import { dbRun, dbAll, dbGet } from '../db/db.js';
import { authenticate, type AuthRequest } from '../middlewares/auth.js';
import { sendPushToAll } from '../utils/push.js';

const router = Router();

// ─── Display name helper (keep in sync with client) ─────────────────
const DISPLAY_NAMES: Record<string, string> = {
  lucky: 'Lucky Tuesday',
  alpha: 'Alpha Lotto',
};

function getDisplayName(source: string): string {
  return DISPLAY_NAMES[source.toLowerCase()] ?? source;
}

// ─── Weekday helpers ─────────────────────────────────────────────────
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * POST /api/admin/draws
 * Add a new draw result. Sends push notification to all users.
 *
 * Body: {
 *   source: 'alpha' | 'lucky',
 *   event_number: number,
 *   date: 'YYYY-MM-DD',
 *   n_numbers: [n1, n2, n3, n4, n5],
 *   m_numbers?: [m1, m2, m3, m4, m5]   // optional machine numbers
 * }
 */
router.post('/draws', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { source, event_number, date, n_numbers, m_numbers } = req.body;

    // ── Validation ──────────────────────────────────────────────────
    if (!source || !event_number || !date || !n_numbers) {
      res.status(400).json({ error: 'Missing required fields: source, event_number, date, n_numbers' });
      return;
    }

    if (!Array.isArray(n_numbers) || n_numbers.length !== 5) {
      res.status(400).json({ error: 'n_numbers must be an array of exactly 5 numbers' });
      return;
    }

    if (m_numbers && (!Array.isArray(m_numbers) || m_numbers.length !== 5)) {
      res.status(400).json({ error: 'm_numbers must be an array of exactly 5 numbers' });
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
      return;
    }

    // Check for duplicate draw
    const existing = await dbGet(
      'SELECT d.id FROM draws d JOIN days dy ON d.day_id = dy.id WHERE d.event_number = ? AND d.source = ?',
      [event_number, source]
    );
    if (existing) {
      res.status(409).json({ error: `Draw #${event_number} for ${source} already exists` });
      return;
    }

    // ── Insert day ──────────────────────────────────────────────────
    const dateObj = new Date(date + 'T00:00:00');
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const weekday = dateObj.getDay();
    const weekday_name = WEEKDAY_NAMES[weekday];

    // Upsert day
    let dayRow = await dbGet('SELECT id FROM days WHERE date = ?', [date]);
    if (!dayRow) {
      const result = await dbRun(
        'INSERT INTO days (date, year, month, day, weekday, weekday_name) VALUES (?, ?, ?, ?, ?, ?)',
        [date, year, month, day, weekday, weekday_name]
      );
      dayRow = { id: result.lastID };
    }

    // ── Insert draw ─────────────────────────────────────────────────
    const drawResult = await dbRun(
      'INSERT INTO draws (event_number, day_id, source) VALUES (?, ?, ?)',
      [event_number, dayRow.id, source]
    );
    const drawId = drawResult.lastID;

    // ── Insert N number set ─────────────────────────────────────────
    const nSetResult = await dbRun(
      'INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)',
      [drawId, 'N']
    );
    for (let i = 0; i < 5; i++) {
      await dbRun(
        'INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)',
        [nSetResult.lastID, i + 1, n_numbers[i]]
      );
    }

    // ── Insert M number set (if provided) ───────────────────────────
    if (m_numbers) {
      const mSetResult = await dbRun(
        'INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)',
        [drawId, 'M']
      );
      for (let i = 0; i < 5; i++) {
        await dbRun(
          'INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)',
          [mSetResult.lastID, i + 1, m_numbers[i]]
        );
      }
    }

    // ── Send push notification ──────────────────────────────────────
    const displayName = getDisplayName(source);
    const numbersStr = n_numbers.join(', ');
    const pushTitle = `New ${displayName} Draw #${event_number}`;
    const pushBody = m_numbers
      ? `Draw: ${numbersStr} | Machine: ${m_numbers.join(', ')}`
      : `Draw: ${numbersStr}`;

    // Fire & forget — don't block the response
    sendPushToAll(pushTitle, pushBody, {
      type: 'new_draw',
      source,
      event_number,
    }).then((result) => {
      console.log(`[admin] Push sent: ${result.sent} ok, ${result.failed} failed`);
    }).catch((err) => {
      console.error('[admin] Push error:', err);
    });

    res.status(201).json({
      message: `Draw #${event_number} for ${displayName} added successfully`,
      draw_id: drawId,
    });
  } catch (err) {
    console.error('Error adding draw:', err);
    res.status(500).json({ error: 'Failed to add draw' });
  }
});

/**
 * GET /api/admin/draws/latest
 * Get the latest event number for each source (for auto-incrementing in the admin UI).
 */
router.get('/draws/latest', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const latest = await dbAll(`
      SELECT source, MAX(event_number) as latest_event
      FROM draws
      GROUP BY source
      ORDER BY source
    `);
    res.json(latest);
  } catch (err) {
    console.error('Error fetching latest draws:', err);
    res.status(500).json({ error: 'Failed to fetch latest draw numbers' });
  }
});

/**
 * POST /api/admin/push-token
 * Register a device push token for notifications.
 * Body: { token: string, platform?: string }
 */
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Push token is required' });
      return;
    }

    // Upsert — update platform if token already exists
    await dbRun(
      'INSERT INTO push_tokens (token, platform) VALUES (?, ?) ON CONFLICT (token) DO UPDATE SET platform = EXCLUDED.platform',
      [token, platform || 'unknown']
    ).catch(() => {});

    res.json({ message: 'Push token registered' });
  } catch (err) {
    console.error('Error registering push token:', err);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

export default router;
