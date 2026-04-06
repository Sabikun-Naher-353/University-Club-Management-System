// controllers/authController.js
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
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  const identifier = email.trim();
  const sql = `SELECT * FROM users WHERE email = ? OR name = ? LIMIT 1`;

  db.query(sql, [identifier, identifier], async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (!results.length)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];

    if (user.status === "pending")
      return res.status(403).json({ message: "Your account is pending approval." });
    if (user.status === "rejected")
      return res.status(403).json({ message: "Your account has been rejected." });

    let passwordMatch = false;
    if (user.password && user.password.startsWith("$2")) {
      passwordMatch = await bcrypt.compare(password, user.password);
    } else {
      passwordMatch = password === user.password;
    }

    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid credentials" });

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
    clubs, varsityName, clubName,
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
      const sql = `INSERT INTO users (name, email, password, role, status, university_id)
                   VALUES (?, ?, ?, 'club_rep', 'pending', ?)`;
      db.query(
        sql,
        [name, email.trim(), hashedPassword, universityId || null],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Server error" });
          const userId = result.insertId;
          db.query(
            `INSERT INTO clubs (name, university_id, status, requested_by_user_id) VALUES (?, ?, 'pending', ?)`,
            [clubName.trim(), universityId || null, userId],
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