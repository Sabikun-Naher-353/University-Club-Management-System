// controllers/profileController.js
const db     = require('../models/db');
const bcrypt = require('bcryptjs');

exports.getMyProfile = (req, res) => {
  const userId = req.user.id;
  db.query(
    `SELECT id, name, email, role, university_id, avatar, bio, phone, created_at
     FROM users WHERE id = ?`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      if (!results.length) return res.status(404).json({ error: 'User not found' });
      res.json(results[0]);
    }
  );
};

exports.getUserProfile = (req, res) => {
  const { userId }         = req.params;
  const viewerUniversityId = req.user.university_id;
  const viewerRole         = req.user.role;

  db.query(
    `SELECT id, name, email, role, university_id, avatar, bio, phone, created_at
     FROM users WHERE id = ?`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'DB error', details: err.message });
      if (!results.length) return res.status(404).json({ error: 'User not found' });

      const profile = results[0];
      if (
        viewerRole !== 'super_admin' &&
        profile.role !== 'super_admin' &&
        profile.university_id !== viewerUniversityId
      ) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.json(profile);
    }
  );
};

exports.getVarsityUsers = (req, res) => {
  const { university_id, role, id: myId } = req.user;

  let sql, params;

  if (role === 'super_admin') {
    sql    = `SELECT id, name, email, role, university_id, avatar, created_at
              FROM users WHERE status = 'approved' AND id != ?
              ORDER BY name ASC`;
    params = [myId];
  } else {
    sql    = `SELECT id, name, email, role, university_id, avatar, created_at
              FROM users
              WHERE status = 'approved'
                AND id != ?
                AND (university_id = ? OR role = 'super_admin')
              ORDER BY role = 'super_admin' DESC, name ASC`;
    params = [myId, university_id];
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error', details: err.message });
    res.json({ users: results });
  });
};
exports.getUserPosts = (req, res) => {
  const { userId }         = req.params;
  const viewerUniversityId = req.user.university_id;
  const viewerRole         = req.user.role;
  const viewerId           = req.user.id;

  db.query('SELECT id, role, university_id FROM users WHERE id = ?', [userId], (err, results) => {
    if (err || !results.length) return res.status(404).json({ error: 'User not found' });

    const targetUser = results[0];
    if (
      viewerRole !== 'super_admin' &&
      targetUser.role !== 'super_admin' &&
      targetUser.university_id !== viewerUniversityId
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sql = `
      SELECT
        p.id, p.content, p.media_url, p.media_type, p.is_notice,
        p.created_at, p.university_id,
        u.id     AS author_id,
        u.name   AS author_name,
        u.role   AS author_role,
        u.avatar AS author_avatar,
        (SELECT COUNT(*) FROM post_reactions pr WHERE pr.post_id = p.id) AS reaction_count,
        (SELECT COUNT(*) FROM post_comments  pc WHERE pc.post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM post_shares    ps WHERE ps.post_id = p.id) AS share_count,
        (SELECT reaction FROM post_reactions WHERE post_id = p.id AND user_id = ?) AS my_reaction
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 30
    `;

    db.query(sql, [viewerId, userId], (err2, posts) => {
      if (err2) return res.status(500).json({ error: 'DB error', details: err2.message });
      res.json({ posts: posts || [], user: targetUser });
    });
  });
};

exports.updateMyProfile = (req, res) => {
  const userId = req.user.id;
  const { name, bio, phone } = req.body;

  let avatarPath = null;
  if (req.file) avatarPath = `/uploads/avatars/${req.file.filename}`;

  const fields = [];
  const values = [];
  if (name)              { fields.push('name = ?');   values.push(name); }
  if (bio !== undefined) { fields.push('bio = ?');    values.push(bio); }
  if (phone)             { fields.push('phone = ?');  values.push(phone); }
  if (avatarPath)        { fields.push('avatar = ?'); values.push(avatarPath); }

  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

  values.push(userId);
  db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
    if (err) return res.status(500).json({ error: 'DB error', details: err.message });
    res.json({ message: 'Profile updated successfully' });
  });
};

exports.changePassword = (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: 'Both current and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });

  db.query('SELECT password FROM users WHERE id = ?', [userId], async (err, results) => {
    if (err || !results.length) return res.status(500).json({ error: 'DB error' });

    const stored = results[0].password;
    let match = false;
    if (stored.startsWith('$2')) {
      match = await bcrypt.compare(currentPassword, stored);
    } else {
      match = currentPassword === stored;
    }

    if (!match) return res.status(401).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId], (err2) => {
      if (err2) return res.status(500).json({ error: 'DB error' });
      res.json({ message: 'Password changed successfully' });
    });
  });
};