import { Router, type Request, type Response } from 'express';
import { authenticate, AuthRequest } from '../middlewares/auth.js';
import { dbRun, dbAll, dbGet } from '../db/db.js';

const router = Router();

async function getGroupMembership(groupId: number, userId: number) {
  return dbGet(`SELECT * FROM community_group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId]);
}

function userCanModerate(member: any) {
  return member && (member.role === 'owner' || member.role === 'moderator');
}

function userIsOwner(member: any) {
  return member && member.role === 'owner';
}

// Get groups (public + groups user belongs to)
router.get('/groups', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groups = await dbAll(
      `SELECT g.*,
              (SELECT COUNT(*) FROM community_group_members gm WHERE gm.group_id = g.id) AS member_count,
              (SELECT role FROM community_group_members gm4 WHERE gm4.group_id = g.id AND gm4.user_id = ?) AS my_role,
              (EXISTS(SELECT 1 FROM community_group_members gm2 WHERE gm2.group_id = g.id AND gm2.user_id = ?))::int AS is_member
       FROM community_groups g
       WHERE g.is_private = 0
          OR EXISTS(SELECT 1 FROM community_group_members gm3 WHERE gm3.group_id = g.id AND gm3.user_id = ?)
       ORDER BY g.created_at DESC`,
      [userId, userId, userId]
    );

    return res.json({ groups });
  } catch (error) {
    console.error('GET /groups error:', error);
    return res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

router.post('/groups', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, is_private, join_code } = req.body;
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ error: 'Group name should be at least 3 characters.' });
    }
    if (is_private && (!join_code || join_code.trim().length < 4)) {
      return res.status(400).json({ error: 'Private groups require a join code of at least 4 characters.' });
    }

    const result = await dbRun(
      `INSERT INTO community_groups (name, description, owner_id, is_private, join_code)
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), description?.trim() || '', userId, is_private ? 1 : 0, is_private ? join_code.trim() : null]
    );
    const groupId = result.lastID;

    await dbRun(
      `INSERT INTO community_group_members (group_id, user_id, role) VALUES (?, ?, 'owner')`,
      [groupId, userId]
    );

    const group = await dbGet(`SELECT * FROM community_groups WHERE id = ?`, [groupId]);
    return res.status(201).json({ group });
  } catch (error) {
    console.error('POST /groups error:', error);
    return res.status(500).json({ error: 'Failed to create group' });
  }
});

router.post('/groups/:groupId/join', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groupId = Number(req.params.groupId);
    const { join_code } = req.body;
    if (!groupId || Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const group = await dbGet(`SELECT * FROM community_groups WHERE id = ?`, [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const alreadyMember = await dbGet(
      `SELECT id FROM community_group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, userId]
    );
    if (alreadyMember) return res.status(200).json({ message: 'Already a member' });

    if (group.is_private) {
      if (!join_code || String(join_code).trim() === '') {
        return res.status(400).json({ error: 'Join code is required to join this private group.' });
      }
      if (String(join_code).trim() !== group.join_code) {
        return res.status(403).json({ error: 'Invalid join code.' });
      }
    }

    await dbRun(`INSERT INTO community_group_members (group_id, user_id) VALUES (?, ?)`, [groupId, userId]);
    return res.json({ message: 'Joined group successfully' });
  } catch (error) {
    console.error('POST /groups/:groupId/join error:', error);
    return res.status(500).json({ error: 'Failed to join group' });
  }
});

router.get('/groups/:groupId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groupId = Number(req.params.groupId);
    if (!groupId || Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const group = await dbGet(`SELECT * FROM community_groups WHERE id = ?`, [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const membership = await dbGet(`SELECT * FROM community_group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId]);
    if (group.is_private && !membership) {
      return res.status(403).json({ error: 'Access denied. Join the group first.' });
    }

    const members = await dbAll(`
      SELECT u.id, u.firstname, u.surname, u.email, m.joined_at, m.role
      FROM community_group_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.group_id = ?
      ORDER BY m.joined_at ASC
    `, [groupId]);

    return res.json({ group, members, my_role: membership?.role || null });
  } catch (error) {
    console.error('GET /groups/:groupId error:', error);
    return res.status(500).json({ error: 'Failed to fetch group details' });
  }
});

router.post('/groups/:groupId/members/:memberId/promote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const groupId = Number(req.params.groupId);
    const memberId = Number(req.params.memberId);
    if (!groupId || Number.isNaN(groupId) || !memberId || Number.isNaN(memberId)) return res.status(400).json({ error: 'Invalid IDs' });

    const requester = await getGroupMembership(groupId, userId);
    if (!userIsOwner(requester)) return res.status(403).json({ error: 'Only owner can promote members.' });

    const target = await getGroupMembership(groupId, memberId);
    if (!target) return res.status(404).json({ error: 'Member not found.' });
    if (target.role !== 'member') return res.status(400).json({ error: 'Only member can be promoted to moderator.' });

    await dbRun(`UPDATE community_group_members SET role = 'moderator' WHERE group_id = ? AND user_id = ?`, [groupId, memberId]);
    return res.json({ message: 'Promoted to moderator.' });
  } catch (error) {
    console.error('PROMOTE error:', error);
    return res.status(500).json({ error: 'Failed to promote member' });
  }
});

router.post('/groups/:groupId/members/:memberId/demote', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const groupId = Number(req.params.groupId);
    const memberId = Number(req.params.memberId);
    if (!groupId || Number.isNaN(groupId) || !memberId || Number.isNaN(memberId)) return res.status(400).json({ error: 'Invalid IDs' });

    const requester = await getGroupMembership(groupId, userId);
    if (!userIsOwner(requester)) return res.status(403).json({ error: 'Only owner can demote moderators.' });

    const target = await getGroupMembership(groupId, memberId);
    if (!target) return res.status(404).json({ error: 'Member not found.' });
    if (target.role !== 'moderator') return res.status(400).json({ error: 'Only moderator can be demoted.' });

    await dbRun(`UPDATE community_group_members SET role = 'member' WHERE group_id = ? AND user_id = ?`, [groupId, memberId]);
    return res.json({ message: 'Demoted to member.' });
  } catch (error) {
    console.error('DEMOTE error:', error);
    return res.status(500).json({ error: 'Failed to demote member' });
  }
});

router.post('/groups/:groupId/members/:memberId/ban', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const groupId = Number(req.params.groupId);
    const memberId = Number(req.params.memberId);
    if (!groupId || Number.isNaN(groupId) || !memberId || Number.isNaN(memberId)) return res.status(400).json({ error: 'Invalid IDs' });

    const requester = await getGroupMembership(groupId, userId);
    if (!userCanModerate(requester)) return res.status(403).json({ error: 'Only moderators/owners can ban members.' });

    const target = await getGroupMembership(groupId, memberId);
    if (!target) return res.status(404).json({ error: 'Member not found.' });
    if (target.role === 'owner') return res.status(403).json({ error: 'Cannot ban owner.' });

    await dbRun(`DELETE FROM community_group_members WHERE group_id = ? AND user_id = ?`, [groupId, memberId]);
    await dbRun(`INSERT INTO community_group_bans (group_id, user_id, banned_by) VALUES (?, ?, ?)`, [groupId, memberId, userId]);
    return res.json({ message: 'Member banned.' });
  } catch (error) {
    console.error('BAN error:', error);
    return res.status(500).json({ error: 'Failed to ban member' });
  }
});

router.get('/groups/:groupId/posts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groupId = Number(req.params.groupId);
    if (!groupId || Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }

    const group = await dbGet(`SELECT * FROM community_groups WHERE id = ?`, [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.is_private) {
      const membership = await dbGet(`SELECT id FROM community_group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId]);
      if (!membership) {
        return res.status(403).json({ error: 'Access denied. Join the group first.' });
      }
    }

    const posts = await dbAll(`
      SELECT p.*, u.firstname, u.surname,
      (SELECT COUNT(*) FROM community_post_comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM community_post_likes l WHERE l.post_id = p.id) AS like_count,
      (EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = ?))::int AS liked_by_me
      FROM community_group_posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.group_id = ?
      ORDER BY p.is_pinned DESC, p.created_at DESC
    `, [userId, groupId]);

    return res.json({ posts });
  } catch (error) {
    console.error('GET /groups/:groupId/posts error:', error);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.post('/posts/:postId/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const postId = Number(req.params.postId);
    if (!postId || Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID' });

    const post = await dbGet(`SELECT * FROM community_group_posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await dbRun(`INSERT INTO community_post_likes (post_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING`, [postId, userId]);
    return res.json({ message: 'Liked' });
  } catch (error) {
    console.error('POST /posts/:postId/like error:', error);
    return res.status(500).json({ error: 'Failed to like post' });
  }
});

router.delete('/posts/:postId/like', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const postId = Number(req.params.postId);
    if (!postId || Number.isNaN(postId)) return res.status(400).json({ error: 'Invalid post ID' });

    await dbRun(`DELETE FROM community_post_likes WHERE post_id = ? AND user_id = ?`, [postId, userId]);
    return res.json({ message: 'Unliked' });
  } catch (error) {
    console.error('DELETE /posts/:postId/like error:', error);
    return res.status(500).json({ error: 'Failed to unlike post' });
  }
});

router.get('/trending', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await dbAll(`
      SELECT p.*, u.firstname, u.surname, g.name AS group_name,
        (SELECT COUNT(*) FROM community_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM community_post_comments c WHERE c.post_id = p.id) AS comment_count
      FROM community_group_posts p
      JOIN users u ON p.user_id = u.id
      JOIN community_groups g ON p.group_id = g.id
      WHERE g.is_private = 0 AND p.created_at > NOW() - INTERVAL '7 days'
      ORDER BY like_count DESC, comment_count DESC
      LIMIT 5
    `, []);
    return res.json({ posts });
  } catch (error) {
    console.error('GET /trending error:', error);
    return res.status(500).json({ error: 'Failed to fetch trending posts' });
  }
});

router.get('/feed', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const posts = await dbAll(`
      SELECT p.*, u.firstname, u.surname,
      g.name AS group_name,
      (SELECT COUNT(*) FROM community_post_likes l WHERE l.post_id = p.id) AS like_count,
      (SELECT COUNT(*) FROM community_post_comments c WHERE c.post_id = p.id) AS comment_count,
      (EXISTS(SELECT 1 FROM community_post_likes l WHERE l.post_id = p.id AND l.user_id = ?))::int AS liked_by_me
      FROM community_group_posts p
      JOIN community_groups g ON g.id = p.group_id
      JOIN community_group_members m ON m.group_id = p.group_id AND m.user_id = ?
      JOIN users u ON u.id = p.user_id
      ORDER BY p.is_pinned DESC, p.created_at DESC
      LIMIT 100
    `, [userId, userId]);

    return res.json({ posts });
  } catch (error) {
    console.error('GET /feed error:', error);
    return res.status(500).json({ error: 'Failed to get feed' });
  }
});

router.delete('/groups/:groupId/posts/:postId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groupId = Number(req.params.groupId);
    const postId = Number(req.params.postId);
    if (!groupId || Number.isNaN(groupId) || !postId || Number.isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    const post = await dbGet(`SELECT * FROM community_group_posts WHERE id = ? AND group_id = ?`, [postId, groupId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const membership = await getGroupMembership(groupId, userId);
    if (!membership) return res.status(403).json({ error: 'Access denied' });
    if (post.user_id !== userId && !userCanModerate(membership)) {
      return res.status(403).json({ error: 'Only post owner or moderators can delete this post.' });
    }

    await dbRun(`DELETE FROM community_group_posts WHERE id = ?`, [postId]);
    return res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('DELETE /groups/:groupId/posts/:postId error:', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.post('/groups/:groupId/posts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const groupId = Number(req.params.groupId);
    const { title, body, post_type, predicted_numbers } = req.body;

    if (!groupId || Number.isNaN(groupId)) {
      return res.status(400).json({ error: 'Invalid group ID' });
    }
    if (!title || title.trim().length < 1) {
      return res.status(400).json({ error: 'Post title must be at least 1 character.' });
    }
    if (!body || body.trim().length < 2) {
      return res.status(400).json({ error: 'Post body must be at least 2 characters.' });
    }

    const group = await dbGet(`SELECT * FROM community_groups WHERE id = ?`, [groupId]);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.is_private) {
      const membership = await dbGet(`SELECT id FROM community_group_members WHERE group_id = ? AND user_id = ?`, [groupId, userId]);
      if (!membership) {
        return res.status(403).json({ error: 'Access denied. Join the group first.' });
      }
    }

    const result = await dbRun(`
      INSERT INTO community_group_posts (group_id, user_id, title, body, post_type, predicted_numbers)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [groupId, userId, title.trim(), body.trim(), post_type === 'forecast' ? 'forecast' : 'discussion', predicted_numbers?.trim() || null]);

    const post = await dbGet(`SELECT p.*, u.firstname, u.surname FROM community_group_posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?`, [result.lastID]);
    return res.status(201).json({ post });
  } catch (error) {
    console.error('POST /groups/:groupId/posts error:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

router.post('/posts/:postId/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const postId = Number(req.params.postId);
    const { body } = req.body;

    if (!postId || Number.isNaN(postId)) {
      return res.status(400).json({ error: 'Invalid post ID' });
    }
    if (!body || body.trim().length < 2) {
      return res.status(400).json({ error: 'Comment must be at least 2 characters.' });
    }

    const post = await dbGet(`SELECT * FROM community_group_posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const group = await dbGet(`SELECT * FROM community_groups WHERE id = ?`, [post.group_id]);
    if (!group) return res.status(404).json({ error: 'Post group not found' });

    if (group.is_private) {
      const membership = await dbGet(`SELECT id FROM community_group_members WHERE group_id = ? AND user_id = ?`, [group.id, userId]);
      if (!membership) {
        return res.status(403).json({ error: 'Access denied. Join the group first.' });
      }
    }

    await dbRun(`INSERT INTO community_post_comments (post_id, user_id, body) VALUES (?, ?, ?)`, [postId, userId, body.trim()]);
    return res.status(201).json({ message: 'Comment added' });
  } catch (error) {
    console.error('POST /posts/:postId/comments error:', error);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

router.delete('/posts/:postId/comments/:commentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const postId = Number(req.params.postId);
    const commentId = Number(req.params.commentId);
    if (!postId || Number.isNaN(postId) || !commentId || Number.isNaN(commentId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    const comment = await dbGet(`SELECT * FROM community_post_comments WHERE id = ? AND post_id = ?`, [commentId, postId]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const post = await dbGet(`SELECT * FROM community_group_posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const membership = await getGroupMembership(post.group_id, userId);
    if (comment.user_id !== userId && !userCanModerate(membership)) {
      return res.status(403).json({ error: 'Only comment owner or moderators can delete comments.' });
    }

    await dbRun(`DELETE FROM community_post_comments WHERE id = ?`, [commentId]);
    return res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('DELETE /posts/:postId/comments/:commentId error:', error);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
