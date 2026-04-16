// controllers/varsityController.js
const db = require("../models/db");

function verifyClubOwnership(clubId, universityId, cb) {
  db.query(
    "SELECT id FROM clubs WHERE id = ? AND university_id = ?",
    [clubId, universityId],
    (err, rows) => {
      if (err) return cb(err, false);
      cb(null, rows.length > 0);
    }
  );
}

// ─── STATS ───────────────────────────────────────────────────────────────────

exports.getStats = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  db.query("SELECT COUNT(*) AS total FROM clubs WHERE university_id = ? AND status = 'approved'", [uid], (err, c) => {
    if (err) return res.status(500).json({ message: "Server error" });
    db.query("SELECT COUNT(*) AS total FROM clubs WHERE university_id = ? AND status = 'pending'", [uid], (err, p) => {
      if (err) return res.status(500).json({ message: "Server error" });
      db.query("SELECT COUNT(*) AS total FROM clubs WHERE university_id = ? AND status = 'archived'", [uid], (err, ar) => {
        if (err) return res.status(500).json({ message: "Server error" });
        db.query(
          `SELECT COUNT(*) AS total FROM users
           WHERE role = 'club_rep' AND status = 'pending' AND university_id = ?
           AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.requested_by_user_id = users.id)`,
          [uid],
          (err, op) => {
            if (err) return res.status(500).json({ message: "Server error" });
            db.query(
              "SELECT COUNT(*) AS total FROM users WHERE university_id = ? AND role = 'student'",
              [uid],
              (err, s) => {
                if (err) return res.status(500).json({ message: "Server error" });

                // Inactive = student, approved, last_login null OR last_login older than 30 days
                db.query(
                  `SELECT COUNT(*) AS total FROM users
                   WHERE university_id = ? AND role = 'student' AND status = 'approved'
                   AND (last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL 30 DAY))`,
                  [uid],
                  (err, inactive) => {
                    if (err) return res.status(500).json({ message: "Server error" });
                    res.json({
                      clubs:          c[0].total,
                      pendingClubs:   p[0].total + op[0].total,
                      archivedClubs:  ar[0].total,
                      students:       s[0].total,
                      inactiveStudents: inactive[0].total,
                    });
                  }
                );
              }
            );
          }
        );
      });
    });
  });
};

// ─── PENDING CLUBS ────────────────────────────────────────────────────────────

exports.getPendingClubs = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  const clubSql = `
    SELECT c.id, c.name, c.university_id, c.status, c.created_at,
           'club_row' AS source,
           usr.id AS rep_user_id, usr.name AS requested_by_name, usr.email AS requested_by_email
    FROM clubs c
    LEFT JOIN users usr ON c.requested_by_user_id = usr.id
    WHERE c.status = 'pending' AND c.university_id = ?
  `;

  const orphanSql = `
    SELECT
      NULL AS id, NULL AS name, ? AS university_id, 'pending' AS status, u.created_at,
      'orphan_rep' AS source,
      u.id AS rep_user_id, u.name AS requested_by_name, u.email AS requested_by_email
    FROM users u
    WHERE u.role = 'club_rep'
      AND u.status = 'pending'
      AND u.university_id = ?
      AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.requested_by_user_id = u.id)
  `;

  db.query(clubSql, [uid], (err, clubRows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    db.query(orphanSql, [uid, uid], (err2, orphanRows) => {
      if (err2) return res.status(500).json({ message: "Server error" });
      const combined = [...clubRows, ...orphanRows]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.json(combined);
    });
  });
};

// ─── APPROVE CLUB ─────────────────────────────────────────────────────────────

exports.approveClub = (req, res) => {
  const { id } = req.params;
  const { university_id, club_name, rep_user_id, source } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  if (source === 'orphan_rep' || !id || id === 'null') {
    if (!rep_user_id) return res.status(400).json({ message: "rep_user_id required" });
    if (!club_name || !club_name.trim()) return res.status(400).json({ message: "club_name required" });

    db.query(
      "SELECT id FROM users WHERE id = ? AND university_id = ? AND role = 'club_rep'",
      [rep_user_id, university_id],
      (err, rows) => {
        if (err)               return res.status(500).json({ message: "Server error" });
        if (rows.length === 0) return res.status(403).json({ message: "Not authorized" });

        db.query(
          "INSERT INTO clubs (name, university_id, status, requested_by_user_id) VALUES (?, ?, 'approved', ?)",
          [club_name.trim(), university_id, rep_user_id],
          (err) => {
            if (err) return res.status(500).json({ message: "Server error (club insert)" });
            db.query("UPDATE users SET status = 'approved' WHERE id = ?", [rep_user_id], (err) => {
              if (err) return res.status(500).json({ message: "Server error (user update)" });
              res.json({ message: "Club approved" });
            });
          }
        );
      }
    );
    return;
  }

  verifyClubOwnership(id, university_id, (err, owned) => {
    if (err)    return res.status(500).json({ message: "Server error" });
    if (!owned) return res.status(403).json({ message: "Not authorized for this club" });

    db.query("UPDATE clubs SET status = 'approved' WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Server error" });
      db.query(
        "UPDATE users SET status = 'approved' WHERE id = (SELECT requested_by_user_id FROM clubs WHERE id = ?)",
        [id],
        () => {}
      );
      res.json({ message: "Club approved" });
    });
  });
};

// ─── REJECT CLUB ──────────────────────────────────────────────────────────────

exports.rejectClub = (req, res) => {
  const { id } = req.params;
  const { university_id, rep_user_id, source } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  if (source === 'orphan_rep' || !id || id === 'null') {
    if (!rep_user_id) return res.status(400).json({ message: "rep_user_id required" });
    db.query(
      "DELETE FROM users WHERE id = ? AND university_id = ? AND role = 'club_rep' AND status = 'pending'",
      [rep_user_id, university_id],
      (err) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json({ message: "Club request rejected" });
      }
    );
    return;
  }

  verifyClubOwnership(id, university_id, (err, owned) => {
    if (err)    return res.status(500).json({ message: "Server error" });
    if (!owned) return res.status(403).json({ message: "Not authorized for this club" });

    db.query("SELECT requested_by_user_id FROM clubs WHERE id = ?", [id], (err, rows) => {
      const repId = rows && rows[0] ? rows[0].requested_by_user_id : null;
      db.query("DELETE FROM clubs WHERE id = ? AND status = 'pending'", [id], (err) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (repId) db.query("DELETE FROM users WHERE id = ? AND status = 'pending'", [repId], () => {});
        res.json({ message: "Club request rejected" });
      });
    });
  });
};

// ─── GET CLUBS ────────────────────────────────────────────────────────────────

exports.getClubs = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  const sql = `
    SELECT c.*, u.name AS university_name
    FROM clubs c
    LEFT JOIN universities u ON c.university_id = u.id
    WHERE c.university_id = ? AND c.status = 'approved'
    ORDER BY c.created_at DESC
  `;
  db.query(sql, [uid], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

// ─── DELETE CLUB ──────────────────────────────────────────────────────────────

exports.deleteClub = (req, res) => {
  const { id } = req.params;
  const { university_id } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  verifyClubOwnership(id, university_id, (err, owned) => {
    if (err)    return res.status(500).json({ message: "Server error" });
    if (!owned) return res.status(403).json({ message: "Not authorized for this club" });

    db.query("DELETE FROM clubs WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json({ message: "Club deleted" });
    });
  });
};

// ─── ARCHIVE CLUB (soft — sets status to 'archived') ─────────────────────────

exports.archiveClub = (req, res) => {
  const { id } = req.params;
  const { university_id } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  verifyClubOwnership(id, university_id, (err, owned) => {
    if (err)    return res.status(500).json({ message: "Server error" });
    if (!owned) return res.status(403).json({ message: "Not authorized for this club" });

    db.query(
      "UPDATE clubs SET status = 'archived' WHERE id = ? AND status = 'approved'",
      [id],
      (err, result) => {
        if (err)                       return res.status(500).json({ message: "Server error" });
        if (result.affectedRows === 0)  return res.status(404).json({ message: "Club not found or already archived" });
        res.json({ message: "Club archived" });
      }
    );
  });
};

// ─── UNARCHIVE CLUB ───────────────────────────────────────────────────────────

exports.unarchiveClub = (req, res) => {
  const { id } = req.params;
  const { university_id } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  verifyClubOwnership(id, university_id, (err, owned) => {
    if (err)    return res.status(500).json({ message: "Server error" });
    if (!owned) return res.status(403).json({ message: "Not authorized for this club" });

    db.query(
      "UPDATE clubs SET status = 'approved' WHERE id = ? AND status = 'archived'",
      [id],
      (err, result) => {
        if (err)                       return res.status(500).json({ message: "Server error" });
        if (result.affectedRows === 0)  return res.status(404).json({ message: "Club not found or not archived" });
        res.json({ message: "Club restored" });
      }
    );
  });
};

// ─── GET ARCHIVED CLUBS ───────────────────────────────────────────────────────

exports.getArchivedClubs = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  db.query(
    `SELECT c.*, u.name AS university_name
     FROM clubs c
     LEFT JOIN universities u ON c.university_id = u.id
     WHERE c.university_id = ? AND c.status = 'archived'
     ORDER BY c.created_at DESC`,
    [uid],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(result);
    }
  );
};

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

exports.getStudents = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  const sql = `
    SELECT
      u.id, u.name, u.username, u.email, u.status, u.created_at, u.last_login,
      c.name AS club_name
    FROM users u
    LEFT JOIN memberships m ON m.user_id = u.id AND m.status = 'approved'
    LEFT JOIN clubs c       ON c.id = m.club_id AND c.university_id = ?
    WHERE u.university_id = ? AND u.role = 'student'
    ORDER BY u.created_at DESC
  `;
  db.query(sql, [uid, uid], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

exports.addStudent = (req, res) => {
  const { university_id, name, email, password } = req.body;
  if (!university_id || !name || !email || !password)
    return res.status(400).json({ message: "name, email, password and university_id are required" });

  db.query("SELECT id FROM users WHERE email = ?", [email], (err, rows) => {
    if (err)             return res.status(500).json({ message: "Server error" });
    if (rows.length > 0) return res.status(409).json({ message: "Email already in use" });

    db.query(
      "INSERT INTO users (name, email, password, role, status, university_id) VALUES (?, ?, ?, 'student', 'approved', ?)",
      [name, email, password, university_id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json({ message: "Student added", id: result.insertId });
      }
    );
  });
};

exports.removeStudent = (req, res) => {
  const { id } = req.params;
  const { university_id } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  db.query(
    "DELETE FROM users WHERE id = ? AND university_id = ? AND role = 'student'",
    [id, university_id],
    (err, result) => {
      if (err)                       return res.status(500).json({ message: "Server error" });
      if (result.affectedRows === 0)  return res.status(403).json({ message: "Not authorized or student not found" });
      res.json({ message: "Student removed" });
    }
  );
};

// ─── INACTIVE STUDENTS ────────────────────────────────────────────────────────

exports.getInactiveStudents = (req, res) => {
  const uid  = req.query.university_id;
  const days = parseInt(req.query.days) || 30;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  db.query(
    `SELECT id, name, email, created_at, last_login
     FROM users
     WHERE university_id = ? AND role = 'student' AND status = 'approved'
       AND (last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL ? DAY))
     ORDER BY last_login ASC`,
    [uid, days],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    }
  );
};

exports.removeInactiveStudents = (req, res) => {
  const { university_id, days = 30 } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  db.query(
    `DELETE FROM users
     WHERE university_id = ? AND role = 'student' AND status = 'approved'
       AND (last_login IS NULL OR last_login < DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [university_id, parseInt(days)],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json({ message: `${result.affectedRows} inactive student(s) removed`, removed: result.affectedRows });
    }
  );
};

// ─── PENDING STUDENTS ─────────────────────────────────────────────────────────

exports.getPendingStudents = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  db.query(
    "SELECT id, name, email, created_at FROM users WHERE university_id = ? AND role = 'student' AND status = 'pending' ORDER BY created_at DESC",
    [uid],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(rows);
    }
  );
};

exports.approveStudent = (req, res) => {
  const { id }            = req.params;
  const { university_id } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  db.query(
    "UPDATE users SET status = 'approved' WHERE id = ? AND university_id = ? AND role = 'student' AND status = 'pending'",
    [id, university_id],
    (err, result) => {
      if (err)                       return res.status(500).json({ message: "Server error" });
      if (result.affectedRows === 0)  return res.status(404).json({ message: "Student not found" });
      res.json({ message: "Student approved" });
    }
  );
};

exports.rejectStudent = (req, res) => {
  const { id }            = req.params;
  const { university_id } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  db.query(
    "DELETE FROM users WHERE id = ? AND university_id = ? AND role = 'student' AND status = 'pending'",
    [id, university_id],
    (err, result) => {
      if (err)                       return res.status(500).json({ message: "Server error" });
      if (result.affectedRows === 0)  return res.status(404).json({ message: "Student not found" });
      res.json({ message: "Student rejected" });
    }
  );
};

// ─── UNIVERSITY SETTINGS ──────────────────────────────────────────────────────

exports.getUniversitySettings = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  db.query(
    "SELECT id, name, description, logo_url, contact_email, website, country FROM universities WHERE id = ?",
    [uid],
    (err, rows) => {
      if (err)            return res.status(500).json({ message: "Server error" });
      if (!rows.length)   return res.status(404).json({ message: "University not found" });
      res.json(rows[0]);
    }
  );
};

exports.updateUniversitySettings = (req, res) => {
  const { university_id, name, description, contact_email, website } = req.body;
  if (!university_id) return res.status(400).json({ message: "university_id required" });

  let logo_url = null;
  if (req.file) logo_url = `/uploads/logos/${req.file.filename}`;

  const fields = [];
  const values = [];

  if (name)          { fields.push("name = ?");          values.push(name.trim()); }
  if (description !== undefined) { fields.push("description = ?"); values.push(description.trim()); }
  if (contact_email) { fields.push("contact_email = ?"); values.push(contact_email.trim()); }
  if (website)       { fields.push("website = ?");       values.push(website.trim()); }
  if (logo_url)      { fields.push("logo_url = ?");      values.push(logo_url); }

  if (!fields.length) return res.status(400).json({ message: "Nothing to update" });

  values.push(university_id);
  db.query(
    `UPDATE universities SET ${fields.join(", ")} WHERE id = ?`,
    values,
    (err, result) => {
      if (err)                       return res.status(500).json({ message: "Server error" });
      if (result.affectedRows === 0)  return res.status(404).json({ message: "University not found" });
      res.json({ message: "University settings updated" });
    }
  );
};
