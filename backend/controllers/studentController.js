// controllers/studentController.js
const db = require("../models/db");

exports.getMe = (req, res) => {
  const sid = req.query.student_id;
  if (!sid) return res.status(400).json({ message: "student_id required" });
  const sql = `
    SELECT u.id, u.name, u.email, u.username, u.status, u.created_at,
           un.id AS university_id, un.name AS university_name
    FROM users u
    LEFT JOIN universities un ON u.university_id = un.id
    WHERE u.id = ? AND u.role = 'student'
  `;
  db.query(sql, [sid], (err, rows) => {
    if (err)               return res.status(500).json({ message: "Server error" });
    if (rows.length === 0) return res.status(404).json({ message: "Student not found" });
    res.json(rows[0]);
  });
};


exports.getClubs = (req, res) => {
  const uid = req.query.university_id;
  if (!uid) return res.status(400).json({ message: "university_id required" });

  const sql = `
    SELECT
      c.id, c.name, c.description, c.max_seats, c.created_at,
      COUNT(DISTINCT m.id) AS member_count,
      GREATEST(0, c.max_seats - COUNT(DISTINCT m.id)) AS seats_available
    FROM clubs c
    LEFT JOIN memberships m ON m.club_id = c.id AND m.status = 'approved'
    WHERE c.university_id = ? AND c.status = 'approved'
    GROUP BY c.id
    ORDER BY c.name ASC
  `;
  db.query(sql, [uid], (err, clubs) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(clubs);
  });
};

exports.getMyMemberships = (req, res) => {
  const sid = req.query.student_id;
  if (!sid) return res.status(400).json({ message: "student_id required" });

  const sql = `
  SELECT
    m.id AS membership_id, m.status AS membership_status, m.created_at AS requested_at,
    c.id AS club_id, c.name AS club_name
  FROM memberships m
  JOIN clubs c ON m.club_id = c.id
  WHERE m.user_id = ?
  ORDER BY m.created_at DESC
`;
  db.query(sql, [sid], (err, rows) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(rows);
  });
};

exports.sendJoinRequest = (req, res) => {
  const { student_id, club_id } = req.body;
  if (!student_id || !club_id)
    return res.status(400).json({ message: "student_id and club_id required" });

  const checkSql = `
    SELECT u.university_id, c.university_id AS club_uni, c.max_seats
    FROM users u, clubs c
    WHERE u.id = ? AND c.id = ?
  `;
  db.query(checkSql, [student_id, club_id], (err, rows) => {
    if (err)               return res.status(500).json({ message: "Server error" });
    if (rows.length === 0) return res.status(404).json({ message: "Student or club not found" });

    const { university_id, club_uni, max_seats } = rows[0];
    if (String(university_id) !== String(club_uni))
      return res.status(403).json({ message: "You can only join clubs from your university" });

    db.query(
      "SELECT id FROM memberships WHERE user_id = ? AND club_id = ?",
      [student_id, club_id],
      (err, dupRows) => {
        if (err)                return res.status(500).json({ message: "Server error" });
        if (dupRows.length > 0) return res.status(409).json({ message: "You already have a membership or pending request for this club" });

        if (max_seats) {
          db.query(
            "SELECT COUNT(*) AS cnt FROM memberships WHERE club_id = ? AND status = 'approved'",
            [club_id],
            (err, cntRows) => {
              if (err) return res.status(500).json({ message: "Server error" });
              if (cntRows[0].cnt >= max_seats)
                return res.status(400).json({ message: "No seats available in this club" });
              insertMembership();
            }
          );
        } else {
          insertMembership();
        }

        function insertMembership() {
          db.query(
            "INSERT INTO memberships (user_id, club_id, status) VALUES (?, ?, 'pending')",
            [student_id, club_id],
            (err, result) => {
              if (err) return res.status(500).json({ message: "Server error" });
              res.json({ message: "Join request sent", id: result.insertId });
            }
          );
        }
      }
    );
  });
};

exports.cancelRequest = (req, res) => {
  const { membershipId } = req.params;
  const { student_id }   = req.body;
  if (!student_id) return res.status(400).json({ message: "student_id required" });

  db.query(
    "DELETE FROM memberships WHERE id = ? AND user_id = ? AND status = 'pending'",
    [membershipId, student_id],
    (err, result) => {
      if (err)                      return res.status(500).json({ message: "Server error" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Request not found or already approved" });
      res.json({ message: "Request cancelled" });
    }
  );
};