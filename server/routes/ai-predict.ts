import { Router, type Request, type Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { dbAll } from '../db/db.js';
import { GT_STRATEGY } from '../analysis/gt-strategy.js';

const router = Router();

// ─── Gemini setup ───────────────────────────────────────────────────

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function getModel() {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and set it as an environment variable.',
    );
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDrawsForPrompt(
  draws: Record<string, any>[],
  source: string,
): string {
  const header = `Last ${draws.length} draws for "${source}" (latest first):\n`;
  const rows = draws.map(
    (d) =>
      `EV${d.event_number} | ${d.date} | N: ${d.N1},${d.N2},${d.N3},${d.N4},${d.N5} | M: ${d.M1 ?? '-'},${d.M2 ?? '-'},${d.M3 ?? '-'},${d.M4 ?? '-'},${d.M5 ?? '-'}`,
  );
  return header + rows.join('\n');
}

function buildPrompt(drawsText: string): string {
  return `You are a Ghana 5/90 lottery analysis AI operating under the Game Theory (GT) ruleset below.

=== STRATEGY DOCUMENT (LOCKED) ===
${GT_STRATEGY}
=== END STRATEGY ===

=== DRAW DATA ===
${drawsText}
=== END DRAW DATA ===

TASK:
1. Analyse the last 50 draws using the GT process flow (steps 1-7 from the strategy).
2. Identify structural validity patterns (W-M relationships).
3. Apply conversion whitelist rules.
4. Apply number-difference logic (±1 to ±4).
5. Generate your NEXT DRAW prediction.

OUTPUT FORMAT (strict JSON only, no markdown fences):
{
  "predicted_numbers": [n1, n2, n3, n4, n5],
  "confidence": "low" | "medium" | "high",
  "reasoning": "Brief explanation of the GT patterns found and why these numbers were chosen",
  "structural_pattern": "The W-M structural pattern identified (e.g. W[1,2] M[1])",
  "conversion_applied": true | false,
  "difference_applied": "+2" | "-1" | "none" | etc
}

RULES:
- Numbers must be between 1 and 90
- Return exactly 5 numbers in natural order (do NOT sort ascending/descending)
- Keep reasoning concise (2-3 sentences max)
- ONLY output valid JSON, nothing else`;
}

// ─── Route ──────────────────────────────────────────────────────────

/**
 * POST /api/ai-predict/:source
 *
 * Body (optional): { limit?: number }
 *
 * Fetches last N draws (default 50), sends to Gemini with the GT strategy,
 * returns the AI prediction.
 */
router.post('/:source', async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const limit = Math.max(10, Math.min(200, parseInt(req.body?.limit) || 50));

    // Fetch draws
    const rows = await dbAll(
      `SELECT * FROM v_draws_flat WHERE source = ? ORDER BY event_number DESC LIMIT ${limit}`,
      [source],
    );

    if (rows.length < 5) {
      return res.status(400).json({
        error: `Not enough draws for "${source}". Need at least 5, found ${rows.length}.`,
      });
    }

    // Build prompt
    const drawsText = formatDrawsForPrompt(rows, source);
    const prompt = buildPrompt(drawsText);

    // Call Gemini
    const model = getModel();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON from response (strip markdown fences if any)
    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
    let prediction: any;
    try {
      prediction = JSON.parse(jsonStr);
    } catch {
      return res.status(502).json({
        error: 'AI returned invalid JSON',
        raw: text,
      });
    }

    // Validate numbers
    const nums: number[] = prediction.predicted_numbers;
    if (
      !Array.isArray(nums) ||
      nums.length !== 5 ||
      nums.some((n: any) => typeof n !== 'number' || n < 1 || n > 90)
    ) {
      return res.status(502).json({
        error: 'AI returned invalid numbers',
        raw: prediction,
      });
    }

    res.json({
      source,
      draws_used: rows.length,
      latest_event: rows[0]?.event_number,
      prediction: {
        numbers: nums,
        confidence: prediction.confidence || 'medium',
        reasoning: prediction.reasoning || '',
        structural_pattern: prediction.structural_pattern || '',
        conversion_applied: prediction.conversion_applied ?? false,
        difference_applied: prediction.difference_applied || 'none',
      },
      strategy_version: 'GT-v1',
    });
  } catch (err: any) {
    console.error('Error in ai-predict:', err);
    const message =
      err.message?.includes('GEMINI_API_KEY')
        ? err.message
        : 'Failed to generate AI prediction';
    res.status(500).json({ error: message });
  }
});

export default router;
