import { Router, type Request, type Response } from 'express';
import { dbAll, dbGet } from '../db/db.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// ─── Level metadata ───
const LEVELS: Record<number, { name: string; color: string; icon: string }> = {
  1: { name: 'Foundation',         color: '#10B981', icon: '🎓' },
  2: { name: 'Lapping',            color: '#F59E0B', icon: '🔄' },
  3: { name: 'Game Theory with AI', color: '#6C63FF', icon: '🤖' },
};

/**
 * GET /api/university/levels
 * Returns all university levels with course counts.
 */
router.get('/levels', async (_req: Request, res: Response) => {
  try {
    const courses = await dbAll(`
      SELECT
        level,
        level_name,
        COUNT(*) as course_count,
        SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published_count
      FROM courses
      GROUP BY level, level_name
      ORDER BY level
    `);

    const levels = courses.map((c: any) => ({
      level: c.level,
      name: c.level_name,
      course_count: c.course_count,
      published_count: c.published_count,
      color: LEVELS[c.level]?.color || '#6B7280',
      icon: LEVELS[c.level]?.icon || '📚',
    }));

    res.json(levels);
  } catch (err) {
    console.error('Error fetching university levels:', err);
    res.status(500).json({ error: 'Failed to fetch university levels' });
  }
});

/**
 * GET /api/university/courses
 * Returns all published courses grouped by level.
 */
router.get('/courses', async (_req: Request, res: Response) => {
  try {
    const courses = await dbAll(`
      SELECT c.*,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.is_published = 1) as lesson_count
      FROM courses c
      WHERE c.is_published = 1
      ORDER BY c.sort_order, c.level
    `);

    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

/**
 * GET /api/university/courses/:slug
 * Returns a single course with its lessons.
 */
router.get('/courses/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const course = await dbGet(
      'SELECT * FROM courses WHERE slug = ? AND is_published = 1',
      [slug]
    );

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const lessons = await dbAll(
      `SELECT id, course_id, title, slug, sort_order, is_published, created_at
       FROM lessons
       WHERE course_id = ? AND is_published = 1
       ORDER BY sort_order`,
      [course.id]
    );

    res.json({ ...course, lessons });
  } catch (err) {
    console.error('Error fetching course:', err);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

/**
 * GET /api/university/lessons/:courseSlug/:lessonSlug
 * Returns a single lesson with full content.
 */
router.get('/lessons/:courseSlug/:lessonSlug', async (req: Request, res: Response) => {
  try {
    const { courseSlug, lessonSlug } = req.params;

    const lesson = await dbGet(`
      SELECT l.*, c.title as course_title, c.slug as course_slug, c.level, c.level_name
      FROM lessons l
      JOIN courses c ON l.course_id = c.id
      WHERE c.slug = ? AND l.slug = ? AND l.is_published = 1 AND c.is_published = 1
    `, [courseSlug, lessonSlug]);

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Get prev/next lessons for navigation
    const siblings = await dbAll(
      `SELECT id, title, slug, sort_order FROM lessons
       WHERE course_id = ? AND is_published = 1 ORDER BY sort_order`,
      [lesson.course_id]
    );

    const currentIndex = siblings.findIndex((s: any) => s.id === lesson.id);
    const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null;
    const next = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

    res.json({ ...lesson, prev, next });
  } catch (err) {
    console.error('Error fetching lesson:', err);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

/**
 * GET /api/university/progress
 * Returns the authenticated user's completed lessons.
 */
router.get('/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const progress = await dbAll(
      `SELECT up.lesson_id, up.completed_at, l.course_id
       FROM user_progress up
       JOIN lessons l ON up.lesson_id = l.id
       WHERE up.user_id = ?`,
      [userId]
    );
    res.json(progress);
  } catch (err) {
    console.error('Error fetching progress:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

/**
 * POST /api/university/progress/:lessonId
 * Marks a lesson as completed for the authenticated user.
 */
router.post('/progress/:lessonId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const lessonId = parseInt(req.params.lessonId);

    if (isNaN(lessonId)) {
      return res.status(400).json({ error: 'Invalid lesson ID' });
    }

    // Verify lesson exists
    const lesson = await dbGet('SELECT id FROM lessons WHERE id = ?', [lessonId]);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Upsert progress (ignore duplicate)
    await dbGet(
      `INSERT INTO user_progress (user_id, lesson_id) VALUES (?, ?) ON CONFLICT DO NOTHING`,
      [userId, lessonId]
    );

    res.json({ message: 'Lesson marked as completed' });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

export default router;
