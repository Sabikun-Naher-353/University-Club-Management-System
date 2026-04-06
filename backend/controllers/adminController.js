// controllers/adminController.js
const db  = require("../models/db");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

exports.login = (req, res) => {
  const identifier  = (req.body.identifier || req.body.email || "").trim();
  const password    = (req.body.password || "").trim();

  if (!identifier || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  let sql = "SELECT * FROM users WHERE (email = ? OR name = ?) AND password = ?";
  const params = [identifier, identifier, password];


  db.query(sql, params, (err, result) => {
    if (err) { console.error("DB ERROR:", err); return res.status(500).json({ message: "Server error" }); }

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = result[0];

    // Block pending accounts
    if (user.status === "pending") {
      return res.status(403).json({
        message: "pending",
        info: "Your registration is pending approval by a Super Admin.",
      });
    }

    const payload = {
      id:            user.id,
      name:          user.name,
      email:         user.email,
      role:          user.role,
      university_id: user.university_id || null,
      varsity_name:  user.varsity_name  || null,
      username:      user.username      || null,
      avatar:        user.avatar        || null,
    };

    const token = jwt.sign(payload, SECRET, { expiresIn: "7d" });

    const { password: _pw, ...safeUser } = user;
    res.json({
      user: { ...safeUser, token },  
      token,                         
    });
  });
};

exports.getStats = (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM clubs", (err, c) => {
    if (err) return res.status(500).json({ message: "Server error" });
    db.query("SELECT COUNT(*) AS total FROM users", (err, m) => {
      if (err) return res.status(500).json({ message: "Server error" });
      db.query("SELECT COUNT(*) AS total FROM universities WHERE status = 'approved'", (err, v) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.json({ clubs: c[0].total, members: m[0].total, varsities: v[0].total });
      });
    });
  });
};


exports.getAllUniversities = (req, res) => {
  db.query("SELECT * FROM universities WHERE status = 'approved' ORDER BY created_at DESC", (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

exports.getPendingUniversities = (req, res) => {
  const sql = `
    SELECT u.id, u.name, u.country, u.created_at, usr.email AS requested_by
    FROM universities u
    LEFT JOIN users usr ON u.requested_by_user_id = usr.id
    WHERE u.status = 'pending'
    ORDER BY u.created_at DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

exports.approveUniversity = (req, res) => {
  const { id } = req.params;
  db.query("UPDATE universities SET status = 'approved' WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Server error" });
    db.query(
      "UPDATE users SET status = 'approved', university_id = ? WHERE id = (SELECT requested_by_user_id FROM universities WHERE id = ?)",
      [id, id],
      () => { res.json({ message: "Varsity approved successfully" }); }
    );
  });
};


exports.rejectUniversity = (req, res) => {
  const { id } = req.params;
  db.query("SELECT requested_by_user_id FROM universities WHERE id = ?", [id], (err, rows) => {
    const userId = rows?.[0]?.requested_by_user_id;
    db.query("DELETE FROM universities WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json({ message: "Server error" });
      if (userId) db.query("DELETE FROM users WHERE id = ? AND status = 'pending'", [userId], () => {});
      res.json({ message: "Request rejected and removed" });
    });
  });
};


exports.deleteUniversity = (req, res) => {
  db.query("DELETE FROM universities WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ message: "University deleted" });
  });
};


exports.getAllClubs = (req, res) => {
  const sql = `
    SELECT c.*, u.name AS university_name
    FROM clubs c
    LEFT JOIN universities u ON c.university_id = u.id
    ORDER BY c.created_at DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

exports.getPendingClubs = (req, res) => {
  const sql = `
    SELECT c.*, u.name AS university_name
    FROM clubs c LEFT JOIN universities u ON c.university_id = u.id
    WHERE c.status = 'pending' ORDER BY c.created_at DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

exports.approveClub = (req, res) => {
  db.query("UPDATE clubs SET status = 'approved' WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ message: "Club approved" });
  });
};

exports.deleteClub = (req, res) => {
  db.query("DELETE FROM clubs WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ message: "Club deleted" });
  });
};

exports.getAllMembers = (req, res) => {
  db.query(
    "SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC",
    (err, result) => {
      if (err) return res.status(500).json({ message: "Server error" });
      res.json(result);
    }
  );
};

exports.removeMember = (req, res) => {
  db.query("DELETE FROM users WHERE id = ?", [req.params.memberId], (err) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ message: "Member removed" });
  });
};

exports.getViolators = (req, res) => { /* ... */ };