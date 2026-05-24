import { Router, type Request, type Response } from 'express';
import fs from 'fs';
import { dbRun, dbAll, dbGet } from '../db/db.js';
import { authenticateAdmin, type AuthRequest } from '../middlewares/auth.js';
import { sendPushToAll } from '../utils/push.js';
import { lessonFileUpload } from '../middlewares/upload.js';

const router = Router();

const DISPLAY_NAMES: Record<string, string> = {
  lucky: 'Lucky Tuesday',
  alpha: 'Alpha Lotto',
};

function getDisplayName(source: string): string {
  return DISPLAY_NAMES[source.toLowerCase()] ?? source;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Stats ───────────────────────────────────────────────────────────────────

router.get('/stats', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [users, draws, courses, lessons, groups, posts, pushTokens] = await Promise.all([
      dbGet('SELECT COUNT(*) as count FROM users'),
      dbGet('SELECT COUNT(*) as count FROM draws'),
      dbGet('SELECT COUNT(*) as count FROM courses'),
      dbGet('SELECT COUNT(*) as count FROM lessons'),
      dbGet('SELECT COUNT(*) as count FROM community_groups'),
      dbGet('SELECT COUNT(*) as count FROM community_group_posts'),
      dbGet('SELECT COUNT(*) as count FROM push_tokens'),
    ]);

    const drawsBySrc = await dbAll(
      'SELECT source, COUNT(*) as count FROM draws GROUP BY source ORDER BY source',
    );

    res.json({
      users: Number(users?.count ?? 0),
      draws: Number(draws?.count ?? 0),
      courses: Number(courses?.count ?? 0),
      lessons: Number(lessons?.count ?? 0),
      groups: Number(groups?.count ?? 0),
      posts: Number(posts?.count ?? 0),
      push_tokens: Number(pushTokens?.count ?? 0),
      draws_by_source: drawsBySrc.map((r) => ({ source: r.source, count: Number(r.count) })),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── Draws ───────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/draws
 * Add a new draw result. Sends push notification to all users.
 */
router.post('/draws', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { source, event_number, date, n_numbers, m_numbers } = req.body;

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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
      return;
    }

    const existing = await dbGet(
      'SELECT d.id FROM draws d JOIN days dy ON d.day_id = dy.id WHERE d.event_number = ? AND d.source = ?',
      [event_number, source],
    );
    if (existing) {
      res.status(409).json({ error: `Draw #${event_number} for ${source} already exists` });
      return;
    }

    const dateObj = new Date(date + 'T00:00:00');
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const weekday = dateObj.getDay();
    const weekday_name = WEEKDAY_NAMES[weekday];

    let dayRow = await dbGet('SELECT id FROM days WHERE date = ?', [date]);
    if (!dayRow) {
      const result = await dbRun(
        'INSERT INTO days (date, year, month, day, weekday, weekday_name) VALUES (?, ?, ?, ?, ?, ?)',
        [date, year, month, day, weekday, weekday_name],
      );
      dayRow = { id: result.lastID };
    }

    const drawResult = await dbRun(
      'INSERT INTO draws (event_number, day_id, source) VALUES (?, ?, ?)',
      [event_number, dayRow.id, source],
    );
    const drawId = drawResult.lastID;

    const nSetResult = await dbRun('INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)', [drawId, 'N']);
    for (let i = 0; i < 5; i++) {
      await dbRun('INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)', [nSetResult.lastID, i + 1, n_numbers[i]]);
    }

    if (m_numbers) {
      const mSetResult = await dbRun('INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)', [drawId, 'M']);
      for (let i = 0; i < 5; i++) {
        await dbRun('INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)', [mSetResult.lastID, i + 1, m_numbers[i]]);
      }
    }

    const displayName = getDisplayName(source);
    sendPushToAll(
      `New ${displayName} Draw #${event_number}`,
      m_numbers
        ? `Draw: ${n_numbers.join(', ')} | Machine: ${m_numbers.join(', ')}`
        : `Draw: ${n_numbers.join(', ')}`,
      { type: 'new_draw', source, event_number },
    ).then((r) => console.log(`[admin] Push: ${r.sent} ok, ${r.failed} failed`))
      .catch((e) => console.error('[admin] Push error:', e));

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
 */
router.get('/draws/latest', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const latest = await dbAll(
      'SELECT source, MAX(event_number) as latest_event FROM draws GROUP BY source ORDER BY source',
    );
    res.json(latest);
  } catch (err) {
    console.error('Error fetching latest draws:', err);
    res.status(500).json({ error: 'Failed to fetch latest draw numbers' });
  }
});

/**
 * GET /api/admin/draws/all?sources=src1,src2&limit=&offset=
 */
router.get('/draws/all', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sourcesParam = req.query.sources as string | undefined;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const filters: string[] = [];
    const params: any[] = [];
    if (sourcesParam) {
      const sources = sourcesParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (sources.length === 1) {
        filters.push('source = ?');
        params.push(sources[0]);
      } else if (sources.length > 1) {
        filters.push(`source IN (${sources.map(() => '?').join(', ')})`);
        params.push(...sources);
      }
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const countRow = await dbGet(`SELECT COUNT(*) as count FROM v_draws_flat ${where}`, params);
    const draws = await dbAll(
      `SELECT * FROM v_draws_flat ${where} ORDER BY event_number DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    res.json({ total: Number(countRow?.count ?? 0), limit, offset, draws });
  } catch (err) {
    console.error('Error fetching all draws:', err);
    res.status(500).json({ error: 'Failed to fetch draws' });
  }
});

/**
 * DELETE /api/admin/draws/:id
 */
router.delete('/draws/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: 'Invalid draw ID' }); return; }

    const draw = await dbGet('SELECT id FROM draws WHERE id = ?', [id]);
    if (!draw) { res.status(404).json({ error: 'Draw not found' }); return; }

    await dbRun('DELETE FROM draws WHERE id = ?', [id]);
    res.json({ message: 'Draw deleted' });
  } catch (err) {
    console.error('Error deleting draw:', err);
    res.status(500).json({ error: 'Failed to delete draw' });
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users?search=&limit=&offset=
 */
router.get('/users', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const search = (req.query.search as string) || '';
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const likeParam = `%${search}%`;
    const where = search
      ? 'WHERE firstname ILIKE ? OR surname ILIKE ? OR email ILIKE ?'
      : '';
    const params = search ? [likeParam, likeParam, likeParam] : [];

    const countRow = await dbGet(
      `SELECT COUNT(*) as count FROM users ${where}`,
      params,
    );
    const users = await dbAll(
      `SELECT id, firstname, surname, email, country_code, mobile_number, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    res.json({ total: Number(countRow?.count ?? 0), limit, offset, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: 'Invalid user ID' }); return; }

    const user = await dbGet('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    await dbRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── Community ───────────────────────────────────────────────────────────────

/**
 * GET /api/admin/community/groups?limit=&offset=
 */
router.get('/community/groups', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const countRow = await dbGet('SELECT COUNT(*) as count FROM community_groups');
    const groups = await dbAll(
      `SELECT g.*, u.firstname, u.surname,
        (SELECT COUNT(*) FROM community_group_members gm WHERE gm.group_id = g.id) AS member_count,
        (SELECT COUNT(*) FROM community_group_posts gp WHERE gp.group_id = g.id) AS post_count
       FROM community_groups g
       JOIN users u ON u.id = g.owner_id
       ORDER BY g.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
    );

    res.json({ total: Number(countRow?.count ?? 0), limit, offset, groups });
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

/**
 * DELETE /api/admin/community/groups/:id
 */
router.delete('/community/groups/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: 'Invalid group ID' }); return; }

    await dbRun('DELETE FROM community_groups WHERE id = ?', [id]);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

/**
 * GET /api/admin/community/posts?limit=&offset=
 */
router.get('/community/posts', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const countRow = await dbGet('SELECT COUNT(*) as count FROM community_group_posts');
    const posts = await dbAll(
      `SELECT p.*, u.firstname, u.surname, g.name AS group_name,
        (SELECT COUNT(*) FROM community_post_comments c WHERE c.post_id = p.id) AS comment_count
       FROM community_group_posts p
       JOIN users u ON u.id = p.user_id
       JOIN community_groups g ON g.id = p.group_id
       ORDER BY p.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
    );

    res.json({ total: Number(countRow?.count ?? 0), limit, offset, posts });
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * DELETE /api/admin/community/posts/:id
 */
router.delete('/community/posts/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: 'Invalid post ID' }); return; }

    await dbRun('DELETE FROM community_group_posts WHERE id = ?', [id]);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ─── University ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/university/courses
 */
router.get('/university/courses', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const courses = await dbAll(
      `SELECT c.*,
        (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count
       FROM courses c
       ORDER BY c.sort_order, c.level`,
    );
    res.json(courses);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

/**
 * POST /api/admin/university/courses
 */
router.post('/university/courses', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { level, level_name, title, slug, description, icon, sort_order, is_published } = req.body;
    if (!level || !title || !slug) {
      res.status(400).json({ error: 'level, title and slug are required' });
      return;
    }
    const result = await dbRun(
      'INSERT INTO courses (level, level_name, title, slug, description, icon, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [level, level_name || '', title, slug, description || null, icon || '📚', sort_order || 0, is_published ? 1 : 0],
    );
    const course = await dbGet('SELECT * FROM courses WHERE id = ?', [result.lastID]);
    res.status(201).json(course);
  } catch (err) {
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

/**
 * PUT /api/admin/university/courses/:id
 */
router.put('/university/courses/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { level, level_name, title, slug, description, icon, sort_order, is_published } = req.body;

    await dbRun(
      'UPDATE courses SET level = ?, level_name = ?, title = ?, slug = ?, description = ?, icon = ?, sort_order = ?, is_published = ? WHERE id = ?',
      [level, level_name, title, slug, description, icon, sort_order, is_published ? 1 : 0, id],
    );
    const course = await dbGet('SELECT * FROM courses WHERE id = ?', [id]);
    res.json(course);
  } catch (err) {
    console.error('Error updating course:', err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

/**
 * DELETE /api/admin/university/courses/:id
 */
router.delete('/university/courses/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await dbRun('DELETE FROM courses WHERE id = ?', [id]);
    res.json({ message: 'Course deleted' });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

/**
 * GET /api/admin/university/courses/:id/lessons
 */
router.get('/university/courses/:id/lessons', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Number(req.params.id);
    const lessons = await dbAll(
      'SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order',
      [courseId],
    );
    res.json(lessons);
  } catch (err) {
    console.error('Error fetching lessons:', err);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

/**
 * POST /api/admin/university/lessons
 */
router.post('/university/lessons', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { course_id, title, slug, content, sort_order, is_published } = req.body;
    if (!course_id || !title || !slug) {
      res.status(400).json({ error: 'course_id, title and slug are required' });
      return;
    }
    const result = await dbRun(
      'INSERT INTO lessons (course_id, title, slug, content, sort_order, is_published) VALUES (?, ?, ?, ?, ?, ?)',
      [course_id, title, slug, content || null, sort_order || 0, is_published ? 1 : 0],
    );
    const lesson = await dbGet('SELECT * FROM lessons WHERE id = ?', [result.lastID]);
    res.status(201).json(lesson);
  } catch (err) {
    console.error('Error creating lesson:', err);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

/**
 * PUT /api/admin/university/lessons/:id
 */
router.put('/university/lessons/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { title, slug, content, sort_order, is_published } = req.body;

    await dbRun(
      'UPDATE lessons SET title = ?, slug = ?, content = ?, sort_order = ?, is_published = ? WHERE id = ?',
      [title, slug, content, sort_order, is_published ? 1 : 0, id],
    );
    const lesson = await dbGet('SELECT * FROM lessons WHERE id = ?', [id]);
    res.json(lesson);
  } catch (err) {
    console.error('Error updating lesson:', err);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

/**
 * DELETE /api/admin/university/lessons/:id
 */
router.delete('/university/lessons/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await dbRun('DELETE FROM lessons WHERE id = ?', [id]);
    res.json({ message: 'Lesson deleted' });
  } catch (err) {
    console.error('Error deleting lesson:', err);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// ─── Draws — Edit ────────────────────────────────────────────────────────────

/**
 * PUT /api/admin/draws/:id
 */
router.put('/draws/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: 'Invalid draw ID' }); return; }

    const { event_number, date, source, n_numbers, m_numbers } = req.body;

    if (!n_numbers || !Array.isArray(n_numbers) || n_numbers.length !== 5) {
      res.status(400).json({ error: 'n_numbers must be an array of exactly 5 numbers' }); return;
    }
    if (m_numbers && (!Array.isArray(m_numbers) || m_numbers.length !== 5)) {
      res.status(400).json({ error: 'm_numbers must be an array of exactly 5 numbers' }); return;
    }
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'date must be in YYYY-MM-DD format' }); return;
    }

    const draw = await dbGet('SELECT * FROM draws WHERE id = ?', [id]);
    if (!draw) { res.status(404).json({ error: 'Draw not found' }); return; }

    let dayId = draw.day_id;
    if (date) {
      const dateObj = new Date(date + 'T00:00:00');
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const weekday = dateObj.getDay();
      const weekday_name = WEEKDAY_NAMES[weekday];

      let dayRow = await dbGet('SELECT id FROM days WHERE date = ?', [date]);
      if (!dayRow) {
        const result = await dbRun(
          'INSERT INTO days (date, year, month, day, weekday, weekday_name) VALUES (?, ?, ?, ?, ?, ?)',
          [date, year, month, day, weekday, weekday_name],
        );
        dayRow = { id: result.lastID };
      }
      dayId = dayRow.id;
    }

    await dbRun(
      'UPDATE draws SET event_number = ?, day_id = ?, source = ? WHERE id = ?',
      [event_number ?? draw.event_number, dayId, source ?? draw.source, id],
    );

    // Delete existing number_sets (cascades to numbers)
    const sets = await dbAll('SELECT id FROM number_sets WHERE draw_id = ?', [id]);
    for (const s of sets) {
      await dbRun('DELETE FROM numbers WHERE number_set_id = ?', [s.id]);
    }
    await dbRun('DELETE FROM number_sets WHERE draw_id = ?', [id]);

    // Re-insert fresh
    const nSetResult = await dbRun('INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)', [id, 'N']);
    for (let i = 0; i < 5; i++) {
      await dbRun('INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)', [nSetResult.lastID, i + 1, n_numbers[i]]);
    }
    if (m_numbers) {
      const mSetResult = await dbRun('INSERT INTO number_sets (draw_id, set_type) VALUES (?, ?)', [id, 'M']);
      for (let i = 0; i < 5; i++) {
        await dbRun('INSERT INTO numbers (number_set_id, position, value) VALUES (?, ?, ?)', [mSetResult.lastID, i + 1, m_numbers[i]]);
      }
    }

    const updatedDraw = await dbGet(
      'SELECT * FROM v_draws_flat WHERE source = ? AND event_number = ?',
      [source ?? draw.source, event_number ?? draw.event_number],
    );
    res.json(updatedDraw);
  } catch (err) {
    console.error('Error updating draw:', err);
    res.status(500).json({ error: 'Failed to update draw' });
  }
});

// ─── University — Enrollments ─────────────────────────────────────────────────

/**
 * GET /api/admin/university/courses/:id/enrollments
 */
router.get('/university/courses/:id/enrollments', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Number(req.params.id);
    const enrollments = await dbAll(
      `SELECT ce.*, u.firstname, u.surname, u.email
       FROM course_enrollments ce
       JOIN users u ON u.id = ce.user_id
       WHERE ce.course_id = ?
       ORDER BY ce.enrolled_at DESC`,
      [courseId],
    );
    res.json(enrollments);
  } catch (err) {
    console.error('Error fetching enrollments:', err);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

/**
 * POST /api/admin/university/courses/:id/enrollments
 */
router.post('/university/courses/:id/enrollments', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = Number(req.params.id);
    let { user_id, email } = req.body;

    if (!user_id && !email) {
      res.status(400).json({ error: 'user_id or email is required' }); return;
    }

    if (!user_id && email) {
      const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
      if (!user) { res.status(404).json({ error: 'User not found' }); return; }
      user_id = user.id;
    }

    try {
      const result = await dbRun(
        'INSERT INTO course_enrollments (course_id, user_id) VALUES (?, ?)',
        [courseId, user_id],
      );
      const enrollment = await dbGet(
        `SELECT ce.*, u.firstname, u.surname, u.email
         FROM course_enrollments ce
         JOIN users u ON u.id = ce.user_id
         WHERE ce.id = ?`,
        [result.lastID],
      );
      res.status(201).json(enrollment);
    } catch (insertErr: any) {
      if (insertErr?.message?.includes('unique') || insertErr?.code === '23505') {
        res.status(409).json({ error: 'User is already enrolled in this course' }); return;
      }
      throw insertErr;
    }
  } catch (err) {
    console.error('Error enrolling user:', err);
    res.status(500).json({ error: 'Failed to enroll user' });
  }
});

/**
 * DELETE /api/admin/university/enrollments/:id
 */
router.delete('/university/enrollments/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await dbRun('DELETE FROM course_enrollments WHERE id = ?', [id]);
    res.json({ message: 'Enrollment deleted' });
  } catch (err) {
    console.error('Error deleting enrollment:', err);
    res.status(500).json({ error: 'Failed to delete enrollment' });
  }
});

// ─── University — Lesson Media ────────────────────────────────────────────────

/**
 * GET /api/admin/university/lessons/:id/media
 */
router.get('/university/lessons/:id/media', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const lessonId = Number(req.params.id);
    const media = await dbAll(
      'SELECT * FROM lesson_media WHERE lesson_id = ? ORDER BY sort_order, id',
      [lessonId],
    );
    res.json(media);
  } catch (err) {
    console.error('Error fetching lesson media:', err);
    res.status(500).json({ error: 'Failed to fetch lesson media' });
  }
});

/**
 * POST /api/admin/university/lessons/:id/media
 */
router.post('/university/lessons/:id/media', authenticateAdmin, (req: AuthRequest, res: Response) => {
  lessonFileUpload(req as any, res as any, async (uploadErr) => {
    if (uploadErr) {
      res.status(400).json({ error: uploadErr.message }); return;
    }
    try {
      const lessonId = Number(req.params.id);
      const { title, media_type, url, sort_order } = req.body;

      if (!title) { res.status(400).json({ error: 'title is required' }); return; }
      if (!media_type || !['video', 'file'].includes(media_type)) {
        res.status(400).json({ error: 'media_type must be "video" or "file"' }); return;
      }

      let fileUrl = url || '';
      if ((req as any).file) {
        fileUrl = `/uploads/lessons/${(req as any).file.filename}`;
      }

      if (!fileUrl) { res.status(400).json({ error: 'url or file is required' }); return; }

      const result = await dbRun(
        'INSERT INTO lesson_media (lesson_id, media_type, title, url, sort_order) VALUES (?, ?, ?, ?, ?)',
        [lessonId, media_type, title, fileUrl, Number(sort_order) || 0],
      );
      const media = await dbGet('SELECT * FROM lesson_media WHERE id = ?', [result.lastID]);
      res.status(201).json(media);
    } catch (err) {
      console.error('Error adding lesson media:', err);
      res.status(500).json({ error: 'Failed to add lesson media' });
    }
  });
});

/**
 * DELETE /api/admin/university/media/:id
 */
router.delete('/university/media/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const media = await dbGet('SELECT * FROM lesson_media WHERE id = ?', [id]);
    if (!media) { res.status(404).json({ error: 'Media not found' }); return; }

    // Delete file from disk if it's an uploaded lesson file
    if (media.url && media.url.startsWith('/uploads/lessons/')) {
      const filePath = media.url.slice(1); // remove leading slash
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (fileErr) {
        console.warn('Could not delete media file:', fileErr);
      }
    }

    await dbRun('DELETE FROM lesson_media WHERE id = ?', [id]);
    res.json({ message: 'Media deleted' });
  } catch (err) {
    console.error('Error deleting media:', err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// ─── Push Notifications ──────────────────────────────────────────────────────

/**
 * POST /api/admin/push-token
 * Register a device push token for notifications.
 */
router.post('/push-token', async (req: Request, res: Response) => {
  try {
    const { token, platform } = req.body;
    if (!token) { res.status(400).json({ error: 'Push token is required' }); return; }

    await dbRun(
      'INSERT INTO push_tokens (token, platform) VALUES (?, ?) ON CONFLICT (token) DO UPDATE SET platform = EXCLUDED.platform',
      [token, platform || 'unknown'],
    ).catch(() => {});

    res.json({ message: 'Push token registered' });
  } catch (err) {
    console.error('Error registering push token:', err);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * GET /api/admin/push-tokens?limit=&offset=
 */
router.get('/push-tokens', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);

    const countRow = await dbGet('SELECT COUNT(*) as count FROM push_tokens');
    const tokens = await dbAll(
      `SELECT pt.*, u.firstname, u.surname, u.email
       FROM push_tokens pt
       LEFT JOIN users u ON u.id = pt.user_id
       ORDER BY pt.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
    );

    res.json({ total: Number(countRow?.count ?? 0), limit, offset, tokens });
  } catch (err) {
    console.error('Error fetching push tokens:', err);
    res.status(500).json({ error: 'Failed to fetch push tokens' });
  }
});

/**
 * DELETE /api/admin/push-tokens/:id
 */
router.delete('/push-tokens/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await dbRun('DELETE FROM push_tokens WHERE id = ?', [id]);
    res.json({ message: 'Token deleted' });
  } catch (err) {
    console.error('Error deleting token:', err);
    res.status(500).json({ error: 'Failed to delete token' });
  }
});

/**
 * POST /api/admin/notifications/broadcast
 * Broadcast a custom push notification to all registered devices.
 */
router.post('/notifications/broadcast', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, data } = req.body;
    if (!title || !body) {
      res.status(400).json({ error: 'title and body are required' });
      return;
    }

    const result = await sendPushToAll(title, body, data || {});
    res.json({ message: `Notification sent`, sent: result.sent, failed: result.failed });
  } catch (err) {
    console.error('Error broadcasting notification:', err);
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
});

// ─── Admin Predictions ───────────────────────────────────────────────────────

/**
 * GET /api/admin/predictions
 */
router.get('/predictions', authenticateAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await dbAll(
      `SELECT p.*, u.firstname || ' ' || u.surname AS created_by_name
       FROM admin_predictions p
       LEFT JOIN users u ON u.id = p.created_by
       ORDER BY p.draw_date DESC, p.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching predictions:', err);
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

/**
 * POST /api/admin/predictions
 */
router.post('/predictions', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { title, game_name, draw_date, numbers, machine_numbers, notes, is_published, prediction_type, price } = req.body;
    if (!title || !game_name || !draw_date || !numbers) {
      res.status(400).json({ error: 'title, game_name, draw_date, and numbers are required' }); return;
    }
    const type = prediction_type === 'paid' ? 'paid' : 'free';
    const priceVal = type === 'paid' ? (parseFloat(price) || 0) : 0;
    const result = await dbRun(
      `INSERT INTO admin_predictions (title, game_name, draw_date, numbers, machine_numbers, notes, is_published, prediction_type, price, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, game_name, draw_date, JSON.stringify(numbers), machine_numbers ? JSON.stringify(machine_numbers) : null, notes || null, is_published !== false ? 1 : 0, type, priceVal, req.user?.id ?? null],
    );
    const created = await dbGet('SELECT * FROM admin_predictions WHERE id = ?', [result.lastID]);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating prediction:', err);
    res.status(500).json({ error: 'Failed to create prediction' });
  }
});

/**
 * PUT /api/admin/predictions/:id
 */
router.put('/predictions/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { title, game_name, draw_date, numbers, machine_numbers, notes, is_published, prediction_type, price } = req.body;
    const existing = await dbGet('SELECT id FROM admin_predictions WHERE id = ?', [id]);
    if (!existing) { res.status(404).json({ error: 'Prediction not found' }); return; }
    const type = prediction_type === 'paid' ? 'paid' : 'free';
    const priceVal = type === 'paid' ? (parseFloat(price) || 0) : 0;
    await dbRun(
      `UPDATE admin_predictions SET title=?, game_name=?, draw_date=?, numbers=?, machine_numbers=?, notes=?, is_published=?, prediction_type=?, price=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [title, game_name, draw_date, JSON.stringify(numbers), machine_numbers ? JSON.stringify(machine_numbers) : null, notes || null, is_published !== false ? 1 : 0, type, priceVal, id],
    );
    const updated = await dbGet('SELECT * FROM admin_predictions WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    console.error('Error updating prediction:', err);
    res.status(500).json({ error: 'Failed to update prediction' });
  }
});

/**
 * DELETE /api/admin/predictions/:id
 */
router.delete('/predictions/:id', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    await dbRun('DELETE FROM admin_predictions WHERE id = ?', [id]);
    res.json({ message: 'Prediction deleted' });
  } catch (err) {
    console.error('Error deleting prediction:', err);
    res.status(500).json({ error: 'Failed to delete prediction' });
  }
});

// ─── Subscription Management ─────────────────────────────────────────────────

/**
 * PUT /api/admin/users/:id/subscription
 */
router.put('/users/:id/subscription', authenticateAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { subscription_plan, subscription_expires_at } = req.body;
    if (!subscription_plan) { res.status(400).json({ error: 'subscription_plan is required' }); return; }
    const valid = ['free', 'basic', 'pro', 'premium'];
    if (!valid.includes(subscription_plan)) { res.status(400).json({ error: `plan must be one of: ${valid.join(', ')}` }); return; }
    await dbRun(
      `UPDATE users SET subscription_plan=?, subscription_expires_at=? WHERE id=?`,
      [subscription_plan, subscription_expires_at || null, id],
    );
    const user = await dbGet('SELECT id, firstname, surname, email, subscription_plan, subscription_expires_at FROM users WHERE id = ?', [id]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    console.error('Error updating subscription:', err);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

export default router;
