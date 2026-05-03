// controllers/feedController.js
const db   = require("../models/db");
const path = require("path");
const fs   = require("fs");

function getUserInfo(userId, cb) {
  db.query(
    "SELECT id, name, role, university_id FROM users WHERE id = ?",
    [userId],
    (err, rows) => { if (err) return cb(err, null); cb(null, rows[0] || null); }
  );
}

function visibilityClause(user) {
  if (user.role === "super_admin") return { sql: "1=1", params: [] };
  return {
    sql:    "(p.university_id = ? OR p.university_id IS NULL)",
    params: [user.university_id],
  };
}

exports.getFeed = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  getUserInfo(user_id, (err, user) => {
    if (err || !user) return res.status(404).json({ message: "User not found" });

    const vis = visibilityClause(user);
    const sql = `
      SELECT
        p.*,
        u.name        AS author_name,
        u.role        AS author_role,
        uni.name      AS university_name,
        (SELECT COUNT(*) FROM post_reactions  WHERE post_id = p.id) AS reaction_count,
        (SELECT COUNT(*) FROM post_comments   WHERE post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM post_shares     WHERE post_id = p.id) AS share_count,
        (SELECT reaction FROM post_reactions  WHERE post_id = p.id AND user_id = ?) AS my_reaction
      FROM posts p
      JOIN  users        u   ON p.user_id      = u.id
      LEFT JOIN universities uni ON p.university_id = uni.id
      WHERE ${vis.sql}
      ORDER BY p.created_at DESC
      LIMIT 80
    `;
    db.query(sql, [user_id, ...vis.params], (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error", err });
      res.json(rows);
    });
  });
};


exports.createPost = (req, res) => {
  const { user_id, content, is_notice } = req.body;
  if (!user_id) return res.status(400).json({ message: "user_id required" });
  if (!content?.trim() && !req.file)
    return res.status(400).json({ message: "Post needs text or media" });

  getUserInfo(user_id, (err, user) => {
    if (err || !user) return res.status(404).json({ message: "User not found" });

    const canNotice  = ["super_admin","varsity_admin","club_rep"].includes(user.role);
    const noticeFlag = canNotice && is_notice === "1" ? 1 : 0;
    const uniId      = user.role === "super_admin" ? null : user.university_id;

    let mediaUrl  = null;
    let mediaType = null;
    if (req.file) {
      mediaUrl  = `/uploads/${req.file.filename}`;
      mediaType = /\.(mp4|mov|avi|webm)$/i.test(req.file.originalname) ? "video" : "image";
    }

    db.query(
      `INSERT INTO posts (user_id, university_id, content, media_url, media_type, is_notice)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, uniId, content?.trim() || null, mediaUrl, mediaType, noticeFlag],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });

        if (noticeFlag) {
          const nSql    = user.role === "super_admin"
            ? "SELECT id FROM users WHERE id != ?"
            : "SELECT id FROM users WHERE university_id = ? AND id != ?";
          const nParams = user.role === "super_admin"
            ? [user_id]
            : [user.university_id, user_id];

          db.query(nSql, nParams, (err, targets) => {
            if (!err && targets.length > 0) {
              const vals = targets.map(t => [t.id, user_id, "notice", result.insertId, `New notice from ${user.name}`]);
              db.query("INSERT INTO notifications (user_id, from_user_id, type, post_id, message) VALUES ?", [vals], () => {});
            }
          });
        }

        res.json({ message: "Post created", id: result.insertId });
      }
    );
  });
};

exports.deletePost = (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  getUserInfo(user_id, (err, user) => {
    if (err || !user) return res.status(404).json({ message: "User not found" });

    const where  = user.role === "super_admin" ? "id = ?"              : "id = ? AND user_id = ?";
    const params = user.role === "super_admin" ? [id]                  : [id, user_id];

    db.query(`SELECT media_url FROM posts WHERE ${where}`, params, (err, rows) => {
      if (err || rows.length === 0) return res.status(403).json({ message: "Not authorized or not found" });

      if (rows[0].media_url) {
        const fp = path.join(__dirname, "../", rows[0].media_url);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }

      db.query(`DELETE FROM posts WHERE ${where}`, params, (err) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json({ message: "Post deleted" });
      });
    });
  });
};

exports.editPost = (req, res) => {
  const { id } = req.params;
  const { user_id, content } = req.body;

  if (!user_id)        return res.status(400).json({ message: "user_id required" });
  if (!content?.trim()) return res.status(400).json({ message: "content required" });

  db.query(
    "SELECT id, user_id FROM posts WHERE id = ? AND user_id = ?",
    [id, user_id],
    (err, rows) => {
      if (err)            return res.status(500).json({ message: "Server error" });
      if (rows.length === 0)
        return res.status(403).json({ message: "Not authorized or post not found" });

      db.query(
        "UPDATE posts SET content = ? WHERE id = ?",
        [content.trim(), id],
        (err) => {
          if (err) {
            console.error("[editPost] DB error:", err);
            return res.status(500).json({ message: "Server error", detail: err.message });
          }
          res.json({ message: "Post updated", content: content.trim() });
        }
      );
    }
  );
};

exports.searchPosts = (req, res) => {
  const { user_id, q } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id required" });
  if (!q?.trim()) return res.status(400).json({ message: "q (search query) required" });

  getUserInfo(user_id, (err, user) => {
    if (err || !user) return res.status(404).json({ message: "User not found" });

    const vis     = visibilityClause(user);
    const keyword = `%${q.trim()}%`;

    const sql = `
      SELECT
        p.*,
        u.name   AS author_name,
        u.role   AS author_role,
        uni.name AS university_name,
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = p.id) AS reaction_count,
        (SELECT COUNT(*) FROM post_comments  WHERE post_id = p.id) AS comment_count,
        (SELECT COUNT(*) FROM post_shares    WHERE post_id = p.id) AS share_count,
        (SELECT reaction FROM post_reactions WHERE post_id = p.id AND user_id = ?) AS my_reaction
      FROM posts p
      JOIN  users        u   ON p.user_id      = u.id
      LEFT JOIN universities uni ON p.university_id = uni.id
      WHERE p.content LIKE ? AND ${vis.sql}
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

    db.query(sql, [user_id, keyword, ...vis.params], (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error", err });
      res.json(rows);
    });
  });
};

exports.reactToPost = (req, res) => {
  const { user_id, post_id, reaction } = req.body;
  if (!user_id || !post_id || !reaction)
    return res.status(400).json({ message: "user_id, post_id, reaction required" });

  db.query(
    "SELECT id, reaction FROM post_reactions WHERE post_id = ? AND user_id = ?",
    [post_id, user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });

      if (rows.length > 0) {
        if (rows[0].reaction === reaction) {
          db.query("DELETE FROM post_reactions WHERE id = ?", [rows[0].id], (err) => {
            if (err) return res.status(500).json({ message: "Server error" });
            res.json({ action: "removed" });
          });
        } else {
          db.query("UPDATE post_reactions SET reaction = ? WHERE id = ?", [reaction, rows[0].id], (err) => {
            if (err) return res.status(500).json({ message: "Server error" });
            res.json({ action: "updated" });
          });
        }
      } else {
        db.query(
          "INSERT INTO post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)",
          [post_id, user_id, reaction],
          (err) => {
            if (err) return res.status(500).json({ message: "Server error" });
            db.query("SELECT user_id FROM posts WHERE id = ?", [post_id], (err, posts) => {
              if (!err && posts.length > 0 && String(posts[0].user_id) !== String(user_id)) {
                db.query(
                  "INSERT INTO notifications (user_id, from_user_id, type, post_id, message) VALUES (?, ?, 'reaction', ?, 'reacted to your post')",
                  [posts[0].user_id, user_id, post_id], () => {}
                );
              }
            });
            res.json({ action: "added" });
          }
        );
      }
    }
  );
};

exports.getReactions = (req, res) => {
  db.query(
    "SELECT reaction, COUNT(*) AS count FROM post_reactions WHERE post_id = ? GROUP BY reaction",
    [req.params.postId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    }
  );
};

exports.addComment = (req, res) => {
  const { user_id, post_id, content } = req.body;
  if (!user_id || !post_id || !content?.trim())
    return res.status(400).json({ message: "user_id, post_id, content required" });

  db.query(
    "INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)",
    [post_id, user_id, content.trim()],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });

      db.query("SELECT user_id FROM posts WHERE id = ?", [post_id], (err, posts) => {
        if (!err && posts.length > 0 && String(posts[0].user_id) !== String(user_id)) {
          db.query(
            "INSERT INTO notifications (user_id, from_user_id, type, post_id, message) VALUES (?, ?, 'comment', ?, 'commented on your post')",
            [posts[0].user_id, user_id, post_id], () => {}
          );
        }
      });

      db.query(
        `SELECT c.*, u.name AS author_name, u.role AS author_role
         FROM post_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`,
        [result.insertId],
        (err, rows) => {
          res.json({ message: "Comment added", comment: rows?.[0] || { id: result.insertId, content: content.trim() } });
        }
      );
    }
  );
};

exports.getComments = (req, res) => {
  db.query(
    `SELECT c.*, u.name AS author_name, u.role AS author_role
     FROM post_comments c JOIN users u ON c.user_id = u.id
     WHERE c.post_id = ? ORDER BY c.created_at ASC`,
    [req.params.postId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    }
  );
};

exports.deleteComment = (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  getUserInfo(user_id, (err, user) => {
    if (err || !user) return res.status(404).json({ message: "User not found" });
    const where  = user.role === "super_admin" ? "id = ?"              : "id = ? AND user_id = ?";
    const params = user.role === "super_admin" ? [req.params.id]       : [req.params.id, user_id];

    db.query(`DELETE FROM post_comments WHERE ${where}`, params, (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      if (result.affectedRows === 0) return res.status(403).json({ message: "Not authorized" });
      res.json({ message: "Comment deleted" });
    });
  });
};

exports.sharePost = (req, res) => {
  const { user_id, post_id } = req.body;
  if (!user_id || !post_id) return res.status(400).json({ message: "user_id and post_id required" });

  db.query(
    "INSERT INTO post_shares (post_id, user_id) VALUES (?, ?)",
    [post_id, user_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Server error" });
      db.query("SELECT user_id FROM posts WHERE id = ?", [post_id], (err, posts) => {
        if (!err && posts.length > 0 && String(posts[0].user_id) !== String(user_id)) {
          db.query(
            "INSERT INTO notifications (user_id, from_user_id, type, post_id, message) VALUES (?, ?, 'share', ?, 'shared your post')",
            [posts[0].user_id, user_id, post_id], () => {}
          );
        }
      });

      res.json({ message: "Shared" });
    }
  );
};
exports.getNotifications = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  db.query(
    `SELECT n.*, u.name AS from_name, u.role AS from_role
     FROM notifications n
     LEFT JOIN users u ON n.from_user_id = u.id
     WHERE n.user_id = ?
     ORDER BY n.created_at DESC LIMIT 60`,
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    }
  );
};

exports.getUnreadCount = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  db.query(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0",
    [user_id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json({ count: rows[0].count });
    }
  );
};

exports.markNotificationsRead = (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [user_id], (err) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ message: "Marked as read" });
  });
};

exports.getNotices = (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ message: "user_id required" });

  getUserInfo(user_id, (err, user) => {
    if (err || !user) return res.status(404).json({ message: "User not found" });

    const vis = visibilityClause(user);
    const sql = `
      SELECT p.*, u.name AS author_name, u.role AS author_role, uni.name AS university_name
      FROM posts p
      JOIN  users        u   ON p.user_id      = u.id
      LEFT JOIN universities uni ON p.university_id = uni.id
      WHERE p.is_notice = 1 AND ${vis.sql}
      ORDER BY p.created_at DESC
    `;
    db.query(sql, vis.params, (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    });
  });
};

exports.updatePassword = (req, res) => {
  const { user_id, current_password, new_password } = req.body;
  if (!user_id || !current_password || !new_password)
    return res.status(400).json({ message: "user_id, current_password, new_password are required" });

  db.query("SELECT password FROM users WHERE id = ?", [user_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });
    if (rows[0].password !== current_password)
      return res.status(401).json({ message: "Current password is incorrect" });

    db.query("UPDATE users SET password = ? WHERE id = ?", [new_password, user_id], (err) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json({ message: "Password updated successfully" });
    });
  });
};