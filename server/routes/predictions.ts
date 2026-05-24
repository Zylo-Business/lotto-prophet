import { Router, type Request, type Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db/db.js';
import { authenticate } from '../middlewares/auth.js';

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

const router = Router();

/**
 * GET /api/predictions
 * Returns all published predictions. For paid ones the current user hasn't
 * purchased, numbers are hidden and is_unlocked = false.
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const rows = await dbAll(
      `SELECT id, title, game_name, draw_date, numbers, machine_numbers, notes,
              prediction_type, price, created_at
       FROM admin_predictions
       WHERE is_published = 1
       ORDER BY draw_date DESC, created_at DESC
       LIMIT 50`,
    );

    // Fetch which paid predictions this user already owns
    const purchasedIds = new Set<number>();
    if (userId) {
      const purchases = await dbAll(
        `SELECT prediction_id FROM prediction_purchases WHERE user_id = ?`,
        [userId],
      );
      purchases.forEach((p: any) => purchasedIds.add(p.prediction_id));
    }

    const result = rows.map((p: any) => {
      const isPaid = p.prediction_type === 'paid';
      const unlocked = !isPaid || purchasedIds.has(p.id);
      return {
        ...p,
        is_unlocked: unlocked,
        numbers: unlocked ? p.numbers : null,
        machine_numbers: unlocked ? p.machine_numbers : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching predictions:', err);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

/**
 * POST /api/predictions/:id/purchase
 * Records that the current user has purchased a paid prediction.
 * (Payment processing is handled externally; this endpoint is called
 * after a successful payment to unlock the prediction.)
 */
router.post('/:id/purchase', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const predId = Number(req.params.id);
    const prediction = await dbGet(
      `SELECT id, prediction_type, price FROM admin_predictions WHERE id = ? AND is_published = 1`,
      [predId],
    );
    if (!prediction) { res.status(404).json({ error: 'Prediction not found' }); return; }
    if (prediction.prediction_type !== 'paid') {
      res.status(400).json({ error: 'This prediction is free' }); return;
    }

    // Idempotent — ignore duplicate
    await dbRun(
      `INSERT INTO prediction_purchases (user_id, prediction_id, amount_paid)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, prediction_id) DO NOTHING`,
      [userId, predId, prediction.price],
    );

    const updated = await dbGet(
      `SELECT id, title, game_name, draw_date, numbers, machine_numbers, notes, prediction_type, price, created_at
       FROM admin_predictions WHERE id = ?`,
      [predId],
    );
    res.json({ ...updated, is_unlocked: true });
  } catch (err) {
    console.error('Error purchasing prediction:', err);
    res.status(500).json({ error: 'Failed to purchase prediction' });
  }
});

export default router;
