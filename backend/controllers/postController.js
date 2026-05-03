// controllers/postController.js
const db = require('../models/db');

exports.createPost = (req, res) => {
  const { content, is_notice } = req.body;
  const { id: user_id, role, university_id } = req.user;

  let media_url  = null;
  let media_type = null;
  if (req.file) {
    media_url  = `/uploads/posts/${req.file.filename}`;
    media_type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
  }

  if (!content && !media_url) {
    return res.status(400).json({ error: 'Post must have content or media' });
  }

  const canNotice  = ['super_admin','varsity_admin','club_rep'].includes(role);
  const noticeFlag = canNotice && is_notice === '1' ? 1 : 0;
  const uniId      = role === 'super_admin' ? null : university_id;

  db.query(
    `INSERT INTO posts (user_id, university_id, content, media_url, media_type, is_notice)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, uniId, content || null, media_url, media_type, noticeFlag],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      res.status(201).json({ message: 'Post created', postId: result.insertId });
    }
  );
};

exports.getFeed = (req, res) => {
  const { id: userId, university_id, role } = req.user;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  let params = [userId];

  if (role !== 'super_admin') {
    whereClause = '(p.university_id = ? OR p.university_id IS NULL)';
    params.push(university_id);
  }

  const sql = `
    SELECT
      p.id, p.content, p.media_url, p.media_type, p.is_notice,
      p.created_at, p.university_id,
      u.id     AS author_id,
      u.name   AS author_name,
      u.role   AS author_role,
      u.avatar AS author_avatar,
      (SELECT COUNT(*) FROM post_reactions  pr WHERE pr.post_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM post_comments   pc WHERE pc.post_id = p.id) AS comment_count,
      (SELECT COUNT(*) FROM post_shares     ps WHERE ps.post_id = p.id) AS share_count,
      (SELECT reaction FROM post_reactions  WHERE post_id = p.id AND user_id = ?) AS my_reaction
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, posts) => {
    if (err) return res.status(500).json({ error: 'DB error', details: err.message });
    res.json({ posts, total: posts.length });
  });
};

exports.deletePost = (req, res) => {
  const { postId } = req.params;
  const { id: userId, role } = req.user;

  db.query('SELECT * FROM posts WHERE id = ?', [postId], (err, results) => {
    if (err || !results.length) return res.status(404).json({ error: 'Post not found' });
    const post = results[0];
    if (post.user_id !== userId && role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorised' });
    }
    db.query('DELETE FROM posts WHERE id = ?', [postId], (err2) => {
      if (err2) return res.status(500).json({ error: 'DB error', details: err2.message });
      res.json({ message: 'Post deleted' });
    });
  });
};

exports.reactToPost = (req, res) => {
  const { postId } = req.params;
  const { type = 'like' } = req.body;
  const userId = req.user.id;

  db.query(
    'SELECT id, reaction FROM post_reactions WHERE post_id = ? AND user_id = ?',
    [postId, userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });

      if (rows.length) {
        if (rows[0].reaction === type) {
          db.query('DELETE FROM post_reactions WHERE id = ?', [rows[0].id], (e) => {
            if (e) return res.status(500).json({ error: 'DB error' });
            res.json({ message: 'Reaction removed', reaction: null });
          });
        } else {
          db.query('UPDATE post_reactions SET reaction = ? WHERE id = ?', [type, rows[0].id], (e) => {
            if (e) return res.status(500).json({ error: 'DB error' });
            res.json({ message: 'Reaction updated', reaction: type });
          });
        }
      } else {
        db.query(
          'INSERT INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)',
          [postId, userId, type],
          (e) => {
            if (e) return res.status(500).json({ error: 'DB error' });
            res.json({ message: 'Reaction added', reaction: type });
          }
        );
      }
    }
  );
};

exports.getReactions = (req, res) => {
  db.query(
    'SELECT reaction, COUNT(*) AS count FROM post_reactions WHERE post_id = ? GROUP BY reaction',
    [req.params.postId],
    (err, breakdown) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      db.query(
        `SELECT u.id, u.name, u.avatar, pr.reaction
         FROM post_reactions pr
         JOIN users u ON u.id = pr.user_id
         WHERE pr.post_id = ?
         ORDER BY pr.created_at DESC`,
        [req.params.postId],
        (err2, users) => {
          if (err2) return res.status(500).json({ error: 'DB error', details: err2.message });
          res.json({ reactions: breakdown, users });
        }
      );
    }
  );
};

exports.addComment = (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  db.query(
    'INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)',
    [postId, userId, content.trim()],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      db.query(
        `SELECT c.*, u.name AS author_name, u.avatar AS author_avatar
         FROM post_comments c JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`,
        [result.insertId],
        (err2, rows) => {
          if (err2) return res.status(500).json({ error: 'DB error' });
          res.status(201).json({ message: 'Comment added', comment: rows[0] });
        }
      );
    }
  );
};

exports.getComments = (req, res) => {
  db.query(
    `SELECT c.*, u.name AS author_name, u.avatar AS author_avatar
     FROM post_comments c JOIN users u ON u.id = c.user_id
     WHERE c.post_id = ? ORDER BY c.created_at ASC`,
    [req.params.postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      res.json({ comments: rows });
    }
  );
};

exports.deleteComment = (req, res) => {
  const { commentId } = req.params;
  const { id: userId, role } = req.user;

  db.query('SELECT * FROM post_comments WHERE id = ?', [commentId], (err, results) => {
    if (err || !results.length) return res.status(404).json({ error: 'Comment not found' });
    if (results[0].user_id !== userId && role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorised' });
    }
    db.query('DELETE FROM post_comments WHERE id = ?', [commentId], (err2) => {
      if (err2) return res.status(500).json({ error: 'DB error', details: err2.message });
      res.json({ message: 'Comment deleted' });
    });
  });
};

exports.sharePost = (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  db.query(
    'INSERT IGNORE INTO post_shares (post_id, user_id) VALUES (?, ?)',
    [postId, userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      if (result.affectedRows === 0) return res.json({ message: 'Already shared' });
      res.json({ message: 'Post shared successfully' });
    }
  );
};

exports.reportPost = (req, res) => {
  const { postId }  = req.params;
  const { reason }  = req.body;
  const reportedBy  = req.user.id;

  if (!reason?.trim()) {
    return res.status(400).json({ error: 'A reason is required to report a post' });
  }

  db.query('SELECT user_id FROM posts WHERE id = ?', [postId], (err, rows) => {
    if (err)          return res.status(500).json({ error: 'DB error', details: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });

    const postAuthorId = rows[0].user_id;

    if (String(postAuthorId) === String(reportedBy)) {
      return res.status(400).json({ error: 'You cannot report your own post' });
    }

    db.query(
      'SELECT id FROM violations WHERE user_id = ? AND reported_by = ? AND reason LIKE ?',
      [postAuthorId, reportedBy, `[post:${postId}]%`],
      (err2, existing) => {
        if (err2) return res.status(500).json({ error: 'DB error', details: err2.message });
        if (existing.length) {
          return res.status(409).json({ error: 'You have already reported this post' });
        }

        const taggedReason = `[post:${postId}] ${reason.trim()}`;

        db.query(
          'INSERT INTO violations (user_id, reason, reported_by) VALUES (?, ?, ?)',
          [postAuthorId, taggedReason, reportedBy],
          (err3) => {
            if (err3) return res.status(500).json({ error: 'DB error', details: err3.message });
            res.status(201).json({ message: 'Post reported successfully' });
          }
        );
      }
    );
  });
};

exports.getPostReports = (req, res) => {
  const { postId }        = req.params;
  const { id: userId, role } = req.user;

  db.query('SELECT user_id FROM posts WHERE id = ?', [postId], (err, rows) => {
    if (err)          return res.status(500).json({ error: 'DB error', details: err.message });
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });

    const postAuthorId = rows[0].user_id;
    const canView =
      String(postAuthorId) === String(userId) ||
      ['super_admin', 'varsity_admin'].includes(role);

    if (!canView) {
      return res.status(403).json({ error: 'Not authorised to view reports for this post' });
    }

    db.query(
      `SELECT
         v.id,
         v.reason,
         v.action_taken,
         v.reported_at,
         u.id     AS reporter_id,
         u.name   AS reporter_name,
         u.avatar AS reporter_avatar
       FROM violations v
       JOIN users u ON u.id = v.reported_by
       WHERE v.user_id = ? AND v.reason LIKE ?
       ORDER BY v.reported_at DESC`,
      [postAuthorId, `[post:${postId}]%`],
      (err2, reports) => {
        if (err2) return res.status(500).json({ error: 'DB error', details: err2.message });
        const cleaned = reports.map(r => ({
          ...r,
          reason: r.reason.replace(/^\[post:\d+\]\s*/, ''),
        }));

        res.json({ reports: cleaned, total: cleaned.length });
      }
    );
  });
};