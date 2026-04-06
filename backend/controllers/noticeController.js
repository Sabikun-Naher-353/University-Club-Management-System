// controllers/noticeController.js
const db = require('../models/db');

const ALLOWED_NOTICE_ROLES = ['super_admin', 'varsity_admin', 'club_rep'];

exports.createNotice = (req, res) => {
  const { content } = req.body;
  const { id: user_id, role, university_id } = req.user;

  if (!ALLOWED_NOTICE_ROLES.includes(role)) {
    return res.status(403).json({ error: 'Only admins and reps can post notices' });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Notice content is required' });
  }
  const noticeVarsityId = role === 'super_admin' ? null : university_id;

  db.query(
    `INSERT INTO posts (user_id, university_id, content, is_notice)
     VALUES (?, ?, ?, 1)`,
    [user_id, noticeVarsityId, content.trim()],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      res.status(201).json({ message: 'Notice created', noticeId: result.insertId });
    }
  );
};

exports.getNotices = (req, res) => {
  const { id: userId, university_id, role } = req.user;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = `p.is_notice = 1`;
  let params = [userId]; 

  if (role !== 'super_admin') {
    whereClause += ` AND (p.university_id = ? OR p.university_id IS NULL)`;
    params.push(university_id);
  }

  const sql = `
    SELECT
      p.id, p.content, p.is_notice, p.created_at, p.university_id,
      u.id     AS author_id,
      u.name   AS author_name,
      u.role   AS author_role,
      u.avatar AS author_avatar,
      (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id) AS reaction_count,
      (SELECT COUNT(*) FROM post_comments  pc WHERE pc.post_id = p.id) AS comment_count,
      (SELECT reaction FROM post_reactions WHERE post_id = p.id AND user_id = ?) AS my_reaction
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  params.push(parseInt(limit), parseInt(offset));

  db.query(sql, params, (err, notices) => {
    if (err) return res.status(500).json({ error: 'DB error', details: err.message });
    res.json({ notices });
  });
};

exports.deleteNotice = (req, res) => {
  const { noticeId } = req.params;
  const { id: userId, role } = req.user;


  db.query(`SELECT * FROM posts WHERE id = ? AND is_notice = 1`, [noticeId], (err, results) => {
    if (err || !results.length) return res.status(404).json({ error: 'Notice not found' });

    const notice = results[0];
    if (notice.user_id !== userId && role !== 'super_admin') {
      return res.status(403).json({ error: 'Not authorised' });
    }

    db.query('DELETE FROM posts WHERE id = ?', [noticeId], (err2) => {
      if (err2) return res.status(500).json({ error: 'DB error', details: err2.message });
      res.json({ message: 'Notice deleted' });
    });
  });
};