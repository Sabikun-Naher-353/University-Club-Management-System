// controllers/adminController.js
const db     = require("../models/db");
const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";


function sendToken(res, user) {
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
  res.json({ message: "Login successful", token, user: payload });
}

exports.login = (req, res) => {
  const identifier = (req.body.identifier || req.body.email || "").trim();
  const password   = (req.body.password || "").trim();

  if (!identifier || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const sql = "SELECT * FROM users WHERE email = ? OR name = ? LIMIT 1";

  db.query(sql, [identifier, identifier], async (err, results) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (!results.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];

    if (user.status === "pending") {
      return res.status(403).json({
        message: "pending",
        info: "Your account is pending approval by a Super Admin.",
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({ message: "Your account has been rejected." });
    }

    let passwordMatch = false;
    if (user.password && user.password.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = password === user.password;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    sendToken(res, user);
  });
};

exports.getUniversities = (req, res) => {
  db.query("SELECT id, name FROM universities WHERE status = 'approved'", (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

exports.getClubs = (req, res) => {
  const { universityId } = req.query;
  if (!universityId) return res.status(400).json({ message: "universityId required" });
  db.query("SELECT id, name FROM clubs WHERE university_id = ?", [universityId], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json(result);
  });
};

exports.checkEmail = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });
  db.query("SELECT id FROM users WHERE email = ?", [email], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ exists: result.length > 0 });
  });
};

exports.checkUsername = (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: "Username required" });
  db.query("SELECT id FROM users WHERE username = ?", [username], (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    res.json({ exists: result.length > 0 });
  });
};

exports.register = async (req, res) => {
  const {
    role, email, password, name, username,
    birthday, country, universityId,
    clubs, varsityName, clubName, maxSeats,
  } = req.body;

  if (!role || !email || !password)
    return res.status(400).json({ message: "Missing required fields" });

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (e) {
    return res.status(500).json({ message: "Server error hashing password" });
  }

  db.query("SELECT id FROM users WHERE email = ?", [email.trim()], (err, emailCheck) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (emailCheck.length > 0)
      return res.status(409).json({ message: "This email is already registered." });

    if (role === "student") {
      db.query("SELECT id FROM users WHERE username = ?", [username], (err, usernameCheck) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (usernameCheck.length > 0)
          return res.status(409).json({ message: "This username is already taken." });

        const sql = `INSERT INTO users (name, username, email, password, role, status, birthday, country, university_id)
                     VALUES (?, ?, ?, ?, 'student', 'pending', ?, ?, ?)`;
        db.query(
          sql,
          [name, username, email.trim(), hashedPassword, birthday || null, country || null, universityId || null],
          (err, result) => {
            if (err) return res.status(500).json({ message: "Server error" });
            const userId = result.insertId;
            if (clubs && clubs.length > 0)
              db.query("INSERT INTO memberships (user_id, club_id) VALUES ?", [clubs.map(id => [userId, id])], () => {});
            
            res.status(201).json({
              message: "pending",
              info: "Your registration is submitted. You can log in once a Super Admin approves your account.",
            });
          }
        );
      });

    } else if (role === "varsity") {
      const displayName = (name || varsityName || "").trim();
      const sql = `INSERT INTO users (name, email, password, role, status, country, varsity_name)
                   VALUES (?, ?, ?, 'varsity_admin', 'pending', ?, ?)`;
      db.query(
        sql,
        [displayName, email.trim(), hashedPassword, country || null, varsityName || null],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Server error" });
          const newUserId = result.insertId;
          db.query(
            `INSERT INTO universities (name, country, status, requested_by_user_id) VALUES (?, ?, 'pending', ?)`,
            [varsityName, country || null, newUserId],
            (uniErr) => { if (uniErr) console.error("Failed to insert pending university:", uniErr.message); }
          );
          res.status(201).json({ message: "pending", info: "Your registration request has been submitted." });
        }
      );

    } else if (role === "club") {
      if (!clubName || !clubName.trim())
        return res.status(400).json({ message: "Club name is required" });
      
      const seats = parseInt(maxSeats, 10);
      if (isNaN(seats) || seats <= 0)
        return res.status(400).json({ message: "Maximum seats must be a positive number" });

      const sql = `INSERT INTO users (name, email, password, role, status, university_id)
                   VALUES (?, ?, ?, 'club_rep', 'pending', ?)`;
      db.query(
        sql,
        [name, email.trim(), hashedPassword, universityId || null],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Server error" });
          const userId = result.insertId;
          db.query(
            `INSERT INTO clubs (name, max_seats, university_id, status, requested_by_user_id) VALUES (?, ?, ?, 'pending', ?)`,
            [clubName.trim(), seats, universityId || null, userId],
            (clubErr) => { if (clubErr) console.error("Failed to insert pending club:", clubErr.message); }
          );
          res.status(201).json({ message: "pending", info: "Your club registration request has been submitted." });
        }
      );

    } else if (role === "admin") {
      const sql = `INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'super_admin', 'approved')`;
      db.query(sql, [name, email.trim(), hashedPassword], (err) => {
        if (err) return res.status(500).json({ message: "Server error" });
        res.status(201).json({ message: "Admin registered successfully" });
      });

    } else {
      res.status(400).json({ message: "Invalid role" });
    }
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
    if (err) return res.status(500).json({ message: "Server error" });
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
  const { id } = req.params;
  db.query("UPDATE clubs SET status = 'approved' WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Server error" });
    db.query(
      "UPDATE users SET status = 'approved' WHERE id = (SELECT requested_by_user_id FROM clubs WHERE id = ?)",
      [id],
      () => { res.json({ message: "Club approved" }); }
    );
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

exports.getViolators = (req, res) => {
  res.json({ message: "Violators endpoint - implement as needed" });
};
